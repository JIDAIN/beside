# AI MOC

伴岛所有 AI / MCP 维护的统一入口。

## 文档

- [AI Architecture](architecture.md)：当前 AI 入口、tool registry、身份与写入链路。
- [AI Access Core](access-core.md)：长期架构原则和不可违反的约束。
- [Natural Language Contract](natural-language.md)：自然语言 normalization / clarification contract。
- [Project Instructions](project-instructions.md)：Harbor Cat / Fish 当前 ChatGPT Project Instructions。

Meal 的 AI 草稿、单图 / 餐前餐后规则属于业务领域 contract：
→ [Meal AI Contract](../../domains/meal/ai-contract.md)

## 核心边界

```text
AI / MCP Adapter
→ AI Access Core
→ canonical domain services
→ Supabase
```

身份来自可信授权上下文，不来自聊天自称；AI 不拥有任意 SQL 权限。

## AI 最小阅读路径

```text
architecture.md
→ 按问题选择 natural-language / project-instructions / access-core
→ 对应 registry / executor / normalizer 源码
→ 如涉及 Meal 再进入 Meal AI Contract
```

| 问题 | 先读 |
|---|---|
| AI 现在能 query / mutate 什么 | `architecture.md` |
| 自然语言 alias、默认值、澄清 | `natural-language.md` |
| Harbor Cat/Fish 可复制 Project Instructions | `project-instructions.md` |
| 长期不可违反的 AI 架构原则 | `access-core.md` |

核心代码入口：

- `lib/server/life-agent-registry.ts`
- `lib/server/life-agent-executor.ts`
- `lib/ai/life-input-normalizer.ts`
- `lib/server/life-mcp-auth.ts`
- `app/mcp/route.ts`
- `app/api/ai/chat/route.ts`

## 修改时同步检查

新增/删除 resource、action、alias、权限或媒体行为时，不能只改 prompt；至少同步检查 registry、executor、normalizer、tests 与对应 Domain contract。
