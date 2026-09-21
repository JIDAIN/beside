# 当前工程状态

**核验日期：2026-09-21**

本文只记录 **Production Web / GitHub main / Production Supabase 之间当前是否一致，以及仍有哪些未完成的工程验收**。

产品能力、业务规则、架构和未来设计不在这里重复维护。

## 1. 正式项目身份

| 项目 | 当前值 |
|---|---|
| 中文正式名 | 伴岛 |
| 英文名 | Beside |
| 日常称呼 | 小岛 |
| GitHub | JIDAIN/beside |
| Vercel Project | beside |
| Production URL | https://couple-better-game.vercel.app |
| Supabase ref | bfhntnzngozdqsmgfvjk |

`couple-better-game` / `couple_better_game` 继续存在于 Production URL、Supabase project name、space slug、cache key 等兼容位置时，不代表产品品牌回退。

## 2. 三层事实必须分开

```text
Production Web
!= GitHub main
!= Production Supabase runtime / migration ledger
```

判断“用户现在网页上运行什么”看 Production deployment。

判断“下一次部署会带上什么”看 GitHub main。

判断“数据库现在真实有什么”看 Production Supabase runtime；判断“Production 执行过哪些 migration”看 migration ledger。

不能只根据某一层推断另外两层。

## 3. Production Web

2026-09-21 重新核验，最新 Vercel Production 仍为：

```text
deployment  dpl_9VcNvuPrXogywWixknPS7z97qN1P
state       READY
target      production
source      0bd6f5fa6a7f96a4dac6311feb73322249fe4245
date        2026-09-15
```

这意味着 2026-09-21 的 migration 历史整理与文档重构 **没有部署到 Vercel，也没有触发新的 Production deployment**。

当前仓库继续要求：

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

任何新的 Preview / Production deployment 仍需单次明确授权。

## 4. GitHub main

GitHub main 当前领先于 Production Web，领先内容主要是：

- Supabase migration 文件名 / 顺序与 Production ledger 的历史收口；
- MOC-based 文档架构重构；
- 按当前源码和 Production runtime 做的工程文档内容收口。

本轮文档收口没有修改 Web 运行代码、没有修改 Supabase schema / business data，也没有触发 Vercel deployment。

每批文档修改仍通过 GitHub CI；完整代码 CI 的事实来源是 GitHub Actions，而不是本文手写测试数量。

开发与测试入口：
→ [Development & Testing](development-testing.md)

## 5. Production Supabase

2026-09-21 重新核验：

```text
project name  couple-better-game（历史兼容项目名）
ref           bfhntnzngozdqsmgfvjk
region        ap-northeast-1
status        ACTIVE_HEALTHY
Postgres      17
```

Production migration ledger 当前返回 **63 条 migration**。

仓库 migration 历史已做过一次收口：

- Production ledger 中的 63 条 migration 都有仓库对应；
- 公共 migration 相对顺序已与 Production ledger 对齐；
- 缺失的 `add_auth_pairing_bootstrap` 已从 Production ledger 原始 statements 恢复；
- 仓库额外保留一个显式 `replay_only_wechat_test_account_probe`，记录 runtime 存在但没有独立 ledger entry 的历史 helper 步骤。

判断数据库当前行为仍以 **runtime schema / functions** 优先，不能因为仓库有 migration 文件就假定 Production 一定执行过。

Migration 运维：
→ [Operations Runbook](operations-runbook.md)
→ [Supabase README](../../supabase/README.md)

## 6. 2026-09-21 本轮已直接核验的 runtime facts

本轮文档收口为了避免“文档互相抄”，直接读了当前代码，并对关键事实做了 Production Supabase 只读核验，包括：

- fixed account 只有 cat / fish，两条 Production credential 均存在；
- `authenticate_fixed_life_account` 对 anon/authenticated 无 EXECUTE、service_role 可 EXECUTE；
- 核心 Life 表启用 RLS；
- Meal Production schema / active main-meal unique constraint；
- Meal nutrition nullable 与 Web / AI 流程要求的区别；
- Reminder 两个 active cron；
- Cat / Fish 每日记录完整性提醒当前均为 21:00 Asia/Shanghai；
- mailbox notification 的 WeChat test account primary + PushPlus fallback；
- 当前 Reminder Center 与 daily_record direct-claim 是两条不同运行路径。

这些细节各自只在 canonical 文档维护：

- [Architecture MOC](../architecture/README.md)
- [Meal MOC](../domains/meal/README.md)
- [Reminder MOC](../domains/reminders/README.md)

## 7. Production 真实使用验证

用户已长期使用当前 Production，并确认真实登录后的日常写入、读取、修改、刷新等使用过程中未发现异常。

这属于真实使用验收结论，不额外虚构未明确执行过的自动化脚本覆盖范围。

## 8. 可选的长期灾备验证

### Blank-database full replay

仓库当前 64 个 migration 文件尚未在一次性空数据库中完成从零全量 replay。它属于长期灾备 / 新环境可重建性验证，不阻塞当前开发、日常使用或 Production。

当前已经确认：

- Production runtime 正常；
- Production ledger 与公共仓库 migration 顺序已对齐。

尚未验证的是：**仅依赖仓库 migration，能否从全空数据库完整重建当前 schema/runtime。**

这项验证可在未来新建 staging、灾备演练、迁移 Supabase project 或其他本来就需要新数据库环境的场景顺带执行。不要为了完成文档清单单独创建可能产生费用的 Supabase branch / project；如确需创建，必须先取得用户明确同意。

## 9. 文档一致性规则

GitHub docs 的目标是描述 **当前程序事实**。

冲突时优先级：

```text
已核验 Production runtime
→ 当前 GitHub main 代码
→ 当前 canonical docs
→ Accepted ADR
→ archive
→ Git 历史 / 旧聊天
```

发现文档与代码或 Production 不一致时，优先修正文档或明确说明 main / Production 差异，不用另一篇文档去“覆盖”错误事实。

总入口：
→ [Engineering Docs MOC](../README.md)

## 10. 当前发布纪律

```text
commit
→ CI success
≠ Preview authorization
≠ Production authorization
```

文档修改、代码提交或 Supabase 只读核验不会自动获得部署授权。

完整规则：
→ [Deployment & Security](deployment-security.md)
