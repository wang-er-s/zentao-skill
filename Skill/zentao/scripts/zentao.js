var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/errors.ts
function getErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
var CliError, UsageError;
var init_errors = __esm({
  "src/lib/errors.ts"() {
    "use strict";
    CliError = class extends Error {
      exitCode;
      constructor(message, exitCode = 1) {
        super(message);
        this.name = "CliError";
        this.exitCode = exitCode;
      }
    };
    UsageError = class extends CliError {
      constructor(message) {
        super(message, 2);
        this.name = "UsageError";
      }
    };
  }
});

// src/lib/cli.ts
function getStringOption(args, key) {
  const value = args.options[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function getBooleanOption(args, key) {
  return args.options[key] === true;
}
function getPositional(args, index) {
  const value = args.positionals[index];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
var init_cli = __esm({
  "src/lib/cli.ts"() {
    "use strict";
  }
});

// src/lib/config.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}
function getConfigPath(explicitPath) {
  if (explicitPath) return path.resolve(String(explicitPath));
  return path.join(os.homedir(), ".zentao", "config.json");
}
function loadConfig(configPath = getConfigPath()) {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function saveConfig(config, configPath = getConfigPath()) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}
`, "utf8");
  return configPath;
}
function pickConfigValue(...values) {
  for (const value of values) {
    if (value !== void 0 && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}
var init_config = __esm({
  "src/lib/config.ts"() {
    "use strict";
  }
});

// src/lib/api-client.ts
function createApiClient(options = {}, env = process.env) {
  const resolvedPath = options.config || void 0;
  const config = loadConfig(resolvedPath);
  const baseUrl = normalizeBaseUrl(
    pickConfigValue(options.url, env.ZENTAO_URL, config.url)
  );
  const token = pickConfigValue(options.token, env.ZENTAO_TOKEN, config.token);
  const account = pickConfigValue(options.account, env.ZENTAO_ACCOUNT, config.account);
  const password = pickConfigValue(options.password, env.ZENTAO_PASSWORD, config.password);
  if (!baseUrl) {
    throw new UsageError("\u7F3A\u5C11\u7985\u9053\u5730\u5740\uFF0C\u8BF7\u5148\u6267\u884C `zentao user login --url <\u5730\u5740> --account <\u8D26\u53F7> --password <\u5BC6\u7801>`\u3002");
  }
  if (!token && !(account && password)) {
    throw new UsageError("\u7F3A\u5C11\u767B\u5F55\u51ED\u636E\uFF0C\u8BF7\u5148\u6267\u884C `zentao user login`\u3002");
  }
  return {
    client: new ZentaoApiClient({
      baseUrl,
      token,
      account,
      password
    }),
    configPath: options.config || "",
    config
  };
}
var ZentaoApiClient;
var init_api_client = __esm({
  "src/lib/api-client.ts"() {
    "use strict";
    init_config();
    init_errors();
    ZentaoApiClient = class {
      baseUrl;
      token;
      account;
      password;
      constructor({
        baseUrl,
        token = null,
        account = null,
        password = null
      }) {
        this.baseUrl = normalizeBaseUrl(baseUrl);
        this.token = token || null;
        this.account = account || null;
        this.password = password || null;
      }
      async ensureToken() {
        if (this.token) return;
        if (!this.account || !this.password) {
          throw new UsageError("\u7F3A\u5C11\u53EF\u7528 token\uFF0C\u8BF7\u5148\u6267\u884C `zentao user login`\u3002");
        }
        this.token = await this.getToken();
      }
      async getToken() {
        const response = await fetch(`${this.baseUrl}/api.php/v1/tokens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account: this.account,
            password: this.password
          })
        });
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new CliError(`\u767B\u5F55\u8FD4\u56DE\u4E0D\u662F JSON: ${text.slice(0, 200)}`);
        }
        if (!response.ok || data?.error) {
          throw new CliError(`\u767B\u5F55\u5931\u8D25: ${JSON.stringify(data)}`);
        }
        if (!data?.token) {
          throw new CliError(`\u767B\u5F55\u54CD\u5E94\u91CC\u6CA1\u6709 token: ${text.slice(0, 200)}`);
        }
        return String(data.token);
      }
      async request(options, retried = false) {
        await this.ensureToken();
        const url = new URL(`${this.baseUrl}${options.pathName}`);
        Object.entries(options.query || {}).forEach(([key, value]) => {
          if (value === void 0 || value === null || value === "") return;
          url.searchParams.set(key, String(value));
        });
        const response = await fetch(url, {
          method: options.method,
          headers: options.body ? {
            Token: String(this.token),
            "Content-Type": "application/json"
          } : {
            Token: String(this.token)
          },
          body: options.body === void 0 ? void 0 : JSON.stringify(options.body)
        });
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new CliError(`\u63A5\u53E3\u8FD4\u56DE\u4E0D\u662F JSON: ${text.slice(0, 200)}`);
        }
        if (!response.ok) {
          throw new CliError(`\u63A5\u53E3\u8BF7\u6C42\u5931\u8D25: ${JSON.stringify(data)}`);
        }
        if (data?.error) {
          const message = String(data.error);
          if (!retried && this.account && this.password && (message.includes("unauthorized") || message.includes("Unauthorized"))) {
            this.token = null;
            await this.ensureToken();
            return this.request(options, true);
          }
          if (message.includes("unauthorized") || message.includes("login")) {
            throw new CliError(`token \u53EF\u80FD\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u6267\u884C \`zentao user login\`\u3002\u539F\u59CB\u9519\u8BEF: ${message}`);
          }
          throw new CliError(message);
        }
        return data;
      }
      async listProducts() {
        const data = await this.request({
          method: "GET",
          pathName: "/api.php/v1/products",
          query: { page: 1, limit: 1e3 }
        });
        return Array.isArray(data.products) ? data.products : [];
      }
      async getCurrentUser() {
        const data = await this.request({
          method: "GET",
          pathName: "/api.php/v1/user"
        });
        return data && typeof data === "object" && "profile" in data && data.profile && typeof data.profile === "object" ? data.profile : data;
      }
      async listModules(productId) {
        const data = await this.request({
          method: "GET",
          pathName: "/api.php/v1/modules",
          query: { id: productId, type: "story" }
        });
        return Array.isArray(data.modules) ? data.modules : [];
      }
      async getStory(storyId) {
        const data = await this.request({
          method: "GET",
          pathName: `/api.php/v1/stories/${storyId}`
        });
        return data && typeof data === "object" && "story" in data && data.story && typeof data.story === "object" ? data.story : data;
      }
      async listStoriesPage(productId, options) {
        return this.request({
          method: "GET",
          pathName: `/api.php/v1/products/${productId}/stories`,
          query: { page: options.page, limit: options.limit, status: options.status || null }
        });
      }
    };
  }
});

