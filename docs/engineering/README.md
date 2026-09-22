# Engineering MOC

本区域回答：怎样安全开发、测试、配置、部署、排障，以及 Production/main/Supabase 当前运行到哪里。

## 文档

- [Current State](current-state.md)：Production Web、GitHub main、Supabase runtime 当前差异与未完成验证。
- [Development & Testing](development-testing.md)：标准变更流程、change recipe、测试与文档同步。
- [Configuration](configuration.md)：环境变量、Vault/DB-managed secrets 与轮换影响。
- [Deployment & Security](deployment-security.md)：发布授权、安全基线、Vercel/Supabase 变更纪律。
- [Operations Runbook](operations-runbook.md)：Production 故障、恢复、migration/ledger/replay 排查。

## 最小阅读路径

| 任务 | 先读 |
|---|---|
| 判断线上/主干/数据库现在分别是什么 | [Current State](current-state.md) |
| 开发/测试/文档更新 | [Development & Testing](development-testing.md) |
| env / secret | [Configuration](configuration.md) |
| 部署与 Production 写操作 | [Deployment & Security](deployment-security.md) |
| 故障/恢复/migration | [Operations Runbook](operations-runbook.md) |

业务规则必须回到 [Product](../product/README.md) / [Domains](../domains/README.md) / [Architecture](../architecture/README.md)，不从 Runbook 反推 contract。

## 维护原则

- Current State 保持短、动态；
- Development & Testing 是“改什么 → 读什么/测什么”的总路由；
- Configuration 只写变量名/用途/安全，不写真实 secret；
- Deployment & Security 维护授权与长期安全 invariant；
- Operations 维护可复用排障，不堆一次事故流水。