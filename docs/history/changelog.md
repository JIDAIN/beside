# Changelog

## 使用说明

本文件按时间记录**当时发生了什么**，属于历史演进记录，不是当前产品状态或当前工程事实源。

历史条目保留当时的验收结论、未完成项和运行状态，不因为后来情况变化而回写篡改。

判断当前状态时统一看：

- [Engineering Current State](../engineering/current-state.md)：Production / GitHub main / Supabase 当前状态；
- [Docs MOC](../README.md)：当前工程事实的导航与优先级。

如果本 Changelog 与 current docs、当前代码或已核验 runtime 不一致，应理解为“历史状态后来发生了变化”，不能用旧条目覆盖当前事实。


## 2026-09-21 — Supabase migration 历史与文档一致性收口

- 直接对账 Production `supabase_migrations.schema_migrations`、当前 runtime schema 与 GitHub `supabase/migrations/`，确认此前仓库 migration 时间戳和相对顺序与 Production ledger 存在明显漂移。
- 将 Production ledger 中 63 个同名 migration 的仓库文件 version / 顺序恢复为真实 Production 顺序；公共 migration 相对顺序倒置从 45 组收敛为 0。
- 从 Production ledger 保存的原始 `statements` 恢复缺失的 `20260902150933_add_auth_pairing_bootstrap.sql`，补齐后续 hardening migration 的历史依赖。
- 微信测试号 helper 在 Production runtime 中存在，但没有独立同名 ledger 记录；仓库将其显式改名为 `20260907110000_replay_only_wechat_test_account_probe.sql`，只承担空库重放兼容，不冒充 Production ledger migration。
- 同步修正测试与历史文档中的旧 migration 路径；`docs/architecture/data-model.md` 补齐 Reminder `source_kind=mailbox`，并更新 API / 运维 / 状态文档日期与 migration 排障边界。
- 本轮没有执行 Production schema 变更，也没有触发 Vercel Preview / Production。完整 64 个 SQL 的一次性空库 replay 尚未实际执行，保留为灾难恢复验收边界。

## 2026-09-15 — 月历与全站读取刷新修复（已发布）

- 共享缓存增加组件订阅、失效主动重读、跨标签页通知与可见页面每 30 秒校验；MCP/另一设备新记录通过后台读取收敛。
- GET 增加超时，共享查询释放挂起请求并退避重试；保留旧内容，防止旧响应覆盖刚保存的记录或新账号数据。
- 月度 bundle 纳入持久化，不再用月快照批量覆盖日缓存；削减启动时低频页面的并行预取。
- 提醒中心、微信绑定状态、游戏饮食、内置 AI 与 Life 导入/恢复补齐刷新路径；游戏保留未同步本地编辑保护。
- 增加共享缓存 React 行为测试、请求边界测试，以及实际心情/饮食/睡眠月历更新和删除的组件回归。
- 经明确授权已发布 `dpl_9VcNvuPrXogywWixknPS7z97qN1P`（source `0bd6f5fa`），自动部署已恢复关闭，无数据库变更。修复及恢复保护后的 CI 成功；部署过渡提交仅 4 项自动部署关闭断言失败，恢复后通过。
- Production 月历视图/月份切换、饮食导航及匿名接口边界已检查；缺少真实账号会话，尚未完成真实写入后的线上端到端验收。

## 2026-09-14 — 文档事实源收口与首页业务日期修复

- 修复首页静态首屏把部署日固定为“今天”的问题：根页面改为每次请求按 `Asia/Shanghai` 计算业务日期，并作为 `initialDate` 传给 `TodayLifePage`；新增回归测试，禁止重新退化为 `useState(() => localIsoDate())` 的 build-time 日期。
- 统一当前正式项目身份为 **伴岛 / Beside（小岛）**；`couple-better-game` 仅保留为历史名称、兼容 slug、缓存 key、MCP 内部标识或 Production 兼容地址。
- 重建 `README.md`、`docs/product/overview.md`、`docs/architecture/overview.md`、`docs/engineering/current-state.md`、`v2-evolution/10-v2-life-redesign.md`、`docs/architecture/ai/architecture.md` 的当前事实口径。
- `docs/engineering/current-state.md` 现在明确区分 Production Web、GitHub main 与 Supabase schema/runtime，避免数据库 migration 已生效却被误写成 Web 已部署。
- 当前文档纳入常吃食物、微信公众号测试号主通道 + PushPlus fallback、每日 21:00 记录完整性提醒等已生效能力。
- 将 2026-09-11 的“饮食编辑页与 Service Worker 收口”阶段报告移入 `v2-evolution/`，并在文档索引中补充长期有效的 Meal V2 lifecycle。
- 本轮**未获得 Production 部署授权，因此不发布 Web**；首页日期修复等待下一次明确授权。Supabase 每日完整性提醒已在本轮之前独立生效。
- `vercel.json` 继续保持 `git.deploymentEnabled=false`。