// src/services/user.ts
async function loginUser(options) {
  const config = loadConfig(options.configPath);
  const baseUrl = normalizeBaseUrl(
    pickConfigValue(options.url, process.env.ZENTAO_URL, config.url) || ""
  );
  const account = String(
    pickConfigValue(options.account, process.env.ZENTAO_ACCOUNT, config.account) || ""
  ).trim();
  const password = String(
    pickConfigValue(options.password, process.env.ZENTAO_PASSWORD, config.password) || ""
  ).trim();
  let token = String(pickConfigValue(options.token, process.env.ZENTAO_TOKEN, config.token) || "").trim();
  if (!baseUrl) {
    throw new UsageError("\u7F3A\u5C11 --url\u3002");
  }
  const client = new ZentaoApiClient({
    baseUrl,
    token: token || null,
    account: account || null,
    password: password || null
  });
  if (!token) {
    if (!account || !password) {
      throw new UsageError("login \u9700\u8981 --token\uFF0C\u6216\u8005\u540C\u65F6\u63D0\u4F9B --account \u548C --password\u3002");
    }
    token = await client.getToken();
  }
  client.token = token;
  await client.listProducts();
  saveConfig(
    {
      ...config,
      url: baseUrl,
      token,
      account,
      password
    },
    options.configPath
  );
  return {
    success: true,
    url: baseUrl,
    token,
    account,
    configPath: getConfigPath(options.configPath)
  };
}
async function whoAmI(options) {
  const { client } = createApiClient({
    config: options.configPath,
    url: options.url,
    token: options.token,
    account: options.account,
    password: options.password
  });
  return client.getCurrentUser();
}
var init_user = __esm({
  "src/services/user.ts"() {
    "use strict";
    init_api_client();
    init_config();
    init_errors();
  }
});

