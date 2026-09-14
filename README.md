# 伴岛 Beside

> 正式中文名：**伴岛**｜英文名：**Beside**｜日常称呼：**小岛**
>
> GitHub：`JIDAIN/beside`｜Vercel Project：`beside`
>
> Production：`https://couple-better-game.vercel.app`

`couple_better_game`、`couple-better-game` 等旧名称只在历史记录、数据库兼容 slug、缓存 key、MCP 内部标识或既有 Production 地址中继续保留，不再代表当前正式产品名称。

伴岛是给两个人共同使用的私人生活记录与陪伴 Web App。当前技术栈为 **Next.js + React + TypeScript + Vercel + Supabase**；Supabase 是生活数据事实源，本地 stale cache / Service Worker 只负责体验优化，不是第二数据库。

## 当前状态

截至 2026-09-14：

- **Production Web**：最新受控发布为 `dpl_FXSFNP7HDAKQrkn9ZSAYQkuT43nn`，source commit `ea763a7e149ac26fcc1b0d765baab63adc181671`，状态 READY；
- **首页日期**：已按请求、按 `Asia/Shanghai` 计算业务日期并动态渲染，Production 首屏验证为 `9月14日星期一`，不再固定部署日；
- **Supabase**：当前 Production 数据库已包含常吃食物模板、每日 21:00 记录完整性提醒等最新 migration；
- **自动部署**：发布完成后已恢复 `vercel.json -> git.deploymentEnabled=false`；
- **线上检查**：`/` 与 `/food` 均返回 HTTP 200，最新 Production 检查窗口未发现 error / fatal runtime 日志。

完整的 Production / main / Supabase 边界以 [`docs/09-status-roadmap.md`](docs/09-status-roadmap.md) 为准。

## 产品入口

底部主导航固定为：

```text
今日 / 饮食 / 日历 / 小窝 / 我的
```

### 今日

- 我 / Ta 的心情、睡眠；
- 当日活动；
- 睡眠按起床日归档：今天记录“昨晚入睡 → 今天起床”；
- 当前账号可以删除自己的心情和睡眠；
- stale cache 先显示，mount / focus / visibility / online 后后台校验最新数据。

### 饮食

当前饮食采用 Meal V2：

```text
mealType: breakfast | lunch | dinner | snack
snackPeriod: morning | afternoon | night
status: estimated | confirmed
```

核心规则：

- 早餐 / 午餐 / 晚餐：每人每天各最多 1 条有效主餐；
- 加餐：独立事件，同一时段允许多条；
- 正式 meal 保存食物 items 与整餐营养汇总，不能只保存一个总热量占位；
- 单图“记录这顿饭 / 全部记录”经草稿确认后直接创建 `confirmed`；
- 只有明确饭前估算时才进入 `estimated -> confirmed`；
- 补充已有餐食更新原 Meal，不新建第二条；
- 饭后确认替换实际 items / 汇总，但保留原 `mealDate / eatenAt`；
- 正式 meal 当前绑定 1 张展示照片，多图可以用于 AI 分析。

### 常吃食物

常吃食物是按 Cat / Fish 隔离的复用模板，适合咖啡、酸奶、饼干等固定食品：

- 独立维护页；
- 新增 / 编辑 / 删除模板；
- 餐食编辑时可以直接选用；
- 加入餐食时复制模板字段到普通 `meal_items`；
- 当日临时份量不会反向覆盖模板；
- 后续修改模板不会改写历史餐食。

### 日历

统一月度回顾包含：

```text
心情 / 饮食 / 睡眠
```

- 心情保持双人月历；
- 饮食 / 睡眠使用我 / Ta 单人切换；
- 饮食显示每日 kcal；
- 睡眠显示每日时长；
- 可以进入任意历史日期查看并维护自己有权限修改的生活记录。

### 小窝

- 体重趋势；
- 家庭药箱；
- 小信箱；
- 游戏机 / Legacy Game。

### 我的

- 当前身份；
- Reminder Center；
- 通知设置；
- 数据导出、导入、备份与恢复。

## 小信箱

小信箱使用三箱模型：

```text
收信箱 / 已寄出 / 待寄出
```

数据规则：

```text
draft -> 只有寄件人可见，可编辑 / 删除 / 寄出
sent  -> 寄件人与收件人可见，永久只读
```

手札使用信纸阅读 / 编辑与分页；明信片始终水平横向。信件第一次真正进入 `sent` 时，只为 recipient 生成一次 mailbox reminder；保存或编辑草稿不提醒，微信通知不包含正文。

## Reminder Center / 微信提醒

统一 Reminder Engine 负责生成提醒实例，通知通道与业务规则解耦：

```text
生活模块 / 自定义提醒
        ↓
Reminder Engine
        ↓
life_reminder_rules / life_reminder_instances
        ↓
Supabase pg_cron
        ↓
life_notification_deliveries
```

