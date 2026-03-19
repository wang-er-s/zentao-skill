import type { CliRunArgs } from "../../cli/types.js";
import { UsageError } from "../../lib/errors.js";
import { listModules } from "../../services/module.js";

function getStringOption(args: CliRunArgs, key: string): string | null {
  const value = args.options[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseProductId(args: CliRunArgs): number {
  const rawId = args.options["product-id"];
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new UsageError("module list 需要 --product-id <id>。");
  }
  return productId;
}

export async function run(args: CliRunArgs): Promise<unknown> {
  return listModules({
    configPath: args.configPath,
    productId: parseProductId(args),
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
  });
}

export default run;
