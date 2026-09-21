# AGENTS.md

本文件是 AI 编程助手和自动化开发工具修改 `JIDAIN/beside` 时必须遵守的**项目级工作规则**。

它不重复维护具体产品功能、Meal 规则、Reminder 规则或页面细节；这些内容必须从对应 MOC / canonical contract 读取。

项目专属执行 Skill 的唯一正文：`.agents/skills/beside-maintainer/SKILL.md`。开始任务时先读本文件，再读该 Skill。

## 1. 项目身份

```text
伴岛 / Beside
= 当前唯一正式产品

变美变瘦大作战
= 伴岛最初程序雏形
= 当前「小窝 → 游戏机」中的一个小游戏
= 工程内部称 Legacy Game

Island Life
= 当前生活数据域 / 架构术语
= 不是正式产品或子品牌
```

`couple-better-game` 只作为历史 / 兼容标识保留。

## 2. 开始任务时怎么读

固定顺序：`README.md` → `docs/README.md` → `docs/engineering/current-state.md` → 当前任务 MOC → canonical contract → 真实源码；涉及 runtime 时再核 Production / Supabase。

| 任务 | 入口 |
|---|---|
| 当前产品能力 / 页面 / UI | `docs/product/README.md` |
| 架构 / 数据 / API / 身份 | `docs/architecture/README.md` |
| AI / MCP | `docs/architecture/ai/README.md` |
| Meal / Reminder / Legacy Game | `docs/domains/README.md` |
| 开发 / 测试 / 配置 / 部署 / 排障 | `docs/engineering/README.md` |
| migration | `supabase/README.md` |

不要从 `docs/archive/`、旧聊天、旧 migration 注释或 Git 历史直接推断 current behavior。

## 3. 事实优先级

```text
已验证 Production behavior / Supabase runtime
→ 当前 GitHub main code
→ current docs
→ Accepted ADR
→ archive / Git history / old chats
```

必须区分 Production Web、GitHub main、Supabase runtime / migration ledger；main 已完成不等于 Production 已部署。

## 4. 不可违反的数据边界

```text
meal intake
≠ Legacy Game deficit
≠ real weight
≠ Life activity / Legacy Game exercise
```

普通 Life cleanup / import / restore 不得顺手修改 Legacy Game。涉及该边界先读 `docs/architecture/life-legacy-boundary.md`、`docs/architecture/data-model.md` 和 `lib/server/life-data-domains.ts`。

`lib/server/life-data-domains.ts` 是维护安全 allowlist / denylist，不是完整 Production schema catalog。

## 5. AI 写入边界

Web / MCP / 程序内置 AI 应复用 canonical domain services 与 AI Access Core，不为每个功能另造鉴权或数据库写入。

```text
query / discuss → no write
explicit mutation → normalize → permission → idempotency → canonical write → read-back
delete / destructive replace → extra safety check
```

具体 AI contract 见 `docs/architecture/ai/README.md`；Meal 特殊流程见 `docs/domains/meal/ai-contract.md`。AI 不获得任意 SQL 权限，也不能根据聊天昵称或自称切换 actor。

## 6. UI 开发边界

长期强制的是统一 UI 架构，而不是永久锁死当前色板：

```text
Design Tokens
→ App* UI Adapter / Primitive
→ Shared Patterns
→ Domain Components
→ Pages
```

修改 UI 前读 `docs/product/design-system.md`、`docs/product/ui-guidelines.md`，必要时读 `components/ui/README.md`。

当前 `island-life-refactor.css` / `r8-*.css` / compact stylesheet 是历史实现状态，不是推荐继续叠加的目标架构。系统级 UI 重构应先收敛 token / App* / shared patterns，再迁移 domain/page，最后清理被替代的 override。

UI 重构不得顺手改变业务 contract、权限或 Legacy Game 结算规则。

## 7. Supabase / 安全

- Browser → Next.js API → server-only Supabase；
- secret / service role 不进入浏览器；
- Web session / MCP OAuth token 绑定固定 actor；
- DDL 只通过新的 forward migration；
- 已执行 migration 不回改；
- anon / authenticated 不应意外获得 server-only RPC；
- 真实账号密码、PushPlus token、微信 secret/OpenID、私人备份数据不得提交 GitHub。

详细配置和发布安全见 `docs/engineering/configuration.md` 与 `docs/engineering/deployment-security.md`。

## 8. 开发与验证

代码改动按受影响范围执行 `npm run test`、`npm run lint`、`npm run build`；具体矩阵见 `docs/engineering/development-testing.md`。

只修改文档时不为了形式运行完整 build，但必须检查 current code / Production facts、链接路径、canonical home、未来设计是否被误写成当前能力，以及是否从 archive 恢复了退役实现。

## 9. Production 部署审批（强制）

`vercel.json` 关闭 Git 自动部署。任何 Vercel Preview / Production deployment 都必须获得用户针对**该次部署**的明确授权。

Git push / merge / CI success 不构成部署授权；未授权时可以继续代码、文档、测试和 GitHub 提交，但不得部署；一次授权不视为永久授权。

长期理由见 `docs/architecture/decisions/0006-manual-production-deployment.md`。

## 10. 文档治理

```text
当前产品能力 / 体验 → Product
跨领域系统机制       → Architecture
具体业务 contract     → Domains
运行 / 开发 / 发布    → Engineering
长期架构原因           → ADR
阶段实施 / 验收历史   → Archive
代码目录局部维护规则   → code-local README
```

一个事实只设一个 canonical home，其他位置链接过去。

尚未实现的产品设计属于 Obsidian「伴岛」项目；完成开发后再同步进入 GitHub current docs。

顶层 current docs 不按 `R8 / R10 / R11` 等开发轮次持续新增。发现 current docs 与代码 / runtime 冲突时，应核实真实实现并修正文档，而不是复制旧描述。
