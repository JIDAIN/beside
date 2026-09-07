# 当前状态与 Roadmap

**状态日期：2026-09-07**  
**当前结论：本轮核心改造已收尾并进入 Production。**

Harbor 当前 Project 指令模板：`docs/46-harbor-mcp-project-instructions.md`。

## 1. 当前收尾结论

这轮不再存在需要阻止 Production 使用的核心功能缺口。

已经完成并通过代码 / 数据库 / 实机或 CI 验收的主线包括：

```text
Island Life 主页面与双人生活记录              ✅ Production
无感加载 / stale cache / 前台恢复校验          ✅ Production
Meal CRUD / 营养 / 照片 / AI 草稿确认          ✅ Production
Harbor Cat / Fish direct MCP + AI Access Core  ✅ Production
Cat / Fish 服务端身份与写权限边界              ✅ Production
Reminder Center V1 + Reminder Engine            ✅ Production
PushPlus 双身份投递链路                         ✅ 已验收
药箱 / 纪念日提醒                               ✅ Production
小信箱来信提醒                                 ✅ Production + Fish 微信实收链路验收
小信箱 V2 draft / sent 数据模型与权限           ✅ Production
小信箱三箱 UI / 信纸分页 / 横向明信片            ✅ Production
mood delete Web/API/MCP                         ✅ Production
activity / weight actor-aware 权限               ✅ Production
Legacy Game 保留与生活域隔离                    ✅ Production
```

本轮发布前最后一轮代码 CI：

```text
Test  ✅
Lint  ✅
Build ✅
```

2026-09-07 本次 Production deployment 已完成；对应一次性部署授权已经消耗，后续如需再次发布必须重新获得明确授权。

## 2. 产品与固定身份

当前主产品：**Island Life / 情侣成长小岛**。早期“变美变瘦大作战”继续作为 Legacy Game 子系统保留。

Harbor Cat：

```text
Harbor-Cat OAuth actor = cat
我 = cat
Ta / 对象 = fish
团子 = AI 昵称
```

Harbor Fish：

```text
Harbor-Fish OAuth actor = fish
我 = fish
Ta / 对象 = cat
```

AI 昵称、用户自称或普通文本里的 `cat / fish` 不参与鉴权。身份只来自登录 / OAuth / 服务端签名上下文。

## 3. 当前 AI 架构

```text
Harbor Cat Project  → Harbor-Cat MCP  → OAuth cat  → /mcp
Harbor Fish Project → Harbor-Fish MCP → OAuth fish → /mcp
其他 MCP client                                 → /mcp
程序内置 AI                                     → /api/ai/chat
                                                ↓
                                        AI Access Core
                                                ↓
                                      canonical services
                                                ↓
                                            Supabase
```

Supabase 是正式生活数据事实源。

已验收：

```text
Harbor-Cat life_query / life_mutate              ✅
Harbor-Fish life_query / life_mutate             ✅
ChatGPT 图片 → meal + private photo              ✅
ChatGPT 写入 → Supabase → 网页恢复后自动刷新     ✅
网页删除 / 修改 → Supabase                       ✅
MCP token-bound identity                         ✅
```

未来新增生理期等生活 domain 时，继续扩展 domain service + AI Access Core / MCP tool，不重做整套 AI 接入。

## 4. 身份与权限边界

当前正式边界：

- Web session 使用 HMAC 签名 `partnerKey`；
- MCP authorization code / access token / refresh token 绑定签名后的 `partnerKey`；
- mood / sleep / meal / weight 等个人数据遵守 owner-only 写入；
- medicine、纪念日等明确属于 couple-space 的数据由双方共同维护；
- reminder instance 操作绑定当前 actor；
- PushPlus token 按 actor 独立并保存在 Supabase Vault；
- activity 单方记录只能本人写，共同活动双方可维护；
- mailbox sender / recipient 由 signed actor 在服务端确定，前端不能伪造。

详细矩阵见 `docs/17-auth-and-pairing.md`。

## 5. Reminder Center V1

正式链路：

