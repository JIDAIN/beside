# 开发与测试指南

状态：2026-09-07。

## 1. 开发原则

```text
先确认领域
-> 读当前主文档和源码
-> 最小改动
-> 补测试
-> 验证
-> 更新对应长期文档
-> 必要时更新 roadmap / changelog / ADR
```

不要因为旧文档说“未来”就重复实现已经存在的 Supabase/API；也不要因为某次阶段文档写过“已完成”就跳过当前代码核验。

## 2. 文件放置

| 内容 | 位置 |
|---|---|
| 页面 / API | `app/` |
| Island Life UI | `components/life/` |
| Legacy Game UI | `components/home/` |
| 通用项目 UI wrapper / Pattern | `components/ui/` |
| 游戏类型 / 规则 / service | `lib/home/` |
| 生活 client / service | `lib/life/` |
| 营养类型 / validation | `lib/nutrition/` |
| 服务端 auth / AI / Supabase / reminder | `lib/server/` |
| AI 自然语言 contract | `lib/ai/` |
| 数据库 migration | `supabase/migrations/` |
| 自动测试 | `tests/` |
| 当前长期事实文档 | `docs/` 顶层 |
| 历史实施 / 验收记录 | `docs/archive/` |
| 长期架构决策 | `docs/adr/` |

## 3. 领域开发原则

### Legacy Game

规则变化优先修改领域 service / rules，而不是在 UI 中复制计算逻辑。

修改 `DailyRecord / ExchangeRecord / AppDataSnapshot` 时至少检查：

1. 类型与 snapshot conversion；
2. restore / import / legacy migration；
3. wallet / exchange / heatmap / currency semantics；
4. Supabase compatibility RPC；
5. 自动测试；
6. `05-business-rules.md` 等长期文档。

### Island Life

个人事实与共享事实先确认 ownership / couple-space 语义，再实现 UI 或 AI 写入。

新增生活 domain 时优先复用：

```text
fixed Cat/Fish identity
→ canonical domain service / RPC
→ AI Access Core / MCP
→ Reminder Engine（如果需要提醒）
→ Island Life design system
```

不要为单个模块重新造第二套鉴权、AI 写入或通知链路。

### Nutrition / Meal

业务类型和 validation 放在 `lib/nutrition`；API route 不堆复杂 parse 逻辑。

多表 meal 写入继续使用 transaction RPC。修改 payload 时同步检查：

```text
meal service / client
supabase-nutrition
RPC / migration
app/api/meals
AI Access Core contract
相关 tests
docs/03 + docs/04 + meal 专题文档
```

### Supabase

DDL 必须通过新 migration；已经执行的 migration 不回写。

新增 migration 至少考虑：

- table / function / view；
- constraint / index；
- RLS；
- grants / revokes；
- transaction / compatibility；
- backup / restore 兼容；
- 是否跨越 Island Life / Legacy Game 数据边界。

当前 server-only 模式下，server RPC 默认核对：

```text
service_role execute = yes（如果服务端需要）
anon execute = no
authenticated execute = no
```

## 4. localStorage / Cache

业务事实的正式 Source of Truth 是 Supabase。

localStorage / Service Worker / stale cache 只能承担：

- UI 临时状态；
- 可重建读缓存；
- Legacy Game 兼容运行缓存。

新模块需要浏览器持久化时，必须先回答：

```text
这是事实数据、派生缓存还是纯 UI 状态？
是否应进入 Supabase？
缓存失效后能否安全重建？
是否会被错误当成权限来源？
```

## 5. 测试命令

```bash
npm run test
npm run test:watch
npm run lint
npm run build
```

GitHub CI 当前把 `Test / Lint / Build` 作为独立 job 执行。

## 6. 当前测试体系

不要在长期文档里手工维护每一个 `*.test.ts` 文件名；测试文件会持续增减，真实清单以 `tests/` 目录为准。

当前测试按职责分布在：

