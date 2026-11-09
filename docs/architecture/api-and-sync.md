# API & Sync

本文维护 transport、API family、可信身份进入点、客户端 read model 与 mutation 后收敛机制。具体业务规则进入 Domains；具体资源权限进入 Auth。

## 1. Boundary

浏览器和 AI client 都不能直接持有 Supabase service secret。

不同 transport 只能复用同一 canonical service / domain contract，不能各自重建业务 CRUD。

## 2. Transport Families

### Web
Browser → Next.js page/API → signed life-account-session → canonical service/server adapter → Supabase。

### MCP
MCP client → OAuth 2.0 + PKCE → signed token → /mcp → AI Access Core → canonical service。

### Built-in AI
Browser session → /api/ai/chat → AI Gateway → registry/executor → canonical service。

### Legacy compatibility
/game 与旧 home-data/save-data/cloud-session 只服务 Legacy Game compatibility，不等于 Life fixed-account auth。

### 微信公众号回调（代码已实现，待部署与微信后台接入验证）

- `GET /api/wechat/official/callback`：公众号服务器接入 URL 验证；校验时间戳、nonce 与签名，返回 `echostr`。支持公众号常规明文验证及带 `msg_signature` 的加密 challenge。
- `POST /api/wechat/official/callback`：仅接收 XML 安全模式（`encrypt_type=aes`），验证 SHA-1 消息签名、AES-256-CBC 解密、校验解密尾部 AppID，再解析有限字段；仅 `你好/hi/hello` 返回加密的固定欢迎语，其余消息回复 `success`。
- V1 不调用 AI、Supabase、生活记录服务或主动通知；没有 Cat/Fish 绑定，不把 `FromUserName` OpenID 当作可信 Life actor。被重复投递的消息只会重复产生无副作用的回复；**尚无跨 Serverless 实例的持久化去重**。
- 签名不通过、配置缺失、非法 XML/密文均拒绝；兼容微信的 XML、octet-stream 及缺省 Content-Type，但始终必须核验 AES 消息签名。诊断日志仅记录固定阶段名与 HTTP 状态码，不记录消息正文、OpenID、URL、密文或密钥；XML 解析限制大小并拒绝 DTD/Entity，不做任意 XML 扩展。
- 相关实现：`app/api/wechat/official/callback/route.ts`、`lib/server/wechat-official-crypto.ts`；接口现阶段仅存在于 GitHub 开发代码，正式可用仍取决于当次部署和微信后台 URL 验收。

## 3. Web Authentication API

当前：
- POST /api/auth/login
- GET /api/auth/session
- POST /api/auth/logout

登录成功签发 HttpOnly signed session。真实账号凭据只在 server/Supabase 使用。

Together 微信通知入口 `GET /open/together?proposal=<UUID>` 只接受 UUID 作为目标定位：已有 signed session 重定向到 `/nest/together?proposal=<UUID>`；无会话则进入 `/login?next=...`，登录后返回同一记录。入口本身不创建 session、不授予权限、不接受 actor 参数，实际操作始终由已有 Web API 检查 trusted actor。具体约定页面会选择相应状态 tab，并定位卡片。

## 4. Life API Family Map

| Family | Caller | Trusted actor | Canonical service / adapter | Read model | Domain |
|---|---|---|---|---|---|
| day/mood/sleep/activity | Life UI | Web session | life-api + supabase-life | day/month/bundle | simple Life |
| weight | Weight UI | Web session | weight-service + supabase-weight | weights | weight |
| wishes | Wish List UI | Web session | life-wishes + life-wish-photos | shared wishes | Wish List |\n| medicine | Medicine UI | Web session | medicine-service + supabase-medicine | domain client | medicine |
| mailbox | Mailbox UI | Web session | mailbox-service + supabase-mailbox | domain client | mailbox |
| settings | Nest/Me | Web session | settings-service / data-management | settings | settings |
| reminders | Reminder Center | Web session | reminder-center | reminder client | Reminder |
| data-management | Me/Data | Web session | life-data-management | cache invalidated after restore | system |
| Meal | Food UI | Web session | meal-service + supabase-nutrition | meals | Meal |
| favorite-foods | Food UI | Web session | favorite-food service | own templates | Meal adjunct |

