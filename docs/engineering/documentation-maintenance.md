# Documentation Maintenance Guide

本文是伴岛 / Beside 的文档维护操作手册。

它不重新定义 Product、Architecture、Domain、schema、permission 或 runtime fact；它只回答：

> 每次需求、开发、重构、部署或架构变化之后，怎样判断哪些文档需要更新，怎样避免重新产生第二份事实源。

## 1. Documentation Lifecycle

伴岛使用两层文档体系：

~~~text
Obsidian「伴岛」
= 需求 / 想法 / 设计探索 / 尚未实现方案 / 开发前决策 / 项目过程

JIDAIN/beside/docs
= 已经实现并通过代码或 runtime 核验的 current engineering fact
~~~

标准流转：

~~~text
需求 / 设计
→ Obsidian
→ 形成可执行方案
→ 读取 GitHub current docs + current main/runtime 建立现状基线
→ 实现
→ 测试 / runtime 核验
→ 更新受影响的 GitHub canonical docs
→ 必要时 ADR / History
→ Obsidian 保留方案、过程与复盘，并引用最终实现
~~~

关键规则：

- Obsidian 中未实现的设计不能提前写成 GitHub current fact；
- GitHub canonical docs 已经维护的 current contract，不在 Obsidian 再长期复制一份；
- 开发 Obsidian 方案时，Obsidian 是 target change，不是 current implementation source；
- 如果 Obsidian 与当前程序事实冲突，current fact 以 GitHub current docs + current code / 已核验 runtime 为准；
- GitHub History 只保存与仓库/产品实施直接相关的历史；Obsidian 可以保存更完整的设计讨论和项目过程。

## 2. First Decide: Did a Current Fact Change?

开发结束后先问：

~~~text
用户现在能做的事情变了吗？
稳定交互变了吗？
UI system / shared component strategy 变了吗？
数据模型或 constraint 变了吗？
API / cache / transport 变了吗？
ownership / permission 变了吗？
Domain lifecycle 变了吗？
AI capability / normalization 变了吗？
Reminder generation / provider 变了吗？
配置 / 部署 / 运维方式变了吗？
Production/main/runtime 差异变了吗？
长期架构选择变了吗？
是否产生值得长期保留的历史里程碑？
~~~

如果答案都是否，通常不需要为了形式修改大量文档。

## 3. Change → Canonical Document Router

| 发生变化 | Canonical owner |
|---|---|
| 新增 / 删除用户能力 | [Product Overview](../product/overview.md) |
| 功能移动页面 / 当前入口变化 | [Product Overview](../product/overview.md) |
| 稳定交互行为变化 | [UI Guidelines](../product/ui-guidelines.md) |
| token / shared UI layer / component ownership | [Design System](../product/design-system.md) |
| 跨领域系统 flow / layer | [Architecture Overview](../architecture/overview.md) |
| table / field / enum / constraint / index / fact-derived | [Data Model](../architecture/data-model.md) |
| API family / route / transport / cache / revalidation | [API & Sync](../architecture/api-and-sync.md) |
| actor / ownership / permission | [Auth & Identity](../architecture/auth-and-identity.md) |
| AI tool surface / registry / dispatch | [AI Architecture](../architecture/ai/architecture.md) |
| alias / default / clarification / target resolution | [Natural Language](../architecture/ai/natural-language.md) |
| ChatGPT Project client policy | [Project Instructions](../architecture/ai/project-instructions.md) |
| Meal lifecycle | [Meal Lifecycle](../domains/meal/lifecycle.md) |
| Meal formal media | [Meal Photo Storage](../domains/meal/photo-storage.md) |
| Meal AI conversation/orchestration | [Meal AI Contract](../domains/meal/ai-contract.md) |
| Reminder generation/state/provider | [Reminder Domain](../domains/reminders.md) |
| Legacy Game settlement / currency / wallet | [Legacy Game Domain](../domains/legacy-game.md) |
| env / secret / fallback / consumer | [Configuration](configuration.md) |
| development / regression / migration workflow | [Development & Testing](development-testing.md) |
| deployment authorization / security invariant | [Deployment & Security](deployment-security.md) |
| incident / recovery / migration replay | [Operations Runbook](operations-runbook.md) |
| Production/main/Supabase current difference | [Current State](current-state.md) |
| 长期架构取舍 | [ADR](../architecture/decisions/README.md) |
| 重要产品 / 工程里程碑 | [History](../history/README.md) |

