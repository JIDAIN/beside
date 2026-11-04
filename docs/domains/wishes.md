# Wish List / 心愿清单 Domain

> Scope: Production capability deployed 2026-11-04. Authenticated CRUD / photo / two-account UI acceptance is still pending; release evidence and limits are tracked in [Current State](../engineering/current-state.md).

## Purpose
「小窝 → 心愿清单」是双人共享的轻量生活收藏库，记录未来想去、想玩、想吃、想做的事情，也保留体验过、值得重复体验的内容。它不是工作待办、旅行行程引擎或已发生回忆的第二份档案。

## Categories and intentions
- Category: `go` 想去、`play` 想玩、`eat` 想吃、`do` 想做；不设置二级目录。
- Intent is **derived**: 没有体验记录且未归档 = 想尝试；有体验且希望再来 = 值得再去；有体验且暂不重复/归档 = 已体验。
- 体验日期和再次体验意愿独立存储；完成一次不删除清单。
- `archivedAt` 是数据字段，当前 UI 暂不提供独立的归档入口。

## One entry
- 必填：标题、一级分类。
- 可选：封面、介绍、地点、开放时间、费用、预计时长、推荐时间、自由攻略备注、多参考链接。
- 必打卡/必体验是可以排序的模板条目；一次体验的完成状态由体验记录中的 `completedItemIds` 保存，不修改模板的全局完成状态。
- 每次体验：日期、简短感受、当次勾选项目；删除模板项目时也清理其历史勾选引用。
- 新增时不强迫填写全部攻略字段，未保存编辑需要离开确认。
- 用户输入的外链仅允许 HTTP/HTTPS；预览/读取不会绕过 Web session。

## Ownership
- Data class: couple-space shared Life fact。
- Cat/Fish 登录后双方可读、可新增、可维护和删除；`createdBy` 是可信服务端 actor，不由请求体决定。
- Next.js 固定账号 session 校验先于访问数据库和 Storage。
- RPC 仅供 service role 使用；anon/authenticated 无权任意读取、写入或调用 RPC。
- 不属于 Legacy Game；不自动修改 Meal、activity、wallet、游戏结算。

## Persistence and media
- `life_wishes`：独立 Supabase 表，主要内容为 JSONB，系统 ID/创建者/时间为表字段。
- `list_life_wishes` / `write_life_wish` / `bind_life_wish_image`：受限 RPC。
- 图片位于私有 `wish-photos` bucket。服务端检查身份、压缩、生成路径并上传，再绑定 DB；绑定失败清理新文件，成功替换后尽力清理旧文件。
- 复用 `compressMealPhoto` 当前压缩实现（图片输入最多 10 MB，处理为 WebP）；这只复用图像处理函数，不意味着 Wish 媒体成为 Meal 数据。
- 封面单独上传失败时，已成功创建的清单记录继续保留，并可通过同一 ID 重试，而不是重复创建。
- 软删除心愿后尽力清理已绑定的封面对象。

## API and UI
- `GET/POST /api/life/wishes`
- `PATCH/DELETE /api/life/wishes/[id]`
- `GET/PUT/DELETE /api/life/wishes/[id]/photo`
- `/nest/wishes`：搜索、分类/意愿筛选、详情、编辑、打卡模板、体验记录与封面。
- GitHub main 新增 AI/MCP wish resource（尚未部署）：通过现有 life_query / life_mutate 查询、新增、增量修改、添加体验、删除；仅通过可信 Cat/Fish OAuth actor 调用同一共享心愿服务，不新增独立 MCP CRUD/SQL 或 OAuth scope。\n- 创建同名同分类优先返回已存在项而不重复新增；更新保留已有历史与封面；delete 需要当前用户消息明确删除意图。MCP 暂不提供心愿封面写入，需通过 Web 私有图片 API。

## Limits and verification
- 目前的备份/导入/恢复 allowlist 尚未纳入 wishes 和 wish-photos；不要宣称该模块已获得完整备份恢复保障，也不要顺手扩展普通 Life restore 到 Legacy Game。
- Production migration `20261104005447_life_wishes.sql` was applied on 2026-11-04; future migrations remain separately authorized.
- Production build READY, unauthenticated API returned HTTP 401, and public page rendered. Authenticated CRUD, private Storage write/read, two-account shared behavior, and mobile visual acceptance are not yet independently verified.
- Implementation: `lib/life/wish-list-model.ts`, `lib/server/life-wishes.ts`, `lib/server/life-wish-photos.ts`, `components/life/LifeWishesPage.tsx`, `app/api/life/wishes/**`, `supabase/migrations/20261104005447_life_wishes.sql`.
