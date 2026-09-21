# 固定双账号身份与权限

状态：2026-09-21。本文维护 **身份来源和授权边界**，不承担部署、UI 或具体 Domain 生命周期说明。

## 1. 固定身份

伴岛当前只有两位固定使用者：

- cat
- fish

进入应用后：

- cat 登录：我 = cat，Ta = fish；
- fish 登录：我 = fish，Ta = cat。

数据库保存稳定 partnerKey；“我 / Ta”只是相对当前 signed identity 的 UI 语义。

不开放：

- 注册；
- 邮箱验证；
- 邀请码；
- 配对流程；
- 第三个账号。

## 2. Production 固定账号

Production Supabase 当前存在且只存在 cat / fish 两条 life_fixed_accounts 凭据记录。

每条记录包含：

- partner_key；
- username；
- password_hash。

密码只保存 hash，不进入 Git，也不写 migration seed。

2026-09-21 已直接核验 Production 两个账号均存在 username 与 password_hash。

## 3. 登录验证

Web 登录通过 server-side RPC：

public.authenticate_fixed_life_account(username, password)

2026-09-21 Production 权限核验：

- anon：无 EXECUTE；
- authenticated：无 EXECUTE；
- service_role：有 EXECUTE。

浏览器不能直接调用该 RPC 读取或验证凭据。

## 4. Web session

登录成功后服务器签发：

life-account-session

属性：

- HttpOnly；
- SameSite=Lax；
- Production Secure；
- path=/；
- 30 天 max age。

payload 只有 partnerKey 与 expiresAt。

签名使用 server-side Supabase secret 派生的 HMAC-SHA256 secret；session 不依赖用户明文密码或旧同步密码。

GET /api/auth/session 只读取签名 cookie；无效 session 会返回 authenticated=false 并清除无效 cookie。

## 5. MCP OAuth identity

MCP OAuth 的 authorization code / access token / refresh token 同样携带稳定 partnerKey。

当前 token identity 不能被以下内容覆盖：

- AI 昵称；
- 聊天自称；
- person 参数；
- payload actor；
- prompt 文本。

MCP scopes 当前为 life:read / life:write / offline_access。

## 6. 总权限原则

个人数据 mutation：

signed actor == record owner
→ 允许

signed actor != record owner
→ 拒绝

前端是否显示按钮不是安全边界；Next.js API、AI Access Core 和 Supabase RPC 必须各自保持授权约束。

## 7. 当前资源权限矩阵

| 资源 | 读取 | 写入 |
|---|---|---|
| mood | 双方可查看 | 当前 actor 只能 upsert/delete 自己 |
| sleep | 双方可查看 | Web/API 当前 actor 可 upsert/delete 自己；AI registry 当前只暴露 upsert |
| meal / photo | 双方可查看 | 只能维护自己的 Meal / photo |
| weight | 双方可查看 | 只能维护自己的记录 |
| activity: cat/fish | 双方按页面语义查看 | 只有对应 participant 本人维护 |
| activity: both | 双方可查看 | 双方可维护；不能被任一方静默降成单方 |
| medicine | 家庭共享 | 双方都可维护 |
| mailbox draft | 只寄件人可见 | 只寄件人可编辑、删除、寄出 |
| mailbox sent | sender + recipient 可见 | 永久只读 |
| targetWeightKg | 双方可查看 | 只修改当前账号自己的目标 |
| anniversaryDate | 双方共享 | 双方可维护 |
| reminder instances | 当前账号只看自己的 instance | instance action 绑定当前 actor |
| custom reminder | 由 actor 创建 | 可以选择 cat / fish / both 为 recipient |
| PushPlus token | 只看自己是否配置 | 只能维护当前账号自己的 token |
| favorite food | 当前账号自己的模板 | 只能维护自己的模板 |

## 8. Activity 特殊规则

participant_scope：

- cat
- fish
- both

规则：

- Cat 不能维护 fish-only；
- Fish 不能维护 cat-only；
- both 双方都可维护；
- both 不能被任一方直接降成单方；
- 个人活动可由本人升级为 both。

服务端 actor-aware RPC 重新校验，不相信浏览器或 AI 自报 scope。

## 9. Weight 特殊规则

weight create / update / delete 同时核对：

- signed actor；
- existing row partner_key；
- payload partnerKey。

三者必须一致。

Legacy Game 关联的旧 weight 仍遵循旧游戏自己的兼容边界。

## 10. Mailbox 特殊规则

状态只有：

draft
→ sent

sender 永远是 signed actor，recipient 按业务规则为另一方。

- 自己 draft：可见、可改、可删、可寄；
- Ta draft：不可见；
- sent：双方可见、双方只读。

draft → sent 由授权后的 server/RPC 完成，并写 sent_at。

当前没有“只从自己的已寄出列表删除副本”能力。

## 11. AI / MCP 额外约束

AI mutation 继续受同样 owner/shared 权限约束。

此外：

- delete 需要当前用户消息明确删除意图；
- update/delete 不能猜 UUID；
- mailbox sent 即使知道 UUID 也不可修改；
- Legacy Game 整体 replace 需要高风险确认。

AI 当前具体注册了哪些 action：
→ [AI Architecture](ai/architecture.md)

## 12. 数据库权限

当前核心 Life 表已启用 RLS。

Production 采用 server-only service role / restricted RPC 访问模型；anon/authenticated 不获得绕过服务器的任意表写能力。

2026-09-21 已直接核验 RLS 至少启用于：

- life_fixed_accounts
- mood_entries
- sleep_records
- activity_entries
- meals
- weight_measurements
- medicine_items
- mailbox_letters

## 13. Legacy Game compatibility

旧 /game 可继续保留历史 cloud session / DATA_EDIT_PASSWORD 兼容路径，但它不是 Island Life 登录、MCP OAuth 或 AI 身份来源。

API transport：
→ [API and Sync](api-and-sync.md)

Production 发布规则：
→ [Deployment & Security](../engineering/deployment-security.md)
