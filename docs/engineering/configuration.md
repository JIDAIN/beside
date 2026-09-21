# 配置与环境变量清单

状态：2026-09-07。

本文档是当前运行配置的长期 Source of Truth。这里只记录**变量名、用途、是否必须、默认行为与安全要求**，绝不记录真实 secret。

如果代码新增、删除或改变环境变量语义，必须在同一批修改中更新本文档。

## 1. Production 核心配置

| 变量 | Production | 用途 | 当前行为 |
|---|---|---|---|
| `SUPABASE_URL` | 必须配置 | Supabase REST / RPC / Storage 基址 | 部分 server module 有历史默认 URL，但 Production 不依赖隐式默认值 |
| `SUPABASE_SECRET_KEY` | 必须配置 | server-only Supabase 高权限访问、Web session 签名材料 | 首选变量名；绝不能暴露给浏览器 |
| `SUPABASE_SERVICE_ROLE_KEY` | 兼容 fallback | 旧命名的 service-role secret | 仅在 `SUPABASE_SECRET_KEY` 未配置时由部分代码兼容读取 |
| `COUPLE_SPACE_SLUG` | 建议显式配置 | 选择当前 couple space | 当前默认 `couple-better-game` |

Production 运维规则：即使代码存在兼容默认值，也应在部署环境中显式配置 `SUPABASE_URL` 与 `COUPLE_SPACE_SLUG`，避免未来复制项目或切换环境时误连错误数据空间。

## 2. MCP / OAuth

| 变量 | Production | 用途 | 当前行为 |
|---|---|---|---|
| `LIFE_MCP_SIGNING_SECRET` | 使用 MCP 时必须 | MCP client registration、authorization code、access/refresh token 签名；media recovery 密钥派生 | 至少 32 字符 |
| `LIFE_PUBLIC_BASE_URL` | 建议配置 | MCP 图片 browser recovery 生成公开上传 URL | 未配置时尝试 `NEXT_PUBLIC_APP_URL`，再回退正式 Production origin |
| `NEXT_PUBLIC_APP_URL` | 可选兼容 | 公共应用 origin | 当前主要作为 `LIFE_PUBLIC_BASE_URL` fallback；它是 public 值，不可承载 secret |

### `LIFE_MCP_SIGNING_SECRET` 轮换影响

轮换后，旧的：

```text
registered client id
authorization code
access token
refresh token
media recovery token
```

都会失效或无法继续验证。因此只在有明确维护窗口时轮换，并准备让 Harbor / MCP client 重新授权连接。

## 3. 程序内置 AI

| 变量 | Production | 用途 | 当前行为 |
|---|---|---|---|
| `AI_GATEWAY_API_KEY` | 二选一 | Vercel AI Gateway Bearer credential | 优先使用 |
| `VERCEL_OIDC_TOKEN` | 二选一 / Vercel fallback | Vercel 环境下 AI Gateway credential | `AI_GATEWAY_API_KEY` 缺失时使用 |
| `LIFE_AI_MODEL` | 可选 | 程序内置 AI 模型 | 当前默认 `google/gemini-2.5-flash` |
| `LIFE_TIME_ZONE` | 可选但建议明确 | 内置 AI 对“今天”等日期的解释 | 当前默认 `Asia/Shanghai` |

如果 `AI_GATEWAY_API_KEY` 与 `VERCEL_OIDC_TOKEN` 都不可用，`/api/ai/chat` 应返回配置错误，而不是假装 AI 已执行。

## 4. 服务端餐食视觉识别（可选增强）

这一能力用于服务端从餐食图片中识别**可见食物名称 / 可见份量描述**，不是营养精确测量。没有配置时会安全跳过视觉识别，图片本身仍可正常保存。

| 变量 | Production | 用途 | 当前行为 |
|---|---|---|---|
| `LIFE_VISION_API_KEY` | 可选，优先 | 服务端视觉识别 API key | 优先于 `OPENAI_API_KEY` |
| `OPENAI_API_KEY` | 可选 fallback | OpenAI-compatible 视觉识别 credential | `LIFE_VISION_API_KEY` 缺失时使用 |
| `LIFE_VISION_BASE_URL` | 可选 | OpenAI-compatible `/responses` API base URL | 默认 `https://api.openai.com/v1` |
| `LIFE_VISION_MODEL` | 可选 | 服务端餐食视觉模型 | 当前默认 `gpt-5.6-luna` |

