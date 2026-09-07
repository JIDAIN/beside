# AI 访问与写入架构

状态：2026-09-07。

## 1. 目标

AI 可以像当前授权身份用户一样读取和修改 Couple Better Game，但不能获得任意 SQL / 任意表写权限。

稳定业务能力中心：

```text
life_capabilities
life_query
life_mutate
```

所有 AI 入口最终进入同一个 server-side registry，再调用 canonical domain service / RPC / Supabase Storage。

## 2. 当前 AI 入口

### Harbor Cat

```text
Harbor Cat / 团子
→ Harbor-Cat MCP
→ OAuth = cat
→ /mcp
→ life_query / life_mutate
→ AI Access Core
→ Supabase
```

### Harbor Fish

```text
Harbor Fish
→ Harbor-Fish MCP
→ OAuth = fish
→ /mcp
→ life_query / life_mutate
→ AI Access Core
→ Supabase
```

### 其他 MCP client

```text
MCP client
→ OAuth / fixed access identity
→ /mcp
→ life_query / life_mutate
→ AI Access Core
→ Supabase
```

### 程序内置 AI

```text
已登录 cat/fish
→ /ai
→ /api/ai/chat
→ Vercel AI Gateway
→ life-agent-registry
→ AI Access Core
```

这些入口共享同一套业务权限、校验和数据事实源，不复制 CRUD。

旧 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge 已退出当前运行链路，只保留为历史记录。

## 3. Tool Registry

主要查询资源：

```text
day
month
meal
weight
medicine
mailbox
settings
life_export
legacy_home
```

主要修改资源：

```text
mood       upsert / delete
sleep      upsert
activity   create / update / delete
meal       create / update / delete + photo
weight     create / update / delete
medicine   create / update / delete
mailbox    draft/create/update/delete/send + sent create semantics
settings   update
legacy_home replace
```

具体 action/schema 以当前 registry 与 domain service 为准；本页只维护稳定业务面，不手工复制所有字段定义。

未来新增 `cycle` 等模块时，只需新增 canonical domain service 并注册 query/mutate。

## 4. 身份和权限

身份由服务端授权上下文决定，不从模型猜测。

- Harbor Cat 使用 Harbor-Cat OAuth 身份；
- Harbor Fish 使用 Harbor-Fish OAuth 身份；
- 程序内置 AI 使用当前登录身份。

核心权限：

- Mood / Sleep / Meal / Weight：个人写入只允许当前 actor；
- Meal / Weight update/delete：按真实记录 owner 再核验；
- Activity：`cat` / `fish` 单方活动只有对应本人可维护；`both` 双方可维护，但不能被任一方静默改成单方；
- Mailbox：sender 固定当前 actor，recipient 按业务规则指向 Ta；draft 仅寄件人可维护，sent 永久只读；
- Medicine：家庭共享，双方可维护；
- Settings：共享项与个人项分别执行权限；
- Reminder / PushPlus：实例操作与 token 绑定当前 actor；
- delete：必须来自当前用户明确删除意图；
- `legacy_home.replace`：仍需明确高风险确认；
- 禁止 `run_sql`、`write_any_table`、`raw_supabase_request` 等任意数据层能力。

完整资源权限矩阵见 `docs/17-auth-and-pairing.md`。

## 5. 正式写入与幂等

```text
自然语言
→ AI 提取业务语义
→ life_mutate
→ normalize / domain validation / permission
→ idempotency
→ canonical service / RPC
→ read-back / tool result
```

MCP 和各 domain 使用稳定幂等种子/写入键。执行结果不确定时应读回相同 operation/record，而不是换新 id 盲目重放。

## 6. 饮食草稿确认

**只有新 meal creation** 使用额外的聊天层草稿流程：

```text
分析
→ 待确认草稿
→ 用户修改 / 确认
→ 正式 life_mutate
```

草稿和确认状态只属于聊天上下文：

- 不建立 server-side `meal_drafts`；
- 不通过当前一句 `userText` 是否包含“确认 / 可以 / 好的”来硬拦截 create；
- 模型 / Project Instructions / `MEAL_DRAFT_AGENT_RULES` 负责先展示草稿再调用正式写入；
- 已确认后的正式写入临时失败时，可以重试同一份已确认草稿。

其他明确的生活 mutation 不自动套用“先草稿后二次确认”；仍按各自 schema、permission 和高风险规则执行。

详细 contract 见 `docs/44-meal-draft-before-after-contract.md`。

## 7. 实际摄入与完整营养

默认优先级：

```text
用户明确文字
>
餐前/餐后视觉差分
>
单图合理估算
```

确认写入时，在能合理判断的前提下尽量一次提交重量、热量、蛋白质、碳水和脂肪；真正未知字段允许 `null`，不制造虚假精度。

## 8. 图片

正式图片链路：

```text
原图
→ EXIF normalize
→ longest edge 600px
→ WebP q70 / q65 / q60 / q55
→ Supabase Private Storage
→ meals.photo_path
```

当前 meal 正式只绑定一张展示图。多图可以用于分析，但不会虚构多图持久化字段。

支持真实附件的 MCP 客户端可以直接进入 canonical media path；若某个 MCP client 不透传图片字节，则使用 `MEDIA_ATTACHMENT_REQUIRED → recovery.uploadUrl` 恢复同一次正式业务写入。

## 9. Harbor Project 指令

当前有效模板：

`docs/46-harbor-mcp-project-instructions.md`

```text
Harbor Cat  → Harbor-Cat → OAuth cat
Harbor Fish → Harbor-Fish → OAuth fish
```

Project Instructions 只保留必要的身份语义、交互规则与安全提醒，不承担完整业务 schema。

## 10. 新 Domain 接入规范

新增例如 `cycle`：

1. 建表 / 约束 / migration；
2. 建 canonical server service / RPC；
3. 明确 owner / shared 权限；
4. 扩展自然语言 normalization / clarification contract；
5. 注册 `life_query / life_mutate`；
6. 必要时扩展 `life_capabilities`；
7. 增加权限、幂等、读回测试；
8. 需要备份 / 提醒时分别扩展 data-management / Reminder Engine；
9. 同步更新长期文档。

不为新 domain 重做一套鉴权、AI transport 或数据库事实层。

## 11. Production 部署纪律

Production Git 自动部署默认关闭。任何新的 Preview / Production deployment 必须逐次获得用户明确授权；一次授权只对应当前一次受控部署，完成后继续保持关闭。
