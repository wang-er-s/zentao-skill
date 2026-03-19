import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ZentaoConfig {
  url?: string;
  token?: string;
  account?: string;
  password?: string;
  webCookie?: string;
}

export function normalizeBaseUrl(baseUrl: string | null | undefined): string {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

export function getConfigPath(explicitPath?: string | null): string {
  if (explicitPath) return path.resolve(String(explicitPath));
  return path.join(os.homedir(), ".zentao", "config.json");
}

export function loadConfig(configPath = getConfigPath()): ZentaoConfig {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveConfig(config: ZentaoConfig, configPath = getConfigPath()): string {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return configPath;
}

export function pickConfigValue<T>(...values: Array<T | null | undefined | "">): T | null {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value as T;
    }
  }
  return null;
}
