# 当前状态与 Roadmap

**状态日期：2026-09-21**
**当前正式产品：伴岛 / Beside（小岛）**

本文件只维护“现在是什么状态”。历史实施过程、旧部署记录和阶段验收不在这里重复堆积。

## 1. 当前结论

2026-09-15 已将月历及全站共享缓存刷新修复发布 Production，部署 READY。自动回归与线上匿名页面检查通过；真实账号保存后的端到端刷新尚缺登录会话验收，不将匿名页面检查等同于真实数据写入验收。2026-09-21 又完成 GitHub migration 历史与 Production Supabase ledger 的一致性收口；本次只整理仓库历史与文档，没有修改 Production schema，也没有触发 Web 部署。

当前事实分三层维护：

```text
Production Web
!= GitHub main
!= Supabase 当前 schema / runtime state
```

`main` 或数据库 migration 可以在受控情况下领先 Web Production，但只有真实发布完成的内容才写成“已上线”。

## 2. 正式项目身份

```text
中文名        伴岛
英文名        Beside
日常称呼      小岛
GitHub        JIDAIN/beside
Vercel Project beside
Production    https://couple-better-game.vercel.app
```

`couple_better_game` / `couple-better-game` 只保留为历史名称、兼容 slug、缓存 key、MCP 内部标识或既有 Production 地址，不再代表当前正式产品名。

`Island Life` 可以继续作为生活域 / 架构术语；`Legacy Game` 是旧“变瘦变美大作战”游戏子系统术语。

## 3. 当前 Production Web

当前 Vercel Production：

```text
deployment: dpl_9VcNvuPrXogywWixknPS7z97qN1P
state: READY
target: production
source commit: 0bd6f5fa6a7f96a4dac6311feb73322249fe4245
```

本次为 2026-09-15 用户明确允许推送 main 并部署 Production 后的受控发布。修复提交为 `8d7847254cbe343b74ce7b34a1e08af71e718852`，文件树与本地已测试提交 `85081e8` 完全一致；部署提交只额外临时开启 Git deployment，任务建立后已在 `4d1669d8` 恢复关闭。

上线后已验证：

- `https://couple-better-game.vercel.app/` 返回 HTTP 200；
- 首屏直接显示 `9月15日星期二`；
- 根页面响应为 `private, no-cache, no-store`，不再把部署日缓存成首页“今天”；
- `/food` 返回 HTTP 200；
- metadata 正式显示“伴岛”；
- 最新 Production 检查窗口未发现 error / fatal runtime 日志。

首页当前实现为：

```text
每次请求
-> 服务端按 Asia/Shanghai 计算业务日期
-> 作为 initialDate 传给 TodayLifePage
-> 根页面动态渲染
```

对应 source regression test 已加入，禁止重新退化为 build-time date。

## 4. 当前 GitHub main

发布后已经重新关闭 Git 自动部署：

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

当前 Production 已发布的业务代码：共享查询缓存订阅、GET 超时与重试、月历缓存持久化与隔离、页面前台校验、启动预取削减，以及提醒/AI/恢复后的刷新路径。详细机制见 `04-api-and-sync.md`。

2026-09-21 的 main 额外包含数据库历史维护：将 63 个 Production ledger migration 的仓库文件 version / 相对顺序恢复为真实 Production 顺序，从 Production ledger 原始 statements 补回缺失的 `add_auth_pairing_bootstrap`，并将微信 helper 的非-ledger 历史步骤显式标记为 replay-only。相关改动不改变当前 Production runtime schema。

验证：66 个测试文件、381 项本地测试通过；Lint 无错误（3 条既有警告），生产构建通过。修复提交及恢复保护后的 main 均通过 GitHub CI。临时部署提交有 4 项断言要求 deploymentEnabled=false 而失败，其余 377 项通过；恢复保护后 CI 全绿，未删除或放宽这些断言。

线上浏览器已验证月历心情/饮食/睡眠切换、上/下月切换及饮食导航；未登录月度 API 返回 401。首页显示 9 月 15 日，首页/日历/饮食返回 no-store。部署检查窗口未发现 error/fatal runtime 日志。

