# Meal AI Contract

本文是新 Meal 的 AI 对话草稿、实际摄入推断、estimated orchestration 与媒体 handoff contract。

## 1. Boundary

默认新 Meal：

~~~text
用户文字 / 图片
→ AI 形成可检查 chat draft
→ 用户修改 / 确认
→ life_mutate
→ 正式 Meal
~~~

chat draft 不写数据库。
当前没有 meal_drafts 表。

## 2. New Meal Draft State

“先草稿、后确认”只针对新 Meal creation。

已有 Meal 的：
- append item；
- confirm estimated；
- 修改时间/备注；
- 修改照片显示；
- 删除；
按各自动作执行，不重新包装成新 Meal draft。

## 3. Confirmation

用户看到当前草稿后，“确认记录 / 没问题 / 可以 / 就这样 / 按这个记”等可以确认当前草稿。

正式 write 临时失败后可以重试同一已确认 operation，不能重新生成不同 idempotency operation。

## 4. Single-image Intent

只有一张图时先看用户语义。

“记录这顿饭 / 按照片全部记录 / 记录这个饭”：
→ 生成草稿 → 确认 → create confirmed。

只有用户明确“还没吃 / 先估 / 饭前估算 / 吃完再确认”：
→ create estimated。

餐前照片本身不自动等于 estimated。

## 5. Before / After Intake

餐前 + 餐后可以估算实际摄入：
before edible amount - after edible remaining amount。

但：
- 用户文字优先；
- 按食物种类匹配，不按画面位置硬配；
- 骨头/果皮/包装不算可食剩余；
- 中途添饭、共享菜、照片缺失会增加不确定性；
- 不可靠时只问关键 clarification。

## 6. Estimated Lifecycle Orchestration

饭后确认同一 estimated Meal：
- unique target；
- 实际 items 替换估算；
- status=confirmed；
- 保留 mealDate/eatenAt；
- 新 total 从实际 items 重算，无法可靠计算则 null。

不创建第二条主餐。

## 7. Append Existing Meal

“早餐还吃了一个鸡蛋”：
query existing target → unique → append_meal_item → 保留 eatenAt。

主餐候选不唯一时必须澄清，不猜 UUID。

## 8. Draft Nutrition / Unknown Precision

合理可判断时，item 尽量包含：
rawName/displayName、portionDescription、estimatedWeightG、caloriesKcal、proteinG、carbsG、fatG。

Meal 尽量包含 totalCaloriesKcal。
未知允许 null，不制造虚假精度。

confirmed ChatGPT Meal 至少一个 food item。

## 9. Media Persistence Handoff

多图可参与 reasoning；正式 Meal 只有一个展示图。

需要持久化：
- 有 bytes → canonical media path；
- 无 bytes → MEDIA_ATTACHMENT_REQUIRED → browser recovery。

browser recovery 成功前不能声称图片已保存。

## 10. Server-side Vision Boundary

当前 fallback recognizer 只要求识别：
- visible food name；
- visible portion description；
- confidence。

它不负责直接估算 kcal/克数/macros。
当前低于 confidence 0.6 的识别会被过滤。

vision failure 不等于 photo upload failure。

## 11. Responsibility Split

Model：
- 理解意图；
- 读用户说明/图片；
- 形成草稿；
- 维护当前对话确认状态。

AI Access Core / service：
- normalization；
- signed actor；
- permission；
- target lookup；
- schema；
- idempotency；
- media；
- tool result。

Supabase：
- 只保存正式 canonical facts；
- 不保存聊天草稿状态。

## 12. Implementation Anchors

- lib/ai/meal-draft-contract.ts
- lib/ai/meal-slot-hints.ts
- lib/nutrition/chatgpt-meal-protocol.ts
- lib/server/life-agent-registry.ts
- lib/server/life-agent-executor.ts
- lib/server/life-meal-vision.ts
- tests/nutrition/*
- tests/ai/*
- relevant tests/server/*

## 13. Regression Entry

修改本流程必须覆盖：
- first turn 不直接落库；
- confirmed/estimated 语义；
- 主餐不重复；
- snack 不错误合并；
- append 保留 eatenAt；
- confirm 保留 mealDate/eatenAt；
- unknown 不伪造；
- media recovery 不重复 mutation；
- ownership/delete safety。

完整测试路由见 Engineering / Development & Testing。

## 14. Change Impact

- draft confirmation policy → Project Instructions + AI tests；
- target resolution → Natural Language + Lifecycle + tests；
- multi-photo persistence → Data/Photo/API/UI/migration；
- vision output contract → AI/vision tests；
- nutrition precision policy → Lifecycle + AI tests。

## 15. Maintenance Rules

对话/AI orchestration 改变时更新本文。
持久化 lifecycle 只在 Lifecycle；媒体保存只在 Photo Storage。
