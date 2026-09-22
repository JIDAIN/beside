# Beside Design System

本文维护伴岛长期 UI 架构与当前视觉 baseline。业务 lifecycle、权限与 schema 不属于本文。

## 1. Design Principles

- 简约、温暖、轻量；
- 记录，不评价；观察，不排名；
- 可读性和操作效率优先于装饰；
- 控件名称足够说明功能时不增加重复灰色说明；
- 同类交互使用统一 primitive / pattern；
- 页面可以有领域特色，但不能各自建立完整视觉系统；
- 全站视觉升级优先修改公共层，而不是持续叠加页面 override。

## 2. UI Layer Model

长期职责模型：

~~~text
Design Tokens
→ App* Primitive / Adapter
→ Shared Pattern
→ Domain Component
→ Page Composition
~~~

这是职责层次，不是永久文件夹结构。

## 3. Component Ownership

### Design Tokens
颜色、间距、圆角、阴影、motion 等基础语言；不承载业务状态。

### App* Primitive / Adapter
Button、Input、Select、Dialog、PageShell、Icon 等项目级 UI adapter。第三方 UI 能力先经过这一层归一，不让第三方视觉 API 扩散到所有业务页。

### Shared Pattern
跨领域稳定组合，如 RoleSwitch、RecordRow、FeatureTile、NutritionBar。只有存在至少两个稳定复用场景时才晋升。

### Domain Component
领域专用组件，如 TodayMoodCard、MealPhotoFrame。先保留在领域层，不因为“未来可能复用”提前做 global primitive。

### Page Composition
页面负责组合和 route，不创建第二套 design system，也不承担数据库事实或权限唯一判断。

## 4. Graduation / Deprecation Rules

~~~text
one-off page need
→ domain-local component
→ repeated stable pattern
→ shared pattern
→ only when justified: lower-level primitive
~~~

删除旧 shared component 前必须：
- 找到所有 consumer；
- 新组件覆盖相同 interaction states；
- 完成 ui-lab + 真实页面回归；
- 移除旧 import / CSS 后再删除。

## 5. Current Implementation Map

当前实现主要映射：

~~~text
app/island-life-tokens.css
→ components/ui/App*
→ components/ui shared patterns
→ components/life/* domain UI
→ app/* page composition
~~~

Legacy Game UI 当前主要位于 components/home/*。

/ui-lab 用于 token、primitive、pattern 与视觉状态回归。

当前 components/ui 包含 AppButton、AppDialog、AppInput、AppSelect、AppTextarea、AppPageShell、AppLifeBottomNav、AppRoleSwitch、AppRecordRow、AppFeatureTile、AppNutritionBar、AppScene、AppIcon / LifeIcon / MoodIcon 等。这是 current snapshot，不是永久 inventory。

## 6. Current Technical Debt

当前 app/layout.tsx 仍加载多层历史 CSS，例如：
- island-life-tokens.css
- island-life-refactor.css
- r8-ui-closeout.css
- r8-2-ui-calibration.css
- r8-2-mailbox.css
- r8-3-visual-polish.css
- food-compact.css
- food-editor-closeout.css
- mailbox-visual-closeout.css

这些是当前真实实现与历史演进结果，不是推荐的长期扩展模式。

小修可以在当前结构中安全完成；系统级 UI 重构应逐步把稳定规则收敛回 token、App*、shared pattern 与 domain component。

## 7. Current Visual Baseline

以下只描述当前实现，不是永不可改的品牌约束。

当前主背景 / surface 使用暖白与柔和浅色；主交互偏 mint/teal，yellow 用于温暖强调，coral/pink 用于关系与情绪点缀，blue 用于睡眠与安静信息。

当前主要 token 来源：app/island-life-tokens.css。

当前基础圆角大致为：
- small 10px
- control 14px
- card 18px
- hero 22px

主要内容宽度约 max 30rem。

未来统一重构应通过 token/shared layer 整体调整，不按页面逐一换色。

## 8. Domain Visual Baselines

### Mood
- 当前八种 mood 使用固定资源；
- “未记录”只是一种展示状态，不是 mood enum；
- 月历无记录留空。

### Monthly Review
心情 / 饮食 / 睡眠当前共用纸张式月历骨架；数值直接展示 kcal / 小时，不做评分。

### Meal Photo
当前视觉采用横向卡片式展示，优先完整显示主体；精确 4:3 / object-contain 等属于 current baseline，可在整体设计重构时调整。正式 media contract 见 Meal Photo Storage。

### Mailbox
当前使用纸信 / 明信片视觉，postcard 水平横向。draft/sent 权限不属于 Design System。

## 9. Responsive / Accessibility

- safe-area 不遮挡主要操作；
- touch target 明确；
- 长中文可合理换行；
- 数字稳定对齐；
- loading / image reload 尽量避免整体跳变；
- 长表单关键操作保持可达；
- 视觉重构不能牺牲可读性和状态辨识。

## 10. UI Lab

/ui-lab 只用于假数据视觉实验与回归：
- token；
- App*；
- shared patterns；
- loading / empty / error / disabled；
- 全站 UI 重构收敛。

它不发真实 Life mutation，不触发 Legacy Game settlement。

## 11. Full-site UI Refactor Procedure

~~~text
1. 明确新视觉方向与 tokens
2. 重构 App* primitives / adapters
3. 收敛 shared patterns
4. 迁移 domain components
5. 重组 pages
6. 清理被替代的历史 CSS
7. ui-lab regression
8. real-page regression
~~~

Legacy Game 可以纳入统一视觉，但业务结算规则不能随 UI 重构改变。

## 12. Anti-patterns

禁止长期使用：
- 每页一套色板；
- 复制第二套 Button/Card/Input；
- 第三方完整视觉系统直接进入业务页；
- 用金币/经验/streak 包装普通生活事实；
- 核心图标继续依赖系统 emoji；
- 不断新增 r9/r10 式全局 override 作为重构策略；
- 视觉组件成为唯一权限保护；
- 把当前颜色/圆角/布局写成永久业务规则。

## 13. Change Impact / Maintenance

更新本文：
- token 体系改变；
- shared component strategy 改变；
- UI layer ownership 改变；
- 全站视觉 baseline 改变；
- reusable pattern 或 deprecation policy 改变。

单页像素微调通常不更新本文。
