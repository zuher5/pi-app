import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.piapp.app",
  appName: "Pi-App",
  webDir: "dist",
  server: {
    // http://localhost origin: lets the app reach a plain-HTTP pi-app server
    // on the LAN, Tailscale, or Termux (127.0.0.1) without mixed-content blocks.
    androidScheme: "http",
    cleartext: true,
  },
  android: { allowMixedContent: false },
  plugins: {
    Keyboard: { resize: "native", resizeOnFullScreen: true },
  },
};

export default config;
