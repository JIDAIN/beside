# Meal Photo Storage

本文维护 Meal 正式照片的 server-side 存储、压缩、替换、显示 metadata 与 media recovery contract。

## 1. Boundary

正式 persisted photo 与 AI analysis image set 是两件事。
当前每条 Meal 只有一个正式展示 photo slot。

## 2. Formal Photo Data Model

当前：
- meals.photo_path
- meals.photo_rotation_degrees
- meals.photo_scale

rotation：0 / 90 / 180 / 270。
scale：0.60～1.00。

rotation/scale 是显示 metadata，不反复改写原图片像素。

## 3. Upload Pipeline

~~~text
signed actor
→ Meal ownership
→ input validation
→ EXIF normalize
→ resize/compress
→ private Storage object write
→ DB bind
→ cleanup replaced/orphan object
~~~

## 4. Current Compression Contract

当前 server 实现：lib/server/image-compression.ts。

current implementation：
- Meal input max 10MB；
- JPEG/PNG/WebP/HEIC/HEIF；
- sharp rotate() 归一 EXIF；
- fit=inside，最长边 max 600px；
- WebP q70；
- 若仍 >120KB，尝试 q65/q60/q55；
- q55 后可能仍 >120KB，120KB 是降 quality 触发线，不是硬上限。

这些数值是 current implementation，可通过系统级媒体重构改变。

## 5. Private Storage

bucket：meal-photos，private。

path 由 server 生成：
space-slug / meal-id / random.webp。

浏览器不持有 service secret，也不能通过普通 Meal payload 任意设置 photo_path。

## 6. Replace / Delete / Orphan Safety

PUT 流程：
ownership → compress → upload new → replace DB binding → best-effort cleanup old。

DB binding 失败时清理新对象，减少 orphan。

DELETE 解除 binding 并恢复默认 display metadata。

## 7. Display Metadata

默认 current behavior：
- portrait 压缩结果可能默认 rotation=90；
- 其他 rotation=0；
- scale=1。

UI 可以调整视觉 frame，但 rotation/scale 的持久化语义属于本 contract。

当前 4:3 / object-contain 等视觉 baseline 在 Design System 维护。

## 8. MCP Media Recovery

若 client 真正传入 bytes：
attachment → server compress → Meal mutation → private Storage。

若用户明确要保存当前图片但 MCP 没传 bytes：

~~~text
life_mutate attachPhoto=true
→ MEDIA_ATTACHMENT_REQUIRED
→ mutationExecuted=false
→ signed recovery.uploadUrl
→ browser uploads image
→ server continues original business operation
~~~

收到 MEDIA_ATTACHMENT_REQUIRED 后不得重新 create/update Meal，否则可能重复业务写入。

## 9. AI Multi-image vs Formal Single-image

多图可参与分析，例如餐前/餐后；正式数据库仍只持久化一个 photo_path。

不得告诉用户“一餐永久保存了两张正式图片”。

## 10. Security

- private bucket；
- server-only Storage write；
- server-generated path；
- photo API 校验 Meal owner；
- transform 值有范围；
- image recognition failure != image persistence failure。

## 11. Implementation Anchors

- lib/server/image-compression.ts
- lib/server/supabase-nutrition.ts
- app/api/meals/[id]/photo/route.ts
- lib/server/life-mcp-tools.ts
- app/ai-media-upload/route.ts
- components/life/MealPhotoFrame.tsx
- tests/server/image-compression.test.ts
- relevant client/server media tests

## 12. Change Impact

- compression → server/media tests；
- bucket/path → Security + Operations；
- photo cardinality → Data + API + AI + UI + migration；
- ownership → Auth；
- recovery protocol → AI Architecture + MCP tests。

## 13. Maintenance Rules

媒体持久化 contract 改变时更新本文；纯视觉 frame 调整只更新 Design System/UI。