## 2026-09-11 — 常吃食物、紧凑饮食编辑器与 Service Worker 收口

- 新增按 Cat / Fish 隔离的 `favorite_food_templates`：独立维护常吃食物，餐食编辑时直接复用，加入 Meal 时复制模板字段，不与历史餐食建立持续引用。
- 饮食页增加常吃食物独立入口；新增食物先选择“新的食物 / 常吃食物”，固定食品不必重复录入名称、图片和营养信息。
- 餐食编辑页收口为更紧凑的移动端结构；照片使用左侧缩略图 + 右侧操作，旋转 / 缩放移入独立 bottom sheet。
- Service Worker 停止在慢网下优先回退旧导航 HTML，清理旧 life-shell cache，并在注册、focus、online、visibilitychange 时主动检查更新，减少旧页面长期驻留。
- 对应常吃食物 schema 已进入 Production Supabase；Web 能力已完成受控 Production 发布。
- 当前最新 2026-09-11 Production deployment：`dpl_99YXhXyGijb6oqSTeDEt7u9qNSfc`，source commit `5ab2b82eba7246a8b14bd3a2e7ede4df44282f42`，READY。
- 发布完成后自动 Git 部署重新关闭。

## 2026-09-10 — 饮食编辑页可靠性与移动端收口

- 修复餐食主记录保存成功、照片上传失败后仍停留在新增态的问题：立即缓存并锁定同一 Meal，后续只重试照片，避免重复加餐或主餐唯一冲突。
- 编辑链接缺少人物时改为跟随当前签名账号，默认日期改用浏览器本地业务日；非法日期、身份或新增餐次参数不再静默降级。
- 编辑页支持纠正早餐 / 午餐 / 晚餐 / 加餐及加餐时段，服务端既有 owner-only 权限和主餐唯一约束保持不变。
- 移动端改为照片、营养合计、食物明细分区；基础字段常显，高级营养折叠，字段补齐标签与单位，长表单增加固定保存操作和未保存离开保护。
- 部分食物缺营养时不再把部分求和显示为整餐合计；校验失败会定位缺名称的食物。
- AI / Harbor Project Instructions 本轮未修改，等待单独确认。

## 2026-09-10 — 主餐唯一与月度回顾视觉统一

- 早餐、午餐、晚餐增加每人每日各一条的应用预检和数据库部分唯一索引；重复写入返回明确冲突，不再产生第二条主餐。
- 加餐保持事件模型：上午、下午、晚上每个时段均可记录多次，每条独立保留时间、照片、食物明细、营养和编辑入口。
- 月度回顾的我 / Ta 切换移到标题行右侧，仅饮食和睡眠显示；三种视图统一使用心情月历背景，领域配色只保留在数值圆块。
- 饮食页我 / Ta 切换移到标题右侧并加宽；首页睡眠卡移除重复月历入口。
- 同步 AI 指令、API、数据模型、UI 规范和回归测试。
- Production deployment `dpl_7Hg1BTDuiVqTZCWBa1j2A6iV7C6E` READY；饮食、心情与睡眠月度路由及 `/food` 返回 HTTP 200，发布后最近 30 分钟无 runtime error。
- 主餐唯一 migration 已在 Production 执行并通过事务回滚验证：重复主餐被拒绝，同一时段两条加餐可正常创建；发布后恢复 `vercel.json -> git.deploymentEnabled=false`。

## 2026-09-10 — 统一月度回顾与睡眠交互收口

