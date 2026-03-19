export interface CliRunArgs {
  resource: string;
  action: string;
  positionals: string[];
  options: Record<string, string | boolean>;
  rawArgv: string[];
  configPath: string;
}

export type CommandHandler = (args: CliRunArgs) => Promise<unknown>;

export interface CommandModule {
  run?: CommandHandler;
}
