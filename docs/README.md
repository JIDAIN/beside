# Beside Engineering Docs

这里是 **伴岛 / Beside 当前程序的工程事实库**，主要读者是 AI 编程助手和维护者。

> GitHub 文档回答：**伴岛现在实际上是什么、代码应该怎样安全维护。**
>
> 产品设想、未实现方案和个人设计草稿不在这里维护；它们属于独立的产品设计知识库。

## 与 Obsidian「伴岛」项目的关系

伴岛同时维护两套文档体系，但两者用途不同：

```text
Obsidian / 伴岛项目
= 产品设计与未来规划
= “希望伴岛以后变成什么样”

GitHub / docs
= 当前工程事实库
= “伴岛现在实际上是什么、代码应该怎样安全维护”

Production Web / Supabase runtime
= 当前真实运行状态
= “用户现在实际运行和保存的是什么”
```

典型流转：

```text
Obsidian 产品设计
→ 设计确认
→ GitHub code + engineering docs
→ 明确授权后部署
→ Production / Supabase runtime
```

### 规则

- Obsidian 可以领先于 GitHub：尚未开发的产品设计、交互方案和未来模块可以先存在于 Obsidian。
- 尚未实现的 Obsidian 设计不能写成 GitHub current docs 的当前能力。
- GitHub 文档必须能够独立解释当前程序；AI 维护代码时不能依赖“去 Obsidian 再看一份说明”才能理解当前实现。
- Obsidian 可以链接 GitHub 的当前工程文档，用于标记某项设计是否已经实现；GitHub 不反向依赖 Obsidian 作为工程事实源。
- Obsidian 与 GitHub 不一致且 Obsidian 描述未来方案时，这是正常的“设计领先实现”。
- Obsidian 若声称某功能已实现，但代码 / GitHub / Production 不支持该结论，应以当前代码与运行事实为准，并修正 Obsidian 状态。
- GitHub docs 与当前 main 代码或已核验 Production runtime 不一致时，属于 GitHub 文档缺陷，应修正文档。
- Production Web、GitHub main 与 Supabase runtime 必须继续分层判断；main 已完成不等于 Production 已上线。

## 文档地图

| 区域 | 回答的问题 |
|---|---|
| [Product](product/README.md) | 当前产品向用户提供什么？当前 UI/体验约束是什么？ |
| [Architecture](architecture/README.md) | 系统、数据、API、身份、AI 为什么这样连接？ |
| [Domains](domains/README.md) | Meal、Reminder、Legacy Game 等业务领域的真实 contract 是什么？ |
| [Engineering](engineering/README.md) | 当前运行状态是什么？怎么开发、测试、配置、部署和排障？ |
| [Archive](archive/README.md) | 以前怎样实现、迁移和验收？ |

## Code-local README

除 `docs/**` 的跨目录 canonical docs 外，仓库允许在源码目录旁维护 **code-local README**。

它们只回答“这个具体实现目录应该怎样维护”，不能成为跨系统事实的第二来源。

当前典型例子：

- [components/ui/README](../components/ui/README.md)：共享 UI adapter / pattern 的代码实现规则；
- [supabase/README](../supabase/README.md)：migration 目录、ledger、replay 与数据库变更规则。

判断原则：

```text
跨产品 / 跨目录 / 跨领域事实
→ docs/

只对某个代码目录成立的实现维护规则
→ 该目录 README
```

code-local README 必须链接回对应 canonical docs；如果两者冲突，应先核当前代码 / runtime，再修正文档，不能长期维护两份不同结论。
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
- 一个事实只设一个 canonical home；其他文档或 code-local README 链接过去，不复制维护第二份。
- 只有一个领域出现多份长期 contract 时才建立子目录。
- 阶段验收、迁移过程、一次性调研进入 `archive/`。
- 未来产品想法不写成当前工程事实。