- 睡眠仍使用既有 `sleep_date + fell_asleep_at + woke_at` 模型，但 `sleep_date` 明确为起床日：今日页面默认记录昨晚入睡到今天起床，跨夜时间自动落到正确日期。
- 心情和睡眠补齐删除按钮、客户端调用、API 与 owner-only 权限校验；新增 service-only `delete_sleep_record` RPC，不允许代删 Ta 的个人记录。
- 日历升级为心情 / 饮食 / 睡眠统一月度回顾。心情保持双人月历；饮食和睡眠按我 / Ta 单人查看，分别固定使用暖色与紫蓝色圆块，人物切换不改变颜色。
- 饮食页和首页睡眠卡片增加对应月历快捷入口；日期格仍可进入该日详细记录。
- Production deployment `dpl_A8twTjXXro2oY5jtwkgDPEQ3664m` READY；`/`、`/calendar`、饮食月历、睡眠月历与 `/food` 均为 HTTP 200，部署后最近 30 分钟无 runtime error。
- 发布完成后已恢复 `vercel.json -> git.deploymentEnabled=false`；睡眠删除 migration 已在 Production 执行并确认仅 `service_role` 可调用。

## 2026-09-10 — 历史生活详情可编辑

- 月历日期详情不再把心情、睡眠和活动统一锁成只读；当前登录用户可以维护所选历史日期中自己的记录，Ta 的个人数据继续只读，活动继续遵守 owner / both 服务端权限。
- 历史详情写入后立即同步 day、month 与 month-bundle 缓存，返回月历不会被旧快照覆盖。
- 历史活动新增会把 `occurred_at` 对齐到所选业务日期，不再错误使用操作当天；切换日期时关闭残留编辑态并刷新活动列表。
- 历史饮食入口明确标为“查看 / 编辑”，并继续把日期传入饮食列表和餐食编辑页，保存或删除后返回同一天。
- Production deployment `dpl_PYMXPTaxy6vt4g1aU89FkZaftDbw` READY；`/`、`/calendar`、`/calendar/2026-09-09` 与 `/food?date=2026-09-09` 均为 HTTP 200，最近 30 分钟无 runtime error。
- 发布完成后已恢复 `vercel.json -> git.deploymentEnabled=false`，后续提交不会自动触发 Production。

## 2026-09-10 — 单图饮食记录与历史异常修复

- 明确单张餐前照片的直接记录语义：用户要求记录整顿饭或全部热量时，草稿确认后直接保存为 confirmed，不等待饭后图；只有明确要求饭前估算时才进入 estimated → confirmed 生命周期。
- 饭后确认不再沿用饭前估算的整餐热量与区间；未显式提供新汇总时，根据实际摄入 items 重新计算。
- 增加 2026-09-09 Fish 饮食异常的数据修复：误记为第二条早餐的 Venchi 黑巧克力更正为上午加餐，不删除真实早餐。
- Meal V2 两个 migration 已在 Production 执行，旧 `other / draft / evening / late_night` 数据归零；Production deployment `dpl_8ocV2TjFkW4ih4EZBcvQ2sLahTj9` READY。

## 2026-09-10 — Meal V2 写入链路收口

- 将饮食分类收敛为 breakfast/lunch/dinner/snack，加餐时段收敛为 morning/afternoon/night，状态收敛为 estimated/confirmed。
- `life_mutate` 新增补录食物与饭后确认动作，自动定位当前账号当天唯一目标 Meal，并强制保留首次记录的 eatenAt。
- 新增兼容 migration：历史 other 转为 snack、evening/late_night 合并为 night、draft 转为 estimated。
- 同步饮食 UI、自然语言归一化、工具能力说明和回归测试；修复 Meal V2 adapter 的错误类型导入。

只记录对理解产品状态有价值的里程碑，不记录每一次样式微调。

## 2026-09-07 — 小信箱来信微信提醒上线

- 小信箱正式接入统一 Reminder Engine：信件第一次真正进入 `sent` 时，只为收件人生成一条 `source_kind=mailbox` 的 reminder instance；保存 / 编辑 draft 不触发提醒，已寄出信件后续读取不会重复生成。
- 来信提醒继续复用现有 Supabase `pg_cron` + `life_notification_deliveries` + PushPlus 投递链路，不新增第二套微信通知系统。
- 微信内容只提示“收到一封新手札 / 新明信片”，不包含信件正文；`mailbox` 来源在 Reminder Center 中显示为“小信箱”。
- Supabase 事务测试覆盖“直接 sent”和“draft → sent”两条路径，测试数据均回滚无残留。
- 实际验收：Cat 寄给 Fish 的明信片在寄出后生成 Fish 的 mailbox reminder；下一轮 5 分钟云端调度完成 PushPlus 投递，delivery 为 `accepted`，`notified_at` 已写入。
- Production deployment `dpl_9YzBipVW9PQF3Si8hGrmVxUyTXzD` READY，source commit `3ecd159c9e8a47f470726c27bab48603eecf2d35`。
- 发布后 `/me/reminders` HTTP 200，最近 30 分钟未发现 runtime error；Production 自动 Git 部署已重新保持关闭。
- 同步收尾 `README.md`、`docs/engineering/current-state.md`、`docs/domains/reminders/overview.md` 与本 Changelog，使当前文档与 Production 行为一致。

