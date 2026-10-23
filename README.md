# Pi-App

The [pi coding agent](https://github.com/earendil-works/pi) on your phone, in the phone's own browser. Pi runs on your PC (or on the phone itself via Termux); scan a QR and pi-web's UI opens on the phone, already signed in. No app to install.

- `server/`: a fork of [agegr/pi-web](https://github.com/agegr/pi-web) (MIT). Agent, sessions, files, git, terminal, models, MCP and skills behave exactly as in pi-web. Pi-App adds:
  - the `pi-app` launcher, which prints a pairing QR;
  - browser pairing: the QR opens `/pair#t=<token>`, which trades the token for a sign-in cookie (90 days, revoked by rotating the token);
  - phone fixes on touch screens (`app/pi-app.css`): 44px touch targets, composer in thumb reach on an empty session, a shorter composer hint;
  - dark themes only: Dark, Catppuccin Mocha (default), Lime, Dusk, Ember, Slate, Zenburn, as one quiet list in Settings → Appearance (pi-web's light, high-contrast and Pine themes are removed).

The earlier Android app (Svelte + Capacitor) is kept on the `archive/svelte` branch and tag `v0.6.1`.

## Run

Needs Node.js 22.19+ and git. One command, on PC or in Termux:

Linux, macOS, Termux:

    git clone https://github.com/zuher5/pi-app.git
    cd pi-app
    ./pi-app

Windows (PowerShell or cmd):

    git clone https://github.com/zuher5/pi-app.git
    cd pi-app
    .\pi-app.cmd

The first run installs dependencies and builds the server (a few minutes); later runs start in seconds and rebuild only after `git pull`. It prints a QR: scan it with the phone's camera and the link opens pi in the browser. Add it to the home screen from the browser menu for a full-screen app.

- PC: listens on 0.0.0.0:30141. The QR uses the first Wi-Fi address; Tailscale addresses are listed below it (`pi-app pair --url http://100.x.y.z:30141` shows a QR for one).
- Termux: detected automatically, listens on 127.0.0.1 only (`pkg install nodejs-lts git python make clang` first); open the printed link in the phone's browser.
- Want `pi-app` from any folder? Run `npm i -g .` once inside the repo.
- Options: `--port 4000`, `--local` (loopback only), `--lan` (Termux, expose to LAN).

`pi-app pair` prints the QR again; `pi-app token --rotate` signs every paired browser out.
Off loopback, the server refuses anyone without the pairing link (or `PI_WEB_PASSWORD`, which still opens pi-web's password sign-in).
Plain HTTP is not encrypted: on anything but your own Wi-Fi, use Tailscale.

## Develop

    dev/dev-server.sh                         # mock LLM + server on :30141, token dev-token-change-me-0123456789
    node dev/audit.mjs /tmp/audit 412         # phone screenshots + every touch target under 44px
    node dev/themes-shots.mjs /tmp/themes     # Mocha, Lime and the theme picker on a phone
