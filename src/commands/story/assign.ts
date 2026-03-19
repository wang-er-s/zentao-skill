import type { CliRunArgs } from "../../cli/types.js";
import { UsageError } from "../../lib/errors.js";
import { assignStory, parseStoryId } from "../../services/story.js";

function getStringOption(args: CliRunArgs, key: string): string | null {
  const value = args.options[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function run(args: CliRunArgs): Promise<unknown> {
  const assignedTo = getStringOption(args, "to");
  if (!assignedTo) {
    throw new UsageError("缺少 --to。");
  }

  return assignStory({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    cookie: getStringOption(args, "cookie"),
    storyId: parseStoryId(args.positionals[0]),
    assignedTo,
    comment: getStringOption(args, "comment"),
    storyType: getStringOption(args, "story-type"),
  });
}

export default run;
