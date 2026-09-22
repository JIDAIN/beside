# Meal MOC

伴岛 Meal 复杂 Domain 的统一入口。

## 1. Domain Boundary

Meal 维护正式饮食事实、food items、营养、餐次、状态、常吃食物复制语义与正式照片边界。

Meal 不自动写：
- Legacy Game deficit/reward；
- Life activity；
- weight。

## 2. Contract Map

- Lifecycle：持久化业务 lifecycle、类型、主餐唯一、snack、多事件、favorite template。
- Photo Storage：一张正式 photo 的 server-side media persistence。
- AI Contract：聊天草稿、单图/前后图、estimated/confirmed orchestration。

## 3. Current Product / Data Position

Product 入口：/food。
正式事实：meals + meal_items；favorite_food_templates 是复用模板，不是历史 item 的 live reference。

## 4. Change Routing

| Change | Canonical docs |
|---|---|
| meal type/status/main slot | Lifecycle + Data Model |
| item/nutrition semantics | Lifecycle |
| favorite template | Lifecycle + Data Model/Auth |
| photo compression/storage | Photo Storage |
| photo visual frame | Design System/UI |
| AI new-meal draft | AI Contract |
| append/confirm AI behavior | AI Contract + Lifecycle |
| schema/RPC | Data Model + migration |
| ownership | Auth |
| cache/API | API & Sync |
| editor interaction | UI Guidelines |

## 5. Implementation Anchors

- lib/nutrition/*
- lib/server/supabase-nutrition.ts
- lib/server/supabase-favorite-foods.ts
- app/api/meals/**
- app/api/favorite-foods/**
- components/life/LifeFoodPage.tsx
- components/life/LifeMealEditorPage.tsx
- components/life/MealPhotoFrame.tsx
- lib/ai/meal-draft-contract.ts
- life-agent registry/executor

## 6. Regression Routing

- tests/nutrition/*
- tests/ai/*
- relevant tests/server/*
- relevant tests/client/*
- UI visual/manual acceptance

完整变更测试路由见 Engineering / Development & Testing。

## 7. Cross-domain Boundaries

~~~text
Meal calories != Legacy Game deficit
Meal photo != arbitrary public storage
Meal owner != UI selected role
chat draft != database draft
~~~

## 8. Maintenance Rules

只在对应 contract 改变时修改子文档；不要从 Product Overview 复制第二份 Meal 规则。
