import { ZentaoApiClient, createApiClient } from "../lib/api-client.js";
import { getConfigPath, loadConfig, normalizeBaseUrl, pickConfigValue, saveConfig } from "../lib/config.js";
import { UsageError } from "../lib/errors.js";

export async function loginUser(options: {
  configPath: string;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
}): Promise<Record<string, unknown>> {
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
    throw new UsageError("缺少 --url。");
  }

  const client = new ZentaoApiClient({
    baseUrl,
    token: token || null,
    account: account || null,
    password: password || null,
  });

  if (!token) {
    if (!account || !password) {
      throw new UsageError("login 需要 --token，或者同时提供 --account 和 --password。");
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
      password,
    },
    options.configPath
  );

  return {
    success: true,
    url: baseUrl,
    token,
    account,
    configPath: getConfigPath(options.configPath),
  };
}

export async function whoAmI(options: {
  configPath: string;
  url?: string | null;
  token?: string | null;
  account?: string | null;
  password?: string | null;
}): Promise<unknown> {
  const { client } = createApiClient({
    config: options.configPath,
    url: options.url,
    token: options.token,
    account: options.account,
    password: options.password,
  });
  return client.getCurrentUser();
}
