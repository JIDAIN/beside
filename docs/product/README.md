# Product MOC

本区域回答：**当前已经实现的伴岛，对用户来说是什么。**

## 文档

- [Product Overview](overview.md)：产品定位、当前模块、主要用户流程与能力边界。
- [UI Guidelines](ui-guidelines.md)：当前页面、组件和交互维护规则。
- [Design System](design-system.md)：伴岛当前可见 UI 的主视觉规范。

## 边界

这里描述“用户现在能做什么”和“当前体验必须遵守什么”。

不要在这里维护：
- 数据表 / RPC → [Architecture / Data Model](../architecture/data-model.md)
- API / 缓存 / OAuth → [Architecture / API and Sync](../architecture/api-and-sync.md)
- Meal 详细 contract → [Meal MOC](../domains/meal/README.md)
- Reminder 详细 contract → [Reminder MOC](../domains/reminders/README.md)
- 当前 deployment / CI → [Engineering / Current State](../engineering/current-state.md)
- 尚未实现的产品设想 → 不属于 GitHub 当前事实库

## AI 最小阅读路径

| 任务 | 最少先读 |
|---|---|
| 判断“当前产品有没有这个能力” | `overview.md` |
| 改页面交互 / 表单 / loading / read-only | `ui-guidelines.md` + 对应页面源码 |
| 改视觉 token / 通用组件 / 页面视觉语言 | `design-system.md` + `app/island-life-tokens.css` / `components/ui/` |
| 改具体 Meal / Reminder / Legacy Game 规则 | 进入对应 Domain MOC，不在 Product 文档推断 |
| 改数据、权限、API | 进入 Architecture MOC |

代码入口主要是 `app/`、`components/life/`、`components/ui/`；Product 文档不是数据库或权限事实源。

## 修改时同步检查

- 新增/删除用户可见能力 → 更新 `overview.md`；
- 改跨页面 UI 规则 → 更新 `ui-guidelines.md`；
- 改长期视觉 token / pattern → 更新 `design-system.md`；
- 只改单一业务细节时优先更新对应 Domain，不把细节复制回 Product。
