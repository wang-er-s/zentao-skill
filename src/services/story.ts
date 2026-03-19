import process from "node:process";

import { ZentaoApiClient, createApiClient } from "../lib/api-client.js";
import type { ZentaoConfig } from "../lib/config.js";
import { getConfigPath, loadConfig, normalizeBaseUrl, pickConfigValue, saveConfig } from "../lib/config.js";
import { CliError, UsageError } from "../lib/errors.js";

export type StorySummary = {
  id: number;
  title: string;
  module: number;
  moduleName: string;
  status: string;
  pri: number | string | null;
  assignedTo: string;
  openedBy: string;
  openedDate: string;
  lastEditedDate: string;
};

function formatAccount(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    return String(
      objectValue.account || objectValue.name || objectValue.realname || objectValue.id || ""
    );
  }
  return "";
}

function toPositiveInt(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new UsageError(`${fieldName} 必须是大于 0 的整数。`);
  }
  return parsed;
}

function resolveLimit(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return toPositiveInt(value, "--limit");
}

async function fetchAllStories(
  client: ZentaoApiClient,
  productId: number,
  options: { limit?: number | null; status?: string | null }
): Promise<any[]> {
  const stories: any[] = [];
  let page = 1;
  let total: number | null = null;
  const maxResults = options.limit ?? null;
  const pageSize = maxResults ? Math.min(maxResults, 100) : 100;

  while (true) {
    const payload = await client.listStoriesPage(productId, {
      page,
      limit: pageSize,
      status: options.status || null,
    });

    const batch = Array.isArray(payload.stories) ? payload.stories : [];
    total = typeof payload.total === "number" ? payload.total : total;
    stories.push(...batch);

    if (maxResults !== null && stories.length >= maxResults) {
      return stories.slice(0, maxResults);
    }

    if (total !== null && payload.limit) {
      if (page * payload.limit >= total) break;
    } else if (batch.length < pageSize) {
      break;
    }

    page += 1;
  }

  return stories;
}

function attachModuleNames(stories: any[], modules: any[]): any[] {
  const moduleMap = new Map<number, string>(
    modules.map((module) => [Number(module.id), String(module.name ?? "")])
  );
  return stories.map((story) => ({
    ...story,
    moduleName: moduleMap.get(Number(story?.module ?? 0)) || "",
  }));
}

function filterByModule(stories: any[], moduleId: number | null): any[] {
  if (!moduleId) return stories;
  return stories.filter((story) => Number(story?.module ?? 0) === moduleId);
}

function filterByAssignedTo(stories: any[], assignedTo: string | null): any[] {
  if (!assignedTo) return stories;
  const expected = assignedTo.trim().toLowerCase();
  return stories.filter((story) => formatAccount(story?.assignedTo).trim().toLowerCase() === expected);
}

function summarizeStory(story: any): StorySummary {
  return {
    id: Number(story?.id ?? 0),
    title: String(story?.title ?? ""),
    module: Number(story?.module ?? 0),
    moduleName: String(story?.moduleName ?? ""),
    status: String(story?.status ?? ""),
    pri: story?.pri ?? null,
    assignedTo: formatAccount(story?.assignedTo),
    openedBy: formatAccount(story?.openedBy),
    openedDate: String(story?.openedDate ?? ""),
    lastEditedDate: String(story?.lastEditedDate ?? ""),
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function requestText(url: string, init: { method: string; headers: Record<string, string>; body?: string | URLSearchParams }) {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new CliError(`请求失败(${response.status}): ${text.slice(0, 300)}`);
  }

  return text;
}

function buildCookieFromToken(token: string, account?: string | null): string {
  const parts = [
    `zentaosid=${token}`,
    "lang=zh-cn",
    "vision=rnd",
    "device=desktop",
    "theme=default",
  ];
  if (account) parts.push(`za=${account}`);
  return parts.join("; ");
}

function isLoginResponse(text: string): boolean {
  return (
    text.includes('"currentModule":"user","currentMethod":"login"') ||
    text.includes('"load":"login"') ||
    text.includes("登录已超时")
  );
}

function parseAssignForm(html: string): { action: string; uid: string; status: string; title: string } {
  const actionMatch = html.match(/<form[^>]+action="([^"]+)"/i);
  const uidMatch = html.match(/name="uid"\s+value="([^"]*)"/i);
  const statusMatch = html.match(/name="status"\s+value="([^"]*)"/i);
  const titleMatch = html.match(/entity-title[^"]*">([\s\S]*?)<\/span>/i);

  if (!actionMatch) {
    throw new CliError(`未找到指派表单 action。响应片段: ${html.slice(0, 300)}`);
  }
  if (!uidMatch) {
    throw new CliError(`未找到指派表单 uid。响应片段: ${html.slice(0, 300)}`);
  }

  return {
    action: decodeHtmlEntities(actionMatch[1]),
    uid: uidMatch[1],
    status: statusMatch ? statusMatch[1] : "",
    title: titleMatch ? stripHtml(titleMatch[1]) : "",
  };
}

function maybeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildAssignUrl(baseUrl: string, storyId: number, storyType: string): string {
  const url = new URL(`${baseUrl}/index.php`);
  url.searchParams.set("m", "story");
  url.searchParams.set("f", "assignTo");
  url.searchParams.set("storyID", String(storyId));
  url.searchParams.set("kanbanGroup", "default");
  url.searchParams.set("from", "");
  url.searchParams.set("storyType", storyType);
  return url.toString();
}

async function resolveAssignCookie(options: {
  config?: string | null;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
  cookie?: string | null;
}): Promise<{ baseUrl: string; cookie: string; account: string; configPath: string; config: ZentaoConfig }> {
  const configPath = getConfigPath(options.config);
  const config = loadConfig(configPath);
  const baseUrl = normalizeBaseUrl(
    pickConfigValue(options.url, process.env.ZENTAO_URL, config.url)
  );
  const account = String(
    pickConfigValue(options.account, process.env.ZENTAO_ACCOUNT, config.account) || ""
  );
  const password = String(
    pickConfigValue(options.password, process.env.ZENTAO_PASSWORD, config.password) || ""
  );
  let token = String(
    pickConfigValue(options.token, process.env.ZENTAO_TOKEN, config.token) || ""
  );
  let cookie = String(options.cookie || config.webCookie || "").trim();

  if (!baseUrl) {
    throw new UsageError("缺少禅道地址，请先执行 `zentao user login`。");
  }

  if (!cookie) {
    if (!token && account && password) {
      const client = new ZentaoApiClient({ baseUrl, account, password });
      token = await client.getToken();
      saveConfig(
        {
          ...config,
          url: baseUrl,
          token,
          account,
          password,
        },
        configPath
      );
    }

    if (token) {
      cookie = buildCookieFromToken(token, account);
    }
  }

  if (!cookie) {
    throw new UsageError("缺少可用登录信息，请先执行 `zentao user login`。");
  }

  return { baseUrl, cookie, account, configPath, config };
}

export async function listStories(options: {
  config?: string | null;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
  productId: number;
  moduleId?: number | null;
  limit?: number | null;
  status?: string | null;
  assignedTo?: string | null;
  mine?: boolean;
}): Promise<StorySummary[]> {
  const { client } = createApiClient(options);
  const modules = await client.listModules(options.productId);
  let assignedTo = options.assignedTo || null;

  if (options.mine) {
    const currentUser = await client.getCurrentUser();
    assignedTo = formatAccount(currentUser?.account || currentUser);
    if (!assignedTo) {
      throw new CliError("无法识别当前登录用户账号，不能使用 --mine。");
    }
  }

  const stories = await fetchAllStories(client, options.productId, {
    limit: options.limit || null,
    status: options.status || null,
  });

  return filterByAssignedTo(filterByModule(attachModuleNames(stories, modules), options.moduleId || null), assignedTo).map(
    summarizeStory
  );
}

