# Current Engineering State

Snapshot date: 2026-11-06.

这里记录 Production Web、GitHub main 与 Supabase runtime 的已核验差异；业务规则见 owning canonical docs。

## 1. Production Web

- Vercel Project: `beside`；正式 URL：https://couple-better-game.vercel.app
- Production deployment `dpl_B2BL6fQ4tzCnz6idDY4aQD5gENZk`，READY，source `bdf43ba579b1a4edbc3cb5337b411d944605b478`。
- 小窝「一起做吧」Web 与 `/api/life/proposals` 已发布；公开只读 smoke 已通过。未登录提案 API 返回 401。
- 两人真机协商、微信提醒实际送达尚未端到端验收。

## 2. GitHub Main / MCP

- 当前 main 基线 `bdf43ba`，含 Web Together 与既有 wish MCP registry。
- Production MCP stable tools：`life_capabilities` / `life_query` / `life_mutate`；**目前未注册 proposal**。
- `proposal` AI/MCP 扩展位于 `feat/together-mcp-resource` 开发分支，未合并 main、未部署。

## 3. Production Supabase

- project ref: `bfhntnzngozdqsmgfvjk`。
- Together migration ledger `20261106082742` (`life_proposals`) 已应用；表、受限 RPC 与每 5 分钟的 `life-proposal-sweep-v1` cron 已核验。
- Cat/Fish PushPlus 配置存在；未授权的 anon/authenticated 无直接提案写权限。

## 4. Outstanding Verification

- Together 真机双账号、微信发送及 MCP proposal 实际读写须在发布后验证。
- 全仓仍有两项旧心愿清单测试失败，与这次 Together 修改无关。
- 其他 Life backup 缺口（例如 wish 图片）仍然独立存在。

## 5. Deployment Protection

Git 自动部署关闭。Git merge/CI success 不是部署授权；每一次 Preview/Production 和 Production Supabase 写操作均需独立授权。