当前通道策略：

```text
mailbox
  -> 微信公众平台测试号（主通道）
  -> 发送失败时 PushPlus fallback

自定义提醒 / 药箱 / 纪念日 / 每日记录完整性
  -> PushPlus
```

每日记录完整性提醒已经在 Production Supabase 启用：Cat / Fish 各自每天 `21:00 Asia/Shanghai` 检查当天的心情、睡眠、confirmed 早餐、午餐、晚餐；五项都完成则静默，否则只发送 1 条汇总缺项提醒。`estimated` 与 `snack` 不计入必填完整性。

详细说明见 [`docs/14-wechat-reminders.md`](docs/14-wechat-reminders.md)。

## AI 接入

当前所有 AI 入口共享同一业务事实层：

```text
Harbor Cat / Fish MCP
其他受支持 MCP client
程序内置 AI
        ↓
AI Access Core
        ↓
canonical domain services / restricted RPC
        ↓
Supabase
```

身份来自登录、OAuth token 或服务端签名上下文，不从聊天中的昵称、自称或 `cat / fish` 文本猜测。AI 不获得任意 SQL，也不能绕过 owner / shared 权限。

新增生理期等生活 domain 时，应扩展 canonical domain service + AI Access Core / Reminder Engine，而不是复制第二套鉴权、数据库或 AI transport。

## 数据与权限

核心原则：

- Supabase 是正式生活数据事实源；
- 浏览器不持有 `service_role` / secret key；
- Web session 与 MCP token 绑定 Cat / Fish 身份；
- mood / sleep / meal / weight 等个人记录默认 owner-only 写入；
- medicine、纪念日等 couple-space 数据按共享规则维护；
- mailbox sender / recipient 由签名身份和服务端规则确定；
- PushPlus token、微信公众号 secret / OpenID 等只保存在服务端 / Supabase Vault；
- RLS + service-only / actor-aware RPC 限制直接表访问。

权限矩阵见 [`docs/17-auth-and-pairing.md`](docs/17-auth-and-pairing.md)。

## Legacy Game 边界

伴岛中的旧“变瘦变美大作战”继续作为 Legacy Game 子项目存在：

```text
实际饮食摄入 ≠ Legacy Game deficit ≠ 真实体重 ≠ 运动 / 活动
```

展示层可以关联，但一个 domain 不自动覆盖另一个 domain。普通 Life 清理、导入、恢复不得顺手修改 Legacy Game 数据。

详见 [`docs/48-life-legacy-game-data-boundary.md`](docs/48-life-legacy-game-data-boundary.md)。

## 餐食图片

```text
EXIF normalize
-> 最长边 600px
-> WebP quality 70
-> >120 KB 再逐级降低质量
-> 最低 quality 55
-> 一般目标 50~100 KB
```

正式照片存放在 private Storage；当前每条 meal 只保存 1 张展示图。

## 开发与验证

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

代码改动进入 `main` 后由 GitHub Actions 执行 Test / Lint / Build。CI 通过不等于允许部署。

任何 Preview / Production deployment 都必须获得用户针对该次发布的明确授权；完成后继续保持自动部署关闭。

## 目录

```text
app/                     Next.js 页面与 API Routes
components/life/         生活系统 UI
components/home/         Legacy Game UI / Provider
components/ui/           共享 UI shell / wrapper
lib/life/                生活 domain client / service
lib/server/              鉴权、AI、通知、Supabase server adapters
lib/nutrition/           Meal / nutrition 逻辑
lib/home/                Legacy Game 领域逻辑
supabase/migrations/     Production migration 历史
tests/                   Test / source contract / service tests
docs/                    当前有效文档
docs/adr/                长期架构决策
docs/archive/            历史实施与阶段验收
```

## 文档入口

第一次接手建议依次阅读：

1. [`docs/README.md`](docs/README.md)
2. [`docs/09-status-roadmap.md`](docs/09-status-roadmap.md)
3. [`docs/01-product.md`](docs/01-product.md)
4. [`docs/02-architecture.md`](docs/02-architecture.md)
5. [`docs/03-data-model.md`](docs/03-data-model.md)
6. [`docs/04-api-and-sync.md`](docs/04-api-and-sync.md)
7. [`docs/08-deployment-security.md`](docs/08-deployment-security.md)
8. [`docs/11-ai-write-architecture.md`](docs/11-ai-write-architecture.md)
9. [`docs/14-wechat-reminders.md`](docs/14-wechat-reminders.md)
10. [`docs/17-auth-and-pairing.md`](docs/17-auth-and-pairing.md)

AI / 自动化修改前必须先读 [`AGENTS.md`](AGENTS.md) 与 `.agents/skills/beside-maintainer/SKILL.md`。