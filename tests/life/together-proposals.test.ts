import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeCount, outcomeLabel, pendingCount, type Proposal } from "../../lib/life/proposal-model";

const source = (path: string) => readFileSync(process.cwd() + "/" + path, "utf8");
const base = (overrides: Partial<Proposal> = {}): Proposal => ({
 id:"a",createdBy:"cat",recipientKey:"fish",title:"散步",note:"",
 scheduledAt:new Date(Date.now()+3600000).toISOString(),durationMinutes:20,
 status:"pending",waitingFor:"fish",candidateAt:null,candidateDuration:null,
 encouragementBy:null,rescheduleCount:0,results:{},outcome:null,version:1,
 createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),closedAt:null,...overrides
});
describe("Together V1 boundary", () => {
 it("counts quotas by initiator and upcoming agreed slots only", () => {
  const now=Date.now(), tomorrow=new Date(now+86400000).toISOString();
  const items=[base(),base({id:"b",createdBy:"fish",recipientKey:"cat",status:"counter"}),
   base({id:"c",status:"agreed",waitingFor:null,scheduledAt:tomorrow}),
   base({id:"d",status:"awaiting_result",waitingFor:null,scheduledAt:tomorrow}),
   base({id:"e",status:"closed",outcome:"declined"})];
  expect(pendingCount(items,"cat")).toBe(1);
  expect(pendingCount(items,"fish")).toBe(1);
  expect(activeCount(items,now)).toBe(1);
  expect(outcomeLabel("unconfirmed")).toBe("结果未确认");
 });
 it("authenticates Web API before queries or mutations and binds the signed actor", () => {
  const api=source("app/api/life/proposals/route.ts");
  const adapter=source("lib/server/life-proposals.ts");
  expect(api).toContain("authorizeLifeRequest(request)");
  expect(api).toContain("resolveFixedLifeIdentity(request)!.partnerKey");
  expect(adapter).toContain("p_actor: actor");
  expect(adapter).toContain("p_expected_version: version");
  expect(adapter).toContain("p_request_id: requestId");
  expect(adapter).not.toContain("NEXT_PUBLIC_SUPABASE");
 });
 it("enforces service-role-only RPC, serialized quotas and lifecycle in migration", () => {
  const sql=source("supabase/migrations/20261106070000_life_proposals.sql");
  expect(sql).toContain("create table public.life_proposals");
  expect(sql).toContain("create table public.life_proposal_events");
  expect(sql).toContain("enable row level security");
  expect(sql).toContain("from public,anon,authenticated");
  expect(sql).toContain("to service_role");
  expect(sql).toContain("grant select,insert,update,delete on public.life_proposals to service_role");
  expect(sql).toContain("grant select,insert,delete on public.life_proposal_events to service_role");
  expect(sql).toContain("pg_advisory_xact_lock");
  expect(sql).toContain("VERSION_CONFLICT");
  expect(sql).toContain("PENDING_QUOTA");
  expect(sql).toContain("AGREEMENT_QUOTA");
  expect(sql).toContain("reschedule_count>=2");
  expect(sql).toContain("interval '48 hours'");
  expect(sql).not.toContain("daily_records");
 });
 it("reuses existing reminder instances without parallel delivery tables", () => {
  const sql=source("supabase/migrations/20261106070000_life_proposals.sql");
  expect(sql).toContain("public.life_reminder_instances");
  expect(sql).toContain("private.life_proposal_clear_reminders");
  expect(sql).toContain("private.sweep_life_proposals");
  expect(sql).toContain("'cancelled',v_now,v.version");
  expect(sql).toContain("'withdrawn',v_now,v.version");
  expect(sql).toContain("v_now := clock_timestamp()");
  expect(sql).toContain("interval '30 minutes'");
  expect(sql).not.toContain("create table notification_jobs");
  expect(sql).toContain("restore_life_backup_snapshot");
  expect(sql).toContain("'life_proposal_events'");
  expect(sql.toLowerCase()).toContain("older snapshots");
 });
 it("keeps refusal free and supports voluntary encouragement", () => {
  const ui=source("components/life/LifeTogetherPage.tsx");
  expect(ui).toContain("拉我一把");
  expect(ui).toContain("今天不了");
  expect(ui).toContain("保留原约定");
  expect(ui).toContain("我的执行结果");
  expect(ui).toContain("我提前做完了");
  expect(ui).toContain('early={Date.parse(p.scheduledAt) > now}');
  expect(ui).toContain("p.durationMinutes * 60000");
  const migration = source("supabase/migrations/20261106130000_together_early_result_lifecycle.sql");
  expect(migration).toContain("v.status<>'agreed' or p_data->>'result'<>'done'");
  expect(migration).toContain("v_now<v_end");
  expect(migration).toContain("recipient=p_actor");
  expect(migration).toContain("'before','encourage'");
  expect(ui).not.toContain("拒绝次数已满");
 });
});
