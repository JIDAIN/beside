# 微信提醒 / Reminder Center

## 1. 定位

Reminder Center 是 Island Life 的统一提醒层。它负责把来自生活模块和用户自定义的提醒统一表示、统一展示，并通过 PushPlus 投递到 Cat / Fish 各自的微信。

当前正式链路：

```text
生活模块 / 自定义提醒
        ↓
Reminder Engine
        ↓
life_reminder_rules / life_reminder_instances
        ↓
网页 Reminder Center + Supabase pg_cron
        ↓
life_notification_deliveries
        ↓
PushPlus
        ↓
Cat / Fish 对应微信
```

Reminder Engine 与 PushPlus 解耦。Reminder Center 负责“什么时候应该提醒谁”，PushPlus 只负责最终微信投递。

## 2. 当前能力

当前 Reminder Center V1 已支持：

```text
自定义提醒
药箱到期提醒
纪念日提醒
小信箱来信提醒
今天 / 即将到来 / 已完成
完成 / 忽略 / 1 小时后
药箱提醒开关 / 提前天数
首页最近 3 条提醒
PushPlus 绑定状态
Cat / Fish 独立微信 token
both -> Cat / Fish 双实例
Supabase 云端定时投递
```

### 2.1 自定义提醒

用户可以为 Cat、Fish 或双方创建指定时间的提醒。`both` 不代表一个共享投递对象，而是在实例化时拆成 Cat / Fish 两条独立 reminder instance，后续完成、忽略、snooze、微信投递都独立处理。

### 2.2 药箱到期提醒

药箱提醒按 Cat / Fish 分别配置：

- 是否开启；
- 提前多少天提醒；
- 默认提前天数为 `[30, 7, 1, 0]`；
- 可配置范围为 0～90 天；
- 只物化未来约 90 天内的实例，避免无限生成。

### 2.3 纪念日提醒

纪念日已进入统一 Reminder Engine，不再维护一条独立的 PushPlus 直发分支。

### 2.4 小信箱来信提醒

小信箱来信提醒复用现有 Reminder Engine，不新增独立通知系统。

触发规则：

```text
保存 draft                 -> 不提醒
编辑 draft                 -> 不提醒
draft -> sent              -> 给 recipient 生成 1 条 mailbox reminder
直接以 sent 创建           -> 给 recipient 生成 1 条 mailbox reminder
已 sent 的后续读取 / 展示   -> 不重复生成
```

提醒只发给收件人，不发给寄件人；`sender / recipient` 由服务端签名身份和 mailbox 规则确定，前端不能伪造。

微信提醒只提示“收到一封新手札 / 新明信片”，不包含信件正文，保留拆信体验和隐私。

当前来信实例使用 `source_type = mailbox`，进入统一 `life_reminder_instances`，再由既有 pg_cron / PushPlus 链路投递。

2026-09-07 已验证：Cat 寄给 Fish 的明信片在寄出后生成 Fish 的 `mailbox` reminder instance，并在下一轮云端调度中得到 PushPlus `accepted` 投递结果。

## 3. 数据模型

### 3.1 `life_reminder_rules`

保存“提醒规则”本身，例如：

- 自定义提醒；
- 药箱提前提醒配置；
- 可继续扩展的未来生活模块规则。

规则不是最终投递记录。

### 3.2 `life_reminder_instances`

保存某一次真正需要发生的提醒。

典型字段语义包括：

- reminder 属于 Cat 还是 Fish；
- 来源类型；
- 标题 / 内容；
- 原始 due time；
- snooze 后的 effective due time；
- 是否完成 / 忽略；
- 是否已经通知。

来源目前包括自定义、药箱、纪念日和 `mailbox` 等。

### 3.3 `life_notification_deliveries`

只负责通知投递状态，不负责定义提醒业务语义。

同一 reminder instance 的某一个 effective due time 对应稳定 dedupe key，防止网络重试造成重复微信推送。

## 4. Snooze 语义

点击“1 小时后”不是创建一条完全无关的新提醒，而是延后当前提醒的 effective due time。

