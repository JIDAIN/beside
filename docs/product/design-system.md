# 伴岛 / Beside Design System

状态：2026-09-21。

本文维护两类信息：

1. **稳定 UI 架构与设计原则**：未来全站 UI 重构也应继续遵守；
2. **当前视觉 baseline**：描述今天已经实现的视觉结果，可以在未来统一重构时整体替换。

本文不维护业务生命周期、权限和数据 schema。

## 1. 长期设计原则

- 简约、温暖、轻量；
- 记录，不评价；观察，不排名；
- 可读性和操作效率优先于装饰；
- 控件名称能说明功能时不叠加重复灰色解释；
- 低记录成本优先；
- 相同交互使用统一组件 / pattern，不按页面重新发明；
- 页面可以拥有领域特色，但不能各自建立完整独立视觉系统；
- 全站视觉升级优先修改公共层，不通过不断增加页面 override 来完成。

## 2. 长期 UI 架构

目标分层：

```text
Design Tokens
↓
App* UI Adapter / Primitive
↓
Shared Patterns
↓
Domain Components
↓
Pages
```

当前主要映射：

```text
app/island-life-tokens.css
↓
components/ui/App*
↓
components/ui shared patterns
↓
components/life/* / domain UI
↓
app routes
```

原则：

- token 负责颜色、间距、圆角、阴影、motion 等基础语言；
- `components/ui` 是项目面向业务的 UI adapter，不让第三方视觉 API 直接扩散到所有页面；
- 跨领域且稳定的 pattern 才提升到 `components/ui`；
- 领域专用组件先留在对应 domain；
- page 负责组合，不应自己定义第二套 design system；
- 详细代码规则见 [components/ui/README](../../components/ui/README.md)。

## 3. 当前实现状态：历史 CSS 叠加层

当前 Production / main 的视觉不是只有一层 CSS。由于多轮 UI 演进，`app/layout.tsx` 仍加载多份历史 visual adapter / calibration stylesheet，例如：

```text
island-life-tokens.css
island-life-refactor.css
r8-ui-closeout.css
r8-2-ui-calibration.css
r8-2-mailbox.css
r8-3-visual-polish.css
food-compact.css
...
```

这些文件代表**当前真实实现与历史演进结果**，不是推荐的长期 UI 架构。

维护规则：

- 小修可以在当前结构中安全完成；
- 不要把“再增加一个 r9/r10 全局覆盖层”作为长期统一 UI 的默认方案；
- 下一次系统级 UI 重构应逐步把稳定规则收敛回 token、App*、shared pattern 与 domain component；
- 不为了“文件看起来整洁”贸然删除现有 override；必须在重构和视觉回归验证后逐步合并。

## 4. 全站 UI 重构规则

未来进行伴岛统一 UI 重构时，推荐顺序：

```text
1. 明确新的视觉方向与 token
2. 重构 App* primitives / adapters
3. 统一 shared patterns
4. 迁移 domain components
5. 重组 page composition
6. 清理被替代的历史 CSS override
7. 在 ui-lab + 真实页面做视觉回归
```

重构目标：

- 同类按钮、输入、弹窗、卡片、role switch、导航只有一套公共语言；
- 页面不再依赖轮次式 CSS patch 链；
- 新增模块可以直接复用现有 token / App* / pattern；
- 旧「变美变瘦大作战」当前可保持独立 legacy 实现，但未来如果做“伴岛全站 UI 统一”，应作为明确迁移对象纳入同一设计体系，而不是永久排除；
- UI 统一不能改变 Legacy Game 自己的业务规则和数据边界。

## 5. 当前视觉 baseline

以下描述的是 **2026-09-21 当前实现**，不是不可更改的永久品牌约束。

### Token source

当前主要 token 事实源：

`app/island-life-tokens.css`

主背景与 surface：

- life-bg: #fffaf2
- life-surface: #fffdf8
- life-surface-soft: #f7fbf6
- life-surface-warm: #fff4e6

当前强调色：

- mint / teal：主交互与选中；
- yellow：温暖强调；
- coral / pink：关系和情绪点缀；
- blue：睡眠与安静信息。

当前文字使用深灰绿体系。

当前基础圆角：

