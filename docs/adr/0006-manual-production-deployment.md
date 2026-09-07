# ADR-0006 Git 自动部署关闭，Preview / Production 逐次授权

- Status: Accepted
- Date: 2026-09-07

## Context

该项目承载两个人的真实生活数据，并直接连接 Production Supabase、MCP、AI 和微信提醒。普通 Git push 如果自动触发 Vercel 部署，会把“提交代码”与“发布真实系统”绑定在一起，增加误发布、未验收 UI 和未经确认配置变更的风险。

## Decision

仓库长期保持：

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

Git 提交、PR、merge 与 Production 发布分离。

任何 Vercel Preview 或 Production deployment 都需要用户针对**本次部署**的明确授权。一次授权不成为未来部署的长期授权。

## Consequences

优点：

- 文档、代码和 CI 可以持续提交而不意外上线；
- 发布动作有明确人为控制点；
- 涉及真实数据、migration、环境变量和 UI 验收时更安全。

代价 / 约束：

- 通过 CI 不等于已经上线；
- 每次需要真实 Preview / Production 时都多一个显式发布步骤；
- `09-status-roadmap.md` 必须区分“main 已完成”和“Production 已上线”；
- 任何自动化维护工具都不得把过去的部署授权视为仍然有效。

## Related

- `vercel.json`
- `AGENTS.md`
- `docs/08-deployment-security.md`
- `docs/09-status-roadmap.md`
- `docs/16-operations-runbook.md`
