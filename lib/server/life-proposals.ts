import type { Partner, Proposal, ProposalAction } from "@/lib/life/proposal-model";
const base = process.env.SUPABASE_URL || "https://bfhntnzngozdqsmgfvjk.supabase.co";
const slug = process.env.COUPLE_SPACE_SLUG || "couple-better-game";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ProposalError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
function parseTime(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
    throw new ProposalError("请填写有效的约定时间");
  }
  const time = new Date(value).getTime(), now = Date.now();
  if (time <= now || time > now + 7 * 86400000) throw new ProposalError("请选择未来 7 天内的时间");
  return new Date(time).toISOString();
}
function schedule(raw: unknown) {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const minutes = value.durationMinutes;
  if (!Number.isInteger(minutes) || (minutes as number) < 5 || (minutes as number) > 180)
    throw new ProposalError("约定时长请选择 5～180 分钟");
  return { scheduledAt: parseTime(value.scheduledAt), durationMinutes: minutes as number };
}
function createData(raw: unknown) {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const note = typeof value.note === "string" ? value.note.trim() : "";
  if (!title || title.length > 120 || note.length > 500) throw new ProposalError("标题需为 1～120 字，备注最多 500 字");
  return { ...schedule(value), title, note };
}
export function parseCreate(raw: unknown) { return createData(raw); }
export function parseAction(raw: unknown): { id: string; action: ProposalAction; version: number; data: Record<string, unknown> } {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const allowed: ProposalAction[] = ["accept","encourage","counter","reschedule","decline","withdraw","cancel","result"];
  if (typeof value.id !== "string" || !uuid.test(value.id) || !allowed.includes(value.action as ProposalAction)) throw new ProposalError("提案操作无效");
  if (!Number.isInteger(value.expectedVersion) || (value.expectedVersion as number) < 1) throw new ProposalError("请重新加载提案");
  const action = value.action as ProposalAction;
  const data = action === "counter" || action === "reschedule" ? schedule(value.data)
    : action === "result" ? parseResult(value.data) : {};
  return { id: value.id, action, version: value.expectedVersion as number, data };
}
function parseResult(raw: unknown) {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  if (!["done","partial","not_done"].includes(String(value.result))) throw new ProposalError("请选择真实的执行结果");
  return { result: value.result };
}
export function parseRequestId(raw: unknown) {
  if (typeof raw !== "string" || !uuid.test(raw)) throw new ProposalError("请求标识无效");
  return raw;
}
async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new ProposalError("数据库服务端配置缺失", 503);
  let response: Response;
  try {
    response = await fetch(base + "/rest/v1/rpc/" + name, {
      method: "POST", cache: "no-store",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch { throw new ProposalError("小约定暂时无法连接，请稍后再试", 503); }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    const message = body?.message || "";
    if (message.includes("PENDING_QUOTA")) throw new ProposalError("已经有 2 个邀请在等待回应啦", 409);
    if (message.includes("AGREEMENT_QUOTA")) throw new ProposalError("未来 7 天的 3 个约定已经排满啦", 409);
    if (message.includes("VERSION_CONFLICT")) throw new ProposalError("对方刚刚更新了提案，请刷新再试", 409);
    if (message.includes("not your turn")) throw new ProposalError("现在轮到 Ta 回应啦", 409);
    if (message.includes("reschedule unavailable")) throw new ProposalError("这条约定不能继续改期了", 409);
    if (message.includes("proposal expired")) throw new ProposalError("这份邀请已经过期了", 409);
    if (response.status === 404 || message.includes("Could not find the function")) throw new ProposalError("数据库迁移尚未启用，暂时无法使用", 503);
    throw new ProposalError("操作未成功，请刷新后重试", response.status === 400 ? 409 : 503);
  }
  return response.json() as Promise<T>;
}
export function listTogetherProposals() {
  return rpc<Proposal[]>("list_life_proposals", { p_space_slug: slug });
}
export function mutateTogetherProposal(actor: Partner, action: "create" | ProposalAction,
  id: string | null, data: Record<string, unknown>, version: number, requestId: string) {
  return rpc<Proposal>("mutate_life_proposal", {
    p_actor: actor, p_action: action, p_id: id, p_data: data, p_expected_version: version,
    p_request_id: requestId, p_space_slug: slug,
  });
}