浏览器没有可用的真实账号会话，因此尚未执行真实账号保存/删除、跨设备 MCP 写入和弱网恢复的完整线上验收；相关缓存与月历行为已由自动测试覆盖。未写入真实测试记录，无 migration。本轮修复已上线，后续文档提交不触发部署。

## 5. Supabase 当前状态

Production Supabase：

```text
project: couple-better-game（历史兼容项目名）
status: ACTIVE_HEALTHY
region: ap-northeast-1
```

数据库项目名仍为历史兼容标识，不代表产品品牌回退。

2026-09-21 已核对 `supabase_migrations.schema_migrations` 与 GitHub `supabase/migrations/`：Production ledger 的 63 个 migration 名已全部有仓库对应文件，公共 migration 相对顺序倒置为 0；仓库另保留 1 个 replay-only 微信 helper 兼容步骤。完整 blank-database replay 尚未在一次性空项目执行，因此这仍是灾难恢复链路的待验收项。

当前已生效的重要 schema / runtime 能力包括：

```text
Meal V2 生命周期                              ✅
主餐每日唯一约束                             ✅
心情删除 / 睡眠删除 RPC                      ✅
Reminder Center / Reminder Engine             ✅
微信公众号测试号 + PushPlus 通知基础设施      ✅
常吃食物 favorite_food_templates              ✅
每日 21:00 记录完整性提醒                     ✅
```

当前 Supabase Advisor 的 `RLS enabled no policy` 为 server-only 架构下的预期 INFO；业务表不应为了消除该提示而开放 anon/authenticated 直连 policy。

## 6. 当前生活功能

```text
今日 / 双人心情、睡眠、活动                  ✅ Production
首页 Asia/Shanghai 动态业务日期               ✅ Production
睡眠按起床日归档                            ✅ Production
心情 / 睡眠删除                             ✅ Production
饮食 Meal V2                               ✅ Production
主餐每日唯一 + 多次加餐事件                  ✅ Production
餐食营养明细 + 汇总                         ✅ Production
餐食私有照片 / 压缩 / 旋转 / 显示缩放        ✅ Production
常吃食物模板                                ✅ Production
历史日期生活详情维护                         ✅ Production
心情 / 饮食 / 睡眠统一月度回顾               ✅ Production
体重                                         ✅ Production
家庭药箱                                     ✅ Production
小信箱 V2                                    ✅ Production
Reminder Center                              ✅ Production
每日 21:00 记录完整性提醒                    ✅ Production Supabase
数据导出 / 导入 / 备份 / 恢复                ✅ Production
Legacy Game 保留并隔离                       ✅ Production
```

## 7. 饮食当前事实

```text
mealType     breakfast | lunch | dinner | snack
snackPeriod  morning | afternoon | night
status       estimated | confirmed
```

数量语义：

- 每人每天早餐 / 午餐 / 晚餐各最多一条有效记录；
- snack 是独立进食事件，同一时段允许多条；
- 每条加餐独立保存时间、照片、items、营养并独立编辑 / 删除。

AI 语义：

- 讨论 / 估算不自动持久化；
- 新 Meal 先在聊天中形成草稿，确认后正式写入；
- “记录这顿饭 / 全部记录”在确认后直接创建 `confirmed`；
- 只有明确饭前估算才创建 `estimated`；
- 补充已有餐食更新同一 Meal；
- 饭后确认替换实际 items / 汇总并保留原 `mealDate / eatenAt`。

`favorite_food_templates` 是 Cat / Fish 各自隔离的常吃食物模板：加入餐食时复制到普通 `meal_items`，当日临时份量不会反向覆盖模板，模板修改也不会回写历史 Meal。

## 8. Reminder Center / 微信提醒

当前正式链路：

```text
业务模块 / 自定义提醒
        ↓
Reminder Engine
        ↓
life_reminder_rules / life_reminder_instances
        ↓
Supabase pg_cron
        ↓
life_notification_deliveries
        ↓
按 source_kind 选择 provider
```

