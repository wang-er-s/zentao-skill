import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "Skill", "zentao", "scripts");
const outFile = path.join(outDir, "zentao.js");

fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [path.join(rootDir, "src", "cli", "index.ts")],
  outfile: outFile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  sourcemap: false,
});

process.stdout.write(`Built skill script: ${outFile}\n`);
