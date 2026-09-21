# 当前架构

状态：2026-09-14。

## 1. 一句话架构

**伴岛 / Beside** 是一个 Next.js 一体化 Web 应用：

```text
浏览器 UI / AI Client
-> Next.js / Vercel API
-> canonical domain services / AI Access Core
-> Supabase PostgreSQL + Private Storage
```

AI 与 Web 共享同一个业务事实层，不维护第二套数据库。

当前产品关系：

```text
伴岛 / Beside（正式产品）
├─ Island Life / 生活域
│  ├─ 今日
│  ├─ 饮食
│  ├─ 日历
│  ├─ 小窝
│  └─ 我的
└─ 游戏
   └─ 变瘦变美大作战（Legacy Game）
```

`couple-better-game` 继续作为数据库 slug、缓存 key、MCP 内部标识或 Production 兼容地址时不需要机械改名。

## 2. 主要运行入口

### Web

```text
Browser
-> Next.js API
-> signed session identity
-> domain service
-> service-role / actor-aware RPC / Storage
-> Supabase
```

### MCP / ChatGPT Project

```text
Harbor Cat
-> Harbor-Cat MCP
-> OAuth cat
-> /mcp
-> life_query / life_mutate
-> AI Access Core
-> Supabase

Harbor Fish
-> Harbor-Fish MCP
-> OAuth fish
-> /mcp
-> life_query / life_mutate
-> AI Access Core
-> Supabase
```

其他支持的 MCP client 走同一个 `/mcp` 与 AI Access Core。

Cat / Fish 身份由 OAuth token / 服务端签名上下文绑定，不能由昵称、自称或 `person` 文本切换。

### 程序内置 AI

```text
/ai
-> /api/ai/chat
-> Vercel AI Gateway
-> life-agent-registry
-> AI Access Core
-> Supabase
```

## 3. Source of Truth

正式生活数据事实源始终是 Supabase。

浏览器 stale cache、Service Worker cache 等只属于可重建读模型，不是第二数据库，也不参与权限判断。

文档事实优先级见 `docs/README.md`；特别要区分 Production Web、GitHub main 与已经独立执行的 Supabase migration。

## 4. 领域边界

主要生活域：

```text
meal
favorite_food
weight
mood
sleep
activity
medicine
mailbox
reminder
settings
```

Legacy Game 独立保留：

```text
daily_records / daily_record_sides
wallet / wallet_ledger
exchange / settlement
```

核心关系：

```text
intake != deficit != weight != exercise / activity
Island Life maintenance != Legacy Game maintenance
```

Meal calories 不自动生成 deficit，不自动修改金币、宝石、钱包或旧游戏 heatmap。

任何普通 Life 测试清理、import / restore 默认不得触碰 Legacy Game。完整 allowlist 见 `life-legacy-boundary.md`。

## 5. 饮食数据流

### Web

```text
LifeFoodPage / LifeMealEditorPage
-> meal-client
-> /api/meals + /api/meals/:id/photo
-> auth
-> supabase-nutrition
-> canonical RPC / Storage
-> meals + meal_items
```

主餐每天每人 breakfast / lunch / dinner 各最多一条；snack 是独立事件，同一时段允许多条。

### 常吃食物

```text
LifeFavoriteFoodsPage / meal editor chooser
-> /api/favorite-foods
-> supabase-favorite-foods
-> favorite_food_templates
```

常吃食物是用户隔离模板。加入餐食时只复制模板字段到普通 `meal_items`，历史餐食与模板之间没有持续引用。

### AI

```text
用户文字 / 图片
-> AI 在聊天里给草稿
-> 用户修改 / 确认
-> life_mutate
-> meal adapter
-> canonical meal service
-> Supabase
```

饮食草稿不是后台对象。单图实际记录与 `estimated -> confirmed` 生命周期的语义以 `../domains/meal/ai-contract.md` 为准。

## 6. 餐食图片

```text
原图
-> EXIF normalize
-> 最长边 600px WebP
-> Private Storage meal-photos
-> meals.photo_path
```

显示元数据：

```text
photo_rotation_degrees
photo_scale
```

当前正式 Meal 只绑定一张展示图；多图可以参与 AI 分析，但没有多图持久化模型。

如果 MCP 客户端无法传真实图片字节：

```text
life_mutate attachPhoto=true
-> MEDIA_ATTACHMENT_REQUIRED
-> recovery.uploadUrl
-> browser upload
-> 服务端完成同一次业务写入
```

## 7. 生活读写与同步

页面采用 scope-aware stale cache：

```text
先显示本地可用快照
-> mount 后后台校验
-> focus / visibilitychange 后校验
-> online 后校验
```

mutation 成功后同步相关 day / month / month-bundle cache，避免返回页面时旧快照覆盖新记录。

首页“今天”的业务日期由服务端按 `Asia/Shanghai` 每次请求计算并传给客户端；这一修复当前在 `main`，在下一次获得 Production 授权后发布。

## 8. AI 写入架构

稳定工具面：

```text
life_capabilities
life_query
life_mutate
```

AI Access Core 负责身份、权限、归一化、幂等、媒体边界与 canonical resource dispatch；模型负责对话语义，但不能替代服务端权限。

`legacy_home` 属于 Legacy Game 兼容入口，不是普通生活 resource。

## 9. Reminder Engine 与通知 Provider

```text
业务模块 / 自定义提醒
-> Reminder Engine
-> life_reminder_rules / life_reminder_instances
-> pg_cron
-> life_notification_deliveries
-> provider
```

当前 provider 选择：

```text
mailbox -> 微信公众平台测试号 -> PushPlus fallback
其他提醒 -> PushPlus
```

业务模块不直接调用微信 API。每日 21:00 完整性提醒由 Supabase 云端判断并投递，不依赖网站是否打开。

## 10. 身份与安全

- Web 使用签名 session；
- MCP OAuth token 绑定 `partnerKey`；
- 个人记录 owner-only 写入；
- couple-space 共享数据按明确共享规则维护；
- 浏览器不持有 service-role / secret；
- 微信和 PushPlus secret 只在服务端 / Vault；
- RLS server-only 表不为了消除 Advisor INFO 而开放客户端 policy。

完整矩阵见 `auth-and-identity.md`。

## 11. 目录职责

```text
components/life/        生活系统页面与交互
components/home/        Legacy Game UI
lib/life/               生活 domain client / service
lib/nutrition/          Meal service / protocol
lib/server/             鉴权、AI、通知、Supabase adapters
lib/ai/                 自然语言 normalization / contract
supabase/migrations/    不可回写的 schema / RPC / grant 历史
```

表级维护边界由 `lib/server/life-data-domains.ts` 约束。

## 12. Migration 与 Production

数据库结构变化必须新增 migration，已执行 migration 不回改。

Vercel Git 自动部署长期关闭。任何 Preview / Production deployment 都必须获得用户对该次发布的明确授权；完成后继续保持 `deploymentEnabled=false`。
