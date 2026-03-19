import type { CliRunArgs } from "../cli/types.js";

export function getStringOption(args: CliRunArgs, key: string): string | null {
  const value = args.options[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getBooleanOption(args: CliRunArgs, key: string): boolean {
  return args.options[key] === true;
}

export function getPositional(args: CliRunArgs, index: number): string | null {
  const value = args.positionals[index];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
