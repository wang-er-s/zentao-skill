import type { CliRunArgs } from "../../cli/types.js";
import { getPositional, getStringOption } from "../../lib/cli.js";
import { UsageError } from "../../lib/errors.js";
import { assignStory, parseStoryId } from "../../services/story.js";

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
    storyId: parseStoryId(getPositional(args, 0)),
    assignedTo,
    comment: getStringOption(args, "comment"),
    storyType: getStringOption(args, "story-type"),
  });
}

export default run;
