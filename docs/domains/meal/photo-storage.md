# Meal Photo Storage

状态：2026-09-21。本文维护当前 Meal 正式照片的存储、压缩、显示和媒体恢复 contract。

## 1. 数据模型

每条正式 Meal 当前只有一个展示照片槽：

- meals.photo_path
- meals.photo_rotation_degrees
- meals.photo_scale

rotation 允许 0 / 90 / 180 / 270。

scale 允许 0.60 ～ 1.00。

rotation / scale 是显示元数据，不重复改写图片像素。

## 2. 服务端压缩

当前统一实现：lib/server/image-compression.ts。

默认输入上限：

- Meal photo：10 MB；
- 历史 Drive compatibility 有单独更高上限，但已不是当前主上传链路。

支持 MIME：

- JPEG
- PNG
- WebP
- HEIC
- HEIF

处理：

原图
→ sharp rotate() 归一 EXIF
→ fit=inside，最长边最大 600px，不放大小图
→ WebP q70
→ 如果仍 >120KB，再尝试 q65 / q60 / q55
→ 输出 WebP

120KB 是降低 quality 的触发阈值，不是绝对硬上限；q55 后仍可能大于 120KB。

## 3. Storage

正式对象存入 private bucket：

meal-photos

path：

<space-slug>/<meal-id>/<random>.webp

space slug 中继续出现 couple-better-game 属于内部兼容标识。

浏览器不持有 service secret，也不能直接提交任意 photo_path。

## 4. 默认显示方向

压缩后：

- height > width → 默认 rotation=90；
- 否则 rotation=0；
- scale=1。

因此手机竖拍图默认适配横向餐卡；用户仍可手动改回其他方向。

## 5. Photo API

当前：

- GET /api/meals/[id]/photo
- PUT /api/meals/[id]/photo
- PATCH /api/meals/[id]/photo
- DELETE /api/meals/[id]/photo

共同前提：signed actor + Meal ownership。

PUT：

鉴权
→ ownership
→ compressMealPhoto
→ 上传新对象
→ replace_meal_photo_state
→ best-effort 清理旧对象

数据库绑定失败时清理刚上传的新对象，避免 orphan。

PATCH 只修改 rotation / scale，不重新编码图片。

DELETE 解除 photo binding，并恢复默认 display metadata。

## 6. UI

真实照片统一使用 MealPhotoFrame：

- aspect 4:3；
- object-contain；
- 完整内容优先；
- 允许留白；
- 不用 object-cover 强裁切；
- quarter-turn 时调整内部 frame，再执行 rotate + scale。

## 7. AI 多图 vs 正式单图

多张图片可以参与 AI 分析，但当前数据库仍只持久化一个 photo_path。

因此：

- 餐前 / 餐后可同时参与分析；
- 未指定时按当前 Meal AI contract 选择一张正式展示图；
- 不存在 beforePhotoPath / afterPhotoPath；
- 不能告诉用户“一餐永久保存了两张图”。

多图交互：
→ [Meal AI Contract](ai-contract.md)

## 8. MCP media

有真实附件：

附件
→ adapter
→ compressMealPhoto
→ LifeAgentAttachment
→ Meal mutation
→ private Storage

如果用户明确要求保存当前图片，但 MCP client 没传图片 bytes：

life_mutate attachPhoto=true
→ MEDIA_ATTACHMENT_REQUIRED
→ mutationExecuted=false
→ recovery.uploadUrl
→ browser 上传原图
→ 服务端按签名 actor 和原业务参数继续执行

收到 MEDIA_ATTACHMENT_REQUIRED 后不得重新 create/update，否则可能重复业务写入。

## 9. 安全边界

- bucket private；
- Storage 写入只走服务端；
- path 服务端生成；
- photo API 校验 Meal owner；
- 普通 Meal payload 不能任意覆盖 photo_path；
- transform 值严格限制；
- “图片识别失败”与“图片保存失败”是不同问题，视觉识别失败时照片仍可能正常持久化。

## 10. 事实来源

- lib/server/image-compression.ts
- lib/server/supabase-nutrition.ts
- app/api/meals/[id]/photo/route.ts
- components/life/MealPhotoFrame.tsx
- lib/server/life-mcp-tools.ts
- app/ai-media-upload/route.ts
