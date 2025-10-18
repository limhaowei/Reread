import { ComicEntry, Store } from "./types";

const STORAGE_KEY = "webcomic-tracker-store";

export async function loadStore(): Promise<Store> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const raw = result[STORAGE_KEY];
      if (!raw) {
        resolve({ entries: [] });
        return;
      }
      // coerce chapter to number for migration
      const store = raw as Store;
      store.entries = store.entries.map((e) => ({
        ...e,
        chapter: Number.isFinite(Number((e as any).chapter)) ? Number((e as any).chapter) : 0,
      }));
      resolve(store as Store);
    });
  });
}

export async function saveStore(store: Store): Promise<void> {
  return new Promise((resolve) => {
    const payload: Record<string, unknown> = {};
    payload[STORAGE_KEY] = store;
    chrome.storage.local.set(payload, () => resolve());
  });
}

export function exportStore(store: Store): void {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: `webcomic-tracker-${Date.now()}.json` }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

export async function importStore(file: File): Promise<Store> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Store;
  // basic validation
  if (!parsed || !Array.isArray(parsed.entries)) throw new Error("Invalid file format");
  // normalize entries
  parsed.entries = parsed.entries.map((e) => ({
    id: e.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: String(e.title || ""),
    // coerce chapter to number; allow older string-based chapters
    chapter: Number.isFinite(Number((e as any).chapter)) ? Number((e as any).chapter) : 0,
    url: e.url,
    notes: e.notes,
    updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : Date.now(),
  }));
  return parsed;
}
