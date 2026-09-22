# Natural Language & Clarification

本文维护 AI natural input normalization：什么可以安全默认/归一化，什么必须澄清，以及 target 如何可靠定位。业务 lifecycle 由对应 Domain 维护。

## 1. Boundary

~~~text
user language / image-visible facts
→ model extracts intent
→ normalizer
→ canonical args
→ permission / domain service
~~~

模型不猜内部 UUID、enum、owner 或不可见事实。

## 2. Safe Defaults

当前可安全默认：
- day/meal/mood/sleep/activity/weight 未给日期 → Asia/Shanghai 今天；
- month 未给月份 → 当前月；
- medicine create 未给 quantity → 1；
- mailbox 未给 format → letter；
- mood/sleep 未给 action → upsert；
- settings 未给 action → update；
- 一般新增 resource 无 id 且无 action → create。

## 3. Safe Normalization

当前常见映射：
- 我/自己/本人 → me；
- Ta/对象/伴侣 → ta；
- 双方/我们/两个人 → all/both（按 resource）；
- 今天/昨天/前天 → Asia/Shanghai date；
- 中文 resource/action → canonical resource/action；
- “64.8kg” → numeric 64.8；
- “1小时30分钟” → 90 minutes；
- mood UI label → canonical mood key；
- Meal name/foodName/rawName/displayName → canonical food name fields；
- medicineName/drugName → name；
- mailbox content/text/message → body。

## 4. Clarification-required Inputs

不可安全推断时返回 LIFE_CLARIFICATION_REQUIRED，例如：
- 记体重但无数值；
- 记餐但无食物/图片；
- 药箱新增但无药名；
- sleep 缺入睡或起床；
- activity 无内容；
- 写信无正文；
- update/delete 没有可靠 target。

Adapter 应直接向用户问 clarification.question，不解释内部字段。

## 5. Query Normalization

典型：
- 今天心情/睡眠/活动 → 对应 resource，date=today；
- 完整日汇总 → day；
- 本月心情 → month；
- 今天吃什么 → meal, person=me；
- 对象吃什么 → meal, person=ta；
- 我们吃什么 → meal, person=all；
- 最近体重 → weight, person=me；
- 药箱 → medicine；
- 信箱 → mailbox；
- 设置 → settings。

## 6. Mutation Normalization by Resource

### Mood
mood/moodKey/label/emotion → mood key。
产品 label 映射由程序维护，例如“心动” → neutral。

### Sleep
bedtime/sleepTime/fellAsleepAt 与 wakeTime/wokeAt 归一化；纯时钟结合 sleepDate，跨午夜由程序处理。
缺任一关键时间要澄清。
当前 AI action 只有 upsert。

### Activity
text/name/title/description/content/activity → text。
我/Ta/我们 → participant scope。
分钟/小时 → durationMinutes。

### Meal
这里只维护 normalization：
- 早餐/午饭/晚饭/零食/夜宵 → mealType/snackPeriod；
- foodName/name/rawName/displayName → canonical item name；
- quantity 或 amount+unit → portionDescription；
- “饭前估算/还没吃/吃完再确认”可作为 estimated intent；
- 多候选 target → clarification。

主餐唯一、snack 多事件、append、estimated→confirmed、chat draft 与正式 photo 全部以 Meal Domain 为准。

### Weight
weightKg/weight/kg/value → weightKg。
缺数值必须问。

### Medicine
name/medicineName/drugName/title → name；
quantity/count/amount/number → quantity；
manufactureDate → productionDate；
expiryDate/expirationDate → packageExpiryDate；
openDate → openedDate。

### Mailbox
body/content/text/message/letter → body；
明信片 → postcard，否则默认 letter。
sender/recipient 由服务端身份规则决定。

### Settings
anniversary/anniversaryDate → anniversaryDate；
targetWeight/weightGoal/targetWeightKg → targetWeightKg。

## 7. Target Resolution

update/delete/append/confirm 不能猜 UUID。

~~~text
query candidates
→ zero candidate: clarify
→ one reliable candidate: proceed
→ multiple candidates: clarify
~~~

Meal 的主餐/加餐 target semantics 见 Meal Lifecycle + AI Contract。

## 8. Update / Delete Language

只有 registry 已注册对应 action 时才执行。

Delete：
- 不要求补 create 字段；
- 仍需当前消息明确删除意图；
- 仍需 ownership；
- 不猜 id。

legacy_home.replace 需要精确确认：“确认覆盖游戏数据”。

## 9. Responsibility Split

Model：
- 意图理解；
- 抽取用户明确提供/图片可见事实；
- 向用户问 clarification；
- 不编造。

Normalizer / AI Access Core：
- alias/default/date/unit；
- canonical mapping；
- clarification；
- target resolution。

Canonical Service：
- strict schema；
- permission/ownership；
- idempotency；
- formal write/read。

Adapter：
- transport/auth；
- 传递 identity/result；
- 不重写业务。

## 10. Adding a New Resource

~~~text
aliases
→ defaults
→ required fields
→ unsafe inference
→ clarification
→ target resolution
→ canonical schema/permission
→ tests
~~~

新增 AI resource 前必须先有真实 Domain/service。

## 11. Implementation Anchors

- lib/ai/life-input-normalizer.ts
- lib/ai/meal-slot-hints.ts
- lib/server/life-agent-executor.ts
- lib/server/life-agent-registry.ts
- tests/ai/*
- relevant tests/server/*

## 12. Regression / Maintenance

normalization/clarification 改变时更新本文。
完整测试矩阵见 Engineering / Development & Testing。
历史 bridge/验收在 docs/history，不从历史文件恢复 current behavior。
