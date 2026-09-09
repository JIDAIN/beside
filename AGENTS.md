# AGENTS.md

本文件是所有 AI 编程助手和自动化开发工具的项目级规则。修改代码、数据库、测试、文档前必须先阅读本文件。

项目专属执行 Skill 的唯一正文位于：

`.agents/skills/couple-better-game-maintainer/SKILL.md`

开始任务时先读取本文件，再读取该 Skill；`.claude/skills/` 与 `.codex/skills/` 只做兼容发现路由，不维护第二份完整项目规则。

## 1. 项目现状

项目技术栈：Next.js 16 / React 19 / TypeScript / Tailwind CSS / `animal-island-ui` / Vitest / Vercel / Supabase PostgreSQL。

当前不是纯前端项目：Browser -> Next.js API -> server-only Supabase；localStorage 仍承担 Legacy Game 运行缓存/离线兜底；Supabase 是生产云端事实源。

当前产品关系：

```text
Couple Better Game（当前主程序 / Island Life）
└─ 游戏
   └─ 变瘦变美大作战（Legacy Game 子项目）
```

旧版“变瘦变美大作战”已经被收纳为新程序「游戏」中的独立子项目，不再代表整个应用。

## 2. 开始任务前必读

至少阅读：

1. `README.md`
2. `docs/README.md`
3. `docs/09-status-roadmap.md`
4. 与任务相关的主文档和源码

按任务追加：

| 任务 | 必读 |
|---|---|
| 产品 / 页面流程 | `docs/01-product.md` |
| 架构 / 重构 | `docs/02-architecture.md` + `docs/adr/README.md` |
| 数据字段 / Supabase | `docs/03-data-model.md` |
| 数据清理 / import / restore / Legacy Game 边界 | `docs/48-life-legacy-game-data-boundary.md` + `docs/16-operations-runbook.md` |
| API / 同步 / 鉴权 | `docs/04-api-and-sync.md` + `docs/17-auth-and-pairing.md` |
| AI / MCP | `docs/11-ai-write-architecture.md` + `docs/26-ai-access-core-principles.md` + `docs/28-ai-natural-language-contract.md` |
| 金币 / 宝石 / 旧游戏规则 | `docs/05-business-rules.md` |
| **任何 V2 可见 UI** | **`docs/12-island-life-design-system.md` + `docs/06-ui-guidelines.md`** |
| 开发 / 测试 | `docs/07-development-testing.md` |
| 环境变量 / 配置 | `docs/15-configuration-reference.md` |
| 部署 / 安全 | `docs/08-deployment-security.md` + `docs/15-configuration-reference.md` |
| Production 故障 / 恢复 | `docs/16-operations-runbook.md` |

## 3. 领域边界

```text
饮食摄入 ≠ deficit ≠ 体重 ≠ 运动/活动
Island Life maintenance ≠ Legacy Game maintenance
```

- intake：`meals / meal_items`
- deficit：Legacy Game `daily_record_sides.deficit_kcal`
- weight：真实趋势 `weight_measurements`
- Legacy Game exercise：`daily_record_sides.exercise_minutes`
- V2 Life activity：`activity_entries`

关联展示不等于自动互相改值。

### 数据维护硬规则

Island Life 生活数据：

```text
meals / meal_items
mood_entries
sleep_records
activity_entries
weight_measurements
medicine_items
mailbox_letters
```

Legacy Game 游戏子项目：

```text
daily_records
daily_record_sides
exchange_categories
exchange_records
wallets
wallet_ledger
```

任何“清理本周测试数据 / 清生活记录 / Life import / Life restore”等普通 Life 操作，默认只能作用于 Island Life allowlist。

除非用户明确要求操作旧游戏，否则不得修改或删除任何 Legacy Game 表。禁止使用“所有最近创建的数据”这种跨域规则直接扫表。

代码级表边界定义：`lib/server/life-data-domains.ts`。

## 4. V2 视觉语言是强制规范

`docs/12-island-life-design-system.md` 是所有 V2 页面唯一主视觉规范。

任何 AI/开发工具不得在业务 PR 中自行改变已确认方向：

- 暖白/奶油底；
- 薄荷/青绿主识别；
- 柔黄/珊瑚/浅蓝点缀；
- 不使用大面积棕色；
- 低密度页面主题更明显，高密度数据页更克制；
- V2 使用 `app/island-life-tokens.css` 的 `--life-*` token；
- 业务页面优先 `components/ui/App*` / Pattern；
- 外部 GitHub UI 不能带入第二套色板、阴影、Button/Card/Input 体系。

### 当前 V2 主导航

```text
今日 / 饮食 / 日历 / 小窝 / 我的
```

### 今日

只显示心情 / 睡眠 / 活动；三者都必须有记录入口。心情必须使用彩色情绪圆脸，不用头像替代。

### 饮食

顶部 `我 / Ta`；一次只看一人；每餐左实物照片、右碳水/蛋白质/脂肪/总热量；每餐可编辑；底部当日汇总。

### 日历

双人心情月历；日期点击进入详情。

### 小窝

```text
体重 / 小信箱 / 家庭药箱 / 游戏机
```

体重也统一 `我 / Ta`；小信箱不用头像列表；游戏机只做游戏列表，本轮不新做 Legacy Game 详情 UI。

## 5. V2 UI 组件边界

当前共享 Pattern：

```text
AppPageShell
AppRoleSwitch
AppRecordRow
AppFeatureTile
AppNutritionBar
```

V2 token：

```text
app/island-life-tokens.css
```

