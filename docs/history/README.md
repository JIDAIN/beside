# History MOC

History 解释伴岛怎样走到今天，但不定义 current behavior。

## 1. Purpose

这里保存：
- curated product evolution；
- milestone changelog；
- 原始阶段实施 / 验收证据。

如果 History 与 current docs、current code 或已核验 runtime 冲突，History 只代表过去。

## 2. Curated History

- Product Evolution：产品从最初游戏雏形演变为伴岛 / Beside，以及术语为什么仍存在。
- Changelog：对理解产品状态有价值的工程/产品里程碑。

## 3. Raw Historical Evidence

- v2-evolution/：生活系统与 UI 演进阶段文档。
- ai-integration/：AI/MCP 接入与阶段验收。
- harbor/：旧 Harbor bridge / project instructions 历史。
- deployments/：历史发布授权与发布记录。

Raw evidence 通常保留当时语境，不把旧“current”改造成今天的 current。

## 4. Authority Rules

~~~text
History explains the past.
History never overrides current docs/code/runtime.
~~~

历史文件内部出现“current / canonical / production”只表示写作当时。

## 5. Historical Terminology

历史中可能出现：
- Couple Better Game / couple-better-game；
- Island Life；
- Harbor；
- V2 / R8 / R11；
- 变美变瘦大作战作为当时整个应用。

这些称呼按当时语境保留，不代表今天的正式命名。

## 6. When to Add History

适合进入 History：
- 大型上线里程碑；
- 重要迁移/架构收口；
- 一次性验收；
- 旧方案被替代但仍有追溯价值。

普通 CSS 微调、无行为变化的 refactor 不需要都记入 Changelog。

## 7. What Must Stay in Current Docs

当前能力、schema、权限、Domain lifecycle、部署状态必须维护在 Product/Architecture/Domains/Engineering。
不要让 History 成为第二 current source。
