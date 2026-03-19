import type { CliRunArgs } from "../../cli/types.js";
import { getStory, parseStoryId } from "../../services/story.js";

function getStringOption(args: CliRunArgs, key: string): string | null {
  const value = args.options[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function run(args: CliRunArgs): Promise<unknown> {
  return getStory({
    config: args.configPath,
    url: getStringOption(args, "url"),
    token: getStringOption(args, "token"),
    account: getStringOption(args, "account"),
    password: getStringOption(args, "password"),
    storyId: parseStoryId(args.positionals[0]),
  });
}

export default run;
