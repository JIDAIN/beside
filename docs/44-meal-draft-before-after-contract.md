# Meal Draft Confirmation + Before/After Photo Difference Contract

Date: 2026-09-06  
Validation update: 2026-09-07

## Goal

New meal recording must not jump directly from an image or a rough user description into persistent data. The AI first produces a reviewable draft based on actual intake, the user confirms or revises it, and only then is the meal persisted.

This applies to ChatGPT/Harbor, MCP clients, and the built-in AI path because the final write is protected in `life-agent-executor`.

## Interaction flow

1. User supplies meal information, optionally with one or two photos.
2. AI estimates a **draft**, not a database write.
3. AI shows the draft with actual intake and nutrition estimates.
4. User may revise the draft.
5. Only after explicit confirmation does the AI call `life_mutate` again to create the meal.

The first-turn wording `帮我记录/记一下` expresses the final intent to record the meal, but it is **not** post-draft confirmation.

## One-photo mode

Use the visible food plus the user's intake statement. Examples:

- `基本都吃完了`
- `吃了一半`
- `只吃了几口`
- `这个没吃`
- `后来又添了一点`

The draft is based on what the user actually consumed, not the full plated amount.

## Two-photo before/after mode

When the user provides a before-meal photo and an after-meal photo, match foods by type rather than fixed screen/plate position and estimate:

`actual intake = estimated amount before - edible amount remaining after`

User text overrides visual subtraction. Bones, peels, pits, shells, packaging, and other inedible residue must not be treated as edible leftovers. Shared dishes must use the user's stated personal share when available.

## Draft fields

For each food, estimate when reasonably possible:

- `rawName` / `displayName`
- `portionDescription`
- `estimatedWeightG`
- `caloriesKcal`
- `proteinG`
- `carbsG`
- `fatG`

For the whole meal, show:

- `totalCaloriesKcal`
- total protein
- total carbs
- total fat

These are estimates, not laboratory measurements. Important uncertainty should be stated explicitly.

## Confirmation

Examples treated as explicit post-draft confirmation include:

- `确认记录`
- `没问题`
- `可以`
- `就这样`
- `按这个记`
- `记进去`

A new meal create that reaches the server without this confirmation is rejected with a natural clarification telling the AI to present the draft first.

## Existing meal updates

This guard applies to **new meal creation**. Normal explicit updates/deletes of already-persisted meal records continue to use the existing ID-based update/delete safety rules.

## Photo persistence

If the user also wants the image saved, it is bound only after confirmation. MCP clients that cannot provide the image bytes continue to use the existing `MEDIA_ATTACHMENT_REQUIRED` browser upload recovery flow. The program must never claim that an image was saved when it was not.

## Architecture principle

This contract belongs above the database layer:

- AI/model: image + text understanding and draft estimation
- AI Access Core: confirmation guard, normalization, authorization, idempotency
- Supabase: canonical persisted facts only after confirmation

This keeps Harbor and MCP behavior aligned while preserving the ability to replace the AI entry point later.

## 2026-09-07 实机验收

餐前 / 餐后 AI 流程已经由真实使用确认通过，不再属于待验收项。

确认通过的完整链路：

```text
餐前照片 + 餐后照片
→ AI 根据前后差分与用户文字判断实际摄入
→ 生成可检查的 meal 草稿
→ kcal / protein / carbs / fat 等营养估算可正常呈现
→ 用户确认
→ 正式写入 meal
→ 网页可正常读取并显示记录
```

当前结论：

- 餐前 / 餐后两张图可正常用于实际摄入判断；
- 用户明确文字仍优先于视觉差分；
- 草稿 → 用户确认 → 正式写入流程符合预期；
- 实际使用中未发现阻塞性问题；
- 本项视为 **已验收 ✅**。

需要区分：本次验收证明的是“两张图片参与 AI 分析”的流程已经可用；它不改变当前“一条正式 meal 只持久化 1 张展示照片”的数据模型边界。若未来需要永久保存餐前、餐后两张图，仍需单独设计多图持久化模型。
