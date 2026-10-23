# Product

<!-- impeccable:product-schema 1 -->

## Platform
Web / PWA (desktop, tablet, mobile browser)

## Stack
Next.js (App Router) + React + TypeScript, forked from [agegr/pi-web](https://github.com/agegr/pi-web) (MIT). Pi-App keeps the upstream client and server byte-for-byte except for the pairing bridge and launcher.

## Product Purpose
Pi-App puts the `pi` coding agent on a phone, in the phone's own browser, without installing an app: run `pi-app`, scan the QR, and the full pi-web UI opens already signed in. Everything pi-web does — streaming chat, branching, files, git, terminal, models, MCP, skills, settings — behaves exactly as upstream, with upstream's UI, UX and themes.

## Positioning
Not a re-skin. Pi-App is pi-web plus two things: a one-command launcher that works the same on Linux, macOS, Termux and Windows, and QR pairing that links a phone to the running server.

## Capabilities and Constraints
- Themes: 4 clean, proportional tiles in a 2x2 grid (System, Light, Catppuccin Mocha [default], Lime) with plain, neutral borders and no loud colored accents.
- Mobile composer: More controls dropdown ("configured" tool presets, reasoning levels) elevated and bounded within the mobile browser screen.
- Pairing: the QR opens `/pair#t=<token>`; the token is traded for a 90-day sign-in cookie, revoked by rotating the token. Off loopback every request needs it (or `PI_WEB_PASSWORD`).
- Launcher: `pi-app` installs dependencies and builds only when the code changed, then starts the server and prints the QR; `pi-app pair` reprints it; `pi-app token --rotate` signs paired browsers out.
- Plain HTTP on LAN; Tailscale recommended outside home. Termux listens on loopback only.

## Brand Commitments
Name: "Pi-App". No logo or brand assets; upstream pi-web's visual identity is the app's identity.

## Product Principles
1. Upstream first: any UI or behaviour question is answered by pi-web, not by Pi-App.
2. The fork stays small enough to rebase on upstream at any time.
3. Pairing never widens exposure: nothing off loopback answers without the token.
4. One command, every platform.
