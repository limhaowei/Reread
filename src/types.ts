export interface ComicEntry {
  id: string;
  title: string;
  chapter: number;
  url?: string;
  notes?: string;
  updatedAt: number;
}

export interface Store {
  entries: ComicEntry[];
}
