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

## AI 最小阅读路径

```text
overview.md
→ 涉及用户文案时再读 notification-tone.md
→ 核 scheduler / dispatcher / Production runtime
```

核心代码入口：

- `components/life/LifeReminderCenterPage.tsx`
- `lib/life/reminder-client.ts`
- `lib/server/life-reminder-center.ts`
- `lib/server/life-wechat-reminders.ts`
- 对应 `supabase/migrations/`

## 修改时同步检查

- reminder source / status / snooze / dedupe → `overview.md`；
- provider 路由或 cron → `overview.md` + Operations Runbook；
- 团子用户可见通知措辞 → `notification-tone.md`；
- 表 / constraint → Data Model；
- 不要把 daily_record 特殊路径误写成 Reminder Center instance。
