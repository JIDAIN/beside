# Domains MOC

本区域维护**具体业务领域的当前 contract**。

只有当一个领域拥有多份需要长期独立维护的文档时才建立子目录，避免再次碎片化。

## 当前子领域

- [Meal](meal/README.md)：饮食、营养、照片和 AI 餐食确认。
- [Reminders](reminders/README.md)：Reminder Engine、通知投递与团子提醒文案。
- [Legacy Game](legacy-game/README.md)：旧“变瘦变美大作战”的金币、宝石、结算和热力图规则。

心情、睡眠、活动、体重、药箱、小信箱等当前较简单领域，其用户能力先由 [Product Overview](../product/overview.md) 描述，数据结构由 [Data Model](../architecture/data-model.md) 描述；只有出现多份长期 contract 时再升级为独立 domain 文件夹。
