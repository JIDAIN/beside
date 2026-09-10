# API、云端同步与鉴权

状态：2026-09-10。

## 1. API 总览

### 生活与餐食

| Method | Path | 作用 |
|---|---|---|
| GET | `/api/meals?date=...&person=...` | 查询某日餐食 |
| POST | `/api/meals` | 新增餐食 |
| PUT | `/api/meals/[id]` | 更新餐食 |
| DELETE | `/api/meals/[id]` | 软删除餐食 |
| GET | `/api/meals/[id]/photo` | 读取私有餐食照片 |
| PUT | `/api/meals/[id]/photo` | 上传 / 更换餐食照片 |
| PATCH | `/api/meals/[id]/photo` | 修改照片显示旋转 / 大小 |
| DELETE | `/api/meals/[id]/photo` | 移除餐食照片 |
| GET | `/api/life/day?date=YYYY-MM-DD` | 读取当天心情、睡眠、活动 |
| PUT | `/api/life/mood` | 保存 / 修改心情 |
| DELETE | `/api/life/mood` | 删除自己的心情 |
| PUT | `/api/life/sleep` | 保存 / 修改睡眠 |
| DELETE | `/api/life/sleep` | 删除自己的睡眠 |
| GET | `/api/life/month-bundle?month=YYYY-MM` | 一次读取整月心情、睡眠、活动与餐食，供月度回顾和缓存复用 |
| POST | `/api/life/activities` | 新增活动 |
| PUT | `/api/life/activities/[id]` | 修改活动 |
| DELETE | `/api/life/activities/[id]` | 删除活动 |

具体生活资源还包括 weight、medicine、mailbox、reminder、settings、data-management 等 API；本页维护稳定入口与契约，不手工枚举所有 route 文件。

心情 / 睡眠 DELETE body 只传记录 `id + partnerKey`。服务端先以签名 session 验证 `partnerKey` 是当前 actor，再调用只授权给 service role 的 owner-filtered RPC；不能通过请求体代删 Ta 的个人记录。

### AI / MCP 入口

当前正式入口：

```text
/mcp
/api/ai/chat
```

MCP OAuth 支撑端点：

```text
/oauth/register
/oauth/authorize
/oauth/token
```

Harbor Cat / Fish 直接通过 MCP OAuth 连接 `/mcp`。旧 `/api/drive-bridge/*`、Harbor Sheet、Apps Script / Fast Wake transport 已退出当前运行链路，只保留在历史 migration、`docs/archive/` 或 Git 历史中。

## 2. 当前鉴权模型

### Web / 程序内置 AI

```text
Browser
→ /api/auth/login
→ Supabase 固定账号凭据校验
→ life-account-session HttpOnly Cookie
→ Next.js API / /api/ai/chat
→ actor-aware canonical service / restricted RPC
→ Supabase
```

浏览器不持有 Supabase service secret，也不能通过页面参数切换真实写入身份。

### MCP

```text
MCP client
→ OAuth register / authorize / token
→ signed access token（绑定 cat 或 fish）
→ /mcp
→ life_query / life_mutate
→ AI Access Core / canonical services
→ Supabase
```

MCP token 的 `partnerKey` 是可信身份来源；昵称、自称、`person=cat/fish` 等普通文本不能改变 OAuth 身份。

### Legacy Game

旧 `/game` 兼容同步仍保留 `couple-cloud-session` / `DATA_EDIT_PASSWORD` 等历史路径，但它们不再是 Island Life 登录或 AI/MCP 鉴权的一部分。

详细身份与权限矩阵见 [`17-auth-and-pairing.md`](17-auth-and-pairing.md)。

## 3. Meal API

### 查询

```http
GET /api/meals?date=2026-09-07&person=cat
```

### 新增 / 更新 / 删除

```text
POST   /api/meals
PUT    /api/meals/<uuid>
DELETE /api/meals/<uuid>
```

当前 source：

```text
manual / chatgpt / import
```

Meal 和 Meal Item 的 kcal / macros 允许 nullable：

```text
NULL = 未估算
0    = 确实为 0
```

个人 meal 的 create / update / delete / photo mutation 都必须绑定当前 signed actor；不能只相信 payload 中的 `person` / `partnerKey`。

## 4. Meal Photo API

### 上传 / 更换

```text
PUT /api/meals/<uuid>/photo
```

服务端执行：

```text
鉴权
→ ownership
→ 图片校验
→ EXIF 方向归一
→ 最长边 600px WebP 压缩
→ Storage 上传
→ 根据最终宽高计算默认显示旋转
→ replace_meal_photo_state
```

竖图默认：

```text
rotationDegrees = 90
scale = 1.00
```

