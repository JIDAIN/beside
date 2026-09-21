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