## 2026-09-07 — Island Life 本轮收尾正式上线

- 将本轮 GitHub `main` 的核心改造统一发布到 Production：Reminder Center V1 UI closeout、mood delete Web/API/MCP、Cat / Fish activity + weight 权限加固、Mailbox V2 Web/API/AI 与最终小信箱视觉。
- 小信箱正式切换为 `draft / sent` 模型：待寄出只有寄件人可见可改；寄出后双方可见且永久只读。UI 使用收信箱 / 已寄出 / 待寄出三箱、手札 / 明信片筛选、月份归档、整页信纸翻页和始终水平横向的明信片。
- Reminder Center V1 正式上线完整 `今天 / 即将到来 / 已完成 / 提醒设置` 体验与首页最近 3 条提醒；Reminder Engine、药箱、纪念日、snooze 与 PushPlus 云端调度继续复用既有 Supabase 数据层。
- Cat / Fish 的 Web session、MCP token 与 actor-aware RPC 权限边界进入同一 Production 版本；AI 昵称和前端自称不参与鉴权。
- 根目录 `README.md`、`docs/engineering/current-state.md`、`docs/domains/reminders/overview.md` 同步更新为当前 Island Life 架构与正式状态。
- 发布前代码 CI：Test / Lint / Build 全部通过。
- Production deployment `dpl_GC1Ut3u64w5rpZ8iwzRp5nyyvWmm` READY，source commit `7196c2fc843a0ca8d3aae00ed5ea87257a2ff5cf`。
- 发布后 `/`、`/me/reminders`、`/nest/mailbox` 均返回 HTTP 200；Vercel 最近 30 分钟 runtime error 为 0。
- 一次性部署授权已消耗；`vercel.json` 已恢复 `git.deploymentEnabled=false`，后续普通提交不会自动触发 Production。
- 当前版本进入“正常使用 + 小步迭代”阶段，后续生理期等新生活 domain 继续复用 AI Access Core + Reminder Engine，而不是重做基础设施。

## 2026-09-07 — Reminder Center V1 收尾（Supabase 已生效，UI 待 Production 部署）

- 在既有 PushPlus 通知层上完成统一 Reminder Engine：`life_reminder_rules / life_reminder_instances` 作为规则与具体提醒实例，`life_notification_deliveries` 继续只负责投递状态。
- 自定义提醒、药箱到期提醒、纪念日提醒统一进入 Reminder Center；纪念日不再走旧的独立直发分支。
- 药箱提醒按 Cat / Fish 分别支持开关与提前天数，默认 `[30,7,1,0]`，范围 0～90 天；只物化未来约 90 天内实例。
- 修复 snooze 语义：成功推送后点击“1 小时后”会重置 `notified_at`，新的 effective due time 使用新的 delivery dedupe key，可合法再次提醒且不产生网络重试重复推送。
- 新 Reminder Center UI 已进入 GitHub `main`：`今天 / 即将到来 / 已完成`、完整已完成历史、药箱设置、PushPlus 状态、关闭药箱提醒。
- 今日首页新增“接下来”轻量卡片，只展示最近 3 条提醒并跳转完整提醒中心。
- Cat PushPlus 已绑定且真实自动提醒链路已验收；Fish 尚未绑定，因此 Fish / both 的真实微信投递等待后续验收。
- Supabase 已验证 Cat/Fish reminder settings、药箱实例、纪念日实例与两个 cron 任务；此次 UI 代码未获得新的 Production 部署授权，因此线上仍为上一版 Reminder Center UI。
- 同批同步更新 `docs/architecture/data-model.md`、`docs/engineering/current-state.md`、`docs/domains/reminders/overview.md` 和文档索引。

