# Architecture Overview

状态：2026-09-21。本文只维护 **当前系统的跨领域架构**；具体业务规则进入 Domains，运行/发布状态进入 Engineering。

## 1. 一句话架构

伴岛是一个 Next.js 一体化 Web 应用：

```text
Browser / AI client
→ Next.js on Vercel
→ server-side domain services / AI Access Core
→ Supabase PostgreSQL + Private Storage
```

Supabase 是正式数据事实源。浏览器缓存与 Service Worker 只用于读取体验优化，不是第二数据库。

## 2. 主要运行入口

### Web

```text
Browser
→ Next.js page / API
→ signed Web session
→ domain service / server adapter
→ service-role or actor-aware RPC
→ Supabase
```

### MCP

```text
MCP client
→ OAuth 2.0 + PKCE
→ /mcp
→ signed access identity
→ life_query / life_mutate
→ AI Access Core
→ canonical domain services
→ Supabase
```

OAuth token 固定携带 `partnerKey` 与 scope；聊天文字不能改变授权身份。

### 程序内置 AI

```text
/ai
→ /api/ai/chat
→ AI model gateway
→ life-agent-registry / executor
→ AI Access Core
→ canonical domain services
→ Supabase
```

所有 AI 入口共用同一业务事实层，不维护第二套业务数据库。

## 3. 身份

Web 使用固定双账号登录。

```text
username/password
→ authenticate_fixed_life_account
→ server-signed HttpOnly session
→ partnerKey = cat | fish
```

MCP 使用单独的签名 OAuth code / access token / refresh token，但最终同样解析成稳定 `partnerKey`。

完整身份与权限：
→ [Auth and Identity](auth-and-identity.md)

## 4. 数据域

系统必须区分：

```text
Island Life
Legacy Game
Shared / System infrastructure
```

Island Life 与 Legacy Game 当前仍位于同一个 Supabase project，但在业务、权限、导入恢复和维护流程上保持逻辑硬隔离。

完整边界：
→ [Life / Legacy Boundary](life-legacy-boundary.md)

数据库结构：
→ [Data Model](data-model.md)

## 5. API 与同步

Web 页面通过 Next.js API 访问服务端能力，不直接持有 Supabase secret。

读取层采用 scope-aware stale cache：

```text
可用快照先展示
→ 后台重新读取事实源
→ focus / visibility / online 等时机再次校验
```

mutation 成功后由对应 client/service 主动更新或失效相关 cache。

完整 API / cache / OAuth transport：
→ [API and Sync](api-and-sync.md)

## 6. AI Access Core

稳定工具面：

```text
life_capabilities
life_query
life_mutate
```

AI Access Core 负责：

- 可信身份；
- resource / action normalization；
- 权限；
- 幂等；
- canonical domain dispatch；
- 媒体恢复边界；
- 高风险写入保护。

Adapter 只负责协议与 transport，不拥有业务规则。

→ [AI MOC](ai/README.md)

## 7. Meal 架构

```text
Web editor / AI
→ canonical Meal payload
→ Next.js server
→ nutrition service / RPC
→ meals + meal_items
→ optional private meal-photos Storage
```

具体 MealType、主餐唯一、estimated/confirmed、照片和 AI 草稿规则不在本文复制维护：
→ [Meal MOC](../domains/meal/README.md)

## 8. Reminder 架构

```text
domain event / custom reminder
→ reminder rule / instance
→ Supabase scheduler
→ delivery
→ provider
```

Reminder Engine 与具体通知 provider 解耦。

具体 21:00 完整性提醒、微信测试号、PushPlus fallback 与 notification tone：
→ [Reminder MOC](../domains/reminders/README.md)

## 9. Private media

Meal 正式展示照片使用 private Supabase Storage。

Browser / AI media 最终都必须进入服务端权限、压缩和绑定流程；客户端不能直接把任意 Storage path 写进 Meal。

→ [Meal Photo Storage](../domains/meal/photo-storage.md)

## 10. 代码分层

```text
app/                    Next.js routes / pages
components/life/        Island Life UI
components/home/        Legacy Game UI
components/ui/          shared App* UI primitives / patterns
lib/life/               Life client + domain helpers
lib/nutrition/          Meal domain contract
lib/ai/                 natural-language normalization helpers
lib/server/             auth / adapters / AI / Supabase server boundary
supabase/migrations/    database history
```

## 11. Migration 与发布

数据库结构变更只能新增 migration，不回写已执行 migration。

Vercel 自动 Git deployment 默认关闭；Production / Preview 发布遵守逐次授权。

当前 GitHub main、Production Web、Supabase runtime 的具体状态：
→ [Engineering Current State](../engineering/current-state.md)

架构为什么这样设计：
→ [Architecture Decisions](decisions/README.md)
