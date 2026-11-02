/** Shared wish-list domain. This is not a Meal, Life activity, or Legacy Game fact. */
export const WISH_CATEGORIES = ["go", "play", "eat", "do"] as const;
export type WishCategory = (typeof WISH_CATEGORIES)[number];
export const WISH_INTENTS = ["want", "again", "done"] as const;
export type WishIntent = (typeof WISH_INTENTS)[number];

export type WishChecklistItem = {
  id: string;
  title: string;
  /** Template checklist items persist across visits. */
  sortOrder: number;
};

export type WishVisit = {
  id: string;
  visitedOn: string;
  note: string | null;
  /** IDs completed in this visit, not global flags on the template. */
  completedItemIds: string[];
};

export type WishEntry = {
  id: string;
  category: WishCategory;
  title: string;
  description: string | null;
  location: string | null;
  openingHours: string | null;
  priceNote: string | null;
  durationNote: string | null;
  bestTimeNote: string | null;
  practicalNotes: string | null;
  imagePath: string | null;
  referenceUrls: string[];
  checklist: WishChecklistItem[];
  visits: WishVisit[];
  /** Separates future intention from past experiences. */
  wantToRepeat: boolean;
  archivedAt: string | null;
  createdBy: "cat" | "fish";
  createdAt: string;
  updatedAt: string;
};

export function wishIntent(entry: Pick<WishEntry, "visits" | "wantToRepeat" | "archivedAt">): WishIntent {
  if (entry.archivedAt) return "done";
  if (entry.visits.length === 0) return "want";
  return entry.wantToRepeat ? "again" : "done";
}

export function validateWishInput(input: {
  title: string;
  category: string;
  referenceUrls?: string[];
  checklist?: Pick<WishChecklistItem, "title">[];
}): string[] {
  const errors: string[] = [];
  if (!input.title.trim() || input.title.trim().length > 120) errors.push("标题需为 1～120 字");
  if (!WISH_CATEGORIES.includes(input.category as WishCategory)) errors.push("心愿分类无效");
  for (const url of input.referenceUrls ?? []) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) errors.push("参考链接只能使用 HTTP 或 HTTPS");
    } catch { errors.push("参考链接格式不正确"); }
  }
  if ((input.checklist ?? []).some(item => !item.title.trim() || item.title.length > 160)) {
    errors.push("必打卡项目名称需为 1～160 字");
  }
  return errors;
}
