# Architecture MOC

本区域回答：**伴岛当前系统是怎样组成和连接的。**

## 核心入口

- [Architecture Overview](overview.md)：整体运行架构与主要数据流。
- [Data Model](data-model.md)：Supabase Source of Truth、表与数据域。
- [API and Sync](api-and-sync.md)：API、缓存、同步、Web session 与 MCP OAuth。
- [Auth and Identity](auth-and-identity.md)：固定 Cat/Fish 身份与权限矩阵。
- [Life / Legacy Boundary](life-legacy-boundary.md)：Island Life 与 Legacy Game 的强制数据边界。
- [AI MOC](ai/README.md)：AI Access Core / MCP / natural language。
- [Architecture Decisions](decisions/README.md)：长期 ADR。

## 阅读原则

Architecture 描述跨领域机制；具体业务规则下沉到 [Domains](../domains/README.md)。

例如：
- “Reminder Engine 怎么接 pg_cron / provider”属于 Reminder domain；
- “Supabase 是 Source of Truth”属于 Architecture；
- “21:00 哪些项目算完整”属于 Reminder domain；
- “Production 怎么排障”属于 Engineering。
