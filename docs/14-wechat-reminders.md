# 提醒中心与微信提醒

状态：当前有效。  
状态日期：2026-09-07。

> 本文描述当前 Reminder Center、Supabase 云端调度、微信公众号测试号与 PushPlus 的正式提醒架构。历史 Google Drive / Apps Script Bridge 不再属于当前提醒链路。

## 1. 当前正式链路

```text
生活模块 / 自定义提醒
        ↓
Reminder Engine
        ↓
life_reminder_rules
life_reminder_instances
        ↓
网页 Reminder Center
        +
Supabase pg_cron
        ↓
life_notification_deliveries
        ↓
按 source_kind 选择通知通道
```

当前通道策略：

```text
mailbox
  → 微信公众平台测试号（主通道）
  → 若微信发送失败：PushPlus fallback

其他 Reminder Center 来源
  → PushPlus
```

网站没有打开时，提醒仍由 Supabase 云端执行。

Reminder Engine 与具体微信渠道保持解耦：业务模块只生成 reminder instance，不直接调用微信或 PushPlus。

## 2. 微信公众平台测试号

当前已经接通微信公众平台测试号模板消息 API。

Cat / Fish 各自关注同一个测试号，并分别绑定自己的 OpenID：

```text
cat  → life_wechat_openid_cat
fish → life_wechat_openid_fish
```

模板消息使用测试模板「团子来信 💌」，字段为：

```text
first
keyword1 = 提醒类型
keyword2 = 提醒内容
keyword3 = 提醒时间
remark
```

小信箱通知点击后跳转：

```text
https://couple-better-game.vercel.app/nest/mailbox
```

测试号主要用于验证和当前私人使用；未来如果迁移到正式公众号，应继续复用同一 provider 边界，只替换正式公众号的 AppID / AppSecret / Template ID / OpenID 配置，不重写 Reminder Engine。

## 3. Secret 与身份边界

微信公众号配置与 PushPlus token 均只保存在 Supabase Vault，不进入 Git，不下发浏览器。

当前 Vault 配置包括：

```text
life_wechat_app_id
life_wechat_app_secret
life_wechat_template_id
life_wechat_openid_cat
life_wechat_openid_fish

life_pushplus_cat
life_pushplus_fish
```

Cat / Fish 的微信目标地址完全分离。

AI 昵称统一为「团子」：

```text
Harbor Cat  → 团子
Harbor Fish → 团子
Cat 微信提醒署名  → 团子
Fish 微信提醒署名 → 团子
```

AI 昵称、用户自称、普通聊天文本都不参与身份认证。sender / recipient 仍由登录、OAuth、服务端签名身份和 mailbox 业务规则确定。

## 4. 小信箱来信提醒

小信箱继续复用统一 Reminder Engine。

触发规则：

```text
保存 / 编辑 draft       → 不提醒
draft → sent            → 仅 recipient 生成 1 条 mailbox instance
直接以 sent 创建        → 仅 recipient 生成 1 条 mailbox instance
已 sent 后读取 / 展示    → 不重复提醒
```

实例：

```text
source_kind = mailbox
recipient = 信件收件人
source_ref = 对应 mailbox letter
metadata.format = postcard | letter
metadata.destination = /mailbox
```

当前微信公众号消息示例：

```text
主人～团子来报信啦！ 💌
提醒类型：小信箱 · 明信片 / 小信箱 · 手札
提醒内容：只说明收到新来信
提醒时间：实际到达时间
团子已经帮主人放进小信箱，快去看看呀～
```

隐私边界：微信提醒不包含信件正文。真正的信件内容只在小岛登录后的信箱中查看。

## 5. 微信主通道 + PushPlus fallback

小信箱发送函数：

```text
private.life_mailbox_notification_send(actor, instance)
```

逻辑：

```text
1. 生成团子模板消息
2. 调微信测试号模板消息 API
3. 微信成功
   → delivery.provider = wechat_test_account
   → accepted
4. 微信失败
   → 自动调用现有 PushPlus
5. PushPlus 成功
   → delivery.provider = pushplus_wechat
   → metadata.fallbackUsed = true
   → accepted
6. 两边都失败
   → failed
   → 等现有 delivery retry 规则处理
```

