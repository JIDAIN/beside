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

## AI 最小阅读路径

```text
先读 overview
→ 再读本次任务对应的专项文档
→ 再核真实源码
→ 涉及当前 runtime 时再核 Production
```

| 任务 | 专项文档 |
|---|---|
| 表 / 字段 / constraint / RPC | `data-model.md` |
| API / OAuth / cache / sync | `api-and-sync.md` |
| Cat/Fish 身份、owner/shared 权限 | `auth-and-identity.md` |
| Life / Legacy Game 隔离 | `life-legacy-boundary.md` |
| AI / MCP | `ai/README.md` |
| 为什么长期采用某方案 | `decisions/README.md` |

## 修改时同步检查

- 跨领域数据流变化 → `overview.md`；
- schema / constraint / RPC 变化 → `data-model.md` + migration；
- transport / cache / OAuth 变化 → `api-and-sync.md`；
- 身份或权限语义变化 → `auth-and-identity.md`；
- 长期架构取舍变化 → 新 ADR 或 supersede 旧 ADR；
- 业务细节不要在 Architecture 重复维护，链接到 Domain。
