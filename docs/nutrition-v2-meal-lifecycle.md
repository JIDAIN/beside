# Beside 饮食模块 V2 规则

状态：2026-09-11。

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

数据库 canonical MealType：
- breakfast 早餐
- lunch 午餐
- dinner 晚餐
- snack 加餐

SnackPeriod（仅 snack 使用）：
- morning 上午加餐
- afternoon 下午加餐
- night 晚上加餐

编辑 UI 统一只显示六个用户可见槽位：

```text
早餐
上午加餐
午餐
下午加餐
晚餐
晚上加餐
```

其中三个加餐槽只做前端映射，数据库仍保存 `meal_type=snack` 与对应 `snack_period`。本次 UI 压缩没有修改 Meal V2 的餐次数据结构。

删除旧分类：
- other
- evening
- late_night

## 新增 / 编辑页面

新增和编辑共用 `LifeMealEditorPage`。主页面结构保持为：

```text
标题
日期 · 时间 + 餐次（紧凑入口）
餐食照片
营养合计
食物摘要列表
备注
保存
```

日期、时间和餐次在紧凑弹层中编辑，不再在主页面占用四个大输入区。加餐从饮食页仍先选择上午 / 下午 / 晚上，进入编辑页后预选，对应餐次仍可再次修改。

食物主列表只显示名称、份量和热量摘要；新增 / 编辑 / 删除食物全部在当前餐食页面的弹层完成。三大营养素默认折叠。

照片仍保留上传、替换、删除、旋转、缩放和服务端压缩流程。餐食主体先写入，照片失败时保留已成功保存的 Meal，并允许重试照片，不回滚餐食数据。

## 常吃食物

`favorite_food_templates` 保存 Cat / Fish 各自维护的常吃食物模板：

```text
name
portion_description
calories_kcal
carbs_g
protein_g
fat_g
```

模板只用于复用默认值，不属于某一天的餐食，也不与 `meal_items` 建立外键或持续引用。

从“常吃食物”加入当前餐食时执行：

```text
读取模板
→ 复制字段
→ 创建当前编辑器中的独立食物草稿
→ 保存为普通 meal_items
```

因此：
- 修改本次餐食里的食物，不修改模板；
- 以后修改模板，不修改历史餐食；
- 删除模板，不删除已经加入过的 meal_items；
- 搜索只针对当前登录用户自己的模板；
- 模板 API 继续使用固定身份授权，Cat / Fish 不能互相管理。

常吃食物管理入口位于饮食页顶部 `/food/favorites`，只提供新增、编辑、删除和搜索使用所需的模板字段，不引入最近食物、推荐、食品库或分类层。

## 新建与补录

AI 首先判断用户意图：

用户明确补充、忘记记录、少记了、还有、加一个时，应优先定位已有 Meal 并追加 FoodItem。

例如：
已有早餐：牛奶、面包。
用户说：早餐补充鸡蛋。

结果：
同一个早餐 Meal 增加鸡蛋，保持原 eatenAt。

不要创建新的早餐记录。

常吃食物是前端复用模板，不改变 AI / MCP 的 canonical 饮食入口；AI 仍直接创建或更新 `meals + meal_items`，不会依赖模板存在。

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

编辑器压缩 UI 后仍保留已有 AI item 的 `foodId`、实际/估算重量、热量区间与三大营养素。未触碰估算相关字段时，原有 meal-level AI 热量区间继续保留。

## 当前实现

- canonical 类型已收敛为本文的 MealType、SnackPeriod 与 status；
- 六槽 UI 只做前端映射，没有修改 Meal V2 schema；
- 常吃食物使用独立 `favorite_food_templates`，通过 API 按当前登录身份隔离；
- 模板加入餐食时只复制数值到普通 meal item，不留模板引用；
- `life_mutate` 支持 `append_meal_item` 与 `confirm_estimated_meal`；
- 两种动作都按当前 OAuth 身份和餐食日期自动定位唯一目标，并保留原 eatenAt；
- 找不到目标或候选不唯一时返回澄清错误，不猜 UUID，也不自动新建；
- 历史分类与状态通过追加 migration 转换，不修改既有 migration；
- 月度回顾继续消费 canonical meal 数据，不读取常吃模板，所以模板增删改不会污染历史统计。
