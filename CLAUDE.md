# CLAUDE.md

本文件只作为 Claude Code / VSCode AI 的薄入口，不维护项目事实、业务规则或 Skill 正文。

## Start

依次阅读：
1. AGENTS.md
2. .agents/skills/beside-maintainer/SKILL.md
3. README.md
4. docs/README.md
5. docs/engineering/current-state.md
6. task MOC / canonical contract / current source

如与 AGENTS.md 冲突，以 AGENTS.md 为准。

不要在本文件复制导航、色板、Meal/Reminder/Legacy 规则、Production 状态或 env 清单。

## Execute

- 按 AGENTS + canonical Skill 工作流执行；
- 不从 docs/history、旧聊天或历史 migration 注释推断 current behavior；
- UI/Data/AI/Domain 从对应 MOC 进入；
- 任何 Vercel Preview/Production 都需要本次明确授权；
- Production Supabase 写入也需要对应明确授权。

## Report

完成后用中文说明：
1. 修改摘要；
2. 修改文件；
3. 验证方式及结果；
4. 未运行检查及原因；
5. 风险/未完成事项；
6. canonical docs / History 是否同步；
7. 是否部署；未部署时明确说明。