```text
生活模块 / 自定义提醒
        ↓
Reminder Engine
        ↓
life_reminder_rules / life_reminder_instances
        ↓
网页提醒中心 + Supabase pg_cron
        ↓
life_notification_deliveries
        ↓
PushPlus
        ↓
Cat / Fish 对应微信
```

当前能力：

```text
自定义提醒                                  ✅
今天 / 即将到来 / 已完成                    ✅
完成 / 忽略 / 1 小时后                     ✅
药箱到期提醒                                ✅
药箱提醒开关 / 提前天数                     ✅
纪念日进入 Reminder Center                  ✅
小信箱来信进入 Reminder Center              ✅
首页最近 3 条提醒                           ✅
PushPlus 状态整合到提醒设置                 ✅
PushPlus 云端 5 分钟调度                    ✅
Cat / Fish 独立 token 与独立实例            ✅
both → Cat / Fish 双实例投递                ✅
```

`snooze` 会重置 `notified_at`，并按新的 effective due time 生成新的 delivery dedupe key；因此已推送的提醒可以在明确点击“1 小时后”后合法再次推送，而不会因为网络重试造成重复轰炸。

小信箱来信提醒不依赖独立的第二套微信逻辑：信件真正寄出时只为收件人创建一条 `mailbox` reminder instance，随后继续走统一 Reminder Engine → pg_cron → PushPlus 链路。草稿保存、草稿编辑不会触发，提醒内容不包含正文。2026-09-07 已验证 Cat → Fish 明信片寄出后实例生成，并在下一轮 5 分钟调度中得到 PushPlus `accepted` 投递结果。

完整说明见 `docs/14-wechat-reminders.md`。

## 6. 小信箱 V2

数据模型：

```text
mailbox_letters.status = draft | sent

draft -> 只有寄件人可见，可编辑 / 删除 / 寄出，sent_at = null
sent  -> 寄件人与收件人可见，永久只读，sent_at = 实际寄出时间
```

当前 Web / API / AI：

```text
收信箱 / 已寄出 / 待寄出                    ✅
手札 / 明信片筛选                           ✅
月份筛选                                   ✅
三箱不同时间戳语义                         ✅
手札整页信纸编辑 + 阅读翻页                 ✅
明信片始终水平横向                         ✅
邮票 / 邮戳 / 地址线 / 风景装饰             ✅
待寄出可编辑 / 删除 / 寄出                  ✅
寄出后不可编辑 / 删除                       ✅ 服务端 + RPC
AI draft / sent 语义                        ✅
寄出后给收件人生成 mailbox 来信提醒          ✅
来信提醒进入 PushPlus 微信链路               ✅
```

AI / MCP 语义：

```text
“帮我写 / 起草”        -> draft
“现在寄出 / 发给 Ta”   -> sent
已有 draft + 明确寄出  -> 同一 id draft -> sent
已 sent update/delete  -> 拒绝
```

提醒语义：

```text
保存 / 编辑 draft       -> 不提醒
首次进入 sent           -> 只给 recipient 生成 1 条 mailbox reminder
已 sent 的后续读取       -> 不重复提醒
微信内容                 -> 只提示收到手札 / 明信片，不展示正文
```

## 7. 当前维护状态

当前版本已经从“集中重构”进入：

```text
正常使用
+ 小步迭代
+ 新生活 domain 复用既有基础设施
```

后续新增生理期、真正需要准时触发的生活提醒等能力时，应优先复用：

```text
身份层          -> fixed Cat / Fish auth
数据写入        -> canonical domain service / RPC
AI              -> AI Access Core + MCP
提醒            -> Reminder Engine + PushPlus
UI              -> Island Life design system + App* patterns
```

不再为单个新模块重复造鉴权、AI 接入、通知或视觉基础设施。

## 8. 下一步原则

当前没有必须阻止使用的 P0 / P1 缺口。下一轮应按真实使用中的需求小步推进，而不是继续无目标重构。

优先级原则：

1. 先处理真实使用中暴露出的错误或摩擦；
2. 再增加明确高价值的新生活 domain；
3. 新能力尽量复用现有 AI Access Core、Reminder Engine 和 actor-aware 数据边界；
4. Production 部署继续逐次向用户申请，不恢复 Git 自动部署。
