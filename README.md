# 伴岛 Beside

> 正式中文名：**伴岛**｜英文名：**Beside**｜日常称呼：**小岛**
>
> GitHub：`JIDAIN/beside`｜Vercel Project：`beside`
>
> Production：`https://couple-better-game.vercel.app`

伴岛是两个人共同使用的私人生活记录与陪伴 Web App。

**伴岛 / Beside 是当前唯一正式产品。**

```text
伴岛 / Beside
└─ 小窝
   └─ 游戏机
      └─ 变美变瘦大作战
```

「变美变瘦大作战」是伴岛最初的程序雏形，当前只作为游戏机中的一个小游戏保留；工程内部称 **Legacy Game**。

`Island Life` 只表示当前生活数据域 / 架构术语，不是正式产品名或子品牌。

`couple_better_game`、`couple-better-game` 等只在历史记录、兼容 slug、缓存 key、内部标识或既有 Production URL 中保留。

## 技术栈

- Next.js / React / TypeScript
- Vercel
- Supabase PostgreSQL / Storage
- Vitest
- `animal-island-ui` + 项目自己的 App* UI adapter

正式生活数据以 Supabase 为 Source of Truth；浏览器 cache / Service Worker 只做体验优化。

## 当前产品

当前功能、信息架构、入口与能力边界统一维护在：
→ [Product Overview](docs/product/overview.md)

当前 Production / GitHub main / Supabase 状态：
→ [Engineering Current State](docs/engineering/current-state.md)

## 文档入口

GitHub current docs 是伴岛当前工程事实库：

1. [Docs MOC](docs/README.md)
2. [Product MOC](docs/product/README.md)
3. [Architecture MOC](docs/architecture/README.md)
4. [Domains MOC](docs/domains/README.md)
5. [Engineering MOC](docs/engineering/README.md)

AI / 自动化修改仓库前必须先读：

- [AGENTS.md](AGENTS.md)
- `.agents/skills/beside-maintainer/SKILL.md`

尚未实现的产品设计、未来功能和 UI 方案属于 Obsidian「伴岛」项目，不应提前写成 GitHub current facts。

## 开发

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

代码进入 `main` 后 GitHub Actions 会执行对应 CI；**CI 通过不代表允许部署。**

仓库关闭 Git 自动部署。任何 Vercel Preview / Production deployment 都必须获得用户针对该次发布的明确授权。

## 主要目录

```text
app/                    Next.js pages / API routes / current CSS layers
components/life/        伴岛生活 UI
components/home/        Legacy Game UI
components/ui/          shared App* UI adapter / patterns
lib/life/               life domain client / service
lib/nutrition/          Meal / nutrition
lib/home/               Legacy Game domain
lib/server/             auth / AI / reminders / Supabase adapters
supabase/migrations/    database migration history
tests/                  automated tests
docs/                   canonical engineering docs
docs/archive/           historical implementation / acceptance records
```

具体业务或实现规则不要从本 README 推断，请从对应 MOC 进入 canonical document。
