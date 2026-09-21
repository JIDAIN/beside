# Meal AI Draft Contract

状态：2026-09-21。本文是当前新 Meal 的 AI 对话草稿、实际摄入判断和确认写入 contract。

## 1. 核心边界

新 Meal 的默认 AI 交互：

用户文字 / 图片
→ AI 生成可检查草稿
→ 用户修改或确认
→ life_mutate
→ 正式 Meal

聊天中的 draft / confirmation 不写数据库。

当前没有 meal_drafts 表，也没有服务端通过扫描“确认 / 可以 / 好的”关键词来决定 create 是否允许。

身份、ownership、schema、幂等、delete 和媒体绑定仍由服务端强制。

## 2. 新 Meal 才需要草稿确认

“先草稿、后确认”针对 **新 Meal creation**。

已有 Meal 的：

- 补充食物；
- 饭后 confirm estimated；
- 修改时间 / 备注；
- 修改照片显示；
- 删除；

按各自 action 和安全规则处理，不重新把整顿饭变成新草稿。

## 3. 单图

只有一张图片时先判断用户语义。

用户明确说：

- 记录这顿饭；
- 按照片全部记录；
- 记录这个饭的热量；

表示把图中可判断的整份餐食作为本次目标，先生成草稿，确认后 create confirmed。

只有明确：

- 还没吃；
- 先估；
- 饭前估算；
- 吃完再确认；

才 create estimated。

餐前照片本身不自动等于 estimated。

## 4. 餐前 + 餐后

两图用于估算实际摄入：

estimated actual intake
≈ before edible amount - after edible remaining amount

但：

- 用户文字优先；
- 按食物种类匹配，不按画面位置死配；
- 骨头、果皮、包装等不可食残余不能当可食剩余；
- 中途添饭、共享菜、照片缺失会增加不确定性；
- 无法可靠判断时只问最关键的问题。

饭后确认更新同一 estimated Meal，不创建第二条。

## 5. 草稿字段

合理可判断时，每个 item 尽量包含：

- rawName / displayName
- portionDescription
- estimatedWeightG
- caloriesKcal
- proteinG
- carbsG
- fatG

Meal 尽量包含 totalCaloriesKcal。

真正未知允许 null，不制造虚假精度。

AI 正式 confirmed Meal 至少需要一个 food item。

## 6. 用户确认

用户已经看到当前草稿后，类似：

- 确认记录；
- 没问题；
- 可以；
- 就这样；
- 按这个记；

可视为确认当前草稿。

如果已确认后的正式 write 因临时网络失败而失败，用户要求重试时可以重试 **同一份已确认操作**，不重新生成不同 operation。

## 7. 主餐 / snack

主餐：

- breakfast / lunch / dinner 每天每人最多一个 active Meal；
- 再补食物应 append / update 原 Meal。

Snack：

- morning / afternoon / night 是 period，不是唯一槽；
- 同 period 可以有多条；
- 不同实际进食事件分别 create。

候选不唯一时必须澄清，不猜 UUID。

完整 Meal lifecycle：
→ [Meal Lifecycle](lifecycle.md)

## 8. append_meal_item

“早餐还吃了一个鸡蛋”等语义：

query existing target
→ unique target
→ append_meal_item
→ 保留原 eatenAt

不是创建第二条早餐。

## 9. confirm_estimated_meal

饭后确认：

unique estimated target
→ 用实际 items 替换估算 items
→ status=confirmed
→ 保留原 mealDate / eatenAt
→ 未明确提供的新汇总按实际 items 重算；无法重算则未知

不能用确认发生的时间覆盖真正吃饭时间。

## 10. 图片

多图可以参与分析，但正式 Meal 当前只有一个展示图。

如果需要保存图片：

草稿确认
→ life_mutate attachPhoto=true
→ 有真实 bytes：canonical media path
→ 无 bytes：MEDIA_ATTACHMENT_REQUIRED
→ recovery.uploadUrl

browser recovery 完成前不能声称图片已保存。

详细照片规则：
→ [Meal Photo Storage](photo-storage.md)

## 11. Server-side vision

当前 server-side fallback recognizer 只要求模型识别：

- 可见食物名称；
- 可见份量描述；
- confidence。

它明确 **不要求视觉模型直接估算 kcal、克数或 macros**。

低于 confidence 0.6 的食物会被过滤。

因此“图片识别出了食物”不等于“营养值已经可靠生成”；营养仍由完整 Meal 草稿流程结合用户文字、视觉结果和可合理估算的信息处理。

## 12. 责任边界

模型：

- 理解用户意图；
- 读取可见图片 / 用户说明；
- 形成草稿；
- 维护当前对话是否已确认。

AI Access Core / service：

- normalization；
- signed actor；
- permission；
- schema；
- idempotency；
- target lookup；
- media；
- tool result。

Supabase：

- 只保存正式 canonical facts；
- 不保存聊天草稿状态。

## 13. Regression

修改此流程至少检查：

- 新 Meal 第一轮不直接落库；
- confirmed / estimated 语义正确；
- 主餐不重复；
- snack 不错误合并；
- append 保留 eatenAt；
- confirm estimated 保留 mealDate / eatenAt；
- 未知营养不伪造；
- media recovery 不重复 mutation；
- ownership / delete safety 保持服务端强制。

历史实机验收与开发过程放在 archive / CHANGELOG，不在当前 contract 重复维护。