该识别器当前只输出高于阈值的食物识别结果，不负责直接估算 kcal / 克数 / 宏量营养；营养草稿仍由 AI 对话层结合用户文字和图片上下文处理。

如果 key 未配置或识别请求失败：

```text
视觉识别可失败
≠ 图片上传失败
≠ meal 必须失败
```

因此不要为了启用这一可选增强而把 API key 暴露给浏览器。

## 5. Legacy Game 兼容配置

| 变量 | 状态 | 用途 |
|---|---|---|
| `DATA_EDIT_PASSWORD` | Legacy compatibility | 旧 `/game` cloud-session、`/api/home-data` / `/api/save-data` 兼容同步密码 |

重要边界：

```text
DATA_EDIT_PASSWORD
≠ Island Life 登录密码
≠ life-account-session 签名 secret
≠ MCP OAuth secret
```

Island Life 登录凭据已经保存在 Supabase `life_fixed_accounts` 中，并通过 server-only RPC 校验。不要再把 `DATA_EDIT_PASSWORD` 写成新版生活系统的账号密码。

## 6. 不使用环境变量保存的敏感配置

### PushPlus token

Cat / Fish 的 PushPlus token：

```text
绑定 API
→ server-only RPC
→ Supabase Vault
```

不以 `PUSHPLUS_TOKEN_CAT` / `PUSHPLUS_TOKEN_FISH` 一类环境变量长期保存，也不得写进 Git、日志或文档。

### 固定账号密码

Cat / Fish 的真实登录账号与密码：

- 不写环境变量明文清单；
- 不进入 migration seed；
- Production Supabase 只保存 username + bcrypt password hash；
- GitHub 文档只描述结构，不写真实凭据。

## 7. Public vs Secret

### 允许暴露给浏览器的 public 配置

只有明确设计为 public 的值才能使用 `NEXT_PUBLIC_*`。

当前原则：

```text
public app origin       -> 可以
Supabase service secret -> 不可以
MCP signing secret      -> 不可以
AI Gateway secret       -> 不可以
Vision API key          -> 不可以
PushPlus token          -> 不可以
账号密码                 -> 不可以
```

禁止创建：

```text
NEXT_PUBLIC_SUPABASE_SECRET_KEY
NEXT_PUBLIC_LIFE_MCP_SIGNING_SECRET
NEXT_PUBLIC_AI_GATEWAY_API_KEY
NEXT_PUBLIC_LIFE_VISION_API_KEY
```

## 8. 环境配置检查

### Island Life 基础功能

```text
[ ] SUPABASE_URL
[ ] SUPABASE_SECRET_KEY（或兼容 SERVICE_ROLE_KEY）
[ ] COUPLE_SPACE_SLUG 指向正确空间
```

### MCP

```text
[ ] LIFE_MCP_SIGNING_SECRET >= 32 chars
[ ] LIFE_PUBLIC_BASE_URL 指向当前正式 origin（建议）
[ ] OAuth register / authorize / token /mcp smoke 正常
```

### 程序内置 AI

```text
[ ] AI_GATEWAY_API_KEY 或 VERCEL_OIDC_TOKEN 至少一个可用
[ ] LIFE_AI_MODEL 如有覆盖则名称有效
[ ] LIFE_TIME_ZONE 与产品日期口径一致
```

### 服务端视觉识别（如果启用）

```text
[ ] LIFE_VISION_API_KEY 或 OPENAI_API_KEY 至少一个可用
[ ] LIFE_VISION_BASE_URL 如有覆盖则兼容 /responses
[ ] LIFE_VISION_MODEL 如有覆盖则支持图片输入
[ ] 识别失败不会阻塞正常图片保存
```

### Legacy Game

```text
[ ] 如果仍使用旧同步路径，DATA_EDIT_PASSWORD 已配置
[ ] 不把 DATA_EDIT_PASSWORD 当成 Island Life 登录凭据
```

## 9. 修改配置后的最低验证

配置变更不等于代码变更，但可能直接影响 Production。修改后至少验证受影响链路：

```text
Supabase secret / URL -> 登录 + Life read/write
MCP signing secret    -> OAuth + life_query + life_mutate
AI Gateway credential -> /api/ai/chat
Vision credential     -> 餐食图片识别；失败时图片保存仍正常
public base URL        -> MCP media recovery URL
DATA_EDIT_PASSWORD     -> Legacy Game compatibility sync
```

需要触发新的 Preview / Production deployment 时，仍必须先取得用户针对该次部署的明确授权。
