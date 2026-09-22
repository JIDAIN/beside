# ADR-0008 Starlit Nook 与 Beside 共享基础设施但保持独立 Domain

- Status: Accepted
- Date: 2026-09-22

## Context

Starlit Nook（隅星 / 星星角）与 Beside 的产品目的不同：

~~~text
Beside
→ 管理正在发生的生活

Starlit Nook
→ 展示已经留下来的共同回忆
~~~

但两者当前都服务于同一个 Fish / Cat couple space，并且 Beside 已经拥有稳定的：

- fixed Cat / Fish identity；
- signed Web session；
- OAuth 2.0 + PKCE；
- MCP transport；
- trusted actor boundary；
- canonical service pattern；
- Supabase project；
- Vercel runtime；
- migration / RLS 规则。

如果为了产品独立而立即新建 repo、账号体系、OAuth、数据库和 MCP，会复制大量基础设施。

反过来，如果把 Starlit Nook 直接塞进 Life Domain，又会造成产品边界和业务 contract 混淆。

## Decision

第一版采用：

~~~text
同一个 JIDAIN/beside repo
同一个 Next.js / Vercel 基础
同一个 Cat/Fish identity
同一个 couple_space
同一个 Supabase project
同一个 OAuth / MCP transport foundation

但：

Life / Beside Domain
≠
Starlit Nook Domain
~~~

Starlit Nook 保持独立 Domain 边界。

当前已经独立：
- lib/starlit-nook/*
- canonical service / Repository interface
- Domain docs / tests

后续真正实现 persistence / transport / UI 时，也应保持独立：
- starlit_nook_* 数据表；
- Web API family；
- MCP tool surface；
- UI route。

Starlit Nook 不进入 life_query / life_mutate，也不把业务字段塞进 Life 表。

## Consequences

优点：

- 不复制身份、OAuth、MCP、安全和部署基础设施；
- Fish / Cat identity 与 couple_space 保持一致；
- Starlit Nook 可以快速进入开发；
- 产品边界、数据模型和 AI surface 仍独立；
- 以后若独立部署，可以从清楚的 Domain boundary 拆出。

约束：

- 共享 repo 不代表两个产品可以互相直接改表；
- Starlit Nook 不得依赖 Life UI state 作为事实源；
- Beside 数据若进入 Starlit Nook 展示，必须经过明确引用 / promotion contract；
- Starlit Nook 的 schema / API / MCP 变化必须维护自己的 Domain 文档和 tests；
- 物理拆分只有真实运维 / 规模需求出现后再做。

## Out of Scope

本 ADR 不决定：

- Starlit Nook 具体 UI；
- 10 张表的最终 SQL；
- R2 provider 细节；
- 回忆整理程序；
- 独立域名 / 独立 Vercel Project 的未来时机。

## Related

- docs/domains/starlit-nook/README.md
- docs/architecture/overview.md
- docs/architecture/auth-and-identity.md
- docs/architecture/ai/architecture.md
- ADR-0001
- ADR-0002
- ADR-0003
