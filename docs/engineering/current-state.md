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

## 2026-11-06 Together early-completion UX + lifecycle fix (GitHub main only)

- PR #102 merged at `edd9f9ef183117a459eddf60d11f2608cf659328`. Code adds an early `我提前做完了` UI action on an `agreed` proposal, and forward migration `20261106130000_together_early_result_lifecycle.sql` allows only factual `done` reporting before scheduled start.
- A single actor completing early retains the agreed state and the other actor's pre-start reminder, dismissing only the reporter's unused start nudges. At scheduled end, existing sweep generates result and follow-up reminders for remaining non-reporting actors. Two early `done` results close as `joint_done` without sending later unneeded reminders. After any recorded result, reschedule and cancel are unavailable (backend enforced and UI hidden).
- Production read-only investigation of the user-reported proposal: scheduled 2026-11-06 21:00 Asia/Shanghai for 15 minutes, screenshot at 20:45; original result buttons were gated by scheduled start. Production PushPlus delivery ledger marked the 17:20 invite, 18:45 acceptance, and both 20:45 before-start messages `accepted`. This verifies provider acceptance, not mobile receipt/read.
- Ephemeral PostgreSQL 17 Together migration/lifecycle tests passed; Build and Lint passed; full JS suite 436/438, with the same two pre-existing wish-related test failures.
- **No new Production Supabase migration or Vercel Preview/Production deployment authorized or performed for PR #102.** Deployed Web retains the original no-early-completion rule until a separately authorized release.

## 2026-11-06 Together shared completion by one person (GitHub main only)

- PR #103 merged at `899e7cc09d9a51a76e5b9f93f84951a0500bc0e8` on top of PR #102.
- Forward-only migration `20261106140000_together_single_joint_completion.sql` replaces the scoped result mutation so **one trusted participant** may report `done` for the shared agreement and immediately close it with `outcome=joint_done`. The audit result/event records only the actual confirming actor, never a forged partner response.
- The other person's independent result submission is no longer required for joint completion. Future unsent reminder instances are dismissed on close; historical provider accepted delivery records remain. Partial/not_done continue to follow their existing paths.
- Web uses one `我们已完成` control and history labels the confirming actor by relative role. Ephemeral PostgreSQL 17 smoke verified early and in-progress one-person completion, actor provenance, idempotent retry, second-submit rejection, and reminder cancellation.
- CI: Build and Lint passed. JS suite 436/438 passed with the same two pre-existing wish tests failing.
- **Production remains unchanged:** the pending PR #102 migration `20261106130000_together_early_result_lifecycle.sql` must be applied before the new PR #103 migration `20261106140000_together_single_joint_completion.sql`, and Vercel Production deployment separately authorized. Neither Production Supabase migration nor Vercel deployment was performed in this development turn.

## 2026-11-06 Together early + single-confirmation Production release

- User authorized Production release after PR #102 and PR #103.
- Production Supabase applied two forward migrations in order: `20261106130709` / `together_early_result_lifecycle`; `20261106130717` / `together_single_joint_completion`. Read-only verification confirmed both ledger entries, the installed one-actor `done` → `joint_done` mutation and its reminder-clear path, with Together/PushPlus cron jobs still enabled.
- Authorized Vercel Production deployment `dpl_E3QyoBuMWB6aHRRHix3GN1ecFxAA` is READY, source Git SHA `f4639c7f56e81699303221676f108fb0f68ed3d7`, aliased to the production-compatible URL `couple-better-game.vercel.app`.
- Initial 15-minute error/fatal deployment log scan found no entries. This is not the same as end-to-end interactive approval of a real joint completion.
- The existing real balcony/window Together agreement remained `agreed` with `results={}` when checked after release. No user Life record was modified or artificially confirmed by this rollout.
- This documentation-only main commit is later than the actual Production deploy and does not itself authorize/represent a new deployment.

## 2026-11-06 shared Beside confirmations (GitHub main, NOT Production)

