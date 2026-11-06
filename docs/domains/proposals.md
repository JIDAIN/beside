# Together / 一起做吧 Domain

> 本文记录一起做吧 V1 的 current Domain contract。Web/Production Supabase 于 2026-11-06 发布；AI/MCP proposal 代码通过 PR #98 增量接入，线上是否生效以另行授权的 Vercel Production 部署为准。

## 目标与边界

情侣双方在「小窝 → 一起做吧」发起生活小事邀请，协商时间、温柔启动并如实记录执行结果。共享 Life 事实，不是个人行动许可，也不属于 Legacy Game。不强制审批，不限制拒绝次数，不做惩罚、排名、积分或自动结算，不自动更改 Meal/activity/weight。

## 身份与权限

- 同一 couple_space 的 Cat/Fish 使用各自 Web 登录；服务端从 signed session 获取 actor。
- 双方可读取约定；只有 `waiting_for` 指向的 actor 可接受、拉我一把、提出反建议或拒绝。
- 发起人可以撤回未达成的提案；达成后任一方可以在预计结束前取消（即使已经开始），无需对方批准。
- 执行结果由各自记录，不能替对方确认；服务端 RPC 校验身份、版本与事务配额。
- 「拉我一把」表示当前自愿接受约定并请求开始时的启动提醒，仍可取消。

## 名额与时间

- 每人同时最多 2 个待回应（`pending/counter`）；未来 7 日两人合计最多 3 个已达成、尚未开始的约定（`agreed/reschedule`）。
- 创建与改动时间限未来 7 日，时长 5～180 分钟，标题 1～120 字，备注最多 500 字；UI 固定按北京时间输入。
- 发起后 48 小时或原约定开始时间较早者自动过期。过期不是拒绝。
- 达成前的 `counter` 不累计改期；达成后 `reschedule` 由另一方接受才修改时间并累计 1 次；最多 2 次；拒绝改期保留原约定。
- `counter` 与 `reschedule` 只保留一份候选方案，不并行多份申请；接受时重新检查配额，拒绝随时有效。

## 生命周期

`pending/counter → agreed → awaiting_result → closed`，已约定可在开始前临时进入 `reschedule`。

- 预计结束时进入 `awaiting_result`；每位 actor 独立提交 `done/partial/not_done`。
- 每人每次约定只能提交一次结果，防止重复提醒；另一人可以在自动收尾后补记此前缺失的结果。
- 双方提交后派生 `joint_done/partial/solo/not_done`，不把单人参与伪造成共同完成。
- 预计结束 48 小时后仍有未确认，自动 `closed/unconfirmed`，保留已填结果，并支持事后补记。
- 拒绝、过期、撤回、取消分别保存 `declined/expired/withdrawn/cancelled`，与真实未完成区别。
- 待结果确认不占未来 7 日三个待执行名额；未回复不等于没做。

## 待上线：提前完成与独立结果确认

- 原有「已约定」卡片仅在约定开始后显示「做到了 / 做了一点 / 今天没做」，导致实际提前完成时无法记录。新版本在尚未开始的 `agreed` 卡片显示「我提前做完了」，经过确认后仅写入当前 actor 的 `done` 事实；其他结果仍需等开始时间，不伪造对方进度。
- 单人提前完成后保留 `agreed`，只取消该 actor 未发送的开始前/启动提醒；另一方的开始提醒仍然有效。到预计结束时间，现有 sweep 仅为尚未记录结果的一方创建结果与次日跟进提醒。
- 两人都提前记录 `done` 才会关单并取消剩余待发送提醒，最终 outcome 仍为 `joint_done`。早期单人记录不再提前生成“结束确认”提醒。保留每人只可提交一次结果、可信身份、版本防冲突及 lifecycle 去重。
- 实现为 forward migration `20261106130000_together_early_result_lifecycle.sql` 加 Web UI，**尚未经 Production migration 或部署授权**，上线前不可当成当前线上能力。

## 数据、幂等与提醒

- `life_proposals` 保存当前协商/执行状态；`life_proposal_events` 保存 actor 与 system 事件。
- 请求 `request_id` 去重；`version` 防并发覆盖；事务级 couple-space advisory lock 串行配额校验。
- 新 `proposal` Stateful Reminder Source 写入现有 `life_reminder_instances`；投递沿用 `life_notification_deliveries` 和现有 PushPlus 微信端通道，不新增一套消息发送器。
- 新邀请、回应、改期即时提醒；已约定前 15 分钟；自愿选择「拉我一把」时开始提醒；预计结束与 24 小时未记录提醒。
- 状态变化取消旧的未投递提醒；撤回/取消告知另一方；超时补充提醒不会与即时提醒同时重复发送。通知只包含通用文案，不向微信泄露自由备注。
- `private.sweep_life_proposals` 定时推进过期、待结果与自动收尾；投递仍由统一提醒 dispatcher 负责。
- 微信测试号优先是当前 mailbox 的路由，不代表 proposal 已接入该微信测试号。

## AI/MCP 边界

保留 life_capabilities / life_query / life_mutate 三个稳定工具，新增 proposal 业务资源，使用原 OAuth life:read / life:write。共享只读；写入经服务端可信 actor → AI normalizer → canonical list/mutate service → 受限 RPC，继承配额、版本、防重试及团子提醒。必须先可靠查询 ID/version，不替 Ta 回应/确认；时间必须明确，不自动写入 Life activity 或 Legacy Game。

## 待发布提醒文案优化

代码迁移 `20261106110000_daily_recap_proposal_notifications.sql` 为现有 proposal Stateful Reminder Source 补充团子亲昵称呼、经 HTML 转义的约定标题以及北京时间。保留 invite/counter/accept/decline/取消/开始前/结束结果等原有事件触发、时间与投递去重契约，不额外曝光自由备注。正式上线状态以 Production Supabase runtime 与 migration ledger 为准；未经授权应用 migration 前，线上仍使用原先文本。

## 待发布：在通知里展示邀约内容

一起做吧的 PushPlus 通知包含当前约定的名称、北京时间、持续分钟数、可选备注摘要（截取 220 字符后 HTML 转义；其余在登录后页面查看），不再仅提示有一条邀约。自由备注属于共享记录的内容，经用户要求纳入微信推送，通知接收端可能显示在锁屏或通知预览中；避免在备注中填写不适合外露的信息。

通知仍遵守 original source/recipient/trigger/delivery dedupe，已送达的历史消息不会追溯重发。本次变更见 `20261106120000_tuanzi_site_footer_proposal_details.sql`，上线状态以 Production Supabase migration ledger 为准。

## V1 限制与验收

V1 不接入积分或复杂循环任务；MCP 文本查询和操作由独立 AI registry 增量接入。未来 B 版可以基于事件历史推导成长统计，不重写事实。

真实 Cat/Fish 双账号权限、并发配额、48 小时自动收尾、重试/去重、PushPlus 收发、移动端 UI 与备份/恢复要在授权的 runtime 中逐项验收。开发分支的 SQL 已使 Life 全量导出、快照、导入与恢复覆盖 `life_proposals` 和 `life_proposal_events`；旧备份缺少这两个字段时保留现有提案，不误删新记录。SQL 已于 2026-11-06 执行，但尚未实测新备份恢复；这不代表其他领域（例如 wishes 和图片）已被自动纳入备份。
