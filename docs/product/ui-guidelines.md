# UI & Interaction Guidelines

本文维护跨页面稳定交互 contract。它不定义 schema、权限或完整业务 lifecycle。

## 1. Interaction Principles

- 简约、温暖、低记录成本；
- 控件名称已经说明功能时不叠加重复灰色解释；
- 记录事实，不做无依据评价、排名或惩罚式反馈；
- 用户操作失败应保留上下文并可恢复；
- loading / empty / error / stale 必须可区分；
- UI 不能成为唯一权限边界。

## 2. Identity / 我-Ta

用户界面统一使用“我 / Ta”，不直接暴露 cat / fish。

角色切换只影响查看对象；真实写权限仍由 signed actor + server 校验决定。任何 UI role switch 都不能切换授权身份。

## 3. Today & Historical Day

今日和历史日应复用相同事实语义：
- 当前用户只能维护自己的个人记录；
- 双方活动遵守 shared 规则；
- 历史日不是第二套数据模型；
- 睡眠以起床日归档。

切换日期时不能遗留上一个日期的编辑态或把操作时间写成业务日期。

## 4. Meal View / Edit

Meal 页面必须区分“查看”和“可编辑”：
- 我：按权限可新增 / 编辑 / 删除；
- Ta：可查看，不能通过前端绕过权限写入。

编辑器：
- 未保存离开应可感知；
- validation 错误要能定位并继续编辑；
- 删除需要明确确认；
- 主记录保存成功但图片保存失败时，必须保留已成功的 Meal，并允许单独重试图片，不能创建第二条 Meal；
- 页面字段与布局可以重构，但 Meal lifecycle 以 Domain 为准。

## 5. Meal Photo Interaction

UI 负责：
- 完整展示；
- 旋转 / 缩放控制；
- 更换 / 删除；
- 上传失败后的恢复。

正式存储、压缩、private Storage 与 ownership 见 Meal Photo Storage。

## 6. Monthly Review

心情、饮食、睡眠共用月度回顾入口。

稳定语义：
- 没有记录就是“没有记录”，不伪造为 0 / 默认心情；
- kcal / 睡眠小时是事实展示，不做评分；
- 点击日期进入对应历史事实；
- 页面视觉可以统一重构，不改变各领域数据语义。

## 7. Nest / Anniversary

纪念日是 shared setting。修改入口可以调整，但“双方共享”不因页面搬动变成个人配置。

“一起度过的第 N 天”由 setting 派生，纪念日当天为第 1 天。

## 8. Mailbox

稳定 UI contract：
- 收信箱：当前用户收到的 sent；
- 已寄出：当前用户发出的 sent；
- 待寄出：当前用户自己的 draft；
- 自己 draft 可编辑、删除、寄出；
- sent 永久只读；
- Ta 的 draft 不展示；
- letter 支持多页阅读/编辑；
- postcard 保持水平横向呈现。

真实 lifecycle/permission 以 Data Model + Auth 为准。

## 9. Destructive / Unsaved Actions

删除、覆盖、恢复等不可逆或高风险动作必须给用户明确确认。

未保存表单不应因导航或刷新静默丢失。高风险系统操作不使用含糊按钮文案。

## 10. Loading / Empty / Error / Recovery

- 有可用 stale data 时优先保持内容，不把页面清空成加载页；
- 后台 revalidate 不应导致明显闪烁；
- empty 是真实“无记录”，不能与 loading/error 混淆；
- error 应说明可以重试或恢复的方向；
- API/cache 的具体 timeout/revalidation 参数只在 API & Sync 维护。

## 11. UI Refactor Decision Matrix

| 变化 | 主要修改层 | 本文是否更新 | 是否触碰业务 contract |
|---|---|---|---|
| 颜色 / 圆角 / 字体 | Tokens / Design System | 通常否 | 否 |
| shared Button / Dialog | App* / shared pattern | 交互变化才更新 | 否 |
| 页面重新排版 | page composition | 通常否 | 否 |
| 功能移动页面 | Product Overview | 入口变化时 | 否 |
| editable/read-only 行为改变 | UI + Auth/Domain | 是 | 是 |
| save/delete/recovery 行为改变 | UI + API/Domain | 是 | 是 |
| 数据语义改变 | Domain / Architecture | 只同步表现 | 是 |

## 12. Manual Acceptance Matrix

可见 UI 修改至少检查：
- mobile / desktop；
- safe-area；
- loading / stale / empty / error；
- 我 / Ta；
- editable / read-only；
- long text / real image / boundary data；
- refresh / return foreground；
- destructive / unsaved flow。

自动测试不能替代真实视觉验收。

## 13. Current UI Anchors

- components/life/TodayLifePage.tsx
- components/life/today/*
- components/life/LifeFoodPage.tsx
- components/life/LifeMealEditorPage.tsx
- components/life/LifeCalendarPage.tsx
- components/life/LifeNestPage.tsx
- components/life/LifeMailboxPage.tsx
- components/life/LifeReminderCenterPage.tsx
- components/ui/*

## 14. Maintenance Rules

只有稳定交互 contract 改变时更新本文。
只换样式、CSS 或页面排版但行为不变，不应制造新的业务规则。
