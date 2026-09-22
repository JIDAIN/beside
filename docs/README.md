# Beside Docs

GitHub docs 是伴岛 / Beside 的 **current engineering fact base**。

## Obsidian「伴岛」与 GitHub docs 的关系

两者不是两套平行维护的 current 文档，而是开发生命周期中的两个层次：

~~~text
Obsidian「伴岛」
= 需求 / 设计探索 / 方案讨论 / 尚未实现的模块 / UI 草图 / 开发前决策

JIDAIN/beside docs
= 已经实现并经过代码或 runtime 核验的 current capability / contract / architecture / engineering fact
~~~

标准流转：

~~~text
想法 / 设计 / 讨论
→ Obsidian
→ 形成可执行方案
→ 以 GitHub current docs + current code/runtime 为开发基线
→ 实现 + 验证
→ 同批更新对应 GitHub canonical docs
→ Obsidian 保留方案/过程/项目记录，但不继续维护第二份 current contract
~~~

因此：
- Obsidian 中尚未实现的设计 **不能提前写成 GitHub current fact**；
- 已经实现的行为以 GitHub current docs + current code/runtime 为准，Obsidian 不覆盖它；
- 开发一个 Obsidian 方案时，先读取 GitHub current 基线，再把 Obsidian 作为“目标变化”，不能把旧方案当成当前程序现状；
- GitHub History 记录与仓库实现直接相关的产品/工程演变；Obsidian 可以保留更广的讨论、设计和项目过程；
- GitHub canonical docs 中已经有稳定事实后，Obsidian 原则上只链接/引用，不复制长期维护同一份 schema、lifecycle、permission 或 runtime 参数。
- 同一 repo 中的独立 Domain 也遵守同样规则：例如 Starlit Nook 的未实现目标设计维护在 Obsidian `13_Projects/隅星`，GitHub 只记录已经进入 main 的 foundation / contract 与已实现事实。

## 1. Document Map

| Area | 回答什么 |
|---|---|
| [Product](product/README.md) | 用户现在能做什么、当前入口、稳定交互、UI system |
| [Architecture](architecture/README.md) | 系统怎样连接、数据/API/Auth/AI 边界 |
| [Domains](domains/README.md) | 复杂业务 contract，以及 simple Domain 导航 |
| [Engineering](engineering/README.md) | 怎么开发、测试、配置、部署、排障、恢复 |
| [History](history/README.md) | 产品如何演变、过去怎样实现/验收 |

ADR 位于 [Architecture / decisions](architecture/decisions/README.md)。

## 2. Start Here

AI / 开发者开始任务：

~~~text
README.md
→ AGENTS.md
→ docs/README.md
→ docs/engineering/current-state.md
→ task MOC
→ canonical contract
→ current implementation anchors
→ code/runtime
~~~

任务路由：
- 页面/产品/UI → [Product MOC](product/README.md)
- 架构/数据/API/Auth → [Architecture MOC](architecture/README.md)
- AI/MCP → [AI MOC](architecture/ai/README.md)
- Meal/Reminder/Legacy/业务域 → [Domains MOC](domains/README.md)
- 开发/测试/config/deploy/operations → [Engineering MOC](engineering/README.md)
- 开发完成后的文档收口 → [Documentation Maintenance Guide](engineering/documentation-maintenance.md)
- 历史原因/旧验收 → [History MOC](history/README.md)

## 3. Canonical Fact Rules

一个可独立变化的事实只设一个 canonical owner。

允许 MOC/索引重复：
- 名称；
- 一句话职责；
- 链接；
- current path pointer；
- task routing。

禁止在多个 current docs 复制：
- enum / constraint；
- permission matrix；
- lifecycle；
- provider routing；
- cache runtime 参数；
- Production snapshot；
- business threshold。

## 4. Fact Source Selection

不要把 Production、GitHub main、Supabase runtime 排成一条对所有问题都适用的线性优先级。先判断正在回答哪一种事实：

| 问题 | 首要事实源 |
|---|---|
| 线上用户此刻实际看到/运行什么 | deployed Production Web + 对应 runtime |
| 下一步开发基于什么实现 | current GitHub main code |
| 数据库当前 schema / function / cron | Production Supabase runtime；再核 repo migration/ledger |
| 当前产品能力 / Domain contract / Architecture contract | current canonical docs + current main；必要时核 runtime |
| main 与 Production 是否一致 | [Current State](engineering/current-state.md) + deployment/runtime |
| 为什么长期这样设计 | Accepted ADR |
| 以前怎样实现/验收 | History |

如果 current canonical docs 与当前 main/runtime 冲突，说明 docs 需要修正；但也不能因为 Production Web 暂时落后 main，就把“下一步开发基线”错误回退到旧 Production commit。

必须始终区分：
- Production Web；
- GitHub main；
- Supabase runtime / migration ledger。

## 5. Current vs History

History 解释过去，不定义现在。历史文件内部写“current/canonical”只代表当时。

不要从 docs/history、旧 migration 注释或旧聊天直接恢复已退役实现。

## 6. Documentation Update Rule

代码改变事实时，同批只更新真正受影响的 canonical owner。

典型：
- current capability / entry → [Product Overview](product/overview.md)
- stable interaction → [UI Guidelines](product/ui-guidelines.md)
- UI architecture → [Design System](product/design-system.md)
- schema/data → [Data Model](architecture/data-model.md)
- transport/cache → [API & Sync](architecture/api-and-sync.md)
- identity/permission → [Auth & Identity](architecture/auth-and-identity.md)
- business lifecycle → [Domains](domains/README.md)
- engineering workflow/runtime → [Engineering](engineering/README.md)
- architecture rationale → [ADR](architecture/decisions/README.md)
- milestone → [History](history/README.md)

未来产品 Roadmap 不在 GitHub current docs 展开维护。

完整的文档维护 SOP、何时不更新、何时允许新建文档与 closeout checklist 见 [Documentation Maintenance Guide](engineering/documentation-maintenance.md)。