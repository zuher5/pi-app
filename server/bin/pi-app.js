#!/usr/bin/env node
"use strict";

/*
 * pi-app: the Pi-App bridge server. It is pi-web's server, started with a
 * pairing token so the Android app can connect, and a QR code to pair with.
 *
 *   pi-app                 PC mode: listen on the LAN (0.0.0.0), print QR
 *   pi-app --local         Termux / same device: listen on 127.0.0.1 only
 *   pi-app pair            print the QR / pairing link of the saved token again
 *   pi-app token --rotate  issue a new token (paired phones must pair again)
 *
 * Every other pi-web command and option still works (-p, status, stop, ...).
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_PORT = "30141";

function agentDir() {
  const configured = process.env.PI_CODING_AGENT_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(os.homedir(), ".pi", "agent");
}

function configPath() {
  return path.join(agentDir(), "pi-app.json");
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(agentDir(), { recursive: true });
  const file = configPath();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  try { fs.chmodSync(file, 0o600); } catch { /* Windows */ }
}

function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function loadToken({ rotate = false } = {}) {
  if (process.env.PI_APP_TOKEN?.trim() && !rotate) return process.env.PI_APP_TOKEN.trim();
  const config = readConfig();
  if (!rotate && typeof config.token === "string" && config.token.length >= 24) return config.token;
  const token = newToken();
  writeConfig({ ...config, token, createdAt: new Date().toISOString() });
  return token;
}

function isTermux() {
  return Boolean(process.env.TERMUX_VERSION) || (process.env.PREFIX ?? "").includes("com.termux");
}

/** Addresses a phone can reach: LAN and Tailscale (100.64/10) IPv4s. */
function reachableAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const info of list ?? []) {
      if (info.family === "IPv4" && !info.internal) out.push(info.address);
    }
  }
  const tailscale = (ip) => ip.startsWith("100.") && Number(ip.split(".")[1]) >= 64 && Number(ip.split(".")[1]) < 128;
  return out.sort((a, b) => Number(tailscale(b)) - Number(tailscale(a)));
}

function pairingUrls(hostname, port) {
  if (hostname === "127.0.0.1" || hostname === "localhost") return [`http://127.0.0.1:${port}`];
  if (hostname === "0.0.0.0" || hostname === "::") {
    return reachableAddresses().map((ip) => `http://${ip}:${port}`);
  }
  return [`http://${hostname}:${port}`];
}

function pairingLink(urls, token) {
  const params = new URLSearchParams();
  for (const url of urls) params.append("u", url);
  params.set("t", token);
  params.set("n", os.hostname());
  return `piapp://pair?${params.toString()}`;
}

function printPairing(urls, token) {
  const link = pairingLink(urls, token);
  const out = process.stdout;
  out.write("\n  Pi-App pairing — scan with the app (Pair → Scan QR)\n\n");
  try {
    const qrcode = require("qrcode-terminal");
    qrcode.generate(link, { small: true }, (qr) => out.write(`${qr.replace(/^/gm, "  ")}\n`));
  } catch {
    out.write("  (install qrcode-terminal to show a QR code)\n");
  }
  out.write("\n  Or enter manually:\n");
  for (const url of urls) out.write(`    Server  ${url}\n`);
  out.write(`    Token   ${token}\n\n`);
  out.write("  Keep the token private: it grants full control of pi on this machine.\n\n");
}

function takeFlag(args, ...names) {
  const index = args.findIndex((arg) => names.includes(arg));
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

function optionValue(args, long, short, fallback) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === long || args[i] === short) return args[i + 1] ?? fallback;
    if (args[i].startsWith(`${long}=`)) return args[i].slice(long.length + 1);
  }
  return fallback;
}

function main() {
  const args = process.argv.slice(2);
  const first = args[0];

  if (first === "token") {
    const token = loadToken({ rotate: args.includes("--rotate") });
    process.stdout.write(`${token}\n`);
    return;
  }

  const local = takeFlag(args, "--local") || (isTermux() && !takeFlag(args, "--lan"));
  takeFlag(args, "--lan");

  const hasHostname = args.some((arg) => arg === "-H" || arg === "--hostname" || arg.startsWith("--hostname="))
    || Boolean(process.env.PI_WEB_HOSTNAME);
  const hostname = optionValue(args, "--hostname", "-H", process.env.PI_WEB_HOSTNAME || (local ? "127.0.0.1" : "0.0.0.0"));
  const port = optionValue(args, "--port", "-p", process.env.PORT || DEFAULT_PORT);
  const token = loadToken();

  if (first === "pair") {
    printPairing(pairingUrls(hostname, port), token);
    return;
  }

  const isServerStart = !first || first.startsWith("-");
  if (isServerStart) {
    if (!hasHostname) args.push("--hostname", hostname);
    if (!args.includes("--no-open")) args.push("--no-open");
    process.env.PI_APP_TOKEN = token;
    process.env.PI_WEB_APP_NAME ||= "Pi-App";
    // Off loopback, nobody gets in without the token (or the web password).
    if (hostname !== "127.0.0.1" && hostname !== "localhost") process.env.PI_APP_REQUIRE_TOKEN = "1";
    printPairing(pairingUrls(hostname, port), token);
  }

  process.argv = [process.argv[0], path.join(__dirname, "pi-web.js"), ...args];
  require("./pi-web.js");
}

main();
