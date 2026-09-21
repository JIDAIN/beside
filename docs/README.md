# Beside Engineering Docs

这里是 **伴岛 / Beside 当前程序的工程事实库**，主要读者是 AI 编程助手和维护者。

> GitHub 文档回答：**伴岛现在实际上是什么、代码应该怎样安全维护。**
>
> 产品设想、未实现方案和个人设计草稿不在这里维护；它们属于独立的产品设计知识库。

## 文档地图

| 区域 | 回答的问题 |
|---|---|
| [Product](product/README.md) | 当前产品向用户提供什么？当前 UI/体验约束是什么？ |
| [Architecture](architecture/README.md) | 系统、数据、API、身份、AI 为什么这样连接？ |
| [Domains](domains/README.md) | Meal、Reminder、Legacy Game 等业务领域的真实 contract 是什么？ |
| [Engineering](engineering/README.md) | 当前运行状态是什么？怎么开发、测试、配置、部署和排障？ |
| [Archive](archive/README.md) | 以前怎样实现、迁移和验收？ |

## AI 开始任务时

先读本页，再根据任务进入对应 MOC：

- 页面 / 产品能力 → [Product MOC](product/README.md)
- 架构 / 数据 / API / 身份 → [Architecture MOC](architecture/README.md)
- 某个具体业务领域 → [Domains MOC](domains/README.md)
- 开发 / 测试 / Production → [Engineering MOC](engineering/README.md)
- AI / MCP → [AI MOC](architecture/ai/README.md)
- 数据库 migration → [Supabase README](../supabase/README.md)

不要从 `archive/` 推断当前实现。

## 事实优先级

发生冲突时：

```text
已验证 Production 行为 / Supabase runtime
→ 当前 GitHub main 代码
→ docs 当前工程文档
→ Accepted ADR
→ archive
→ Git 历史 / 旧聊天
```

必须区分：

```text
Production Web
GitHub main
Supabase runtime / migration ledger
```

GitHub 文档应与当前程序保持同步；发现文档与代码或 Production 不一致时，应把它当作文档缺陷修复。

## 文档组织原则

- 顶层只按稳定知识区域组织，不按开发轮次编号。
- 每个区域必须有 `README.md` 作为 MOC。
- 一个事实只设一个 canonical home；其他文档链接过去，不复制维护第二份。
- 只有一个领域出现多份长期 contract 时才建立子目录。
- 阶段验收、迁移过程、一次性调研进入 `archive/`。
- 未来产品想法不写成当前工程事实。
