# ADR-0002 固定 Cat/Fish 双身份与服务端权限

- Status: Accepted
- Date: 2026-09-07

## Context

项目长期只有两位固定使用者。早期曾尝试开放式 Supabase Auth、membership、invitation，也曾存在旧同步密码路径；这些方案增加了不必要的注册、配对和身份复杂度。

同时，AI、Web 页面和 MCP 都可能带有 `cat / fish / 我 / Ta` 等文本参数，因此不能把客户端声明当成真实身份。

## Decision

产品只保留两个稳定 actor：

```text
cat
fish
```

网页登录通过 Supabase `life_fixed_accounts` + server-only RPC 校验账号密码，成功后由服务器签发 HMAC `life-account-session`。

MCP 通过 OAuth 签发绑定 `partnerKey` 的 access token。

所有个人数据 mutation 必须由服务端 / actor-aware RPC 再校验 ownership；昵称、自称、页面参数和模型文本都不能切换可信 actor。

不重新引入开放注册、邀请码、第三账号或“先选身份再输入共享密码”的正常产品流程。

## Consequences

优点：

- 身份模型与真实使用人数一致；
- Web / MCP / AI 可以共享同一权限语义；
- 防止前端篡改 `partnerKey` 越权；
- 登录体验更简单。

代价 / 约束：

- 如果未来真的增加第三位长期用户，需要新的 ADR 重新设计账号模型；
- 固定凭据维护属于 Production 数据运维，不进入公开 migration seed；
- Legacy Game 的 `DATA_EDIT_PASSWORD` compatibility 必须与 Island Life 登录清晰隔离。

## Related

- `docs/08-deployment-security.md`
- `docs/15-configuration-reference.md`
- `docs/17-auth-and-pairing.md`
- `lib/server/fixed-life-auth.ts`
- `lib/server/life-mcp-auth.ts`
