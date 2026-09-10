# Meal Draft Confirmation + Before/After Photo Difference Contract

状态：2026-09-07 当前有效 contract。

## 1. Goal

新 meal 不能从一张图片或粗略描述直接跳到持久化数据。AI 必须先根据**实际摄入**生成可检查的草稿，用户修改或确认后，再调用正式写入。

关键边界：

```text
草稿 / 确认状态 = 对话层交互状态
正式 meal       = Supabase 持久化事实
```

当前**没有** `meal_drafts` 后台表，也**没有**服务端通过“确认 / 可以 / 好的”等关键词判断 meal create 是否允许执行的 confirmation guard。

服务端仍然负责真正的安全边界：身份、ownership、schema、幂等、删除、高风险覆盖、媒体绑定等。

## 2. Interaction flow

```text
1. 用户提供文字 / 图片
2. AI 判断实际摄入并生成 draft
3. AI 展示食物、份量和营养估算
4. 用户修改，或明确确认当前草稿
5. 确认后 AI 调用 life_mutate create meal
6. canonical service 校验并正式写入
7. 返回真实 tool result / read-back
```

用户第一句说“帮我记录 / 记一下 / 保存这顿饭”，表示**最终想记录**，但不等于已经确认尚未展示的营养草稿。

如果草稿已经确认，而正式写入因网络或临时 transport 问题失败，用户说“再试一次”时，AI 可以重试同一份已确认草稿，不需要强迫用户重复确认。

## 3. One-photo mode

单张照片不自动等于“等待饭后确认”。先看用户的明确意图：

- 只有一张餐前照片，用户说“记录这顿饭”“记录这个饭的热量”“按图中全部记录”等，表示要把图中整份餐食作为完整摄入量记录；生成整份营养草稿，用户确认后直接创建 `status=confirmed` 的 Meal，不等待第二张照片，也不做差值计算；
- 用户明确说“还没吃”“先估一下”“饭后再确认”等，才创建 `status=estimated` 的 Meal，保留饭后确认流程；
- 用户说明已经吃了一部分时，根据实际说明估算。

实际摄入说明例如：

- `基本都吃完了`
- `吃了一半`
- `只吃了几口`
- `这个没吃`
- `后来又添了一点`

除“明确按单张餐前图整份记录”外，草稿统计的是用户实际吃下去的量，不机械等于餐前摆盘总量。

## 4. Two-photo before/after mode

餐前 + 餐后两张图片时：

```text
actual intake = estimated amount before - edible amount remaining after
```

规则：

- 按食物种类和上下文匹配，不按固定盘中位置死配；
- 用户明确文字优先于纯视觉差分；
- 骨头、果皮、果核、壳、包装等不可食残余不能作为可食剩余机械扣减；
- 要考虑翻面、移动、汤汁、餐后照片不完整、中途添饭等不确定性；
- 多人共享菜有用户个人份额说明时，以文字说明为准。

饭后确认替换为实际摄入明细时，旧的饭前总热量和区间不得沿用；如果本次没有显式提供新总量，应从新的 items 重新汇总，无法汇总则保存为未知。

## 5. Draft fields

能合理判断时，每项尽量包含：

- `rawName` / `displayName`
- `portionDescription`
- `estimatedWeightG`
- `caloriesKcal`
- `proteinG`
- `carbsG`
- `fatG`

整餐尽量包含：

- `totalCaloriesKcal`
- 总 protein
- 总 carbs
- 总 fat

这些数字是合理估算，不是实验室测量。真正未知的值允许为空 / `null`，不要为了“完整”制造虚假精度。

## 6. Confirmation semantics

“确认”属于 AI 与用户当前对话的语义，不属于数据库状态，也不是 API payload 中必须存在的确认字段。

用户在看到当前草稿后说，例如：

```text
确认记录
没问题
可以
就这样
按这个记
记进去
```

AI 可以把它理解为对当前草稿的确认，并执行正式 `life_mutate`。

但服务端不会通过扫描当前 `userText` 是否包含这些短语来决定 create meal 能不能执行。因此：

- 模型 / Project Instructions / `MEAL_DRAFT_AGENT_RULES` 必须遵守交互流程；
- 服务端不能把对话状态重新实现成脆弱的关键词状态机；
- 如果某个可信程序内部流程直接调用 canonical meal create，服务端仍按 schema / permission / idempotency 等正式规则处理。

## 7. Existing meal updates / deletes

草稿确认流程只针对**新 meal creation**。

已经持久化的 meal：

- 用户明确要求 update 时，按 ID / ownership / validation 正常更新；
- 用户明确要求 delete 时，按删除意图 + ID / ownership 安全规则处理；
- 不因为只是修改时间、备注、照片显示等无关信息，就重新要求生成整顿饭草稿。

## 8. Photo persistence

如果用户还要求正式保存图片：

```text
草稿确认
→ life_mutate attachPhoto=true
→ 有真实附件：直接进入 canonical media path
→ 无附件字节：MEDIA_ATTACHMENT_REQUIRED
→ recovery.uploadUrl
→ 浏览器补传
```

当前一条正式 meal 只绑定 1 张展示照片：

- 餐前 / 餐后多图都可参与分析；
- 未特别指定时默认保存餐前图；
- 用户明确要求时可保存餐后图；
- 不能声称同一个 meal 已永久保存两张图；
- browser recovery 未完成前不能声称照片已保存。

## 9. Architecture responsibility

### AI / model

负责：

- 识别图片和用户文字；
- 判断实际摄入；
- 生成和修改草稿；
- 维护当前对话里的“这份草稿是否已被确认”的语义；
- 确认后再调用正式写入。

### AI Access Core / canonical services

负责：

- normalization / strict schema；
- signed actor / ownership；
- idempotency；
- domain write；
- media boundary；
- tool result / read-back；
- 删除和其他高风险规则。

不负责：

```text
通过当前一句 userText 的“确认关键词”模拟聊天状态机
```

### Supabase

只保存已经正式提交的 canonical meal facts，不保存聊天草稿或草稿确认状态。

## 10. 2026-09-07 实机验收

餐前 / 餐后 AI 流程已经由真实使用确认通过：

```text
餐前照片 + 餐后照片
→ AI 根据差分与用户文字判断实际摄入
→ 生成可检查的 meal 草稿
→ kcal / protein / carbs / fat 等营养估算呈现
→ 用户确认
→ 正式写入 meal
→ 网页正常读取并显示
```

当前结论：

- 两张图片可正常用于实际摄入判断；
- 用户明确文字优先于视觉差分；
- 草稿 → 用户确认 → 正式写入流程符合预期；
- 实际使用中未发现阻塞性问题；
- 本项视为 **已验收 ✅**。

这项验收只证明“多图参与 AI 分析”的流程可用，不改变当前“一条正式 meal 只持久化 1 张展示照片”的数据模型边界。

## 11. Regression requirements

未来修改 meal AI 流程时至少检查：

```text
[ ] 第一轮新 meal 不被模型直接落库
[ ] 草稿修改后重新展示，不边改边写
[ ] 已确认写入失败后可重试同一草稿
[ ] 服务端没有重新引入确认关键词守卫
[ ] ownership / idempotency / delete 安全仍由服务端强制
[ ] 多图分析没有被误写成多图持久化
[ ] 未完成 media recovery 时不宣称照片已保存
```
