# Product MOC

本区域回答：**当前已经实现的伴岛，对用户来说是什么，以及当前体验有哪些稳定约束。**

伴岛 / Beside 是唯一正式产品。文档中的 `Island Life` 只表示当前生活数据域 / 架构术语；`Legacy Game` 只表示由伴岛最初程序演变并保留下来的小游戏「变美变瘦大作战」的工程称呼。

## 文档

- [Product Overview](overview.md)：当前产品定位、当前模块、当前入口与能力边界。
- [UI Guidelines](ui-guidelines.md)：跨页面稳定交互 contract 与页面重构时不能破坏的行为。
- [Design System](design-system.md)：统一 UI 架构、当前视觉 baseline、组件分层与未来全站 UI 重构规则。

简单理解：

```text
Overview
= 现在有什么

UI Guidelines
= 应该怎么操作

Design System
= 应该怎样统一呈现与怎样重构
```

## 与 Obsidian 产品设计的边界

尚未实现的产品设想、未来模块、页面方案和视觉方案先放在 Obsidian「伴岛」项目。

```text
Obsidian 设计
→ 用户确认
→ 开发
→ GitHub code + current docs
→ 明确授权后部署
```

未实现的 Obsidian 方案不能提前写成 GitHub current docs 的当前能力。

## Product 文档的稳定性原则

Product 文档既要准确描述当前版本，也不能把今天的页面布局写成永久产品结构。

必须区分：

```text
稳定产品能力 / 交互 contract
≠ 当前入口 / 当前页面编排 / 当前视觉 baseline
```

因此：

- 功能仍存在但入口移动时，更新“当前入口”，不把旧页面归属当成长期约束；
- 页面重构但交互 contract 未变化时，不重写业务规则；
- 全站 UI 重构时优先修改 Design System 与共享组件层，不逐页复制新样式；
- 新功能简单时可先由 Overview + Architecture 描述；复杂到出现多份长期 contract 时再升级为 Domain。

## 不在这里维护

- 数据表 / RPC → [Architecture / Data Model](../architecture/data-model.md)
- API / 缓存 / OAuth → [Architecture / API and Sync](../architecture/api-and-sync.md)
- 身份 / 权限 → [Architecture / Auth and Identity](../architecture/auth-and-identity.md)
- Meal 详细 contract → [Meal MOC](../domains/meal/README.md)
- Reminder 详细 contract → [Reminder MOC](../domains/reminders/README.md)
- 「变美变瘦大作战」详细规则 → [Legacy Game MOC](../domains/legacy-game/README.md)
- 当前 deployment / CI → [Engineering / Current State](../engineering/current-state.md)
- 尚未实现的产品设计 → Obsidian「伴岛」项目

## AI 最小阅读路径

| 任务 | 最少先读 |
|---|---|
| 判断“当前产品有没有这个能力” | `overview.md` |
| 改页面交互 / 表单 / loading / read-only | `ui-guidelines.md` + 对应页面源码 |
| 改视觉体系 / token / shared component | `design-system.md` + `components/ui/README.md` |
| 做全站 UI 重构 | `design-system.md` → shared UI → domain components → pages |
| 改具体 Meal / Reminder / Legacy Game 规则 | 进入对应 Domain MOC |
| 改数据、权限、API | 进入 Architecture MOC |
| 讨论尚未实现的新功能 / 新页面 | 先进入 Obsidian 产品设计，不修改 current docs |

当前 UI 代码入口主要是 `app/`、`components/ui/`、`components/life/`；具体业务代码继续由 Domain / Architecture 指路。

## 修改时同步检查

- 新增 / 删除用户可见能力 → 更新 `overview.md`；
- 功能入口或信息架构变化 → 更新 `overview.md` 的“当前入口”；
- 跨页面稳定交互变化 → 更新 `ui-guidelines.md`；
- 长期 UI 架构、token、shared pattern 变化 → 更新 `design-system.md` 与必要的 `components/ui/README.md`；
- 只改单一业务细节时优先更新对应 Domain，不把细节复制回 Product；
- 未实现的未来方案只更新 Obsidian，不提前修改 GitHub current docs。
