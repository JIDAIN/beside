/** Together: couple proposals are shared Life facts, not Legacy Game tasks. */
export type Partner = "cat" | "fish";
export type ProposalStatus = "pending" | "counter" | "agreed" | "reschedule" | "awaiting_result" | "closed";
export type ProposalOutcome = "joint_done" | "partial" | "solo" | "not_done" | "unconfirmed" | "declined" | "expired" | "withdrawn" | "cancelled" | null;
export type ParticipationResult = "done" | "partial" | "not_done";
export type Proposal = {
  id: string;
  createdBy: Partner;
  recipientKey: Partner;
  title: string;
  note: string;
  scheduledAt: string;
  durationMinutes: number;
  status: ProposalStatus;
  waitingFor: Partner | null;
  candidateAt: string | null;
  candidateDuration: number | null;
  encouragementBy: Partner | null;
  rescheduleCount: number;
  results: Partial<Record<Partner, ParticipationResult>>;
  outcome: ProposalOutcome;
  version: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};
export type ProposalAction =
  | "accept" | "encourage" | "counter" | "reschedule"
  | "decline" | "withdraw" | "cancel" | "result";
export function pendingCount(proposals: Proposal[], actor: Partner) {
  return proposals.filter(p => p.createdBy === actor && (p.status === "pending" || p.status === "counter")).length;
}
export function activeCount(proposals: Proposal[], now = Date.now()) {
  const horizon = now + 7 * 86400000;
  return proposals.filter(p => (p.status === "agreed" || p.status === "reschedule")
    && new Date(p.scheduledAt).getTime() > now && new Date(p.scheduledAt).getTime() <= horizon).length;
}
export function formatProposalTime(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Shanghai" }).format(new Date(iso));
}
export function outcomeLabel(outcome: ProposalOutcome) {
  const labels: Record<NonNullable<ProposalOutcome>, string> = {
    joint_done: "共同完成", partial: "做了一部分", solo: "仅一人完成",
    not_done: "今天没做", unconfirmed: "结果未确认", declined: "今天不了",
    expired: "已过期", withdrawn: "已撤回", cancelled: "已取消",
  };
  return outcome ? labels[outcome] : "待确认";
}