// src/commands/user/login.ts
var login_exports = {};
__export(login_exports, {
  default: () => login_default,
  run: () => run
});
async function run(args) {
  return loginUser({
    configPath: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password")
  });
}
var login_default;
var init_login = __esm({
  "src/commands/user/login.ts"() {
    "use strict";
    init_cli();
    init_user();
    login_default = run;
  }
});

// src/commands/user/whoami.ts
var whoami_exports = {};
__export(whoami_exports, {
  default: () => whoami_default,
  run: () => run2
});
async function run2(args) {
  return whoAmI({
    configPath: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password")
  });
}
var whoami_default;
var init_whoami = __esm({
  "src/commands/user/whoami.ts"() {
    "use strict";
    init_cli();
    init_user();
    whoami_default = run2;
  }
});

// src/services/product.ts
async function listProducts(options) {
  const { client } = createApiClient({
    config: options.configPath,
    url: options.url,
    token: options.token,
    account: options.account,
    password: options.password
  });
  return client.listProducts();
}
async function getProduct(options) {
  if (!Number.isInteger(options.productId) || options.productId <= 0) {
    throw new UsageError("product id \u5FC5\u987B\u662F\u5927\u4E8E 0 \u7684\u6574\u6570\u3002");
  }
  const products = await listProducts(options);
  const matched = products.find((item) => Number(item.id) === options.productId);
  if (!matched) {
    throw new UsageError(`\u627E\u4E0D\u5230\u4EA7\u54C1 ${options.productId}\u3002`);
  }
  return matched;
}
var init_product = __esm({
  "src/services/product.ts"() {
    "use strict";
    init_api_client();
    init_errors();
  }
});

// src/commands/product/list.ts
var list_exports = {};
__export(list_exports, {
  default: () => list_default,
  run: () => run3
});
async function run3(args) {
  return listProducts({
    configPath: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password")
  });
}
var list_default;
var init_list = __esm({
  "src/commands/product/list.ts"() {
    "use strict";
    init_cli();
    init_product();
    list_default = run3;
  }
});

// src/commands/product/get.ts
var get_exports = {};
__export(get_exports, {
  default: () => get_default,
  run: () => run4
});
function parseProductId(args) {
  const rawId = getPositional(args, 0);
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new UsageError("product get \u9700\u8981\u4E00\u4E2A\u5927\u4E8E 0 \u7684\u4EA7\u54C1 id\u3002");
  }
  return productId;
}
async function run4(args) {
  return getProduct({
    configPath: args.configPath,
    productId: parseProductId(args),
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password")
  });
}
var get_default;
var init_get = __esm({
  "src/commands/product/get.ts"() {
    "use strict";
    init_cli();
    init_errors();
    init_product();
    get_default = run4;
  }
});

// src/services/module.ts
async function listModules(options) {
  if (!Number.isInteger(options.productId) || options.productId <= 0) {
    throw new UsageError("--product-id \u5FC5\u987B\u662F\u5927\u4E8E 0 \u7684\u6574\u6570\u3002");
  }
  const { client } = createApiClient({
    config: options.configPath,
    url: options.url,
    token: options.token,
    account: options.account,
    password: options.password
  });
  return client.listModules(options.productId);
}
var init_module = __esm({
  "src/services/module.ts"() {
    "use strict";
    init_api_client();
    init_errors();
  }
});