- small 10px
- control 14px
- card 18px
- hero 22px

当前主要内容宽度约 max 30rem。

未来统一重构可以整体调整这些值，但应通过新的 token / shared layer 一次性收敛，而不是按页面独立换色。

## 6. 当前共享组件 / Pattern

常用：

- AppPageShell
- AppButton
- AppInput
- AppSelect
- AppDialog / Modal
- AppLifeBottomNav
- AppRoleSwitch
- AppRecordRow
- AppFeatureTile
- AppNutritionBar
- MealPhotoFrame

组件负责稳定交互和视觉，不承载数据库事实。

第三方 `animal-island-ui` 当前仍是真实 npm 依赖；外部组件应先经过 App* wrapper / adapter 归一，不能直接把第三方完整视觉系统复制进业务页。

## 7. 当前页面视觉原则

### 页面密度

低信息密度页面当前允许更明显的场景和插画，例如 Today / 小窝。

高信息密度页面优先扫描效率：

- 饮食；
- 药箱；
- 体重；
- 数据管理等。

当前不采用“为了填满页面而堆 Dashboard 卡片”的模式。

### 主导航

当前五项：

```text
今日 / 饮食 / 日历 / 小窝 / 我的
```

当前使用统一图标体系，不使用平台差异明显的系统 emoji 作为主导航图标。

这里记录的是当前 baseline；如果未来信息架构改变，以 Product Overview 的当前入口为准。

### 我 / Ta

用户可见身份当前统一表现为“我 / Ta”，不直接暴露 cat / fish。

具体切换行为见 [UI Guidelines](ui-guidelines.md)，权限见 [Auth and Identity](../architecture/auth-and-identity.md)。

## 8. 当前领域视觉 baseline

### 心情

- 真实 mood 当前使用固定八种图标资源；
- “未记录心情”是展示插画，不作为 mood enum；
- 月历无记录时留空。

### 月度回顾

当前共用纸张式月历视觉骨架：

- 心情：固定双人槽位；
- 饮食：暖色 metric bubble；
- 睡眠：紫蓝 metric bubble；
- 数字直接显示 kcal / 小时，不做评分视觉。

这些是当前视觉方案，未来可以在保持数据语义的前提下整体重构。

### Meal photo

当前视觉优先完整展示真实餐食照片：

- 4:3 容器；
- object-contain；
- 允许留白；
- 不为了铺满容器强制裁切主体。

完整媒体 contract：
→ [Meal Photo Storage](../domains/meal/photo-storage.md)

### 小信箱

当前视觉语言：

- 纸信 / 明信片，而不是头像消息列表；
- 明信片水平横向；
- 手札 / 明信片保留纸张感。

draft / sent 权限不属于 Design System，见 [UI Guidelines](ui-guidelines.md)。

## 9. 移动端与可访问性 baseline

- safe-area 不遮挡主要操作；
- touch target 明确；
- 长中文允许合理换行；
- 数字稳定对齐；
- loading / image reload 尽量避免整体跳变；
- 长表单关键操作保持可达；
- 视觉重构不能以牺牲可读性和状态辨识为代价。

## 10. ui-lab

`/ui-lab` 是统一视觉 pattern 与状态的实验 / 回归页。

用途：

- 验证 token；
- 验证 App*；
- 验证 shared patterns；
- 展示 loading / empty / error / disabled 等视觉状态；
- 在大规模 UI 重构时作为统一视觉收敛场。

`ui-lab` 只使用假数据，不发真实 Life mutation，也不触发 Legacy Game settlement。

## 11. 禁止的长期做法

- 每个页面单独建立一套色板；
- 为局部需求复制第二套 Button / Card / Input；
- 把第三方完整视觉语言直接混入页面；
- 用金币、经验、streak 包装普通生活事实；
- 用系统 emoji 代替已经统一的主导航 / 核心图标体系；
- 为适配新设计稿持续叠加新的轮次式全局 override CSS；
- 为铺满容器裁掉真实餐食照片主体；
- 把业务权限规则写进视觉组件作为唯一保护；
- 把当前 baseline（颜色、圆角、布局）误写成永远不可改变的产品规则。

交互 contract：
→ [UI Guidelines](ui-guidelines.md)
