# UI 与交互维护规范

状态：2026-09-21。本文维护当前页面交互与复用规则；主视觉 token 见 [Design System](design-system.md)，业务数据 contract 见 Domains。

## 1. 基本规则

- 先复用 App* / 已有 Pattern；
- 控件本身能说明功能时不加重复解释性小字；
- 必要的错误、权限、未保存、危险操作提示不能为了“简洁”被删除；
- UI 隐藏按钮不是权限控制；
- 业务 mutation 必须走 canonical API / service。

## 2. 双人事实页

个人事实页统一：

- 用“我 / Ta”；
- 切换只改变查看对象；
- Ta 个人数据保持只读；
- shared domain 按各自权限处理。

## 3. 今日

Today 保持高频、低负担：

- 心情；
- 睡眠；
- 活动。

心情未记录使用独立插画；月历不使用该占位图。

睡眠按起床日显示“昨晚入睡 → 今天起床”。

历史日详情复用 Today 的 mood / sleep / activity 组件，不复制一套历史专用编辑器。

## 4. 饮食页

当前结构：

- 页面标题区域放我 / Ta；
- 日期切换；
- 早餐 / 午餐 / 晚餐；
- 上午 / 下午 / 晚上加餐；
- 每条 snack 独立展示；
- Ta 只读；
- 自己可进入 Meal editor；
- 常吃食物有独立维护入口。

主餐和 snack 的数据语义由 [Meal Lifecycle](../domains/meal/lifecycle.md) 维护，本页不重复数据库约束。

## 5. Meal editor

编辑页保持移动端单列。

必须支持：

- 日期；
- 时间；
- 餐次 / snack period；
- 食物 items；
- kcal / macros；
- 备注；
- 一张展示照片；
- 新食物 / 常吃食物；
- 保存 / 删除。

可靠性要求：

- 没有 item 时 Web editor 不允许保存；
- 有未保存修改时离开页面需要提示；
- 表单错误靠近主要编辑区展示；
- 修改无关字段不能无故清掉已有 AI nutrition；
- Meal 主记录保存成功但照片保存失败时，不重复新建第二条 Meal，只重试照片。

## 6. Meal photo UI

统一复用 MealPhotoFrame：

- 4:3；
- object-contain；
- 完整图片优先；
- 支持 0/90/180/270 旋转；
- 支持 60%–100% scale；
- 更换 / 删除照片；
- transform 不重新压缩文件。

完整媒体规则：
→ [Meal Photo Storage](../domains/meal/photo-storage.md)

## 7. 月度回顾

统一三个 tab：

- 心情；
- 饮食；
- 睡眠。

心情固定按 mePartnerKey / taPartnerKey 放两个槽位，无记录留空，不能因接口顺序交换。

饮食和睡眠使用单人切换；点击日期进入对应历史日。

月历是事实回顾，不显示 streak、完成率、好坏评价。

## 8. 小窝

当前入口：

- 体重；
- 小信箱；
- 家庭药箱；
- 游戏机。

小窝可以保留较强生活场景感，但功能入口必须清楚。

## 9. 小信箱

当前 tab：

- 收信箱；
- 已寄出；
- 待寄出。

draft：

- 仅寄件人可见；
- 可编辑；
- 可删除；
- 可寄出。

sent：

- sender / recipient 可见；
- 永久只读；
- UI 不显示编辑 / 删除操作。

手札支持翻页；明信片使用水平横向版式。

## 10. 我的

当前“我的”主要是账号与应用边界：

- 当前账号；
- 云端状态；
- PushPlus / 微信提醒绑定；
- 数据管理；
- 退出登录。

Reminder Center 存在 /me/reminders 页面，但当前不是“我的”页面的独立列表入口。

## 11. 无感加载

已有 stale data 时保留现有内容并后台 revalidate，避免空白闪烁。

图片加载失败、网络读取失败必须有可恢复状态，但不应因为一次后台刷新把整个页面清空。

详细 cache 机制：
→ [API and Sync](../architecture/api-and-sync.md)

## 12. ui-lab

新视觉 Pattern 可以先在 /ui-lab 验证。

ui-lab 只用于假数据 / 视觉状态，不应接入真实 Life mutation。

## 13. UI 变更最低验证

代码侧：

- npm run test
- npm run lint
- npm run build

可见行为至少人工检查：

- 窄屏；
- safe-area；
- 我 / Ta；
- loading / empty / error；
- 表单未保存；
- 删除确认；
- 图片方向和完整性；
- mailbox draft / sent 权限。

Preview / Production 仍按单次授权规则执行。
