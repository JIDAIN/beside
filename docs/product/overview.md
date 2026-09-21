# Product Overview

状态：2026-09-21。

本文只回答：**当前代码实际向用户提供什么能力，以及这些能力当前从哪里进入。**

交互细节见 [UI Guidelines](ui-guidelines.md)，视觉与 UI 架构见 [Design System](design-system.md)，业务与数据细节分别由 Domains / Architecture 维护。

## 1. 产品身份与历史关系

**伴岛 / Beside** 是当前唯一正式产品，日常称呼 **小岛**。它是两个人共同使用的私人生活记录与陪伴 Web App。

项目演变关系必须固定理解为：

```text
早期程序雏形
「变美变瘦大作战」
        ↓
产品范围逐步扩展并重新定位 / 更名
        ↓
伴岛 / Beside（当前唯一正式产品）
        └─ 小窝
           └─ 游戏机
              └─ 变美变瘦大作战
```

因此：

- 「变美变瘦大作战」不是伴岛的旧正式名称替代品，而是伴岛最初程序雏形演变后被保留下来的原游戏；
- 当前它只是伴岛「小窝 → 游戏机」中的一个小游戏；
- 工程文档内部称它为 **Legacy Game**；
- `Island Life` 只用于表示伴岛当前生活数据域 / 架构边界，不是用户品牌，也不是与伴岛并列的正式产品。

生活数据与 Legacy Game 可以关联展示，但不会因为日期或人物相同而自动互相改值。

## 2. 当前信息架构

当前底部主导航：

```text
今日 / 饮食 / 日历 / 小窝 / 我的
```

当前路由：

```text
/         今日
/food     饮食
/calendar 日历
/nest     小窝
/me       我的
```

这是**当前信息架构快照**，不是永久产品结构。未来如果功能移动、合并、升级或新增模块，应更新本节的“当前入口”，不要把今天的页面归属当成长期业务约束。

## 3. 固定双人身份

底层固定身份：

```text
cat
fish
```

用户界面统一按当前登录账号显示“我 / Ta”，不要求用户理解或操作内部 key。

权限细节：
→ [Auth and Identity](../architecture/auth-and-identity.md)

## 4. 今日

**当前入口：** 底部「今日」 / `/`

当前承担高频、低成本记录与查看：

- 心情；
- 睡眠；
- 活动；
- 当前日期与“一起度过的第 N 天”。

当前账号只能维护自己的个人记录；双方共同活动按共享规则处理。

睡眠按起床日归档：今天显示“昨晚入睡 → 今天起床”。

稳定交互规则：
→ [UI Guidelines](ui-guidelines.md)

## 5. 饮食

**当前入口：** 底部「饮食」 / `/food`

当前能力：

- 按日期查看；
- 在“我 / Ta”之间切换查看；
- 早餐 / 午餐 / 晚餐；
- 上午 / 下午 / 晚上加餐；
- 食物明细与份量；
- kcal 与三大营养素；
- 吃饭时间与备注；
- 一张正式展示照片；
- 自己的餐食新增 / 编辑 / 删除；
- 常吃食物复用。

常吃食物当前独立维护入口：`/food/favorites`。

完整业务 contract：
→ [Meal MOC](../domains/meal/README.md)

## 6. 日历 / 月度回顾

**当前入口：** 底部「日历」 / `/calendar`

当前提供：

```text
心情 / 饮食 / 睡眠
```

- 心情：同一月历展示我 / Ta；
- 饮食：按我 / Ta 切换，展示每天 kcal；
- 睡眠：按我 / Ta 切换，展示每天睡眠时长；
- 点击日期进入历史日详情。

这里记录事实，不提供 streak、排名、健康好坏评分。

## 7. 小窝

**当前入口：** 底部「小窝」 / `/nest`

小窝当前由两层组成：

```text
顶部共享纪念日卡片
+
四个功能入口
├─ 体重
├─ 小信箱
├─ 家庭药箱
└─ 游戏机
```

纪念日是双方共享设置，可在小窝直接修改，并用于首页“一起度过的第 N 天”。

### 体重

当前提供个人体重记录、趋势与目标体重；具体权限和数据模型由 Architecture 维护。

### 小信箱

当前包含：

```text
收信箱 / 已寄出 / 待寄出
```

draft / sent 的生命周期与权限属于业务 contract，见 Data Model / Auth；用户可见交互见 [UI Guidelines](ui-guidelines.md)。

### 家庭药箱

当前用于共同维护药品、数量与有效期信息。

### 游戏机

游戏机是伴岛内部的小游戏入口。

当前唯一可用小游戏：

> **变美变瘦大作战**

它来自伴岛最初的程序雏形，现作为 Legacy Game 独立保留自己的旧游戏数据、结算和玩法。未来游戏机可以新增其他小游戏，但这不会改变「变美变瘦大作战」只是其中一个游戏的层级关系。

详细规则：
→ [Legacy Game MOC](../domains/legacy-game/README.md)

## 8. 我的

**当前入口：** 底部「我的」 / `/me`

当前提供：

- 当前登录身份；
- 云端连接状态；
- 当前账号自己的 PushPlus / 微信提醒绑定、测试和解绑；
- 数据管理（备份、导出、导入、恢复）；
- 退出登录。

Reminder Center 当前存在独立页面 `/me/reminders`，但不是底部主导航项，也不是当前“我的”页面的独立列表入口。

提醒业务：
→ [Reminder MOC](../domains/reminders/README.md)

## 9. AI

伴岛当前有 MCP / ChatGPT Project 与程序内置 AI 等入口。

从用户角度，AI 可以在授权身份范围内查询和维护已接入的生活数据；身份不能通过聊天中的自称切换。

AI 架构：
→ [AI MOC](../architecture/ai/README.md)

## 10. Legacy Game 数据边界

「变美变瘦大作战」继续保留自己的：

- deficit；
- 运动奖励；
- 金币 / 宝石；
- 钱包；
- 兑换；
- 热力图与成长记录。

必须保持：

```text
meal intake
!= Legacy Game deficit
!= weight
!= Life activity / Legacy Game exercise
```

这里的 `Life` 是数据域术语，不是产品名称。

详细边界：
→ [Life / Legacy Boundary](../architecture/life-legacy-boundary.md)

## 11. 当前产品边界

当前程序不声称提供：

- 医疗诊断；
- 实验室级营养测量；
- AI 任意数据库权限；
- 未授权跨身份写入；
- 一条 Meal 的多图正式持久化；
- Meal 自动驱动 Legacy Game deficit / 奖励。

未来产品模块、信息架构和页面方案由 Obsidian「伴岛」项目先设计；只有完成开发后才进入本文。

当前 Production / GitHub main / Supabase 的发布差异：
→ [Engineering Current State](../engineering/current-state.md)
