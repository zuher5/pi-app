/** Two UI languages: English and Bahasa Indonesia. Defaults to the device language. */
const en = {
  "nav.sessions": "Sessions", "nav.chat": "Chat", "nav.files": "Files", "nav.terminal": "Terminal", "nav.settings": "Settings",
  "status.idle": "Idle", "status.streaming": "Working", "status.waiting": "Needs you", "status.disconnected": "Offline", "status.connecting": "Connecting",
  "pair.title": "Connect to your pi", "pair.lead": "On the PC or in Termux, run pi-app. Scan the QR it prints, or enter the address and token.",
  "pair.scan": "Scan QR code", "pair.manual": "Enter manually", "pair.server": "Server address", "pair.serverHint": "e.g. 192.168.1.5:30141 or 127.0.0.1:30141 for Termux",
  "pair.token": "Token", "pair.tokenHint": "The long code printed under the QR", "pair.connect": "Connect", "pair.connecting": "Connecting…",
  "pair.termux": "Server on this phone (Termux)",
  "sessions.title": "Sessions", "sessions.search": "Search sessions", "sessions.new": "New session", "sessions.empty": "No sessions yet",
  "sessions.emptyLead": "Start one in a project folder. It stays on the server, so you can continue it from the PC too.",
  "sessions.running": "running", "sessions.messages": "{n} messages", "sessions.loadError": "Couldn't load sessions.", "sessions.retry": "Retry",
  "new.title": "New session", "new.folder": "Project folder", "new.folderHint": "Absolute path on the server", "new.recent": "Recent projects", "new.start": "Start",
  "chat.none": "No session open", "chat.noneLead": "Pick a session or start a new one.", "chat.placeholder": "Message pi…", "chat.placeholderSteer": "Steer the agent…",
  "chat.send": "Send", "chat.stop": "Stop", "chat.steer": "Steer", "chat.followUp": "Queue", "chat.empty": "Ask pi to do something in {project}.",
  "chat.tool.running": "Running", "chat.tool.done": "Done", "chat.tool.error": "Failed", "chat.thinking": "Thinking", "chat.retrying": "Retrying ({a}/{m})…",
  "chat.olderLoad": "Load earlier messages", "chat.error": "The model returned an error", "chat.reconnect": "Reconnecting to the server…",
  "chat.copy": "Copy", "chat.copied": "Copied",
  "settings.title": "Settings", "settings.server": "Server", "settings.connectedTo": "Connected to {name}", "settings.unpair": "Forget this server",
  "settings.language": "Language", "settings.theme": "Theme", "settings.theme.system": "System", "settings.theme.light": "Latte (light)", "settings.theme.dark": "Mocha (dark)",
  "files.browse": "Browse", "files.changes": "Changes", "files.empty": "This folder is empty", "files.noProject": "Pick a project, or open a session to follow its folder.",
  "files.upload": "Upload", "files.uploaded": "Uploaded {n} file(s)", "files.conflict": "{names} already exist. Replace?", "files.replace": "Replace", "files.skip": "Skip",
  "files.clean": "No changes. The working tree is clean.", "files.notGit": "This project isn't a Git repository.", "files.hidden": "Show hidden",
  "file.view": "File", "file.diff": "Diff", "file.edit": "Edit", "file.save": "Save", "file.cancel": "Cancel", "file.saved": "Saved", "file.download": "Download",
  "file.changedOnServer": "The file changed on the server since you opened it. Save anyway?", "file.saveAnyway": "Save anyway", "file.binary": "No preview for this file type.",
  "file.tooBig": "Showing the first 2 MB. Editing is off for files this large.", "file.noDiff": "No changes in this file.", "file.unsaved": "Discard your edits?", "file.discard": "Discard",
  "term.new": "New terminal", "term.noProject": "Pick a project to open a shell in it.", "term.exited": "Process exited ({code}).", "term.restart": "Restart",
  "term.keys": "Keys",
  "err.network": "Can't reach the server.", "err.generic": "Something went wrong: {msg}",
} as const;

