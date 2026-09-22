# AI Architecture

本文描述伴岛 current AI / MCP 的稳定工具面、registry、可信身份、安全与 canonical dispatch。Web 已有能力不能自动视为 AI 能力。

## 1. Boundary & Principles

长期原则：
- Adapter 不拥有业务逻辑；
- MCP 是 transport，不是第二业务系统；
- 所有 AI 入口共享 canonical services / permission；
- schema/enum 由程序稳定定义，模型不猜数据库内部含义；
- actor 由服务端授权上下文决定；
- high-risk rule 必须服务端强制；
- tool result 才是执行事实；
- idempotency 在 server；
- media persistence 属于 canonical media layer；
- performance/cache 优化不能污染业务 contract；
- Project Instructions 不是 schema 数据库。

## 2. Entry Points

### MCP

~~~text
MCP client
→ OAuth 2.0 + PKCE
→ /mcp
→ stable tools
→ AI Access Core
→ canonical services
→ Supabase
~~~

Harbor Cat/Fish 可以作为已连接 MCP client 实例名使用，但不是产品名。

### Built-in AI

~~~text
signed Web user
→ /ai
→ /api/ai/chat
→ life-ai-gateway
→ registry / executor
→ canonical services
→ Supabase
~~~

## 3. Stable Tool Surface

公开稳定工具只有：
- life_capabilities
- life_query
- life_mutate

外部 tool surface 尽量稳定；resource/action 可以通过 registry 扩展。

## 4. Current Query Registry

当前 life_query：
- day
- mood
- sleep
- activity
- month
- meal
- weight
- medicine
- mailbox
- settings
- life_export
- legacy_home

重要语义：
- day：单日生活汇总；
- month：当前 AI registry 的月度查询能力，不等同于 Web 完整 Calendar UI；
- mailbox：只返回当前 actor 有权看到的内容；
- life_export：Life data export；
- legacy_home：Legacy compatibility snapshot，不属于普通 Life。

## 5. Current Mutation Registry

| Resource | AI actions |
|---|---|
| mood | upsert / delete |
| sleep | upsert |
| activity | create / update / delete |
| meal | create / update / append_meal_item / confirm_estimated_meal / delete + optional photo |
| weight | create / update / delete |
| medicine | create / update / delete |
| mailbox | create draft/sent；update/delete own draft；send draft |
| settings | update |
| legacy_home | replace（high risk） |

Web capability != AI capability。

例如 Web/API 可以删除自己的 sleep，但 AI registry 当前没有 sleep delete；在 registry/executor/tests 真正接入之前，不得声称 AI 能做。

## 6. Trusted Identity

可信 actor 只来自：
- signed Web session；
- signed MCP OAuth token。

聊天中的“我是 Fish”、昵称、person 参数、payload actor 都不能切换 actor。

权限矩阵见 Auth & Identity。

## 7. Adapter Contract

Adapter 只负责：
- transport auth；
- 把可信 identity 传入 Access Core；
- tool argument/result transport；
- protocol-level retry/timeout；
- 原样传递 clarification/media recovery。

Adapter 不：
- 自己决定 ownership；
- 直接写任意表；
- 重建 Domain lifecycle；
- 根据 prompt 绕过 safety。

## 8. Canonical Dispatch

标准 query/write：

~~~text
tool call
→ canonical resource/action
→ natural input normalization
→ trusted actor
→ permission / target lookup
→ domain validation
→ idempotency / safety
→ canonical service/RPC
→ Supabase/Storage
→ tool result
~~~

## 9. Write Safety

长期强制：
- no arbitrary SQL/table tool；
- delete 必须来自用户当前消息明确删除意图；
- update/delete 不猜 UUID；
- personal fact 不替 Ta 写；
- mailbox sent 永久只读；
- legacy_home replace 需要精确高风险确认；
- tool result 成功后才可告诉用户“已保存/已删除”。

LIFE_CLARIFICATION_REQUIRED 是正常交互 contract，不是系统故障。

## 10. Idempotency / Tool Result

外部写入必须有稳定重试边界。
网络结果不确定时优先按 idempotency/read-back 判断，不创建第二条业务事实。

Tool Result 是“是否真正执行”的事实；模型文本不是。

## 11. Media Boundary

Meal media 最终进入 canonical private Storage path。

若 MCP 无真实 bytes 但用户明确要求保存图片：

~~~text
life_mutate attachPhoto=true
→ MEDIA_ATTACHMENT_REQUIRED
→ mutationExecuted=false
→ signed recovery URL
→ browser upload
→ continue original operation
~~~

收到 recovery contract 后不能重新 create/update。

详细媒体 contract 见 Meal Photo Storage。

## 12. Domain-specific Contracts

AI Architecture 只维护 cross-domain mechanism。

例如：
- Meal chat draft / estimated / before-after → Meal AI Contract
- Reminder source/provider → Reminder Domain
- Legacy settlement → Legacy Game Domain

## 13. AI Capability Registration Checklist

~~~text
1. canonical data/service already exists
2. ownership / read-write permission clear
3. define query/mutate semantics
4. add aliases/defaults/clarification
5. define target resolution
6. define idempotency
7. define delete/high-risk behavior
8. define media handoff if needed
9. define tool result
10. register in registry/executor
11. add tests
12. update Project Instructions only when client policy changes
~~~

不要为新的 AI client 重建第二套 CRUD 或 identity。

## 14. Current Implementation Anchors

- lib/server/life-agent-registry.ts
- lib/server/life-agent-executor.ts
- lib/ai/life-input-normalizer.ts
- lib/server/life-ai-gateway.ts
- lib/server/life-mcp-tools.ts
- lib/server/life-mcp-auth.ts
- app/mcp/route.ts
- app/api/ai/chat/route.ts
- tests/ai/*
- tests/server/life-agent-*.test.ts
- MCP adapter/media tests

## 15. Regression / Change Impact

- resource/action → registry/executor + Domain + tests；
- normalization → natural-language + normalizer tests；
- actor/permission → Auth + AI regression；
- idempotency/delete → server tests；
- media → Photo Storage + MCP/media tests；
- transport → API & Sync，不复制 business。

## 16. Maintenance Rules

AI system contract 改变时更新本文。
一次验收过程、旧 bridge 与历史客户端进入 History。
