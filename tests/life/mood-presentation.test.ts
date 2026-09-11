import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const REAL_MOOD_ASSETS = [
  "mood-tired.png",
  "mood-angry.png",
  "mood-excited.png",
  "mood-annoyed.png",
  "mood-love.png",
  "mood-calm.png",
  "mood-sad.png",
  "mood-happy.png",
];

async function visibleBounds(path: string, alphaThreshold = 16) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha < alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < minX
    ? { width: 0, height: 0, area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 }
    : { width: maxX - minX + 1, height: maxY - minY + 1, area: (maxX - minX + 1) * (maxY - minY + 1), minX, minY, maxX, maxY };
}

describe("mood presentation contract", () => {
  it("uses the dedicated unrecorded artwork on Today but not on historical empty states or the monthly calendar", () => {
    const today = source("components/life/today/TodayMoodCard.tsx");
    const calendar = source("components/life/LifeCalendarPage.tsx");
    const icons = source("components/ui/MoodIcon.tsx");

    expect(today).toContain("MoodIcon, UnrecordedMoodIcon");
    expect(today).toContain('showUnrecordedIcon={isToday}');
    expect(today).toContain("visual ? <MoodIcon moodKey={visual.key} label={visual.label} /> : showUnrecordedIcon ? <UnrecordedMoodIcon /> : <span aria-hidden>○</span>");
    expect(icons).toContain('const UNRECORDED_MOOD_ASSET = "/illustrations/life/mood-unrecorded.png"');
    expect(calendar).not.toContain("UnrecordedMoodIcon");
    expect(calendar).not.toContain("mood-unrecorded.png");
    expect(calendar).toContain("life-calendar-mood is-empty");
  });

  it("switches Today from unrecorded to a real mood and back after deletion through refreshed day data", () => {
    const today = source("components/life/today/TodayMoodCard.tsx");

    expect(today).toContain("const myMood = moodByRole.get(mePartnerKey)?.moodKey");
    expect(today).toContain("await saveMood({ partnerKey: mePartnerKey, moodDate: date, moodKey })");
    expect(today).toContain("await deleteMood(myRecord.id, mePartnerKey)");
    expect(today.match(/if \(onChanged\) await onChanged\(\);/g)).toHaveLength(2);
    expect(today).toContain("{visual ? <MoodIcon");
    expect(today).toContain("showUnrecordedIcon ? <UnrecordedMoodIcon />");
  });

  it("keeps the supplied unrecorded artwork transparent and the same square source size as all eight real mood assets", async () => {
    const assetDir = resolve(process.cwd(), "public/illustrations/life");
    const unrecordedPath = resolve(assetDir, "mood-unrecorded.png");
    const unrecorded = await sharp(unrecordedPath).metadata();

    expect(unrecorded.format).toBe("png");
    expect(unrecorded.hasAlpha).toBe(true);
    expect([unrecorded.width, unrecorded.height]).toEqual([256, 256]);

    const bounds: Record<string, Awaited<ReturnType<typeof visibleBounds>>> = {};
    bounds["mood-unrecorded.png"] = await visibleBounds(unrecordedPath);
    for (const filename of REAL_MOOD_ASSETS) {
      const path = resolve(assetDir, filename);
      const metadata = await sharp(path).metadata();
      expect([metadata.width, metadata.height]).toEqual([256, 256]);
      bounds[filename] = await visibleBounds(path);
    }
    console.log("MOOD_VISIBLE_BOUNDS", JSON.stringify(bounds));

    const icons = source("components/ui/MoodIcon.tsx");
    const css = source("app/island-life-refactor.css");
    expect(icons.match(/width=\{256\} height=\{256\}/g)).toHaveLength(2);
    expect(css).toContain(".life-person-state-orb img, .life-mood-orb img, .life-calendar-mood img { width: 100%; height: 100%; }");
  });
});