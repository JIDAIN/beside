# Data Model & Source of Truth

本文记录 Supabase 当前可表达的事实、ownership class、硬约束与 fact/derived 边界。复杂业务 lifecycle 由对应 Domain 维护；简单领域可在本文保留理解 schema 所必需的最小语义。

## 1. Core Principles

~~~text
事实数据优先保存
派生数据允许缓存，但必须可重建
不同业务域不互相覆盖
UI 可以很轻，数据结构不能贫瘠
Supabase 是正式 Source of Truth
~~~

## 2. Data Domain Index

| Domain | Data class | Main fact store | Ownership class | Key data meaning | Canonical detail |
|---|---|---|---|---|---|
| mood | personal | mood_entries | owner | 每人每日当前心情 | 本文 + Auth |
| sleep | personal | sleep_records | owner | 起床日归档的睡眠事实 | 本文 + Auth |
| activity | personal/shared | activity_entries | actor / both | 多事件活动事实 | 本文 + Auth |
| weight | personal | weight_measurements | owner | 个人体重事实 | 本文 + Auth |
| medicine | shared | medicine_items | shared | 家庭药箱 + 派生有效期 | 本文 + Auth |
| mailbox | relationship lifecycle | mailbox_letters | sender/recipient | draft / sent | 本文 + Auth |
| settings | mixed | app_configs / partner_profiles | shared/personal | 纪念日 + 目标体重 | 本文 + Auth |
| Meal | personal complex | meals + meal_items + favorite_food_templates | owner | 餐食正式事实 | Meal Domain |
| Reminder | system orchestration | preferences/rules/instances/deliveries | actor/system | 提醒编排事实 | Reminder Domain |
| Legacy Game | legacy | daily_records / wallet / exchange... | game-specific | 游戏结算事实 | Legacy Game Domain |

本表只维护数据导航，不维护当前 UI 入口、service path、AI action 或 provider routing。

## 3. Life / Legacy / Shared Boundary

当前同一个 Supabase project 中存在三个逻辑区域：

### Life facts
mood、sleep、activity、Meal、weight、medicine、mailbox、生活 settings 等。

### Legacy Game facts
daily record、settlement、wallet、exchange、heatmap 相关游戏事实。

### Shared / System
固定账号、提醒编排、写入回执、备份等基础设施。

硬规则：
- Life maintenance 不按日期跨表清理 Legacy；
- Meal calories 不自动覆盖 deficit；
- Life activity 不自动覆盖 game exercise；
- Life weight 不自动覆盖 game weight snapshot；
- Life backup/import 默认不包含 Legacy Game；
- 逻辑隔离目前不等于物理 PostgreSQL schema 分离。

长期原因见 ADR-0005。

## 4. Identity / Actor Keys

稳定 partner key：
- cat
- fish

UI 的“我 / Ta”不进入持久化 schema。

fixed-account credential 位于 life_fixed_accounts；真实密码只保存 hash，不进入 migration seed。

`life_fixed_accounts` current core fields：

~~~text
partner_key
username
password_hash
created_at
updated_at
~~~

账号认证流程与 session/OAuth 边界见 Auth & Identity；本文只记录数据事实。

## 5. Personal Fact Domains

### 5.1 Mood

mood_entries 每人每日一条当前心情，唯一键为 couple_space_id + partner_key + mood_date。

canonical mood keys 当前为：
happy、calm、neutral、anxious、sad、angry、tired、excited。

产品中文 label 不应按英文自行翻译；特别是 neutral 的当前产品语义是“心动”。

### 5.2 Sleep

sleep_records 核心字段：
partner_key、sleep_date、fell_asleep_at、woke_at、source、created_at、updated_at。

stable semantics：
- sleep_date = 起床日 / 归档日；
- woke_at > fell_asleep_at；
- 跨夜时 fell_asleep_at 可以属于前一自然日；
- Web 删除与 AI action surface 是两件事，AI 是否暴露 delete 由 AI Architecture 决定。

### 5.3 Activity

activity_entries 是多事件流。

核心字段：
activity_date、occurred_at、text、participant_scope、activity_type、duration_minutes、source、deleted_at。

participant_scope：
cat / fish / both。

duration_minutes 当前输入 contract 为 0～1440 的整数或 null。
删除为 soft delete。

both 的写权限见 Auth。

### 5.4 Weight

weight_measurements 保存个人 measurement fact：
partner_key、measurement_date、measured_at、weight_kg、source、context、note、linked_daily_record_side_id、idempotency_key。

当前 weight 合法范围：>0 且 <500 kg。

Life weight 不自动覆盖 Legacy Game 体重快照。

## 6. Shared / Relationship Domains

### 6.1 Medicine

medicine_items 是 couple-space shared inventory。

核心字段：
name、production_date、shelf_life_months、package_expiry_date、opened_date、opened_shelf_life_days、quantity、note、source、import_key、archived_at。

当前约束：
- name 1～120 字；
- shelf_life_months：1～240 或 null；
- opened_shelf_life_days：1～3650 或 null；
- quantity：0～9999；
- import_key 在 couple space 内唯一，可为空。

