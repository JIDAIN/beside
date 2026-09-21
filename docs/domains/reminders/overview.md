# Reminder Domain

状态：2026-09-21。本文描述当前代码 + Production Supabase 实际运行的提醒 contract。

## 1. Reminder 不是一条单链路

当前实际上有两类提醒路径。

### A. Reminder Center instance 路径

用于 custom、medicine、anniversary、mailbox：

rule / domain event
→ life_reminder_instances
→ due dispatcher
→ life_notification_deliveries
→ provider

### B. 每日记录完整性特殊路径

每日完整性提醒当前 **不创建 life_reminder_instances**。

它由现有 claim 函数直接检查当天记录完整性：

21:00 后检查
→ private.life_daily_record_completeness
→ public.claim_life_notification_reminders
→ reserve life_notification_deliveries
→ PushPlus

因此不能把“所有提醒都先进入 reminder_instances”写成当前事实。

## 2. 当前 Reminder Center

页面代码存在于 /me/reminders 和 components/life/LifeReminderCenterPage.tsx。

当前支持：

- 新建自定义提醒；
- recipient = cat / fish / both；
- 今天 / 即将到来 / 已完成；
- complete；
- dismiss；
- snooze 1 小时；
- 当前账号自己的药箱提醒开关与提前天数；
- 查看 PushPlus 是否已配置；
- 查看纪念日提醒状态。

该页面当前不是底部主导航项，也不是“我的”页面的独立列表入口。

## 3. Reminder Center 数据模型

life_reminder_rules 表示持续规则 / 自定义 reminder 来源。

life_reminder_instances 表示一次实际待处理事件，核心字段包括 recipient、source_kind、source_ref、title/content、due_at、snoozed_until、notified_at、status、dedupe_key、metadata。

状态只有：

- pending
- snoozed
- completed
- dismissed

life_notification_deliveries 记录通知渠道投递，状态包括 reserved / accepted / failed。accepted 只表示 provider 接受发送，不表示用户已完成 reminder。

## 4. 当前 source_kind

Production 与前端当前使用：

- custom
- medicine
- anniversary
- system
- mailbox

每日完整性提醒的 delivery kind 为 daily_record，属于上面的特殊 claim 路径，不是 Reminder Center source_kind。

## 5. Provider 路由

当前 Production dispatcher 的实际规则：

### mailbox

WeChat Public Platform test account
→ 成功：wechat_test_account
→ 失败：PushPlus fallback

### 其他 Reminder Center instance

custom / medicine / anniversary / system
→ PushPlus

如果非 mailbox reminder 没有 PushPlus token，dispatcher 会跳过该 instance。

Reminder Engine 与 provider 保持解耦；业务模块不应直接调用微信 API。

## 6. Mailbox reminder

draft 不提醒。

首次进入 sent 时为 recipient 创建 mailbox instance：

- draft create/update → no reminder；
- draft → sent → 1 mailbox instance for recipient；
- direct sent create → 1 mailbox instance for recipient。

微信通知不包含信件正文，点击进入 /nest/mailbox。

已经成功通知过的 mailbox instance 会按当前数据库规则完成，不作为长期 pending task 留在提醒中心。

## 7. 每日记录完整性

Cat / Fish 独立检查。

当前产品规则固定为每天 **21:00，Asia/Shanghai** 检查：

- 心情；
- 睡眠；
- 早餐 confirmed；
- 午餐 confirmed；
- 晚餐 confirmed。

estimated 主餐、snack、Ta 的记录都不算当前 actor 完成。

五项全部完成时静默；有缺项时只生成一条汇总通知，missingItems 列出全部缺失项。

dedupe key 为 daily_record:<actor>:<date>，因此同一 actor 同一天不会因 cron 重试重复正常投递。

2026-09-21 已直接核验 Production：Cat / Fish 当前均启用该规则，时间均为 21:00。

## 8. Medicine / Anniversary

Medicine reminder：

- 每个 actor 有自己的 enable + offsets；
- 当前 UI 可以修改 medicine enabled 和 offsets；
- offsets 限制 0～90 天；
- 修改设置后会重建仍处于 active 的 medicine instances。

Anniversary reminder：

- 从共享 anniversary date 物化；
- 每个 actor 独立接收；
- 当前 Reminder Center UI 只展示状态，不提供修改 anniversary reminder offsets 的控件。

具体当前 Production preference 值属于运行状态，不作为本文长期 contract；需要核实时直接查 Production。

## 9. Snooze 与 dedupe

Reminder Center snooze 会把 status 改为 snoozed、写 snoozed_until，并把 notified_at 置空。

delivery dedupe 使用 instance + effective due time，因此相同 due time 的网络重试不会重复发送；明确 snooze 后，新 due time 可以再次通知。

## 10. Production scheduler

2026-09-21 实际核验存在两个 active cron：

| Job | Schedule |
|---|---|
| life-reminder-materialize-v1 | 10 0 * * * |
| life-pushplus-reminders-v1 | */5 * * * * |

前者物化 first-class Reminder Center sources；后者执行通知 dispatcher。

cron 名称中的 pushplus 是历史命名，不代表 mailbox 当前仍只走 PushPlus。

## 11. 身份与 secret

PushPlus token、微信测试号 AppID/AppSecret/Template/OpenID 保存在服务端 / Supabase Vault，不进入公开 GitHub，不下发浏览器。

Cat / Fish 的 token / OpenID 路由必须按 actor 隔离。

AI 昵称“团子”只影响展示，不参与鉴权。

## 12. 当前事实源

代码：

- components/life/LifeReminderCenterPage.tsx
- lib/life/reminder-client.ts
- lib/server/life-reminder-center.ts
- lib/server/life-wechat-reminders.ts

Production runtime：

- life_notification_preferences
- life_reminder_rules
- life_reminder_instances
- life_notification_deliveries
- cron.job
- private.dispatch_due_life_reminders_for_actor
- public.claim_life_notification_reminders

用户可见提醒语气：
→ [Notification Tone](notification-tone.md)