- PR #104 merged into GitHub `main` as `9dbfb9871c363fc487fe90cbbaa3a41987403e8f`.
- New `components/ui/AppConfirmDialog.tsx` provides a shared accessible confirm flow mounted from `app/layout.tsx`, styled by `app/confirm-dialog.css`. Browser-native `window.confirm` calls were replaced in Together, Wishes, Mailbox, Medicines, Favorite Foods, Meal editing, Mood and Sleep.
- In-app unsaved Meal navigation is explicitly intercepted and uses the same dialog, with cancel preserving unsaved content. Closing/reloading the browser tab remains constrained by native `beforeunload` behavior.
- PR CI Build/Lint passed, 441/443 JS tests passed (two pre-existing Wish agent / MCP tests still fail). No live mobile Chrome/WeChat browser visual screenshot was produced, and no new Preview/Production deployment was authorized or performed.
- Vercel Production remains on earlier `f4639c7f56e81699303221676f108fb0f68ed3d7` deployment (Together single confirmation); merged `main` UI is not live until a separately authorized deployment.

## 2026-11-06 Together notification deep-link login (GitHub main only)

- PR #105 merged into main as `ebf33d7005be617b8af2306e4e72bb9dc856d083`; the former development branch adds a session-gated `/open/together?proposal=UUID` entry, client-side proposal focus, and a forward SQL migration `20261106150000_together_notification_deep_links.sql` for newly generated PushPlus Together message links.
- Login still requires Cat/Fish password on first use in a browser and reuses the existing 30-day signed cookie afterward; no Magic Link, new credential, or permission bypass was introduced.
- PR CI: Build, Lint, Together PostgreSQL smoke and Tuanzi PostgreSQL migration + deep-link smoke passed. JS suite 444/446 passed; the same two pre-existing Wish agent/MCP tests still fail.
- This is **GitHub main only**. The SQL migration has **not** been applied to Production Supabase, and no Preview/Production deployment has been authorized in this turn. Real WeChat rendering, first-login return, cookie persistence and Cat/Fish end-to-end confirmation are outstanding.

## 2026-11-06 Wishes / Together loading & AI tests closeout (GitHub main only)

- PR #107 merged as `312afabfc22742bb256b22b54328397b41339f9d`, rebased on the existing Together WeChat deep-link improvements. Obsolete conflicted PR #106 was closed without merge.
- The two long-standing Wish AI/MCP CI failures were fixed in their test harness: async cover deletion mock now resolves a Promise, and the visit ISO-date regex now matches actual digits. No Production Wish data or schema was changed.
- `/nest/wishes` and `/nest/together` now use scoped persisted `useStaleQuery` snapshots for immediate display on return, then revalidate against authenticated Web API. Together retains new `?proposal=` deep-link selection, removes redundant foreground reads, and refreshes display-only time labels separately. Direct entries to these routes do not compete with unrelated Today/Food/Calendar warmup.
- Read-only Production SQL counts at investigation: 4 non-deleted wishes and 1 proposal. `EXPLAIN ANALYZE` for the two list RPCs showed ~2.35ms and ~2.63ms respectively; this is database execution time, **not** authenticated end-to-end page-load latency. Recent Vercel runtime logs did not provide a network waterfall or precise mobile TTFB evidence; real mobile performance acceptance remains pending.
- PR CI **450/450 tests**, Build and Lint all passed.
- No Vercel Preview/Production deploy and no Production Supabase write was authorized/performed. Production currently remains deployment `dpl_E3QyoBuMWB6aHRRHix3GN1ecFxAA` from `f4639c7f56e81699303221676f108fb0f68ed3d7`; the merged loading improvement is not live.

## 2026-11-06 Wishes/Together fast-reopen Production release (authorized)

- User authorized Vercel Production deployment; deployment `dpl_HgR3uh9cMfNnWcALvdhzb3vuM7Yj` is READY, source GitHub SHA `62929e93b793c07d059305274da2461ca4879eb9`, correct production-compatible alias `couple-better-game.vercel.app`, `aliasError=null`.
- Deployed main includes PR #107 (Wishes/Together scoped persistent cache, lower background request contention, and all 450 tests passing), plus earlier pending PR #104 custom confirmation dialogs and the Web-only Together notification deep-link/login/targeting route. Deploying this source does **not** imply its separately pending Supabase notification-copy migration was applied.
- Initial 15-minute Vercel Production error/fatal runtime-log check returned no entries; no authenticated mobile end-to-end first-paint timing or real WeChat deep-link device validation was performed.
- No Supabase Production migration or data write was authorized or performed in this release. `20261106150000_together_notification_deep_links.sql` remains unapplied until separately approved. Existing generic notification behavior remains until that migration.
- This follow-up documentation commit is later than the production deployment SHA and is not itself a new deployment.

