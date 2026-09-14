import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), "utf8");
}

describe("Today business-date rendering", () => {
  it("derives the Asia/Shanghai business date per request instead of freezing the build date", () => {
    const page = source("app/page.tsx");
    const today = source("components/life/TodayLifePage.tsx");

    expect(page).toContain('export const dynamic = "force-dynamic"');
    expect(page).toContain('timeZone: "Asia/Shanghai"');
    expect(page).toContain("<TodayLifePage initialDate={date} />");
    expect(today).toContain("export function TodayLifePage({ initialDate }");
    expect(today).toContain("const date = initialDate;");
    expect(today).not.toContain("useState(() => localIsoDate())");
  });
});
