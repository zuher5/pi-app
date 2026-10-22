import assert from "node:assert/strict";
import test from "node:test";
import { parsePairingLink, manualPairing, connect, PairingError } from "./pairing.ts";
import { SseParser, FetchEventSource } from "./sse.ts";

const T = "abcdefghijklmnopqrstuvwxyz012345";

test("parses the QR link pi-app prints", () => {
  const p = parsePairingLink(`piapp://pair?u=http%3A%2F%2F100.88.1.2%3A30141&u=http%3A%2F%2F192.168.1.5%3A30141&t=${T}&n=laptop`);
  assert.deepEqual(p, { urls: ["http://100.88.1.2:30141", "http://192.168.1.5:30141"], token: T, name: "laptop" });
  assert.throws(() => parsePairingLink("https://example.com"), PairingError);
  assert.throws(() => parsePairingLink("piapp://pair?u=http://a:1&t=short"), PairingError);
});

test("manual entry adds scheme and default port", () => {
  assert.deepEqual(manualPairing("192.168.1.5", T).urls, ["http://192.168.1.5:30141"]);
  assert.deepEqual(manualPairing("http://pc.ts.net:8080", T).urls, ["http://pc.ts.net:8080"]);
});

test("connect picks the first reachable server, reports bad tokens", async () => {
  const fakeFetch = async (url, init) => {
    if (url.startsWith("http://dead")) throw new TypeError("fail");
    if (init.headers.Authorization !== `Bearer ${T}`) return new Response("", { status: 401 });
    return Response.json({ runningSessionIds: [] });
  };
  const c = await connect({ urls: ["http://dead:1", "http://ok:2"], token: T, name: "x" }, fakeFetch);
  assert.equal(c.url, "http://ok:2");
  await assert.rejects(connect({ urls: ["http://ok:2"], token: "z".repeat(30), name: "x" }, fakeFetch), /refused/);
});

test("SSE parser handles split chunks, CRLF, comments", () => {
  const got = []; let beats = 0;
  const p = new SseParser((d) => got.push(d), () => beats++);
  p.feed('data: {"a":'); p.feed('1}\r\n\r\n: ping\n\ndata: x\ndata: y\n\n');
  assert.deepEqual(got, ['{"a":1}', "x\ny"]);
  assert.equal(beats, 1);
});

test("FetchEventSource streams and reports the end as an error", async () => {
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("data: one\n\ndata: two\n\n")); c.close(); } });
  const seen = [];
  await new Promise((resolve) => {
    const es = new FetchEventSource("http://x/api/agent/1/events", {
      headers: { Authorization: "Bearer t" },
      fetchImpl: async (_u, init) => { assert.equal(init.headers.Authorization, "Bearer t"); return new Response(body); },
    });
    es.onmessage = (e) => seen.push(e.data);
    es.onerror = () => { assert.equal(es.readyState, 2); resolve(); };
  });
  assert.deepEqual(seen, ["one", "two"]);
});
