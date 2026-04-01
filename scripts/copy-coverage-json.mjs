import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "data", "alphagenome_coverage.json");
const dest = join(root, "public", "data", "alphagenome_coverage.json");

if (existsSync(src)) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log("Copied data/alphagenome_coverage.json → public/data/");
} else {
  console.warn(
    "copy-coverage-json: data/alphagenome_coverage.json not found (skipping)."
  );
}
