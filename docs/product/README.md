# Product MOC

本区域回答：伴岛 / Beside 当前对用户来说是什么、用户现在能做什么、稳定交互应该怎样表现，以及 UI 应怎样统一。

伴岛 / Beside 是唯一正式产品，日常称呼“小岛”。Island Life 只表示内部生活数据域 / 历史工程阶段；Legacy Game 只表示游戏机内“变美变瘦大作战”的工程称呼。

## 文档

- Product Overview：当前产品能力、当前入口与能力边界。
- UI Guidelines：跨页面稳定交互 contract。
- Design System：UI 分层、组件职责、当前视觉 baseline 与全站 UI 重构规则。

简单理解：

~~~text
Overview      = 现在有什么、从哪里进入
UI Guidelines = 不管页面怎么改，哪些交互不能被误改
Design System = 怎样统一呈现、怎样进行全站 UI 重构
~~~

## 与其他区域的边界

- 表、字段、constraint、数据事实 → Architecture / Data Model
- API、cache、transport → Architecture / API & Sync
- 身份、ownership、权限 → Architecture / Auth & Identity
- AI → Architecture / AI
- Meal → Domains / Meal
- Reminder → Domains / Reminder
- 变美变瘦大作战 → Domains / Legacy Game
- 开发、测试、部署、排障 → Engineering
- 产品演变 → History / Product Evolution
- 尚未实现的产品设计 → Obsidian「伴岛」项目

## UI / 产品任务的最小阅读路径

- 判断当前有没有某能力：Product Overview
- 修改稳定交互：UI Guidelines + 对应 Domain
- 单页视觉调整：Design System + 页面源码
- 全站 UI 重构：Product Overview → UI Guidelines → Design System → Engineering / Development & Testing
- 功能移动页面：更新 Product Overview 的 current entry；不要因此重写 Domain contract
- 新功能：先进入 Domains MOC 与 Architecture，确认 ownership / data / service，再实现 UI

## 维护原则

当前入口和视觉 baseline 可以变化；稳定能力、业务 contract 与权限不能因为页面搬家或视觉重构被顺手改变。

未实现的 Obsidian 方案不能提前写成 GitHub current docs 的当前能力。
