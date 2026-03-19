import { loadConfig, normalizeBaseUrl, pickConfigValue } from "./config.js";
import { CliError, UsageError } from "./errors.js";

type RequestOptions = {
  method: "GET" | "POST";
  pathName: string;
  query?: Record<string, string | number | null | undefined>;
  body?: unknown;
};

export class ZentaoApiClient {
  baseUrl: string;
  token: string | null;
  account: string | null;
  password: string | null;

  constructor({
    baseUrl,
    token = null,
    account = null,
    password = null,
  }: {
    baseUrl: string;
    token?: string | null;
    account?: string | null;
    password?: string | null;
  }) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.token = token || null;
    this.account = account || null;
    this.password = password || null;
  }

  async ensureToken(): Promise<void> {
    if (this.token) return;
    if (!this.account || !this.password) {
      throw new UsageError("缺少可用 token，请先执行 `zentao user login`。");
    }
    this.token = await this.getToken();
  }

  async getToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api.php/v1/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: this.account,
        password: this.password,
      }),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new CliError(`登录返回不是 JSON: ${text.slice(0, 200)}`);
    }

    if (!response.ok || data?.error) {
      throw new CliError(`登录失败: ${JSON.stringify(data)}`);
    }
    if (!data?.token) {
      throw new CliError(`登录响应里没有 token: ${text.slice(0, 200)}`);
    }

    return String(data.token);
  }

  async request<T>(options: RequestOptions, retried = false): Promise<T> {
    await this.ensureToken();

    const url = new URL(`${this.baseUrl}${options.pathName}`);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });

    const response = await fetch(url, {
      method: options.method,
      headers: options.body
        ? {
            Token: String(this.token),
            "Content-Type": "application/json",
          }
        : {
            Token: String(this.token),
          },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new CliError(`接口返回不是 JSON: ${text.slice(0, 200)}`);
    }

    if (!response.ok) {
      throw new CliError(`接口请求失败: ${JSON.stringify(data)}`);
    }

    if (data?.error) {
      const message = String(data.error);
      if (
        !retried &&
        this.account &&
        this.password &&
        (message.includes("unauthorized") || message.includes("Unauthorized"))
      ) {
        this.token = null;
        await this.ensureToken();
        return this.request<T>(options, true);
      }

      if (message.includes("unauthorized") || message.includes("login")) {
        throw new CliError(`token 可能已失效，请重新执行 \`zentao user login\`。原始错误: ${message}`);
      }
      throw new CliError(message);
    }

    return data as T;
  }

  async listProducts(): Promise<any[]> {
    const data = await this.request<{ products?: any[] }>({
      method: "GET",
      pathName: "/api.php/v1/products",
      query: { page: 1, limit: 1000 },
    });
    return Array.isArray(data.products) ? data.products : [];
  }

  async getCurrentUser(): Promise<any> {
    const data = await this.request<{ profile?: unknown }>({
      method: "GET",
      pathName: "/api.php/v1/user",
    });
    return data && typeof data === "object" && "profile" in data && data.profile && typeof data.profile === "object"
      ? data.profile
      : data;
  }

  async listModules(productId: number): Promise<any[]> {
    const data = await this.request<{ modules?: any[] }>({
      method: "GET",
      pathName: "/api.php/v1/modules",
      query: { id: productId, type: "story" },
    });
    return Array.isArray(data.modules) ? data.modules : [];
  }

  async getStory(storyId: number): Promise<any> {
    const data = await this.request<{ story?: unknown }>({
      method: "GET",
      pathName: `/api.php/v1/stories/${storyId}`,
    });
    return data && typeof data === "object" && "story" in data && data.story && typeof data.story === "object"
      ? data.story
      : data;
  }

  async listStoriesPage(
    productId: number,
    options: { page: number; limit: number; status?: string | null }
  ): Promise<{ stories?: any[]; total?: number; limit?: number }> {
    return this.request({
      method: "GET",
      pathName: `/api.php/v1/products/${productId}/stories`,
      query: { page: options.page, limit: options.limit, status: options.status || null },
    });
  }
}

export function createApiClient(
  options: {
    config?: string | null;
    url?: string | null;
    token?: string | null;
    account?: string | null;
    password?: string | null;
  } = {},
  env: NodeJS.ProcessEnv = process.env
): { client: ZentaoApiClient; configPath: string; config: ReturnType<typeof loadConfig> } {
  const resolvedPath = options.config || undefined;
  const config = loadConfig(resolvedPath);
  const baseUrl = normalizeBaseUrl(
    pickConfigValue(options.url, env.ZENTAO_URL, config.url)
  );
  const token = pickConfigValue(options.token, env.ZENTAO_TOKEN, config.token);
  const account = pickConfigValue(options.account, env.ZENTAO_ACCOUNT, config.account);
  const password = pickConfigValue(options.password, env.ZENTAO_PASSWORD, config.password);

  if (!baseUrl) {
    throw new UsageError("缺少禅道地址，请先执行 `zentao user login --url <地址> --account <账号> --password <密码>`。");
  }
  if (!token && !(account && password)) {
    throw new UsageError("缺少登录凭据，请先执行 `zentao user login`。");
  }

  return {
    client: new ZentaoApiClient({
      baseUrl,
      token,
      account,
      password,
    }),
    configPath: options.config || "",
    config,
  };
}
