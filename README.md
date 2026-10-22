# Pi-App

Android app for the [pi coding agent](https://github.com/earendil-works/pi), bridging pi on your PC (or on the phone itself via Termux) to a mobile-first UI.

- `server/` — the bridge: a fork of [agegr/pi-web](https://github.com/agegr/pi-web) (MIT). Agent, sessions, files, git, terminal, models, MCP and skills behave exactly as in pi-web. Pi-App adds only a pairing token (Bearer), CORS for the app's WebView, and the `pi-app` launcher with a pairing QR.
- `mobile/` — the Android client: Svelte 5 + Vite + Capacitor 7. It reuses pi-web's client-safe modules from `server/lib` verbatim and sends every `/api/...` call to the paired server.

## Run the server

Needs Node.js 22.19+ and git. One command, on PC or in Termux:

    git clone <this repo> pi-app && cd pi-app
    ./pi-app                      # Windows: pi-app.cmd

The first run installs dependencies and builds the server (a few minutes); later runs start in seconds and rebuild only after `git pull`. It prints a pairing QR plus the server address and token: open the app, tap Pair, scan.

- PC: listens on 0.0.0.0:30141 (Wi-Fi or Tailscale). Tailscale addresses are listed first.
- Termux: detected automatically, listens on 127.0.0.1 only (`pkg install nodejs-lts git python make clang` first).
- Want `pi-app` from any folder? Run `npm i -g .` once inside the repo.
- Options: `--port 4000`, `--local` (loopback only), `--lan` (Termux, expose to LAN).

`pi-app pair` prints the QR again; `pi-app token --rotate` revokes every paired phone.
Off loopback, the server refuses anyone without the token (or `PI_WEB_PASSWORD`).
Plain HTTP is not encrypted: on anything but your own Wi-Fi, use Tailscale.

## Build the app

    cd mobile && npm install
    npm run apk                   # needs JDK 21 + Android SDK
