# Supabase 数据库版本管理

本目录保存项目 Supabase PostgreSQL 的数据库变更 SQL。Production 当前实际 schema / runtime 与 `supabase_migrations.schema_migrations` 仍是数据库事实来源。

## 目录规则

- `migrations/` 按文件名前缀顺序执行。
- 已经在 Production 执行过的 migration **不可为了修正当前业务而回头改 SQL**；新的 schema / function / view / trigger / grant / RLS 变化继续新增 migration。
- 2026-09-21 已重新用 Production `supabase_migrations.schema_migrations` 对账仓库：Production ledger 中 63 个 migration 名均已有对应仓库文件，公共 migration 的相对顺序与 Production 一致。
- 历史缺失的 `20260902150933_add_auth_pairing_bootstrap.sql` 已从 Production ledger 保存的原始 `statements` 恢复到仓库。
- Production 实际运行过的部分 migration 曾以不同本地时间戳回填；本轮已将这些仓库文件名恢复为 Production ledger 的真实 version，避免按旧文件名重放时产生依赖倒置。
- 数据库 schema、function、view、trigger、grant、RLS 等变更必须进入 migration，禁止只在 Production 手工修改后长期不落库。

### Replay-only 历史兼容步骤

仓库额外保留：

```text
20260907110000_replay_only_wechat_test_account_probe.sql
```

它保存的是当前 Production runtime 中确实存在、且后续 `mailbox_wechat_primary_pushplus_fallback` 依赖的微信测试号 helper SQL；但 Production migration ledger 没有一条独立同名记录，因此它**不是 Production ledger migration**，只作为空库重放的历史兼容步骤。

不要把这个 replay-only 文件误写成“Production 曾执行过同名 migration”，也不要仅凭仓库文件数量判断 Production migration 数量。

## 当前安全模型

当前浏览器不直接访问 Supabase：

```text
Browser -> Next.js API -> server-only Supabase secret/service_role -> PostgreSQL
```

public 基础表启用 RLS，当前不向 `anon` / `authenticated` 开放业务 policy；需要的 RPC/grant 仅给服务端 `service_role`。

不要提交：

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
任何真实密码、token、个人备份数据
```

## 从空数据库重建

当前仓库已经恢复 Production 公共 migration 的真实顺序，并补齐已知缺失依赖。重建顺序是：

1. 在**一次性空 Supabase/PostgreSQL 环境**中按文件名顺序执行 `migrations/*.sql`；
2. replay-only 微信 helper 会在其依赖方之前执行；
3. 验证 table / view / function / trigger / RLS / grants；
4. 再单独恢复或导入业务数据。

截至 2026-09-21，本轮完成的是 **Production ledger 对账 + 依赖顺序静态收口**，还没有在一次性空项目上执行整套 64 个 SQL 的完整 blank-database replay。因此在把它作为灾难恢复唯一依据前，仍应完成一次真实空库重放验收。

migration 只负责数据库结构和规则，不内嵌当前情侣空间的真实业务数据。**schema 可重建不等于 Production 数据备份。**

## Production ledger 对账规则

以后排查 migration 漂移时同时看三层：

```text
Production runtime schema / functions
Production supabase_migrations.schema_migrations
GitHub supabase/migrations
```

判断顺序：

- 当前功能是否存在，以 runtime schema / function 为准；
- “Production 执行过什么、顺序是什么”，以 `schema_migrations` 为准；
- “新环境如何重放”，以仓库 migration 序列为准，并显式考虑 replay-only 兼容步骤。

如果三层不一致，不要直接改已执行历史 SQL；先确认是缺失历史快照、ledger 未记录的手工历史步骤，还是需要新的 forward migration。

## 历史默认值说明

`20260901010632_create_core_v1_schema.sql` 是当时真实执行的历史 SQL，其中 `coin_deficit_streak_days` 初始默认值为 7。

后续 `20260901055415_align_coin_deficit_streak_default.sql` 将默认值正式统一为当前业务规则的 5。不要为了让第一份文件“看起来正确”而改写历史。