## 2026-09-04 — R8.8 缓存竞态收口与首屏无闪烁（PR #58）

- 为 stale-query 增加 request revision barrier：早于本地/read-back 写入启动的旧请求不再有资格覆盖新缓存；途中 invalidate 会从 mutation 之后重新读取。
- 月度 bundle 尚在飞行时发生心情写入，会显式失效旧快照，修复“刚改心情又被旧月历回滚”的竞态。
- 浏览器绘制前恢复最近确认的 cat/fish scope 与持久读缓存；服务端签名 Cookie 仍是唯一权限依据。
- 今日、饮食、日历移除用户可见的“第一次读取/正在确认账号”首屏文字；用稳定静态壳或月份网格承接首帧。
- 饮食数据未恢复时使用中性照片位，不再先画默认餐图再切实拍图。
- GitHub Actions：Test 221/221、Lint、Production Build 全部通过。
- Production deployment `dpl_2WsHTaUJZYLht9J8mRZZQ4vjKLSf` READY；`/`、`/food`、`/calendar` 均为 200，部署后最近 30 分钟无 error/fatal runtime log。
- 发布完成后已恢复 `vercel.json -> git.deploymentEnabled: false`，关闭提交未触发第二次部署。

## 2026-09-04 — R8.7 无阻塞启动与缓存一致性（PR #57）

- 移除全屏启动 splash 与 620ms/2.4s 人为等待，缓存页面立即显示、数据后台校验。
- 最近确认身份作为非授权本地 scope hint 跨应用重开保留；服务端签名 Cookie 仍是唯一权限依据。
- 启动预热改为 canonical day/meal/settings keys，月历与小窝数据延后，减少首屏重复 RPC 与资源争抢。
- 月度 bundle 同步生成月历缓存，避免同一月份并发读取 `get_life_month_moods` 和 `get_life_month_bundle`。
- Life 写入 read-back 后原子同步 day/month/bundle 缓存，修复月历心情先显示旧值的问题。
- 版本化餐食照片改为一年私有 immutable 缓存；餐食编辑/删除直接更新本地列表缓存。
- Test 216/216、Lint、Production Build 与 HTTP smoke 均通过；Production deployment `dpl_4n8MPK4N5ZQjNTCmj6gXLijYZupe` READY。
- Production 实机复查暴露出“旧 in-flight 请求可能覆盖新缓存”和剩余首屏占位闪烁，后续由 R8.8 收口。

## 2026-09-02 — P2.5 同日饮食与游戏记录关联

- 在现有「今日 → 饮食小记」中新增“当天合在一起看”，不新增第五个主 Tab。
- 按 `partnerKey + date` 把当天实际摄入与已有游戏 daily record 关联展示。
- 同一张 AppCard 现在显示：当天总摄入、可用总热量区间、游戏热量缺口、运动分钟和游戏体重快照。
- meals 存在但该日没有 `DailyRecord` 时明确显示“当天游戏记录未填写”；不会自动创建游戏记录。
- daily record 存在但没有 meals 时，实际摄入显示“未记录”。
- Meal API 加载失败时显示“暂未加载”，避免把错误状态误显示成 0 kcal。
- 新增 `lib/home/daily-overview-service.ts`，只读选择 `date + role` 对应游戏快照。
- 新增 `tests/home/daily-overview-service.test.ts`，覆盖角色选择、日期选择和缺失记录状态。
- P2.5 不新增数据库表、RPC 或 API，不扩大数据库权限面。
- 保持 `intake ≠ deficit ≠ weight ≠ exercise`；关联仅用于展示，不用 meals 自动覆盖游戏 deficit。
- 记录旧模型限制：`DailyRecord` 没有单侧 input-presence 标记，无法可靠区分“主动填写 0”和“旧模型补零”；当前不做启发式猜测。
- GitHub Actions Test / Lint / Build 全部通过；对应 Vercel production deployment 为 READY。
- P2.5 完成，下一阶段切换为 P3 体重趋势。

## 2026-09-02 — 角色映射纠正与饮食数据修正

