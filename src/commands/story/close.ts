import type { CliRunArgs } from "../../cli/types.js";
import { getPositional, getStringOption } from "../../lib/cli.js";
import { UsageError } from "../../lib/errors.js";
import { closeStory, parseDuplicateStoryId, parseStoryId } from "../../services/story.js";

export async function run(args: CliRunArgs): Promise<unknown> {
  const reason = getStringOption(args, "reason");
  if (!reason) {
    throw new UsageError("缺少 --reason。");
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
    duplicateStory: parseDuplicateStoryId(args.options["duplicate-story"]),
  });
}

export default run;
