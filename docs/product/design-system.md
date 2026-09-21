# 伴岛 / Beside Design System

状态：2026-09-21。本文是当前 Island Life 可见 UI 的主视觉规范，只描述视觉语言与组件层级；业务规则以 Product / Domains 为准。

## 1. 核心原则

- 简约、温暖、轻量；
- 记录，不评价；观察，不排名；
- 可读性优先于装饰；
- 控件名称已经能说明功能时，不再叠加灰色解释小字；
- 生活感来自整体色彩、留白、插画和动效，不来自厚重主题框；
- 同一交互优先复用已有 App* / Pattern。

## 2. 当前视觉 token

事实源：app/island-life-tokens.css。

主背景与 surface：

- life-bg: #fffaf2
- life-surface: #fffdf8
- life-surface-soft: #f7fbf6
- life-surface-warm: #fff4e6

主要强调色：

- mint / teal：主交互与选中；
- yellow：温暖强调；
- coral / pink：关系和情绪点缀；
- blue：睡眠与安静信息。

文字使用深灰绿体系，不使用纯黑大面积压迫页面。

基础圆角：

- small 10px
- control 14px
- card 18px
- hero 22px

主内容宽度当前为 max 30rem。

## 3. UI 分层

第三方 primitive / animal-island-ui
→ components/ui/App*
→ shared pattern
→ components/life / nutrition / legacy game

业务页面不要直接复制第三方完整视觉系统。

animal-island-ui 当前仍是真实 npm 依赖，但外部组件应先经过 App* wrapper 或项目 visual adapter 归一。

## 4. 当前基础组件 / Pattern

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

## 5. 主导航

固定五项：

今日 / 饮食 / 日历 / 小窝 / 我的

使用统一 LifeIcon，不使用平台差异明显的系统 emoji 充当主导航图标。

底部导航固定在 safe-area 上方；当前 CSS 将可见导航内容限制到约 30rem。

## 6. 页面密度

低信息密度页面可以有更明显的场景和插画，例如今日、小窝。

高信息密度页面应让主题退到：

- surface；
- token；
- 小范围插画；
- 圆角；
- 微弱阴影。

饮食、药箱、体重等数据页优先扫描效率，不做 Dashboard 堆卡。

## 7. 我 / Ta

UI 统一使用“我 / Ta”，不直接暴露 cat / fish。

AppRoleSwitch 只切换正在查看的人，不代表写权限发生变化。

身份和权限由：
→ [Auth and Identity](../architecture/auth-and-identity.md)

## 8. 心情视觉

真实 mood 使用固定八种图标资源。

“未记录心情”是 Today / 历史详情的展示插画，不是 mood enum：

- 不写入数据库；
- 不进入月历；
- 月历无记录时留空。

## 9. 月度回顾

心情 / 饮食 / 睡眠共用一套纸张式月历骨架。

- 心情：同格保留“我 / Ta”固定槽位；
- 饮食：暖色 metric bubble；
- 睡眠：紫蓝 metric bubble；
- 切换人物只换数据，不更换领域色板；
- 数字显示 kcal / 小时，不做分数、等级或完成率。

## 10. Meal photo

真实餐食照片必须使用 MealPhotoFrame：

- 容器 4:3；
- object-contain；
- 保留完整照片；
- rotation / scale 仅改变显示 transform；
- 允许留白，不用 object-cover 强裁切。

完整 photo contract：
→ [Meal Photo Storage](../domains/meal/photo-storage.md)

## 11. 小信箱

小信箱使用纸信 / 明信片视觉，不使用头像消息列表。

当前三态：

- 收信箱；
- 已寄出；
- 待寄出。

只有自己的 draft 可编辑 / 删除 / 寄出；sent 无论在收信箱还是已寄出都只读。

横向明信片保持水平展示，不做斜放主弹窗。

## 12. 移动端

- safe-area 不遮挡操作；
- 主要 touch target 保持明确；
- 长中文允许合理换行；
- 数字稳定对齐；
- 页面避免因为 loading / image reload 整体跳变；
- 长表单关键保存操作保持可达。

## 13. ui-lab

/ui-lab 是视觉回归和 Pattern 预览页。

当前页面不发真实 Life API 请求，不应该产生 Supabase 业务写入或 Legacy Game settlement。

## 14. 不允许的做法

- 每页另起色板；
- 大面积木板 / 棕色后台感；
- 用金币、经验、streak 包装普通生活记录；
- 用头像替代 mood；
- 把 cat 固定写成“我”；
- 把 sent mailbox 做成可编辑；
- 为局部页面复制第二套 Button / Card / Input；
- 为了铺满容器裁掉真实餐食照片内容。

交互细节：
→ [UI Guidelines](ui-guidelines.md)