### 修改显示

```text
PATCH /api/meals/<uuid>/photo
```

Payload 只允许：

```text
rotationDegrees: 0 | 90 | 180 | 270
scale: 0.60 .. 1.00
```

PATCH 不重新压缩 / 上传图片。

### 删除

```text
DELETE /api/meals/<uuid>/photo
```

同时恢复显示元数据到 `0° / 100%`。

## 5. AI 写入统一协议

稳定业务工具：

```text
life_capabilities
life_query
life_mutate
```

普通已知业务 query/mutate 不应先调用 `life_capabilities`；只有未知能力发现或开发排错时才需要。

Meal create 的业务边界：早餐 / 午餐 / 晚餐若当天同一 owner 已有有效记录，API 返回 `409 MEAL_SLOT_CONFLICT`，调用方应进入原记录编辑或补录；snack create 不受该槽位约束，每次进食均创建独立记录。应用层预检用于给出清楚提示，数据库部分唯一索引用于防止并发竞态。

正式写入统一原则：

```text
自然语言
→ AI 提取语义
→ canonical normalize / validate
→ permission
→ idempotency
→ domain write
→ read-back / result
```

不提供任意 SQL 或任意表修改工具。

## 6. 新 Meal 的聊天层草稿流程

新的饮食记录使用：

```text
用户文字 / 图片
→ AI 分析实际摄入
→ 聊天中展示待确认草稿
→ 用户修改 / 确认
→ life_mutate 正式写入
```

关键边界：

- 草稿不写数据库；
- 没有 `meal_drafts` 后台表；
- 服务端不通过当前 `userText` 是否包含“确认/可以/好的”来决定能不能 create meal；
- 确认状态属于对话上下文；
- 如果确认后的写入临时失败，AI 可以在用户明确要求重试时重试已确认操作。

身份、删除、高风险覆盖等安全规则仍必须由服务端硬校验。

## 7. 饮食实际摄入与营养字段

AI 默认统计实际吃下去的量。

优先级：

```text
用户明确文字
>
餐前/餐后图片差分
>
单图估算
```

能合理判断时，确认后的单次正式写入尽量包含：

```text
items[].rawName / displayName
items[].portionDescription
items[].estimatedWeightG
items[].caloriesKcal
items[].proteinG
items[].carbsG
items[].fatG
totalCaloriesKcal
```

真正未知字段允许 `null`，不能编造精确值。

## 8. 多图与单图持久化

聊天里可以同时使用餐前 / 餐后多张图片做差分，但当前正式 meal 只绑定 1 张展示图。

默认：

```text
餐前 + 餐后都参与分析
→ 未指定时正式保存餐前图
→ 餐后图只作为估算依据
```

用户明确指定“保存餐后图”时覆盖默认。

当前系统不能声称同一 meal 永久保存两张照片，也不支持 `beforePhotoPath / afterPhotoPath`。

## 9. MCP 图片恢复

如果用户要求正式保存图片，但 MCP 客户端没有传真实图片字节：

```text
life_mutate attachPhoto=true
→ MEDIA_ATTACHMENT_REQUIRED
→ recovery.uploadUrl
→ 用户浏览器补传
→ 服务端完成原操作
```

收到恢复链接后：

- 不重新 create meal；
- 不重复 life_mutate；
- 不再生成第二套业务参数；
- 未完成前不能声称照片已保存。

支持真实附件直传的 MCP 客户端可以直接完成图片保存，不进入 browser recovery。

## 10. 游戏云端同步

Legacy Game 兼容同步仍保持：

```text
GET  /api/home-data
POST /api/save-data
```

这条 compatibility path 与 Island Life 的 fixed-account session / MCP OAuth 是不同的身份与同步路径。

Supabase 仍是正式云端事实源；Meal calories 不自动生成 deficit，也不自动修改金币、宝石、钱包或 heatmap。

## 11. 缓存与同步原则

Island Life 浏览器缓存只属于可重建的 stale read model：

```text
先展示 scope-aware stale cache
→ mount / focus / visibility / online 后台校验
→ 服务端 / Supabase 返回最新事实
```

缓存不参与权限判断，也不是第二数据库。mutation 后必须防止旧 in-flight read 覆盖新写入结果。

## 12. 安全与部署边界

- 浏览器不持有 Supabase secret；
- server-only RPC 不开放给任意浏览器；
- Web session / MCP token 都绑定固定 actor；
- 个人数据写权限由服务端 / RPC 再校验；
- 写入使用稳定幂等边界；
- 图片 bucket 为 private；
- Production 自动部署默认关闭；
- 每一次新的 Preview / Production deployment 都必须获得用户当次明确授权。
