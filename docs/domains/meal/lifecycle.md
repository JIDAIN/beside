# Meal Lifecycle

状态：2026-09-21。本文是 Meal **业务生命周期与产品写入 contract**；数据库字段以 [Data Model](../../architecture/data-model.md) 为准，AI 对话确认以 [AI Contract](ai-contract.md) 为准。

## 1. Canonical 类型

代码与 Production Supabase 当前统一使用：

```text
mealType:
  breakfast | lunch | dinner | snack

snackPeriod:
  morning | afternoon | night

status:
  estimated | confirmed

source:
  manual | chatgpt | import
```

用户界面将 `snack + snackPeriod` 映射为：

```text
上午加餐 / 下午加餐 / 晚上加餐
```

因此 UI 看起来有六个餐次，但数据库只有四种 `meal_type`。

## 2. 一顿饭的数据结构

一条 Meal 表示一次饮食事件。

```text
Meal
├─ 日期 / 时间
├─ 餐次
├─ status
├─ 汇总热量 / 区间
├─ 备注
├─ 可选展示照片
└─ meal_items[]
```

每个 item 可包含名称、份量、估算重量、kcal、热量区间和三大营养素。

`null` 表示未知，不应伪造成 0。

## 3. 主餐与加餐数量

### 主餐

早餐 / 午餐 / 晚餐当前由数据库 active unique index 保证：

> 每个 couple space、partner、meal_date、主餐类型最多一条未删除 Meal。

如果重复创建，服务端返回 `MEAL_SLOT_CONFLICT`，调用方应定位并编辑原 Meal。

### 加餐

加餐是独立事件：

- 同一天可有多条；
- 同一个 snackPeriod 也可以有多条；
- 每条独立保存时间、items、营养和照片。

不能因为都是“下午加餐”就自动合并。

## 4. Web 编辑器 contract

当前 `LifeMealEditorPage`：

- 新增和编辑使用同一页面；
- 只能编辑当前登录账号自己的 Meal；
- 保存前至少需要 1 个食物 item；
- 支持新的食物与常吃食物；
- 日期、时间和餐次可修改；
- 支持备注；
- 支持一张正式展示照片；
- 图片保存失败不会回滚已经成功的 Meal 主记录。

因此，**当前正式 Web UI 不允许保存空 Meal**。

## 5. 数据层允许的未知值

要区分“产品流程要求”和“底层 schema 能表达什么”。

当前通用 Meal payload / Production schema 允许：

- `items=[]`；
- `totalCaloriesKcal=null`；
- item kcal / macros / estimated weight 为 `null`；
- `eatenAt=null`。

这是为了保存真实的“不知道 / 未估算”状态以及兼容服务端能力。

所以：

```text
Web UI / AI 正常记录流程要求有真实 food items
≠
数据库对所有写入口强制至少一条 item
```

文档不得把前者写成数据库硬约束。

## 6. AI 新建 Meal

AI 新建 Meal 使用对话草稿流程。

已确认的 ChatGPT Meal 在 `prepareConfirmedChatgptMeal` 中额外要求：

- 至少一个食物 item；
- `source=chatgpt`；
- `status=confirmed`；
- 合法 ChatGPT idempotency key；
- 如果所有 item kcal 都已知，整餐 total 必须等于 item kcal 之和。

明确“还没吃 / 先估 / 饭后确认”时走 estimated lifecycle，详细规则见：
→ [Meal AI Contract](ai-contract.md)

## 7. 补录已有 Meal

“早餐补一个鸡蛋”等语义不是新建第二条早餐。

AI Access Core 支持：

```text
append_meal_item
```

流程：

1. 按授权身份 + 日期 + 餐次定位目标；
2. 要求目标唯一；
3. 至少提供一个新增 item；
4. 更新同一 Meal；
5. 保留原 `eatenAt`。

无法唯一定位时必须澄清，不能猜 UUID。

## 8. estimated → confirmed

```text
estimated
→ confirm_estimated_meal
→ confirmed
```

确认时：

- 定位同一 estimated Meal；
- 使用实际摄入 items 替换估算内容；
- 未显式提供的新汇总按新 items 重算，无法重算则为未知；
- 保留原 `mealDate` / `eatenAt`。

不能用“确认时间”覆盖真正吃饭时间。

## 9. 常吃食物

`favorite_food_templates` 是当前账号自己的复用模板，不是 Meal。

```text
template
→ copy fields into editor draft
→ save as ordinary meal_item
```

当前没有 `meal_items -> favorite_food_templates` 持续引用。

因此：

- 当天改份量不修改模板；
- 模板后续变化不改历史 Meal；
- 删除模板不删除历史 item；
- Cat / Fish 不能管理对方模板。

## 10. 删除

Meal DELETE 当前是软删除业务记录，并在服务端对已有照片对象做 best-effort 清理。

被删除 Meal 不计入正常餐食列表，也不占 active 主餐唯一槽。

## 11. 照片

一条正式 Meal 当前只有一个 `photo_path`。

照片压缩、private Storage、旋转和缩放：
→ [Meal Photo Storage](photo-storage.md)

多图 AI 分析与单图正式持久化的区别：
→ [Meal AI Contract](ai-contract.md)

## 12. 事实来源

当前 contract 已核对：

- `lib/nutrition/meal-service.ts`
- `lib/nutrition/meal-v2-types.ts`
- `components/life/LifeMealEditorPage.tsx`
- `lib/nutrition/chatgpt-meal-protocol.ts`
- `lib/server/life-agent-registry.ts`
- `lib/server/supabase-nutrition.ts`
- Production Supabase `meals / meal_items / favorite_food_templates` schema 与约束
