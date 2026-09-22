# Beside Docs

GitHub docs 是伴岛 / Beside 的 current engineering fact base。

尚未实现的产品方案、未来模块与视觉探索继续放在 Obsidian「伴岛」项目；只有完成开发后才进入这里。

## 1. Document Map

| Area | 回答什么 |
|---|---|
| Product | 用户现在能做什么、当前入口、稳定交互、UI system |
| Architecture | 系统怎样连接、数据/API/Auth/AI 边界 |
| Domains | 复杂业务 contract，以及 simple Domain 导航 |
| Engineering | 怎么开发、测试、配置、部署、排障、恢复 |
| History | 产品如何演变、过去怎样实现/验收 |

ADR 位于 Architecture / decisions。

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
- 页面/产品/UI → product/README.md
- 架构/数据/API/Auth → architecture/README.md
- AI/MCP → architecture/ai/README.md
- Meal/Reminder/Legacy/业务域 → domains/README.md
- 开发/测试/config/deploy/operations → engineering/README.md
- 历史原因/旧验收 → history/README.md

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

## 4. Fact Priority

发生冲突时：

~~~text
已验证 Production behavior / Supabase runtime
→ current GitHub main code
→ current canonical docs
→ Accepted ADR
→ History
→ Git history / old chats
~~~

必须区分：
- Production Web
- GitHub main
- Supabase runtime / migration ledger

## 5. Current vs History

History 解释过去，不定义现在。
历史文件内部写“current/canonical”只代表当时。

不要从 docs/history、旧 migration 注释或旧聊天直接恢复已退役实现。

## 6. Documentation Update Rule

代码改变事实时，同批只更新真正受影响的 canonical owner。

典型：
- current capability / entry → Product Overview
- stable interaction → UI Guidelines
- UI architecture → Design System
- schema/data → Data Model
- transport/cache → API & Sync
- identity/permission → Auth
- business lifecycle → Domain
- engineering workflow/runtime → Engineering
- architecture rationale → ADR
- milestone → History

未来产品 Roadmap 不在 GitHub current docs 展开维护。
