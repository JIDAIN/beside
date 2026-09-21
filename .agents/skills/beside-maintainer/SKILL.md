---
name: beside-maintainer
description: JIDAIN/beside 的项目专属维护 Skill。定义伴岛代码、数据库、UI、AI、测试与文档修改的标准执行流程；项目事实必须从 AGENTS.md、MOC、canonical docs、源码与 runtime 读取。
version: 4.0.0
---

# Beside Maintainer

## 定位

本 Skill 只回答：**接到一个伴岛开发任务后，应该怎样安全、可验证地执行。**

它不维护当前功能清单、主导航、视觉色板、数据库表清单、Meal / Reminder / Legacy Game 具体规则或 Production 状态。

这些事实必须从：

```text
AGENTS.md
→ docs/README.md
→ 当前任务 MOC
→ canonical contract
→ 真实源码
→ 必要时 Production / Supabase runtime
```

读取。

## 1. 启动协议

每次任务开始：

1. 读 `AGENTS.md`；
2. 读 `docs/README.md`；
3. 读 `docs/engineering/current-state.md`；
4. 根据任务进入对应 MOC；
5. 只读本次任务需要的 canonical contract 与源码；
6. 涉及线上事实时再核 Production / Supabase。

任务入口：

| 任务 | MOC |
|---|---|
| 产品能力 / 页面 / UI | `docs/product/README.md` |
| 架构 / 数据 / API / 身份 | `docs/architecture/README.md` |
| AI / MCP | `docs/architecture/ai/README.md` |
| 具体业务领域 | `docs/domains/README.md` |
| 开发 / 测试 / 配置 / 发布 / 排障 | `docs/engineering/README.md` |
| migration | `supabase/README.md` |

不要先全仓大扫荡，也不要从 archive 反推 current behavior。

## 2. 先定义任务边界

在修改前内部确认：

```text
用户真正要求改变什么？
哪些东西必须保持不变？
当前事实源在哪里？
成功标准是什么？
是否涉及 Production / Supabase 写入？
```

如果用户要求“其他不要动”，按外科手术式修改执行，不顺手重构邻近代码。

## 3. 判断变化属于哪一层

```text
未来产品设计，还没开发
→ Obsidian「伴岛」

当前产品能力 / 当前入口变化
→ Product Overview

稳定交互 contract 变化
→ UI Guidelines

统一视觉架构 / token / shared pattern 变化
→ Design System

具体业务生命周期变化
→ Domain

跨领域机制 / schema / auth / API 变化
→ Architecture

运行、配置、发布、排障变化
→ Engineering

长期架构取舍变化
→ ADR

阶段过程 / 一次性验收
→ Archive / CHANGELOG
```

避免把同一事实写进多层文档。

## 4. 实现原则

- 优先修改 canonical service / shared layer，不复制第二套业务逻辑；
- 权限必须由服务端 / 数据层强制，UI 隐藏按钮不是权限控制；
- 不根据旧变量名、历史文档或 archive 猜当前用户语义；
- 不把一个 domain 的事实自动写回另一个 domain，除非当前 contract 明确允许；
- 数据库变更只新增 forward migration，不回改已执行 migration；
- secret、密码、token、私人业务数据不得提交仓库；
- 已退役 transport / bridge 不因历史文件仍存在而恢复。

## 5. UI 任务工作流

UI 任务先读：

- `docs/product/design-system.md`；
- `docs/product/ui-guidelines.md`；
- 必要时 `components/ui/README.md`。

执行顺序优先：

```text
现有 token / App* / shared pattern
→ domain component
→ page composition
```

系统级 UI 重构优先收敛公共层，再迁移页面并清理被替代的历史 override；不要把新增一层 `r9/r10` 全局 CSS 当默认长期方案。

页面重构不得顺手改变业务 contract、权限、数据写入或游戏结算语义。

视觉验收按受影响范围覆盖窄屏、safe-area、loading / empty / error、只读、未保存、删除确认和真实中文长度。

没有真实视觉检查时，不写“视觉已验证”。

## 6. 数据 / API / AI 任务工作流

涉及数据时：

1. 先找 canonical domain service；
2. 再核 API / adapter / RPC；
3. 涉及 schema 时新增 migration；
4. 核 ownership / shared permission / idempotency；
5. 写后 read-back 或用对应测试验证。

涉及 AI 时，优先扩展现有 AI Access Core / registry / normalizer / canonical services，不为新模块另造一套身份或任意 SQL 通道。

具体 resource / action / media / natural-language 规则从 AI MOC 与对应 Domain contract 读取，不在本 Skill 固化。

## 7. 测试与验证

根据改动范围执行最小充分验证。

通常代码改动包括：

```bash
npm run test
npm run lint
npm run build
```

但不要机械认为三条全绿就代表所有验收完成；还要按任务补：

- targeted unit / service test；
- schema / RPC / migration 核验；
- UI 人工状态检查；
- runtime / Production 检查（仅在有必要且有权限时）。

纯文档改动不为了形式跑完整 build，但要检查路径、链接、事实源和是否产生第二份 canonical fact。

## 8. 文档同步

代码改变事实时，同批判断是否需要更新：

```text
Product
Architecture
Domain
Engineering
ADR
code-local README
CHANGELOG
```

不是每次都全部更新，只更新真正受影响的 canonical home。

未来设计仍未实现时，不更新 GitHub current docs。

## 9. 发布硬停止

GitHub push、merge、CI success 都不等于部署授权。

任何 Vercel Preview / Production deployment 都必须获得用户针对**该次部署**的明确授权。

未获授权时可以完成代码、测试、文档和 GitHub 提交，但必须停在部署之前。

如果任务需要 Supabase Production 写入，也必须明确区分：

```text
只读核验
≠ migration / data write
```

不要因为用户允许代码修改而推定允许 Production 数据库变更。

## 10. 完成前自审

提交前检查：

- 是否真的只改了任务需要的范围；
- 是否读了正确 canonical docs；
- 是否把未来设计误写成当前事实；
- 是否复制了第二份业务规则；
- 是否破坏 Life / Legacy Game 或 owner / shared 边界；
- 是否留下历史 CSS / API / migration 的新债务；
- 测试结论是否与实际运行过的检查一致；
- 是否错误声称部署、视觉验收或 Production 验证已经完成。

## 11. 完成报告

用中文说明：

1. 做了什么；
2. 为什么；
3. 修改文件 / migration；
4. 实际验证结果；
5. 未运行检查及原因；
6. 数据 / 安全 / 发布风险；
7. 未完成项；
8. 是否部署，若未部署明确写未部署。