关键行为：

```text
snooze
-> effective due time 更新
-> notified_at 重置
-> 下一次调度允许再次投递
-> 新 effective due time 使用新的 delivery dedupe key
```

这样既允许用户主动要求“1 小时后再提醒一次”，又能阻止同一个投递请求因为网络重试重复轰炸。

## 5. PushPlus 绑定

Cat / Fish 分别拥有自己的 PushPlus token。

原则：

- token 只在服务端处理；
- token 不读回浏览器；
- token 加密存入 Supabase Vault；
- Reminder Engine 只决定 recipient；
- 投递层根据 recipient 查对应 PushPlus secret。

因此同一个 ChatGPT 账号并不会导致两个人共用一个微信通知目标；真正的通知身份仍然是固定的 Cat / Fish actor。

## 6. 云端调度

当前通过 Supabase `pg_cron` 驱动提醒物化和 PushPlus 投递。

PushPlus 投递调度当前约每 5 分钟执行一次，因此“16:01 到期”的提醒可能在 16:05 左右实际发出，而不是秒级触发。

这个延迟是当前 V1 的预期行为。真正需要更细时间精度的提醒类型若未来出现，应先评估调度粒度，而不是在客户端额外建立第二套不可靠 timer。

## 7. Reminder Center UI

当前页面入口：

```text
我的 -> Reminder Center
```

主要分区：

```text
今天
即将到来
已完成
提醒设置
```

支持：

- 完成；
- 忽略；
- 1 小时后；
- 创建自定义提醒；
- 药箱提醒设置；
- PushPlus 状态查看 / 绑定。

今日首页另外展示最近 3 条提醒，只承担轻量预览，完整管理仍进入 Reminder Center。

`mailbox` 来源在 UI 中显示为“小信箱”。

## 8. 防重复规则

提醒系统的防重复分成两层：

1. 业务实例层：同一个来源事件只生成应该生成的 reminder instance；
2. 通知投递层：同一个 instance + effective due time 使用稳定 dedupe key。

小信箱来信特别要求：

```text
一封信第一次进入 sent -> 生成一次
后续读取 / 刷新 / 再查询 -> 不生成
```

不能把“打开收信箱”当作触发条件，否则会导致重复提醒。

## 9. 新增提醒来源的标准方式

未来新增生理期、预约、服药等提醒时，原则是：

```text
业务模块确定事件 / 规则
        ↓
生成或物化 life_reminder_instances
        ↓
复用 Reminder Center 状态操作
        ↓
复用 pg_cron + PushPlus 投递
```

不要：

- 每个生活模块各写一套 PushPlus HTTP 调用；
- 在浏览器里依赖 `setTimeout` 做长期定时；
- 把 PushPlus token 暴露给客户端；
- 为单个模块新建另一套“已通知”状态模型。

## 10. 当前边界

当前系统更适合：

- 允许最多几分钟误差的生活提醒；
- 低频、真正有价值的通知；
- 需要 Cat / Fish 精确区分的双人提醒。

目前不追求：

- 秒级闹钟；
- 高频任务轰炸；
- 把 Reminder Center 做成完整 TODO / 项目管理器。

产品方向仍然是生活记录与陪伴，而不是任务管理 App。

## 11. 相关文件

主要代码：

```text
components/life/LifeReminderCenterPage.tsx
components/life/LifeWechatReminderCard.tsx
components/life/today/TodayReminderCard.tsx
lib/life/reminder-client.ts
lib/server/life-reminder-center.ts
lib/server/life-wechat-reminders.ts
```

主要 migration：

```text
20260903190000_add_wechat_reminders.sql
20260904172000_r10_1_direct_pushplus_scheduler.sql
20260907075500_mailbox_arrival_reminders.sql
20260907082000_add_reminder_center_v1.sql
20260907083000_dispatch_reminder_center_pushplus.sql
20260907084500_limit_reminder_horizon.sql
20260907093000_reminder_center_v1_closeout.sql
```

当前状态总览见 `docs/09-status-roadmap.md`。
