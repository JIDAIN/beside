# Reminder MOC

伴岛提醒系统的工程文档入口。

## 文档

- [Reminder Overview](overview.md)：Reminder Center、规则/实例、pg_cron、微信测试号、PushPlus fallback、幂等与 snooze。
- [Notification Tone](notification-tone.md)：团子通知称呼、语气和用户可见文案边界。

## 相关事实

- Reminder 数据表 → [Data Model](../../architecture/data-model.md)
- 身份 → [Auth and Identity](../../architecture/auth-and-identity.md)
- Production 故障 → [Operations Runbook](../../engineering/operations-runbook.md)

业务提醒条件与通知 Provider 必须保持解耦。
