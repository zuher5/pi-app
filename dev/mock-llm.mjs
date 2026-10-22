// Dev fixture: a tiny OpenAI-compatible chat-completions server that streams a
// reply, and on prompts containing "ls" first asks for a bash tool call.
// Lets the UI be built against real pi events without model credentials.
import http from "node:http";

const port = Number(process.env.MOCK_LLM_PORT || 4010);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chunk(res, delta, finish = null) {
  res.write(`data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 0, model: "mock", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url.endsWith("/models")) {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ data: [{ id: "mock-coder", object: "model" }] }));
  }
  let body = "";
  for await (const c of req) body += c;
  const json = JSON.parse(body || "{}");
  const messages = json.messages ?? [];
  const last = messages[messages.length - 1];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = typeof lastUser?.content === "string" ? lastUser.content : JSON.stringify(lastUser?.content ?? "");
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  if (last?.role !== "tool" && /\bls\b/.test(userText)) {
    chunk(res, { role: "assistant", content: "Let me look at the files." });
    await sleep(150);
    chunk(res, { tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "bash", arguments: "" } }] });
    chunk(res, { tool_calls: [{ index: 0, function: { arguments: JSON.stringify({ command: "ls -la" }) } }] });
    chunk(res, {}, "tool_calls");
  } else {
    const reply = last?.role === "tool"
      ? "Here is what I found:\n\n- `README.md` describes the project\n- `src/` holds the code\n\n```ts\nexport const ok = true;\n```\n\nAnything else?"
      : `You said: **${userText.slice(0, 80)}**. I'm a mock model, streaming this reply word by word so the UI can be tested.`;
    chunk(res, { role: "assistant", content: "" });
    for (const word of reply.split(/(\s+)/)) {
      chunk(res, { content: word });
      await sleep(25);
    }
    chunk(res, {}, "stop");
  }
  res.write(`data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", choices: [], usage: { prompt_tokens: 1200, completion_tokens: 80, total_tokens: 1280 } })}\n\n`);
  res.end("data: [DONE]\n\n");
}).listen(port, "127.0.0.1", () => console.log(`mock llm on :${port}`));