只更新真正改变的 canonical owner，不因为“相关”就把同一事实复制到所有文档。

## 4. When Not to Update a Canonical Contract

以下场景通常不需要改 Product / Domain / Architecture contract：

### Pure implementation refactor

例如：

~~~text
lib/life/*
→ features/life/*
~~~

如果用户能力、data semantics、permission、API contract、Domain lifecycle 都没变：

- 更新 Architecture current implementation map；
- 更新受影响 Domain implementation anchors；
- 跑 regression；
- 不新增 Product rule；
- 不新增 Domain rule；
- 不新增 ADR。

### Pure visual adjustment

单页间距、字体大小、图标位置、颜色微调：

- 通常不改 Product Overview；
- 通常不改 UI Guidelines；
- 只有 token / shared visual system / reusable pattern 改变时才改 Design System。

### Pure test / CI repair

如果业务行为没变：

- 更新 Development & Testing 只在测试结构、命令或流程改变时；
- 不因为测试文件变化修改 Domain contract。

### Future idea only

尚未开发：

- 留在 Obsidian；
- 不写入 GitHub current docs；
- 不把 Roadmap 写成“当前能力”。

### Main changed but not deployed

- current main contract 可以更新；
- 不把 Current State 写成“Production 已上线”；
- 是否已部署由 Current State + Vercel runtime 说明。

## 5. When a New Documentation File Is Justified

新增文档前先走：

~~~text
已有 canonical owner？
→ yes：优先写入已有文件
→ no / 已形成独立长期 contract
→ 再判断是否值得新增
~~~

### 默认不新建

不要因为以下原因创建新文档：

- 新增一个代码文件夹；
- 新增一个页面；
- 新增一个 simple Domain；
- 临时排障；
- 一次 migration；
- 一次 UI 微调；
- 想“记录一下过程”。

### 可以考虑新建

满足以下情况之一：

- 独立长期 lifecycle/state machine；
- 独立 media contract；
- 独立 provider/channel model；
- AI 特殊流程已经不能由 cross-domain AI docs 解释；
- 复杂 permission；
- 多条独立长期 regression；
- 独立运维 / 恢复边界；
- 长期架构选择需要 ADR；
- 历史里程碑值得长期追溯。

新增复杂 Domain 前先更新 [Domains MOC](../domains/README.md) 的 Registry / Upgrade Rule。

## 6. MOC / Index Maintenance Rules

MOC 只做导航，不成为第二事实源。

MOC 可以维护：

- 名称；
- 一句话职责；
- canonical link；
- current implementation pointer；
- simple / complex 分类；
- task routing；
- yes/no integration hint。

MOC 不维护：

- 完整 enum；
- threshold；
- permission matrix；
- lifecycle；
- provider fallback 细节；
- schema field catalog；
- Production runtime 数值。

如果 MOC 与 canonical doc 冲突，修 MOC；不要把 MOC 升格为第二 canonical owner。

## 7. Current Fact Source Rules

文档维护前先判断问题类型：

| 问题 | 首要事实源 |
|---|---|
| 线上用户实际运行行为 | deployed Production + runtime |
| 当前仓库 / 下一步开发基线 | GitHub main |
| DB schema / function / cron | Production Supabase runtime + repo migration/ledger |
| Product / Domain / Architecture contract | current canonical docs + current main |
| main 与 Production 差异 | [Current State](current-state.md) |
| 长期架构原因 | ADR |
| 历史实现 | History |
| 尚未实现的目标设计 | Obsidian |

文档与 source/runtime 冲突时，先修文档，不用旧文档反推代码应该退回去。

## 8. Implementation Anchors

Canonical doc 可以维护当前源码入口，但必须明确它只是 current implementation map。

代码目录重构后：

- 更新 anchor；
- 不因为 path 变化改业务 contract；
- 删除不存在的旧 anchor；
- MOC / Domain / Engineering 中涉及路径的导航一起检查。

## 9. ADR Rules

ADR 只记录长期架构选择及原因。

应该写 ADR：

- Source of Truth 改变；
- identity model 改变；
- AI Access Core 边界改变；
- Reminder generation model 改变；
- Life / Legacy 数据边界改变；
- deployment authorization policy 改变；
- 其他会长期约束多个模块的架构选择。

不应该写 ADR：

- 页面布局；
- 一个 bug fix；
- 一次 migration；
- 文件夹重命名；
- 某天 Production 配置值；
- 一次事故排查过程。

长期方向变化时新增 ADR refine / supersede，不回写旧 ADR 让历史失真。

## 10. History Rules

History 解释过去，不定义现在。

适合进入 History：

- 正式品牌 / 产品阶段变化；
- 大型上线里程碑；
- 重要架构迁移；
- 一次性验收；
- 被替代但仍有追溯价值的实现。

不需要进入 History：

- 每次 CSS 调整；
- 无行为变化的 refactor；
- 普通 dependency update；
- 临时排障聊天；
- 每个 commit。

Raw History 可以保留旧术语和当时的 “current” 表述，但 current docs 不从 History 反向恢复旧实现。

## 11. Current State Rules

[Current State](current-state.md) 必须保持短。

只记录：

- latest Production deployment/source；
- GitHub main 相对 Production 的重要差异；
- Supabase runtime / ledger 重要状态；
- outstanding verification；
- deployment protection。

不要把 Product、Domain、schema catalog 或事故流水复制进去。

触发更新：

- 新 Production deployment；
- main/Production 差异性质变化；
- Supabase runtime/ledger 重要变化；
- outstanding verification 完成/新增；
- deployment protection 改变。

## 12. Documentation Closeout Checklist

每次开发结束时检查：

~~~text
[ ] 这次是否真的改变 current fact？
[ ] canonical owner 是否唯一？
[ ] Obsidian future design 是否被误写成 current？
[ ] 已实现 contract 是否又在 Obsidian 复制维护？
[ ] Product / UI / Data / API / Auth / Domain / AI / Reminder 是否只更新真正受影响的层？
[ ] schema / RPC 改动是否同步 Data Model？
[ ] implementation anchors 是否仍存在？
[ ] MOC / relative links 是否有效？
[ ] 是否新建了其实不需要的新文档？
[ ] main 与 Production 差异是否需要更新 Current State？
[ ] 长期架构变化是否需要 ADR？
[ ] 是否真的值得写 History？
[ ] 文档中有没有把一次 runtime 值误写成永久 contract？
[ ] 文档是否区分 schema default 与 current Production preference？
[ ] 文档是否区分 Production Web、GitHub main、Supabase runtime？
[ ] deployment status 是否与实际 Vercel 状态一致？
~~~

## 13. New Feature Documentation Recipe

以一个新的 simple feature 为例：

~~~text
Obsidian 设计
→ Product capability
→ Domains Registry 判定 simple/complex
→ Data Model
→ Auth
→ canonical service
→ API & Sync
→ UI
→ optional AI
→ optional Reminder
→ tests
→ update only affected canonical docs
~~~

如果后续复杂度上升：

~~~text
simple domain
→ create complex Domain canonical doc
→ 抽回散落业务 semantics
→ cross-domain docs 只保留机制/链接
→ update Domain Registry
~~~

不需要重新设计整个 docs 目录。

## 14. Documentation-only Change Verification

纯文档变更至少检查：

- current source/runtime 是否支持新增事实；
- relative Markdown links；
- dead/stale path；
- canonical owner；
- implementation anchor；
- future/current 边界；
- History/current 边界。

纯文档变更不为了形式强制运行完整 npm test/lint/build。

如果同时修改少量纯说明代码文案，应确认 diff 没有改变 tool schema、resource/action、permission 或业务逻辑。

## 15. Maintenance of This Guide

只有“文档怎么维护”的流程发生变化时才更新本文件。

具体 Product、Domain、schema、API、runtime 事实不要复制到本手册。

如果本手册与某 canonical business document 冲突：

> 业务事实以对应 canonical owner 为准；本手册只负责维护流程。