本表只做 transport 导航，不复制各 Domain contract。

### 4.1 Current Web Route Inventory

这里维护紧凑 route 导航，避免新增/重构 API 时重新 enumerate 整个 `app/api`。业务语义仍回到对应 Domain。

| Family | Current routes | Trusted actor / scope | Canonical service |
|---|---|---|---|
| auth | `/api/auth/login` `/api/auth/session` `/api/auth/logout` | signed fixed account | fixed-life-auth |
| day/month | `/api/life/day` `/api/life/month` `/api/life/month-bundle` | Web session；read scope 可 me/Ta | life-api / supabase-life |
| mood/sleep | `/api/life/mood` `/api/life/sleep` | Web session；personal write = signed actor | life-api / supabase-life |
| activity | `/api/life/activities` `/api/life/activities/[id]` | Web session；actor/both contract | life-api / supabase-life |
| weight | `/api/life/weights` `/api/life/weights/[id]` | Web session；personal owner | weight-service / supabase-weight |
| wishes | `/api/life/wishes` `/api/life/wishes/[id]` `/api/life/wishes/[id]/photo` | Web session；couple-space shared | life-wishes / life-wish-photos |\n| medicine | `/api/life/medicines` `/api/life/medicines/[id]` | Web session；shared | medicine-service / supabase-medicine |
| mailbox | `/api/life/mailbox` `/api/life/mailbox/[id]` | Web session；sender/recipient lifecycle | mailbox-service / supabase-mailbox |
| settings | `/api/life/settings` | Web session；shared/personal field-specific | settings-service / data-management |
| reminders | `/api/life/reminders` `/api/life/reminders/settings` `/api/life/notifications/pushplus` | Web session；actor-bound | life-reminder-center / provider helpers |
| data management | `/api/life/data-management` | Web session + explicit high-risk confirmation | life-data-management |
| Meal | `/api/meals` `/api/meals/[id]` `/api/meals/[id]/photo` | Web session；personal owner | meal-service / supabase-nutrition |
| favorite foods | `/api/favorite-foods` `/api/favorite-foods/[id]` | Web session；personal owner | favorite-food service |
| built-in AI | `/api/ai/chat` | Web session → trusted actor | AI Gateway / Access Core |
| Legacy compatibility | `/api/home-data` `/api/save-data` `/api/cloud-session` | legacy compatibility session | Legacy adapters |

route 新增/删除/改名时更新本表；method/业务 lifecycle 只在需要理解 transport 时记录，不在此复制完整 Domain contract。

## 5. Meal / Favorite Food API

当前主要 API：
- GET/POST /api/meals
- PUT/DELETE /api/meals/[id]
- GET/PUT/PATCH/DELETE /api/meals/[id]/photo
- /api/favorite-foods
- /api/favorite-foods/[id]

Meal lifecycle、photo 与 AI draft 见 Meal Domain。

## 6. MCP / OAuth Transport

当前入口：
- /mcp
- /oauth/register
- /oauth/authorize
- /oauth/token

当前 OAuth contract：
- dynamic client registration；
- exact redirect URI binding；
- S256 PKCE；
- signed authorization code；
- signed access / refresh token；
- partnerKey 固定进入 token；
- authorization code redemption 防重放。

MCP tool surface 见 AI Architecture。

## 7. Built-in AI Transport

/ai → /api/ai/chat → life-ai-gateway → life-agent-registry/executor。

Web session 提供可信 actor；模型文字不覆盖 actor。

## 8. Legacy Compatibility API

当前仍保留：
- GET /api/home-data
- POST /api/save-data
- /api/cloud-session

