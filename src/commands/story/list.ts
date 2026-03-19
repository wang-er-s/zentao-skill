import type { CliRunArgs } from "../../cli/types.js";
import { UsageError } from "../../lib/errors.js";
import { listStories, parseLimit, parseModuleId, parseProductId } from "../../services/story.js";

function getStringOption(args: CliRunArgs, key: string): string | null {
  const value = args.options[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function run(args: CliRunArgs): Promise<unknown> {
  if (args.options.mine === true && args.options["assigned-to"]) {
    throw new UsageError("--mine 和 --assigned-to 不能同时使用。");
  }

  return listStories({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    productId: parseProductId(args.options["product-id"]),
    moduleId: parseModuleId(args.options["module-id"]),
    assignedTo: getStringOption(args, "assigned-to"),
    mine: args.options.mine === true,
    limit: parseLimit(args.options.limit),
    status: getStringOption(args, "status"),
  });
}

export default run;
