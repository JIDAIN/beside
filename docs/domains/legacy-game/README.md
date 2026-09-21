# Legacy Game MOC

**「变美变瘦大作战」是伴岛最初的程序雏形。** 随着产品范围扩展并重新定位为伴岛 / Beside，这套原游戏没有继续代表整个应用，而是被保留为当前「小窝 → 游戏机」中的一个小游戏。

`Legacy Game` 是工程内部对这套旧游戏数据、规则和兼容代码的称呼，不是新的用户品牌。伴岛 / Beside 才是当前唯一正式产品。

## 文档

- [Business Rules](business-rules.md)：金币 / 宝石、deficit、结算、钱包、热力图与历史回算。

## 强制边界

Legacy Game 不是 Island Life。普通生活记录、清理、导入和恢复不得顺手修改游戏数据。

详细数据隔离：
→ [Life / Legacy Boundary](../../architecture/life-legacy-boundary.md)

## AI 最小阅读路径

修改旧游戏前先读 `business-rules.md`，再核 `lib/home/` 当前实现和 Production `app_configs`。涉及 Life 数据时必须同时读 [Life / Legacy Boundary](../../architecture/life-legacy-boundary.md)。

核心代码入口：

- `lib/home/settlement-rules.ts`
- `lib/home/home-stat-service.ts`
- `lib/home/home-state-service.ts`
- `components/home/`

## 修改时同步检查

金币 / 宝石、deficit、业务周、钱包、heatmap、历史回算任何一个变化，都要同步检查其他派生统计；不能只改 UI 展示字段，也不能把 Meal intake 自动写进游戏 deficit。
