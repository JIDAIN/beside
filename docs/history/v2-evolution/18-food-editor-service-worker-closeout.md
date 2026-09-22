# 饮食编辑页与 Service Worker 收口（2026-09-11）

本轮仅收口餐食编辑页和生活系统 Service Worker，不改变饮食数据模型、Supabase、Storage、AI/MCP、历史记录或月度回顾。

## 餐食编辑页

- `AppPageShell` 为餐食编辑页提供显式 `meal-editor` variant，生成 `life-page-shell--meal-editor`；饮食主页继续沿用既有布局，不共享这组编辑页尺寸覆盖。
- 编辑页正文使用 `life-meal-editor`、`life-meal-editor-meta`、`life-meal-nutrition-card`、`life-meal-food-list`、`life-meal-note-card` 等稳定 class，后续编辑页视觉调整不应继续依赖 section 顺序。
- 餐食照片主页面固定为“左侧约 45% 缩略图 + 右侧操作”。有照片时右侧依次提供更换、调整、删除；无照片时保留同尺寸小占位和上传入口。
- 点击照片或“调整照片”进入独立 bottom sheet；旋转与缩放只在弹层中预览，关闭后主编辑页保持紧凑。照片上传、替换、删除、旋转、缩放、压缩、Storage 保存逻辑仍由原 Meal 流程处理。
- 食物摘要、营养合计、常吃食物、备注和餐食保存/删除逻辑不变。

## Service Worker / 首次进入版本策略

旧 worker 使用固定 `couple-better-life-shell-r8-4-v1`，安装时预缓存 `/` 等 HTML，并在导航请求超过 2500ms 时回退缓存。这会把“网络暂时较慢”误判成离线，使旧首页 HTML 在当前 Production 已更新时仍被展示。

当前策略：

- cache version 更新为 `couple-better-life-shell-r9-v1`；激活时删除所有旧 `couple-better-life-shell-*` cache。
- 不再安装时预缓存 `/` 或其他页面 HTML。
- navigation 始终等待当前网络响应，并使用 `cache: no-store`；只有网络请求真正失败时，才读取当前 worker 版本产生的 HTML cache 作为离线兜底。
- API、MCP、OAuth、well-known 路径继续不由 worker 缓存或拦截。
- cache-first 仅保留给 `/_next/static/` 下带构建 hash 的 Next.js 静态资源；普通公共图片、worker 文件及页面/RSC 响应不再被长期 runtime cache 固定。
- `LifeServiceWorker` 注册后立即执行 `registration.update()`，并在窗口重新获得焦点、网络恢复、页面重新可见时再次检查更新。
- 针对已经被旧 worker 控制的手机：新 worker `skipWaiting + clients.claim` 后清理旧 cache；若检测到旧 life-shell cache，激活阶段对当前同源窗口执行一次 `client.navigate(client.url)`。该动作只在“确实发现旧 cache”的这次激活发生，不形成刷新循环。

## 回归边界

必须保持：饮食主页现有顶部密度、我/Ta 切换、日期与常吃食物入口、餐卡结构；餐食新增/编辑/删除、照片能力、食物与营养、常吃食物、历史/月度数据，以及 AI/MCP 与 Supabase 行为均不得因本轮视觉和缓存策略调整而改变。
