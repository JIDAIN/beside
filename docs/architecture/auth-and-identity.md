# Auth & Identity

本文维护可信身份来源、ownership 与授权边界。部署、UI 和具体 Domain lifecycle 不属于本文。

## 1. Identity Model

伴岛当前只有两位固定使用者：
- cat
- fish

UI：
- cat 登录 → 我=cat，Ta=fish
- fish 登录 → 我=fish，Ta=cat

数据库只保存稳定 partnerKey；“我 / Ta”是相对当前 signed identity 的展示语义。

当前不开放注册、邮箱验证、邀请码、配对或第三账号。

## 2. Trusted Actor Sources

### 2.1 Web Session

~~~text
username/password
→ authenticate_fixed_life_account
→ server-signed HttpOnly life-account-session
→ partnerKey
~~~

session：
- HttpOnly；
- SameSite=Lax；
- Production Secure；
- path=/；
- 当前 max-age 30 天。

payload 只包含 partnerKey 与 expiresAt。

### 2.2 MCP OAuth

~~~text
authorize
→ signed authorization code
→ signed access/refresh token
→ partnerKey + scope
→ /mcp
~~~

scopes 当前为 life:read / life:write / offline_access。

## 3. Untrusted Identity Inputs

以下内容不能切换真实 actor：
- request body 的 actor / partnerKey；
- AI 的 person 参数；
- “我是 Fish / Cat”等聊天自称；
- AI 昵称；
- UI role switch；
- prompt 文本。

## 4. Authorization Principles

personal mutation：
signed actor == owner → 可维护；
signed actor != owner → 拒绝。

前端按钮不是安全边界。Next.js API、AI Access Core 与 Supabase RPC 必须保持服务端约束。

shared / sender-recipient / system resource 必须明确自己的授权模型。

## 5. Resource Permission Matrix

| Resource | Read | Write |
|---|---|---|
| mood | 双方可查看 | 当前 actor 仅自己的 upsert/delete |
| sleep | 双方可查看 | Web 当前 actor 可 upsert/delete 自己；AI 当前只暴露 upsert |
| Meal/photo | 双方可查看 | 只能维护自己的 |
| weight | 双方可查看 | 只能维护自己的 |
| activity cat/fish | 页面按语义查看 | 只有对应本人维护 |
| activity both | 双方可查看 | 双方可维护；不能静默降成单方 |
| medicine | 家庭共享 | 双方可维护 |
| mailbox draft | 仅 sender | 仅 sender 可 edit/delete/send |
| mailbox sent | sender + recipient | 永久只读 |
| targetWeightKg | 双方可查看 | 只改自己 |
| anniversaryDate | 双方共享 | 双方可维护 |
| reminder instance | 当前 actor 自己 | action 绑定当前 actor |
| custom reminder | actor 创建 | recipient 可 cat/fish/both |
| PushPlus token | 只看自己配置状态 | 只维护自己 |
| favorite food | 自己模板 | 只维护自己 |

## 6. Shared-resource Patterns

### Activity
participant_scope = cat / fish / both。
Cat 不能维护 fish-only；Fish 不能维护 cat-only；both 双方可维护；both 不能被任一方静默降为单方；个人活动可以由本人升级为 both。

### Medicine
药箱 inventory 是 couple-space shared fact；提醒偏好仍按 actor 独立。

### Settings
anniversaryDate shared；targetWeightKg personal。

## 7. Lifecycle-sensitive Resources

### Mailbox
draft sender-only；send 后写 sent_at；sent 双方可见且永久只读。

### Reminder Instances
instance action 与当前 actor 绑定；both recipient 会物化成独立 actor state，而不是一条共享完成状态。

## 8. AI Additional Safety

在普通 ownership 之外：
- delete 需要用户当前消息明确删除意图；
- update/delete 不猜 UUID；
- mailbox sent 即使知道 UUID 也不可改；
- Legacy Game 全量 replace 需要高风险确认。

具体 tool surface 见 AI Architecture。

## 9. Database Permission Boundary

核心 Life 表启用 RLS。
当前模式是 server-only service role / restricted actor-aware RPC；anon/authenticated 不应获得任意业务表高权限写。

不要为了消除安全 Advisor 信息而开放浏览器直写。

## 10. Legacy Compatibility Identity

旧 /game 可继续使用 DATA_EDIT_PASSWORD / cloud-session 兼容路径，但它不是 Life 登录、MCP OAuth 或 AI 身份来源。

## 11. New Resource Ownership Checklist

新增资源先回答：
- personal / shared / sender-recipient / system / legacy？
- 谁可 read？
- 谁可 create？
- 谁可 update/delete？
- Ta 是否只读？
- shared 是否双方都可维护？
- AI 是否有额外限制？
- DB/RPC 是否重新校验？
- backup/import 是否遵守同一 ownership？

先定 ownership，再做 UI。

## 12. Implementation Anchors

- lib/server/fixed-life-auth.ts
- lib/server/life-mcp-auth.ts
- lib/server/life-api.ts
- lib/server/supabase-*.ts
- lib/server/life-agent-registry.ts
- app/api/auth/**
- app/oauth/**
- tests/life/auth-boundary.test.ts
- tests/life/relative-identity.test.ts
- tests/server/life-mcp-auth.test.ts
- tests/server/life-agent-*.test.ts

## 13. Regression / Maintenance

ownership、actor source、shared semantics、permission matrix 改变时更新本文并补 cross-owner regression。
一次性 Production 核验结果进入 Current State / History，不写成长期身份 contract。
