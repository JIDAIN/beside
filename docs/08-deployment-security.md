# 部署与安全

状态：2026-09-07。

## 1. 当前生产架构

```text
Browser / MCP client
  -> Next.js / Vercel
  -> fixed Web session 或 MCP OAuth token
  -> actor-aware canonical service / restricted RPC
  -> Supabase PostgreSQL / Private Storage
```

浏览器不持有 Supabase service/secret key。固定账号、session、MCP OAuth 与资源权限矩阵见 [`17-auth-and-pairing.md`](17-auth-and-pairing.md)。

## 2. 配置与 Secret

环境变量不在本文档重复维护完整清单；当前唯一配置清单见 [`15-configuration-reference.md`](15-configuration-reference.md)。

核心安全规则：

- `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 只在服务端；
- `LIFE_MCP_SIGNING_SECRET` 只在服务端，且长度至少 32 字符；
- `AI_GATEWAY_API_KEY`、PushPlus token 等 secret 不进入 Git；
- PushPlus token 由服务端写入 Supabase Vault，不读回浏览器；
- 禁止创建 `NEXT_PUBLIC_SUPABASE_SECRET_KEY` 一类把服务端 secret 暴露给浏览器的变量；
- `.env*` 继续保持 gitignore；
- 文档只记录变量名、用途和要求，不记录真实值。

`DATA_EDIT_PASSWORD` 仍被 Legacy Game / 旧 cloud-session compatibility path 使用，但**不是** Island Life 固定账号登录密码，也不参与当前 MCP OAuth 身份。

## 3. 固定双账号登录

项目只有两个固定身份：

```text
cat
fish
```

登录页使用普通账号 + 密码。真实凭据保存在 Production Supabase 的 `life_fixed_accounts`：

```text
username
password_hash (bcrypt)
partner_key = cat / fish
```

Next.js 登录 API 通过 server-only `authenticate_fixed_life_account` RPC 校验，成功后写入 `life-account-session`：

- HttpOnly；
- SameSite=Lax；
- Production Secure；
- 30 天有效；
- payload 只含 `partnerKey` / expiresAt；
- 使用 Supabase server secret + 固定域分隔符进行 HMAC-SHA256 签名。

Session 签名不依赖登录密码或旧 `DATA_EDIT_PASSWORD`。

不提供：

```text
/api/auth/signup
/api/auth/bootstrap
/api/auth/pairing/*
```

只保留固定账号登录相关产品入口：

```text
/api/auth/login
/api/auth/session
/api/auth/logout
```

## 4. MCP OAuth

当前 Harbor Cat / Fish 直接通过 MCP OAuth 连接 `/mcp`。

支撑端点：

```text
/oauth/register
/oauth/authorize
/oauth/token
/mcp
```

`LIFE_MCP_SIGNING_SECRET` 用于签名 client registration、authorization code、access token、refresh token，并用于 MCP media recovery token 的密钥派生。

OAuth token 绑定 `partnerKey`；聊天中的昵称、自称或普通参数不能切换真实身份。

旧 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge transport 已退出当前运行链路，不得重新作为正式架构写回当前文档。

## 5. 个人写权限

业务 API、AI Access Core 和数据库 RPC 都不能相信页面或模型传入的 owner 文本。

个人资源统一满足：

```text
signed actor == record owner -> 允许
signed actor != record owner -> 拒绝
```

当前已覆盖的关键边界包括：

- mood：只能 upsert / delete 自己；
- sleep：只能维护自己；
- meal / photo：只能新增、修改、删除自己的餐食与照片；
- weight：只能新增、修改、删除自己的体重；
- activity：单方活动只能本人维护，`both` 由双方维护且不能被单方静默降级；
- mailbox draft：只有寄件人可见可改；
- mailbox sent：双方可见但永久只读；
- reminder instance / PushPlus token：绑定当前 actor。

共享药箱、纪念日等明确 couple-space 事实按共享规则维护。完整矩阵以 `17-auth-and-pairing.md` 为准。

## 6. Supabase Auth 临时方案清理

R1B 曾短暂实现开放式 Supabase Auth + membership + invitation，产品复核后确认固定只有两位使用者，因此已撤销。

历史 migration 保持不可回写；最终状态通过后续 cleanup migration 达成。不得为了“让历史看起来干净”篡改已经执行过的 migration。

## 7. RLS / server-only 表

大量业务表启用 RLS，但不提供 anon/authenticated 直接访问 policy，这是当前 server-only 架构的刻意结果。

原则：

```text
Browser / MCP
→ Next.js server / canonical service
→ service_role / restricted actor-aware RPC
→ Supabase
```

不要为了消除 `RLS Enabled No Policy` INFO 而开放浏览器直连业务表。

## 8. 数据与 Storage

- Supabase 是生活数据正式 Source of Truth；
- `meal-photos` 等真实照片使用 private Storage；
- 本地 stale cache / Service Worker cache 不是权限或事实来源；
- Island Life import / restore 默认不得触碰 Legacy Game 表；
- 已执行 migration 不回改，schema 变化只追加新 migration；
- 真实个人数据、药箱库存、账号密码、PushPlus token 不写入 migration seed 或公开仓库。

数据边界见 [`48-life-legacy-game-data-boundary.md`](48-life-legacy-game-data-boundary.md)。恢复操作流程见 [`16-operations-runbook.md`](16-operations-runbook.md)。

## 9. AI 写入安全

AI 只通过受限工具和 canonical service 操作：

```text
讨论 / 估算 -> 不写
明确业务动作 -> normalize / validation / permission / idempotency -> write -> read-back
```

新 meal 还必须遵守聊天层草稿确认流程。

AI 不获得任意 SQL、不直接持有 service role、不通过昵称切换 actor。

## 10. Vercel 部署审批

仓库必须保持：

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

规则：

- Git push / 文档提交 / merge 不自动部署；
- Preview 与 Production 都需要用户针对本次部署的明确授权；
- 一次授权只覆盖一次部署；
- 完成后继续保持 Git 自动部署关闭；
- 未授权时可以提交代码、文档、运行 CI，但不能触发 Vercel 部署。

## 11. 下一次部署前检查

```text
[ ] Git 自动部署仍关闭
[ ] Test / Lint / Build 全部通过
[ ] 15-configuration-reference.md 中 Required 配置已满足
[ ] 登录只允许固定 cat / fish 账号
[ ] 无 signup / pairing / bootstrap 产品入口
[ ] 未登录 Life API -> 401
[ ] cat 不能写 fish 的个人记录，反之亦然
[ ] MCP access token 绑定 actor，不能由文本切换
[ ] secret/service-role key 未进入浏览器或 Git
[ ] migration 不包含真实个人数据
[ ] Island Life maintenance 未越界修改 Legacy Game
[ ] Security Advisor 无新增意外高权限入口
[ ] 受影响功能已完成 smoke test
[ ] 部署已获得本次明确授权
```

## 12. 生产故障

部署失败、Supabase/RPC 异常、MCP 连接失败、Reminder/PushPlus 不投递、误删/恢复等问题不在本页临时追加排障笔记；统一按 [`16-operations-runbook.md`](16-operations-runbook.md) 处理，并把长期有效结论回写到相应主文档。
