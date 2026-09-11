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
  if (maxX < minX) return { width: 0, height: 0, area: 0 };
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return { width, height, area: width * height };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

describe("mood presentation contract", () => {
  it("uses one unrecorded artwork contract on Today and historical day while keeping monthly cells blank", () => {
    const todayPage = source("components/life/TodayLifePage.tsx");
    const historyPage = source("components/life/LifeCalendarDayPage.tsx");
    const moodCard = source("components/life/today/TodayMoodCard.tsx");
    const calendar = source("components/life/LifeCalendarPage.tsx");
    const icons = source("components/ui/MoodIcon.tsx");

    expect(todayPage).toContain("<TodayMoodCard");
    expect(historyPage).toContain("<TodayMoodCard");
    expect(moodCard).toContain("MoodIcon, UnrecordedMoodIcon");
    expect(moodCard).toContain("visual ? <MoodIcon moodKey={visual.key} label={visual.label} /> : <UnrecordedMoodIcon />");
    expect(moodCard).not.toContain("showUnrecordedIcon");
    expect(moodCard).not.toContain("<span aria-hidden>○</span>");
    expect(icons).toContain('const UNRECORDED_MOOD_ASSET = "/illustrations/life/mood-unrecorded.png"');

    expect(calendar).not.toContain("UnrecordedMoodIcon");
    expect(calendar).not.toContain("mood-unrecorded.png");
    expect(calendar).toContain("life-calendar-mood is-empty");
    expect(calendar).toContain("moodCalendarSlots(day?.day.moods ?? [], mePartnerKey, taPartnerKey)");
    expect(calendar).toContain('<MoodStamp moodKey={slots.currentUserMood?.moodKey} label="我" />');
    expect(calendar).toContain('<MoodStamp moodKey={slots.partnerMood?.moodKey} label="Ta" offset />');
  });

  it("switches unrecorded to a real mood and back after deletion through refreshed day data", () => {
    const moodCard = source("components/life/today/TodayMoodCard.tsx");

    expect(moodCard).toContain("const myMood = moodByRole.get(mePartnerKey)?.moodKey");
    expect(moodCard).toContain("await saveMood({ partnerKey: mePartnerKey, moodDate: date, moodKey })");
    expect(moodCard).toContain("await deleteMood(myRecord.id, mePartnerKey)");
    expect(moodCard.match(/if \(onChanged\) await onChanged\(\);/g)).toHaveLength(2);
    expect(moodCard).toContain("{visual ? <MoodIcon");
    expect(moodCard).toContain(": <UnrecordedMoodIcon />}");
  });

  it("matches unrecorded visible artwork bounds to the real mood family instead of only matching canvas size", async () => {
    const assetDir = resolve(process.cwd(), "public/illustrations/life");
    const unrecordedPath = resolve(assetDir, "mood-unrecorded.png");
    const unrecordedMetadata = await sharp(unrecordedPath).metadata();
    const unrecordedBounds = await visibleBounds(unrecordedPath);

    expect(unrecordedMetadata.format).toBe("png");
    expect(unrecordedMetadata.hasAlpha).toBe(true);
    expect([unrecordedMetadata.width, unrecordedMetadata.height]).toEqual([256, 256]);

    const realBounds = [];
    for (const filename of REAL_MOOD_ASSETS) {
      const path = resolve(assetDir, filename);
      const metadata = await sharp(path).metadata();
      expect([metadata.width, metadata.height]).toEqual([256, 256]);
      realBounds.push(await visibleBounds(path));
    }

    const medianWidth = median(realBounds.map((bounds) => bounds.width));
    const medianHeight = median(realBounds.map((bounds) => bounds.height));
    const medianArea = median(realBounds.map((bounds) => bounds.area));

    expect(unrecordedBounds.width / medianWidth).toBeGreaterThanOrEqual(0.9);
    expect(unrecordedBounds.width / medianWidth).toBeLessThanOrEqual(1.1);
    expect(unrecordedBounds.height / medianHeight).toBeGreaterThanOrEqual(0.9);
    expect(unrecordedBounds.height / medianHeight).toBeLessThanOrEqual(1.1);
    expect(unrecordedBounds.area / medianArea).toBeGreaterThanOrEqual(0.85);
    expect(unrecordedBounds.area / medianArea).toBeLessThanOrEqual(1.15);

    const icons = source("components/ui/MoodIcon.tsx");
    const css = source("app/island-life-refactor.css");
    expect(icons.match(/width=\{256\} height=\{256\}/g)).toHaveLength(2);
    expect(css).toContain(".life-person-state-orb img, .life-mood-orb img, .life-calendar-mood img { width: 100%; height: 100%; }");
  });
});
