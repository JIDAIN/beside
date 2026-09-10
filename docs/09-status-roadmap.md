# 当前状态与 Roadmap

**状态日期：2026-09-10**  
**当前结论：主餐唯一 / 加餐事件模型、统一月度回顾和睡眠交互已经收尾并进入 Production。**

Harbor 当前 Project 指令模板：`docs/46-harbor-mcp-project-instructions.md`。

## 1. 当前收尾结论

这轮不再存在需要阻止 Production 使用的核心功能缺口。

已经完成并通过代码 / 数据库 / 实机或 CI 验收的主线包括：

```text
Island Life 主页面与双人生活记录              ✅ Production
无感加载 / stale cache / 前台恢复校验          ✅ Production
Meal CRUD / 营养 / 照片 / AI 草稿确认          ✅ Production
Meal V2 补录 / 单图直记 / 饭前饭后生命周期     ✅ Production
主餐每日唯一 + 多次加餐独立照片事件            ✅ Production
历史饮食 / 心情 / 睡眠 / 活动查看与编辑         ✅ Production
睡眠按起床日归档 + 心情/睡眠删除                ✅ Production
心情 / 饮食 / 睡眠统一月度回顾                  ✅ Production
Harbor Cat / Fish direct MCP + AI Access Core  ✅ Production
Cat / Fish 服务端身份与写权限边界              ✅ Production
Reminder Center V1 + Reminder Engine            ✅ Production
PushPlus 双身份投递链路                         ✅ 已验收
药箱 / 纪念日提醒                               ✅ Production
小信箱来信提醒                                 ✅ Production + Fish 微信投递验收
小信箱 V2 draft / sent 数据模型与权限           ✅ Production
小信箱三箱 UI / 信纸分页 / 横向明信片            ✅ Production
mood delete Web/API/MCP                         ✅ Production
sleep delete Web/API/RPC                        ✅ Production
activity / weight actor-aware 权限               ✅ Production
Legacy Game 保留与生活域隔离                    ✅ Production
```

本轮发布前最后一轮代码 CI：

```text
Test  ✅
Lint  ✅
Build ✅
```

2026-09-10 本次 Production deployment 已完成；对应一次性部署授权已经消耗，后续如需再次发布必须重新获得明确授权。

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

小信箱来信提醒复用同一 Reminder Engine：信件第一次真正进入 `sent` 时，只给 `recipient` 生成一条 `source_kind=mailbox` 的 reminder instance；保存 / 编辑 draft 不触发，微信提醒不包含正文。2026-09-07 已验证 Cat → Fish 明信片来信实例生成，并在下一轮 5 分钟调度中得到 PushPlus `accepted` 投递结果。

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
寄出后收件人来信提醒                        ✅ Reminder Center + PushPlus
```

AI / MCP 语义：

```text
“帮我写 / 起草”        -> draft
“现在寄出 / 发给 Ta”   -> sent
已有 draft + 明确寄出  -> 同一 id draft -> sent
已 sent update/delete  -> 拒绝
```

真实 Supabase 事务验收：

```text
Cat 创建 / 修改自己的 draft                 ✅
Fish 看不到 / 不能修改 Cat draft            ✅
draft -> sent                               ✅
寄出后双方可见                              ✅
Cat / Fish 修改 sent                        ✅ 被拒绝
Cat / Fish 删除 sent                        ✅ 被拒绝
旧 schemaVersion=1 备份恢复                  ✅ 自动按 sent 兼容
测试事务残留                                ✅ 0
```

来信提醒规则：

```text
保存 / 编辑 draft       -> 不提醒
第一次进入 sent         -> 仅 recipient 生成 1 条 mailbox reminder
已 sent 后续读取         -> 不重复生成
微信内容                 -> 只提示收到手札 / 明信片，不展示正文
```

## 7. 饮食、营养与照片

默认摄入分析优先级：

```text
用户明确文字 > 餐前 / 餐后差分 > 单图估算
```

持久化规则：

```text
讨论 / 估算 / 修正 ≠ 保存
明确确认保存 -> 才写入
```

图片处理：

```text
EXIF normalize
→ 最长边 600px
→ WebP quality 70
→ >120 KB 再逐步降质量
→ 最低 quality 55
→ 一般目标 50～100 KB
```

当前一条正式 meal 绑定 1 张展示照片；多图可参与 AI 分析，但暂不做多图持久化模型。

2026-09-10 已完成 Meal V2 收口并发布 Production：分类改为四类主餐/加餐、加餐时段
合并为 morning/afternoon/night、状态改为 estimated/confirmed，并为 AI Access Core
增加补录与饭后确认同一 Meal 的动作；对应 migration 已在 Production 执行。

同日补充单图记录边界：单张餐前照片配合明确的“记录整顿饭/全部热量”意图，草稿确认后
直接创建 confirmed Meal；只有明确要求饭前估算并保留饭后确认流程时才使用 estimated。
饭后确认会丢弃旧估算汇总并按实际 items 重算。2026-09-09 Fish 被误记为第二条早餐的
Venchi 黑巧克力已核对为上午加餐，数据修复为 snack + morning。

本轮继续收紧 Meal 数量边界：早餐、午餐、晚餐改为每人每日各一条的应用层预检 + 数据库部分唯一索引；加餐明确为可重复事件，同一时段多次进食继续分别保存照片、明细、营养和时间。月度回顾的我 / Ta 切换移到标题行，仅饮食和睡眠显示；三种月历统一采用心情月历背景。饮食页人物切换同步移到标题右侧，首页睡眠卡不再重复提供月历入口。

历史详情维护也已上线：从月历进入任意历史日期后，可以查看并编辑该日期的饮食、心情、
睡眠与活动。个人数据仍只能修改当前登录用户自己的记录；活动继续服从 owner / both
权限。历史活动新增时，`occurred_at` 使用所选业务日期，不使用实际点击保存当天。

## 8. 无感加载 / 数据同步

当前流程：

```text
先显示 Cat/Fish scope 下的本地 stale cache
→ mount 后后台强制校验
→ focus / visibilitychange 后后台强制校验
→ online 后后台强制校验
```

已验收：ChatGPT 写入后，从 ChatGPT 切回网页无需手动刷新即可出现最新数据；餐食照片与日历心情不再依赖整页刷新。

## 9. 数据与安全

生活数据继续采用：

```text
RLS enabled
+ anon/authenticated 无直接表权限
+ service_role / canonical actor-aware RPC 访问
```

已验证 actor-aware RPC：

```text
activity create / update / delete      ✅
weight create / update / delete        ✅
mailbox list / create / update draft   ✅
mailbox send / delete draft            ✅
mood delete                            ✅
reminder instance mutation             ✅
```

当前封闭服务端架构下，Supabase Advisor 的 `RLS enabled no policy` 属于预期 INFO，不为消除提示而开放客户端 policy。

## 10. Legacy Game 与生活域

必须继续保持：

```text
实际饮食摄入 ≠ Legacy Game deficit ≠ 真实体重 ≠ 运动
```

展示层可以按 `partnerKey + date` 关联，但一个 domain 不自动覆盖另一个 domain。

详细说明见 `docs/48-life-legacy-game-data-boundary.md`。

## 11. 当前 Production

Primary domain：`https://couple-better-game.vercel.app`

