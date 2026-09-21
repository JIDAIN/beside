# AI 访问与写入架构

状态：2026-09-21。本文描述当前 AI / MCP 实际可调用能力，不把 Web 页面已有能力自动视为 AI tool 能力。

## 1. 稳定工具面

当前 AI Access Core 的公开工具只有：

- life_capabilities
- life_query
- life_mutate

所有 AI 入口最终进入同一套 server-side registry，再调用 canonical domain service / RPC / Supabase Storage。

couple-better-game 仅可作为历史 space slug、兼容地址或内部兼容标识出现，不是当前产品名称。当前正式产品名为 **伴岛 / Beside**。

## 2. 当前入口

MCP：

Harbor Cat / Harbor Fish / other MCP client
→ OAuth 2.0 + PKCE
→ /mcp
→ life_query / life_mutate
→ AI Access Core
→ canonical services
→ Supabase

Harbor Cat 固定 OAuth actor = cat，Harbor Fish 固定 OAuth actor = fish。

程序内置 AI：

已登录 Web 用户
→ /ai
→ /api/ai/chat
→ AI Gateway
→ life-agent-registry / executor
→ canonical services
→ Supabase

旧 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge 不属于当前运行链路。

## 3. 当前 query registry

life_query 当前注册：

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

- day：单日生活汇总，包含心情、睡眠、活动和饮食；
- mood / sleep / activity：可独立按日查询；
- month：当前 registry 返回月度心情数据，不等同于 Web 的完整月度回顾页面；
- meal：按日期与 person 查询；
- mailbox：只返回当前 actor 有权看到的 draft / sent；
- life_export：Life 数据导出；
- legacy_home：旧游戏兼容快照，不属于普通 Life domain。

## 4. 当前 mutate registry

| Resource | 当前 AI action |
|---|---|
| mood | upsert / delete |
| sleep | upsert |
| activity | create / update / delete |
| meal | create / update / append_meal_item / confirm_estimated_meal / delete，可附图 |
| weight | create / update / delete |
| medicine | create / update / delete |
| mailbox | create draft/sent；update/delete 仅自己的 draft；draft 可 send |
| settings | update |
| legacy_home | replace，高风险 |

### Web 能力不等于 AI 能力

当前 Web/API 已支持删除自己的睡眠记录，但 **AI registry 当前不支持 sleep delete**。

因此文档和 Project Instructions 不能因为 Web 有该功能，就声称 life_mutate 也能执行。

以后新增 AI action 时，应先改 registry / executor / tests，再更新本文。

## 5. 身份与权限

身份只能来自可信授权上下文：

Web signed session 或 MCP signed OAuth token
→ partnerKey = cat | fish

聊天中的“我是 Fish”“替 Ta 记录”、AI 昵称、payload 自报 actor 都不能切换授权身份。

完整权限矩阵：
→ [Auth and Identity](../auth-and-identity.md)

## 6. Natural Language Normalization

自然语言 alias、默认日期、单位和 clarification 统一由 lib/ai/life-input-normalizer.ts 及 AI executor 处理。

详细 contract：
→ [Natural Language Contract](natural-language.md)

模型不应该自行猜内部 UUID、enum 或数据库字段。

## 7. 正式写入与安全

标准写入：

用户意图
→ life_mutate
→ normalize
→ permission / ownership
→ domain validation
→ idempotency / safety
→ canonical service
→ Supabase

当前长期安全规则：

- 没有任意 SQL / 任意表写工具；
- delete 必须来自用户当前消息的明确删除意图；
- update/delete 不允许猜 UUID；
- 个人数据不能替 Ta 写；
- mailbox sent 永久只读；
- Legacy Game 全量 replace 需要明确高风险确认；
- tool result 成功后才允许告诉用户“已保存 / 已删除”。

## 8. Meal 特殊流程

新 Meal 是当前唯一额外要求“聊天层草稿 → 用户确认 → 正式写入”的普通生活 mutation。

图片 / 文字
→ Meal 草稿
→ 用户修改 / 确认
→ life_mutate
→ canonical Meal service

详细生命周期：
→ [Meal AI Contract](../../domains/meal/ai-contract.md)

Meal 的字段、主餐唯一、estimated / confirmed 和营养规则不在本文重复维护。

## 9. 图片

Meal 图片最终进入 canonical media path。

如果 MCP client 未传真实图片字节但用户明确要求保存图片：

life_mutate attachPhoto=true
→ MEDIA_ATTACHMENT_REQUIRED
→ recovery.uploadUrl
→ 用户浏览器补传
→ 服务端继续原业务操作

具体压缩、Storage 和单图持久化：
→ [Meal Photo Storage](../../domains/meal/photo-storage.md)

## 10. Project Instructions

当前 Harbor Cat / Fish 指令唯一维护入口：

→ [Project Instructions](project-instructions.md)

Project Instructions 只维护固定身份语义、MCP、用户交互、Meal 草稿确认和删除/高风险安全提醒。具体 schema 和 action 以 registry 与 domain contract 为准。

## 11. 新 Domain 接入

新增 domain 时顺序固定为：

1. schema / migration；
2. canonical service / RPC；
3. owner/shared permission；
4. natural-language normalization；
5. registry query/mutate；
6. tests；
7. 必要的 backup / reminder 接入；
8. 更新对应 canonical docs。

不为新的 AI client 重建第二套 CRUD 或身份系统。

当前部署状态和 Production 差异：
→ [Engineering Current State](../../engineering/current-state.md)