export async function getStory(options: {
  config?: string | null;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
  storyId: number;
}): Promise<any> {
  const { client } = createApiClient(options);
  return client.getStory(options.storyId);
}

export async function assignStory(options: {
  config?: string | null;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
  cookie?: string | null;
  storyId: number;
  assignedTo: string;
  comment?: string | null;
  storyType?: string | null;
}): Promise<Record<string, unknown>> {
  const session = await resolveAssignCookie(options);
  const storyType = options.storyType || "story";
  const assignUrl = buildAssignUrl(session.baseUrl, options.storyId, storyType);
  let headers: Record<string, string> = {
    Cookie: session.cookie,
    Referer: `${session.baseUrl}/`,
    "X-Requested-With": "XMLHttpRequest",
    "X-ZUI-Modal": "true",
    Accept: "*/*",
  };

  let html = await requestText(assignUrl, { method: "GET", headers });
  if (isLoginResponse(html) && session.account) {
    const refreshed = await resolveAssignCookie({
      ...options,
      cookie: null,
    });
    headers = { ...headers, Cookie: refreshed.cookie };
    html = await requestText(assignUrl, { method: "GET", headers });
  }

  const form = parseAssignForm(html);
  const submitUrl = new URL(form.action, `${session.baseUrl}/index.php`).toString();
  const submitBody = new URLSearchParams({
    assignedTo: options.assignedTo,
    status: form.status || "",
    comment: `<p>${String(options.comment || "CLI assign")}</p>`,
    uid: form.uid,
  });

  const responseText = await requestText(submitUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: submitBody,
  });

  const payload = maybeJson(responseText);
  if (!payload) {
    throw new CliError(`指派返回不是 JSON: ${responseText.slice(0, 300)}`);
  }

  saveConfig(
    {
      ...session.config,
      url: session.baseUrl,
      webCookie: headers.Cookie,
    },
    session.configPath
  );

  return {
    success: String(payload.result || "") === "success",
    storyId: options.storyId,
    title: form.title,
    assignedTo: options.assignedTo,
    status: form.status || "",
    message: String(payload.message || ""),
    closeModal: Boolean(payload.closeModal),
  };
}

export async function closeStory(options: {
  config?: string | null;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
  storyId: number;
  reason: string;
  duplicateStory?: number | null;
  comment?: string | null;
}): Promise<Record<string, unknown>> {
  const allowed = new Set(["done", "duplicate", "postponed", "willnotdo", "cancel", "bydesign"]);
  if (!allowed.has(options.reason)) {
    throw new UsageError(`不支持的关闭原因: ${options.reason}`);
  }
  if (options.reason === "duplicate" && !options.duplicateStory) {
    throw new UsageError("关闭原因为 duplicate 时，必须提供 --duplicate-story。");
  }

  const { client } = createApiClient(options);
  const payload: Record<string, unknown> = {
    closedReason: options.reason,
  };
  if (options.comment) payload.comment = options.comment;
  if (options.duplicateStory) payload.duplicate = options.duplicateStory;

  const data = await client.request<any>({
    method: "POST",
    pathName: `/api.php/v1/stories/${options.storyId}/close`,
    body: payload,
  });

  const story = data?.story && typeof data.story === "object" ? data.story : data;
  return {
    success: true,
    storyId: options.storyId,
    title: String(story?.title ?? ""),
    closedReason: String(story?.closedReason ?? options.reason),
    status: String(story?.stage ?? story?.status ?? ""),
    assignedTo: formatAccount(story?.assignedTo),
  };
}

export function parseStoryId(value: unknown): number {
  return toPositiveInt(value, "story id");
}

export function parseProductId(value: unknown): number {
  return toPositiveInt(value, "--product-id");
}

export function parseModuleId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return toPositiveInt(value, "--module-id");
}

export function parseLimit(value: unknown): number | null {
  return resolveLimit(value);
}

export function parseDuplicateStoryId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return toPositiveInt(value, "--duplicate-story");
}
