#!/usr/bin/env bash
# Start mock LLM + pi-app server (dev) with an isolated agent dir and a demo project.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
export NO_PROXY="127.0.0.1,localhost${NO_PROXY:+,$NO_PROXY}" no_proxy="127.0.0.1,localhost${no_proxy:+,$no_proxy}"
export PI_CODING_AGENT_DIR="${PI_CODING_AGENT_DIR:-/workspace/work/piapp-dev/agent}"
DEMO="${DEMO_PROJECT:-/workspace/work/piapp-dev/demo}"
mkdir -p "$PI_CODING_AGENT_DIR" "$DEMO/src"
[ -f "$DEMO/README.md" ] || { echo "# Demo project" > "$DEMO/README.md"; echo "export const x = 1;" > "$DEMO/src/index.ts"; (cd "$DEMO" && git init -q && git add -A && git -c user.email=d@d -c user.name=d commit -qm init); }
cat > "$PI_CODING_AGENT_DIR/models.json" <<JSON
{ "providers": { "mock": { "baseUrl": "http://127.0.0.1:4010/v1", "api": "openai-completions", "apiKey": "mock",
  "models": [ { "id": "mock-coder", "name": "Mock Coder", "contextWindow": 128000, "maxTokens": 8000 },
    { "id": "mock-thinker", "name": "Mock Thinker", "reasoning": true, "contextWindow": 200000, "maxTokens": 16000 } ] } } }
JSON
cat > "$PI_CODING_AGENT_DIR/settings.json" <<JSON
{ "defaultProvider": "mock", "defaultModel": "mock-coder" }
JSON
node "$HERE/mock-llm.mjs" &
cd "$HERE/../server"
PI_APP_TOKEN="${PI_APP_TOKEN:-dev-token-change-me-0123456789}" PI_APP_REQUIRE_TOKEN="${PI_APP_REQUIRE_TOKEN:-1}" PI_WEB_DEFAULT_CWD="$DEMO" exec npx next dev -H 0.0.0.0 -p 30141
