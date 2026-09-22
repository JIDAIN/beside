# AGENTS.md

本文件是 AI 编程助手和自动化开发工具修改 JIDAIN/beside 时必须遵守的项目级工作规则。

它不维护功能百科、schema 枚举或 Production 状态；这些事实从 canonical docs、代码和必要 runtime 读取。

项目专属执行 Skill 唯一正文：.agents/skills/beside-maintainer/SKILL.md。

## 1. Project Identity

~~~text
伴岛 / Beside = 唯一正式产品
小岛 = 日常称呼
变美变瘦大作战 = 小窝→游戏机中的小游戏 = Legacy Game
Island Life = 内部生活数据域 / 历史工程术语
couple-better-game = 兼容/历史标识
~~~

## 2. Start Protocol

固定顺序：

~~~text
README.md
→ docs/README.md
→ docs/engineering/current-state.md
→ task MOC
→ canonical contract
→ current source
→ runtime when needed
~~~

任务入口：
- Product/UI → docs/product/README.md
- Architecture/Data/API/Auth → docs/architecture/README.md
- AI/MCP → docs/architecture/ai/README.md
- Domain → docs/domains/README.md
- Engineering/migration/deploy/operations → docs/engineering/README.md

不要从 docs/history、旧聊天、旧 migration 注释或 Git 历史直接推断 current behavior。

## 3. Fact Source Selection

先判断任务在问哪一种事实，不使用一条线性优先级覆盖所有场景：

- 线上用户实际运行行为 → deployed Production Web + 对应 runtime；
- 下一步开发基线 / 当前仓库实现 → GitHub main code；
- 数据库 schema / function / cron → Production Supabase runtime，再核 repo migration/ledger；
- 产品 / Domain / Architecture contract → current canonical docs + current main，必要时核 runtime；
- main 与 Production 差异 → docs/engineering/current-state.md；
- 长期架构原因 → Accepted ADR；
- 历史实现 → History。

Production Web != GitHub main != Supabase runtime/ledger。

若 canonical docs 与 main/runtime 冲突，应修 docs；不能因为 Production 暂时落后 main，就把下一步开发基线回退到旧 deployment。

## 4. High-risk Data Boundary

~~~text
Meal intake
!= Legacy Game deficit
!= Life weight / game weight snapshot
!= Life activity / game exercise
~~~

普通 Life cleanup/import/restore 不得顺手修改 Legacy Game。

相关 current facts：
- docs/architecture/data-model.md
- docs/domains/legacy-game.md
- docs/architecture/decisions/0005-life-legacy-data-boundary.md
- lib/server/life-data-domains.ts

## 5. AI Boundary

Web/MCP/Built-in AI 复用 canonical services 与 AI Access Core。

~~~text
query/discuss → no write
explicit mutation
→ normalize
→ trusted actor
→ permission
→ idempotency/safety
→ canonical write
→ tool result/read-back
~~~

AI 不拥有任意 SQL；聊天自称不能切 actor；delete/high-risk 规则必须服务端强制。

Meal 特殊流程见 docs/domains/meal/ai-contract.md。

## 6. UI Boundary

长期 UI 层：

~~~text
Design Tokens
→ App* Primitive/Adapter
→ Shared Patterns
→ Domain Components
→ Pages
~~~

UI 任务先读：
- docs/product/design-system.md
- docs/product/ui-guidelines.md

历史 r8/css override 是 current technical debt，不是继续叠加的新架构。

UI 重构不得顺手改变 Domain contract、Auth 或 Legacy settlement。

## 7. Supabase / Security

- Browser → Next.js → server-only Supabase；
- secret/service role 不进入 browser；
- Web session/MCP token 绑定固定 actor；
- DDL/function/grant/RLS forward change 只新增 migration；
- 已执行 migration 不回改；
- anon/authenticated 不意外获得 server-only RPC；
- 真实账号密码、token、OpenID、private backup 不提交 Git。

开发/迁移规则见 Engineering；配置和发布安全见 Configuration / Deployment & Security。

## 8. Development / Verification

代码改动按受影响范围运行 test/lint/build，并按 docs/engineering/development-testing.md 补 targeted regression。

纯文档改动不为形式跑完整 build，但必须检查：
- current source/runtime；
- relative links/path；
- canonical owner；
- future design 没被写成 current；
- History 没被恢复成 current implementation。

## 9. Production Deployment Approval

vercel.json 关闭 Git automatic deployment。

任何 Preview / Production deployment 都必须获得用户针对该次部署的明确授权。

Git push/merge/CI success 不构成部署授权；一次授权不视为永久授权。

Production Supabase 写入同样与代码修改授权分开。

## 10. Documentation Governance

~~~text
Product capability/experience → Product
Cross-domain system → Architecture
Business lifecycle → Domains
Development/runtime/deploy → Engineering
Long-term rationale → ADR
Past implementation/acceptance → History
~~~

一个事实只设一个 canonical home。MOC 可以导航，不复制业务细节。

Obsidian「伴岛」负责未实现需求、设计探索、方案讨论和开发前决策；GitHub current docs 负责已实现并核验的 current fact。
开发 Obsidian 方案时先以 GitHub current docs + main/runtime 为基线，再把 Obsidian 作为目标变化。
实现并验证后同批更新 GitHub canonical docs；Obsidian 不继续维护第二份 current schema/lifecycle/permission/runtime contract。