```text
deployment: dpl_9YzBipVW9PQF3Si8hGrmVxUyTXzD
state: READY
target: production
source commit: 3ecd159c9e8a47f470726c27bab48603eecf2d35
```

当前 Production 已包含：

```text
Reminder Center V1 UI closeout
mood delete Web/API/MCP
Cat / Fish activity + weight 权限加固
Mailbox V2 Web/API/AI
Mailbox 最终纸张 / 横向明信片视觉
Mailbox arrival reminder -> Reminder Engine -> PushPlus
本轮收尾文档基线之前的正式功能代码
```

最新小信箱提醒发布后已验证：

```text
/me/reminders             HTTP 200
Cat -> Fish 明信片        reminder instance 已生成
下一轮 5 分钟调度         PushPlus accepted
最近 30 分钟 runtime error  0
```

最新 Production deployment 为 `dpl_7Hg1BTDuiVqTZCWBa1j2A6iV7C6E`，构建 source commit `7c4bb5cbc2dbd96f7c2b439278f2b3112e4e08d8`（功能提交 `d449b6836a97fa349bc371419613cf4c6a4459b9`）。发布后 `/calendar`、`/calendar?view=food`、`/calendar?view=sleep` 与 `/food` 均返回 HTTP 200，最近 30 分钟 runtime error 为 0。主餐唯一 migration 已在 Production 执行；事务回滚 smoke test 确认第二条同日主餐被唯一索引拒绝，而同一下午的两条加餐均可创建。旧枚举数据均为 0，2026-09-09 Fish 保留 1 条早餐，Venchi 黑巧克力保留为 1 条上午加餐。后续文档提交不会触发新的 Production。

当前 `vercel.json`：

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

## 12. 已知边界（非本次上线阻塞项）

- Mailbox V2 暂不支持“寄出后只隐藏自己已寄出副本”的 per-user archive state；如以后需要，应增加 per-user mailbox view state，而不是删除原信；
- 一条 meal 当前只正式绑定 1 张展示照片；
- 餐前 / 餐后可一起用于 AI 分析，但还没有多图持久化模型；
- Server-side vision recognizer 没有配置对应识别能力时会安全跳过，不影响照片保存；
- 某些 MCP 客户端不透传图片字节时仍可能需要 browser recovery；
- 内置网页 AI 的附件能力与 ChatGPT Project 多图会话能力不完全相同；
- `drive-bridge-staging` 仍有一个空 bucket 可在后续维护时删除；
- Production 自动部署长期保持关闭。

这些项目都可以作为后续需求驱动的迭代，不需要继续拖延当前版本收尾。

## 13. 下一步候选

当前版本上线后，默认进入“正常使用 + 小步迭代”阶段：

```text
1. 实际使用中发现问题再修，不再继续无目标大改
2. 新增生理期等生活 domain 时复用 AI Access Core + Reminder Engine
3. 确实需要时再设计 Mailbox per-user archive state
4. 确实需要时再设计 meal 多图持久化
5. 定期做权限 / 数据恢复 / Production smoke 回归
```

## 14. 部署纪律

任何新的 Production deployment 都必须获得用户当次明确授权。一次“允许部署”只授权当前一次部署；完成后必须继续保持 `git.deploymentEnabled=false`。
