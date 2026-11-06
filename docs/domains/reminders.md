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
| proposal | Stateful | reminder instance | PushPlus → 微信端 |
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
药箱事实提供到期信息；每个 actor 的 reminder enabled/offsets 独立。

必须区分两层事实：
- current schema default：`medicine_offsets = [30,7,1,0]`；
- 2026-09-22 Production 只读核验：Cat/Fish 当前实际 preference 均为 `[7,0]`。

settings RPC 要求 1～10 个 offsets，每个值 0～90 天。materializer 读取 actor 当前 preference；不能把 schema default 当成所有账号的当前提醒计划。

### Anniversary
共享 anniversaryDate + actor notification preferences 生成提醒。provider 当前 PushPlus。

### Mailbox
draft 不提醒。
第一次真正 sent（direct sent 或 draft→sent）只为 recipient 生成一条 mailbox instance。重复读取/编辑已 sent 信件不得重复生成。

### Daily Completeness
当前 Cat/Fish 都有独立 preference；2026-09-22 Production 只读核验均为 21:00 Asia/Shanghai。

当前 `complete` 定义为当前 actor 当日同时满足：
- mood 已记录；
- sleep 已记录；
- confirmed breakfast 已记录；
- confirmed lunch 已记录；
- confirmed dinner 已记录。

`estimated` Meal 不计为完成；snack 不参与完整性判断。

若任一项缺失，Condition Nudge 才 claim 当日 delivery，并把 missingItems / missingKeys 带入正式 PushPlus renderer；complete 时保持 silent。

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

### 团子模板轮换（仓库已实现，尚未上线）

生活记录动态、21:00 双人汇总及通过 `private.life_pushplus_message` 渲染的纪念日提醒，支持五套亲昵表达，标题与正文只使用正式产品名称 **伴岛 / Beside**，不再引入「小岛日记」等未定义模块名称。

- 由稳定消息信息经 `private.tuanzi_copy_variant(text)` 确定模板编号（1–5），不调用 `random()`；重试应使用同一套表述。
- 生活动态仍只由真实确认记录决定列出的心情、睡眠、早餐、午餐和晚餐，不通过语气模板编造状态或情绪。
- 晚间汇总始终分别展示「主人」「老婆」的真实缺失项；语气亲昵但不责备或比较。
- 纪念日必须保留「今天 / 明天 / 还有 N 天」的真实时间含义。
- 本轮变更为新的 forward migration `20261106100000_varied_tuanzi_notification_copy.sql`；**未执行 Production Supabase migration 或 Vercel 部署** 时不得把当前文案写成线上事实。

### 待发布：21:00 真实值小结与一起做吧文案

- 21:00 条件提醒升级为**每天固定一份双人生活小结**，即使两人全量记录完成，也按各自开关分别发送。仍使用每天一次的 `daily_record` delivery key；不更改五分钟 cron。
- 心情展示 canonical 中文 label（特别注意 neutral = 心动）；睡眠时长按 `woke_at - fell_asleep_at`（起床日归档）；未记录项不误写成没吃/没睡。
- 饮食主餐分别展示已确认的热量或「热量未知」，snack 为全部确认加餐之和；**今日饮食合计**包含全部已确认主餐和零食的已知 kcal。未估算热量不可当成零；若有未知或缺餐，显示「仅已知部分」。
- 同一份发送 payload 内携带自己/老婆两个 canonical 日期快照，按接收者视角渲染；不以一条记录有无热量估算来改变“是否已记录”。
- 一起做吧保留原本 source、due time、delivery/claim/去重和 PushPlus 路由，只优化团子文案，附经 HTML 转义的约定名称与北京时间，不泄露自由备注。定时提醒不得误写为对方刚刚发起。
- Forward migration `20261106110000_daily_recap_proposal_notifications.sql`。此条为**代码待发布行为**，Production 实际效果需核迁移 ledger 与 runtime。上线前不能称已经生效。

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

## Unreleased source implementation: Tuanzi couple notifications

> This describes implemented repository code; it is **not** a Production capability until the forward migration is authorized/applied and the code is deployed and verified. See Engineering Current State for Production facts.

- New source: `partner_record`. The database captures a first qualifying same-day mood, sleep or confirmed breakfast/lunch/dinner event from canonical tables, regardless of whether the writer is Web or MCP. Edits, drafts, snacks and past-day backfill are not notifications.
- The same actor/date/kind has one event for dedupe, including after deletion/re-entry; on dispatch, canonical completeness is rechecked so deleted records are not announced.
- Recipient is the *other* person, never the writer. A five-minute quiet window coalesces events from one writer and date, with a 15-minute maximum accumulation boundary; the existing five-minute job causes additional scheduling latency.
- `life_partner_record_events` is an internal pending/delivery ledger; `life_notification_deliveries` retains provider outcomes. `partner_record` is separate from stateful reminder instances.
- Recipient preferences are independent: `partner_record_notifications_enabled` and `daily_record_reminder_enabled`; unrelated reminder sources are unchanged.
- 21:00 completeness remains based on the five canonical record types. The recipient gets a couple snapshot: **主人** (self) and **老婆** (partner) each show missing items or completion. Either person's missing item triggers the digest for each enabled recipient.
- Tuanzi text is affectionate, factual, non-competitive. Cat/Fish remain trusted actor keys only and never appear as names in the push body.
- Implementation migration: `supabase/migrations/20261106090000_tuanzi_partner_record_notifications.sql`. Do not claim the functionality works on Production merely because the branch exists.
