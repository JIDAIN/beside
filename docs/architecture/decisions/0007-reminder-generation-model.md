# ADR-0007 Reminder Generation Model

- Status: Accepted
- Date: 2026-09-22

## Context

ADR-0004 正确确立了 Reminder Engine 与最终 Provider 解耦，但早期表述默认所有提醒都会进入 rule/instance。

当前 Production 已存在 daily completeness 这一类没有长期 instance 生命周期的提醒。如果为了形式统一强行创建 instance，会把“某时刻条件成立时轻量提醒”误建模成可 complete/snooze 的长期任务。

## Decision

Reminder Generation 明确分为两类：

~~~text
Stateful Reminder
→ rule / instance
→ Notification Delivery
→ Provider

Condition Nudge
→ runtime condition
→ direct delivery claim
→ Notification Delivery
→ Provider
~~~

Stateful Reminder 用于 custom、medicine、anniversary、mailbox 等需要长期用户状态的来源。

Condition Nudge 用于 daily completeness 这类运行时条件检查，不制造虚假的 reminder instance。

Notification Delivery 仍是共享投递层；Provider Routing 仍与 generation 解耦。

## Consequences

- 新 source 必须先明确选择 Stateful 或 Condition Nudge；
- Stateful source 复用 instance lifecycle / snooze / completion；
- Condition Nudge 复用 delivery/dedupe/provider，但不伪造任务状态；
- Provider 可以扩展而不重写 generation；
- Operations 排障必须先判断是哪一种 generation path。

## Relationship

本 ADR refine ADR-0004，不 supersede “Reminder Engine / Provider separation”。

Current behavior 见 docs/domains/reminders.md。