`life_notification_deliveries.metadata` 会记录：

```text
preferredProvider
primaryProvider
fallbackUsed
primaryError（发生 fallback 时）
```

因此后续可以区分“公众号正常发送”和“公众号失败后由 PushPlus 兜底”。

## 6. 其他提醒来源

当前以下来源暂时继续走 PushPlus，不在本次迁移中扩大范围：

```text
自定义提醒
药箱到期
纪念日
每日未记录 system nudge
```

这样可以先让“小信箱来信”作为微信公众号正式试运行场景，观察稳定性后再逐步迁移其他提醒。

## 7. Reminder Center 数据模型

### `life_reminder_rules`

表示持续规则或自定义提醒来源：

```text
创建者
recipient_scope = cat | fish | both
source_kind
标题 / 内容
计划时间
是否启用
```

### `life_reminder_instances`

表示一次真正发生的提醒：

```text
recipient
source_kind
source_ref
due_at
snoozed_until
notified_at
status
dedupe_key
metadata
```

状态：

```text
pending
snoozed
completed
dismissed
```

### `life_notification_deliveries`

只描述“这次通知投递发生了什么”，与用户是否完成提醒分离。

```text
reserved
accepted
failed
```

`accepted` 只表示通知渠道接受发送，不代表用户完成了提醒。

## 8. Snooze、幂等与失败恢复

点击“1 小时后”时：

```text
status → snoozed
snoozed_until → 新时间
notified_at → null
```

投递 dedupe 使用：

```text
instance id + effective due time
```

因此同一有效到期时间不会因网络重试重复发送；明确 snooze 后可以在新时间再次提醒。

`life_notification_deliveries` 同时负责：

- 网络投递去重；
- accepted / failed 记录；
- 最多 3 次重试；
- 卡住的 reserved 超时恢复；
- 记录实际 provider 与 fallback 状态。

## 9. 云端调度

实例物化：

```text
life-reminder-materialize-v1
每天执行
```

通知调度仍复用现有 cron：

```text
life-pushplus-reminders-v1
*/5 * * * *
```

这里的 cron 名称是历史名称；实际 Reminder Center dispatcher 已经具备按来源选择 provider 的能力，并不再意味着所有提醒都只走 PushPlus。

小信箱来信实例在信件第一次真正进入 `sent` 时即时生成，随后由最多约 5 分钟一次的统一调度投递。

## 10. 2026-09-07 微信公众号验收

已经完成：

```text
微信测试号 AppID / AppSecret                    ✅ Vault
Cat OpenID                                      ✅
Fish OpenID                                     ✅
「团子来信 💌」模板                             ✅
Cat 单独模板消息                                ✅ 实收
Fish 单独模板消息                               ✅ 实收
Cat → Fish 定向测试                             ✅ 无串人
Fish → Cat 定向测试                             ✅ 无串人
小信箱微信公众号主通道代码                     ✅ Production DB
PushPlus fallback                               ✅ Production DB
```

真实 provider 测试：

- 直接微信公众号发送：Cat / Fish 均返回 `wechat_test_account` 成功；
- 完整 Reminder Engine 测试 Cat：`wechatSent=1`、`pushplusFallbackSent=0`；
- 完整 Reminder Engine 测试 Fish：微信请求遇到一次瞬时 `SSL_ERROR_SYSCALL`，系统自动切到 PushPlus，`pushplusFallbackSent=1` 且投递成功；
- 两次端到端测试生成的临时 reminder / delivery 数据均已清理，残留为 0。

这同时验证了“公众号正常走主通道”和“公众号临时不可用时 PushPlus 自动兜底”两条路径。

## 11. 当前扩展原则

未来生理期、睡眠、饮食、天气等提醒仍统一复用：

```text
业务模块
→ Reminder Engine
→ Reminder Instance
→ Notification Delivery
→ Provider
```

不要为每个模块单独创建定时任务或各写一套微信发送逻辑。

公众号测试稳定后，再决定是否把药箱 / 纪念日 / 自定义提醒切到公众号，以及是否申请正式的「团子」公众号。