```text
tests/ai/         AI contract / normalization / tool behavior
tests/client/     client cache / request / interaction contract
tests/home/       Legacy Game rules / state / sync / compatibility
tests/life/       Island Life domain / auth boundary / source contract
tests/nutrition/  meal / nutrition validation and contract
tests/server/     server auth / MCP / data / media / service behavior
```

另外可以存在少量跨域顶层测试。

## 7. 测试分层与优先级

```text
业务规则 / 权限边界
> 数据一致性 / migration / restore compatibility
> canonical service / server behavior
> API / AI contract / idempotency
> cache / sync guard
> UI 关键交互
> 纯视觉快照
```

高频变化的 UI 不应靠大量脆弱样式快照替代真正的业务与权限测试。

## 8. 什么时候必须补测试

### 业务规则变化

- 阈值、奖励、周规则；
- owner-only / shared ownership；
- mailbox draft/sent 不可逆规则；
- reminder dedupe / snooze；
- meal 草稿确认和营养字段语义。

### 数据结构变化

- 新表 / 新字段 / 新 enum；
- migration compatibility；
- import / export / backup / restore；
- Island Life / Legacy Game allowlist；
- transaction / soft delete / idempotency。

### 鉴权与 AI

- missing / invalid Web session；
- MCP token-bound identity；
- cat 不能写 fish 的个人记录，反之亦然；
- AI 不能通过自然语言覆盖服务端 ownership；
- delete / destructive action 的明确意图；
- media recovery token 和附件路径。

### Cache / Sync

- stale cache 首屏；
- mutation 后旧请求不能覆盖新值；
- focus / visibility / online 恢复；
- Legacy Game compatibility sync guard。

## 9. DB smoke test

数据库 / RPC 改动除自动测试外，至少验证：

```text
create
read
update
soft delete / delete
permission
idempotency（适用时）
backup / restore compatibility（受影响时）
cleanup test data
```

不要把 smoke test 数据留在 Production。

## 10. UI 验证

可见 UI 修改除自动检查外，还需要按实际页面验证关键状态：

```text
loading / stale / empty / error
mobile / desktop
我 / Ta scope
可编辑 / 只读
刷新 / 返回前台
真实图片 / 长文本 / 边界数据
```

未经 Preview / Production 实机视觉检查，不写“视觉已验证”。任何 Preview / Production 部署都仍需用户当次明确授权。

## 11. 文档同步规则

代码改变以下事实时，必须在同一批工作中更新对应长期文档：

| 变化 | 主文档 |
|---|---|
| 产品流程 / 能力边界 | `01-product.md` |
| 系统连接方式 / transport | `02-architecture.md` |
| schema / Source of Truth | `03-data-model.md` |
| API / auth / sync | `04-api-and-sync.md` |
| Legacy Game 业务规则 | `05-business-rules.md` |
| UI contract | `06-ui-guidelines.md` / `12-island-life-design-system.md` |
| 开发 / 测试方式 | 本文档 |
| 部署 / security | `08-deployment-security.md` |
| 当前上线状态 | `09-status-roadmap.md` |
| 环境变量 | `15-configuration-reference.md` |
| 生产排障 / 恢复流程 | `16-operations-runbook.md` |
| 长期架构取舍 | `docs/adr/` |

一次性实施记录和旧方案进入 `docs/archive/`，不在当前主文档中继续累积版本叙事。

## 12. 提交前检查

代码改动能运行时：

```bash
npm run test
npm run lint
npm run build
```

另外人工确认：

```text
[ ] 没有 secret 暴露
[ ] 没有恢复旧的 public / Drive Bridge 数据路径
[ ] 没有混淆 intake / deficit / weight / exercise
[ ] 没有跨越 Island Life / Legacy Game 数据边界
[ ] Supabase 权限符合当前 server-only 模式
[ ] Web / MCP actor 权限仍成立
[ ] 对应长期文档已同步
[ ] 如改变长期架构，已有 ADR 或更新 ADR 状态
```

只改文档 / Skill 时，不要求为了形式跑完整 build；应检查链接、路径、代码事实和 Markdown 结构，并在总结里说明没有运行代码检查。
