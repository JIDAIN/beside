# 数据模型与 Source of Truth

状态：2026-09-11。

## 1. 核心原则

```text
事实数据优先保存
派生数据允许缓存，但必须可从事实重算
不同业务域不互相覆盖
UI 可以很轻，数据结构不能贫瘠
```

Supabase 是正式数据 Source of Truth，但同一个 Supabase project 内存在多个明确隔离的业务域，不能因为物理上共库就把它们当成同一套数据。

当前产品关系：

```text
伴岛 / Beside（当前主程序）
└─ 游戏
   └─ 变瘦变美大作战（Legacy Game 子项目）
```

`couple-better-game` 仅保留为历史名称、数据库兼容 slug 或生产兼容地址，不再是当前正式项目名称。

旧版“变瘦变美大作战”现已成为伴岛「游戏」中的独立子项目。它保留自己的历史和规则，但不属于当前生活记录字段。

## 2. 三个数据域

### Island Life：伴岛当前生活事实

```text
meals
meal_items
favorite_food_templates
mood_entries
sleep_records
activity_entries
weight_measurements
medicine_items
mailbox_letters
```

### Legacy Game：旧版游戏子项目

```text
daily_records
daily_record_sides
exchange_categories
exchange_records
wallets
wallet_ledger
```

金币、宝石、钱包、兑换记录、旧版每日打卡全部属于 Legacy Game，不属于 Island Life。

### Shared / System：共享基础设施

```text
couple_spaces
partner_profiles
app_configs
record_write_receipts
life_fixed_accounts
life_backup_snapshots
life_mcp_code_redemptions
life_notification_preferences
life_notification_deliveries
life_reminder_rules
life_reminder_instances
```

这些属于身份、配置、备份、通知、提醒编排或系统控制层，不能简单当成生活事实或游戏事实。

完整维护规则见 [`48-life-legacy-game-data-boundary.md`](48-life-legacy-game-data-boundary.md)。

## 3. 数据隔离硬规则

```text
Island Life maintenance ≠ Legacy Game maintenance
```

任何“生活数据清理 / 测试数据清理 / Life import / Life restore”默认只能操作 Island Life allowlist。

除非用户明确要求操作旧游戏，否则不能触碰：

```text
daily_records
daily_record_sides
exchange_categories
exchange_records
wallets
wallet_ledger
```

禁止仅凭 `created_at`、业务日期或“本周”这种跨域条件直接扫所有表。

代码层表级边界定义在 `lib/server/life-data-domains.ts`。

## 4. `meals`

核心字段：

```text
id
couple_space_id
partner_key
meal_date
meal_type
eaten_at
snack_period
status
source
total_calories_kcal nullable
calorie_min_kcal nullable
calorie_max_kcal nullable
note
idempotency_key nullable
photo_path nullable
photo_rotation_degrees
photo_scale
created_at
updated_at
deleted_at
```

`NULL` kcal 表示未知，`0` 表示确实为 0 kcal。

Meal V2 的受限值：

```text
meal_type    breakfast / lunch / dinner / snack
snack_period morning / afternoon / night（仅 snack，可为空）
status       estimated / confirmed
```

用户界面统一展示六个餐次：早餐 / 上午加餐 / 午餐 / 下午加餐 / 晚餐 / 晚上加餐。三个加餐只在前端映射为 `meal_type=snack + snack_period`，没有改变 canonical 数据结构。

历史 `other` 会迁移为 `snack`，历史 `evening / late_night` 合并为 `night`，历史 `draft` 迁移为 `estimated`。

当前正式 meal 只有一个 `photo_path`；`photo_rotation_degrees` 与 `photo_scale` 是显示元数据。

## 5. `meal_items`

```text
id
meal_id
food_id nullable
raw_name
display_name
portion_description nullable
estimated_weight_g nullable
calories_kcal nullable
calorie_min_kcal nullable
calorie_max_kcal nullable
protein_g nullable
carbs_g nullable
fat_g nullable
sort_order
created_at
updated_at
```

AI 记录时应尽量补全实际摄入量、重量和宏量营养，但数据库不会为了“完整”强制未知字段非空。

正式 meal 默认应保存可识别的食物详细 items，并同时保存整餐汇总；总热量不能代替详细项。

## 6. `favorite_food_templates`

常吃食物是按用户隔离的复用模板，不是某一天的餐食记录。

```text
id
couple_space_id
partner_key
name
portion_description nullable
calories_kcal nullable
carbs_g nullable
protein_g nullable
fat_g nullable
created_at
updated_at
```

数据原则：

```text
模板
→ 复制字段
→ 独立 meal_item
```

`meal_items` 不保存 template id，也没有指向 `favorite_food_templates` 的外键。因此：

- 修改本次餐食 item 不会修改模板；
- 修改或删除模板不会修改历史餐食；
- 模板加入餐食后仍按普通 `meal_items` 保存；
- Fish / Cat 通过应用层固定身份授权只能管理自己的模板；
- 数据库启用 RLS，浏览器角色没有直接表权限，服务端 service role 通过 API 访问。

模板已纳入 Life backup/export/restore payload，与其他 Life 用户数据一起备份恢复。

## 7. 单图持久化 vs 多图分析

聊天层可以同时分析餐前 / 餐后多图，但当前持久化模型为：

```text
meal -> one photo_path
```

多图可共同参与推断；默认保存餐前图；当前没有 `before_photo_path / after_photo_path`。

## 8. `mood_entries`

一天每个角色一条当前心情。唯一键：

```text
couple_space_id + partner_key + mood_date
```

## 9. `sleep_records`

