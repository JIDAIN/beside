# API、鉴权与客户端同步

状态：2026-09-21。本文只维护 **transport、鉴权、API 家族和客户端同步机制**。具体业务规则由对应 Domain 文档维护。

## 1. 总体边界

浏览器和 AI client 都不能直接持有 Supabase service secret。

主要链路：

### Web

Browser
→ Next.js page / API
→ life-account-session
→ server-side service / restricted RPC
→ Supabase

### MCP

MCP client
→ OAuth 2.0 + PKCE
→ signed access token
→ /mcp
→ AI Access Core
→ canonical services
→ Supabase

### 程序内置 AI

Browser session
→ /api/ai/chat
→ AI Gateway
→ life-agent executor
→ canonical services
→ Supabase

## 2. Web 登录 API

当前固定账号入口：

| Method | Path | 作用 |
|---|---|---|
| POST | /api/auth/login | 固定账号登录并签发 HttpOnly session |
| GET | /api/auth/session | 读取当前签名身份 |
| POST | /api/auth/logout | 清除 session |

真实账号凭据只在 Production Supabase 中保存，浏览器不读取 life_fixed_accounts。

身份细节：
→ [Auth and Identity](auth-and-identity.md)

## 3. Island Life API 家族

当前 route tree 主要包含：

- /api/life/day
- /api/life/month
- /api/life/month-bundle
- /api/life/mood
- /api/life/sleep
- /api/life/activities
- /api/life/weights
- /api/life/medicines
- /api/life/mailbox
- /api/life/settings
- /api/life/reminders
- /api/life/reminders/settings
- /api/life/notifications/pushplus
- /api/life/data-management

共同规则：

- read 先验证有效 Web session；
- personal mutation 必须绑定 signed actor；
- request body 中的 partnerKey/person 不能覆盖真实身份；
- shared domain 按自己的业务权限处理；
- server-only secret / RPC 不暴露给浏览器；
- 正式 read response 使用 no-store，浏览器自己的 stale cache 负责体验优化。

具体权限矩阵：
→ [Auth and Identity](auth-and-identity.md)

## 4. Meal API 家族

当前：

| Method | Path | 作用 |
|---|---|---|
| GET | /api/meals | 查询某日某人的 Meal |
| POST | /api/meals | 创建 Meal |
| PUT | /api/meals/[id] | 更新 Meal |
| DELETE | /api/meals/[id] | 软删除 Meal |
| GET | /api/meals/[id]/photo | 读取 private photo |
| PUT | /api/meals/[id]/photo | 上传 / 更换 photo |
| PATCH | /api/meals/[id]/photo | 更新 photo display metadata |
| DELETE | /api/meals/[id]/photo | 移除 photo |

Meal lifecycle、主餐唯一、estimated / confirmed：
→ [Meal Lifecycle](../domains/meal/lifecycle.md)

图片压缩与 Storage：
→ [Meal Photo Storage](../domains/meal/photo-storage.md)

AI 草稿：
→ [Meal AI Contract](../domains/meal/ai-contract.md)

本页不复制这些业务 contract。

## 5. Favorite Foods

当前独立 API：

- /api/favorite-foods
- /api/favorite-foods/[id]

模板只按当前登录身份维护。模板如何进入 Meal 见 Meal Lifecycle。

## 6. MCP / OAuth transport

MCP 入口：

- /mcp
- /oauth/register
- /oauth/authorize
- /oauth/token

当前 OAuth 使用：

- dynamic client registration；
- exact redirect URI binding；
- S256 PKCE；
- signed authorization code；
- signed access / refresh token；
- partnerKey 固定写入可信 token；
- authorization code redemption 防重放。

MCP 具体 tool action 不在本文维护：
→ [AI MOC](ai/README.md)

## 7. Legacy Game compatibility API

旧游戏兼容同步仍保留：

- GET /api/home-data
- POST /api/save-data
- /api/cloud-session

这套 compatibility path 与 Island Life fixed-account session / MCP OAuth 不等价。

Legacy Game 与 Life 的数据边界：
→ [Life / Legacy Boundary](life-legacy-boundary.md)

## 8. 客户端 stale read model

Island Life 的客户端 cache 只用于减少页面闪烁和重复请求。

核心规则：

- Supabase / API 仍是事实源；
- cache 按 cat / fish scope 隔离；
- 切换 scope 会清空内存 cache，并按 scope 恢复可持久快照；
- mutation 后更新或 invalidate 对应 key；
- revision / scope serial 防止旧 in-flight read 覆盖新 mutation；
- mount 后即使有 cache 也会强制后台校验；
- focus、visibility、online 和可见期间 30 秒周期都会 revalidate；
- 同账号其他标签页通过 localStorage mutation signal 触发 invalidate；
- cache 内容可丢弃、可重建，不参与权限判断。

当前持久化 key 主要包括：

- life-month-bundle
- life-day
- life-month
- meals
- weights

持久缓存版本为 v2，按当前 actor scope 存放；兼容 key 中保留 couple-better-game 不代表当前品牌名。

## 9. 读取超时与重试

当前代码两层约束：

- readFetch 对普通 GET 使用 12 秒 AbortSignal timeout；
- useStaleQuery 自身 fetch guard 为 15 秒；
- stale query 失败后最多做有限退避重试；
- write 不由 readFetch 自动重放。

因此网络失败时允许继续展示已有 stale data，但不能把 stale cache 当作写成功凭证。

## 10. 月度读取

月度回顾主要复用：

life-month-bundle:YYYY-MM

该 bundle 一次读取月度心情、睡眠、活动与 Meal，用于减少各页面重复请求。

月度 bundle 不应反向覆盖独立日详情 / Meal cache 的更新事实。

## 11. 数据导入 / 恢复

Life data-management 使用独立 server API，并受 Life / Legacy Game 边界保护。

导入 / 恢复后必须清理或 invalidate 受影响的生活读 cache，使 UI 重新从 API / Supabase 收敛。

## 12. 事实来源

代码层：

- app/api/**
- lib/client/read-fetch.ts
- lib/client/use-stale-query.ts
- lib/server/life-api.ts
- lib/server/fixed-life-auth.ts
- lib/server/life-mcp-auth.ts

具体业务规则不要复制到本文；进入 Product / Domains / AI 对应 MOC。
