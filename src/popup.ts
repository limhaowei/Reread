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
    li.className = "item";
    const left = document.createElement("div");
    left.innerHTML = `<div><strong>${escapeHtml(entry.title)}</strong></div><div class='meta'>${escapeHtml(entry.chapter)} ${entry.url ? `— <a href='#' data-url='${escapeHtml(entry.url)}'>open</a>` : ""}</div>`;
    const controls = document.createElement("div");
    controls.className = "controls";
    const edit = document.createElement("button");
    edit.textContent = "Edit";
    const del = document.createElement("button");
    del.textContent = "Delete";
    controls.appendChild(edit);
    controls.appendChild(del);
    li.appendChild(left);
    li.appendChild(controls);
    list.appendChild(li);

    edit.addEventListener("click", async () => {
      (el<HTMLInputElement>("title")).value = entry.title;
      (el<HTMLInputElement>("chapter")).value = entry.chapter;
      (el<HTMLInputElement>("url")).value = entry.url || "";
      // remove old id if present on form
      el("add-form")!.setAttribute("data-edit-id", entry.id);
    });

    del.addEventListener("click", async () => {
      store.entries = store.entries.filter((e) => e.id !== entry.id);
      await saveStore(store);
      await render();
    });

    const openLink = left.querySelector("a[data-url]") as HTMLAnchorElement | null;
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
    const chapter = (el<HTMLInputElement>("chapter")).value.trim();
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
      const entry: ComicEntry = { id: idForNew(), title, chapter, url: url || undefined, updatedAt: Date.now() };
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
