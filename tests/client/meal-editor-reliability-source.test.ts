import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editor = readFileSync(join(process.cwd(), "components/life/LifeMealEditorPage.tsx"), "utf8");

describe("meal editor reliability", () => {
  it("commits the meal identity and cache before optional photo work", () => {
    const baseWrite = editor.indexOf("let saved = meal ? await updateMealRecord");
    const stateCommit = editor.indexOf("setMeal(saved);", baseWrite);
    const photoWrite = editor.indexOf("await uploadMealPhoto", baseWrite);
    expect(baseWrite).toBeGreaterThan(-1);
    expect(stateCommit).toBeGreaterThan(baseWrite);
    expect(stateCommit).toBeLessThan(photoWrite);
    expect(editor).toContain("router.replace(editorHref(saved))");
    expect(editor).toContain("重试保存照片");
  });

  it("defaults missing ownership to the signed-in actor and rejects malformed links", () => {
    expect(editor).toContain("requestedPartner ?? mePartnerKey");
    expect(editor).toContain("这个饮食链接不完整");
    expect(editor).not.toContain('params.get("person") === "fish" ? "fish" : "cat"');
    expect(editor).not.toContain("new Date().toISOString().slice(0, 10)");
  });

  it("supports category correction, explicit labels and unsaved-change protection", () => {
    expect(editor).toContain("<AppSelect value={mealType}");
    expect(editor).toContain("加餐时段");
    expect(editor).toContain("实际份量");
    expect(editor).toContain("重量与三大营养素");
    expect(editor).toContain("beforeunload");
    expect(editor).toContain("这餐还有未保存的修改");
  });
});
