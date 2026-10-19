# Current Engineering State

Snapshot date: 2026-10-19.

本文只记录 Production Web、GitHub main、Production Supabase 当前差异与未完成验证；产品能力与业务规则不在这里复制。

## 1. Production Web

最近一次已核验 Production：
- deployment: dpl_8bqUpgPD7mD5GCoUq19rg78c2Cov
- state: READY
- target: production
- source commit: 0db5b1b6924d3a5f413299e8176cb4c82780a13a
- deployment date: 2026-10-19

本轮获明确授权完成 Production deployment；本次部署新增 AI 常吃食物模板的查询、新建、修改、删除及从自己历史餐食复制能力，无 Supabase DDL 变更。

## 2. GitHub Main

GitHub main 的功能代码与本次 Production source commit 一致；其后只有测试断言与部署状态文档收口未包含在 Production source commit 中。

最近功能变更：Life MCP 的 favorite_food AI 资源通过现有服务实现个人模板管理；无新增 MCP 工具名、数据库 schema 或部署环境变量。

## 3. Production Supabase

最近一次只读核验：
- project name: couple-better-game（历史兼容项目名）
- ref: bfhntnzngozdqsmgfvjk
- region: ap-northeast-1
- status: ACTIVE_HEALTHY
- PostgreSQL: 17

最近核验时 Production ledger 为 63 条公共 migration；仓库保留额外 replay-only helper 以记录 runtime 历史步骤。

判断数据库行为以 runtime schema/functions 优先，不因为 repo 有 migration 文件就假定 Production 已执行。

## 4. Main vs Production Differences

- Production Web 已运行 2026-10-19 source commit 0db5b1b。
- 后续 GitHub main 仅包含过时 UI 测试断言修正与 current-state 文档收口，不改变实际 Web / MCP 业务逻辑。
- Supabase runtime 本轮未写入、未执行 migration；沿用既有 favorite_food_templates 数据结构。
- 旧的 2026-09-23 记录中的“main ahead of Production”描述不再适用于当前功能代码。

## 5. Outstanding Verification

Blank-database full replay 尚未在一次性全空数据库中完成从零重建验证。

这属于长期灾备/新环境验证，不阻塞当前日常使用；不要为了完成文档清单单独创建可能收费的 Supabase branch/project。

## 6. Deployment Protection

仓库要求：
vercel.json → git.deploymentEnabled=false。

~~~text
commit / CI success
!= Preview authorization
!= Production authorization
~~~

任何 Preview / Production 仍需本次明确授权。

## 7. Maintenance Rules

只有以下情况更新本文：
- Production deployment；
- main/Production 差异变化；
- Supabase runtime/ledger 重要变化；
- outstanding verification 完成/新增；
- deployment protection 状态变化。

普通 Domain 规则不要复制到这里。
