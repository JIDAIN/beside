# ADR-0003 Web / MCP / AI 共用 Canonical Services 与 AI Access Core

- Status: Accepted
- Date: 2026-09-07

## Context

项目同时存在网页手动操作、Harbor ChatGPT Project、MCP client 和程序内置 AI。如果每个入口各自实现一套业务字段、权限、SQL 或写入规则，会快速产生行为不一致和安全漏洞。

历史上也存在 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge transport，但 direct MCP 已经成为正式路径。

## Decision

所有正式生活数据能力围绕 canonical domain services 建立，AI 入口统一通过 AI Access Core 暴露受限能力：

```text
Web API -------------------┐
MCP -> life_query/mutate --┼-> canonical services -> Supabase
内置 AI -------------------┘
```

稳定 AI 工具保持：

```text
life_capabilities
life_query
life_mutate
```

自然语言 normalization、permission、idempotency、media boundary 等基础规则由共享层实现，不为每个 AI client 重复实现。

旧 Drive Bridge / Harbor Sheet / Fast Wake transport 不进入当前主链路。

## Consequences

优点：

- 新增生活 domain 时只扩展一次业务能力；
- Web 与 AI 不会形成两套数据库语义；
- 权限和幂等可以在服务端统一强制；
- MCP client 更换不会要求重写核心业务。

代价 / 约束：

- API route / adapter 必须保持薄层，不能偷偷复制业务规则；
- AI 不能获得任意 SQL；
- 自然语言便利性不能覆盖 canonical schema 与权限；
- transport 退役后必须及时从当前文档移除，只留历史记录。

## Related

- `docs/02-architecture.md`
- `docs/04-api-and-sync.md`
- `docs/11-ai-write-architecture.md`
- `docs/26-ai-access-core-principles.md`
- `docs/28-ai-natural-language-contract.md`
