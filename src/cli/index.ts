import os from "node:os";
import path from "node:path";
import process from "node:process";

import type { CliRunArgs, CommandModule } from "./types.js";
import { CliError, getErrorMessage } from "../lib/errors.js";
import { writeJson } from "../lib/output.js";

type CommandLoader = () => Promise<CommandModule>;

const COMMANDS: Record<string, CommandLoader> = {
  "user login": () => import("../commands/user/login.js"),
  "user whoami": () => import("../commands/user/whoami.js"),
  "product list": () => import("../commands/product/list.js"),
  "product get": () => import("../commands/product/get.js"),
  "module list": () => import("../commands/module/list.js"),
  "story list": () => import("../commands/story/list.js"),
  "story get": () => import("../commands/story/get.js"),
  "story assign": () => import("../commands/story/assign.js"),
  "story close": () => import("../commands/story/close.js"),
};

function printHelp(): void {
  const lines = [
    "Zentao CLI",
    "",
    "Usage:",
    "  zentao <resource> <action> [options]",
    "  zentao help",
    "",
    "Commands:",
    "  user login",
    "  user whoami",
    "  product list",
    "  product get <id>",
    "  module list --product-id <id>",
    "  story list --product-id <id>",
    "  story get <id>",
    "  story assign <id> --to <account>",
    "  story close <id> --reason <reason>",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function parseArgv(argv: string[]): { positionals: string[]; options: Record<string, string | boolean> } {
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const [flag, inline] = token.split("=", 2);
    const key = flag.slice(2);
    if (!key) continue;

    if (inline !== undefined) {
      options[key] = inline;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
      continue;
    }

    options[key] = true;
  }

  return { positionals, options };
}

function getDefaultConfigPath(): string {
  return path.join(os.homedir(), ".zentao", "config.json");
}

async function run(): Promise<void> {
  const rawArgv = process.argv.slice(2);
  const { positionals, options } = parseArgv(rawArgv);
  const [resource = "", action = ""] = positionals;

  if (!resource || resource === "help" || options.help === true) {
    printHelp();
    return;
  }

  if (!action) {
    throw new Error("Missing action. Run `zentao help` for usage.");
  }

  const key = `${resource} ${action}`;
  const loader = COMMANDS[key];
  if (!loader) {
    throw new Error(`Unknown command: ${key}`);
  }

  const module = await loader();
  if (typeof module.run !== "function") {
    throw new Error(`Command module '${key}' must export async run(args).`);
  }

  const configPathOption = options["config-path"];
  const configPath =
    typeof configPathOption === "string" && configPathOption.trim()
      ? configPathOption.trim()
      : getDefaultConfigPath();

  const args: CliRunArgs = {
    resource,
    action,
    positionals: positionals.slice(2),
    options,
    rawArgv,
    configPath,
  };

  const result = await module.run(args);
  if (result !== undefined) {
    writeJson(result);
  }
}

run().catch((error) => {
  process.stderr.write(`${getErrorMessage(error)}\n`);
  process.exitCode = error instanceof CliError ? error.exitCode : 1;
});
