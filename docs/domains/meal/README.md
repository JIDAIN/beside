# Meal MOC

伴岛饮食系统的工程文档入口。

## 文档

- [Lifecycle](lifecycle.md)：MealType、SnackPeriod、estimated / confirmed、主餐唯一、常吃食物。
- [Photo Storage](photo-storage.md)：单图持久化、压缩、旋转缩放、Storage 和 Photo API 边界。
- [AI Contract](ai-contract.md)：聊天草稿、单图直接记录、餐前估算与餐后确认。

## 相关事实

- 表 / RPC → [Data Model](../../architecture/data-model.md)
- API / cache → [API and Sync](../../architecture/api-and-sync.md)
- AI Access Core → [AI MOC](../../architecture/ai/README.md)
- UI → [Product UI Guidelines](../../product/ui-guidelines.md)
- 故障排查 → [Operations Runbook](../../engineering/operations-runbook.md)

修改 Meal 时不要把 intake 与 Legacy Game deficit、weight 或 activity 自动混写。

## AI 最小阅读路径

```text
Lifecycle
→ 按任务追加 Photo Storage / AI Contract
→ Data Model（涉及 schema 时）
→ 对应源码
```

核心代码入口：

- `lib/nutrition/meal-service.ts`
- `lib/nutrition/meal-v2-types.ts`
- `lib/server/supabase-nutrition.ts`
- `components/life/LifeMealEditorPage.tsx`
- `lib/server/life-agent-registry.ts`

## 修改时同步检查

| 变化 | 必查 |
|---|---|
| meal type / status / unique slot | Lifecycle + Data Model + migration |
| 食物 item / nutrition | Lifecycle + parser + tests |
| 图片压缩 / Storage / transform | Photo Storage + photo API + media tests |
| AI 草稿 / estimated / append / confirm | AI Contract + registry / normalizer + tests |
| UI 编辑流程 | UI Guidelines + Meal editor |

不要从 Product Overview 复制一份 Meal 规则作为第二事实源。
