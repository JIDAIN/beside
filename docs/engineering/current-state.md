# Current Engineering State

Snapshot date: 2026-11-04.

本文记录 Production Web、GitHub main、Production Supabase 的已核验状态与差异；稳定业务语义由 owning canonical docs 维护。

## 1. Production Web

2026-11-04 心愿清单正式部署：
- deployment: `dpl_2tqZk8CgApfbd7pzNcuoEUi4TC3H`
- state: READY
- target: production
- source commit: `d226c2578f95c3d233b9915bf12090ad5d6698fd`
- URL: https://couple-better-game.vercel.app
- framework: Next.js 16.2.6

Vercel production build 成功，`/nest/wishes` 和 `/api/life/wishes/**` 均出现在构建输出中。公网访问新页面可读取标题和筛选文案；未登录 GET `/api/life/wishes` 返回 HTTP 401。新 deployment 最近 30 分钟筛查未发现相关 runtime error，但这一结果不能代替真实使用验收。

## 2. GitHub Main

main 包含心愿清单页面、共享 API、私有封面对象服务、数据模型、测试源码、canonical docs，以及与 runtime ledger 对齐的 migration `20261104005447_life_wishes.sql`。

部署源 commit 为 `d226c257`；其后仓库包含迁移文件版本对齐和文档更新。不要把后续 docs-only commit 当作新的 Production 部署。

## 3. Production Supabase

- project ref: `bfhntnzngozdqsmgfvjk`（共享 Supabase project）
- 2026-11-04 用户授权后成功执行 migration，ledger version: `20261104005447`，name: `life_wishes`。
- read-only runtime verification 已确认 `public.life_wishes`、`list_life_wishes` / `write_life_wish` / `bind_life_wish_image` RPC，以及私有 `wish-photos` bucket 存在。
- 迁移后只读 `list_life_wishes('couple-better-game')` 返回空数组，数据库查询成功且没有心愿记录。
- 没有自动把新域纳入既有 Life backup/import/restore allowlist。

## 4. GitHub main 未部署变更（2026-11-04）\n\n已在 main 注册 AI/MCP 的 wish resource，复用 life_query / life_mutate 和原有 OAuth life:read / life:write scope，并补充规范化、重复写入防护与测试文件。Production Vercel 仍为本文件上面的已发布 commit，新 MCP 功能尚未部署、未完成端到端验收。\n\n## 5. Outstanding Verification

- `npm run build` 已由 Vercel 构建成功验证；`npm run test` / `npm run lint` 尚无实测通过证据。
- 真实 Cat/Fish 登录 CRUD、跨账号共享、封面上传/读取/替换/删除、重复体验及移动端截图验收尚未完成。
- 尝试事务内 Production SQL smoke 时遭执行环境安全检查拦截，未绕过；不能宣称 DB 写入 smoke 已通过。
- 数据恢复范围尚未覆盖心愿记录与封面；使用备份/恢复前应明确该限制。
- Blank-database full replay 尚未在独立空库执行。

## 6. Deployment Protection

`vercel.json` 仍要求 `git.deploymentEnabled=false`。Git commit、CI 成功或迁移成功都不等于新的 Preview / Production 授权；后续每一次部署与 Production Supabase 写操作都必须单独授权。
