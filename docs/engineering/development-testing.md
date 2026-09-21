# 开发与测试指南

状态：2026-09-21。本文维护当前开发流程、测试分层和“代码变化后该同步哪份工程文档”。

## 1. 开发顺序

推荐固定顺序：

```text
确认领域
→ 从 docs/README.md 进入对应 MOC
→ 核对真实源码 / Production facts
→ 最小改动
→ 补或更新测试
→ Test / Lint / Build
→ 更新对应 canonical docs
→ 必要时更新 ADR / CHANGELOG
```

旧 archive、旧聊天和阶段验收不能替代当前代码核验。

## 2. 代码与文档位置

| 内容 | 当前位置 |
|---|---|
| Next.js 页面 / route | `app/` |
| Island Life UI | `components/life/` |
| Legacy Game UI | `components/home/` |
| shared UI wrapper / pattern | `components/ui/` |
| Life client / domain helper | `lib/life/` |
| Meal / nutrition contract | `lib/nutrition/` |
| AI normalization | `lib/ai/` |
| server auth / Supabase / MCP / Reminder | `lib/server/` |
| migration | `supabase/migrations/` |
| tests | `tests/` |
| 当前工程文档 | `docs/` MOC hierarchy |
| 历史实施 / 验收 | `docs/archive/` |
| ADR | `docs/architecture/decisions/` |

## 3. 领域开发原则

### Island Life

先区分个人事实与 couple-space shared facts，再设计写权限。

新增 domain 时优先复用：

```text
fixed cat/fish identity
→ canonical service / RPC
→ Web API
→ AI Access Core（需要 AI 时）
→ Reminder Engine（需要提醒时）
→ shared UI system
```

不要为单一功能重造第二套鉴权、AI transport 或通知系统。

### Meal

修改 Meal 时至少同步检查：

- `lib/nutrition/`
- `lib/server/supabase-nutrition.ts`
- Meal / photo API
- AI registry / normalizer（若影响 AI）
- migration / Production constraints（若影响 schema）
- `docs/domains/meal/README.md`
- `docs/architecture/data-model.md`（若影响 DB）
- `docs/architecture/api-and-sync.md`（若影响 transport）

不要再引用旧的“docs/03 / docs/04”编号体系。

### Legacy Game

旧游戏规则继续在 `lib/home/` 和对应 tests 内维护。

普通 Life 改动不得顺手修改：

- deficit；
- wallet；
- exchange；
- heatmap；
- settlement。

→ [Legacy Game MOC](../domains/legacy-game/README.md)

### Supabase

DDL / function / constraint 的 forward change 必须新增 migration。

已经执行过的 migration 不为“看起来整齐”而回写。

新增 migration 至少检查：

- schema / function / view；
- constraint / index；
- RLS；
- grants / revokes；
- import / backup / restore compatibility；
- Life / Legacy Game boundary；
- 空库 replay 顺序。

server-only RPC 若只供后端使用，通常应确认：

```text
service_role execute = yes
anon execute = no
authenticated execute = no
```

具体权限仍以该 RPC 的真实用途为准。

## 4. Source of Truth 与 cache

Supabase 是正式数据事实源。

localStorage / Service Worker / stale query 只能承担：

- 可重建 read cache；
- UI 临时状态；
- Legacy Game compatibility cache。

新增持久化前先判断：

1. 这是事实还是 cache？
2. 是否应进入 Supabase？
3. cache 丢失后能否重建？
4. 是否会被误当成身份或权限来源？

客户端 cache 细节：
→ [API and Sync](../architecture/api-and-sync.md)

## 5. 本地命令

当前 `package.json`：

```bash
npm run test
npm run test:watch
npm run lint
npm run build
```

完整提交前通常运行：

```bash
npm run test
npm run lint
npm run build
```

## 6. GitHub CI

`.github/workflows/ci.yml` 当前使用 Node 24，并独立执行：

- Test → `npm run test`
- Lint → `npm run lint`
- Build → `npm run build`

`test-diagnostics.yml` 是额外的精选测试文件矩阵，用于更容易定位部分核心测试失败；它 **不是完整 test suite 的替代品**。

## 7. 测试目录

真实测试文件清单以 `tests/` 为准，不在文档手工枚举每个文件。

主要职责：

- `tests/ai/`：AI contract / normalization
- `tests/client/`：cache / request / client reliability
- `tests/home/`：Legacy Game
- `tests/life/`：Life domain / auth / UI source contract
- `tests/nutrition/`：Meal / nutrition
- `tests/server/`：server / MCP / media / data boundary

## 8. 必须补测试的变化

### Business

- ownership；
- mailbox draft/sent；
- reminder dedupe / snooze；
- Meal lifecycle；
- Legacy Game settlement / reward。

### Data

- 新表 / 字段 / constraint；
- migration compatibility；
- import / backup / restore；
- Life / Legacy allowlist；
- soft delete / idempotency。

### Auth / AI

- Web session；
- MCP token identity；
- cross-owner writes；
- delete explicit intent；
- AI action registry；
- media recovery。

### Cache

- stale first paint；
- mutation 后旧 read 不回滚；
- scope switch；
- foreground / online revalidation；
- multi-tab mutation invalidation。

## 9. Production DB smoke

涉及 Production schema / RPC 时，在获得相应执行授权并确保数据安全后，至少验证：

```text
create / read / update / delete（适用时）
permission
idempotency
受影响 RPC
backup / restore compatibility（如涉及）
cleanup test data
```

不能把测试残留留在 Production。

## 10. UI 验证

可见 UI 修改需要检查：

- loading / stale / empty / error；
- mobile / desktop；
- 我 / Ta；
- editable / read-only；
- safe-area；
- real image / long text / boundary data；
- refresh / return foreground。

自动测试不能替代真实视觉验收。

Preview / Production 仍需要用户对该次部署明确授权。

## 11. 文档同步路由

| 变化 | Canonical 文档 |
|---|---|
| 当前产品能力 | `docs/product/overview.md` |
| UI / visual | `docs/product/` |
| 跨域架构 | `docs/architecture/overview.md` |
| schema | `docs/architecture/data-model.md` |
| API / auth / cache transport | `docs/architecture/api-and-sync.md` |
| 身份 / 权限 | `docs/architecture/auth-and-identity.md` |
| AI | `docs/architecture/ai/` |
| Meal | `docs/domains/meal/` |
| Reminder | `docs/domains/reminders/` |
| Legacy Game | `docs/domains/legacy-game/` |
| 配置 | `docs/engineering/configuration.md` |
| 发布 / security | `docs/engineering/deployment-security.md` |
| 运维 / 恢复 | `docs/engineering/operations-runbook.md` |
| 当前运行差异 | `docs/engineering/current-state.md` |
| 长期架构取舍 | `docs/architecture/decisions/` |

未来产品 Roadmap 不在 GitHub 工程事实库展开维护。

## 12. 提交前检查

代码改动：

```text
[ ] 对应测试已覆盖
[ ] npm run test
[ ] npm run lint
[ ] npm run build
[ ] secret 未暴露
[ ] actor / ownership 未被削弱
[ ] Life / Legacy boundary 未跨越
[ ] migration 未回写历史
[ ] canonical docs 已同步
[ ] 长期架构变化已有 ADR
```

只改文档时，不强制为了形式跑本地 build；但必须检查真实源码、链接、路径和相关 CI。
