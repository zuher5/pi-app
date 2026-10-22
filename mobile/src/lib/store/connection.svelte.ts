import { Preferences } from "@capacitor/preferences";
import { connect, type Connection, type Pairing } from "../bridge/pairing";
import { installBridge } from "../bridge/transport";

const KEY = "piapp.connection";
export const conn = $state<{ current: Connection | null; ready: boolean; online: boolean }>({ current: null, ready: false, online: true });

export async function restoreConnection(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    const saved = value ? (JSON.parse(value) as Connection) : null;
    if (saved?.url && saved?.token) {
      conn.current = saved;
      installBridge(saved);
    } else installBridge(null);
  } catch {
    installBridge(null);
  }
  conn.ready = true;
}

export async function pairWith(pairing: Pairing): Promise<Connection> {
  const c = await connect(pairing);
  await Preferences.set({ key: KEY, value: JSON.stringify(c) });
  installBridge(c);
  conn.current = c;
  conn.online = true;
  return c;
}

export async function forget(): Promise<void> {
  await Preferences.remove({ key: KEY });
  installBridge(null);
  conn.current = null;
}
