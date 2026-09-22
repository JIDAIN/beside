# Development & Testing

本文回答：修改某类东西时应该先读什么、改哪些层、跑什么测试、同步哪些 docs，以及怎样区分 implementation refactor 与 contract change。

## 1. Standard Change Workflow

~~~text
classify change
→ read canonical docs
→ verify current code/runtime
→ identify stable contract vs current implementation
→ design change
→ modify code
→ regression
→ update canonical docs
→ ADR if long-term architecture changed
→ History/Changelog if milestone-worthy
→ deploy only after explicit authorization
~~~

旧 History、旧聊天和阶段验收不能替代 current code/runtime 核验。

## 2. Development Locations

完整跨层 current implementation map 以 Architecture Overview 为准。

本文只维护开发/验证特有位置：
- supabase/migrations/**
- tests/**
- .github/workflows/**
- package.json scripts
- lint/build/tooling config

当前主要命令：
- npm run test
- npm run test:watch
- npm run lint
- npm run build

CI 当前 Node 24，并独立执行 Test / Lint / Build。
test-diagnostics.yml 是精选定位矩阵，不替代完整 test suite。

## 3. Change Recipe Matrix

| Task | First read | Typical code | Must check docs | Regression |
|---|---|---|---|---|
| 单页视觉调整 | Design System | page/domain UI | DS only if pattern changes | visual |
| 全站 UI 重构 | Product + UI Guidelines + DS | tokens→App*→patterns→domain→pages | Product/UI/DS | ui-lab + real pages |
| 功能移动页面 | Product Overview | routes/pages | Overview | navigation/UI |
| 新 simple domain | Domains + Data + Auth | migration/service/API/UI | Product+Data+Auth+Domains | domain/auth |
| simple→complex | Domains Registry | existing domain code | new Domain + affected docs | full domain |
| schema/RPC | Data Model | migration/server | Data+Engineering | DB smoke |
| API/cache | API & Sync | route/client/cache | API & Sync | client/server |
| 权限 | Auth | session/service/RPC | Auth + Domain | cross-owner |
| 新 AI action | AI Architecture | registry/executor/normalizer | AI + Domain | AI/server |
| 新 reminder source | Reminder | DB/service/cron | Reminder+Data | reminder |
| 新 provider | Reminder+Configuration | dispatcher/config | Reminder+Config+Security | delivery |
| 新文件/媒体能力 | Domain+Data+Security | storage/server/API/UI | Data+API+Security+Domain | media/security |
| backup/import scope | Data Model+Operations | data-management/RPC | Data+Operations | restore/import |
| 新外部集成 | owning Domain+Architecture | adapter/config | Domain+API/Config/Security；长期取舍再 ADR | integration |
| 纯目录重构 | Architecture current map | code | anchors only | full regression |

## 4. Domain Development Rules

新增 capability 先决定：
- personal/shared/system/legacy；
- ownership；
- canonical data；
- canonical service；
- 是否需要独立 Domain。

不要：
- 为一个新页面重造业务；
- 为 AI 重造 CRUD；
- 为通知重造 provider pipeline；
- 为“目录更整齐”回写已执行 migration。

## 5. Schema / Migration Rules

forward change：
- 新增 migration；
- 已执行 migration 不回改；
- schema/function/view/constraint/index/RLS/grant/revoke 都按 migration 管理；
- server-only RPC 根据真实用途限制 execute；
- import/backup/restore compatibility 必须评估；
- Life/Legacy boundary 必须评估。

replay-only helper、ledger 与空库恢复见 Operations。

## 6. Source of Truth / Cache

新增持久化前先问：
1. fact 还是 cache？
2. 是否应进入 Supabase？
3. cache 丢失是否可重建？
4. 是否会被误当身份或权限来源？

cache contract 见 API & Sync。

## 7. Test Layers

- tests/ai：AI contract / normalization
- tests/client：cache / request / client reliability
- tests/home：Legacy Game
- tests/life：Life domain/auth/UI source contract
- tests/nutrition：Meal
- tests/server：server/MCP/media/data boundary

## 8. Change-triggered Regression Matrix

至少：
- mailbox lifecycle → life + server + reminder；
- Meal lifecycle → nutrition + AI + server；
- Meal photo → server image + client/UI；
- reminder provider → server + runtime smoke；
- auth/ownership → life auth + MCP/AI；
- cache → client + relevant page；
- Legacy settlement → tests/home full relevant regression；
- restore/import → data-management + permission + cache convergence。

## 9. UI Verification

可见 UI 改动检查：
- loading/stale/empty/error；
- mobile/desktop；
- 我/Ta；
- editable/read-only；
- safe-area；
- real image/long text/boundary data；
- refresh/foreground；
- destructive/unsaved。

自动测试不替代真实视觉验收。

## 10. Production DB Smoke

涉及 Production schema/RPC 且取得相应授权后，至少验证：
create/read/update/delete（适用时）、permission、idempotency、受影响 RPC、backup/restore compatibility（如涉及）、cleanup test data。

不能留测试残留。

## 11. Documentation Update Matrix

- current capability / entry → Product Overview
- stable interaction → UI Guidelines
- UI architecture / shared pattern → Design System
- cross-domain flow → Architecture Overview
- schema / data fact → Data Model
- API/cache/transport → API & Sync
- identity/permission → Auth
- AI → AI docs
- Meal → Meal Domain
- Reminder → Reminder Domain
- Legacy Game → Legacy Game Domain
- config → Configuration
- deployment/security → Deployment & Security
- operations/recovery → Operations
- runtime difference → Current State
- long-term decision → ADR
- historical milestone → History

## 12. Refactor-only Rule

若用户能力、data semantics、permission、external API contract、Domain lifecycle 均不变，可以判定为 implementation refactor。

此时：
- 更新 Architecture current implementation map；
- 更新受影响 Domain anchors；
- 跑完整 regression；
- 不为文件夹搬迁伪造 Product / Domain / ADR 变化。

## 13. Commit / Merge Checklist

~~~text
[ ] canonical owner 已确认
[ ] regression 已覆盖
[ ] npm run test
[ ] npm run lint
[ ] npm run build
[ ] secret 未暴露
[ ] actor/ownership 未削弱
[ ] Life/Legacy boundary 未跨越
[ ] migration 未回写历史
[ ] canonical docs 已同步
[ ] 长期架构变化已有 ADR
[ ] 部署仍需当次明确授权
~~~

纯 docs 变更不为形式强制 build，但必须检查路径、引用、事实与链接。

## 14. Maintenance Rules

开发流程、测试结构、change recipe 改变时更新本文。
业务事实只链接，不在本文复制。
