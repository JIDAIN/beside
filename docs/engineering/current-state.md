# Current Engineering State

Snapshot date: 2026-09-22.

本文只记录 Production Web、GitHub main、Production Supabase 当前差异与未完成验证；产品能力与业务规则不在这里复制。

## 1. Production Web

最近一次已核验 Production：
- deployment: dpl_9VcNvuPrXogywWixknPS7z97qN1P
- state: READY
- target: production
- source commit: 0bd6f5fa6a7f96a4dac6311feb73322249fe4245
- deployment date: 2026-09-15

本轮文档重构没有获得新的 Vercel 部署授权，因此没有触发新的 Production deployment。

## 2. GitHub Main

GitHub main 已领先于 Production Web。

领先内容主要包括：
- Supabase migration 历史/顺序收口；
- current docs 的 MOC/canonical 架构重构、维护手册与迁移后精度修正；
- 少量测试/维护配置调整；
- AI exposed tool description 的品牌文案收口（不改变业务写入语义）；
- Starlit Nook Domain foundation：`lib/starlit-nook/*` + domain-contract tests + ADR/current Domain docs。当前没有 Starlit Nook Production table/migration、Supabase adapter、Web API/UI 或 MCP tools。

这些尚未部署的 main 变化不代表 Production Web 已运行相同 commit。

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

当前主要差异：
- GitHub main 包含 2026-09-21～22 的 migration/docs 收口；
- Production Web 仍是 2026-09-15 source commit；
- 最近 compare 显示差异主要集中在 docs、migration 历史/命名收口、少量 tests、`vercel.json` deployment protection、AI tool description 品牌文案，以及尚未部署的 Starlit Nook Domain foundation；
- 本轮精度修正没有引入新的业务逻辑、schema 或 Production runtime 变化；
- 当前 docs 描述 current main contract + 已核验 runtime，并明确区分 main/Production。

因此“main ahead of Production”不能简单解释为“线上缺少所有 main 功能”；判断某项是否已上线仍需按文件/行为核 deployment source 与 runtime。

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
