# AI MOC

伴岛所有 AI / MCP 维护的统一入口。

## 1. AI Boundary

~~~text
AI / MCP Adapter
→ trusted actor
→ AI Access Core
→ canonical domain services
→ Supabase
~~~

身份来自可信授权上下文，不来自聊天自称；AI 不拥有任意 SQL 权限。

## 2. Current AI Entry Points

- MCP / ChatGPT Project：OAuth + /mcp
- Built-in AI：/ai → /api/ai/chat
- 两者共享同一 registry / executor / canonical services

旧 Harbor Sheet、Apps Script、Fast Wake、Drive Bridge 只属于 History，不是 current adapter。

## 3. Canonical Documents

- AI Architecture：stable tools、registry、身份、安全、dispatch、media、扩展流程。
- Natural Language：alias、default、relative date、unit、clarification、target resolution。
- Project Instructions：可直接复制到 Cat/Fish ChatGPT Project 的 client policy。
- Meal AI Contract：Meal 特殊聊天草稿/确认/餐前餐后流程。

AI Access Core 不再单独维护第二份文档；长期原则统一进入 AI Architecture。

## 4. AI Capability Map

| Concern | Canonical |
|---|---|
| stable tools / query-mutator registry | AI Architecture |
| identity / permission | Auth & Identity |
| aliases/defaults/clarification | Natural Language |
| Meal conversation draft | Meal AI Contract |
| Meal media persistence | Meal Photo Storage |
| Project client policy | Project Instructions |
| regression | Development & Testing |

## 5. Change Routing

- 新 resource/action → AI Architecture + registry/executor/tests
- 新 alias/default → Natural Language + normalizer/tests
- 新 Domain-specific AI lifecycle → 对应 Domain
- actor/permission → Auth
- prompt/client policy → Project Instructions
- 新 AI transport → Architecture/API，但必须复用 AI Access Core

## 6. New Capability Checklist

~~~text
canonical Domain/service exists
→ ownership decided
→ query/mutate semantics
→ normalizer/clarification
→ target lookup
→ idempotency
→ delete/high-risk safety
→ media if needed
→ tool result
→ registry
→ executor
→ tests
→ Project Instructions only if client policy changed
~~~

## 7. Implementation Anchors

- lib/server/life-agent-registry.ts
- lib/server/life-agent-executor.ts
- lib/ai/life-input-normalizer.ts
- lib/server/life-ai-gateway.ts
- lib/server/life-mcp-tools.ts
- lib/server/life-mcp-auth.ts
- app/mcp/route.ts
- app/api/ai/chat/route.ts
- tests/ai/*
- relevant tests/server/*

## 8. Maintenance Rules

新增/删除 resource、action、alias、权限或媒体行为时不能只改 prompt；必须同步 canonical contract、implementation、tests。
