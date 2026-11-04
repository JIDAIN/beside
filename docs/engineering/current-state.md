# Current Engineering State

Snapshot date: 2026-11-04.

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

GitHub main 已领先已核验 Production：心愿清单的页面、共享 API、数据模型、私有封面上传与存储服务、回归测试及尚未执行的 Supabase migration 均已提交。未获得成功的 test/lint/build、runtime 和真实 UI 验收证据，当前不能作为已发布能力使用。

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

- 最近一次有记录的 Production Web 核验仍为 2026-10-19 source commit 0db5b1b；本轮未重新核对 Vercel runtime。
- GitHub main 新增 /nest/wishes、/api/life/wishes、/api/life/wishes/[id]/photo、私有 wish-photos Storage bucket 的 migration 20261102000000_life_wishes.sql，尚未完成可发布验证。
- 本轮没有对 Production Supabase 写入或执行 migration。心愿功能依赖新表及 RPC，未迁移前不能正常使用。
- 现有普通 Life backup/import/restore 尚未纳入 wishes 与 wish-photos，不能视为已获得完整恢复保障。

## 5. Outstanding Verification

心愿清单的 test/lint/build、共享读写 runtime、移动端视觉验收及 Production migration 均尚未完成；不得因此宣布功能上线。\n\nBlank-database full replay 尚未在一次性全空数据库中完成从零重建验证。

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
