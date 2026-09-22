---
name: beside-maintainer
description: JIDAIN/beside 项目专属维护 Skill。定义伴岛代码、数据库、UI、AI、测试与文档修改的安全执行流程；事实从 AGENTS、MOC、canonical docs、源码与必要 runtime 读取。
version: 5.0.0
---

# Beside Maintainer

## 定位

本 Skill 只回答：接到伴岛开发任务后怎样安全、可验证地执行。

它不维护当前功能清单、schema enum、Meal/Reminder/Legacy 规则或 Production snapshot。

## 1. Start Protocol

~~~text
AGENTS.md
→ docs/README.md
→ docs/engineering/current-state.md
→ task MOC
→ canonical contract
→ source
→ runtime when needed
~~~

任务入口：
- Product/UI → docs/product/README.md
- Architecture/Data/API/Auth → docs/architecture/README.md
- AI/MCP → docs/architecture/ai/README.md
- Domain → docs/domains/README.md
- Development/Test/Config/Deploy/Operations/Migration → docs/engineering/README.md

不要从 History 反推 current behavior。

## 2. Define Change Boundary

修改前内部确认：
- 用户真正要求改变什么；
- 什么必须保持不变；
- canonical owner 是谁；
- current implementation 在哪里；
- success criteria；
- 是否涉及 Production/Vercel/Supabase 写入。

用户明确“其他不要动”时按外科手术式修改，不顺手重构。

## 3. Classify Change

~~~text
future product design → Obsidian
current capability/entry → Product Overview
stable interaction → UI Guidelines
UI system/token/pattern → Design System
business lifecycle → Domain
data/auth/API/cross-domain → Architecture
development/config/runtime/deploy → Engineering
long-term rationale → ADR
past milestone/evidence → History
~~~

避免同一事实写进多层。

## 4. Implementation Principles

- 优先 canonical service/shared layer，不复制业务逻辑；
- 权限由 server/data layer 强制，UI 不是安全边界；
- 不根据旧变量名/History 猜用户语义；
- 不跨 Domain 自动写值，除非 current contract 明确允许；
- DB change 只新增 forward migration；
- secret/password/token/private data 不提交；
- retired transport 不因历史文件存在而恢复。

## 5. UI Workflow

先读 Design System + UI Guidelines。

~~~text
tokens/App*
→ shared pattern
→ domain component
→ page composition
~~~

系统级 UI 重构先收敛公共层，再迁 pages，最后清历史 override。

如果只是视觉/目录重构，不改 Domain/Auth/Data。

视觉验收覆盖：窄屏、safe-area、loading/empty/error、read-only、unsaved、delete、真实中文长度。

未做真实视觉检查，不写“视觉已验证”。

## 6. Data / API / AI Workflow

Data/API：
1. canonical Domain/service；
2. ownership；
3. API/adapter/RPC；
4. schema 时新增 migration；
5. tests/read-back。

AI：
- 复用 AI Access Core/registry/normalizer；
- 不为新 client 造第二 CRUD/identity；
- resource/action/media/natural-language 从 AI MOC + Domain 读取。

## 7. Test / Verification

通常代码改动：
- npm run test
- npm run lint
- npm run build

再按任务补 targeted service/schema/UI/runtime checks。

纯 docs 变更不机械 build，但必须检查路径、链接、事实源、canonical ownership 与 dead refs。

## 8. Documentation Sync

代码改变事实时按 docs/engineering/development-testing.md 的 Change Recipe 只更新受影响 canonical home。

尚未实现设计不写入 GitHub current docs。

## 9. Production Hard Stop

Git push/merge/CI success != deployment authorization。

Vercel Preview/Production 每次都需要用户本次明确授权。

Supabase：
read-only verification != migration/data write。
不能用代码修改授权推定数据库写授权。

## 10. Final Self-review

- scope 是否过界；
- canonical docs 是否正确；
- future design 是否误写 current；
- 是否复制第二份规则；
- owner/Life-Legacy boundary 是否破坏；
- test claim 是否与实际一致；
- 是否错误声称 deployment/runtime verification。

## 11. Final Report

中文说明：
1. 做了什么；
2. 为什么；
3. 修改文件/migration；
4. 实际验证；
5. 未运行项；
6. data/security/deployment risk；
7. 未完成项；
8. 是否部署。