- 根据真实使用反馈纠正 ChatGPT 饮食角色映射：**用户自己的饮食聊天 = `cat`（猫猫），鱼鱼的饮食聊天 = `fish`（鱼鱼）**。
- 修正此前因错误映射写到 `fish` 的旧照片餐食记录，并同步修正对应 `chatgpt:` 幂等键前缀。
- 食堂绿豆汤语境纠正为：默认按**完全无糖、汤水为主、少量绿豆**理解；除非用户另外说明加糖。
- 9 月 1 日对应晚饭记录已按无糖绿豆汤重新修正。

## 2026-09-02 — ChatGPT “记上”持久化流程

- 完成 P2：只有用户明确表达“记上”或等价保存意图后才持久化餐食；讨论、估算、修正不会自动写库。
- 新增 production migration `20260901162337_add_chatgpt_meal_persistence_rpc.sql`。
- 新增 service-only `create_chatgpt_meal_record`，强制 `source=chatgpt`、`status=confirmed`，要求 `chatgpt:` 幂等键并校验食物明细和热量合计。
- 同一幂等键使用事务 advisory lock，并继续复用 meals 唯一 idempotency 约束，避免网络/并发重试形成重复餐食。
- 新增 `get_chatgpt_meal_record`，用于写入结果不确定时按同一 key 查询确认。
- ChatGPT 使用用户已授权的 Supabase 连接能力调用受限 meal RPC，不把数据库 secret 或同步密码复制到聊天，也不新增公开写 API。
- production smoke test 验证首次创建、同 key 重试、按 key 读回和权限边界；测试 meal 已清理。
- P2 不改变游戏 deficit、运动、体重、钱包、金币、宝石或热力图。

## 2026-09-01 — 今日饮食 Web UI

- 在现有 `#today` notice-board 中新增「饮食小记」，不增加第五个底部 Tab。
- 按日期和 fish/cat 查询 Supabase 餐食，展示当天餐数、kcal 合计、餐型、区间、备注和来源。
- 食物明细可展开，支持手动新增 / 完整编辑 / 删除确认 / 软删除。
- 新增 `lib/nutrition/meal-client.ts`；浏览器只走同源 Meal API 和 HttpOnly cloud session。
- UI 继续复用现有 App* / animal-island-ui 视觉体系。

## 2026-09-01 — Supabase migration 与工程 baseline

- 将 production 中保留的原始 migration SQL 回填到 `supabase/migrations/`。
- 新增 `supabase/README.md`，明确数据库变更、RLS、service_role 和空库重建规则。
- 确认 `coin_deficit_streak_days` 默认值已经从 7 统一为当前规则的 5。
- 建立 GitHub Actions Test / Lint / Build baseline。
- 修复旧兑换记录兜底时间的跨时区测试问题。

## 2026-09-01 — 项目文档与 AI 规则治理

- 重审 README、AGENTS、CLAUDE、项目 Skill 和全部 docs。
- 将多套重复、过期的 refactor / migration / future-design 文档合并为当前主文档体系。
- 新增持续维护型 Codex Skill：`couple-better-game-maintainer`。
- 明确四个独立数据域：饮食摄入、游戏 deficit、体重、运动。
- 明确 Supabase 已是云端主数据源，公开 GitHub JSON 同步退出当前架构。

## 2026-09-01 — 饮食后端第一阶段

- 建立 `meals / meal_items / foods / food_aliases` 营养数据模型。
- 新增 `/api/meals` 与 `/api/meals/[id]` CRUD。
- 新增 meal payload 校验、热量区间、source、idempotency key 支持。
- 多表写入采用 Supabase 事务 RPC。
- 完成新增 → 查询 → 修改 → 软删除数据库冒烟验证。

## 2026-09-01 — Supabase 成为唯一云端主数据源

- 游戏快照迁移到规范化 Supabase 表。
- `/api/home-data` / `/api/save-data` 接入 Supabase RPC。
- 新增 cloud session 和新设备首次写入保护。
- 停止 GitHub JSON 镜像写入并删除当前 `public/data/couple-data.json`。
- 重写可达 Git 历史；GitHub Support 继续处理旧 dangling commit cached views。

## 2026-05 至 2026-08 — Web MVP 与游戏核心

- 完成双人每日记录、历史补录 / 编辑 / 删除。
- 完成金币 / 宝石、情侣奖励、钱包回算和周统计。
- 完成成长地图、成长日志、兑换商店和兑换记录。
- 完成 AppDataStore、localStorage、JSON 备份恢复、CSV 复盘。
- 完成 animal-island-ui 视觉体系和 `components/ui/App*` wrapper。
