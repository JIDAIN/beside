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

## 2026-11-06 Tuanzi Reminder Production Release

- Authorized Production Supabase migration `tuanzi_partner_record_notifications` applied successfully; ledger version `20261106085101`.
- Vercel Production deployment `dpl_DJ7joa2XExmBbMgJpn52vSFvZzDV` is READY, sourced from `7c68d07cd5f64737ee9e059b3afa30b7cb8d21d9`; the `couple-better-game.vercel.app` compatibility domain appears in the deployment aliases.
- Runtime read-only checks: three source triggers, three requested functions, Cat/Fish partner/daily preferences both enabled, both scheduled at 21:00, existing five-minute cron enabled; anon table SELECT and settings function EXECUTE denied.
- Post-release scan of deployment error/fatal runtime logs for the recent 15-minute window returned no entries. This is **not** an end-to-end provider-delivery test.
- Outstanding: actual first-record Web/MCP event capture, five-minute coalescing and two-account PushPlus acceptance/receipt; 21:00 real notification acceptance; unrelated wish tests still had 2 failures in PR CI. No artificial Life records were inserted to test user data.

## 2026-11-06 Together MCP Production Release

- PR #98 was merged as `791fbc99af5fb43b545909ce4903432fca988191`; the existing `life_query` / `life_mutate` now register `proposal` without a new MCP tool, OAuth scope, or database migration.
- Authorized Production deployment `dpl_D3FDdpqGTouT7dpwNo7GmJWGnrAF` is **READY** on `https://couple-better-game.vercel.app`, source `fd19e046abcc3ce4711587448b1d3a3b6fc150ba`. No Preview or Production Supabase writes occurred in this release.
- Real connected **Harbor Cat** and **Harbor Fish** each returned `proposal` under read and write capabilities; each completed a read-only `life_query(resource=proposal)` successfully (`ok=true`; both returned an empty shared list). No test proposal was created, modified or notified.
- Build and Lint succeeded. The 11 Together MCP tests passed; complete suite retained the same two pre-existing wish tests failures. Vercel runtime errors/log scan showed no related errors during the checked window.
- Still unverified: actual authorized Cat/Fish proposal writes and their shared result, real PushPlus delivery through new MCP operations; do not claim end-to-end write acceptance.
- A subsequent GitHub main documentation-only closeout may be ahead of the deployed source commit; it is not a second deployment.

## 2026-11-06 Tuanzi copy refresh (main ahead of Production)

- PR #99 merged into GitHub `main` at `e79342fa1528f0478655f0f7601221b7b4930c83` (Tuanzi multi-template / Beside branding).
- Forward migration `supabase/migrations/20261106100000_varied_tuanzi_notification_copy.sql` replaces only the established `private.life_pushplus_message` and `private.dispatch_life_partner_record_events` copy rendering, adding `private.tuanzi_copy_variant`; delivery/cron/data semantics unchanged.
- Ephemeral PostgreSQL 17 old+new migration smoke and copy variant tests passed; lint/build passed; full JS suite 436/438 with two pre-existing unrelated wish tests failing.
- Production Supabase was **read-only checked** and still contains the old `小岛日记` wording in both renderer functions. The latest inspected Vercel READY production deployment `dpl_D3FDdpqGTouT7dpwNo7GmJWGnrAF` is based on `fd19e046abcc3ce4711587448b1d3a3b6fc150ba`, not PR #99.
- **No Production Supabase migration, Preview deployment or Production deployment was authorized/performed for PR #99.** It must not be claimed live until a separate production release is approved and verified.

## 2026-11-06 Tuanzi Daily Values & Together Copy (GitHub main ahead of Production)

- PR #100 merged as `dd76051651bc23164659b44cae8dbeec9e3a17ff`.
- New forward migration `20261106110000_daily_recap_proposal_notifications.sql` extends the 21:00 daily-record claim with actual Cat/Fish snapshot payloads, renders canonical Chinese mood, sleep duration, confirmed main-meal/snack kcal and a separately labeled confirmed daily calorie sum (unknown values not counted as 0). A full day still generates a recap.
- Together proposal notifications retain their reminder source and trigger timing, but use affectionate Tuanzi copy with HTML-escaped proposal title and Beijing date/time.
- SQL migration and ephemeral PostgreSQL behavioral tests passed (including complete-day claim and unknown snack calorie cases); Build/Lint passed. Full JS suite: 436/438, with the two existing wish-related test failures.
- **No new Production Supabase migration or Vercel deployment was performed** for PR #100. PR #99's prior Tuanzi branding migration also remains pending Production application; release must apply forward migrations in order with separate explicit authorization.
- Read-only Production delivery investigation: one Together invite recipient Fish, instance `a40bad4a-535d-431b-98e7-fb7907f25c3c`, had delivery status `accepted`, provider `pushplus_wechat`, provider message ID `a713b5851caa49708bdcebec97e6d5fd`, attempt 1 at 2026-11-06 17:20 Beijing time. Provider acceptance confirms API handoff, not device receipt/read.

## 2026-11-06 PushPlus clickable Beside footer and Together details (not yet deployed)

- PR #101 merged to GitHub main at `18615ec795fad257f44c0e07fcd75459a3fe66fe`.
- Forward migration `20261106120000_tuanzi_site_footer_proposal_details.sql` makes the PushPlus HTML transport append a single clickable Beside site link. Together routes to `/nest/together`, mailbox fallback to `/open/mailbox`, other PushPlus reminders to the root. The current mailbox WeChat-test-account primary route already has a clickable action URL.
- Together proposal notifications include an escaped title, scheduled Beijing time, duration and an optional 220-character escaped note preview. Previously sent messages are not retroactively updated or re-sent. Existing notification content is visible to the WeChat recipient and may appear in mobile notification previews.
- Ephemeral PostgreSQL 17 migration chain and mocked PushPlus HTTP payload checks passed; Lint/Build passed. JS suite 436/438 with the same two pre-existing wish tests failing.
- No Production Supabase migration or Vercel deployment authorized or executed for PR #101. Production behavior remains unchanged until separately approved migration and deployment.

## 2026-11-06 PR #101 authorized Production release

- Authorized Production Supabase migration `tuanzi_site_footer_proposal_details` applied successfully; ledger `20261106100520`. No Life data records were inserted or altered for testing.
- Read-only SQL confirmed `private.life_pushplus_send` calls `private.life_pushplus_append_site_link`, `private.life_proposal_notify` includes optional note and duration, and live helper returns a clickable HTML anchor to `/nest/together` for Together and the root URL for other PushPlus reminders. Both `life-proposal-sweep-v1` and `life-pushplus-reminders-v1` remained enabled with `*/5 * * * *` scheduling.
- Authorized Vercel Production deployment `dpl_7szh2ZemZgz6F2qHGV9Sh28mSzjj` is READY, source SHA `d5f4e1330694f46a179446bd4f08f2245ea644ac`, correctly aliased to `couple-better-game.vercel.app`.
- Initial 15-minute Production Vercel error/fatal log scan found no entries. Real future-message client rendering/click handling still requires a naturally triggered notification; provider accepted does not prove the user clicked or read it. Previously sent messages are not retroactively changed.
- This documentation-only commit follows deployment and should not be confused with a new Production release.
