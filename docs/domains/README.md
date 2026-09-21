# Domains MOC

本区域维护**具体业务领域的当前 contract**。

只有当一个领域拥有多份需要长期独立维护的文档时才建立子目录，避免再次碎片化。

## 当前子领域

- [Meal](meal/README.md)：饮食、营养、照片和 AI 餐食确认。
- [Reminders](reminders/README.md)：Reminder Engine、通知投递与团子提醒文案。
- [Legacy Game](legacy-game/README.md)：伴岛最初程序雏形「变美变瘦大作战」现作为游戏机小游戏保留；这里维护其金币、宝石、结算和热力图规则。

心情、睡眠、活动、体重、药箱、小信箱等当前较简单领域，其用户能力先由 [Product Overview](../product/overview.md) 描述，数据结构由 [Data Model](../architecture/data-model.md) 描述；只有出现多份长期 contract 时再升级为独立 domain 文件夹。

## AI 处理具体业务时

先判断它属于：

1. 已有复杂 Domain：Meal / Reminder / Legacy Game → 进入子 MOC；
2. 当前简单 Domain：mood / sleep / activity / weight / medicine / mailbox / settings → 先读 Product Overview + Data Model + Auth，再核对应 service / component；
3. 跨领域机制 → 回 Architecture。

简单 Domain 不是“没有 contract”，而是当前规则量不足以单独拆目录；其业务事实必须能在 Product / Data Model / Auth / 源码中完整定位。

## 何时升级为独立 Domain 文件夹

同一功能出现 2～3 份以上长期独立 contract，或开始拥有复杂 lifecycle、provider、AI 特殊流程时，再建立子 MOC。不要为了“一功能一文件夹”提前碎片化。
