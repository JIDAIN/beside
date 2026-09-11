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

  it("uses one six-slot meal selector and protects unsaved changes", () => {
    for (const label of ["早餐", "上午加餐", "午餐", "下午加餐", "晚餐", "晚上加餐"]) {
      expect(editor).toContain(`label: "${label}"`);
    }
    expect(editor).toContain("MEAL_SLOT_OPTIONS");
    expect(editor).toContain("<AppSelect value={currentSlot}");
    expect(editor).not.toContain("加餐时段<AppSelect");
    expect(editor).toContain("beforeunload");
    expect(editor).toContain("这餐还有未保存的修改");
  });

  it("keeps food editing in compact sheets instead of expanded page forms", () => {
    expect(editor).toContain("添加食物");
    expect(editor).toContain("新的食物");
    expect(editor).toContain("常吃食物");
    expect(editor).toContain("新增食物");
    expect(editor).toContain("编辑食物");
    expect(editor).toContain("三大营养素");
    expect(editor).not.toContain("life-food-item-editor");
  });
});
