# 项目文档索引

`docs/` 顶层只保存**当前有效、需要持续维护**的项目文档。历史实现、阶段验收和迁移过程统一放入 [`archive/`](archive/README.md)，不再与当前事实文档混在一起。

目标是让第一次接手的人不用翻历史对话，就能回答：产品是什么、代码怎么工作、数据在哪里、业务规则是什么、AI 如何接入、如何部署与排障、现在做到哪一步，以及关键架构为什么这样设计。

## 建议阅读顺序

| 文档 | 回答的问题 |
|---|---|
| [`01-product.md`](01-product.md) | 产品给谁用、有哪些主要模块和用户流程？ |
| [`02-architecture.md`](02-architecture.md) | 浏览器、MCP、AI Access Core、API 与 Supabase 如何连接？ |
| [`03-data-model.md`](03-data-model.md) | 哪些是事实数据，各生活域如何建模和隔离？ |
| [`04-api-and-sync.md`](04-api-and-sync.md) | 当前 API、Web session、MCP OAuth、缓存和同步如何工作？ |
| [`05-business-rules.md`](05-business-rules.md) | Legacy Game 与生活系统的核心业务规则是什么？ |
| [`06-ui-guidelines.md`](06-ui-guidelines.md) | 当前页面与组件维护约束是什么？ |
| [`07-development-testing.md`](07-development-testing.md) | 新功能放哪里、测试体系是什么、什么时候更新文档？ |
| [`08-deployment-security.md`](08-deployment-security.md) | Vercel / Supabase 如何部署，身份、密钥和隐私如何保护？ |
| [`15-configuration-reference.md`](15-configuration-reference.md) | 当前运行需要哪些环境变量与外部配置？ |
| [`16-operations-runbook.md`](16-operations-runbook.md) | Production 出问题时如何排障、恢复和验证？ |
| [`09-status-roadmap.md`](09-status-roadmap.md) | Production 当前状态、已知边界和下一步是什么？ |
| [`10-v2-life-redesign.md`](10-v2-life-redesign.md) | 为什么生活系统是主产品、旧游戏如何保留？ |
| [`11-ai-write-architecture.md`](11-ai-write-architecture.md) | AI 如何统一、安全地查询和写入生活数据？ |
| [`12-island-life-design-system.md`](12-island-life-design-system.md) | V2 可见 UI 的主视觉规范是什么？ |

## 当前专项文档

| 文档 | 主题 |
|---|---|
| [`13-meal-photo-storage.md`](13-meal-photo-storage.md) | 当前餐食照片 Storage、压缩、附件与单图持久化边界 |
| [`14-wechat-reminders.md`](14-wechat-reminders.md) | Reminder Center、Supabase 调度与 PushPlus 微信提醒 |
| [`17-auth-and-pairing.md`](17-auth-and-pairing.md) | 固定 Cat / Fish 登录、Web session、MCP OAuth 与权限矩阵 |
| [`26-ai-access-core-principles.md`](26-ai-access-core-principles.md) | AI Access Core 长期架构原则 |
| [`28-ai-natural-language-contract.md`](28-ai-natural-language-contract.md) | 自然语言 normalization / clarification contract |
| [`44-meal-draft-before-after-contract.md`](44-meal-draft-before-after-contract.md) | 新 meal 的草稿确认与餐前/餐后差分 |
| [`46-harbor-mcp-project-instructions.md`](46-harbor-mcp-project-instructions.md) | Harbor Cat / Fish 当前 MCP Project Instructions |
| [`47-harbor-instructions-maintenance.md`](47-harbor-instructions-maintenance.md) | Project Instructions 的维护规则 |
| [`48-life-legacy-game-data-boundary.md`](48-life-legacy-game-data-boundary.md) | Island Life 与旧版“变瘦变美大作战”游戏子项目的数据隔离与维护边界 |

## 架构决策 ADR

长期架构决策统一放在 [`adr/`](adr/README.md)。

ADR 回答“**为什么这样设计**”，主文档回答“**现在系统是什么样**”。只有会长期影响 Source of Truth、身份权限、系统边界、基础设施或部署方式的决定才新增 ADR。

当前基线包括：

```text
ADR-0001 Supabase Source of Truth
ADR-0002 固定 Cat/Fish 双身份
ADR-0003 Web/MCP/AI 共用 AI Access Core / canonical services
ADR-0004 Reminder Engine 与 PushPlus 解耦
ADR-0005 Island Life / Legacy Game 数据域隔离
ADR-0006 Production 自动部署关闭、逐次授权
```

## 文档事实优先级

资料冲突时按以下顺序确认：

1. 已验证的 Production 行为 / Supabase 当前 schema；
2. 当前 `main` 代码；
3. `docs/` 顶层当前主文档；
4. `docs/adr/` 中当前 Accepted 的设计理由；
5. [`docs/archive/`](archive/README.md)；
6. Git 历史和旧聊天记录。

ADR 解释设计理由，但不能反向覆盖当前 Production 事实。如果当前代码与 Accepted ADR 已经发生长期方向变化，应新增 ADR supersede 旧决定。

尚未部署的代码或 migration 必须明确写成“待部署 / 待执行”，不能冒充 Production 已上线。

## 文档维护原则

### 1. 一个主题只有一个当前事实入口

- 一个主题只保留一个主文档；
- 多个专项文档可以补充不同 contract，但不能复制并各自维护同一事实；
- 发现冲突时先以代码 / Production 核验，再收敛文档。

### 2. 顶层按领域，不按开发轮次

长期文档优先使用：

```text
architecture
data-model
configuration
operations
meal-photo
reminders
auth
```

而不是长期堆积：

```text
R8
R10.2
R11.5
某次上线验收
```

带版本号 / 阶段号的一次性实施记录在稳定结论吸收到主文档后进入 `archive/`。R11.5 饮食营养与照片显示实施记录已经按此规则归档。

### 3. 变化发生时同步更新对应主文档

- API / transport / auth 改变 -> `04-api-and-sync.md`；
- schema / 数据边界改变 -> `03-data-model.md`；
- 环境变量改变 -> `15-configuration-reference.md`；
- Production 排障 / 恢复流程形成可复用经验 -> `16-operations-runbook.md`；
- 长期架构取舍改变 -> 新增或 supersede ADR；
- 当前上线状态改变 -> `09-status-roadmap.md`；
- `CHANGELOG.md` 只记录“发生了什么”。

### 4. 不让历史反向污染当前事实

- `docs/` 顶层不放一次性部署记录、阶段验收报告、临时调研或已经完成的 migration checklist；
- 历史文档不得因为名字更详细而覆盖当前主文档；
- 退役的 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge 只保留在 archive / migration / Git 历史，不写回当前架构。

## 根目录工程入口

- `README.md`：项目快速入口；
- `AGENTS.md`：AI / 自动化开发工具的工程规则；
- `CLAUDE.md`：Claude Code 薄入口；
- `CHANGELOG.md`：里程碑事实记录；
- `.codex/skills/couple-better-game-maintainer/SKILL.md`：Codex 持续维护 Skill。
