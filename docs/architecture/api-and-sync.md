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

## 3. Web Authentication API

当前：
- POST /api/auth/login
- GET /api/auth/session
- POST /api/auth/logout

登录成功签发 HttpOnly signed session。真实账号凭据只在 server/Supabase 使用。

## 4. Life API Family Map

| Family | Caller | Trusted actor | Canonical service / adapter | Read model | Domain |
|---|---|---|---|---|---|
| day/mood/sleep/activity | Life UI | Web session | life-api + supabase-life | day/month/bundle | simple Life |
| weight | Weight UI | Web session | weight-service + supabase-weight | weights | weight |
| medicine | Medicine UI | Web session | medicine-service + supabase-medicine | domain client | medicine |
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
| medicine | `/api/life/medicines` `/api/life/medicines/[id]` | Web session；shared | medicine-service / supabase-medicine |
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