derived：
- openedExpiryDate = opened_date + opened_shelf_life_days；
- finalExpiryDate = package expiry 与 opened expiry 中更早的有效日期。

当前 UI/domain 派生状态：
expired / soon / normal / unknown；
soon 默认窗口为 120 天。

注意：120 天是药箱“快过期”显示阈值，不是 Reminder 提前量。Reminder offsets 由 Reminder Domain 维护。

删除药品是 soft archive。

### 6.2 Mailbox

mailbox_letters 是关系数据。

核心字段：
sender_key、recipient_key、format(letter/postcard)、title、theme_key、body、status(draft/sent)、sent_at、source、deleted_at。

stable contract：
- sender/recipient 只能 cat/fish 且不同；
- draft 只 sender 可见、可改、可删、可寄；
- draft → sent 写 sent_at；
- 第一次真正 sent 触发 recipient mailbox reminder；
- sent sender + recipient 可读，永久只读；
- postcard canonical title 为 null；
- 旧 sent-only RPC 只作 compatibility，不应绕过当前 authorized service。

### 6.3 Settings

Life Settings 当前由 app_configs 与 partner_profiles 组合成 read model。

app_configs：
- shared anniversary_date；
- 同时承载部分 Legacy Game config。

partner_profiles：
- partner_key；
- nickname / emoji；
- target_weight_kg 等。

targetWeightKg 是个人设置，当前合法范围 >0 且 <500 kg，只能改自己。

anniversaryDate 是 shared setting。
daysTogether 的稳定语义：纪念日当天 = 第 1 天。

notification preferences 不属于普通 Life settings contract，见 Reminder Domain。

## 7. Meal Data Model

Meal 复杂业务见 [Meal Domain](../domains/meal/README.md)；本文维护 current schema / constraint / RPC fact。

### 7.1 `meals`

current core fields：

~~~text
id
couple_space_id
partner_key
meal_date
meal_type
eaten_at
snack_period
status
source
total_calories_kcal
calorie_min_kcal
calorie_max_kcal
note
idempotency_key
photo_path
photo_rotation_degrees
photo_scale
created_at
updated_at
deleted_at
~~~

current constrained values：
- meal_type：breakfast / lunch / dinner / snack；
- snack_period：morning / afternoon / night 或 null，且非 snack 必须为 null；
- status：estimated / confirmed；
- partner_key：cat / fish；
- photo_rotation_degrees：0 / 90 / 180 / 270；
- photo_scale：0.60～1.00。

关键约束 / index：
- `meals_main_slot_active_unique`：同一 couple_space + partner + meal_date + breakfast/lunch/dinner 最多一条未删除 Meal；
- snack 不进入主餐唯一索引，可有多条独立事件；
- `meals_idempotency_unique`：couple_space_id + idempotency_key 唯一；
- deleted_at 为 soft delete 边界。

`total_calories_kcal` 与区间字段在 runtime schema 可为 null；业务语义保持 `null = 未知/未估算`，`0 = 确认为 0`。数据库仍有历史 default，调用方不能用“省略字段”代替“明确未知”的语义。

一条 Meal 当前只有一个正式 `photo_path`；rotation / scale 是显示 metadata。图片处理 contract 见 [Meal Photo Storage](../domains/meal/photo-storage.md)。

### 7.2 `meal_items`

current core fields：

~~~text
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
~~~

`meal_id` 删除时 item cascade；`food_id` 删除时 set null。营养/重量允许 null，数据库不会为了“字段完整”伪造未知值。

### 7.3 `favorite_food_templates`

current core fields：

~~~text
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
~~~

模板按 partner 隔离。模板加入餐食时复制为独立 `meal_items` 数据；当前 `meal_items` 不保存 template foreign key，因此修改模板不会回写历史 Meal。

### 7.4 Canonical Meal RPC Boundary

Production/current schema 中主要 RPC：

~~~text
list_meals
create_meal_record
update_meal_record
delete_meal_record
create_chatgpt_meal_record
get_chatgpt_meal_record
replace_meal_photo_state
update_meal_photo_display
~~~

`append_meal_item` / `confirm_estimated_meal` 是 AI Access Core 在 canonical Meal read/update 之上提供的业务动作，不是第二套 Meal 表或任意 SQL path。

完整 lifecycle 见 [Meal Lifecycle](../domains/meal/lifecycle.md)，AI 会话规则见 [Meal AI Contract](../domains/meal/ai-contract.md)。
## 8. Reminder / Notification Model

Reminder 属于 Shared/System orchestration。业务 generation / snooze / provider routing 见 [Reminder Domain](../domains/reminders.md)；本文维护 current table / field / constraint fact。

### 8.1 `life_notification_preferences`

一行对应一个 couple space + actor。

~~~text
couple_space_id
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
created_at
updated_at
~~~

primary key：`(couple_space_id, actor)`；actor 只能 cat/fish。offset arrays 在 DB 层要求 1～10 个值。

current schema defaults：
- timezone = Asia/Shanghai；
- daily_record_reminder_time = 21:00；
- anniversary_reminder_time = 09:15；
- anniversary_offsets = [7,3,0]；
- medicine_offsets = [30,7,1,0]。