```text
partner_key
sleep_date
fell_asleep_at
woke_at
source
created_at
updated_at
```

约束：`woke_at > fell_asleep_at`。

`sleep_date` 的产品语义是起床日 / 归档日，不是入睡开始日。跨夜记录中 `fell_asleep_at` 可以属于前一自然日，`woke_at` 属于 `sleep_date`；凌晨后才入睡时两者也可以属于同一日。该交互调整不改变表结构和唯一键。

睡眠删除由 service-only `delete_sleep_record` RPC 完成，并同时清理对应 write receipt；RPC 按 `couple_space_id + partner_key + id` 定位，不能跨 owner 删除。

## 10. `activity_entries`

```text
activity_date
occurred_at nullable
text
participant_scope
activity_type nullable
duration_minutes nullable
source
created_at
updated_at
deleted_at
```

活动是一对多事件流，删除使用 soft delete。

## 11. `weight_measurements`

```text
partner_key
measured_at nullable
measurement_date
weight_kg
source
context
note
linked_daily_record_side_id nullable
idempotency_key nullable
```

AI 记体重写这里，不自动覆盖旧游戏体重快照。

## 12. Reminder / Notification 系统模型

提醒系统属于 Shared / System，不属于具体生活事实表。

### `life_notification_preferences`

按 Cat / Fish 分别保存通知偏好：

```text
actor
enabled
timezone
daily_record_reminder_enabled
daily_record_reminder_time
anniversary_reminder_enabled
anniversary_reminder_time
anniversary_offsets
medicine_reminder_enabled
medicine_offsets
```

药箱设置当前约束：

```text
1～10 个提前量
每个提前量 0～90 天（RPC 强校验）
默认 [30,7,1,0]
```

### `life_reminder_rules`

表示提醒规则 / 来源定义：

```text
created_by
recipient_scope      cat / fish / both
source_kind          custom / medicine / anniversary / system
title
content
enabled
schedule_type
due_at
metadata
archived_at
```

自定义提醒会先建立 rule，再物化实例。

### `life_reminder_instances`

表示一次具体提醒：

```text
rule_id nullable
recipient            cat / fish
source_kind
source_ref nullable
title
content nullable
due_at
status               pending / snoozed / completed / dismissed
snoozed_until nullable
notified_at nullable
dedupe_key
metadata
completed_at nullable
```

`both` 不表示一条共享状态，而是物化成 Cat / Fish 各自实例，因此双方可以独立处理。

### `life_notification_deliveries`

表示投递尝试，不表示用户完成状态：

```text
actor
kind                  daily_record / anniversary / reminder
local_date
dedupe_key
status                reserved / accepted / failed
attempt_count
provider
provider_message_id
provider_error
```

Reminder Instance 与 Delivery 必须分离：

```text
instance completed ≠ PushPlus accepted
PushPlus accepted ≠ 用户已读
```

snooze 后会清空 instance `notified_at`，新的 effective due time 会形成新的 delivery dedupe key，从而允许合法再次提醒一次。

完整提醒架构见 [`14-wechat-reminders.md`](14-wechat-reminders.md)。

## 13. 外部写入与幂等

跨域 AI / import 写入使用稳定幂等边界。`record_write_receipts` 可用于部分外部写入回执语义。

这些控制记录不是生活事实本身。

## 14. 主要 Meal RPC

```text
list_meals
create_meal_record
update_meal_record
delete_meal_record
create_chatgpt_meal_record
get_chatgpt_meal_record
replace_meal_photo_state
update_meal_photo_display
```

AI Access Core 在这些 canonical RPC 之上提供 `append_meal_item` 与 `confirm_estimated_meal` 语义：自动定位唯一目标 Meal、复用 update transaction，并在补录和饭后确认时保留原 `eaten_at`。

Meal 数量约束：

- `(couple_space_id, partner_key, meal_date, meal_type)` 对有效的 breakfast / lunch / dinner 使用部分唯一索引，每人每日每种主餐最多一条；
- snack 不进入该唯一索引，同一 morning / afternoon / night 可有多条独立事件；
- 软删除后的主餐槽可以重新创建；每条 snack 独立持有自己的 `photo_path` 与 items。

## 15. Source / AI 写入

统一来源词汇：

```text
manual
chatgpt
import
```

AI 入口不获得任意 SQL。AI Access Core 负责 identity / permission / normalization / idempotency / media boundary / canonical dispatch。

饮食“先草稿、后确认”属于 AI 对话层规则，不对应数据库 draft 表。

常吃食物只是人工 UI 的复用模板；AI / MCP 继续写 canonical `meals + meal_items`，不依赖模板，也不会修改模板。

`legacy_home` 是旧版游戏兼容入口，不属于普通 Island Life resource。

## 16. Fact vs Derived

Island Life 事实包括 meal、meal item、favorite food template、weight、mood、sleep、activity、medicine、mailbox。

Legacy Game 事实包括 daily record、exchange、wallet ledger；它们只在游戏子项目内解释。

Reminder rule / instance / notification delivery 属于系统编排事实，不重新定义原始生活事实。

派生 / 快照包括 wallet current balance、heatmap、nutrition summary、sleep duration、月度心情展示与 UI stale cache。

## 17. Migration 规则

- Production schema / function / view / grant / RLS 变化必须新增 migration；
- 已执行 migration 不回改；
- migration 保存在 `supabase/migrations/`；
- migration 不等于真实数据备份；
- 当前只做逻辑硬隔离，不迁移 Legacy Game 到独立 PostgreSQL schema；如未来需要物理迁移，必须单独设计 migration 和回归测试。
