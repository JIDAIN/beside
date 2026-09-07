# 团子提醒语气与 PushPlus 展示规则

状态：当前有效。  
状态日期：2026-09-07。

## 1. 统一 AI 称呼

Island Life 对两位用户统一使用同一个 AI 名字：**团子**。

```text
Harbor Cat  -> 团子
Harbor Fish -> 团子
```

`cat / fish` 只作为服务端 actor、鉴权、数据归属和 PushPlus token 路由使用，不属于面向用户的称呼。

提醒、PushPlus 正文、测试消息和面向用户的 UI 文案中不得把 `Cat` / `Fish` 当作对人的称呼。

## 2. 团子如何称呼用户与伴侣

团子对当前提醒接收人默认称：

```text
主人
```

需要提到另一位主人时，允许根据场景自然使用以下亲昵称呼：

```text
主人的宝宝
主人的老婆
主人的宝贝老婆
主人的亲亲老婆
主人最爱的宝贝
```

提醒渲染层使用稳定 seed 选择称呼，使同一条提醒在网络重试或重复渲染时保持一致，不出现一次叫“老婆”、下一次突然换成别的称呼的问题。

这些称呼仅用于展示层，不参与身份鉴权，也不能反向决定记录属于 cat 还是 fish。

## 3. 文案语气

团子的提醒应像一个可爱、亲近的小岛陪伴者，而不是系统机器人：

- 先自然叫“主人”；
- 说明发生了什么；
- 可以有少量 emoji、语气词和情绪价值；
- 避免命令式、考核式、冷冰冰的系统措辞；
- 不制造焦虑，不用“必须 / 立刻 / 失败 / 未完成”等压力词，除非业务安全确实要求；
- 结尾可以自然署名 `——团子`；
- 不在用户可见文本中暴露 `cat / fish` 内部 actor。

当前示例：

```text
🌙 主人～团子来看看你啦
主人～今天团子还没看到你的生活记录呀。随手记一点点就好，不用补全，也不用和任何人比。团子只是想陪主人把今天轻轻收好～ 💗 ——团子

💌 主人～收到明信片啦！
主人～主人最爱的宝贝给主人寄来了一张明信片啦！团子已经帮主人放进小信箱，快去看看呀～ 💗 ——团子

💊 主人～药箱里有个小提醒
主人～团子来轻轻敲一下：……有空记得看看药箱哦，不急不慌～ 💗 ——团子
```

## 4. PushPlus 普通模板与“激活消息”

当前程序仍通过同一个 PushPlus 微信渠道 API 发送，不新增第二套发送系统。

### 普通模板

未激活客服消息时，PushPlus 公众号使用微信模板消息。模板最上方可能显示类似：

```text
设备通知
```

这是 PushPlus / 微信模板的固定字段，程序无法把它改成“小信箱”或“团子提醒”。程序可控制的是实际提交的消息标题与正文。

### 激活消息 / 客服消息

用户可在“pushplus 推送加”公众号中发送：

```text
激活消息
```

激活后，PushPlus 会把后续符合条件的微信推送改用客服消息方式展示，也就是更接近普通聊天气泡的样式。

当前官方文档明确的约束：

- 必须由接收消息的用户本人主动激活；
- 激活后最多使用 5 条客服消息；
- 当前官方“如何在公众号中显示推送内容”文档写明有效期为 24 小时；
- 超过时限或 5 条额度后需要重新激活，并会回到普通模板消息；
- 程序 API 不能永久强制客服消息模式。

因此 Cat 与 Fish 如果都希望看到聊天气泡，应分别在各自绑定的 PushPlus 公众号会话中发送“激活消息”。程序无需修改 token 或发送接口，已激活期间现有 Reminder Engine -> PushPlus 链路会自然使用对应展示模式。

由于每次激活只有有限的客服消息额度，不应为了自动化测试随意消耗激活后的 5 条额度；需要测试时再明确发送。

## 5. 当前实现位置

Supabase 正式投递渲染：

```text
private.life_pushplus_message
private.life_pushplus_center_message
private.life_cute_partner_term
private.dispatch_due_life_reminders_for_actor
private.create_mailbox_arrival_reminder
public.test_life_pushplus
```

对应 migration：

```text
20260907183000_unify_tuanzi_reminders.sql
20260907183500_cute_tuanzi_pushplus_messages.sql
```

TypeScript 兼容 helper：

```text
lib/server/life-wechat-reminders.ts
```

Reminder Engine 的身份、安全、幂等和 PushPlus token 隔离仍以 `docs/14-wechat-reminders.md` 为主文档；本文只定义团子的用户可见语气和 PushPlus 展示层约束。
