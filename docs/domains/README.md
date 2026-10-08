# Domains MOC

本区域维护具体业务领域的 current contract。

Domain 不是代码文件夹的同义词。简单功能可以由 Product + Data Model + Auth 完整描述；只有出现独立长期 lifecycle / provider / media / AI 特殊流程等复杂度时才升级成独立 Domain 文档。

## 1. Domain Registry

本表是导航索引，不重新定义权限或业务细节。

| Domain | Level | Ownership | Product area | Canonical contract | Current implementation anchor | AI | Reminder |
|---|---|---|---|---|---|---|---|
| mood | simple | personal | Today/Calendar | [Data Model](../architecture/data-model.md) + [Auth](../architecture/auth-and-identity.md) | lib/life/life-service.ts | query/upsert/delete | completeness input |
| sleep | simple | personal | Today/Calendar | [Data Model](../architecture/data-model.md) + [Auth](../architecture/auth-and-identity.md) | lib/life/life-service.ts | query/upsert | completeness input |
| activity | simple | personal/shared | Today | [Data Model](../architecture/data-model.md) + [Auth](../architecture/auth-and-identity.md) | lib/life/life-service.ts | CRUD | context |
| weight | simple | personal | Nest | [Data Model](../architecture/data-model.md) + [Auth](../architecture/auth-and-identity.md) | lib/life/weight-service.ts | CRUD | no |
| medicine | simple | shared | Nest | [Data Model](../architecture/data-model.md) + [Auth](../architecture/auth-and-identity.md) | lib/life/medicine-service.ts | CRUD | Stateful source |
| mailbox | simple lifecycle-sensitive | sender/recipient | Nest | [Data Model](../architecture/data-model.md) + [Auth](../architecture/auth-and-identity.md) + [UI](../product/ui-guidelines.md) | lib/life/mailbox-service.ts | draft/send | Stateful source |
| settings | simple mixed | shared/personal | Nest/Me | [Data Model](../architecture/data-model.md) + [Auth](../architecture/auth-and-identity.md) | lib/life/settings-service.ts | update | config input |
| Meal | complex | personal | Food | [Meal MOC](meal/README.md) | lib/nutrition/* | rich | no direct |
| Reminder | complex/system | actor/system | Me | [Reminder Domain](reminders.md) | reminder client/server + DB funcs | limited | self |
| Legacy Game | complex/legacy | game-specific | Game Machine | [Legacy Game Domain](legacy-game.md) | lib/home/* | legacy_home | separate |

详细权限始终以 [Auth & Identity](../architecture/auth-and-identity.md) 为准，当前入口以 [Product Overview](../product/overview.md) 为准。

## 2. Complex Domains

- [Meal](meal/README.md)：多 contract，保留子目录。
- [Reminder](reminders.md)：单文件复杂 Domain，覆盖 generation/state/delivery/provider。
- [Legacy Game](legacy-game.md)：单文件复杂 Domain，覆盖 settlement/currency/wallet/heatmap 等。

## 3. Simple Domains

mood、sleep、activity、weight、medicine、mailbox、settings 当前不单独建目录。

简单不等于没有 contract：它们的 data fact 在 [Data Model](../architecture/data-model.md)，ownership 在 [Auth](../architecture/auth-and-identity.md)，用户交互在 [Product/UI](../product/README.md)，AI normalization 在 [AI](../architecture/ai/README.md)。

## 4. Domain Upgrade Rule

出现以下任意两项，或单项已经高复杂度时，应考虑升级独立 Domain：
- 独立 lifecycle/state machine；
- 独立 media contract；
- provider/channel；
- AI 特殊流程；
- 多类 source；
- 复杂权限；
- 多条长期独立测试边界；
- 独立运维/恢复逻辑。

升级步骤：
1. 建 canonical Domain；
2. 从 Data Model/UI/AI 中抽回重复业务 semantics；
3. 保留跨域机制链接；
4. 更新 Domain Registry；
5. 不改变 Product/Architecture/Engineering 一级结构。

## 5. New Domain Intake Checklist

~~~text
它是什么事实？
personal/shared/system/legacy？
owner / visibility 是什么？
是否需要新表？
canonical service 在哪？
Web 是否需要 API？
AI 是否接入？
Reminder 是否接入？
backup/import 是否包含？
是否已经复杂到需要独立 Domain？
测试在哪里？
~~~

## 6. Refactor Rule

如果 lib/life / components/life 未来移动到 features/*：
- 更新 Architecture current implementation map；
- 更新本表 current implementation anchor；
- Domain identity 不变；
- 不因为文件夹改名制造新 Domain。