通道策略：

```text
mailbox
  -> 微信公众平台测试号（主）
  -> PushPlus fallback

自定义提醒 / 药箱 / 纪念日 / 每日记录完整性
  -> PushPlus
```

每日 21:00 完整性提醒对 Cat / Fish 独立检查：心情、睡眠、confirmed 早餐、午餐、晚餐；五项完整则静默，任一缺失则汇总成一条提醒。`estimated` 与 `snack` 不算必填完成项。

完整说明见 `docs/14-wechat-reminders.md`。

## 9. 小信箱当前事实

```text
mailbox_letters.status = draft | sent

draft -> 仅寄件人可见，可编辑 / 删除 / 寄出
sent  -> 寄件人与收件人可见，永久只读
```

当前 UI 包含收信箱 / 已寄出 / 待寄出、手札 / 明信片筛选、月份筛选、手札分页与水平横向明信片。首次真正进入 `sent` 时，只给 recipient 生成一次 mailbox reminder；微信提醒不包含正文。

## 10. AI / MCP 当前架构

```text
Harbor Cat   -> Harbor-Cat MCP  -> OAuth cat  -> /mcp
Harbor Fish  -> Harbor-Fish MCP -> OAuth fish -> /mcp
其他 MCP client                               -> /mcp
程序内置 AI                                   -> /api/ai/chat
                                               ↓
                                      AI Access Core
                                               ↓
                                   canonical domain services
                                               ↓
                                           Supabase
```

稳定工具面：

```text
life_capabilities
life_query
life_mutate
```

身份来自登录 / OAuth / 服务端签名上下文，不从昵称、自称或普通参数推断。AI 不获得任意 SQL。

未来新增 `cycle` 等 domain，继续扩展 canonical service + registry；需要提醒时再接 Reminder Engine，不重建基础设施。

## 11. 身份与安全边界

- Web session 绑定签名后的 `partnerKey`；
- MCP authorization code / access token / refresh token 绑定 actor；
- mood / sleep / meal / weight 等个人数据 owner-only 写入；
- activity 单方记录本人维护，`both` 共同活动双方可维护；
- medicine / 纪念日等明确共享事实按 couple-space 规则维护；
- mailbox sender / recipient 由服务端身份决定；
- 微信 OpenID、AppSecret、PushPlus token 等只保存在服务端 / Vault；
- 浏览器不持有 Supabase service role。

详细矩阵见 `docs/17-auth-and-pairing.md`。

## 12. 数据域边界

始终保持：

```text
实际饮食摄入
!= Legacy Game deficit
!= 真实体重
!= 运动 / 活动
```

普通 Life 清理 / import / restore 默认不得触碰 Legacy Game。完整 allowlist 见 `docs/48-life-legacy-game-data-boundary.md`。

## 13. 当前已知边界

- 一条 Meal 当前只正式绑定 1 张展示照片；
- 多图可以参与 AI 分析，但没有多图持久化模型；
- 内置网页 AI 与 ChatGPT MCP 的附件能力不完全相同；
- 某些 MCP client 不透传图片字节时需要 media recovery；
- Mailbox 暂无 per-user archive / hide-sent-copy 状态；
- 微信公众平台当前使用测试号能力；
- Production 自动部署长期关闭。

这些都不是当前正常使用的阻塞项。

## 14. 下一步

默认进入“正常使用 + 小步迭代”：

1. 继续按真实使用反馈修复具体问题，不做无目标大重构；
2. 新增生理期等 domain 时复用现有 AI Access Core / Reminder Engine；
3. 定期做权限、数据恢复、通知链路和 Production smoke 回归；
4. 每次功能变化同步维护对应唯一主文档，避免状态文档再次漂移。

## 15. 部署纪律

任何 Preview / Production deployment 都必须获得用户**针对该次发布**的明确授权。

```text
commit / push / CI success != deployment authorization
```

发布完成后继续保持：

```text
vercel.json -> git.deploymentEnabled=false
```