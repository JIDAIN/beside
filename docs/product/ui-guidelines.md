# UI 与交互维护规范

状态：2026-09-21。

本文只维护：**即使页面以后重构、换布局或统一换视觉，也不能被无意破坏的交互 contract。**

“当前有哪些功能 / 从哪里进入”见 [Product Overview](overview.md)；视觉体系与 UI 架构见 [Design System](design-system.md)；业务生命周期与权限由 Domains / Architecture 维护。

## 1. 稳定交互原则

- 优先低记录成本，常用动作尽量少跳转、少重复填写；
- 控件本身能说明功能时不加重复解释性小字；
- 必要的错误、权限、未保存、危险操作提示不能为了“简洁”被删除；
- UI 隐藏按钮不是权限控制，真实权限必须由服务端强制；
- mutation 必须走 canonical API / service；
- 当前入口、页面布局、卡片数量可以重构，但不能因为视觉重构破坏数据语义、ownership 或错误恢复；
- 新页面尽量复用已有 interaction pattern；视觉复用由 Design System 负责。

## 2. 双人查看与编辑

个人事实页面统一遵守：

- 用户可见角色使用“我 / Ta”；
- 切换查看对象不代表写权限发生变化；
- Ta 的个人事实保持只读；
- shared domain 按自己的 shared permission 处理；
- 页面不得通过前端字段让用户伪造 actor。

身份与权限：
→ [Auth and Identity](../architecture/auth-and-identity.md)

## 3. 今日与历史日

当前 Today 的心情 / 睡眠 / 活动属于高频、低负担记录。

稳定行为：

- 心情未记录状态是展示占位，不写入 mood enum；
- 月历无 mood 时留空，不展示“未记录”占位图；
- 睡眠按起床日解释为“昨晚入睡 → 今天起床”；
- 历史日详情尽量复用同一套 mood / sleep / activity 组件与 mutation 语义，不维护第二套历史专用编辑逻辑。

当前页面组合见 Product Overview；以后 Today 页面重排时仍保留这些行为。

## 4. 饮食查看

稳定行为：

- “我 / Ta”切换只改变当前查看对象；
- Ta 餐食只读；
- 主餐与 snack 必须按 Meal contract 展示，不因为 UI 合并而改变数据语义；
- 同一 snack period 存在多条时，UI 必须能区分独立事件；
- 常吃食物是复用模板，不应在 UI 中表现成与历史 meal item 永久联动。

完整数据语义：
→ [Meal Lifecycle](../domains/meal/lifecycle.md)

## 5. Meal editor

编辑器当前可以重构页面结构，但必须保留这些行为：

- 可以编辑日期、时间、餐次 / snack period、items、nutrition、备注和展示照片；
- Web 正常保存至少需要一个真实 item；
- 有未保存修改时离开页面需要提示；
- 表单错误应靠近主要编辑区并可恢复；
- 修改无关字段不能无故清掉已有 nutrition；
- Meal 主记录保存成功但照片保存失败时，不重复创建第二条 Meal，只恢复 / 重试照片；
- 删除必须有明确确认；
- 新食物与常吃食物可以改变 UI 入口，但保存后都应形成 canonical meal item。

## 6. Meal photo 交互

UI 层只维护：

- 展示完整照片优先；
- 用户可以调整显示方向 / 缩放；
- 可以更换 / 删除照片；
- 图片失败必须可恢复，不应导致整餐重复写入。

具体 4:3、rotation、scale、Storage 与压缩规则：
→ [Meal Photo Storage](../domains/meal/photo-storage.md)

## 7. 月度回顾

稳定行为：

- 心情的“我 / Ta”位置固定，不因接口返回顺序交换；
- 无记录即空白；
- 饮食 / 睡眠按人物切换时只切数据，不改变数据含义；
- 点击日期可以进入对应历史事实；
- 月度回顾只表达记录事实，不增加 streak、完成率、排名或健康好坏评价。

当前视觉表现属于 Design System，可整体重构。

## 8. 小窝与纪念日

当前小窝结构见 Product Overview。

稳定行为：

- 纪念日是双方共享设置；
- Cat / Fish 都可以修改同一纪念日；
- 首页“一起度过的第 N 天”由同一设置推导；
- 功能以后可以移动、合并或重排，但不要复制第二份独立纪念日事实。

## 9. 小信箱

稳定交互 contract：

```text
draft
→ 仅寄件人可见
→ 可编辑 / 删除 / 寄出

sent
→ sender / recipient 可见
→ 永久只读
```

UI 必须与该状态一致：

- sent 不显示编辑 / 删除操作；
- 手札允许多页阅读 / 编辑体验；
- 明信片保持横向阅读，不使用倾斜主弹窗；
- 页面视觉可以整体重构，但不能把 sent 做成可编辑消息。

数据与权限事实：
→ [Data Model](../architecture/data-model.md)
→ [Auth and Identity](../architecture/auth-and-identity.md)

## 10. 无感加载与恢复

已有 stale data 时：

```text
保留当前内容
→ 后台 revalidate
→ 成功后收敛
```

不得因为一次后台刷新先把页面清空。

同时：

- loading / empty / error 必须有稳定状态；
- 网络失败应允许恢复 / 重试；
- 图片失败与记录失败分开处理；
- 页面重新进入前台时按当前 cache contract revalidate。

详细机制：
→ [API and Sync](../architecture/api-and-sync.md)

## 11. 页面重构规则

页面重构时按以下顺序判断：

```text
产品能力是否变化？
→ 是：更新 Product Overview

稳定交互 contract 是否变化？
→ 是：更新本文

只是布局 / 信息层级变化？
→ 改页面与 shared pattern，不改业务 contract

只是视觉变化？
→ 进入 Design System
```

禁止为了配合新设计稿复制第二套业务逻辑、权限逻辑或数据写入逻辑。

## 12. UI 人工验收

所有 UI 修改至少根据受影响范围检查：

- 窄屏；
- safe-area；
- 我 / Ta；
- loading / empty / error；
- 表单未保存；
- 删除确认；
- read-only 状态；
- 图片方向和完整性；
- mailbox draft / sent；
- 页面重构后 canonical mutation 是否仍是同一条链路。

工程命令、CI、Preview / Production 规则统一见：
→ [Development & Testing](../engineering/development-testing.md)
→ [Deployment & Security](../engineering/deployment-security.md)
