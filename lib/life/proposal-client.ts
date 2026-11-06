import { readFetch } from "@/lib/client/read-fetch";
import type { Proposal, ProposalAction } from "./proposal-model";

async function request<T>(method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await readFetch("/api/life/proposals", {
    method, cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error || "暂时无法连接小窝");
  return data;
}
export async function listProposals() {
  return (await request<{ ok: true; items: Proposal[] }>("GET")).items;
}
export async function createProposal(input: {
  title: string; note: string; scheduledAt: string; durationMinutes: number; requestId: string;
}) {
  return (await request<{ ok: true; item: Proposal }>("POST", input)).item;
}
export async function actOnProposal(
  proposal: Proposal, action: ProposalAction, data: Record<string, unknown> = {}, requestId = crypto.randomUUID(),
) {
  return (await request<{ ok: true; item: Proposal }>("PATCH", {
    id: proposal.id, action, data, expectedVersion: proposal.version, requestId,
  })).item;
}