## 2026-11-06 Together PushPlus deep-link Production migration release

- Following separate user authorization, Production Supabase applied forward migration `together_notification_deep_links`; ledger version `20261106142727`.
- Read-only verification: installed `private.life_proposal_notify` includes the record-specific `/open/together?proposal=` link, retains varied Tuanzi copy, HTML escaping and the existing destination metadata; `anon` and `authenticated` EXECUTE remain denied, while `service_role` retains EXECUTE.
- Latest previously deployed Production Web was confirmed READY at `dpl_HgR3uh9cMfNnWcALvdhzb3vuM7Yj` with source SHA `62929e93b793c07d059305274da2461ca4879eb9`, which contains `/open/together`. No new Vercel deployment was performed in this migration action.
- Existing delivered PushPlus notifications are not rewritten. Newly generated Together messages can carry the link; actual Cat/Fish WeChat-client rendering, first-login return, cookie persistence and real notification interaction remain to be accepted with naturally occurring notifications.


## 2026-11-08 Meal Photo & Partner Favorite Food Production Release

- User-authorized Production deployment `dpl_ERTyrQyxnRWWTrL6nkBpoyiqcBnS` is READY, source SHA `2362a39750d17d901c8a3a2f5b2e19611af730e2` (PR #108). Vercel aliases include the existing Production compatibility domain `couple-better-game.vercel.app`.
- Browser meal-photo upload now pre-compresses photos larger than 4 MiB when browser image decoding is available; the canonical server Sharp normalization remains. HTTP errors and client image-preparation failures have more actionable error messages. Large HEIC/HEIF originals that a browser cannot decode may still require conversion; real mobile photo upload acceptance has **not** yet been verified.
- Existing `life_query(resource=favorite_food, person=me/ta/cat/fish)` now permits read-only partner queries. Live connected Harbor Cat querying `ta` returned Fish-owned templates successfully (`ok=true`); live Harbor Fish querying `ta` returned Cat-owned templates successfully (`ok=true`). Mutations remain actor-owned.
- GitHub PR #108 CI Test, Lint, Build passed. No Supabase migration, Production data write, or preview deployment was performed as part of this release. Vercel production error/fatal logs and runtime error aggregation showed no entries during the checked post-release window. No real photo upload was attempted for this verification.

## 2026-11-09 WeChat Official Account Callback V1 (GitHub main; not deployed)

- PR #109 merged as `a1363eb3018b823275bf3cbf34a3631073126902`; route `/api/wechat/official/callback` provides GET WeChat callback signature verification and POST secure-mode AES/XML encrypted greeting reply. Only `你好` / `hi` / `hello` produce a fixed Tuanzi welcome message; other messages return `success`.
- Server-only settings `WECHAT_OFFICIAL_APP_ID`, `WECHAT_OFFICIAL_TOKEN` and `WECHAT_OFFICIAL_ENCODING_AES_KEY` must be provisioned for the live site. None were submitted to repository or to Vercel during development.
- V1 does not run AI, call Life APIs, bind Cat/Fish identities, query Supabase, or mutate data. Handler is stateless/idempotent for repeated deliveries; persistent cross-instance duplicate tracking is not implemented.
- CI completed successfully: Build, Lint, **457/457 tests (80 test files)**. Tests exercise signed GET, encrypted GET challenge, POST encrypted roundtrip, response signature, invalid/expired signature, malformed/oversized XML, AppID mismatch and no-action responses.
- **No Vercel Preview/Production deployment or Production Supabase write was performed.** WeChat console server URL was not enabled or verified, and no live phone message receipt/reply test was performed. Production remains on its prior release until separate deployment authorization.

## 2026-11-09 WeChat Official Account V1 Production rollout

- Explicit user authorization for this Vercel Production deployment. GitHub main source `6b4c0e2f6e8e04d77ccfd912d0a2c4ab53afb80b` was compared with previously deployed source `2362a39750d17d901c8a3a2f5b2e19611af730e2`; changes only concern WeChat callback, tests and documentation.
- Project `beside` Production environment was verified to contain three required server-only keys `WECHAT_OFFICIAL_APP_ID`, `WECHAT_OFFICIAL_TOKEN`, `WECHAT_OFFICIAL_ENCODING_AES_KEY` without decrypting their values. No new secrets were stored in GitHub or disclosed in chat.
- Vercel deployment `dpl_B8vBTDaaEiPTtDgaKvfBX9uSoXqB` reached `READY`, correct production alias `couple-better-game.vercel.app`, matching source SHA `6b4c0e2f6e8e04d77ccfd912d0a2c4ab53afb80b`.
- Post-release 15-minute error/fatal deployment log and callback-route runtime error scans found no entries. This does **not** prove a successful WeChat GET configuration handshake or real incoming message roundtrip: those remain manual Tencent backend / WeChat tests.
- No Supabase migration or Life data operation, no official account backend activation. Existing PushPlus remains in use.
- This docs-only GitHub commit postdates the deployed commit and does not itself represent another Production deployment.

## 2026-11-09 WeChat inbound reply incident investigation (GitHub main only)

- Account admin confirmed message-push status `已启用`, supporting a successful initial server URL GET verification; end-user `你好` did not yield a reply. A successful GET handshake does not prove the actual encrypted POST message / passive reply flow.
- Existing deployment `dpl_B8vBTDaaEiPTtDgaKvfBX9uSoXqB` remains READY. Recent Vercel runtime error scans had no entries, but route contained no diagnostic logs, so request delivery and failure stage could not be established. The Hobby observability API did not provide request-level evidence.
- PR #110 merged as `f58937faf4bc82c448f968bbf4b4135111fdbc0c`: POST now accepts signed XML with application/xml, text/xml, application/octet-stream or absent Content-Type; strict `encrypt_type=aes`, `msg_signature`, AES/AppID, size and XML validation remain unchanged. Privacy-safe stage/status logging does **not** output user messages, OpenID, URL, ciphertext or secrets.
- CI: Build, Lint and all **458/458 tests** passed. No new Supabase migration, production write or Vercel deployment performed. Current production **does not yet contain PR #110**, and live reply failure remains unverified until a separately authorized deployment and new end-to-end WeChat message test.

## 2026-11-09 Partner life update details (GitHub implementation; Production pending)

- New forward migration `20261109190000_partner_record_detail_notifications.sql` expands the existing partner PushPlus event capture to include individual confirmed snacks and renders factual current mood, sleep duration, meal items and known/unknown kcal (no user notes or photos). Grouping, delivery provider, recipient preference and 21:00 summary remain unchanged.
- No migration applied to Production Supabase and no Vercel Preview/Production deployment authorized for this feature; not live. Requires separate Production Supabase migration authorization and disposable-database SQL verification.
- Pending direct Cat/Fish PushPlus delivery smoke after deployment; do not mistake GitHub CI passing for runtime proof.

## 2026-11-09 WeChat callback compatibility fix Production rollout

- User explicitly authorized this Vercel Production deployment only. Verified GitHub main `85a3aee45dcf27038c3ab0c6a792488ee57308e5` against previously deployed `6b4c0e2f6e8e04d77ccfd912d0a2c4ab53afb80b`; only WeChat callback route, tests and owning docs changed.
- Three required `WECHAT_OFFICIAL_*` variables were confirmed present for Production without decrypting or exposing secret values.
- Deployment `dpl_4Ep5FbZpAnNmLuPXjd9PJdcqCuMz` reached `READY`, with production alias `couple-better-game.vercel.app` and exact requested GitHub SHA. PR #110 Build, Lint and 458/458 tests passed.
- First 15-minute error/fatal runtime log scan and callback-route runtime error scan returned no entries. **Real WeChat POST inbound and encrypted passive reply remain unverified** pending a fresh user `你好` message; absence of errors alone does not prove delivery.
- This release made no Supabase write/migration or WeChat console changes. GitHub documentation-only commit after rollout may now be ahead of deployed source, without implying a new release.
