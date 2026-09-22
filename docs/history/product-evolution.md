# Product Evolution

本文只解释产品历史与术语来源，不定义当前完整功能。

## 1. Original Game Prototype

伴岛最初程序雏形是双人“变美变瘦大作战”，核心围绕每日 deficit、运动、金币/宝石、钱包、热力图、兑换与成长记录。

早期仓库/部署中出现 Couple Better Game / couple-better-game 等命名。

## 2. Life Recording Expansion

随后应用逐步加入真实生活记录能力，例如：
- 饮食；
- 心情；
- 睡眠；
- 活动；
- 体重；
- 药箱；
- 小信箱；
- AI / Reminder。

产品范围从单一游戏扩展为两个人共同使用的生活记录与陪伴工具。

## 3. Life / Game Separation

随着真实生活数据增加，必须明确：

~~~text
Life facts
!= Legacy Game settlement facts
~~~

Meal、weight、activity 等现实生活事实不再自动解释为游戏 deficit / exercise / game weight。

这一数据边界后来由 ADR-0005 固化。

## 4. Island Life / V2 Engineering Phase

在重构阶段，Island Life / V2 Life 曾被用来表示新的生活系统与页面架构。

它后来保留为内部生活数据域 / 历史工程术语，而不是正式产品品牌。

docs/history/v2-evolution 保留这一阶段的原始设计、实施和验收证据。

## 5. Beside / 伴岛 Formal Positioning

2026 年 9 月正式收口品牌：

- 中文正式名：伴岛
- English：Beside
- 日常称呼：小岛
- GitHub：JIDAIN/beside
- Vercel Project：beside

现有 Production URL 继续使用 https://couple-better-game.vercel.app 作为兼容地址。

## 6. Legacy Game Retained in Game Machine

原“变美变瘦大作战”没有被删除，而是被重新定位到：

~~~text
伴岛
└─ 小窝
   └─ 游戏机
      └─ 变美变瘦大作战
~~~

工程内部称 Legacy Game。

它继续保留自己的数据、settlement、wallet、heatmap 与兼容代码，但不再代表整个应用。

## 7. Terminology Map

| Term | Current meaning |
|---|---|
| 伴岛 / Beside | 当前唯一正式产品 |
| 小岛 | 日常称呼 |
| Island Life | 内部生活数据域 / 历史工程术语 |
| Legacy Game | 当前小游戏“变美变瘦大作战”的工程称呼 |
| couple-better-game / couple_better_game | 历史/兼容 slug、URL、key、project name |
| Harbor | 历史/当前某些 MCP client/bridge 名称，不是产品品牌 |

## 8. What This History Does Not Define

今天的：
- 产品能力 → Product
- schema → Data Model
- Auth → Auth & Identity
- AI → AI Architecture
- Reminder/Meal/Legacy rules → Domains
- Production state → Current State

不要从本历史文档推断 current contract。
