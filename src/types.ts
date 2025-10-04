export interface ComicEntry {
  id: string;
  title: string;
  chapter: string;
  url?: string;
  notes?: string;
  updatedAt: number;
}

export interface Store {
  entries: ComicEntry[];
}
