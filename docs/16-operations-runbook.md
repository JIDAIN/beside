# Production 运维与故障恢复手册

状态：2026-09-07。

本文档回答的是：**程序已经上线后，如果出问题，应该按什么顺序查、什么时候停止操作、如何恢复。**

它不替代架构、数据模型和安全文档；长期设计分别以 `02`、`03`、`08`、`17`、`48` 为准。

## 1. 总原则

任何 Production 故障先遵守：

```text
先保数据
→ 确认影响范围
→ 找到事实层
→ 最小修复
→ 验证
→ 再恢复正常使用
```

禁止在原因不明时：

- 扫描并删除“最近创建的所有数据”；
- 同时修改多个业务域；
- 回写已经执行过的 migration；
- 为了消除错误提示临时开放 anon/authenticated 高权限；
- 直接覆盖 Legacy Game 与 Island Life 两套数据；
- 未经授权触发新的 Preview / Production 部署。

## 2. 事实与排障入口

| 问题 | 第一事实来源 | 第二检查点 |
|---|---|---|
| 页面 / API 500 | Vercel runtime/build log | Next.js route / server service |
| 登录失败 | `/api/auth/login` 行为 | `life_fixed_accounts` / auth RPC |
| Life 数据不对 | Supabase 当前表 / RPC | Web stale cache |
| MCP 失败 | OAuth / `/mcp` 返回 | `life-mcp-auth` / AI Access Core |
| 内置 AI 失败 | `/api/ai/chat` 返回 | AI Gateway credential / tool result |
| 微信提醒没到 | reminder instance / delivery | pg_cron / PushPlus accepted |
| 图片不显示 | `meals.photo_path` / private Storage | photo API / cache |
| 恢复问题 | `life_backup_snapshots` | restore/import RPC |
| Legacy Game 同步 | `/api/home-data` / `/api/save-data` | legacy cloud-session |

不要先从浏览器缓存推断数据库事实。

## 3. Production 部署异常

### 3.1 Build 失败

顺序：

```text
1. 确认失败 commit
2. 查看 Test / Lint / Build 哪一项失败
3. 判断是代码、依赖还是环境配置
4. 在代码层修复
5. CI 重新通过
6. 如需要重新部署，再取得本次部署授权
```

不要因为 Production build 失败而临时关闭类型检查、测试或安全校验。

### 3.2 新 Production 已 READY，但功能坏了

先判断：

```text
纯 UI 问题？
单个 API 问题？
数据库 schema / RPC 不匹配？
环境变量缺失？
跨域数据损坏？
```

如果只是代码回归且数据库没有破坏性变化，优先恢复到已知正常代码版本或做最小 forward fix。

如果已经执行新 migration，不要简单把 Git 回退当成数据库回滚；先检查旧代码是否仍兼容新 schema。

## 4. 登录 / 权限故障

### 4.1 两人都无法登录

检查：

```text
SUPABASE_URL / server secret
→ authenticate_fixed_life_account RPC
→ life_fixed_accounts 是否存在两条固定账号
→ /api/auth/login 是否返回配置错误或鉴权失败
```

不要把 `DATA_EDIT_PASSWORD` 填回 Island Life 登录流程。它只属于 Legacy Game compatibility。

### 4.2 一个人能登录但不能写自己的数据

检查：

```text
life-account-session 是否有效
→ session partnerKey
→ API ownership check
→ actor-aware RPC
→ 目标记录真实 owner / participant_scope
```

如果出现“cat 能改 fish 数据”或反向情况，按安全事故处理：停止相关写入口，优先修权限，不用 UI 隐藏按钮代替服务端修复。

## 5. MCP / Harbor 故障

当前正式链路：

```text
OAuth register / authorize / token
→ signed access token
→ /mcp
→ life_query / life_mutate
```

### 5.1 连接不上 MCP

检查：

```text
1. /mcp route 是否可达
2. OAuth metadata / register / authorize / token 是否正常
3. LIFE_MCP_SIGNING_SECRET 是否存在且 >= 32 chars
4. client 是否需要重新授权
5. access token aud / partnerKey / scope 是否有效
```

`LIFE_MCP_SIGNING_SECRET` 被轮换后，旧 client/token 失效是预期行为，需要重新授权。

不要恢复 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge 作为临时正式方案。

### 5.2 MCP 能调用但数据写错身份

立即核对 access token 绑定的 `partnerKey` 与目标记录 owner。昵称、自称、用户文本不应改变真实 actor。

## 6. 程序内置 AI 故障

如果 `/api/ai/chat` 报 AI 未配置：

```text
AI_GATEWAY_API_KEY
或 VERCEL_OIDC_TOKEN
```

至少一个需要可用。

如果模型能回复但工具失败：

```text
先看 tool result / errorCode
→ 判断 clarification、permission、validation 还是 server failure
→ 再检查对应 canonical service
```

