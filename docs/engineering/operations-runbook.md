# Production Operations Runbook

本文回答：程序上线后出问题时，从哪里开始查、什么时候停止操作、怎样最小恢复且不扩大事故。

## 1. Incident Principles

~~~text
先保数据
→ 确认影响范围
→ 找到 canonical fact layer
→ 最小修复
→ 验证
→ 恢复使用
~~~

禁止在原因不明时：
- 扫描删除“最近所有数据”；
- 同时修改多个 Domain；
- 回写已执行 migration；
- 临时开放 anon/authenticated 高权限；
- 跨 Life/Legacy 覆盖数据；
- 未授权触发 Preview/Production。

## 2. Triage Matrix

| Symptom | First fact source | Next |
|---|---|---|
| page/API 500 | Vercel runtime/build log | route/server service |
| login failure | auth API | fixed accounts/auth RPC |
| Life data wrong | Supabase current table/RPC | client cache |
| MCP failure | OAuth /mcp | mcp-auth/AI Core |
| built-in AI failure | /api/ai/chat | gateway/tool result |
| reminder missing | Reminder Domain path | cron/delivery/provider |
| photo missing | meal photo_path/private object | photo API/cache |
| restore issue | backup snapshot/RPC | data-management |
| Legacy sync | home-data/save-data | legacy session |

不要先从浏览器缓存推断数据库事实。

## 3. Deployment / Runtime

Build fail：
commit → Test/Lint/Build failure → code/dependency/config → fix → CI → 如需部署重新取得授权。

READY 但功能坏：
先分 UI / API / schema/RPC / config / data corruption。
DB 已变化时不要假设 Git rollback 就能回滚系统。

## 4. Auth / Permission

两人都不能登录：
SUPABASE_URL/secret → authenticate RPC → life_fixed_accounts → /api/auth/login。

一人能登录但写错：
session partnerKey → API ownership → actor-aware RPC → existing row owner/scope。

出现 cross-owner write 按安全事故处理：先停止相关写入口，再修服务端授权。

## 5. MCP / OAuth

当前正式链：
register/authorize/token → signed access token → /mcp → life_query/life_mutate。

检查：
- /mcp 可达；
- OAuth metadata/routes；
- LIFE_MCP_SIGNING_SECRET；
- token aud/partnerKey/scope；
- signing secret 是否刚轮换。

不要恢复旧 Apps Script/Fast Wake/Drive Bridge 作为临时正式方案。

## 6. Built-in AI

未配置：
AI_GATEWAY_API_KEY 或 VERCEL_OIDC_TOKEN。

模型能回复但工具失败：
tool result/errorCode → clarification/permission/validation/server → corresponding canonical service。

LIFE_CLARIFICATION_REQUIRED 是正常 contract，不是系统故障。

## 7. Reminder / Provider

先区分 Stateful instance 与 Condition Nudge。

Stateful：
instance → due/status/notified_at → scheduler → delivery → provider。

daily completeness：
preferences → completeness → claim delivery → provider；没有 daily_record instance。

mailbox：
draft 不提醒；first sent → one recipient instance → WeChat primary → PushPlus fallback。

snooze：
new effective due + new dedupe key = 合法再次提醒。

## 8. Meal / Private Media

photo issue：
Meal exists/owner → photo_path → private object → photo API → display metadata → browser cache。

upload：
input → EXIF normalize → compression → Storage → DB binding → cleanup。

不要为修显示把 bucket 改 public。

## 9. Client Cache / Revalidation

通用排查顺序：

~~~text
API fact
→ actor/date/scope
→ cache key
→ stale snapshot
→ mutation revision
→ foreground/multi-tab signal
→ Service Worker
→ real browser session verification
~~~

具体 timeout/revalidate 参数见 API & Sync，不在 Runbook 维护第二份。

## 10. Life Data Repair

先判断：
- 单条；
- 单个 Domain；
- 整个 Life snapshot；
- 是否涉及 Legacy。

局部事实明确时优先通过正常 Web/API/AI path 修复，不绕过权限直接写表。

## 11. Backup / Restore

当前正式能力：
- life_backup_snapshots
- restore_life_backup_snapshot
- import_life_full_data

UI/API 恢复与导入要求明确确认短语“确认恢复生活数据”。

restore 覆盖前会创建 pre_restore snapshot。

标准流程：
停止写入 → 确认 snapshot → 核 scope → 明确确认 → restore → read-back → auth/permission → cache refresh → 保留 pre_restore。

选错 snapshot 时优先用 pre_restore 回到操作前，不连续手工覆盖。

## 12. Life / Legacy Disaster Boundary

Life backup/import/restore 默认只处理 Life + 明确 shared config。

Legacy Game daily_records/daily_record_sides/exchange/wallet 等除非明确要求，不纳入 Life 清理/恢复。

## 13. Migration / Ledger / Replay

必须区分：
- runtime schema/functions；
- Production migration ledger；
- repo migration files。

规则：
- forward migration only；
- 不回写已执行 migration；
- 不改 ledger 只为“看起来对齐”；
- replay-only helper 明确标记为历史重建辅助，不伪造 Production ledger entry；
- runtime 行为优先于“仓库里有文件所以线上一定执行过”的假设。

## 14. Blank-database Recovery

灾备重建顺序：

~~~text
repo migrations replay
→ verify schema/functions/RLS/grants
→ configure secrets/env
→ restore Life data
→ restore private Storage if needed
→ fixed-account auth
→ cron/provider config
→ API/business smoke
~~~

schema 可重建 != 用户数据已经备份。

## 15. Observability

根据问题使用：
- Vercel build/runtime logs；
- API response/errorCode；
- Supabase runtime tables/functions；
- cron/job/delivery state；
- client cache diagnostic；
- GitHub CI。

不要把一次日志截图写进长期 contract。

## 16. Incident Closeout

完成后：
- 验证用户实际路径；
- 清理测试数据；
- 确认无跨域副作用；
- 更新 current canonical docs（若 contract 变了）；
- 重要事故/架构变化再写 History/Changelog；
- 未授权不触发额外部署。

## 17. Maintenance Rules

只保留可复用 runbook。
一次性 migration 对账、具体日期事故与旧发布流水进入 History。
