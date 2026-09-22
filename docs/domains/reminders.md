# Reminder Domain

本文是伴岛提醒业务的 current canonical contract。Reminder generation、用户状态、delivery、provider 与语气在这里统一解释。

## 1. Domain Boundary

Reminder 解决“什么时候、提醒谁、是否已经提醒/完成、通过什么渠道发出”。

它不定义被提醒业务本身。例如药品有效期属于 medicine data；Reminder 只消费其提醒语义。

## 2. Core Concepts

### Reminder Source
产生提醒需求的业务来源。

### Stateful Reminder
需要长期用户状态的提醒：rule / instance → delivery。

### Condition Nudge
运行时判断条件，成立才 claim delivery；不制造长期 instance。

### Notification Delivery
一次投递尝试与 provider 结果，不等于用户完成/已读。

### Provider
PushPlus、微信测试号等最终渠道，不定义提醒业务语义。

## 3. Current Source Matrix

| Source | Generation | User state | Current provider |
|---|---|---|---|
| custom | Stateful | instance | PushPlus |
| medicine | Stateful | instance | PushPlus |
| anniversary | Stateful | instance | PushPlus |
| mailbox | Stateful | instance | WeChat test account primary → PushPlus fallback |
| daily completeness | Condition Nudge | no long-lived instance | PushPlus |

## 4. Stateful Reminder Flow

~~~text
source / rule
→ materialize recipient instance
→ effective due time
→ dispatcher / scheduler
→ delivery reservation
→ provider routing
→ delivery completion
~~~

both recipient 会物化 Cat/Fish 独立实例，双方可以独立 complete/dismiss/snooze。

## 5. Condition Nudge Flow

daily completeness 当前路径：

~~~text
life_notification_preferences
→ runtime completeness evaluation
→ condition false: silent
→ condition true: claim/dedupe delivery
→ PushPlus
~~~

它当前不创建 life_reminder_instances。排障时不要去找不存在的 daily_record instance。

## 6. Source Contracts

### Custom
用户创建 rule，指定 cat/fish/both、title/content、dueAt；再物化实例。

### Medicine
药箱事实提供到期信息；每个 actor 的 reminder enabled/offsets 独立。当前默认 offsets 为 30/7/1/0，合法范围由 current RPC 约束。

### Anniversary
共享 anniversaryDate + actor notification preferences 生成提醒。provider 当前 PushPlus。

### Mailbox
draft 不提醒。
第一次真正 sent（direct sent 或 draft→sent）只为 recipient 生成一条 mailbox instance。重复读取/编辑已 sent 信件不得重复生成。

### Daily Completeness
当前 Cat/Fish 都有独立 preference；当前生产设置为 21:00 Asia/Shanghai。条件检查当日记录完整性并直接 claim delivery。

## 7. Instance State / Snooze

instance status：
pending / snoozed / completed / dismissed。

snooze：
- 写 snoozed_until；
- 清 notified_at；
- 新 effective due time 使用新的 delivery dedupe key。

因此 snooze 后合法再次提醒不属于重复推送 bug。

## 8. Delivery / Dedupe

life_notification_deliveries 记录投递尝试：
- actor；
- kind；
- local_date；
- dedupe_key；
- status reserved/accepted/failed；
- attempt_count；
- provider；
- provider result/error。

必须保持：
instance completed != provider accepted；
provider accepted != 用户已读。

## 9. Provider Routing

provider 与 generation 解耦。

当前：
- custom/medicine/anniversary → PushPlus；
- mailbox → 微信测试号主通道，失败后 PushPlus fallback；
- daily completeness → PushPlus。

新 provider 只扩 credentials/adapter/routing/completion，不重做 source/lifecycle。

## 10. User-facing Tone / Renderer

当前 AI 名称统一“团子”。

语气：
- 亲近、温和；
- 清楚说明发生了什么；
- 少量 emoji；
- 不暴露 actor/table/error code；
- 普通记录提醒不写成考核；
- 安全/失败场景不能为了可爱掩盖事实。

默认称接收人为“主人”；伴侣称呼可以稳定选择“宝宝/老婆/宝贝老婆/亲亲老婆/最爱的宝贝”等展示词，不能影响 sender/recipient。

Production 正式文案的最终事实源是当前 Supabase functions，例如 life_pushplus_center_message、life_pushplus_message、life_wechat_mailbox_message / mailbox send path。

注意：lib/server/life-wechat-reminders.ts 中存在历史/辅助 renderer 与 claim helper，它不是当前全部 Production 正式发送文案的唯一事实源。

## 11. Scheduler

当前 Production 有两条 active cron：
- life-reminder-materialize-v1：10 0 * * *
- life-pushplus-reminders-v1：*/5 * * * *

具体 runtime 值属于 current implementation，变化时更新本文与 Current State/Operations 相关检查。

## 12. Identity / Configuration Boundary

- reminder instance/action 绑定 actor；
- PushPlus token / OpenID 按 actor 隔离；
- secret 保存在 server / Supabase Vault；
- AI 昵称不参与鉴权。

环境变量 / secret 见 Engineering / Configuration。

## 13. UI Boundary

Reminder Center 当前 UI：components/life/LifeReminderCenterPage.tsx。
首页也有轻量 reminder card。

UI 只呈现 current instance/state；不得在 UI 自己重新实现 generation/dedupe/provider。

## 14. Implementation Anchors

- components/life/LifeReminderCenterPage.tsx
- components/life/today/TodayReminderCard.tsx
- lib/life/reminder-client.ts
- lib/server/life-reminder-center.ts
- app/api/life/reminders/**
- app/api/life/notifications/pushplus/**
- Production reminder tables/functions/cron
- tests/server/life-wechat-reminders.test.ts
- reminder-related life/server tests

## 15. Change Impact

- 新 source → 先选 Stateful / Condition Nudge；
- instance state 改变 → Data Model + UI + tests；
- dedupe/snooze 改变 → 本文 + DB/tests；
- provider 改变 → Configuration/Security + dispatcher tests；
- tone 改变 → renderer + 本文；
- schedule 改变 → runtime/Operations + tests。

## 16. Extension Recipes

### New Stateful Source

~~~text
define source semantics
→ data/source reference
→ materialization
→ instance metadata/dedupe
→ UI
→ delivery
→ provider
→ tests/docs
~~~

### New Condition Nudge

~~~text
define runtime condition
→ preferences/timezone
→ claim/dedupe
→ delivery
→ provider
→ tests/docs
~~~

### New Provider

~~~text
credentials/config
→ provider adapter
→ routing policy
→ completion/error mapping
→ smoke
~~~

禁止新 source 直接绕过 delivery 层自行发送 PushPlus/其他渠道。

## 17. Maintenance Rules

Reminder source/lifecycle/delivery/provider 改变时更新本文。
表字段仅在 Data Model 维护；secret 仅在 Configuration；事故步骤仅在 Operations。
