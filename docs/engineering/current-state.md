# Current Engineering State

Snapshot date: 2026-11-04.

本文记录 Production Web、GitHub main、Production Supabase 当前核验状态与未完成事项；业务 contract 由 owning canonical docs 维护。

## 1. Production Web

2026-11-04 心愿清单 MCP 资源正式更新：
- deployment: `dpl_2ojf9xuTjep9d6SG3TNyFtpPAKKx`
- state: READY
- target: production
- source commit: `ad7c851ad71795932e05dc21b5c3d17ebb59ac2d`
- URL: https://couple-better-game.vercel.app
- framework: Next.js 16.2.6

Vercel Production 构建通过（含 TypeScript），兼容 Production 域名已指向此部署。MCP 使用现有 `life_query` / `life_mutate` 接口，不新增工具名称或 OAuth scope。

## 2. MCP Production Runtime

- 已连接的 Harbor Cat 与 Harbor Fish 分别调用 `life_capabilities`，返回包含 `wish` query / mutate 的新能力。
- 两个登录身份分别通过 `life_query(resource=wish, name=潭柘寺)` 查询成功，均得到空数组；未写入测试心愿。
- 最近 30 分钟内 Vercel MCP/Wish 相关错误扫描未发现 runtime error。
- 尚未执行真实 MCP create/update/add_visit/delete、图片上传及双账号写入同步验收；因此这些写入路径不能宣称已完成端到端实测。

## 3. GitHub Main

部署源 commit `ad7c851` 已包含心愿清单 MCP registry / normalizer / service adapter / targeted tests / canonical docs。此后如果仅进行文档状态收口，GitHub main 会领先已部署源 commit，但不代表有新的业务代码发布。

## 4. Production Supabase

- project ref: `bfhntnzngozdqsmgfvjk`
- 2026-11-04 已应用心愿清单 migration，ledger `20261104005447`，name `life_wishes`。
- runtime 已确认共享表、受限 RPC 和私有 `wish-photos` 存储桶存在。
- 本次 MCP 部署没有执行新的 Supabase DDL、migration 或数据写入。

## 5. Outstanding Verification and Limits

- `npm run build` 已由此次 Vercel 构建通过；`npm run test` / `npm run lint` 尚无独立执行通过证据。
- 真实 Cat/Fish 共享 CRUD、Private Storage 图片操作和移动端视觉验收尚未完成。
- 普通 Life backup/import/restore 尚未覆盖 wishes 和 wish-photos；不得误称已有完整恢复能力。
- Blank-database full replay 尚未独立执行。

## 6. Deployment Protection

`vercel.json` 仍要求 `git.deploymentEnabled=false`。Git commit/CI success 不等于部署授权；后续每次 Preview / Production deployment 与 Production Supabase 写入都必须分别取得明确授权。

## 2026-11-06 reminder development state (GitHub main only)

- PR #96 merged as commit `7298116c7946ef7ce115846d05bd997a67e956dc`.
- The repository now includes Tuanzi partner record batching, per-recipient notification switches, and the two-person 21:00 completeness renderer.
- Proposed forward migration: `20261106090000_tuanzi_partner_record_notifications.sql`. **Not applied to Production Supabase in this change**.
- GitHub Actions lint/build and ephemeral PostgreSQL 17 migration/lifecycle smoke passed on the PR. The complete JS test suite retained two failures in unrelated wish-agent and wish-MCP tests (425/427 passed).
- No Vercel Preview/Production deployment authorized or performed for this reminder change; do not equate merged `main` with Production Web.
- Real PushPlus delivery, two-account runtime verification and Production migration ledger verification remain outstanding; each Production write/deployment requires separate express authorization.

### 2026-11-06 Production deployment cross-check

Read-only Vercel deployment history shows latest READY production deployment `dpl_B2BL6fQ4tzCnz6idDY4aQD5gENZk` sourced from `bdf43ba579b1a4edbc3cb5337b411d944605b478` (Together proposal Demo). The reminder PR #96 merged later; **the live deployment does not contain the reminder changes**. This check did not deploy or promote any build.
