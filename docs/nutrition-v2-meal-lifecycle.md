# Beside 饮食模块 V2 规则

## Meal 生命周期

Meal 表示一次完整饮食事件，一顿饭对应一个 Meal。

Meal 包含：
- mealType
- eatenAt
- status
- items

items 保存具体食物明细。

例如：
早餐：牛奶、面包、鸡蛋
应保存为一个早餐 Meal，而不是多个早餐记录。

## 餐次分类

MealType：
- breakfast 早餐
- lunch 午餐
- dinner 晚餐
- snack 加餐

SnackPeriod（仅 snack 使用）：
- morning 上午加餐
- afternoon 下午加餐
- night 晚上加餐

删除旧分类：
- other
- evening
- late_night

## 新建与补录

AI 首先判断用户意图：

用户明确补充、忘记记录、少记了、还有、加一个时，应优先定位已有 Meal 并追加 FoodItem。

例如：
已有早餐：牛奶、面包。
用户说：早餐补充鸡蛋。

结果：
同一个早餐 Meal 增加鸡蛋，保持原 eatenAt。

不要创建新的早餐记录。

## 饭前估算与饭后确认

第一次拍照估算：
- 创建 estimated Meal
- eatenAt 使用第一次记录时间

吃完后再次拍照：
- 更新同一个 Meal
- 更新实际摄入食物和热量
- status 改为 confirmed

不能用确认时间覆盖 eatenAt。

## 营养明细

正式保存必须包含：
- Food items
- 整餐营养汇总

不能只保存总热量。

## 当前实现

- canonical 类型已收敛为本文的 MealType、SnackPeriod 与 status；
- `life_mutate` 支持 `append_meal_item` 与 `confirm_estimated_meal`；
- 两种动作都按当前 OAuth 身份和餐食日期自动定位唯一目标，并保留原 eatenAt；
- 找不到目标或候选不唯一时返回澄清错误，不猜 UUID，也不自动新建；
- 历史分类与状态通过追加 migration 转换，不修改既有 migration。