**schema default 不等于当前 Production 每个账号的 preference。** 2026-09-22 只读核验时 Cat/Fish 的 medicine_offsets 实际均为 `[7,0]`。Reminder materializer 读取 actor 当前 preference。

### 8.2 `life_reminder_rules`

~~~text
id
couple_space_id
created_by
recipient_scope
source_kind
title
content
enabled
schedule_type
due_at
metadata
created_at
updated_at
archived_at
~~~

current constrained values：
- recipient_scope：cat / fish / both；
- source_kind：custom / medicine / anniversary / system / mailbox；
- schedule_type：once / daily；
- title：1～120 字。

### 8.3 `life_reminder_instances`

~~~text
id
couple_space_id
rule_id nullable
recipient
source_kind
source_ref nullable
title
content nullable
due_at
status
snoozed_until nullable
notified_at nullable
dedupe_key
metadata
created_at
updated_at
completed_at nullable
~~~

current status：pending / snoozed / completed / dismissed。`(couple_space_id, recipient, dedupe_key)` 唯一。

### 8.4 `life_notification_deliveries`

~~~text
id
couple_space_id
actor
kind
local_date
dedupe_key
status
attempt_count
metadata
provider
provider_message_id nullable
provider_error nullable
reserved_at
completed_at nullable
created_at
updated_at
~~~

current constrained values：
- kind：daily_record / anniversary / reminder；
- status：reserved / accepted / failed；
- attempt_count：1～3；
- `(couple_space_id, dedupe_key)` 唯一。

必须保持：
~~~text
instance completed != provider accepted
provider accepted != 用户已读
~~~

Stateful / Condition Nudge、snooze、dedupe 与 provider routing 见 [Reminder Domain](../domains/reminders.md)。
## 9. Legacy Game Data Boundary

Legacy Game 的 daily record、wallet、exchange 等事实由 Legacy Game Domain 解释。

普通 Life CRUD / import / backup / AI 不应把这些表视为普通 Life resource。

## 10. System Control / External Write / Idempotency Facts

### 10.1 `record_write_receipts`

部分 AI/import 外部写入使用稳定 write receipt：

~~~text
id
couple_space_id
source
domain
idempotency_key
entity_id
created_at
~~~

current source：chatgpt / import。current domain：meal / mood / sleep / activity / weight / medicine。

`(couple_space_id, idempotency_key)` 唯一。receipt 是写入控制事实，不是生活事实。

### 10.2 AI / External Write Boundary

AI 不获得任意 SQL；正式写入必须经过 canonical service / restricted RPC。Meal 自身同时保留 `meals.idempotency_key` 作为 Meal 写入边界。

## 11. Fact vs Derived

Life facts：
Meal/item、favorite template、weight、mood、sleep、activity、medicine、mailbox、settings。

Legacy facts：
daily record、exchange、wallet ledger 等。

System facts：
reminder rule/instance/delivery、backup snapshots、write receipts。

Derived/read model 示例：
- wallet current balance；
- heatmap；
- nutrition summary；
- sleep duration；
- monthly display；
- medicine status；
- daysTogether；
- browser stale cache。

## 12. Backup / Import Scope

Life data-management 使用 allowlist，而不是“整个 Supabase dump”。

### 12.1 `life_backup_snapshots`

~~~text
id
couple_space_id
scope
reason
schema_version
payload
row_counts
created_by nullable
created_at
~~~

current scope：user / config / full。
current reason：manual / scheduled / pre_restore / import。

snapshot 保存可恢复 payload 与 row counts；schema 可重建不等于用户数据已经备份。

### 12.2 Import / Restore RPC Boundary

current major data-management RPC：

~~~text
import_life_full_data
restore_life_backup_snapshot
~~~

stable rule：
- Life facts + 明确 shared config 可以进入 Life backup/import；
- Legacy Game 默认排除；
- restore 前建立 pre_restore snapshot；
- import/restore 后 UI cache 必须重新收敛。

具体恢复流程见 [Operations](../engineering/operations-runbook.md)。

## 13. Migration Boundary

Production schema / function / view / grant / RLS 变化必须通过新增 migration。
已执行 migration 不回写。
仓库 migration 位于 supabase/migrations。

migration replay / ledger / blank-database rebuild 属于 Engineering / Operations。

## 14. Implementation Anchors

数据事实至少从以下位置核验：
- supabase/migrations/**
- lib/server/supabase-life.ts
- lib/server/supabase-weight.ts
- lib/server/supabase-medicine.ts
- lib/server/supabase-mailbox.ts
- lib/server/supabase-nutrition.ts
- lib/server/supabase-favorite-foods.ts
- lib/life/*-service.ts
- lib/nutrition/meal-service.ts
- lib/server/life-data-domains.ts

## 15. Maintenance Rules

更新本文：
- table / field / enum / constraint；
- ownership class；
- fact vs derived；
- backup/import scope；
- canonical DB/RPC boundary。

UI route 改变不更新本文。
复杂 Domain lifecycle 不在本文复制。
