import assert from "node:assert/strict";
import test from "node:test";

const TOKEN = "test-token-0123456789-abcdefghijkl";

test("bearer token from the app origin passes the API guard; others do not", async () => {
  process.env.PI_APP_TOKEN = TOKEN;
  const { isApiRequestAllowed } = await import("./request-security.ts");
  const mk = (headers) => new Request("http://100.101.1.2:30141/api/sessions", { method: "POST", headers });
  // Tailscale MagicDNS host + app origin + token: allowed
  assert.equal(isApiRequestAllowed(new Request("http://pc.tail1234.ts.net:30141/api/sessions", {
    method: "POST",
    headers: { host: "pc.tail1234.ts.net:30141", origin: "http://localhost", "sec-fetch-site": "cross-site", authorization: `Bearer ${TOKEN}` },
  })), true);
  // wrong token from the app origin: refused
  assert.equal(isApiRequestAllowed(mk({ host: "100.101.1.2:30141", origin: "http://localhost", "sec-fetch-site": "cross-site", authorization: "Bearer nope-nope-nope-nope-nope-nope" })), false);
  // right token but a foreign website origin: refused
  assert.equal(isApiRequestAllowed(mk({ host: "100.101.1.2:30141", origin: "https://evil.example", "sec-fetch-site": "cross-site", authorization: `Bearer ${TOKEN}` })), false);
  // CLI client with token, no origin: allowed
  assert.equal(isApiRequestAllowed(mk({ host: "100.101.1.2:30141", authorization: `Bearer ${TOKEN}` })), true);
});

test("query token only counts on GET", async () => {
  process.env.PI_APP_TOKEN = TOKEN;
  const { isValidAppToken } = await import("./request-security.ts");
  assert.equal(isValidAppToken(new Request(`http://x/api/files/a.pdf?pi_app_token=${TOKEN}`)), true);
  assert.equal(isValidAppToken(new Request(`http://x/api/agent/1?pi_app_token=${TOKEN}`, { method: "POST" })), false);
});

test("short tokens disable app auth", async () => {
  const { getAppToken } = await import("./request-security.ts");
  assert.equal(getAppToken("short"), null);
});

test("browser pairing: the token buys a signed session cookie that rotation revokes", async () => {
  process.env.PI_APP_TOKEN = TOKEN;
  const { createAppSessionToken, isValidAppSessionToken, isValidAppTokenValue } = await import("./request-security.ts");
  assert.equal(isValidAppTokenValue(TOKEN), true);
  assert.equal(isValidAppTokenValue("nope"), false);
  assert.equal(isValidAppTokenValue(undefined), false);
  const cookie = createAppSessionToken();
  assert.equal(isValidAppSessionToken(cookie), true);
  assert.equal(isValidAppSessionToken(cookie.replace(/.$/, (c) => (c === "0" ? "1" : "0"))), false);
  assert.equal(isValidAppSessionToken(cookie, "another-token-0123456789-abcdefgh"), false);
  assert.equal(isValidAppSessionToken(createAppSessionToken(TOKEN, 0)), false); // expired
  assert.equal(isValidAppSessionToken(undefined), false);
});
