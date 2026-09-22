# 伴岛 Beside

> 正式中文名：伴岛｜English：Beside｜日常称呼：小岛
>
> GitHub：JIDAIN/beside｜Vercel Project：beside
>
> Production：https://couple-better-game.vercel.app

伴岛是两个人共同使用的私人生活记录与陪伴 Web App。

伴岛 / Beside 是当前唯一正式产品。

“变美变瘦大作战”是伴岛最初程序雏形，当前保留在“小窝 → 游戏机”中；工程内部称 Legacy Game。

Island Life 只表示生活数据域 / 历史工程术语。couple-better-game / couple_better_game 只在兼容 URL、slug、key 与历史记录中保留。

## 技术栈

- Next.js / React / TypeScript
- Vercel
- Supabase PostgreSQL / Private Storage
- Vitest
- animal-island-ui + App* UI adapter

Supabase 是正式数据 Source of Truth；browser cache / Service Worker 只做体验优化。

## Current Product

当前能力、信息架构与入口：
→ docs/product/overview.md

Production / GitHub main / Supabase 当前差异：
→ docs/engineering/current-state.md

## Docs

1. docs/README.md
2. docs/product/README.md
3. docs/architecture/README.md
4. docs/domains/README.md
5. docs/engineering/README.md
6. docs/history/README.md

AI/自动化修改仓库前必须先读：
- AGENTS.md
- .agents/skills/beside-maintainer/SKILL.md

## Development

~~~bash
npm install
npm run dev
npm run test
npm run lint
npm run build
~~~

GitHub Actions CI success != deployment authorization。

仓库关闭 Git 自动部署。任何 Vercel Preview / Production 都必须取得用户针对该次部署的明确授权。

## Current Code Map

~~~text
app/                    Next.js routes/pages/current CSS layers
components/life/        Beside Life UI
components/home/        Legacy Game UI
components/ui/          shared App* UI
lib/life/               Life contracts/helpers
lib/nutrition/          Meal
lib/home/               Legacy Game
lib/ai/                 AI normalization helpers
lib/server/             auth/AI/reminder/Supabase adapters
supabase/migrations/    database migration history
tests/                  automated tests
docs/                   canonical current docs + history
~~~

详细业务/工程规则请从 docs MOC 进入，不从根 README 推断。
