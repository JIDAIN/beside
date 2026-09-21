# 部署与安全

状态：2026-09-21。本文维护当前发布纪律与跨领域安全基线；身份细节、环境变量和故障排查分别链接到专门文档。

## 1. 当前生产边界

```text
Browser / MCP
→ Next.js on Vercel
→ signed Web session / MCP OAuth
→ canonical server service / restricted RPC
→ Supabase PostgreSQL / Private Storage
```

浏览器不持有 Supabase service secret。

身份 / 资源权限：
→ [Auth and Identity](../architecture/auth-and-identity.md)

## 2. Secret

完整变量表：
→ [Configuration](configuration.md)

长期规则：

- Supabase service secret 只在 server；
- LIFE_MCP_SIGNING_SECRET 只在 server；
- AI Gateway / Vision credentials 不进 Git；
- PushPlus / WeChat credentials 在 server / Vault；
- 固定账号真实密码不进 Git、migration seed 或文档；
- NEXT_PUBLIC_* 只能承载明确 public 值；
- .env* 保持忽略。

DATA_EDIT_PASSWORD 只属于 Legacy Game compatibility，不是 Island Life 登录凭据。

## 3. Server-only 数据访问

当前 Life 业务采用：

```text
Browser
→ Next.js
→ service_role / restricted actor-aware RPC
→ RLS-enabled tables
```

RLS enabled 且没有 anon/authenticated direct policy 在当前架构下可以是预期状态。

不要为了消除 Advisor INFO 而开放浏览器直写业务表。

## 4. 权限不能靠 UI

所有 personal mutation 必须由服务端重新验证 actor / owner。

共享资源也必须明确写出 shared semantics。

详细矩阵：
→ [Auth and Identity](../architecture/auth-and-identity.md)

AI 不能拥有任意 SQL / 任意表工具：
→ [AI Architecture](../architecture/ai/architecture.md)

## 5. 数据与 Storage

- Supabase 是结构化 Life 数据 Source of Truth；
- Meal photo bucket 为 private；
- local cache 不作为权限或事实源；
- Life maintenance 默认不能操作 Legacy Game；
- migration 只追加 forward fix；
- 真实个人数据不进入 migration seed。

→ [Data Model](../architecture/data-model.md)
→ [Life / Legacy Boundary](../architecture/life-legacy-boundary.md)

## 6. Vercel 部署审批

仓库当前必须保持：

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

规则：

- Git push / merge / docs commit 不等于部署授权；
- Preview 和 Production 都需要用户针对 **该次部署** 的明确授权；
- 一次授权只覆盖当前一次受控部署；
- 部署完成后继续恢复 / 保持 Git deployment disabled；
- 未授权时可以修改代码、提交、运行 CI，不触发 Vercel deployment。

该规则由 ADR-0006 固化。

## 7. Supabase 变更纪律

DB change 与 Web deployment 是不同动作。

涉及 Production Supabase 时：

- 先确认 migration / SQL 的影响；
- destructive data fix 要明确范围；
- 不篡改 schema_migrations 只为“对齐文件名”；
- 已执行 migration 不回写；
- 需要真实写入 Production 时应明确说明并获得对应操作授权；
- apply 后做 schema / permission / business smoke。

migration replay 细节：
→ [Supabase README](../../supabase/README.md)
→ [Operations Runbook](operations-runbook.md)

## 8. 发布前检查

```text
[ ] vercel.json deploymentEnabled=false（准备触发受控部署前除外）
[ ] CI Test / Lint / Build 通过
[ ] Required configuration 满足
[ ] secret 未进入 Git / browser
[ ] Web / MCP actor identity 正确
[ ] cross-owner write 被拒绝
[ ] migration / runtime schema 与代码兼容
[ ] Life / Legacy boundary 未越界
[ ] 受影响功能完成 smoke
[ ] 本次 Preview / Production 已明确获得授权
```

## 9. 发布后

发布后至少确认：

- deployment READY；
- source commit 正确；
- 关键页面 / API 可达；
- 受影响业务 smoke；
- runtime error；
- 如涉及 DB，核对 runtime schema / RPC；
- `vercel.json` 最终恢复为 deployment disabled。

“GitHub main 已完成”不能自动写成“Production 已上线”。

## 10. 故障

Production build/runtime、Supabase、MCP、Reminder、误删和恢复问题统一进入：

→ [Operations Runbook](operations-runbook.md)

历史 Supabase Auth / pairing 试验只属于 migration/archive 历史，不在当前安全基线重复叙述。
