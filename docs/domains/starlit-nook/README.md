# Starlit Nook Domain

> Status: Foundation / under development
>
> Product: 隅星 / Starlit Nook；小名：星星角。

本 Domain 负责共同回忆的正式数据与展示 contract，不负责完整相册管理或重型照片整理。

## 1. Product Boundary

第一版正式内容：

~~~text
星影  watch
足迹  place
烟火  food
拾趣  activity

+ 旅行聚合
+ 精选展示媒体
~~~

Starlit Nook 是：

> 共同回忆的正式事实层 + 展示层。

不是：

- 完整照片库；
- 本地相册管理器；
- 相册扫描 / 聚类程序；
- 旅行自动生成器；
- Beside Life 历史页。

相册梳理、旅行足迹生成等重处理以后进入独立“回忆整理程序”。

## 2. Ownership

Starlit Nook 第一版是 couple-space shared resource。

~~~text
Fish → read / create / update / delete
Cat  → read / create / update / delete
~~~

participant_scope = fish / cat / both 只描述谁参与了回忆，不参与授权。

可信 actor 继续来自 signed Web session / MCP OAuth。

## 3. Current Code Foundation

当前已建立：

~~~text
lib/starlit-nook/types.ts
lib/starlit-nook/validation.ts
lib/starlit-nook/query.ts
lib/starlit-nook/repository.ts
lib/starlit-nook/service.ts

tests/starlit-nook/domain-contract.test.ts
~~~

当前只建立 Domain contract。

尚未建立：

- Production table；
- migration；
- Supabase Repository implementation；
- Web API；
- MCP tools；
- Web UI。

因此不能把当前 foundation 描述成已经可运行的 Starlit Nook 产品。

## 4. Planned Fact Store

待 migration 审查：

~~~text
starlit_nook_items

starlit_nook_watch_details
starlit_nook_place_details
starlit_nook_food_details
starlit_nook_activity_details

starlit_nook_trips
starlit_nook_trip_items

starlit_nook_media
starlit_nook_item_media
starlit_nook_trip_media
~~~

Production DDL 必须通过新增 migration，当前尚未执行。

## 5. Canonical Service Boundary

最终正式入口：

~~~text
Web API ───────────────┐
                       ├→ StarlitNookService → Repository → Supabase
MCP / ChatGPT ─────────┘
~~~

Adapter 不拥有业务规则。

当前 StarlitNookService 已负责：

- item / trip input validation；
- UUID / query contract；
- canonical item / trip operation；
- source provenance normalization；
- trip-item relation contract。

Repository interface 是 Domain 与数据库之间的边界。

真正 Supabase adapter 等 migration contract 审查后再实现，避免先写假 CRUD。

## 6. Provenance

source 不是权限字段。

计划支持：

~~~text
manual
chatgpt
notion
beside
import
~~~

source / sourceRef 应由可信 adapter / importer 注入，不允许普通业务 payload 伪造调用来源。

## 7. Media Boundary

~~~text
本地 / 网盘
= 完整原始影像

R2
= 精选 Web 展示副本

Starlit Nook DB
= media metadata + relation
~~~

第一版 Starlit Nook 只消费已经选定的展示媒体。

不做：

- 本地目录扫描；
- 批量相册导入；
- EXIF 全库索引；
- AI 大批量挑片；
- 自动旅行生成。

这些属于未来独立“回忆整理程序”。

## 8. AI Boundary

计划新增独立 MCP tools：

~~~text
starlit_nook_capabilities
starlit_nook_query
starlit_nook_mutate
~~~

不塞进 life_query / life_mutate。

AI 不获得任意 SQL / table CRUD。

破坏性操作继续沿用服务端显式删除意图与“不猜 UUID”原则。

## 9. Development Phases

当前：**Phase 2B — Web UI / UX design validation**。

已完成：

- types；
- validation；
- query contract；
- repository interface；
- canonical service；
- validation tests；
- Domain 文档。

当前进度：

- Phase 1 Domain foundation：已完成；
- Phase 2A GitHub reference implementation review：已完成并收口；
- Phase 2B Web UI / UX design validation：进行中。

下一步：

1. 在 Obsidian 完成 Starlit Nook 页面树与静态原型；
2. 验证首页、时间线、四类列表、回忆详情、旅行、足迹地图与 Viewer；
3. 用 UI contract 反向复审当前 types / validation / repository / service；
4. 只有 UI 验证通过后，再生成 migration 草案；
5. migration 之后再建 Supabase Repository、CRUD regression、Web API；
6. 核心 Web UI 接真实数据后，再接 MCP / ChatGPT。

## 10. Documentation Sync

产品定位、范围、设计理由：

~~~text
Obsidian / 13_Projects / 隅星
~~~

当前代码 contract：

- 本文；
- Architecture；
- Auth；
- AI Architecture；
- migrations；
- tests。

代码 contract 变化必须同步本文。
