#!/usr/bin/env node
// One-command launcher: `./pi-app` after `git clone`.
// First run installs the server's dependencies and builds it; later runs
// rebuild only when the code changed. Then it starts the server, which
// prints the pairing QR and the server address(es).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, "server");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const say = (msg) => process.stdout.write(`\x1b[36m▸\x1b[0m ${msg}\n`);
const fail = (msg) => { process.stderr.write(`\x1b[31m✖\x1b[0m ${msg}\n`); process.exit(1); };

// Node version gate (pi needs >= 22.19).
const [maj, min] = process.versions.node.split(".").map(Number);
if (maj < 22 || (maj === 22 && min < 19)) {
  fail(`Node ${process.versions.node} is too old. Install Node 22.19+ (https://nodejs.org) and run again.`);
}

function run(cmd, args, label) {
  say(label);
  const r = spawnSync(cmd, args, { cwd: server, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) fail(`${label} failed (exit ${r.status}).`);
}

// Fingerprint of everything that affects the build, so `git pull` triggers a rebuild.
function fingerprint() {
  const h = createHash("sha256");
  const skip = new Set(["node_modules", ".next", ".git", "test-results"]);
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (skip.has(name)) continue;
      const p = path.join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else h.update(`${path.relative(server, p)}:${s.size}:${s.mtimeMs}\n`);
    }
  };
  walk(server);
  return h.digest("hex");
}

const args = process.argv.slice(2);
const stamp = path.join(server, ".next", ".pi-app-build");
const lock = path.join(server, "package-lock.json");
const depsStamp = path.join(server, "node_modules", ".pi-app-deps");
const lockHash = createHash("sha256").update(readFileSync(lock)).digest("hex");

if (!args.includes("--skip-setup")) {
  if (!existsSync(depsStamp) || readFileSync(depsStamp, "utf8") !== lockHash) {
    run(npm, ["ci", "--no-audit", "--no-fund"], "Installing server dependencies (first run takes a few minutes)…");
    writeFileSync(depsStamp, lockHash);
  }
  const fp = fingerprint();
  if (!existsSync(stamp) || readFileSync(stamp, "utf8") !== fp) {
    run(npm, ["run", "build"], "Building the server…");
    writeFileSync(stamp, fingerprint());
  }
}

const cli = path.join(server, "bin", "pi-app.js");
const r = spawnSync(process.execPath, [cli, ...args.filter((a) => a !== "--skip-setup")], { cwd: server, stdio: "inherit" });
process.exit(r.status ?? 0);
