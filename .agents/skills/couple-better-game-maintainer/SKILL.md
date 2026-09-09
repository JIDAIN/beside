---
name: couple-better-game-maintainer
description: JIDAIN/couple_better_game 的项目专属维护 Skill。用于情侣小岛 / Island Life 的功能开发、UI 修改、Supabase/API、AI 写入、生活数据、Legacy Game、测试和发布安全。任何项目修改都应先读 AGENTS.md；本 Skill 负责把项目事实和执行顺序收敛成可重复工作流。
version: 3.0.0
---

# Couple Better Game Maintainer

## 定位

这是**项目专属 Skill**。它回答“情侣小岛这个产品应该怎样安全地修改”，不替代 Obsidian 中的通用 UI / 编码 Skill。

优先级：

```text
用户当前明确要求
→ AGENTS.md
→ 本 Skill
→ docs 当前主文档 / Accepted ADR
→ 通用 Skill
→ archive / 历史记录
```

若文档与当前 Production / main 代码冲突，不从旧 Skill 复制结论，先核验当前事实。

## 启动协议

每次开始前至少阅读：

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/09-status-roadmap.md`
4. 当前任务对应主文档与真实源码

任务追加必读：

- 产品 / 页面：`docs/01-product.md`
- 架构：`docs/02-architecture.md` + `docs/adr/README.md`
- 数据：`docs/03-data-model.md`
- API / Sync / Auth：`docs/04-api-and-sync.md` + `docs/17-auth-and-pairing.md`
- Legacy Game：`docs/05-business-rules.md`
- UI：`docs/12-island-life-design-system.md` + `docs/06-ui-guidelines.md`
- 开发 / 测试：`docs/07-development-testing.md`
- 部署 / 安全：`docs/08-deployment-security.md` + `docs/15-configuration-reference.md`
- AI / MCP：`docs/11-ai-write-architecture.md` + `docs/26-ai-access-core-principles.md` + `docs/28-ai-natural-language-contract.md`

## 数据域铁律

始终区分：

```text
Island Life facts
≠ Legacy Game facts

intake
≠ deficit
≠ weight
≠ exercise / activity
```

Island Life 当前主要生活域：

```text
meals / meal_items
mood_entries
sleep_records
activity_entries
weight_measurements
medicine_items
mailbox_letters
```

Legacy Game：

```text
daily_records
daily_record_sides
exchange_categories
exchange_records
wallets
wallet_ledger
```

普通 Life 清理、导入、恢复不得顺手修改 Legacy Game。关联展示不等于跨域自动写回。

## UI / 视觉协议

`docs/12-island-life-design-system.md` 是 V2 可见 UI 唯一主视觉规范。

当前 V2 主导航固定为：

```text
今日 / 饮食 / 日历 / 小窝 / 我的
```

当前视觉原则：

- 暖白 / 奶油底；
- 薄荷 / 青绿主识别；
- 柔黄 / 珊瑚 / 浅蓝点缀；
- 不使用大面积棕色；
- 数字是事实，不是成绩；
- 记录，不评价；观察，不排名；
- 低密度页面允许更明显岛屿感，高密度数据页优先可读。

复用顺序：

```text
已有 components/ui App* / 项目 Pattern
→ animal-island-ui 已验证能力
→ 许可兼容的成熟 GitHub Pattern
→ 成熟 headless / 通用交互
→ 项目原创组件
```

禁止：

- 因为通用 UI Skill 推荐某风格就覆盖项目 design system；
- 每页发明新色板 / Button / Card / Modal；
- 用头像代替心情；
- 把生活页做成竞争、排名、streak、金币体系；
- 把 `cat` 写死为“我”；
- 为新增功能擅自修改五项主导航。

### UI 修改工作流

1. 读 design system 和当前组件；
2. 锁定用户允许修改的区域；
3. 先复用 token / App* / Pattern；
4. 使用通用 `ui-ux-pro-max` / `frontend-design` 时，只补充专业判断，不重新定义品牌；
5. 验证真实中文长度、窄屏、safe-area、触控、空/错/加载/禁用状态；
6. 没有真实浏览器/手机视觉检查时，不写“视觉已验证”。

## 身份与权限

数据库稳定身份是 `cat / fish`，界面“我 / Ta”必须相对当前登录用户。

业务页面消费 `LifeIdentityContext` 的 `mePartnerKey / taPartnerKey`，不要重新引入固定 `SELF_KEY=cat`。

权限不能只靠隐藏按钮实现；服务端 / 数据层仍必须校验。

## AI 写入协议

通用原则：

```text
查询 / 讨论 → 不写
明确新增 / 修改 → normalize → permission → idempotency → canonical write → read-back
删除 / 高风险覆盖 → 额外安全校验
```

新 meal 使用项目已定义的草稿确认流程；不要把 meal 的特殊二次确认机械扩展到所有资源。

AI 不获得任意 SQL 权限，不在浏览器或普通聊天暴露 Supabase secret / service role / 同步密码。

## Supabase / API

保持：

```text
Browser → Next.js API → server-only Supabase
```

- DDL 只通过新 migration；
- 不回改已经执行的 migration；
- 多表写入考虑事务；
- server-only RPC 不误授给 anon/authenticated；
- 新功能不复制 legacy storage / transport 债务；
- 已退役的 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge 不恢复。

## Legacy Game

Legacy Game 是新程序“游戏”中的独立子项目，不代表整个 Island Life。

修改金币、宝石、结算、兑换、成长地图等规则前必须读 `docs/05-business-rules.md` 和对应 pure service；不要凭 legacy 变量名猜用户可见语义。

普通 V2 生活功能不顺手重写 Legacy Game。

## 修改纪律

同时遵守通用 `karpathy-guidelines`：

- 只改任务必须区域；
- 不顺手整理相邻代码；
- 先读取事实再假设；
- 成功标准必须可验证；
- 用户说“其他不要动”时严格做外科手术式修改。

## 验证

代码改动每阶段至少：

```bash
npm run test
npm run lint
npm run build
```

按改动类型追加针对性验证。纯文档 / Skill 只需核对路径、当前事实和链接，不为了形式运行完整 build。

Test/Lint/Build 通过 **不等于** 视觉已验证。

## Vercel 硬停止

任何 Preview 或 Production 部署都必须获得**该次部署**的用户明确授权。

允许修改代码、commit、push、PR、merge 均不等于允许部署。未获授权时停在：

> 代码已完成并验证，等待允许部署。

不得削弱 `vercel.json` 中关闭 Git 自动部署的保护。

## 文档同步

当前事实进入对应顶层领域主文档；架构原因进入 ADR；阶段历史进入 archive；当前上线状态进入 `docs/09-status-roadmap.md`；发生了什么进入 `CHANGELOG.md`。

不要新增一串长期 `*-after-refactor` / `*-migration-report` 文档。

## 完成报告

用中文说明：

1. 做了什么；
2. 为什么；
3. 修改文件 / migration；
4. 实际验证结果；
5. 未运行检查及原因；
6. 数据 / 安全 / 发布风险；
7. 未完成项和下一步。
