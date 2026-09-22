# Deployment & Security

本文维护发布授权与跨领域安全基线。身份细节见 Auth，配置见 Configuration，故障恢复见 Operations。

## 1. Production Boundary

~~~text
Browser / MCP
→ Next.js on Vercel
→ signed Web session / MCP OAuth
→ canonical server service / restricted RPC
→ Supabase PostgreSQL / Private Storage
~~~

浏览器不持有 Supabase service secret。

## 2. Security Invariants

- secret 只在 server/Vault；
- personal write 必须服务端重新校验 actor/owner；
- shared resource 必须有显式 shared semantics；
- AI 不拥有任意 SQL/任意表工具；
- private Storage 不为方便显示改 public；
- Life maintenance 不默认操作 Legacy Game；
- 已执行 migration 不回写。

## 3. Secret Boundary

完整变量见 Configuration。

禁止进入 Git/browser：
Supabase service secret、MCP signing secret、AI/Vision keys、PushPlus/WeChat credentials、fixed-account password。

DATA_EDIT_PASSWORD 只属于 Legacy compatibility。

## 4. Server-only Data Access

当前 Life 采用：
Browser → Next.js → service_role / restricted actor-aware RPC → RLS-enabled tables。

RLS enabled 且无 anon/authenticated direct policy 可以是预期状态，不要为消除 Advisor INFO 开放浏览器直写。

## 5. Authorization Enforcement

权限不能只靠隐藏按钮。
Web API、AI Access Core、restricted RPC 必须独立保持授权约束。

## 6. Storage Security

Meal photo bucket 为 private。
Storage path 由 server 生成，普通 payload 不能任意覆盖。

## 7. Vercel Deployment Authorization

仓库必须保持 vercel.json 中 git.deploymentEnabled=false。

规则：
- Git push/merge/docs commit != deployment authorization；
- Preview 与 Production 都需要用户针对该次部署明确授权；
- 一次授权只覆盖一次受控部署；
- 部署后恢复/保持 automatic Git deployment disabled；
- 未授权时可改代码、提交、跑 CI，但不部署。

长期理由见 ADR-0006。

## 8. Supabase Change Authorization

DB apply 与 Vercel deploy 是不同动作。

Production Supabase：
- 先审 migration/SQL 影响；
- destructive data fix 明确范围；
- 不篡改 schema_migrations 只为表面对齐；
- 已执行 migration 不回写；
- 真实写 Production 前取得对应操作授权；
- apply 后做 schema/permission/business smoke。

## 9. Pre-deploy Gate

~~~text
[ ] deploymentEnabled=false baseline 已确认
[ ] Test / Lint / Build 通过
[ ] required config 满足
[ ] secret 未进入 Git/browser
[ ] actor/ownership 正确
[ ] cross-owner write 被拒绝
[ ] migration/runtime schema 与代码兼容
[ ] Life/Legacy boundary 未越界
[ ] 受影响功能 smoke 已准备
[ ] 本次 Preview/Production 已明确授权
~~~

## 10. Post-deploy Verification

- deployment READY；
- source commit 正确；
- 关键页面/API 可达；
- 受影响业务 smoke；
- runtime error；
- 涉及 DB 时核 runtime schema/RPC；
- automatic Git deployment 最终保持 disabled。

main 完成不能写成 Production 已上线。

## 11. Rollback / Forward-fix Principles

代码 rollback 与 DB rollback 不是同一件事。
如果新 migration 已执行，旧代码未必兼容新 schema；优先评估 forward fix，不盲目回退。

## 12. Related Runbooks

- Operations：故障、恢复、migration/ledger/replay。
- Current State：当前 Production/main/Supabase 差异。

## 13. Maintenance Rules

发布授权、安全 invariant、Production DB 纪律改变时更新本文。
具体 runtime 事故不写在这里。
