# 产品与功能

状态：2026-09-14。

## 1. 产品定位

正式产品是 **伴岛 / Beside**，日常称呼 **小岛**。它是两个人共同使用的私人生活记录与陪伴应用。

现有 `couple-better-game` Production 地址、数据库 slug、缓存 key 等继续作为兼容标识存在，但不再代表当前正式产品名称。

当前产品同时包含：

1. **生活记录**：今日、饮食、心情、睡眠、活动、体重、药箱、小信箱、日历、提醒等；
2. **Legacy Game**：旧“变瘦变美大作战”的 deficit、运动奖励、金币 / 宝石、兑换和成长地图；
3. **AI 接入**：MCP 与程序内置 AI 通过同一个 AI Access Core 读写正式生活数据。

生活事实与游戏事实可以按日期关联展示，但不能互相自动覆盖。

## 2. 固定角色与身份

```text
cat  = 猫猫
fish = 鱼鱼
```

界面“我 / Ta”始终相对当前登录用户。

Harbor Cat / Fish 等 AI 入口中的昵称、自称、`cat / fish` 文本都不是身份凭证；真正身份只来自登录、OAuth token 或服务端签名上下文。

## 3. 当前主导航

```text
今日 / 饮食 / 日历 / 小窝 / 我的
```

- 今日：心情、睡眠、活动；
- 饮食：Meal、营养、照片、常吃食物；
- 日历：心情 / 饮食 / 睡眠统一月度回顾与历史日详情；
- 小窝：体重、家庭药箱、小信箱、游戏机；
- 我的：身份、Reminder Center、通知设置、数据管理。

Legacy Game 独立保留，不为了生活页改造而重写旧游戏规则。

## 4. 饮食记录

饮食事实主要存放在：

```text
meals
meal_items
```

当前枚举：

```text
mealType     breakfast | lunch | dinner | snack
snackPeriod  morning | afternoon | night
status       estimated | confirmed
```

支持：

- 吃饭时间；
- 食物名称与份量；
- estimated weight；
- calories / calorie range；
- protein / carbs / fat；
- 单餐营养汇总；
- 手动新增 / 编辑 / 删除；
- 餐次与加餐时段纠正；
- private 餐食照片；
- AI 写入；
- `source = manual / chatgpt / import`；
- 幂等写入与读回确认。

数量语义：

- 每人每天早餐 / 午餐 / 晚餐各最多 1 条有效主餐；
- snack 是独立事件，同一时段允许多条；
- 每条加餐独立保存时间、照片、items 与营养并独立编辑 / 删除。

Meal calories / macros 允许未知：

```text
NULL = 未估算
0    = 确实为 0
```

正式 meal 默认应保存可识别的食物 items，并同时保存整餐汇总；不能只保存“本餐 / 合计”占位项来替代真实食物明细。

## 5. 常吃食物

常吃食物存放在 `favorite_food_templates`，是按 Cat / Fish 隔离的复用模板，不是某一天的餐食记录。

适用场景主要是咖啡、酸奶、饼干、零食等相对固定的食品。

当前规则：

- 有独立维护入口；
- 可以新增 / 编辑 / 删除模板；
- 餐食编辑时可以从常吃食物直接加入；
- 加入时复制模板字段到普通 `meal_items`；
- 当日临时份量不会覆盖模板默认份量；
- 以后修改模板不会回写历史 Meal。

## 6. AI 记录一顿饭

新 meal 默认流程：

```text
用户发文字 / 图片
-> 团子分析实际摄入
-> 给出待确认营养草稿
-> 用户修改或确认
-> 正式写入
```

第一句“帮我记录 / 记一下 / 保存”表示最终记录意图，不等于已经确认 AI 的营养估算。

草稿只存在聊天上下文，没有 `meal_drafts` 数据表。

单图配合“记录这顿饭 / 记录全部热量”等实际记录意图时，草稿确认后直接创建 `confirmed` Meal；只有明确“还没吃 / 先估算 / 饭后确认”时才创建 `estimated`。

补充已有餐食更新原 Meal；饭后确认更新同一 Meal，并保留原 `mealDate / eatenAt`。

## 7. 实际摄入与营养草稿

估算优先级：

```text
用户明确文字
>
餐前 / 餐后照片差分
>
单图合理估算
```

“没吃”“只吃一半”“后来又添了几口”等用户信息必须优先覆盖纯视觉推断。

能合理判断时，草稿尽量包含每种食物的：

