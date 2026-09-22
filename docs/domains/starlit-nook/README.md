# Starlit Nook Domain

> Status: Current code foundation / not user-facing
>
> Product: 隅星 / Starlit Nook；小名：星星角。

本文只记录 **已经进入 GitHub main 的 Starlit Nook Domain contract**。尚未实现的 UI、数据库、MCP、媒体 provider 与阶段计划继续维护在 Obsidian `13_Projects/隅星`，不提前写成 GitHub current fact。

## 1. Current Domain Boundary

当前代码 foundation 已定义四类共同回忆 item：

~~~text
watch
place
food
activity
~~~

并定义 trip、trip-item relation、media record interface。

当前这只是代码 contract，不是已经可运行的 Web 产品。

Starlit Nook 的长期产品边界与 Beside Life 分离；共享基础设施但保持独立 Domain 的长期原因见 ADR-0008。

## 2. Current Ownership Contract

当前 foundation 采用 couple-space shared 语义：

~~~text
Fish → shared-domain actor
Cat  → shared-domain actor
~~~

`participantScope = fish | cat | both` 描述谁参与了回忆，不是权限来源。

`StarlitNookMutationContext.actor` 只接受 `fish | cat`。真正 Web / MCP authorization 尚未接入；未来 adapter 必须继续从可信 Web session / MCP OAuth 注入 actor，不能信任普通 payload 自报身份。

## 3. Current Code Foundation

已经存在：

~~~text
lib/starlit-nook/types.ts
lib/starlit-nook/validation.ts
lib/starlit-nook/query.ts
lib/starlit-nook/repository.ts
lib/starlit-nook/service.ts

tests/starlit-nook/domain-contract.test.ts
~~~

当前已实现：
- item / trip TypeScript contract；
- item / trip input validation；
- bounded item query parsing；
- UUID/date/rating/participant validation；
- Repository interface；
- canonical StarlitNookService；
- item/trip CRUD method contract；
- trip-item link/unlink contract；
- media lookup interface；
- domain-contract tests。

## 4. Current Item Contract

### Common item fields

当前 base write contract 包含：

~~~text
title
occurredOn nullable
occurredAt nullable
participantScope
fishRating nullable
catRating nullable
note nullable
~~~

稳定 validation：
- title 最长 200；
- participantScope：fish / cat / both，缺省 both；
- rating：1～5 整数或 null；
- note 最长 2000；
- occurredOn 为 YYYY-MM-DD 或 null；
- occurredAt 为有效 timestamp 或 null。

### Watch

当前：
- mediaKind：movie / series / anime / variety / documentary；
- watchStatus：watching / completed / dropped；
- startedOn / finishedOn 可空；
- finishedOn 不能早于 startedOn。

### Place

当前：
- placeKind：city / attraction / restaurant / cafe / park / venue / hotel / mall / other；
- address / cityName 可空；
- latitude：-90～90；
- longitude：-180～180。

### Food

当前：
- foodMode：dine_out / homemade；
- foodKind：meal / dish / dessert / drink / snack / other 或 null；
- linkedPlaceItemId 可空，非空必须是 UUID；
- recipeRef 可空。

### Activity

当前：
- activityKind：非空、最长 80；
- durationMinutes：1～10080 整数或 null；
- linkedPlaceItemId 可空，非空必须是 UUID。

## 5. Current Trip / Query Contract

Trip 当前包含：

~~~text
title
startDate nullable
endDate nullable
regionText nullable
note nullable
participantScope
~~~

约束：
- title 最长 200；
- endDate 不能早于 startDate；
- regionText 最长 300；
- note 最长 3000；
- participantScope 缺省 both。

Item query 当前支持：
- itemType；
- date / dateFrom / dateTo；
- city；
- activityKind；
- tripId；
- limit。

limit 当前为 1～500，默认 100。

## 6. Current Service / Repository Boundary

当前真实结构：

~~~text
StarlitNookService
→ StarlitNookRepository interface
→ no Production persistence adapter yet
~~~

Service 当前负责：
- parse / validation；
- UUID contract；
- item/trip canonical operation；
- mutation context normalization；
- trip-item relation调用。

Repository interface 当前定义：
- item list/get/create/update/soft-delete；
- trip list/get/create/update/soft-delete；
- trip-item link/unlink；
- media get。

Adapter 不应拥有第二套业务规则。

## 7. Current Provenance Contract

当前 mutation context：

~~~text
actor
source
sourceRef optional
~~~

当前代码只约束：
- actor = fish / cat；
- source 为 1～64 字符；
- sourceRef 最长 1000。

**当前没有 persisted provenance enum，也没有 Production source table contract。**

未来 importer/adapter 的 source 设计属于未实现目标方案，应在 Obsidian `13_Projects/隅星` 设计，真正实现后再同步本文。

## 8. Current Persistence / Media / API / AI State

当前 **没有**：
- Starlit Nook Production table；
- Starlit Nook migration；
- Supabase Repository implementation；
- Starlit Nook Web API；
- Starlit Nook Web UI；
- Starlit Nook MCP tools；
- Starlit Nook media storage provider。

`StarlitNookMediaRecord` 与 `Repository.getMedia` 目前只是代码 interface contract，不代表 R2/Supabase/其他 provider 已经接入。

因此：
- Product Overview 当前不把 Starlit Nook 列为用户可用 capability；
- Data Model 当前不列 Starlit Nook Production schema；
- API & Sync 当前不列 Starlit Nook route；
- AI Architecture 当前不列 Starlit Nook tool surface。

## 9. Architecture Boundary

ADR-0008 已决定：Starlit Nook 与 Beside 可以共享当前 repo / identity / transport foundation，但保持独立 Domain。

这个 ADR 是长期架构取舍，不等于上述未实现层已经存在。

Life / Starlit Nook 不应互相直接改表；若未来 Beside fact promotion 到 Starlit Nook，需要单独定义明确 contract。

## 10. Documentation Sync

当前实现事实：
- 本文；
- [Architecture Overview](../../architecture/overview.md)；
- [ADR-0008](../../architecture/decisions/0008-starlit-nook-shared-infra-independent-domain.md)；
- current source；
- tests。

未实现的产品定位细化、UI/UX、schema 草案、媒体/provider、AI tool 设计与阶段计划：
- Obsidian `13_Projects/隅星`。

当这些目标真正实现并经过测试/runtime 核验后，再按 [Documentation Maintenance Guide](../../engineering/documentation-maintenance.md) 同批更新 GitHub canonical docs。
