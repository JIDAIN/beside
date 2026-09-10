import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("historical life record editing", () => {
  it("keeps the calendar day editable for the signed-in person's records", () => {
    const page = source("components/life/LifeCalendarDayPage.tsx");
    expect(page).toContain("onChanged={reloadDay}");
    expect(page).toContain("onError={setActionError}");
    expect(page).not.toContain("day={day} readOnly");
    expect(page).toContain("syncLifeDayCaches(date, next)");
  });

  it("keeps the selected historical date through meal view and editing", () => {
    const day = source("components/life/LifeCalendarDayPage.tsx");
    const food = source("components/life/LifeFoodPage.tsx");
    const editor = source("components/life/LifeMealEditorPage.tsx");
    expect(day).toContain("/food?date=${encodeURIComponent(date)}");
    expect(day).toContain("查看 / 编辑");
    expect(food).toContain("initialDate || localIsoDate()");
    expect(food).toContain("mealHref(date, partnerKey");
    expect(editor).toContain("/food?date=${encodeURIComponent(saved.mealDate)}");
  });

  it("writes a newly added historical activity on the selected business date", () => {
    const model = source("components/life/today/today-life-model.ts");
    expect(model).toContain("export function activityTimestampForDate");
    expect(model).toContain("date === localIsoDate(now)");
    expect(model).toContain("new Date(`${date}T${time}`).toISOString()");
  });

  it("keeps historical copy contextual and remounts card state for each date", () => {
    const page = source("components/life/LifeCalendarDayPage.tsx");
    const activity = source("components/life/today/TodayActivityCard.tsx");
    const mood = source("components/life/today/TodayMoodCard.tsx");
    expect(page).toContain("key={`mood-${date}`}");
    expect(page).toContain("key={`sleep-${date}`}");
    expect(page).toContain("key={`activity-${date}`}");
    expect(activity).toContain("activityTimestampForDate(date)");
    expect(activity).toContain("这一天一起做了什么？");
    expect(mood).toContain("这一天感觉怎么样？");
  });
});
