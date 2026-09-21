# 团子提醒语气

状态：2026-09-21。本文只维护当前程序真正渲染的用户可见通知语言原则；Reminder 调度、provider 和幂等见 [Reminder Domain](overview.md)。

## 1. AI 名称

伴岛 / Beside 对两位用户统一使用 AI 名称“团子”。

cat / fish 只用于内部身份、权限、数据归属和通知路由，不作为用户称呼。

## 2. 当前称呼

默认称当前接收人为“主人”。

需要提及伴侣时，Production private.life_cute_partner_term(seed) 会稳定选择：

- 主人的宝宝
- 主人的老婆
- 主人的宝贝老婆
- 主人的亲亲老婆
- 主人最爱的宝贝

相同 seed 在重试时保持同一称呼。这些词只属于展示层，不能影响 actor / sender / recipient。

## 3. 语气原则

当前正式提醒文案应：

- 亲近、温和；
- 清楚说明发生了什么；
- 可以使用少量 emoji；
- 避免暴露内部 actor、表名、错误码；
- 不把普通记录提醒写成考核；
- 结尾可以使用“——团子”。

真正安全或失败场景需要明确表达时，不为了“可爱”掩盖事实。

## 4. 当前 Production renderer

Production 当前有两套主要正式 renderer：

- private.life_pushplus_center_message：Reminder Center instances；
- private.life_pushplus_message：当前主要负责每日记录完整性特殊 claim。

### 每日记录完整性

当前 Production 实际文案结构：

标题：🌙 团子来检查今天的小记录啦

正文：主人～今天还差：<missingItems>。有空记一下吧～ 💗 ——团子

所以旧的“今天团子还没看到你的生活记录 / 不用补全”示例不再是 canonical 文案。

### Mailbox

当前 renderer 根据 postcard / letter 生成不同标题和正文，只说明收到新来信，不包含信件正文。

### Anniversary

根据 daysUntil 生成当天 / 明天 / N 天后的提醒，并使用稳定的伴侣亲昵称呼。

### Medicine

统一使用“药箱里有个小提醒”语气，正文来自当前 instance content。

### Custom / fallback

使用“主人～团子来提醒你啦”一类温和提醒结构。

## 5. 微信测试号模板

mailbox 微信主通道使用 first / type / content / time / remark / url 字段。

当前跳转目标是生产兼容地址下的 /nest/mailbox。

生产 URL 保留 couple-better-game.vercel.app 是兼容地址，不代表当前产品仍叫 Couple Better Game。

## 6. PushPlus 展示边界

程序控制 title、content、token 路由和 provider 调用。

PushPlus / 微信客户端具体如何展示模板或聊天气泡属于第三方 provider 行为，不应被写成伴岛内部稳定 contract。

## 7. 当前实现事实源

Production functions：

- private.life_cute_partner_term
- private.life_pushplus_center_message
- private.life_pushplus_message
- private.life_wechat_mailbox_message
- private.life_mailbox_notification_send

相关 migrations：

- 20260907102454_unify_tuanzi_reminders.sql
- 20260907103640_cute_tuanzi_pushplus_messages.sql
- 20260907121217_mailbox_wechat_primary_pushplus_fallback.sql
- 20260914082048_enable_daily_record_completeness_reminder.sql

修改提醒语气时，应以最新 Production function + migration 链最终定义为准，不能只根据旧 migration 中曾经出现过的文案判断当前行为。
