# ADR-0004 Reminder Engine 与 PushPlus 投递通道解耦

- Status: Accepted
- Date: 2026-09-07

## Context

药箱、纪念日、小信箱、自定义提醒以及未来生理期/预约等都可能产生提醒。如果每个业务模块直接调用 PushPlus，会重复实现调度、收件人、去重、snooze 和投递状态，并把“提醒业务”与“微信渠道”锁死。

## Decision

所有生活提醒统一进入 Reminder Engine：

```text
业务事件 / reminder rule
→ life_reminder_rules / life_reminder_instances
→ scheduler / pg_cron
→ life_notification_deliveries
→ PushPlus
```

Reminder Engine 决定：

- 谁应该收到；
- 什么时候到期；
- completed / dismissed / snooze；
- 同一业务事件是否已物化；
- 投递 dedupe key。

PushPlus 只负责最终渠道投递，不定义业务提醒语义。

## Consequences

优点：

- 新提醒来源复用同一状态机与调度；
- Cat / Fish 可以保持独立实例和独立微信 token；
- 网络重试和用户主动 snooze 可以被区分；
- 未来可以增加其他通知渠道而不重写业务模块。

代价 / 约束：

- 业务模块不能自行直接发 PushPlus；
- Reminder instance 与 notification delivery 必须分层维护；
- 调度粒度决定提醒精度，当前约 5 分钟不是秒级实时系统；
- 故障排查必须按 instance -> scheduler -> delivery -> channel 分层进行。

## Related

- `docs/03-data-model.md`
- `docs/14-wechat-reminders.md`
- `docs/16-operations-runbook.md`
