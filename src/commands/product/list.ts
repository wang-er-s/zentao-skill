import type { CliRunArgs } from "../../cli/types.js";
import { getStringOption } from "../../lib/cli.js";
import { listProducts } from "../../services/product.js";

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