// src/commands/module/list.ts
var list_exports2 = {};
__export(list_exports2, {
  default: () => list_default2,
  run: () => run5
});
function parseProductId2(args) {
  const rawId = args.options["product-id"];
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new UsageError("module list \u9700\u8981 --product-id <id>\u3002");
  }
  return productId;
}
async function run5(args) {
  return listModules({
    configPath: args.configPath,
    productId: parseProductId2(args),
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password")
  });
}
var list_default2;
var init_list2 = __esm({
  "src/commands/module/list.ts"() {
    "use strict";
    init_cli();
    init_errors();
    init_module();
    list_default2 = run5;
  }
});

// src/services/story.ts
import process3 from "node:process";
function formatAccount(value) {
  if (value === void 0 || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const objectValue = value;
    return String(
      objectValue.account || objectValue.name || objectValue.realname || objectValue.id || ""
    );
  }
  return "";
}
function toPositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new UsageError(`${fieldName} \u5FC5\u987B\u662F\u5927\u4E8E 0 \u7684\u6574\u6570\u3002`);
  }
  return parsed;
}
function resolveLimit(value) {
  if (value === void 0 || value === null || value === "") return null;
  return toPositiveInt(value, "--limit");
}
async function fetchAllStories(client, productId, options) {
  const stories = [];
  let page = 1;
  let total = null;
  const maxResults = options.limit ?? null;
  const pageSize = maxResults ? Math.min(maxResults, 100) : 100;
  while (true) {
    const payload = await client.listStoriesPage(productId, {
      page,
      limit: pageSize,
      status: options.status || null
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
function attachModuleNames(stories, modules) {
  const moduleMap = new Map(
    modules.map((module) => [Number(module.id), String(module.name ?? "")])
  );
  return stories.map((story) => ({
    ...story,
    moduleName: moduleMap.get(Number(story?.module ?? 0)) || ""
  }));
}
function filterByModule(stories, moduleId) {
  if (!moduleId) return stories;
  return stories.filter((story) => Number(story?.module ?? 0) === moduleId);
}
function filterByAssignedTo(stories, assignedTo) {
  if (!assignedTo) return stories;
  const expected = assignedTo.trim().toLowerCase();
  return stories.filter((story) => formatAccount(story?.assignedTo).trim().toLowerCase() === expected);
}
function summarizeStory(story) {
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
    lastEditedDate: String(story?.lastEditedDate ?? "")
  };
}
function decodeHtmlEntities(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function stripHtml(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
async function requestText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new CliError(`\u8BF7\u6C42\u5931\u8D25(${response.status}): ${text.slice(0, 300)}`);
  }
  return text;
}
function buildCookieFromToken(token, account) {
  const parts = [
    `zentaosid=${token}`,
    "lang=zh-cn",
    "vision=rnd",
    "device=desktop",
    "theme=default"
  ];
  if (account) parts.push(`za=${account}`);
  return parts.join("; ");
}
function isLoginResponse(text) {
  return text.includes('"currentModule":"user","currentMethod":"login"') || text.includes('"load":"login"') || text.includes("\u767B\u5F55\u5DF2\u8D85\u65F6");
}
function parseAssignForm(html) {
  const actionMatch = html.match(/<form[^>]+action="([^"]+)"/i);
  const uidMatch = html.match(/name="uid"\s+value="([^"]*)"/i);
  const statusMatch = html.match(/name="status"\s+value="([^"]*)"/i);
  const titleMatch = html.match(/entity-title[^"]*">([\s\S]*?)<\/span>/i);
  if (!actionMatch) {
    throw new CliError(`\u672A\u627E\u5230\u6307\u6D3E\u8868\u5355 action\u3002\u54CD\u5E94\u7247\u6BB5: ${html.slice(0, 300)}`);
  }
  if (!uidMatch) {
    throw new CliError(`\u672A\u627E\u5230\u6307\u6D3E\u8868\u5355 uid\u3002\u54CD\u5E94\u7247\u6BB5: ${html.slice(0, 300)}`);
  }
  return {
    action: decodeHtmlEntities(actionMatch[1]),
    uid: uidMatch[1],
    status: statusMatch ? statusMatch[1] : "",
    title: titleMatch ? stripHtml(titleMatch[1]) : ""
  };
}
function maybeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function buildAssignUrl(baseUrl, storyId, storyType) {
  const url = new URL(`${baseUrl}/index.php`);
  url.searchParams.set("m", "story");
  url.searchParams.set("f", "assignTo");
  url.searchParams.set("storyID", String(storyId));
  url.searchParams.set("kanbanGroup", "default");
  url.searchParams.set("from", "");
  url.searchParams.set("storyType", storyType);
  return url.toString();
}
async function resolveAssignCookie(options) {
  const configPath = getConfigPath(options.config);
  const config = loadConfig(configPath);
  const baseUrl = normalizeBaseUrl(
    pickConfigValue(options.url, process3.env.ZENTAO_URL, config.url)
  );
  const account = String(
    pickConfigValue(options.account, process3.env.ZENTAO_ACCOUNT, config.account) || ""
  );
  const password = String(
    pickConfigValue(options.password, process3.env.ZENTAO_PASSWORD, config.password) || ""
  );
  let token = String(
    pickConfigValue(options.token, process3.env.ZENTAO_TOKEN, config.token) || ""
  );
  let cookie = String(options.cookie || config.webCookie || "").trim();
  if (!baseUrl) {
    throw new UsageError("\u7F3A\u5C11\u7985\u9053\u5730\u5740\uFF0C\u8BF7\u5148\u6267\u884C `zentao user login`\u3002");
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
          password
        },
        configPath
      );
    }
    if (token) {
      cookie = buildCookieFromToken(token, account);
    }
  }
  if (!cookie) {
    throw new UsageError("\u7F3A\u5C11\u53EF\u7528\u767B\u5F55\u4FE1\u606F\uFF0C\u8BF7\u5148\u6267\u884C `zentao user login`\u3002");
  }
  return { baseUrl, cookie, account, configPath, config };
}
async function listStories(options) {
  const { client } = createApiClient(options);
  const modules = await client.listModules(options.productId);
  let assignedTo = options.assignedTo || null;
  if (options.mine) {
    const currentUser = await client.getCurrentUser();
    assignedTo = formatAccount(currentUser?.account || currentUser);
    if (!assignedTo) {
      throw new CliError("\u65E0\u6CD5\u8BC6\u522B\u5F53\u524D\u767B\u5F55\u7528\u6237\u8D26\u53F7\uFF0C\u4E0D\u80FD\u4F7F\u7528 --mine\u3002");
    }
  }
  const stories = await fetchAllStories(client, options.productId, {
    limit: options.limit || null,
    status: options.status || null
  });
  return filterByAssignedTo(filterByModule(attachModuleNames(stories, modules), options.moduleId || null), assignedTo).map(
    summarizeStory
  );
}
async function getStory(options) {
  const { client } = createApiClient(options);
  return client.getStory(options.storyId);
}
async function assignStory(options) {
  const session = await resolveAssignCookie(options);
  const storyType = options.storyType || "story";
  const assignUrl = buildAssignUrl(session.baseUrl, options.storyId, storyType);
  let headers = {
    Cookie: session.cookie,
    Referer: `${session.baseUrl}/`,
    "X-Requested-With": "XMLHttpRequest",
    "X-ZUI-Modal": "true",
    Accept: "*/*"
  };
  let html = await requestText(assignUrl, { method: "GET", headers });
  if (isLoginResponse(html) && session.account) {
    const refreshed = await resolveAssignCookie({
      ...options,
      cookie: null
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
    uid: form.uid
  });
  const responseText = await requestText(submitUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: submitBody
  });
  const payload = maybeJson(responseText);
  if (!payload) {
    throw new CliError(`\u6307\u6D3E\u8FD4\u56DE\u4E0D\u662F JSON: ${responseText.slice(0, 300)}`);
  }
  saveConfig(
    {
      ...session.config,
      url: session.baseUrl,
      webCookie: headers.Cookie
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
    closeModal: Boolean(payload.closeModal)
  };
}
async function closeStory(options) {
  const allowed = /* @__PURE__ */ new Set(["done", "duplicate", "postponed", "willnotdo", "cancel", "bydesign"]);
  if (!allowed.has(options.reason)) {
    throw new UsageError(`\u4E0D\u652F\u6301\u7684\u5173\u95ED\u539F\u56E0: ${options.reason}`);
  }
  if (options.reason === "duplicate" && !options.duplicateStory) {
    throw new UsageError("\u5173\u95ED\u539F\u56E0\u4E3A duplicate \u65F6\uFF0C\u5FC5\u987B\u63D0\u4F9B --duplicate-story\u3002");
  }
  const { client } = createApiClient(options);
  const payload = {
    closedReason: options.reason
  };
  if (options.comment) payload.comment = options.comment;
  if (options.duplicateStory) payload.duplicate = options.duplicateStory;
  const data = await client.request({
    method: "POST",
    pathName: `/api.php/v1/stories/${options.storyId}/close`,
    body: payload
  });
  const story = data?.story && typeof data.story === "object" ? data.story : data;
  return {
    success: true,
    storyId: options.storyId,
    title: String(story?.title ?? ""),
    closedReason: String(story?.closedReason ?? options.reason),
    status: String(story?.stage ?? story?.status ?? ""),
    assignedTo: formatAccount(story?.assignedTo)
  };
}
function parseStoryId(value) {
  return toPositiveInt(value, "story id");
}
function parseProductId3(value) {
  return toPositiveInt(value, "--product-id");
}
function parseModuleId(value) {
  if (value === void 0 || value === null || value === "") return null;
  return toPositiveInt(value, "--module-id");
}
function parseLimit(value) {
  return resolveLimit(value);
}
function parseDuplicateStoryId(value) {
  if (value === void 0 || value === null || value === "") return null;
  return toPositiveInt(value, "--duplicate-story");
}
var init_story = __esm({
  "src/services/story.ts"() {
    "use strict";
    init_api_client();
    init_config();
    init_errors();
  }
});

// src/commands/story/list.ts
var list_exports3 = {};
__export(list_exports3, {
  default: () => list_default3,
  run: () => run6
});
async function run6(args) {
  if (getBooleanOption(args, "mine") && args.options["assigned-to"]) {
    throw new UsageError("--mine \u548C --assigned-to \u4E0D\u80FD\u540C\u65F6\u4F7F\u7528\u3002");
  }
  return listStories({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    productId: parseProductId3(args.options["product-id"]),
    moduleId: parseModuleId(args.options["module-id"]),
    assignedTo: getStringOption(args, "assigned-to"),
    mine: getBooleanOption(args, "mine"),
    limit: parseLimit(args.options.limit),
    status: getStringOption(args, "status")
  });
}
var list_default3;
var init_list3 = __esm({
  "src/commands/story/list.ts"() {
    "use strict";
    init_cli();
    init_errors();
    init_story();
    list_default3 = run6;
  }
});

// src/commands/story/get.ts
var get_exports2 = {};
__export(get_exports2, {
  default: () => get_default2,
  run: () => run7
});
async function run7(args) {
  return getStory({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    storyId: parseStoryId(getPositional(args, 0))
  });
}
var get_default2;
var init_get2 = __esm({
  "src/commands/story/get.ts"() {
    "use strict";
    init_cli();
    init_story();
    get_default2 = run7;
  }
});

// src/commands/story/assign.ts
var assign_exports = {};
__export(assign_exports, {
  default: () => assign_default,
  run: () => run8
});
async function run8(args) {
  const assignedTo = getStringOption(args, "to");
  if (!assignedTo) {
    throw new UsageError("\u7F3A\u5C11 --to\u3002");
  }
  return assignStory({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    cookie: getStringOption(args, "cookie"),
    storyId: parseStoryId(getPositional(args, 0)),
    assignedTo,
    comment: getStringOption(args, "comment"),
    storyType: getStringOption(args, "story-type")
  });
}
var assign_default;
var init_assign = __esm({
  "src/commands/story/assign.ts"() {
    "use strict";
    init_cli();
    init_errors();
    init_story();
    assign_default = run8;
  }
});

// src/commands/story/close.ts
var close_exports = {};
__export(close_exports, {
  default: () => close_default,
  run: () => run9
});
async function run9(args) {
  const reason = getStringOption(args, "reason");
  if (!reason) {
    throw new UsageError("\u7F3A\u5C11 --reason\u3002");
  }
  return closeStory({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    storyId: parseStoryId(getPositional(args, 0)),
    reason,
    comment: getStringOption(args, "comment"),
    duplicateStory: parseDuplicateStoryId(args.options["duplicate-story"])
  });
}
var close_default;
var init_close = __esm({
  "src/commands/story/close.ts"() {
    "use strict";
    init_cli();
    init_errors();
    init_story();
    close_default = run9;
  }
});

// src/cli/index.ts
init_errors();
import os2 from "node:os";
import path2 from "node:path";
import process4 from "node:process";

// src/lib/output.ts
import process2 from "node:process";
function writeJson(value) {
  process2.stdout.write(`${JSON.stringify(value, null, 2)}
`);
}

// src/cli/index.ts
var COMMANDS = {
  "user login": () => Promise.resolve().then(() => (init_login(), login_exports)),
  "user whoami": () => Promise.resolve().then(() => (init_whoami(), whoami_exports)),
  "product list": () => Promise.resolve().then(() => (init_list(), list_exports)),
  "product get": () => Promise.resolve().then(() => (init_get(), get_exports)),
  "module list": () => Promise.resolve().then(() => (init_list2(), list_exports2)),
  "story list": () => Promise.resolve().then(() => (init_list3(), list_exports3)),
  "story get": () => Promise.resolve().then(() => (init_get2(), get_exports2)),
  "story assign": () => Promise.resolve().then(() => (init_assign(), assign_exports)),
  "story close": () => Promise.resolve().then(() => (init_close(), close_exports))
};
function printHelp() {
  const lines = [
    "Zentao CLI",
    "",
    "Usage:",
    "  zentao <resource> <action> [options]",
    "  zentao help",
    "",
    "Commands:",
    "  user login",
    "  user whoami",
    "  product list",
    "  product get <id>",
    "  module list --product-id <id>",
    "  story list --product-id <id>",
    "  story get <id>",
    "  story assign <id> --to <account>",
    "  story close <id> --reason <reason>"
  ];
  process4.stdout.write(`${lines.join("\n")}
`);
}
function parseArgv(argv) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [flag, inline] = token.split("=", 2);
    const key = flag.slice(2);
    if (!key) continue;
    if (inline !== void 0) {
      options[key] = inline;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
      continue;
    }
    options[key] = true;
  }
  return { positionals, options };
}
function getDefaultConfigPath() {
  return path2.join(os2.homedir(), ".zentao", "config.json");
}
async function run10() {
  const rawArgv = process4.argv.slice(2);
  const { positionals, options } = parseArgv(rawArgv);
  const [resource = "", action = ""] = positionals;
  if (!resource || resource === "help" || options.help === true) {
    printHelp();
    return;
  }
  if (!action) {
    throw new Error("Missing action. Run `zentao help` for usage.");
  }
  const key = `${resource} ${action}`;
  const loader = COMMANDS[key];
  if (!loader) {
    throw new Error(`Unknown command: ${key}`);
  }
  const module = await loader();
  if (typeof module.run !== "function") {
    throw new Error(`Command module '${key}' must export async run(args).`);
  }
  const configPathOption = options["config-path"];
  const configPath = typeof configPathOption === "string" && configPathOption.trim() ? configPathOption.trim() : getDefaultConfigPath();
  const args = {
    resource,
    action,
    positionals: positionals.slice(2),
    options,
    rawArgv,
    configPath
  };
  const result = await module.run(args);
  if (result !== void 0) {
    writeJson(result);
  }
}
run10().catch((error) => {
  process4.stderr.write(`${getErrorMessage(error)}
`);
  process4.exitCode = error instanceof CliError ? error.exitCode : 1;
});
