# Configuration

本文是当前运行配置的 canonical 清单。只记录变量名、用途、是否必须、fallback、安全边界、consumer 与轮换影响；绝不记录真实 secret。

## 1. Core Production Config

| Config | Production role | Current behavior |
|---|---|---|
| SUPABASE_URL | required | Supabase REST/RPC/Storage base |
| SUPABASE_SECRET_KEY | required | server-only high privilege + session signing material |
| SUPABASE_SERVICE_ROLE_KEY | compatibility fallback | 部分 server module 在主变量缺失时读取 |
| COUPLE_SPACE_SLUG | 建议显式配置 | 当前兼容默认 couple-better-game |

即使代码有兼容默认值，Production 也应显式配置 URL/space，避免复制环境时误连数据。

## 2. MCP / OAuth Config

- LIFE_MCP_SIGNING_SECRET：使用 MCP 时必须，至少 32 字符；
- LIFE_PUBLIC_BASE_URL：media recovery public origin，建议明确；
- NEXT_PUBLIC_APP_URL：public origin compatibility fallback。

轮换 LIFE_MCP_SIGNING_SECRET 会使旧 registered client、authorization code、access/refresh token、media recovery token 失效，需要重新授权。

## 3. Built-in AI Config

- AI_GATEWAY_API_KEY：优先 credential；
- VERCEL_OIDC_TOKEN：Vercel fallback；
- LIFE_AI_MODEL：current default google/gemini-2.5-flash；
- LIFE_TIME_ZONE：current default Asia/Shanghai。

两个 AI credential 都不可用时，/api/ai/chat 应返回配置错误，不假装执行成功。

## 4. Vision Config

可选 server-side food vision：
- LIFE_VISION_API_KEY：优先；
- OPENAI_API_KEY：fallback；
- LIFE_VISION_BASE_URL：current default https://api.openai.com/v1；
- LIFE_VISION_MODEL：current default gpt-5.6-luna。

vision failure != photo upload failure != Meal 必须失败。

## 5. Legacy Compatibility Config

DATA_EDIT_PASSWORD 只用于 Legacy Game /game cloud-session 与 home-data/save-data compatibility。

~~~text
DATA_EDIT_PASSWORD
!= Life login password
!= Web session signing secret
!= MCP OAuth secret
~~~

## 5A. 微信公众号安全模式回调（待发布）

| Server-only config | 用途 | 是否必须 |
|---|---|---|
| `WECHAT_OFFICIAL_APP_ID` | 公众号 AppID，解密尾部归属校验 | 是 |
| `WECHAT_OFFICIAL_TOKEN` | 消息推送配置中的 3–32 位签名 Token | 是 |
| `WECHAT_OFFICIAL_ENCODING_AES_KEY` | 公众号生成的 43 字符消息加解密密钥 | 是 |

三者由运行环境提供。公众号后台 URL 为 `https://couple-better-game.vercel.app/api/wechat/official/callback`，数据格式 XML、消息安全模式。不要把 Token/AESKey 放进代码、客户端变量、聊天或 Git 文档；Vercel 配好对应服务端环境变量并部署后，才能提交微信后台配置以执行 GET 验证。首次验证失败先检查域名、密钥、服务器时间与后台的密文模式。

V1 无需启用 AppSecret，不使用 Access Token，也不进行 Cat/Fish 身份绑定、数据库写入或 AI 操作。后续修改这些能力须另行评估权限与防重放持久化。

## 6. Vault / DB-managed Secrets

当前 PushPlus token、微信测试号 AppID/AppSecret/Template/OpenID 等由 server/Supabase Vault/DB 管理，不用公开 env 文档保存真实值。

固定账号真实密码也不进入 Git、migration seed 或本文。

## 7. Public vs Secret

NEXT_PUBLIC_* 只能承载明确 public 值。

禁止暴露：
- Supabase service secret；
- LIFE_MCP_SIGNING_SECRET；
- AI/Vision keys；
- PushPlus token；
- fixed-account password。

## 8. Config Consumer Map

| Config | Primary consumer |
|---|---|
| SUPABASE_URL / secret | lib/server/supabase-*、auth、data management |
| COUPLE_SPACE_SLUG | server adapters |
| LIFE_MCP_SIGNING_SECRET | life-mcp-auth、media recovery |
| LIFE_PUBLIC_BASE_URL | media recovery |
| AI_GATEWAY_API_KEY / OIDC | life-ai-gateway |
| LIFE_AI_MODEL | life-ai-gateway |
| LIFE_TIME_ZONE | AI date context |
| LIFE_VISION_* | life-meal-vision |
| DATA_EDIT_PASSWORD | Legacy compatibility |

## 9. Rotation / Change Impact

- Supabase secret → Web/Auth/API 全链回归；
- MCP signing secret → client/token reauthorization；
- AI model/credential → built-in AI regression；
- Vision config → image recognition regression，且确认 photo save 不受阻塞；
- public base URL → media recovery；
- DATA_EDIT_PASSWORD → only Legacy compatibility。

## 10. Verification

配置变化后按受影响链路验证：
- Supabase → login + Life read/write；
- MCP → OAuth + life_query/life_mutate；
- AI Gateway → /api/ai/chat；
- Vision → recognition + photo persistence separation；
- public base URL → media recovery；
- Legacy password → compatibility sync。

需要 Vercel deployment 时仍需当次明确授权。

## 11. Maintenance Rules

代码新增/删除/改变 env 语义时同批更新本文。
不要写“一次核验日期”或真实 secret。
