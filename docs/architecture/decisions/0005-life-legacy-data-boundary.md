# ADR-0005 Island Life 与 Legacy Game 数据域隔离

- Status: Accepted
- Date: 2026-09-07

## Context

当前产品同时保留新的 Island Life 生活记录系统和旧“变瘦变美大作战”游戏。两者物理上共用一个 Supabase project，也都包含日期、体重、活动等相近概念，但业务含义不同。

如果仅按“同一天”“同一个人”把两套数据互相覆盖，会导致真实生活事实与游戏结算事实混淆，并让导入、恢复、清理操作具有破坏性。

## Decision

明确维持三个边界：

```text
Island Life facts
Legacy Game facts
Shared / System infrastructure
```

特别保持：

```text
meal intake ≠ game deficit
weight_measurements ≠ legacy weight snapshot
activity_entries ≠ daily_record_sides.exercise_minutes
Life maintenance ≠ Legacy Game maintenance
```

普通 Life import / export / backup / restore / test cleanup 只能操作明确的 Life allowlist 和共享配置，除非用户明确要求操作 Legacy Game。

## Consequences

优点：

- 真实生活记录不会因为游戏规则变化被重写；
- Legacy Game 可以继续稳定保留；
- 数据恢复和测试清理可以建立安全 allowlist；
- 同日期展示仍可关联，但不会自动互相改值。

代价 / 约束：

- 某些相近数据会同时存在于两个 domain；
- 未来若要建立自动映射，必须作为新业务规则显式设计；
- 数据维护脚本不能使用“所有最近数据”这类跨域粗筛选。

## Related

- `docs/03-data-model.md`
- `docs/05-business-rules.md`
- `docs/16-operations-runbook.md`
- `docs/48-life-legacy-game-data-boundary.md`
- `lib/server/life-data-domains.ts`
