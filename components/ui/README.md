# UI adapter boundary

`components/ui` 是伴岛面向业务代码的共享 UI adapter / pattern 层。

设计系统总原则与当前视觉 baseline：
→ `docs/product/design-system.md`

## 长期分层

```text
Design Tokens
↓
App* UI Adapter / Primitive
↓
Shared Patterns
↓
Domain Components
↓
Pages
```

## Rules

1. 业务页面优先使用已有 `App*` / shared pattern，而不是直接导入第三方完整视觉组件。
2. `animal-island-ui` 可以升级、替换或补充，但外部视觉 API 应先在本层归一。
3. 外部 GitHub UI 可以贡献 interaction / state / layout 思路，但不得把另一套颜色、阴影、Button/Card 体系直接扩散进业务页面。
4. 当前页面优先使用 `--life-*` token；未来全站重构如替换 token，应从统一 token source 迁移，而不是按页面建立新色板。
5. Life/domain-specific presentation 先留在对应领域；跨领域且稳定后再提升到 `components/ui`。
6. `/ui-lab` 只用于假数据 / 视觉状态，不写 Production facts，不触发 Legacy Game settlement。
7. shared component 负责 interaction + presentation contract，不承载数据库事实或业务权限的唯一判断。
8. 新视觉重构优先修改本层与 token，不把新增全局 override stylesheet 作为默认长期方案。

## Current shared patterns

```text
AppPageShell       page shell / title hierarchy
AppRoleSwitch      shared 我 / Ta switch
AppRecordRow       compact factual record row
AppFeatureTile     secondary feature entry
AppNutritionBar    nutrition summary
AppButton          shared action
AppInput           shared input
AppSelect          shared select
AppDialog          shared dialog
MealPhotoFrame     meal photo presentation
```

这份列表是当前实现快照，可以随统一 UI 重构演进。

## Current token source

```text
app/island-life-tokens.css
```

当前代码仍存在 `island-life-refactor.css`、`r8-*.css`、`food-compact.css` 等历史 visual adapter / override。它们是现状，不是目标分层。

未来系统级 UI 重构应逐步把稳定规则收敛回 token + App* + shared patterns，并在视觉回归后删除被替代的历史 override。

## Legacy Game

「变美变瘦大作战」当前仍有自己的 legacy UI 实现，这是历史现状，不代表它永久排除在伴岛统一 UI 体系之外。

如果未来进行“伴岛全站 UI 统一”：

- 可以把 /game 作为明确迁移对象；
- 视觉层逐步接入统一 token / App* / pattern；
- 但不得借 UI 重构改变 Legacy Game 的数据、奖励、结算和权限语义。

## Future component rule

新增视觉组件前按顺序判断：

```text
existing App*
→ existing shared pattern
→ mature external/headless capability
→ domain-local component
→ proven reusable pattern graduates to components/ui
```

不要因为单个页面需要一次样式就提前制造新的全局 primitive。
