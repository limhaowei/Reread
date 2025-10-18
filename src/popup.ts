import { ComicEntry, Store } from "./types";
import { loadStore, saveStore, exportStore, importStore } from "./storage";

function el<T extends HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

async function render() {
  const store = await loadStore();
  const list = el<HTMLUListElement>("list");
  list.innerHTML = "";
  for (const entry of store.entries.slice().sort((a, b) => b.updatedAt - a.updatedAt)) {
    const li = document.createElement("li");
    li.className = "card";
    const left = document.createElement("div");
    left.style.flex = "1";
    left.innerHTML = `<div><strong>${escapeHtml(entry.title)}</strong></div>`;

    const meta = document.createElement("div");
    meta.className = "meta";
    const urlPart = entry.url ? ` — <a href='#' data-url='${escapeHtml(entry.url)}'>open</a>` : "";
    meta.innerHTML = `Chapter `;

    const chapterInput = document.createElement("input");
    chapterInput.className = "chapter-inline";
    chapterInput.type = "number";
    chapterInput.value = String(entry.chapter);
    chapterInput.setAttribute("aria-label", `Chapter for ${entry.title}`);

    meta.appendChild(chapterInput);
    if (entry.url) {
      const anchor = document.createElement("span");
      anchor.innerHTML = urlPart;
      meta.appendChild(anchor);
    }

    const controls = document.createElement("div");
    controls.className = "controls";
    const dec = document.createElement("button");
    dec.textContent = "−";
    const inc = document.createElement("button");
    inc.textContent = "+";
    const del = document.createElement("button");
    del.textContent = "Delete";

    controls.appendChild(dec);
    controls.appendChild(inc);
    controls.appendChild(del);

    li.appendChild(left);
    li.appendChild(meta);
    li.appendChild(controls);
    list.appendChild(li);

    // inline edit: save on blur or Enter key
    chapterInput.addEventListener("keydown", async (ev) => {
      if (ev.key === "Enter") {
        (ev.target as HTMLInputElement).blur();
      }
    });
    chapterInput.addEventListener("blur", async () => {
      const v = Number(chapterInput.value || 0);
      if (!Number.isFinite(v)) return;
      entry.chapter = Math.max(0, v);
      entry.updatedAt = Date.now();
      await saveStore(store);
      await render();
    });

    inc.addEventListener("click", async () => {
      entry.chapter = Number(entry.chapter || 0) + 1;
      entry.updatedAt = Date.now();
      await saveStore(store);
      await render();
    });

    dec.addEventListener("click", async () => {
      entry.chapter = Math.max(0, Number(entry.chapter || 0) - 1);
      entry.updatedAt = Date.now();
      await saveStore(store);
      await render();
    });

    del.addEventListener("click", async () => {
      store.entries = store.entries.filter((e) => e.id !== entry.id);
      await saveStore(store);
      await render();
    });

    const openLink = meta.querySelector("a[data-url]") as HTMLAnchorElement | null;
    if (openLink) {
      openLink.addEventListener("click", (ev) => {
        ev.preventDefault();
        const url = openLink.getAttribute("data-url")!;
        chrome.tabs.create({ url });
      });
    }
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function idForNew() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function init() {
  const form = el<HTMLFormElement>("add-form");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const title = (el<HTMLInputElement>("title")).value.trim();
    const chapterRaw = (el<HTMLInputElement>("chapter")).value.trim();
    const chapter = chapterRaw === "" ? 0 : Number(chapterRaw);
    const url = (el<HTMLInputElement>("url")).value.trim();
    if (!title) return;
    const store = await loadStore();
    const editId = form.getAttribute("data-edit-id");
    if (editId) {
      const entry = store.entries.find((e) => e.id === editId);
      if (entry) {
        entry.title = title;
        entry.chapter = chapter;
        entry.url = url || undefined;
        entry.updatedAt = Date.now();
      }
      form.removeAttribute("data-edit-id");
    } else {
      const entry: ComicEntry = { id: idForNew(), title, chapter: Number(chapter || 0), url: url || undefined, updatedAt: Date.now() };
      store.entries.push(entry);
    }
    (el<HTMLInputElement>("title")).value = "";
    (el<HTMLInputElement>("chapter")).value = "";
    (el<HTMLInputElement>("url")).value = "";
    await saveStore(store);
    await render();
  });

  el<HTMLButtonElement>("export").addEventListener("click", async () => {
    const store = await loadStore();
    exportStore(store);
  });

  el<HTMLButtonElement>("increment").addEventListener("click", () => {
    const input = el<HTMLInputElement>("chapter");
    const v = Number(input.value || 0) + 1;
    input.value = String(v);
  });

  el<HTMLButtonElement>("decrement").addEventListener("click", () => {
    const input = el<HTMLInputElement>("chapter");
    const v = Math.max(0, Number(input.value || 0) - 1);
    input.value = String(v);
  });

  el<HTMLInputElement>("import-file").addEventListener("change", async (ev) => {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    try {
      const imported = await importStore(input.files[0]);
      const store = await loadStore();
      // merge: id-based dedupe, newest wins
      const map = new Map<string, ComicEntry>();
      for (const e of store.entries) map.set(e.id, e);
      for (const e of imported.entries) {
        const existing = map.get(e.id);
        if (!existing || e.updatedAt > existing.updatedAt) map.set(e.id, e);
      }
      const merged: Store = { entries: Array.from(map.values()) };
      await saveStore(merged);
      await render();
      input.value = "";
    } catch (err) {
      alert("Import failed: " + (err instanceof Error ? err.message : String(err)));
    }
  });

  el<HTMLButtonElement>("clear").addEventListener("click", async () => {
    if (!confirm("Clear all entries?")) return;
    await saveStore({ entries: [] });
    await render();
  });

  await render();
}

document.addEventListener("DOMContentLoaded", () => init());
