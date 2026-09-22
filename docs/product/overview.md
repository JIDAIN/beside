# Product Overview

状态：current docs。本文回答：当前伴岛向用户提供什么能力，这些能力现在从哪里进入，以及每项能力的 canonical detail 在哪里。

## 1. Product Identity

- 中文正式名：伴岛
- English：Beside
- 日常称呼：小岛
- GitHub：JIDAIN/beside
- Production URL：https://couple-better-game.vercel.app

Production URL 的旧 slug 仅为兼容地址，不代表产品仍叫 Couple Better Game。

“变美变瘦大作战”是伴岛最初程序雏形，当前保留在“小窝 → 游戏机”中；工程内部称为 Legacy Game。Island Life 只作为生活数据域 / 历史工程术语使用。

完整演变见 History / Product Evolution。

## 2. Current Information Architecture

当前底部主导航：

~~~text
今日 / 饮食 / 日历 / 小窝 / 我的
~~~

当前 route：

~~~text
/          今日
/food      饮食
/calendar  日历
/nest      小窝
/me        我的
~~~

当前实现入口：
- app/page.tsx → TodayLifePage
- app/food/page.tsx → LifeFoodPage
- app/calendar/page.tsx → LifeCalendarPage
- app/nest/page.tsx → LifeNestPage
- app/me/page.tsx → LifeMePage

这是 current snapshot，不是永久产品结构。功能搬页面时更新这里；Domain contract 不随 route 搬迁。

## 3. Current Capability Map

| Capability | 当前入口 | 能力类型 | Canonical detail |
|---|---|---|---|
| mood | 今日 / 历史日 / 日历 | personal fact | Data Model + Auth |
| sleep | 今日 / 历史日 / 日历 | personal fact | Data Model + Auth |
| activity | 今日 / 历史日 | personal/shared fact | Data Model + Auth |
| Meal | 饮食 | complex personal fact | Meal Domain |
| monthly review | 日历 | derived read model | API & Sync + Data Model |
| weight | 小窝 → 体重 | personal fact | Data Model + Auth |
| mailbox | 小窝 → 小信箱 | relationship lifecycle | Data Model + Auth + UI Guidelines |
| medicine | 小窝 → 家庭药箱 | shared fact | Data Model + Auth |
| Legacy Game | 小窝 → 游戏机 | complex legacy domain | Legacy Game Domain |
| settings | 小窝 / 我的 | shared + personal settings | Data Model + Auth |
| reminders | /me/reminders + 提醒设置 | system orchestration | Reminder Domain |
| AI | /ai + MCP | cross-domain adapter | AI Architecture |

本表只做导航，不复制业务规则。

## 4. 今日

当前入口：/。

提供高频、低成本的心情、睡眠、活动记录与“一起度过的第 N 天”。

稳定产品含义：
- 心情和睡眠是个人生活事实；
- 活动可以是个人或双方；
- 睡眠按起床日归档，今日语义为“昨晚入睡 → 今天起床”；
- “我 / Ta”是相对当前登录身份的展示语义，不是权限来源。

交互见 UI Guidelines；ownership 见 Auth & Identity。

## 5. 饮食

当前入口：/food。

当前能力：
- 按日期查看我 / Ta；
- 早餐、午餐、晚餐与上午/下午/晚上加餐；
- food items、份量、kcal、三大营养素、时间、备注；
- 一张正式展示照片；
- 自己 Meal 的新增、编辑、删除；
- 常吃食物复用，当前入口 /food/favorites。

完整 contract 见 Meal Domain。

## 6. 日历 / 月度回顾

当前入口：/calendar。

当前视图：
- 心情：双人月历；
- 饮食：按我 / Ta 查看每日 kcal；
- 睡眠：按我 / Ta 查看每日睡眠时长；
- 点击日期进入历史日详情。

这里用于回顾事实，不提供 streak、排名或健康好坏评分。

## 7. 小窝

当前入口：/nest。

当前包含共享纪念日与：
- 体重；
- 小信箱；
- 家庭药箱；
- 游戏机。

### 体重
个人体重记录、趋势与目标体重。measurement 与 targetWeight 是不同事实。

### 小信箱
收信箱 / 已寄出 / 待寄出。draft / sent 生命周期和权限以 Data Model + Auth 为准，用户可见行为见 UI Guidelines。

### 家庭药箱
双方共同维护药品、数量、有效期相关事实；提醒偏好是每个 actor 自己的 Reminder 配置。

### 游戏机
当前唯一小游戏是“变美变瘦大作战”。它保留自己的旧游戏数据、结算和玩法；未来游戏机可以容纳其他小游戏，但不能把新游戏规则塞进 Legacy Game Domain。

## 8. 我的

当前入口：/me。

当前提供：
- 当前登录身份；
- 云端连接状态；
- 当前账号自己的 PushPlus 绑定、测试、解绑；
- 数据管理：备份、导出、导入、恢复；
- 退出登录。

Reminder Center 当前 route 为 /me/reminders。

## 9. AI

伴岛当前有 MCP / ChatGPT Project 与程序内置 AI 入口。

AI 只能在可信授权身份范围内调用已注册能力；聊天中的自称不能切换 actor。AI 不拥有任意 SQL 权限。

完整架构见 Architecture / AI。

## 10. Cross-product Boundaries

长期必须保持：

~~~text
Life facts != Legacy Game settlement facts
Meal calories != Legacy Game deficit
Life activity != Legacy Game exercise
UI viewability != write permission
AI capability != arbitrary database access
~~~

生活事实与游戏结算可以关联展示，但不会因为日期或人物相同自动互相改值。

## 11. Current Product Limits

当前程序不声称提供：
- 医疗诊断；
- 实验室级营养测量；
- AI 任意数据库权限；
- 未授权跨身份写入；
- 一条 Meal 的多图正式持久化；
- Meal 自动驱动 Legacy Game deficit / 奖励。

## 12. Maintenance Rules

以下变化触发本文更新：
- 用户可见能力新增 / 删除；
- 当前入口或信息架构改变；
- 用户能力边界改变；
- 正式产品命名改变。

只改视觉 → Design System。
稳定交互改变 → UI Guidelines。
业务 lifecycle / data / auth 改变 → Domain / Architecture。
纯代码目录重构 → 只更新 implementation anchors，不重写产品能力。
