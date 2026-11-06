import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(process.cwd() + "/" + path, "utf8");
const components = [
  "components/life/LifeTogetherPage.tsx",
  "components/life/LifeWishesPage.tsx",
  "components/life/LifeMedicinePage.tsx",
  "components/life/LifeMailboxPage.tsx",
  "components/life/LifeFavoriteFoodsPage.tsx",
  "components/life/LifeMealEditorPage.tsx",
  "components/life/today/TodayMoodCard.tsx",
  "components/life/today/TodaySleepCard.tsx",
];
describe("Beside confirms", () => {
  it("mounts one persistent dialog provider, outside feature pages", () => {
    const layout = source("app/layout.tsx");
    expect(layout).toContain("<AppConfirmProvider>");
    expect(layout).toContain('import "./confirm-dialog.css"');
  });
  it("replaces every legacy feature-page browser confirmation", () => {
    for (const path of components) {
      const page = source(path);
      expect(page, path).toContain("useAppConfirm()");
      expect(page, path).not.toMatch(/(?:window\.)?(?:confirm|alert|prompt)\s*\(/);
    }
  });
  it("keeps focus/escape semantics, calm styling and explicit danger actions", () => {
    const dialog = source("components/ui/AppConfirmDialog.tsx");
    const style = source("app/confirm-dialog.css");
    expect(dialog).toContain('role="alertdialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain('event.key === "Tab"');
    expect(dialog).toContain("initialFocus.current?.focus()");
    expect(dialog).toContain('request.options.tone === "danger"');
    expect(style).toContain("var(--life-surface");
    expect(style).toContain("env(safe-area-inset-bottom)");
  });
  it("guards unsaved meal edits before client-side navigation", () => {
    const editor = source("components/life/LifeMealEditorPage.tsx");
    expect(editor).toContain("event.preventDefault()");
    expect(editor).toContain("router.push(next.pathname + next.search + next.hash)");
    expect(editor).toContain("dirtyRef.current");
    expect(editor).toContain("confirm({ title: \"离开这餐的编辑？\"");
  });
  it("does not silently confirm shared completion", () => {
    const together = source("components/life/LifeTogetherPage.tsx");
    expect(together).toContain('if (approved) onResult("done")');
    expect(together).toContain('title: "我们已完成这件小事？"');
  });
});
