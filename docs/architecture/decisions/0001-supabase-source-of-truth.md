# ADR-0001 Supabase 作为正式生活数据 Source of Truth

- Status: Accepted
- Date: 2026-09-07

## Context

项目同时存在浏览器缓存、Service Worker、Legacy Game 本地状态、Next.js API、Supabase 数据库与 Storage。如果多个位置都被当作“真实数据”，页面刷新、AI 写入、跨设备同步和恢复都会产生冲突。

## Decision

Island Life 的正式事实数据以 Supabase 为唯一 Source of Truth：

```text
Browser / AI / MCP
→ Next.js server / canonical service
→ Supabase PostgreSQL + Private Storage
```

localStorage、Service Worker 和 stale cache 只能作为可重建读模型或 Legacy Game 兼容缓存，不能成为权限或正式事实来源。

## Consequences

优点：

- Web、AI、MCP 看到同一套正式数据；
- 跨设备一致性有明确归属；
- 备份、恢复、权限与 migration 都有统一对象；
- 缓存可以大胆重建，不需要与正式事实双向合并。

代价 / 约束：

- 离线写入不能擅自成为正式事实；
- cache 必须有失效和后台校验机制；
- Supabase schema / RPC 变化必须通过 migration 管理；
- 任何 import / restore 都必须尊重数据域边界。

## Related

- `docs/02-architecture.md`
- `docs/03-data-model.md`
- `docs/04-api-and-sync.md`
- `docs/48-life-legacy-game-data-boundary.md`