- 名称；
- 实际份量；
- estimated weight；
- calories；
- protein；
- carbs；
- fat。

真正不知道的字段允许 `null`，不假装精确测量。

## 8. 餐食照片

当前每条正式 meal 只绑定 1 张展示照片。

多图可以参与 AI 分析；默认展示图按餐前图处理，用户明确指定时可以保存其他图。不能假装当前支持同一 meal 永久绑定两张正式图片。

图片处理：

```text
EXIF normalize
-> 最长边 600px
-> WebP quality 70
-> >120 KB 再逐步降质量
-> 最低 quality 55
-> 一般目标 50~100 KB
```

照片使用 private Storage。编辑页支持旋转、显示缩放、更换和移除。

餐食主记录成功而照片上传失败时，必须立即锁定同一 Meal，后续只重试该 Meal 的照片，不能再次创建第二条记录。

## 9. 睡眠与心情

`sleep_date` 表示**起床日 / 归档日**。

用户在今天记录睡眠时输入“昨晚入睡 + 今天起床”，无需返回昨天页面。

心情与睡眠都允许当前登录用户删除自己的记录；Ta 的个人记录保持只读。按钮可见性不是权限边界，API / RPC 仍需校验 owner。

## 10. 活动与历史日

活动支持本人活动与 `both` 共同活动；服务端继续按 owner / participantScope 校验权限。

日历任意日期都可进入历史日详情：

- 当前账号可维护该日自己的心情、睡眠和饮食；
- 活动按权限新增 / 修改 / 删除；
- Ta 的个人记录可查看但不可代写；
- 历史活动新增时 `occurred_at` 使用所选业务日期；
- 写入后同步 day / month / month-bundle 缓存。

## 11. 统一月度回顾

日历顶部固定提供：

```text
心情 / 饮食 / 睡眠
```

- 心情：双人月历，不显示我 / Ta 切换；
- 饮食：按我 / Ta 单人查看，每日显示 kcal；
- 睡眠：按我 / Ta 单人查看，每日显示时长；
- 三种视图保持统一月历视觉；
- 数字是事实，不产生评分、排名或好坏标签。

## 12. 小信箱

```text
收信箱 / 已寄出 / 待寄出
```

数据规则：

```text
draft -> 只有寄件人可见，可编辑 / 删除 / 寄出
sent  -> 寄件人与收件人可见，永久只读
```

手札支持信纸分页；明信片始终水平横向。

第一次真正进入 `sent` 时，只为 recipient 生成一次 mailbox reminder；保存 / 编辑 draft 不提醒，微信通知不展示正文。

## 13. Reminder Center / 微信提醒

业务模块只生成 reminder instance，不直接依赖具体微信 provider。

当前通道：

```text
mailbox -> 微信公众平台测试号 -> 失败时 PushPlus fallback
其他提醒 -> PushPlus
```

其他提醒包括自定义提醒、药箱到期、纪念日 / 整百日和每日记录完整性提醒。

每日完整性提醒当前在 Production Supabase 启用：Cat / Fish 每天 `21:00 Asia/Shanghai` 分别检查心情、睡眠、confirmed 早餐、午餐、晚餐；完整则静默，缺项则只发一条汇总提醒。`estimated` 与 `snack` 不算必填完成。

## 14. AI 入口

当前多个入口共享一个 AI Access Core：

```text
Harbor Cat / Fish MCP
其他 MCP client
程序内置 AI
        ↓
AI Access Core
        ↓
canonical services / restricted RPC
        ↓
Supabase
```

AI 不获得任意 SQL，不通过昵称切换身份。新增 `cycle` 等生活 domain 时扩展 canonical domain service + registry；需要提醒时接入 Reminder Engine，不重做整套基础设施。

## 15. Legacy Game 边界

```text
intake != deficit != weight != exercise / activity
```

因此：

- meal calories 不自动修改 Legacy Game deficit；
- meal 不自动触发金币 / 宝石；
- meal 不自动修改旧游戏 heatmap；
- 真实体重写 `weight_measurements`；
- 普通 Life 清理、导入、恢复不得顺手修改 Legacy Game 表。

## 16. 当前明确边界

当前不做：

- 医疗诊断；
- 营养精确测量声明；
- AI 任意 SQL；
- 未授权跨身份个人写入；
- 同一 meal 的多图正式持久化；
- meal 自动驱动旧游戏 deficit / 奖励；
- 未经当次明确授权自动部署 Production。
