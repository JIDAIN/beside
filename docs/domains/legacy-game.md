# Legacy Game Domain

“变美变瘦大作战”是伴岛当前游戏机中的小游戏。Legacy Game 是其工程称呼，不是当前产品正式名称。

## 1. Domain Boundary & Product Position

当前用户入口：小窝 → 游戏机。
主要桥接 UI：components/life/LifeGameMachinePage.tsx。
Legacy UI：components/home/*。

Life maintenance 默认不修改 Legacy Game 事实。

## 2. Current Entry / Compatibility Paths

当前存在：
- /nest/game-machine：伴岛游戏机入口；
- /game：旧游戏兼容入口；
- /api/home-data、/api/save-data、cloud-session：兼容同步。

compatibility identity 不等于 Life fixed-account auth。

## 3. Core Facts & Concepts

Legacy Game 主要概念：
- DailyRecord / daily side；
- deficit；
- exercise_minutes；
- daily reward；
- bonus；
- wallet；
- exchange；
- weekly stats；
- heatmap；
- success day。

事实与派生必须分开；历史编辑后派生结果需要重算。

## 4. Currency Semantics

项目历史上交换过金币/宝石内部命名。

当前用户可见语义：
- 每日打卡得到“金币”，历史内部字段可能仍叫 gems / bonus / wallet.coins；
- 周期规则得到“宝石”，历史内部字段可能仍叫 DailyRecord.coins / wallet.gems。

currency-semantics.ts 当前语义版本为 2。

禁止根据函数名 gemsFromDeficit / computeCoinPreview 直接猜用户可见币种。

## 5. Daily Settlement Flow

~~~text
daily inputs
→ per-person deficit reward
→ exercise reward
→ recovery reward
→ couple bonus
→ daily coin result
→ weekly gem trigger
→ wallet replay
→ stats / heatmap
~~~

## 6. Coin Rules

### Fish
deficit：
- <200 → 0
- 200–299 → +1
- 300–499 → +2
- >=500 → +4

exercise：只有当天 deficit >0 时，>=30min → +1。

### Cat
deficit：
- <100 → 0
- 100–199 → +1
- >=200 → +2

exercise：只有当天 deficit >0 时：
- <30 → 0
- 30–59 → +1
- >=60 → +2

### Recovery
今天该成员 deficit >0 且昨天 exercise_minutes >=30 → 今天额外 +1。
当前实现不要求今天不运动，因此可与今天运动奖励叠加。

### Couple Bonus
双方 deficit >0 且双方运动 >=30 → 共 +2 金币（双方各 +1 的业务含义），记录在 legacy bonus 字段。

## 7. Gem Rules

### Weekly coin threshold
本周金币首次跨过 30 → +1 宝石；
首次跨过 50 → 再 +1。

### Couple streak
双方达到 heatmap ok 下限：
Fish deficit >=200 且 Cat deficit >=100。
当前 streak days = 5；只在当前业务周内计算，首次达标 +1 宝石。

### Together exercise
同一天双方 exercise >=30 记一次“一起运动”。
当前业务周达到第 2 次 → +1 宝石。
该 gem trigger 当前不额外检查 deficit。

## 8. Wallet / Exchange

Coin wallet 按业务日期 replay：
daily gain → cap 50 → 当日 coin exchange → 不低于 0。

当前 coin wallet cap = 50。

Gem wallet 按周期宝石与 gem exchange 重算；当前没有与 coin 相同的 50 上限。

## 9. Business Week

当前 weekStartDay = 6，即 JavaScript 周六。

统一业务周：
周六 → 周五。

用于 weekly coin/gem、streak、一起运动次数、CSV 周次与 heatmap 行。

## 10. Heatmap / Success Metrics

Fish deficit level：
- <200 none
- 200–299 ok
- 300–499 good
- >=500 perfect

Cat：
- <100 none
- 100–199 ok
- 200–299 good
- >=300 perfect

exercise tag：
- 0 none
- 1–59 run
- >=60 intense

成功日：
Fish deficit >=200 AND Cat deficit >=100。

运动奖励阈值与 heatmap 运动角标阈值不是同一规则。

## 11. Historical Edit / Recompute

历史 daily record 改变后必须重建相关：
- 当日 reward；
- 周期宝石；
- wallet；
- weekly stats；
- success days；
- heatmap overrides。

不能只改 UI 展示。

## 12. Config Sources

当前规则配置主要来自：
- app_configs；
- lib/home/home-default-config.ts；
- lib/home/settlement-rules.ts。

Production 当前核验过 coin_week_start_day=6、coin_deficit_streak_days=5；今后以 current config/runtime 为准，而不是一次核验日期。

## 13. Life / Meal Boundary

必须保持：

~~~text
meal calories != game deficit
Life activity != game exercise
Life weight != game weight snapshot
Life backup/import != Legacy Game backup/import
~~~

任何自动连接都需要新产品规则设计，不能在 Meal/API 中顺手实现。

## 14. UI Integration Boundary

components/home/* 是当前 Legacy UI。
未来可以统一 Design System，但视觉统一不得改变 settlement / data semantics。

## 15. API / AI Compatibility Boundary

普通 Life AI resource 不写游戏。
legacy_home 是单独 compatibility resource；整体 replace 属于高风险操作，需要显式确认。

## 16. Implementation Anchors

- lib/home/daily-record-service.ts
- lib/home/settlement-rules.ts
- lib/home/home-state-service.ts
- lib/home/home-stat-service.ts
- lib/home/exchange-service.ts
- lib/home/currency-semantics.ts
- lib/home/import-service.ts
- lib/home/export-service.ts
- components/home/*
- components/life/LifeGameMachinePage.tsx

## 17. Regression Tests

至少关注 tests/home/* 中：
- settlement-rules
- daily-record-service
- home-stat-service
- home-state-service
- exchange-service
- data-import-export
- save-data-route
- sync-state-service

## 18. Change Impact

- deficit threshold → settlement + heatmap + stats + tests + 本文；
- week start → weekly rewards + heatmap/CSV + tests；
- currency semantics → labels + import/export + tests；
- wallet cap → replay + historical values + tests；
- UI only → Design System/UI，不改 settlement；
- Life integration → Product/Domain/ADR 重新设计。

## 19. Extension Rules

游戏机新增第二个小游戏时：
- 不塞进 Legacy Game；
- 新游戏复杂时建立自己的 Domain；
- Game Machine 只是 Product container；
- 视觉可以共享 Design System；
- settlement/data 默认不共享。
