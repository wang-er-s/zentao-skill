import type { CliRunArgs } from "../../cli/types.js";
import { getPositional, getStringOption } from "../../lib/cli.js";
import { getStory, parseStoryId } from "../../services/story.js";

export async function run(args: CliRunArgs): Promise<unknown> {
  return getStory({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    storyId: parseStoryId(getPositional(args, 0)),
  });
}

export default run;
