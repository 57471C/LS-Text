import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

if (process.platform !== "win32") {
  console.error("build:msi only runs on Windows.");
  process.exit(1);
}

const build = spawnSync(
  "npx",
  ["tauri", "build", "--bundles", "msi"],
  { stdio: "inherit", shell: true },
);
if (build.status !== 0) process.exit(build.status ?? 1);

const dir = join("src-tauri", "target", "release", "bundle", "msi");
const msis = readdirSync(dir)
  .filter((name) => name.endsWith(".msi"))
  .map((name) => join(dir, name))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
const msi = msis[0];
if (!msi) {
  console.error(`No MSI in ${dir}`);
  process.exit(1);
}

const thumb = process.env.MSI_THUMBPRINT;
const pfx = process.env.MSI_PFX;
const timestamp = process.env.MSI_TIMESTAMP_URL || "http://timestamp.digicert.com";

if (!thumb && !pfx) {
  console.log(`\nUnsigned MSI: ${msi}`);
  console.log("Set MSI_THUMBPRINT (cert store) or MSI_PFX + MSI_PFX_PASSWORD to sign.");
  process.exit(0);
}

const args = ["sign", "/fd", "SHA256", "/td", "SHA256", "/tr", timestamp];
if (thumb) args.push("/sha1", thumb);
else args.push("/f", pfx, "/p", process.env.MSI_PFX_PASSWORD || "");
args.push(msi);

const sign = spawnSync("signtool", args, { stdio: "inherit", shell: true });
if (sign.status !== 0) process.exit(sign.status ?? 1);
console.log(`\nSigned MSI: ${msi}`);
