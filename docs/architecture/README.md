# Architecture MOC

本区域回答：伴岛当前系统怎样组成和连接。

## 核心入口

- [Architecture Overview](overview.md)：整体系统层次、运行流、当前实现地图、新功能接入路径。
- [Data Model](data-model.md)：Supabase Source of Truth、数据域、表/constraint、fact vs derived。
- [API & Sync](api-and-sync.md)：Web / MCP / AI transport、API family、cache/revalidation。
- [Auth & Identity](auth-and-identity.md)：固定 Cat/Fish、trusted actor、ownership 与权限矩阵。
- [AI MOC](ai/README.md)：AI Access Core、registry、自然语言与 Project Instructions。
- [Architecture Decisions](decisions/README.md)：为什么长期选择这些方向。

## 阅读原则

Architecture 描述跨领域机制；复杂业务 lifecycle 进入 [Domains](../domains/README.md)。

示例：
- “Reminder 在系统哪个横切层” → [Architecture Overview](overview.md)
- “Reminder source / snooze / provider” → [Reminder Domain](../domains/reminders.md)
- “表字段 / constraint” → [Data Model](data-model.md)
- “谁能写” → [Auth & Identity](auth-and-identity.md)
- “Production 怎么恢复” → [Operations](../engineering/operations-runbook.md)

## AI / 开发者最小阅读路径

~~~text
Architecture Overview
→ 本次任务对应专项文档
→ 对应 Domain
→ current implementation anchors
→ tests/runtime（需要时）
~~~

## 维护规则

- 跨领域数据流变化 → Architecture Overview
- schema / constraint / RPC 变化 → Data Model + migration
- transport / cache / OAuth 变化 → API & Sync
- identity / permission 语义变化 → Auth & Identity
- AI system surface 变化 → AI Architecture
- 长期架构取舍变化 → 新 ADR 或 supersede 旧 ADR