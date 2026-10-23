# Pi-App

The [pi coding agent](https://github.com/earendil-works/pi) on your phone, in the phone's own browser. Pi runs on your PC (or on the phone itself via Termux); scan a QR and pi-web's UI opens on the phone, already signed in. No app to install.

`server/` is a fork of [agegr/pi-web](https://github.com/agegr/pi-web) (MIT). **The UI, UX and every theme are exactly upstream pi-web's** — same layout, same theme picker (System, light palettes, dark palettes, high contrast, Zenburn), same components and CSS. Pi-App changes only what pairing needs:

- the `pi-app` launcher, which prints a pairing QR;
- browser pairing: the QR opens `/pair#t=<token>`, which trades the token for a sign-in cookie (90 days, revoked by rotating the token);
- one launcher command on Linux, macOS, Termux and Windows.

The earlier Android app (Svelte + Capacitor) is kept on the `archive/svelte` branch and tag `v0.6.1`.

## Run

Needs Node.js 22.19+ and git. One command, the same on every platform:

    git clone https://github.com/zuher5/pi-app.git
    cd pi-app
    pi-app

The first run installs dependencies and builds the server (a few minutes); later runs start in seconds and rebuild only after `git pull`. It prints a QR: scan it with the phone's camera and the link opens pi in the browser. Add it to the home screen from the browser menu for a full-screen app.

`pi-app` registers itself on `PATH` on first run when it can (`$PREFIX/bin` in Termux, `~/.local/bin` on Linux; `npm link` on Windows), so afterwards the command also works from any folder. On Windows, `pi-app` works in PowerShell and in cmd.

- PC: listens on 0.0.0.0:30141. The QR uses the first Wi-Fi address; Tailscale addresses are listed below it (`pi-app pair --url http://100.x.y.z:30141` shows a QR for one).
- Termux: detected automatically, listens on 127.0.0.1 only (`pkg install nodejs-lts git python make clang` first); open the printed link in the phone's browser.
- Options: `--port 4000`, `--local` (loopback only), `--lan` (Termux, expose to LAN).

`pi-app pair` prints the QR again; `pi-app token --rotate` signs every paired browser out.
Off loopback, the server refuses anyone without the pairing link (or `PI_WEB_PASSWORD`, which still opens pi-web's password sign-in).
Plain HTTP is not encrypted: on anything but your own Wi-Fi, use Tailscale.

## Develop

    dev/dev-server.sh                         # mock LLM + server on :30141, token dev-token-change-me-0123456789
    node dev/audit.mjs /tmp/audit 412         # phone screenshots + every touch target under 44px