`LIFE_CLARIFICATION_REQUIRED` 不是系统故障；这是正常的“需要用户补信息”契约。

## 7. Reminder / PushPlus 不提醒

按链路逐层查，不直接重复发送：

```text
业务事件 / reminder rule
→ life_reminder_instances
→ effective due time / completed / dismissed / notified_at
→ pg_cron 调度
→ life_notification_deliveries
→ PushPlus accepted / failed
→ 对应 actor 的 Vault token
```

### 小信箱来信

特别检查：

```text
mailbox draft -> 不应提醒
第一次 draft -> sent / 直接 sent -> recipient 应生成 1 条 mailbox instance
已 sent 的读取 / 刷新 -> 不应重复生成
```

如果 instance 已存在但微信没到，不要再次制造第二条 mailbox instance；继续查 delivery / cron / PushPlus。

### Snooze

用户点击“1 小时后”后：

```text
effective due time 改变
notified_at 重置
新的 due time 使用新的 delivery dedupe key
```

这属于合法再次提醒，不等于重复投递 bug。

## 8. 餐食照片异常

检查顺序：

```text
meal 是否存在且 owner 正确
→ photo_path 是否存在
→ private Storage object 是否存在
→ GET /api/meals/<id>/photo
→ photo_rotation_degrees / photo_scale
→ 浏览器缓存
```

上传问题再检查：

```text
图片类型 / 大小
→ EXIF normalize
→ 600px WebP compression
→ Storage write
→ replace_meal_photo_state
```

不要为了修显示问题直接把 private bucket 改成 public。

## 9. Life 数据误删 / 错写

先判断影响范围：

```text
单条记录
单个生活 domain
整个 Life snapshot
Legacy Game 是否受影响
```

### 9.1 单条可人工修复

如果事实明确且影响非常局部，可使用正常 Web/API/AI 写入路径恢复，不直接绕过业务权限写表。

### 9.2 需要从恢复点恢复

当前正式能力：

```text
life_backup_snapshots
restore_life_backup_snapshot
import_life_full_data
```

UI / API 恢复与导入都要求确认短语：

```text
确认恢复生活数据
```

底层 restore 在覆盖前会自动创建 `pre_restore` 完整快照。

标准流程：

```text
1. 停止继续写入受影响数据
2. 确认目标 snapshot 的创建时间和内容
3. 确认只恢复 Island Life / shared config 范围
4. 输入明确恢复确认
5. 执行 restore
6. 读取关键数据回验
7. 验证双方身份 / 权限
8. 验证页面缓存刷新后的显示
9. 保留自动生成的 pre_restore snapshot
```

### 9.3 恢复后发现选择错了

不要继续连环手工覆盖。优先使用刚才自动生成的 `pre_restore` 快照恢复到操作前状态，再重新判断。

## 10. Island Life / Legacy Game 灾难恢复边界

普通 Life export / import / backup / restore 默认只处理 Island Life 和明确共享配置。

禁止因为“同一天的数据都错了”而按日期跨表删除：

```text
Island Life maintenance ≠ Legacy Game maintenance
```

Legacy Game 的：

```text
daily_records
daily_record_sides
exchange_categories
exchange_records
wallets
wallet_ledger
```

除非用户明确要求操作游戏，否则不纳入 Life 恢复或清理。

完整 allowlist 见 `48-life-legacy-game-data-boundary.md`。

## 11. Migration 故障

规则：

```text
已执行 migration -> 不回写文件
schema 修复       -> 新 migration forward fix
数据修复           -> 明确影响范围 + 先备份 + 可验证
```

执行前检查：

- 是否 destructive；
- 是否会锁表；
- 是否跨 Life / Legacy；
- RPC grant / revoke 是否正确；
- restore/import compatibility 是否需要同步修改。

执行后至少 smoke：

```text
create / read / update / delete
permission
受影响 RPC
backup / restore（如涉及）
```

## 12. 最小可观测性约定

当前不要求大型监控平台，但至少维护以下健康信号：

```text
GitHub CI        -> Test / Lint / Build
Vercel           -> build / runtime errors
Supabase         -> schema / RPC / Storage / cron
MCP              -> OAuth + life_query/life_mutate
AI               -> gateway + tool result
Reminder         -> instance + delivery status
Data recovery    -> snapshot + restore result
```

如果同一类 Production 故障重复出现两次以上，应把临时排查步骤升级为：

```text
自动测试
或 health check
或更强的日志 / 状态字段
```

而不是继续依赖聊天记忆。

## 13. 故障收尾

修复后记录：

```text
发生了什么
影响了哪些用户 / domain
根因是什么
采取了什么修复
如何验证
是否需要新增测试
是否改变长期架构（若是 -> ADR）
```

一次性事故过程可以进入 `docs/archive/`；长期有效的结论必须回写当前主文档。`09-status-roadmap.md` 只记录当前状态，不堆事故流水账。
