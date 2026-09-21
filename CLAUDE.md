# CLAUDE.md

本文件只作为 Claude Code / VSCode AI 的**薄入口**，不维护项目事实、业务规则或 Skill 正文。

## 开始前

依次阅读：

1. `AGENTS.md`
2. `.agents/skills/beside-maintainer/SKILL.md`
3. `README.md`
4. `docs/README.md`
5. `docs/engineering/current-state.md`
6. 当前任务对应 MOC、canonical contract 与真实源码

如果这里与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准；项目专属 Skill 的正式正文只维护在 `.agents/skills/`。

不要在本文件复制当前主导航、色板、Meal / Reminder / Legacy Game 规则、Production 状态或环境变量清单；这些内容都应从 canonical docs 读取。

## 执行

- 按 `AGENTS.md` 和 canonical Skill 的工作流执行；
- 不从 `docs/archive/`、旧聊天或历史 migration 注释推断 current behavior；
- UI / 数据 / AI / Domain 任务分别从对应 MOC 进入；
- 任何 Vercel Preview / Production deployment 都必须得到该次明确授权。

## 完成任务后

用中文说明：

1. 修改摘要；
2. 修改文件；
3. 验证方式及结果；
4. 未运行的检查及原因；
5. 风险 / 未完成事项；
6. 是否同步了需要更新的 canonical docs / CHANGELOG / Current State；
7. 是否发生部署；若没有，明确说明未部署。
