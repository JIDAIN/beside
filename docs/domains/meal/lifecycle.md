# Meal Lifecycle

本文是 Meal 持久化业务 lifecycle 的 canonical contract。schema 见 Data Model；AI 对话编排见 AI Contract；媒体见 Photo Storage。

## 1. Domain Invariants

- Meal 是一次正式饮食事件；
- breakfast/lunch/dinner 是唯一主餐槽；
- snack 是可重复事件；
- unknown != zero；
- 常吃食物是 copy template，不是历史数据引用；
- AI append/confirm 应更新原 Meal，而不是制造重复主餐；
- 一条 Meal 当前只有一个正式 photo slot。

## 2. Canonical Types

mealType：
breakfast / lunch / dinner / snack

snackPeriod：
morning / afternoon / night

status：
estimated / confirmed

source：
manual / chatgpt / import

UI 可把 snack + period 映射为上午/下午/晚上加餐。

## 3. Meal / Item Model

Meal 包含：
- mealDate / eatenAt；
- mealType / snackPeriod；
- status/source；
- total calories / range；
- note；
- optional formal photo；
- meal_items。

item 可包含 name、portion、estimatedWeightG、calories、protein/carbs/fat 等。

真正未知允许 null，不伪造成 0。

## 4. Main Meal vs Snack Cardinality

主餐由 active unique constraint 保证：
同一 space + partner + meal_date + breakfast/lunch/dinner 最多一条未删除 Meal。

重复创建应返回 slot conflict，调用方定位原 Meal 编辑。

snack：
- 同日可多条；
- 同一 period 可多条；
- 每条独立保存时间/items/nutrition/photo。

## 5. Unknown / Nullable Semantics

底层 schema 可以表达：
- items=[]；
- totalCalories=null；
- item kcal/macros/weight=null；
- eatenAt=null。

这不等于所有产品入口都允许保存空 Meal。

当前正式 Web editor / confirmed ChatGPT 正常流程要求至少一个真实 food item。UI requirement != DB hard constraint。

## 6. Create / Update / Delete

Web 新增/编辑共用 canonical Meal payload。
只能维护 signed actor 自己的 Meal。

DELETE 当前软删除业务记录；服务端对正式照片对象做 best-effort 清理。
软删除后的主餐槽可重新创建。

## 7. Append Existing Meal

“早餐还吃了一个鸡蛋”等语义：
- 按 actor + date + slot 定位；
- 要求唯一目标；
- append item；
- 更新同一 Meal；
- 保留原 eatenAt。

无法唯一定位必须澄清，不猜 UUID。

## 8. Estimated → Confirmed

~~~text
estimated
→ confirm_estimated_meal
→ confirmed
~~~

确认时：
- 定位同一 estimated Meal；
- 用实际摄入 items 替换估算；
- 未显式提供的新汇总按实际 items 重算，无法重算则 null；
- 保留原 mealDate / eatenAt。

确认时间不能覆盖真正吃饭时间。

## 9. Favorite Food Template

favorite_food_templates 属于当前账号自己的复用模板：

~~~text
template
→ copy fields into editor draft
→ save as ordinary meal_item
~~~

没有持续引用：
- 当天改份量不改模板；
- 模板变化不改历史 Meal；
- 删除模板不删历史 item；
- 不能管理 Ta 的模板。

## 10. Formal Photo Boundary

一条正式 Meal 当前只有一个 photo_path。
照片 storage/rotation/scale 见 Photo Storage。
AI 多图分析不改变这一持久化事实。

## 11. Source / Idempotency

manual/chatgpt/import 是正式来源词汇。
部分外部写入使用稳定 idempotency key；重试不得制造重复 Meal。

聊天 draft 不写数据库，也不是 Meal status。

## 12. Implementation Anchors

- lib/nutrition/meal-service.ts
- lib/nutrition/meal-v2-types.ts
- lib/nutrition/meal-v2-mutation-adapter.ts
- lib/server/supabase-nutrition.ts
- lib/server/supabase-favorite-foods.ts
- components/life/LifeMealEditorPage.tsx
- tests/nutrition/*

## 13. Change Impact

- slot/cardinality → migration + AI target resolution + editor + tests；
- status → AI + UI + schema；
- item semantics → parser + AI draft + tests；
- favorite template → Auth + UI；
- source/idempotency → AI/import/retry；
- photo cardinality → Data Model + Photo + API + AI + UI + migration。

## 14. Maintenance Rules

持久化业务语义变化更新本文。
页面排版、压缩算法、对话语气不在本文维护。
