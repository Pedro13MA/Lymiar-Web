/**
 * After `next build` — copy one PDP shell to /p/fallback/ for nginx try_files.
 */
import fs from "node:fs";
import path from "node:path";

const outP = path.join(process.cwd(), "out", "p");
const fallbackDir = path.join(outP, "fallback");

if (!fs.existsSync(outP)) {
  console.warn("post_export_pdp_fallback: out/p missing — skip");
  process.exit(0);
}

const candidates = fs
  .readdirSync(outP, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "fallback")
  .map((d) => d.name);

const donor = candidates.find((name) =>
  fs.existsSync(path.join(outP, name, "index.html")),
);

if (!donor) {
  console.warn("post_export_pdp_fallback: no donor index.html in out/p/*");
  process.exit(0);
}

fs.mkdirSync(fallbackDir, { recursive: true });
const src = path.join(outP, donor, "index.html");
const dest = path.join(fallbackDir, "index.html");
fs.copyFileSync(src, dest);
console.log(`post_export_pdp_fallback: ${donor}/index.html -> p/fallback/index.html`);
