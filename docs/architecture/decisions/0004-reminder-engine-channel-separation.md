# ADR-0004 Reminder Engine 与投递 Provider 解耦

- Status: Accepted
- Date: 2026-09-07

## Context

药箱、纪念日、小信箱、自定义提醒以及未来其他业务都可能产生提醒。如果每个业务模块直接调用 PushPlus，会重复实现调度、收件人、去重、snooze 与投递状态，并把提醒业务与单一渠道锁死。

## Decision

Reminder 的业务编排与最终 Provider 分层：

~~~text
Reminder generation / user state
→ Notification Delivery
→ Provider
~~~

Reminder 层决定谁应收到、何时到期、用户状态以及 dedupe 语义；Provider 只负责最终渠道投递，不定义业务提醒语义。

当时主要实现使用 rule / instance → delivery → PushPlus，这一结构继续适用于 Stateful Reminder。

## Consequences

优点：
- 新提醒来源复用统一状态/投递能力；
- Cat/Fish 可以独立接收；
- 网络重试与用户主动 snooze 可区分；
- 可以增加其他渠道而不重写业务模块。

约束：
- 业务模块不应直接自行发送 Provider；
- 用户 reminder state 与 delivery state 分离；
- 调度粒度决定实际提醒精度；
- 排障要按 generation/state → scheduler → delivery → provider 分层。

## Current Refinement

Production 后续加入了不需要长期 reminder instance 的 daily completeness 条件提醒。

因此“所有提醒都必须进入 rule/instance”不再是通用 current model；Reminder Generation 现分为 Stateful Reminder 与 Condition Nudge。

这一细化由 ADR-0007 记录。它 refine 本 ADR，但不否定 Reminder/Provider separation。

## Related

- ../data-model.md
- ../../domains/reminders.md
- ../../engineering/operations-runbook.md
- 0007-reminder-generation-model.md
