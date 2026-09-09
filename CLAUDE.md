# CLAUDE.md

本文件只作为 Claude Code / VSCode AI 的薄入口，不重复维护项目事实或 Skill 正文。

## 开始前

必须依次阅读：

1. `AGENTS.md`
2. `.agents/skills/couple-better-game-maintainer/SKILL.md`
3. `README.md`
4. `docs/README.md`
5. `docs/09-status-roadmap.md`
6. 当前任务对应的主文档和源码

如果这里与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准；项目专属 Skill 的正式正文只维护在 `.agents/skills/`。

## 当前项目提醒

- 项目已经有 Vercel API 和 Supabase，不要再按“纯前端、无数据库”假设工作。
- `localStorage` 是运行缓存，不是唯一云端真相来源。
- Island Life 与 Legacy Game 必须分域；饮食摄入、游戏 `deficit`、体重、运动/活动也必须分域。
- Supabase secret 只能服务端使用。
- 已退役同步/transport 不得从 archive 或旧 migration 恢复。
- 任何 V2 可见 UI 先读 `docs/12-island-life-design-system.md`；当前主导航是 `今日 / 饮食 / 日历 / 小窝 / 我的`。
- UI 优先维护项目已有 `components/ui/App*` / Pattern，不新造第二套视觉体系。
- 任何 Vercel Preview / Production 都必须得到该次明确授权。

## 完成任务后

用中文说明：

1. 修改摘要
2. 修改文件
3. 验证方式及结果
4. 未运行的检查及原因
5. 风险 / 未完成事项
6. 是否需要同步 `CHANGELOG.md` 和 `docs/09-status-roadmap.md`
