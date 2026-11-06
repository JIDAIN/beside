import { createHash } from "node:crypto";
import { LifeClarificationError } from "@/lib/ai/life-input-normalizer";
import type { Partner, Proposal, ProposalAction } from "@/lib/life/proposal-model";
import {
  listTogetherProposals,
  mutateTogetherProposal,
  parseAction,
  parseCreate,
} from "./life-proposals";

type Row = Record<string, unknown>;
type Query = { id?: unknown; name?: unknown; status?: unknown; scope?: unknown; limit?: unknown };
type MutationContext = { actor: Partner; latestUserText: string; toolCallId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function object(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row) : {};
}

function other(actor: Partner): Partner {
  return actor === "cat" ? "fish" : "cat";
}

function validId(value: unknown) {
  const id = text(value);
  if (!UUID.test(id)) throw new LifeClarificationError("请先查询并确认要操作的那一条邀请。", ["id"]);
  return id;
}

function expectedVersion(value: unknown) {
  const version = typeof value === "number" ? value : Number(text(value));
  if (!Number.isInteger(version) || version < 1) {
    throw new LifeClarificationError("请先查询该邀请的最新状态，再确认是否操作。", ["expectedVersion"]);
  }
  return version;
}

const statuses = new Set(["all", "pending", "counter", "agreed", "reschedule", "awaiting_result", "closed", "active", "history"]);
function matchStatus(p: Proposal, filter: string) {
  if (!filter || filter === "all") return true;
  if (filter === "active") return p.status === "agreed" || p.status === "reschedule" || p.status === "awaiting_result";
  if (filter === "history") return p.status === "closed";
  if (filter === "pending") return p.status === "pending" || p.status === "counter";
  return p.status === filter;
}

export async function queryAgentProposals(query: Query, actor: Partner) {
  const id = text(query.id);
  if (id && !UUID.test(id)) throw new Error("邀请 ID 无效");
  const name = text(query.name).toLocaleLowerCase();
  const status = text(query.status).toLowerCase() || "all";
  if (!statuses.has(status)) throw new Error("不支持的邀请状态，请查询全部或选择待回应、已约定、待确认、历史");
  const scope = text(query.scope).toLowerCase() || "all";
  if (!["all", "waiting_me", "waiting_ta", "created_me", "created_ta"].includes(scope)) {
    throw new Error("范围仅支持 all/waiting_me/waiting_ta/created_me/created_ta");
  }
  const rawLimit = Number(query.limit ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(150, Math.trunc(rawLimit))) : 50;
  const proposals = await listTogetherProposals();
  return proposals.filter((p) => (!id || p.id === id)
    && (!name || [p.title, p.note].join(" ").toLocaleLowerCase().includes(name))
    && matchStatus(p, status)
    && (scope === "all"
      || (scope === "waiting_me" && p.waitingFor === actor)
      || (scope === "waiting_ta" && p.waitingFor === other(actor))
      || (scope === "created_me" && p.createdBy === actor)
      || (scope === "created_ta" && p.createdBy === other(actor))))
    .slice(0, limit);
}

function ensureExplicitAction(action: string, userText: string) {
  const patterns: Record<string, RegExp> = {
    accept: /同意|答应|接受|好呀|好啊|可以|确认|就这么定|行呀|行啊|好的|就按|照原计划/,
    encourage: /拉我一把|推我一把|带动我|鼓励我|帮我启动/,
    counter: /改|换|调整|推迟|提前|挪|缩短|少做/,
    reschedule: /改|换|调整|推迟|提前|挪|延期/,
    decline: /拒绝|今天不了|不想|不去|不做|算了|先休息|不方便/,
    withdraw: /撤回|收回|取消邀请|不邀请了/,
    cancel: /取消|作废|终止|结束约定|不做了|不去了/,
    result: /做了|完成|没做|没去|去了|做了一点|只做|记录结果|确认结果|补记/,
  };
  if (patterns[action] && !patterns[action].test(userText)) {
    throw new LifeClarificationError("请明确告诉团子这次要怎样回应或记录，再执行操作。", ["action"]);
  }
}

// Stable across MCP retries of the same user intent, independent of tool-call IDs.
// Time-bounded to allow a later intentional, identical invitation.
export function proposalRequestId(
  actor: Partner, action: string, id: string | null, data: Row, latestUserText: string, now = Date.now(),
) {
  const canonical = JSON.stringify({actor, action, id, data, latestUserText, bucket: Math.floor(now / 600_000)});
  const digest = createHash("sha256").update(canonical).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export async function mutateAgentProposal(
  action: string,
  idRaw: unknown,
  input: unknown,
  versionRaw: unknown,
  context: MutationContext,
) {
  const actor = context.actor;
  const data = object(input);
  ensureExplicitAction(action, context.latestUserText);
  if (action === "create") {
    const createData = parseCreate(data);
    const requestId = proposalRequestId(actor, action, null, createData, context.latestUserText);
    const item = await mutateTogetherProposal(actor, "create", null, createData, 0, requestId);
    return { item, created: true };
  }
  if (!["accept", "encourage", "counter", "reschedule", "decline", "withdraw", "cancel", "result"].includes(action)) {
    throw new Error("提案操作仅支持 create/accept/encourage/counter/reschedule/decline/withdraw/cancel/result");
  }
  const id = validId(idRaw);
  const version = expectedVersion(versionRaw);
  const current = (await listTogetherProposals()).find((p) => p.id === id);
  if (!current) throw new Error("没有找到这条邀请，请先查询最新列表");
  if (current.version !== version) throw new Error("邀请已经发生变化，请先查询最新状态，再决定是否操作");
  const canonicalData: Row = action === "counter" || action === "reschedule"
    ? {
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes ?? current.durationMinutes,
      }
    : action === "result" ? { result: data.result } : {};
  const parsed = parseAction({ id, action, expectedVersion: version, data: canonicalData });
  const requestId = proposalRequestId(actor, action, id, parsed.data, context.latestUserText);
  const item = await mutateTogetherProposal(actor, action as ProposalAction, id, parsed.data, version, requestId);
  return { item, action };
}
