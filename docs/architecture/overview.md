# Architecture Overview

本文维护伴岛当前跨领域系统架构；业务 lifecycle 进入 Domains，运行/发布状态进入 Engineering。

## 1. System Boundary

当前仓库以 Next.js 作为统一运行基础：伴岛是已运行产品，Starlit Nook 正在以独立 Domain 方式进入同一工程基础设施。

~~~text
Browser / AI Client
→ Next.js on Vercel
→ trusted identity + API/AI adapters
→ canonical domain services
→ restricted server adapters / RPC
→ Supabase PostgreSQL + Private Storage
~~~

Supabase 是正式事实源。浏览器 cache / Service Worker 只是可重建 read model，不是第二数据库。

## 2. Architectural Layers

长期职责模型：

~~~text
Entry / Transport
→ Trusted Identity
→ API / AI Adapter
→ Canonical Domain Service
→ Server Adapter / Restricted RPC
→ Supabase Facts / Private Storage
~~~

横切机制：
- Client Read Model / Cache
- AI Orchestration
- Reminder Orchestration
- Legacy Game Compatibility

## 3. Runtime Entry Points

### Web
Browser → Next.js page / API → signed Web session → canonical service → Supabase。

### MCP
MCP client → OAuth 2.0 + PKCE → /mcp → signed access identity → stable AI tools → AI Access Core → canonical service。

### Built-in AI
/ai → /api/ai/chat → AI Gateway → agent registry / executor → canonical service。

### Legacy compatibility
/game 与旧 compatibility API 继续使用 Legacy Game 自己的兼容路径，不等同于 Life fixed-account auth。

## 4. Core Runtime Flows

### 4.1 Web Read

~~~text
Page / Component
→ client
→ Next.js API
→ authorize session
→ server adapter / service
→ Supabase
→ read model
→ stale cache
→ UI
~~~

### 4.2 Web Write

~~~text
UI intent
→ Next.js API
→ trusted actor
→ parse / validate
→ canonical service / restricted RPC
→ Supabase
→ mutation success
→ cache update / invalidate
→ background read-back
→ UI converges
~~~

### 4.3 MCP / Built-in AI

~~~text
MCP OAuth or Web session
→ trusted actor
→ AI Access Core
→ normalizer / registry / executor
→ canonical service
→ Supabase
~~~

Adapter 不拥有业务规则，聊天自称不能改变 actor。

### 4.4 Reminder

~~~text
Stateful source OR runtime condition
→ generation
→ delivery
→ provider
~~~

generation 的 Stateful / Condition Nudge 选择、dedupe、provider routing 见 Reminder Domain。

### 4.5 Legacy Compatibility

~~~text
/game / compatibility API
→ Legacy service/store
→ Legacy facts
~~~

它不能被普通 Life write 顺手覆盖。

## 5. Trusted Identity

Web：
username/password → authenticate_fixed_life_account → server-signed HttpOnly session → partnerKey。

MCP：
authorization code / access token / refresh token → signed partnerKey + scope。

完整规则见 Auth & Identity。

## 6. Domain / Data Boundaries

当前物理上共用一个 Supabase project，但逻辑必须区分：
- Life facts；
- Legacy Game facts；
- Shared / System infrastructure；
- Starlit Nook facts（当前仅 Domain foundation，尚未创建 Production tables）。

Life maintenance 不默认操作 Legacy Game；Meal calories 不自动变成 game deficit；普通 activity 不自动变成 game exercise。

详细数据边界见 Data Model 与 ADR-0005。

## 7. Client Read Model / Cache

浏览器使用 scope-aware stale cache 提升体验：
- 可用快照先显示；
- 后台校验；
- mutation 后主动更新/失效；
- 旧 in-flight read 不得覆盖新 write；
- cache 可丢弃、可重建，不参与权限判断。

具体参数与实现见 API & Sync。

## 8. Private Media

当前正式 private media 主要是 Meal photo。

所有 Browser / AI media 最终必须进入 server-side ownership、压缩、Storage 与 DB binding 流程；客户端不能提交任意 Storage path。

## 9. Current Implementation Map

这是 current mapping，不是永久目录 contract。

| Layer | Current code |
|---|---|
| routes/pages | app/** |
| Life UI | components/life/** |
| Legacy UI | components/home/** |
| shared UI | components/ui/** |
| Life contracts/helpers | lib/life/** |
| Meal | lib/nutrition/** |
| Starlit Nook foundation | lib/starlit-nook/** |
| AI normalization | lib/ai/** |
| server/auth/adapters/AI/reminder | lib/server/** |
| DB history | supabase/migrations/** |
| tests | tests/** |

未来改成 features/* 等结构时，只要 contract 不变，只更新本节与 Domain anchors。

## 10. New Feature Integration Map

新增能力统一从这里接入：

~~~text
Product capability
→ classify personal / shared / system / legacy
→ canonical data contract
→ canonical service / RPC
→ auth / ownership
→ Web API
→ UI
→ AI optional
→ Reminder optional
→ tests
→ docs
~~~

不要为一个新页面重造身份、CRUD、AI transport 或通知系统。

## 11. Refactor Invariants

纯代码目录重构不会自动改变：
- Product capability；
- actor / ownership；
- data semantics；
- Domain lifecycle；
- AI tool contract；
- Reminder semantics。

如果这些 contract 都不变：
- 更新 current implementation map / Domain anchors；
- 跑回归；
- 不伪造 Product/Domain/ADR 变化。

## 12. Related Canonical Docs

- Data Model
- API & Sync
- Auth & Identity
- AI MOC
- Domains MOC
- Engineering / Development & Testing

## 13. Maintenance Rules

更新本文：
- 新 transport / cross-domain layer；
- canonical service 边界改变；
- system flow 改变；
- current implementation map 大规模重构；
- new-feature integration pattern 改变。

单一业务规则变化应进入对应 Domain。
