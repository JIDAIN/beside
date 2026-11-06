# Together / 一起做吧 Domain

> 本文对应开发分支的 V1 代码设计与实现；尚未部署 Production，Supabase migration 尚未应用。

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

## 数据、幂等与提醒

- `life_proposals` 保存当前协商/执行状态；`life_proposal_events` 保存 actor 与 system 事件。
- 请求 `request_id` 去重；`version` 防并发覆盖；事务级 couple-space advisory lock 串行配额校验。
- 新 `proposal` Stateful Reminder Source 写入现有 `life_reminder_instances`；投递沿用 `life_notification_deliveries` 和现有 PushPlus 微信端通道，不新增一套消息发送器。
- 新邀请、回应、改期即时提醒；已约定前 15 分钟；自愿选择「拉我一把」时开始提醒；预计结束与 24 小时未记录提醒。
- 状态变化取消旧的未投递提醒；撤回/取消告知另一方；超时补充提醒不会与即时提醒同时重复发送。通知只包含通用文案，不向微信泄露自由备注。
- `private.sweep_life_proposals` 定时推进过期、待结果与自动收尾；投递仍由统一提醒 dispatcher 负责。
- 微信测试号优先是当前 mailbox 的路由，不代表 proposal 已接入该微信测试号。

## V1 限制与验收

V1 不接入 AI/MCP CRUD、积分或复杂循环任务。未来 B 版可以基于事件历史推导成长统计，不重写事实。

真实 Cat/Fish 双账号权限、并发配额、48 小时自动收尾、重试/去重、PushPlus 收发、移动端 UI 与备份/恢复要在授权的 runtime 中逐项验收。开发分支的 SQL 已使 Life 全量导出、快照、导入与恢复覆盖 `life_proposals` 和 `life_proposal_events`；旧备份缺少这两个字段时保留现有提案，不误删新记录。还未在真实数据库执行/验证；这不代表其他领域（例如 wishes 和图片）已被自动纳入备份。
