# ADR-0008 Starlit Nook 独立应用，共享 Supabase / identity 基础

- Status: Superseded / Updated
- Original Date: 2026-09-22
- Updated: 2026-10-08

## Context

Starlit Nook（隅星 / 星星角）与 Beside 的产品目的不同：

~~~text
Beside
→ 管理正在发生的生活

Starlit Nook
→ 展示已经留下来的共同回忆
~~~

早期为了快速建立 Domain foundation，Starlit Nook 曾暂时放在 `JIDAIN/beside` 同一仓库中。

随着 UI / UX、Timeline、Map、Viewer、Trip 等边界逐渐明确，Starlit Nook 已经具备独立产品、独立部署与独立迭代周期，不应继续与 Beside 共用同一个 Next.js 应用仓库。

## Decision

正式目标架构调整为：

~~~text
JIDAIN/beside
→ Beside 独立应用
→ Beside 独立 Vercel Project
        │
        └──── shared Supabase / Fish-Cat identity / couple_space
        │
JIDAIN/starlit-nook
→ Starlit Nook 独立应用
→ Starlit Nook 独立 Vercel Project
~~~

共享：

- 同一个 Supabase Project；
- Fish / Cat identity 语义；
- `couple_space`；
- RLS / auth / OAuth / MCP 的安全原则与可复用基础 contract。

不共享：

- Git repository；
- Next.js runtime；
- Vercel Project；
- UI component tree；
- Domain source tree；
- Starlit Nook API / MCP Adapter 实现。

原则：

> **共享身份与数据基础设施，不共享应用仓库和部署生命周期。**

## Migration State

当前 `JIDAIN/beside` 仍暂时保留以下迁移源文件，直到 `JIDAIN/starlit-nook` 新仓库成功建立并校验完成：

~~~text
lib/starlit-nook/*
tests/starlit-nook/*
docs/domains/starlit-nook/*
~~~

迁移完成前不得删除这些文件。

迁移完成后：

1. 将 Domain foundation 移入 `JIDAIN/starlit-nook`；
2. 在新仓库建立自己的 docs / tests / app / components；
3. 从 Beside 删除 Starlit Nook source / tests / domain docs；
4. Beside 只保留跨产品边界说明，不保留 Starlit Nook 业务实现。

## Consequences

优点：

- 两个产品可独立部署 / 回滚；
- 隅星 UI / Map / Viewer / Trip 可独立快速迭代；
- Beside UI 重构不会影响隅星；
- 隅星故障不会直接拖垮伴岛 Web runtime；
- 仍保持共享身份和同一 couple space；
- 跨产品引用无需跨数据库复制身份体系。

约束：

- 两个应用不能互相直接改对方业务表；
- 跨产品读写必须走明确 contract；
- Starlit Nook schema 仍使用 `starlit_nook_*` 命名；
- Supabase 权限必须识别同一 Fish / Cat identity；
- Vercel 环境变量分别管理；
- Production migration / deploy 仍需明确授权。

## Out of Scope

本 ADR 不决定：

- Starlit Nook 最终 UI 视觉；
- 10 张表最终 SQL；
- R2 provider 细节；
- 回忆整理程序。

## Related

- Obsidian `13_Projects/隅星/01_系统架构.md`
- Obsidian `13_Projects/隅星/05_开发实施方案.md`
