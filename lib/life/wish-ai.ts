/** AI input helpers for the shared wish-list domain.
 * These helpers never authorize actors or write data; callers use the canonical wish service.
 */
import type { WishCategory, WishEntry, WishVisit, WishWrite } from "./wish-list-model";

type Data = Record<string, unknown>;

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Data
    : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWishCategory(value: unknown): WishCategory | null {
  const key = str(value).toLowerCase();
  const categories: Record<string, WishCategory> = {
    go: "go", "想去": "go", "地点": "go", "目的地": "go", "出游": "go",
    play: "play", "想玩": "play", "活动": "play", "体验": "play",
    eat: "eat", "想吃": "eat", "美食": "eat", "餐厅": "eat", "菜谱": "eat",
    do: "do", "想做": "do", "心愿": "do", "小事": "do",
  };
  return categories[key] ?? null;
}

function textOrNull(value: unknown): string | null {
  return value == null ? null : str(value) || null;
}

function normalizedLinks(input: unknown, fallback: string[]): string[] {
  if (input === undefined) return [...fallback];
  if (typeof input === "string") return input.trim() ? [input.trim()] : [];
  if (!Array.isArray(input) || input.some(x => typeof x !== "string")) {
    throw new Error("参考链接应为网址或网址列表");
  }
  return input.map(x => x.trim()).filter(Boolean);
}

function normalizedChecklist(input: unknown, existing: WishEntry["checklist"]) {
  if (input === undefined) return existing.map(item => ({...item}));
  if (!Array.isArray(input)) throw new Error("必打卡点位应为文字列表");
  return input.map((value, sortOrder) => {
    const row = record(value);
    const title = str(typeof value === "string" ? value : row.title ?? row.name ?? row.text);
    if (!title) throw new Error("必打卡点位不能为空");
    const old = existing.find(item => item.title === title);
    return { id: old?.id ?? crypto.randomUUID(), title, sortOrder };
  });
}

function supplied(data: Data, ...names: string[]): unknown {
  for (const name of names) {
    if (data[name] !== undefined) return data[name];
  }
  return undefined;
}

/** Create uses only names and category as required input; all other fields are optional. */
export function buildWishCreate(data: unknown): WishWrite {
  const row = record(data);
  const title = str(supplied(row,"title","name"));
  const category = normalizeWishCategory(supplied(row,"category","type"));
  if (!title) throw new Error("请提供想收藏的心愿名称");
  if (!category) throw new Error("请选择分类：想去、想玩、想吃或想做");
  const base: WishWrite = {
    title, category, description: null, location: null, openingHours: null,
    priceNote: null, durationNote: null, bestTimeNote: null, practicalNotes: null,
    imagePath: null, referenceUrls: [], checklist: [], visits: [],
    wantToRepeat: true, archivedAt: null,
  };
  return buildWishUpdate(base, row);
}

/** Only explicit patch fields change; prior experience and image binding are retained. */
export function buildWishUpdate(base: WishWrite, data: unknown): WishWrite {
  const row = record(data);
  const categoryRaw = supplied(row,"category","type");
  const category = categoryRaw === undefined ? base.category : normalizeWishCategory(categoryRaw);
  if (!category) throw new Error("请选择分类：想去、想玩、想吃或想做");
  const titleRaw = supplied(row,"title","name");
  const title = titleRaw === undefined ? base.title : str(titleRaw);
  if (!title) throw new Error("心愿名称不能为空");
  const patch: WishWrite = { ...base, title, category,
    referenceUrls: normalizedLinks(supplied(row,"referenceUrls","links","urls"),base.referenceUrls),
    checklist: normalizedChecklist(supplied(row,"checklist","spots","mustVisit"),base.checklist),
    visits: base.visits.map(visit => ({...visit,completedItemIds:[...visit.completedItemIds]})),
    imagePath: base.imagePath,
  };
  const fields: Array<[keyof WishWrite,string[]]> = [
    ["description",["description"]],
    ["location",["location","address"]],
    ["openingHours",["openingHours","hours"]],
    ["priceNote",["priceNote","price","cost"]],
    ["durationNote",["durationNote","duration"]],
    ["bestTimeNote",["bestTimeNote","bestTime","season"]],
    ["practicalNotes",["practicalNotes","notes","remark","攻略备注"]],
  ];
  for (const [key,names] of fields) {
    const v = supplied(row,...names);
    if (v !== undefined) {
      if (v !== null && typeof v !== "string") throw new Error(`${names[0]} 应为文字`);
      (patch as unknown as Data)[key] = textOrNull(v);
    }
  }
  if (row.wantToRepeat !== undefined) {
    if (typeof row.wantToRepeat !== "boolean") throw new Error("再次体验意愿应为布尔值");
    patch.wantToRepeat = row.wantToRepeat;
  }
  // Never allow a caller's patch to rewrite historical visits or storage paths.
  const stillValid = new Set(patch.checklist.map(item => item.id));
  patch.visits = patch.visits.map(visit=>({
    ...visit,completedItemIds:visit.completedItemIds.filter(id=>stillValid.has(id)),
  }));
  return patch;
}

export function buildWishVisit(existing: WishEntry, data: unknown): WishWrite {
  const row = record(data);
  const date = str(supplied(row,"visitedOn","date"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (Number.isNaN(Date.parse(date+"T00:00:00Z")) || new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date)) {
    throw new Error("体验日期必须为有效的 YYYY-MM-DD");
  }
  const rawNote = supplied(row,"note","notes","feeling");
  if(rawNote!==undefined && rawNote!==null && typeof rawNote!=="string")throw new Error("体验备注必须为文字");
  if(row.wantToRepeat!==undefined && typeof row.wantToRepeat!=="boolean")throw new Error("再次体验意愿应为布尔值");
  const note = textOrNull(rawNote);
  const done = supplied(row,"completedItemIds","completedSpots");
  if (done !== undefined && (!Array.isArray(done) || done.some(x=>typeof x!=="string"))) {
    throw new Error("已完成点位应为字符串列表");
  }
  const ids = ((done as string[] | undefined) ?? []).map(value=>{
    const item=existing.checklist.find(x=>x.id===value || x.title===value);
    if(!item) throw new Error(`找不到打卡点位：${value}`);
    return item.id;
  });
  const visit:WishVisit = {id:crypto.randomUUID(),visitedOn:date,note,completedItemIds:[...new Set(ids)]};
  return {
    ...existing,visits:[...existing.visits,visit],
    wantToRepeat:row.wantToRepeat===undefined?existing.wantToRepeat:row.wantToRepeat===true,
  };
}

export function wishFields(entry:WishEntry):WishWrite {
  return {
    title:entry.title, category:entry.category, description:entry.description,
    location:entry.location, openingHours:entry.openingHours,
    priceNote:entry.priceNote, durationNote:entry.durationNote,
    bestTimeNote:entry.bestTimeNote, practicalNotes:entry.practicalNotes,
    imagePath:entry.imagePath, referenceUrls:entry.referenceUrls.map(x=>x),
    checklist:entry.checklist.map(x=>({...x})),
    visits:entry.visits.map(x=>({...x,completedItemIds:[...x.completedItemIds]})),
    wantToRepeat:entry.wantToRepeat, archivedAt:entry.archivedAt,
  };
}
