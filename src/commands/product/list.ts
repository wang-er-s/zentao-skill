import type { CliRunArgs } from "../../cli/types.js";
import { listProducts } from "../../services/product.js";

function getStringOption(args: CliRunArgs, key: string): string | null {
  const value = args.options[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function run(args: CliRunArgs): Promise<unknown> {
  return listProducts({
    configPath: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
  });
}

export default run;
