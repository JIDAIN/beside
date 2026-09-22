# V2 生活系统重构设计

状态：2026-09-14。V2 主体已经完成，本文件保留“为什么这样分层”的当前设计结论，不再维护早期阶段 checklist。

## 0. 当前产品关系

正式产品是 **伴岛 / Beside**。

```text
伴岛 / Beside
├─ 今日
├─ 饮食
├─ 日历
├─ 小窝
├─ 我的
└─ 游戏
   └─ 变瘦变美大作战（Legacy Game）
```

旧“变瘦变美大作战”不再代表整个应用，而是伴岛「游戏」中的独立 Legacy Game 子项目。

`couple-better-game` 只在历史名称、兼容 slug、内部 key 或 Production 兼容地址中保留。

具体数据隔离见 [当前 Life / Legacy 数据边界](../../architecture/data-model.md)。

## 1. 重构后的产品原则

```text
生活记录负责保存事实；
Legacy Game 负责自己的游戏规则；
两者可以关联展示，但不互相自动改值。
```

旧游戏继续保留历史、deficit、运动奖励、金币、宝石、钱包、兑换、成长地图和旧版每日打卡。

当前生活系统保存心情、睡眠、活动、饮食、体重、药箱、小信箱等真实生活事实。

因此始终满足：

```text
intake != deficit != weight != exercise / activity
```

## 2. 当前信息架构

```text
伴岛
├─ 今日
│  ├─ 心情
│  ├─ 睡眠
│  └─ 活动
├─ 饮食
│  ├─ 早餐 / 午餐 / 晚餐 / 加餐
│  ├─ 营养与照片
│  └─ 常吃食物
├─ 日历
│  ├─ 心情月度回顾
│  ├─ 饮食月度回顾
│  ├─ 睡眠月度回顾
│  └─ 历史日期详情
├─ 小窝
│  ├─ 体重
│  ├─ 家庭药箱
│  ├─ 小信箱
│  └─ 游戏机
│     └─ Legacy Game
└─ 我的
   ├─ 身份
   ├─ Reminder Center
   ├─ 通知设置
   └─ 数据管理
```

首页保持轻量，只承担心情、睡眠、活动三个高频记录入口；饮食、体重、药箱、小信箱各自维护独立页面。

## 3. 工程边界

当前主要代码归属：

```text
components/life        生活系统 UI
components/home        Legacy Game UI / Provider
components/ui          共享 App* / shell / wrapper

lib/life               心情 / 睡眠 / 活动等生活 domain
lib/nutrition          饮食 domain
lib/home               Legacy Game 规则与状态
lib/server             server-only 鉴权、RPC、AI、通知、Supabase adapter
```

`HomeResourcesProvider` 继续只属于 Legacy Game，不作为整个伴岛的全局事实 Provider。

表级边界由 `lib/server/life-data-domains.ts` 与 当前 Data Model / ADR-0005 共同约束。

## 4. 数据事实层

生活系统当前正式数据包括：

```text
mood_entries
sleep_records
activity_entries
meals / meal_items
favorite_food_templates
weight_measurements
medicine_items
mailbox_letters
life_reminder_rules / life_reminder_instances
```

Legacy Game 则继续使用自己的：

```text
daily_records / daily_record_sides
wallets / wallet_ledger
exchange_categories / exchange_records
```

Supabase 是正式事实源；浏览器 local/stale cache 只负责读取体验。

## 5. 饮食在 V2 中的定位

饮食是生活事实域，不是游戏输入层。

- breakfast / lunch / dinner 每人每日各最多一条；
- snack 是独立事件，可同一时段多条；
- estimated / confirmed 区分饭前估算与实际摄入；
- 常吃食物是独立模板，不与历史 Meal 持续绑定；
- meal calories 不自动生成 Legacy Game deficit；
- 真实餐食照片存 private Storage。

## 6. AI 接入原则

所有 AI 入口复用同一个正式领域层：

```text
Web UI ───────┐
MCP / ChatGPT ├─ canonical domain services / AI Access Core -> Supabase
数据恢复 ─────┘
```

AI 不获得任意 SQL；修改类动作继续经过 normalization、permission、idempotency 和必要的 read-back。

新增 `cycle` 等生活 domain 时，只扩展 canonical service、AI registry、备份 / 提醒边界，不重做一套 transport 或数据库。

## 7. Reminder Engine

提醒是生活系统横向基础设施，不属于某一个页面：

```text
业务模块
-> reminder instance
-> Supabase pg_cron
-> delivery
-> 微信 provider
```

药箱、纪念日、小信箱、每日记录完整性等都复用同一 Reminder Engine。

## 8. 当前明确不做

- 不让生活记录自动改变旧游戏奖励；
- 不把 Legacy Game Provider 扩散到整个生活系统；
- 不为每个新 domain 创建独立鉴权或独立 AI 数据层；
- 不让浏览器直接持有 Supabase service role；
- 不因为历史内部标识含旧项目名就破坏兼容性；
- 不在没有用户当次授权时自动部署 Production。

## 9. 历史说明

本文件最早用于 V2-P0 / V2-P1 分阶段设计。那些“尚未新增 mood / sleep / activity”“根 `/` 暂未切换”等早期计划已经完成，不再属于当前事实。

如果需要追溯阶段实施过程，应查看 `docs/history/` 和 Git 历史，而不是把旧阶段状态重新写回当前主文档。