它们是 Legacy Game compatibility path，不应被新 Life module 复用为通用 API。

## 9. Client Read Model

Life UI 使用 scope-aware stale cache。

stable invariants：
- API/Supabase 仍是事实源；
- cache 按 cat/fish scope 隔离；
- cache 可丢弃、可重建；
- mount 后即使有 cache 也后台校验；
- focus/visibility/online 等时机重新校验；
- multi-tab mutation signal 触发 invalidate；
- cache 不参与权限。

当前 implementation parameters：
- 普通 GET readFetch timeout：12 秒；
- stale-query fetch guard：15 秒；
- visible 周期 revalidate：约 30 秒；
- 失败后 bounded backoff retry；
- write 不由 readFetch 自动重放。

这些参数可调整；“旧 read 不能回滚新 write”是不变量。

### 心愿清单 / 一起做吧加载优化（仓库已实现，待上线）

- `/nest/wishes` 和 `/nest/together` 统一使用 `useStaleQuery`（keys: `wishes` / `together-proposals`），按 Cat/Fish 浏览器 scope 缓存最近成功的共享读取结果，再以受保护 Web session 和 Supabase 重新验证。页面返回或重新打开时不再人为先清空列表。
- 心愿主记录写入成功后即时同步 `wishes` cache；约定变更成功后强制 read-back。客户端来自 MCP / 另一账号的变化通过 30 秒可见页面重新校验和 focus/visibility 处理，不以缓存作为写入或授权事实。
- 同一页面移除额外自建 `setInterval(fetch)`，避免与共享缓存定时校验重复；`Together` 仍以独立本地计时器刷新日期相关的展示标签。
- 当浏览器直接落在这两个功能页面时，先保障当前页面首屏数据请求，避免启动无关的 Today/Food/Calendar 预热任务与之争抢移动网络。
- 首次访问 / 缓存失效仍依赖服务端网络；有缓存时才可快速显示旧快照，随后后台更新。浏览器断网或 session 无权限时仍按原有权限和错误处理执行。本轮不涉及 Supabase schema 或运行时参数变化。

## 10. Mutation → Cache Convergence

~~~text
mutation
→ canonical write succeeds
→ update / invalidate affected cache key
→ revision blocks stale in-flight overwrite
→ background read-back
→ UI converges to source of truth
~~~

失败的 stale read 不能被当作写失败或写成功凭证。

## 11. Monthly Bundle

月度回顾主要复用 life-month-bundle:YYYY-MM，一次读取月度 mood/sleep/activity/Meal 等需要的数据。

bundle 不应反向覆盖独立日详情或刚完成的 Meal mutation。

## 12. Import / Restore Convergence

Life import/restore 完成后必须失效相关 read cache，使 UI 从 API/Supabase 重新收敛。

恢复范围见 Data Model，操作流程见 Operations。

## 13. Current Implementation Anchors

- app/api/auth/**
- app/api/life/**
- app/api/meals/**
- app/api/favorite-foods/**
- app/oauth/**
- app/mcp/route.ts
- app/api/ai/chat/**
- lib/client/read-fetch.ts
- lib/client/use-stale-query.ts
- lib/server/life-api.ts
- lib/server/fixed-life-auth.ts
- lib/server/life-mcp-auth.ts

## 14. Change Impact

- route rename only → 更新本页 current route map / caller；
- actor source change → Auth + API & Sync + tests；
- cache strategy change → API & Sync + client regression；
- business semantics change → 对应 Domain；
- new transport → 必须复用 Auth + canonical service；
- new API family → Domain Registry + Data/Auth + tests。

## 15. Maintenance Rules

API/transport/cache 变化更新本文。
业务生命周期、schema 字段与 provider routing 不在本文复制。

## Together / Proposal Web API

`GET/POST/PATCH /api/life/proposals` 使用 signed Web actor、no-store 响应与 service-role restricted RPC。浏览器没有直接 SQL 写权限，AI/MCP V1 不暴露 proposal mutation。