type Key = keyof typeof en;
const id: Record<Key, string> = {
  "nav.sessions": "Sesi", "nav.chat": "Chat", "nav.files": "File", "nav.terminal": "Terminal", "nav.settings": "Setelan",
  "status.idle": "Siaga", "status.streaming": "Bekerja", "status.waiting": "Perlu kamu", "status.disconnected": "Terputus", "status.connecting": "Menghubungkan",
  "pair.title": "Hubungkan ke pi", "pair.lead": "Di PC atau Termux, jalankan pi-app. Pindai QR yang muncul, atau isi alamat dan token.",
  "pair.scan": "Pindai kode QR", "pair.manual": "Isi manual", "pair.server": "Alamat server", "pair.serverHint": "mis. 192.168.1.5:30141 atau 127.0.0.1:30141 untuk Termux",
  "pair.token": "Token", "pair.tokenHint": "Kode panjang di bawah QR", "pair.connect": "Hubungkan", "pair.connecting": "Menghubungkan…",
  "pair.termux": "Server di HP ini (Termux)",
  "sessions.title": "Sesi", "sessions.search": "Cari sesi", "sessions.new": "Sesi baru", "sessions.empty": "Belum ada sesi",
  "sessions.emptyLead": "Mulai di folder proyek. Sesi tersimpan di server, jadi bisa dilanjutkan dari PC juga.",
  "sessions.running": "berjalan", "sessions.messages": "{n} pesan", "sessions.loadError": "Gagal memuat sesi.", "sessions.retry": "Coba lagi",
  "new.title": "Sesi baru", "new.folder": "Folder proyek", "new.folderHint": "Path absolut di server", "new.recent": "Proyek terakhir", "new.start": "Mulai",
  "chat.none": "Belum ada sesi terbuka", "chat.noneLead": "Pilih sesi atau mulai sesi baru.", "chat.placeholder": "Pesan untuk pi…", "chat.placeholderSteer": "Arahkan agent…",
  "chat.send": "Kirim", "chat.stop": "Hentikan", "chat.steer": "Arahkan", "chat.followUp": "Antrekan", "chat.empty": "Minta pi mengerjakan sesuatu di {project}.",
  "chat.tool.running": "Berjalan", "chat.tool.done": "Selesai", "chat.tool.error": "Gagal", "chat.thinking": "Berpikir", "chat.retrying": "Mencoba lagi ({a}/{m})…",
  "chat.olderLoad": "Muat pesan sebelumnya", "chat.error": "Model mengembalikan error", "chat.reconnect": "Menyambung ulang ke server…",
  "chat.copy": "Salin", "chat.copied": "Tersalin",
  "settings.title": "Setelan", "settings.server": "Server", "settings.connectedTo": "Terhubung ke {name}", "settings.unpair": "Lupakan server ini",
  "settings.language": "Bahasa", "settings.theme": "Tema", "settings.theme.system": "Ikuti sistem", "settings.theme.light": "Latte (terang)", "settings.theme.dark": "Mocha (gelap)",
  "files.browse": "Jelajah", "files.changes": "Perubahan", "files.empty": "Folder ini kosong", "files.noProject": "Pilih proyek, atau buka sesi agar mengikuti foldernya.",
  "files.upload": "Unggah", "files.uploaded": "{n} file terunggah", "files.conflict": "{names} sudah ada. Timpa?", "files.replace": "Timpa", "files.skip": "Lewati",
  "files.clean": "Tidak ada perubahan. Working tree bersih.", "files.notGit": "Proyek ini bukan repositori Git.", "files.hidden": "Tampilkan tersembunyi",
  "file.view": "File", "file.diff": "Diff", "file.edit": "Edit", "file.save": "Simpan", "file.cancel": "Batal", "file.saved": "Tersimpan", "file.download": "Unduh",
  "file.changedOnServer": "File berubah di server sejak kamu buka. Tetap simpan?", "file.saveAnyway": "Tetap simpan", "file.binary": "Tidak ada pratinjau untuk jenis file ini.",
  "file.tooBig": "Menampilkan 2 MB pertama. Edit dimatikan untuk file sebesar ini.", "file.noDiff": "Tidak ada perubahan di file ini.", "file.unsaved": "Buang suntingan?", "file.discard": "Buang",
  "term.new": "Terminal baru", "term.noProject": "Pilih proyek untuk membuka shell di dalamnya.", "term.exited": "Proses selesai ({code}).", "term.restart": "Mulai ulang",
  "term.keys": "Tombol",
  "err.network": "Server tidak terjangkau.", "err.generic": "Terjadi kesalahan: {msg}",
};

export type Locale = "en" | "id";
const dicts: Record<Locale, Record<Key, string>> = { en, id };

function detect(): Locale {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem("piapp.locale") : null;
  if (saved === "en" || saved === "id") return saved;
  return (navigator.language || "en").toLowerCase().startsWith("id") ? "id" : "en";
}

export const i18n = $state({ locale: detect() as Locale });

export function setLocale(locale: Locale): void {
  i18n.locale = locale;
  localStorage.setItem("piapp.locale", locale);
  document.documentElement.lang = locale;
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = dicts[i18n.locale][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