新跨域 Pattern 应先进入 `components/ui`；业务专属组件留在对应 domain。

`/ui-lab` 只能用假数据，不得写 Supabase、不得调用真实 Life 写 API、不得触发 Legacy Game settlement。

## 6. UI 复用顺序

```text
已有 App*
-> animal-island-ui 已验证能力
-> 同视觉语言且许可允许的成熟 GitHub Pattern
-> 成熟 headless / 通用交互
-> 项目原创
```

从 0 写是最后手段。异风格项目只借逻辑/状态/布局，视觉必须归一。

## 7. 前端代码分层

- `components/home/*`：Legacy Game UI
- `components/life/*`：V2 Life UI
- `components/nutrition/*`：饮食 UI
- `components/ui/*`：项目视觉 adapter / cross-domain Pattern
- `HomeResourcesProvider`：Legacy Game 状态编排器，不扩成 V2 全局 Provider

饮食已完成 provider 解耦：

```text
DailyMealsPanel -> Legacy Game adapter
DailyMealsPanelCore -> provider-free nutrition UI
```

## 8. AI 写入原则

不是每个领域各造一套 AI。Web / MCP / 程序内置 AI 复用 AI Access Core 与 canonical services。

通用规则：

```text
查询 / 讨论 -> 不写
用户明确要求新增 / 修改 -> normalize -> permission -> idempotency -> canonical write -> read-back
删除 / 高风险覆盖 -> 额外安全校验
```

**新 meal 是特殊流程**：

```text
用户文字 / 图片
→ AI 生成实际摄入与营养草稿
→ 用户修改 / 确认
→ 正式 life_mutate
```

不要把“新 meal 必须先确认草稿”的规则错误扩展成所有生活资源都必须二次确认。

`lib/ai/record-write-protocol.ts` 与 Natural Input Normalizer 提供共享 contract；AI 不获得任意 SQL 权限。

`legacy_home` 是 Legacy Game 兼容入口，不属于普通 Island Life resource；只有用户明确要求旧游戏操作时才进入该流程。

旧 Harbor Sheet / Apps Script / Fast Wake / Drive Bridge 已退出当前 AI 主链路，不得因为 archive 或历史 migration 仍存在就重新实现。

## 9. Supabase / 安全

- Browser -> Next.js API -> server-only Supabase；
- secret 不进入浏览器；
- Web session 与 MCP OAuth token 都绑定固定 actor；
- DDL 只通过新 migration；
- 已执行 migration 不回改；
- 多表写入考虑事务；
- anon/authenticated 不意外获得 server-only RPC；
- 真实药箱 Excel/库存、账号密码、PushPlus token 不得提交到 GitHub migration；
- 环境变量语义以 `docs/15-configuration-reference.md` 为准。

## 10. Legacy Game

旧游戏完整保留：deficit、运动分钟、游戏体重快照、金币/宝石、钱包、成长地图、兑换商店与历史、成长日志、同步/备份。

它现在的产品身份是：**新程序「游戏」里的独立子项目“变瘦变美大作战”**。

V2 不顺手重写 Legacy Game，也不把 Life facts 自动转成全局排行榜；普通生活数据清理、导入和恢复也不得顺手修改 Legacy Game。

## 11. 开发验证

代码改动每阶段至少：

```text
npm run test
npm run lint
npm run build
```

可见 UI 还需经授权的 Vercel Preview / Production 实机检查。未做视觉检查，不写“视觉已验证”。

只修改文档 / Skill 时不要求为了形式运行完整 build，但必须核对：

- 链接和路径；
- 当前代码事实；
- 是否与 Production 状态冲突；
- 是否残留已经退役的 transport / 权限 / API 描述。

## 12. Vercel 部署审批（强制）

仓库使用 `vercel.json` 关闭 Git 自动部署：

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

必须遵守：

- Git push、PR、merge 不得自动触发 Vercel Preview 或 Production；
- 任何 Vercel Preview / Production 部署都必须先向用户申请；
- 只有用户明确回复“允许部署”或语义等价确认后，才可以手动触发部署；
- 未获批准时，可以继续提交代码、文档、运行 GitHub CI，但不得调用 Vercel 部署动作；
- 不得为了“顺便看看效果”自行部署；
- 部署审批是逐次授权，不视为永久授权。

长期设计理由见 `docs/adr/0006-manual-production-deployment.md`。

## 13. 当前下一步

`docs/09-status-roadmap.md` 为唯一当前状态页。按该文档继续推进；任何需要 Vercel Preview / Production 的节点都必须先执行第 12 节审批流程。

## 14. 文档治理（强制）

`docs/README.md` 是文档体系规则入口。

维护时必须遵守：

```text
当前事实 -> 顶层领域主文档
架构原因 -> docs/adr/
版本 / 阶段 / 实施验收 -> docs/archive/
当前上线状态 -> 09-status-roadmap.md
发生了什么 -> CHANGELOG.md
```

### 防止文档漂移

以下变化必须同批更新文档：

- API / transport / auth -> `04-api-and-sync.md`；
- schema / 数据域 -> `03-data-model.md`；
- 环境变量 -> `15-configuration-reference.md`；
- Production 排障 / 恢复方式 -> `16-operations-runbook.md`；
- 长期架构方向 -> 新 ADR 或 supersede 旧 ADR。

顶层长期文档按**领域**命名，不按 `R8 / R10 / R11.5` 之类开发轮次持续新增。版本化实施记录在结论吸收后必须归档。

如果发现当前主文档与代码冲突，不能继续复制旧文档；先以 Production / 当前 `main` 核验事实，再修正文档。
