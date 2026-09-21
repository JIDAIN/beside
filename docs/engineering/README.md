# Engineering MOC

本区域回答：**现在运行到哪里，以及怎样安全开发、测试、配置、部署和排障。**

## 文档

- [Current State](current-state.md)：Production Web、GitHub main、Supabase runtime 当前状态与已知验证边界。
- [Development & Testing](development-testing.md)：开发流程、测试体系和提交前检查。
- [Configuration](configuration.md)：环境变量、外部配置与 secret 边界。
- [Deployment & Security](deployment-security.md)：Vercel / Supabase 发布与安全规则。
- [Operations Runbook](operations-runbook.md)：Production 故障、恢复、migration 和运行排障。

数据库 migration 的专项维护说明：
→ [supabase/README.md](../../supabase/README.md)

## 注意

这里的 `current-state.md` 是工程运行状态，不是未来产品 Roadmap。未来产品设计不在 GitHub 工程事实库维护。

## AI 最小阅读路径

| 任务 | 先读 |
|---|---|
| 判断 main / Production / Supabase 现在分别是什么 | `current-state.md` |
| 开发、测试、文档同步流程 | `development-testing.md` |
| 环境变量 / secret | `configuration.md` |
| 发布权限、安全、Vercel / Supabase 变更纪律 | `deployment-security.md` |
| 已上线故障、恢复、migration 排查 | `operations-runbook.md` |

涉及数据库 migration 时再读 `supabase/README.md`；涉及业务规则时回到对应 Domain，不从 Runbook 反推业务 contract。

## 修改时同步检查

- Current State 只记录“现在运行到哪”，不承载产品 Roadmap；
- Runbook 只保留可复用排障流程，不堆一次性事故流水；
- 配置语义变化必须同步 Configuration；
- 发布政策变化必须同步 Deployment & Security，长期取舍需要 ADR。
