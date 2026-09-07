# Architecture Decision Records

本目录只记录**会长期影响系统结构、边界、安全或运维方式的架构决策**。

ADR 不是开发日志、需求清单、版本验收报告，也不替代当前事实文档。

## 什么时候需要 ADR

满足至少一项时考虑新增：

- 改变 Source of Truth；
- 改变身份、权限或安全模型；
- 改变主要系统边界或数据域；
- 引入 / 退出一个长期基础设施或 transport；
- 改变 AI、通知、备份等跨模块基础能力；
- 选择一个会长期限制后续设计的方案；
- 放弃一个曾经合理、未来可能被重新提出的重要方案。

以下情况通常**不需要** ADR：

- 单个页面样式调整；
- bug fix；
- 一次性 migration；
- 某一轮 Rxx 实施记录；
- 普通字段新增；
- 已由现有 ADR 覆盖的同方向小步扩展。

## 状态

```text
Proposed    尚未正式采用
Accepted    当前有效决策
Superseded  已被新的 ADR 替代
Deprecated  不再推荐，但没有单一替代 ADR
```

已经 Accepted 的 ADR 不通过改写历史来“假装从未发生过”。如果长期架构改变，应新增 ADR，并在旧 ADR 上标记 `Superseded by ADR-xxxx`。

## 当前 ADR

| ADR | 决策 | 状态 |
|---|---|---|
| [ADR-0001](0001-supabase-source-of-truth.md) | Supabase 是正式生活数据 Source of Truth | Accepted |
| [ADR-0002](0002-fixed-dual-identity.md) | 固定 Cat/Fish 双身份 + 服务端 actor-aware 权限 | Accepted |
| [ADR-0003](0003-shared-ai-access-core.md) | Web / MCP / AI 共用 canonical services 与 AI Access Core | Accepted |
| [ADR-0004](0004-reminder-engine-channel-separation.md) | Reminder Engine 与 PushPlus 投递通道解耦 | Accepted |
| [ADR-0005](0005-life-legacy-data-boundary.md) | Island Life 与 Legacy Game 数据域隔离 | Accepted |
| [ADR-0006](0006-manual-production-deployment.md) | Git 自动部署关闭，Preview/Production 逐次授权 | Accepted |

## ADR 模板

```markdown
# ADR-xxxx 标题

- Status: Proposed | Accepted | Superseded | Deprecated
- Date: YYYY-MM-DD
- Supersedes: ADR-xxxx（可选）
- Superseded by: ADR-xxxx（可选）

## Context
为什么必须做这个决定？有哪些现实约束？

## Decision
最终决定是什么？

## Consequences
带来了哪些好处、代价和后续约束？

## Related
链接当前主文档 / 代码边界。
```

## 与其他文档的关系

```text
ADR                  -> 为什么这样设计
02-architecture      -> 现在系统怎么连接
03-data-model         -> 现在数据怎么存
08-deployment-security-> 现在安全/部署规则是什么
09-status-roadmap     -> 现在上线到哪一步
CHANGELOG             -> 发生过什么变化
archive               -> 某次实施过程与历史证据
```

发生冲突时，ADR 不能覆盖当前 Production 事实；先以 Production / 当前 `main` 为准，再判断 ADR 是否需要被新的决策 supersede。
