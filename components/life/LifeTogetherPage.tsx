"use client";


import { useAppConfirm } from "@/components/ui/AppConfirmDialog";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { AppButton } from "@/components/ui/AppButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { actOnProposal, createProposal, listProposals } from "@/lib/life/proposal-client";
import { activeCount, formatProposalTime, outcomeLabel, pendingCount, type ParticipationResult, type Proposal, type ProposalAction } from "@/lib/life/proposal-model";

type Tab = "pending" | "agreed" | "history";
type Editor = { kind: "create" | "counter" | "reschedule"; proposal?: Proposal };
const field = "w-full rounded-xl border border-[var(--life-border)] bg-white px-3 py-2.5 text-sm text-[var(--life-text)]";
const card = "rounded-[20px] border border-[var(--life-border)] bg-[var(--life-surface)] p-4 shadow-sm";
const timeZone = "Asia/Shanghai";
function shanghaiInput(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date).replace(" ", "T");
}
function dateToIso(value: string) { return new Date(value + ":00+08:00").toISOString(); }
function activityLabel(result: ParticipationResult | undefined) {
  return result === "done" ? "做到了" : result === "partial" ? "做了一点" : result === "not_done" ? "今天没做" : "待确认";
}
const presets = ["一起散步", "一起敷面膜", "早点睡觉", "一起整理房间"];

export function LifeTogetherPage() {
  const confirm = useAppConfirm();
  const { mePartnerKey: me } = useLifeIdentity();
  const [items, setItems] = useState<Proposal[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [targetProposalId, setTargetProposalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(20);
  const requestId = useRef<string | null>(null);
  const focusedProposal = useRef<string | null>(null);

  const reload = useCallback(async () => {
    try { setItems(await listProposals()); setError(""); setNow(Date.now()); }
    catch (e) { setError(e instanceof Error ? e.message : "暂时无法读取"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("proposal");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return;
    const frame = window.requestAnimationFrame(() => setTargetProposalId(id));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { const task = window.setTimeout(() => { void reload(); }, 0); return () => window.clearTimeout(task); }, [reload]);
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") void reload(); };
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(onFocus, 30000);
    return () => { document.removeEventListener("visibilitychange", onFocus); window.clearInterval(timer); };
  }, [reload]);

  const grouped = useMemo(() => ({
    pending: items.filter(x => x.status === "pending" || x.status === "counter"),
    agreed: items.filter(x => x.status === "agreed" || x.status === "reschedule" || x.status === "awaiting_result"),
    history: items.filter(x => x.status === "closed"),
  }), [items]);
  useEffect(() => {
    if (!targetProposalId || loading || focusedProposal.current === targetProposalId) return;
    const proposal = items.find(p => p.id === targetProposalId);
    if (!proposal) return;
    const nextTab: Tab = proposal.status === "closed"
      ? "history"
      : proposal.status === "pending" || proposal.status === "counter" ? "pending" : "agreed";
    if (tab !== nextTab) {
      const frame = window.requestAnimationFrame(() => setTab(nextTab));
      return () => window.cancelAnimationFrame(frame);
    }
    focusedProposal.current = targetProposalId;
    const frame = window.requestAnimationFrame(() => {
      const card = document.getElementById(`together-proposal-${targetProposalId}`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [items, loading, tab, targetProposalId]);

  function edit(kind: Editor["kind"], proposal?: Proposal) {
    setEditor({ kind, proposal }); setError(""); setTitle(kind === "create" ? "" : proposal?.title ?? "");
    setNote(kind === "create" ? "" : proposal?.note ?? "");
    setTime(proposal ? shanghaiInput(new Date(proposal.candidateAt || proposal.scheduledAt)) : shanghaiInput(new Date(Date.now() + 2 * 3600000)));
    setDuration(proposal?.candidateDuration ?? proposal?.durationMinutes ?? 20);
    requestId.current = null;
  }
  async function close() {
    if (busy) return;
    if (editor?.kind === "create" && (title.trim() || note.trim()) && !(await confirm({ title: "离开这份邀请？", description: "尚未发出的内容不会保存。", confirmLabel: "离开" }))) return;
    setEditor(null); requestId.current = null;
  }
  async function save() {
    if (!editor || !time) return;
    let scheduledAt: string;
    try {
      scheduledAt = dateToIso(time);
      const start = Date.parse(scheduledAt);
      if (!Number.isFinite(start) || start <= Date.now() || start > Date.now() + 7 * 86400000) {
        setError("请选择未来 7 天内的时间"); return;
      }
    } catch { setError("时间格式不正确"); return; }
    setBusy(true); setError("");
    const id = requestId.current ?? crypto.randomUUID(); requestId.current = id;
    try {
      if (editor.kind === "create") {
        await createProposal({ title: title.trim(), note: note.trim(), scheduledAt, durationMinutes: duration, requestId: id });
      } else if (editor.proposal) {
        await actOnProposal(editor.proposal, editor.kind, { scheduledAt, durationMinutes: duration }, id);
      }
      setEditor(null); requestId.current = null; await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败"); }
    finally { setBusy(false); }
  }
  async function perform(proposal: Proposal, action: ProposalAction, data: Record<string, unknown> = {}) {
    if (busy) return;
    if (["cancel", "withdraw"].includes(action) && !(await confirm({ title: action === "cancel" ? "取消这次约定？" : "撤回这份邀请？", description: "操作后会通知另一位主人。", confirmLabel: action === "cancel" ? "取消约定" : "撤回邀请", tone: "danger" }))) return;
    setBusy(true); setError("");
    try { await actOnProposal(proposal, action, data); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "操作未完成"); }
    finally { setBusy(false); }
  }
  const statusText = (p: Proposal) => {
    if (p.status === "closed") return outcomeLabel(p.outcome);
    if (p.status === "awaiting_result") return "待确认结果";
    if (p.status === "agreed") return "已约定";
    if (p.status === "reschedule") return "改期待确认";
    return p.waitingFor === me ? "待我回应" : "等待 Ta";
  };
  const mePending = me ? pendingCount(items, me) : 0;
  const active = activeCount(items, now);

  return <AppPageShell title="一起做吧 ♡" subtitle="有件小事，想和你一起做" actions={<Link href="/nest" className="life-back-link">返回小窝</Link>}>
    <div className="grid gap-3 pb-8">
      <div className="flex gap-2 border-b border-[var(--life-border)] pb-2" role="tablist" aria-label="提案筛选">
        {([["pending","待回应"],["agreed","我们的约定"],["history","历史"]] as [Tab,string][]).map(([value,label]) =>
          <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
            className={"flex-1 rounded-xl px-2 py-2.5 text-xs font-bold " + (tab === value ? "bg-[var(--life-mint)] text-[var(--life-text)]" : "text-[var(--life-text-body)]")}>{label}</button>)}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--life-text-muted)]">{tab === "pending" ? `我发起 ${mePending}/2` : tab === "agreed" ? `未来 7 天 ${active}/3` : "每件小事都有去处"}</span>
        <AppButton variant="primary" disabled={!me || mePending >= 2} onClick={() => edit("create")}>{mePending >= 2 ? "邀请已满 2/2" : "＋ 发起邀请"}</AppButton>
      </div>
      {error && !editor && <div role="alert" className="rounded-xl bg-[var(--life-cream)] p-3 text-sm text-[var(--life-danger)]">{error}<button type="button" className="ml-2 underline" onClick={() => void reload()}>重试</button></div>}
      {loading ? <p className="text-sm text-[var(--life-text-muted)]">正在打开小窝…</p>
        : grouped[tab].length === 0 ? <div className={card + " py-10 text-center text-sm text-[var(--life-text-muted)]"}>{tab === "pending" ? "暂时没有等待回应的邀请" : tab === "agreed" ? "还没有正在进行的约定" : "一起做过的小事会留在这里"}</div>
        : grouped[tab].map(p => <article key={p.id} id={`together-proposal-${p.id}`} tabIndex={-1}
          className={card + " grid gap-3 " + (p.id === targetProposalId ? "ring-2 ring-[var(--life-teal)] ring-offset-2" : "")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block break-words text-base text-[var(--life-text)]">{p.title}</strong>
              <p className="mt-1 text-xs text-[var(--life-text-muted)]">{p.createdBy === me ? "我发起" : "Ta 邀请"} · {formatProposalTime(p.scheduledAt)} · {p.durationMinutes} 分钟</p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--life-mint)] px-2 py-1 text-[11px] text-[var(--life-text-body)]">{statusText(p)}</span>
          </div>
          {p.note && <p className="whitespace-pre-wrap break-words text-sm text-[var(--life-text-body)]">{p.note}</p>}
          {(p.status === "counter" || p.status === "reschedule") && p.candidateAt &&
            <div className="rounded-xl bg-[var(--life-cream)] px-3 py-2 text-xs text-[var(--life-text-body)]">
              新建议：{formatProposalTime(p.candidateAt)} · {p.candidateDuration} 分钟
              {p.status === "reschedule" ? "（原约定仍有效）" : ""}
            </div>}
          {p.encouragementBy && <p className="text-xs text-[var(--life-teal)]">♡ 有人选择了「拉我一把」</p>}
          {(p.status === "pending" || p.status === "counter") && p.waitingFor === me && <div className="grid grid-cols-2 gap-2">
            <AppButton disabled={busy} variant="primary" onClick={() => void perform(p,"accept")}>好呀 ♡</AppButton>
            <AppButton disabled={busy} onClick={() => void perform(p,"encourage")}>拉我一把</AppButton>
            <AppButton disabled={busy} onClick={() => edit("counter",p)}>改一下</AppButton>
            <AppButton disabled={busy} variant="ghost" onClick={() => void perform(p,"decline")}>今天不了</AppButton>
          </div>}
          {(p.status === "pending" || p.status === "counter") && p.createdBy === me &&
            <div className="flex justify-end"><AppButton disabled={busy} variant="ghost" onClick={() => void perform(p,"withdraw")}>撤回邀请</AppButton></div>}
          {p.status === "reschedule" && p.waitingFor === me && <div className="grid grid-cols-2 gap-2">
            <AppButton disabled={busy} variant="primary" onClick={() => void perform(p,"accept")}>同意新时间</AppButton>
            <AppButton disabled={busy} variant="secondary" onClick={() => void perform(p,"decline")}>保留原约定</AppButton>
          </div>}
          {(p.status === "agreed" || p.status === "reschedule") && <div className="grid gap-2">
            <div className="flex items-center justify-between text-xs text-[var(--life-text-muted)]">
              <span>已改期 {p.rescheduleCount}/2 次</span>
              <div className="flex gap-2">
                {p.status === "agreed" && Object.keys(p.results).length === 0 && p.rescheduleCount < 2 && Date.parse(p.scheduledAt) > now && <button type="button" className="underline" onClick={() => edit("reschedule",p)}>改时间</button>}
                {Object.keys(p.results).length === 0 && Date.parse(p.scheduledAt) + p.durationMinutes * 60000 > now && <button type="button" className="underline" disabled={busy} onClick={() => void perform(p,"cancel")}>取消约定</button>}
              </div>
            </div>
            {p.status === "agreed" && <ResultButtons proposal={p} me={me} busy={busy} early={Date.parse(p.scheduledAt) > now} onResult={(result) => void perform(p,"result",{result})}/>}
            {p.status === "reschedule" && Date.parse(p.scheduledAt) <= now && <ResultButtons proposal={p} me={me} busy={busy} onResult={(result) => void perform(p,"result",{result})}/>}
          </div>}
          {p.status === "awaiting_result" && <ResultButtons proposal={p} me={me} busy={busy} onResult={(result) => void perform(p,"result",{result})}/>}
          {p.status === "closed" && <div className="grid gap-2 text-xs text-[var(--life-text-muted)]">
            {p.outcome === "joint_done"
              ? <p>♡ 我们已完成 · {Object.keys(p.results).length === 2 ? "双方确认" : p.results[me ?? "cat"] === "done" ? "由我确认" : "由 Ta 确认"}</p>
              : Object.keys(p.results).length > 0 && <p>我的结果：{activityLabel(me ? p.results[me] : undefined)} · Ta：{activityLabel(me === "cat" ? p.results.fish : p.results.cat)}</p>}
            {p.outcome === "unconfirmed" && <ResultButtons proposal={p} me={me} busy={busy} onResult={(result) => void perform(p,"result",{result})}/>}
          </div>}
        </article>)}
    </div>
    {editor && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center" onMouseDown={close}>
      <section role="dialog" aria-modal="true" aria-label={editor.kind === "create" ? "发起邀请" : "修改时间"} onMouseDown={e => e.stopPropagation()}
        className="island-life-v2 max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[26px] bg-[var(--life-surface)] p-5 text-[var(--life-text)]">
        <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-extrabold">{editor.kind === "create" ? "邀请 Ta 一起做 ♡" : editor.kind === "counter" ? "换个更舒服的安排" : "一起改个时间"}</h2><button type="button" aria-label="关闭" onClick={close}>✕</button></div>
        <div className="mt-4 grid gap-3">
          {editor.kind === "create" && <>
            <label className="grid gap-1 text-xs font-bold">想一起做什么<input maxLength={120} required className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="比如今晚一起散步"/></label>
            <div className="flex flex-wrap gap-2">{presets.map(p => <button key={p} type="button" onClick={() => setTitle(p)} className="rounded-full border border-[var(--life-border)] px-3 py-1.5 text-xs">{p}</button>)}</div>
          </>}
          <label className="grid gap-1 text-xs font-bold">什么时候 <span className="font-normal text-[var(--life-text-muted)]">北京时间</span>
            <input type="datetime-local" required className={field} value={time} min={shanghaiInput(new Date())} onChange={e => setTime(e.target.value)}/>
          </label>
          <label className="grid gap-1 text-xs font-bold">做多久<select className={field} value={duration} onChange={e => setDuration(Number(e.target.value))}>
            {[5,10,15,20,30,45,60,90,120,180].map(n => <option key={n} value={n}>{n} 分钟</option>)}
          </select></label>
          {editor.kind === "create" && <label className="grid gap-1 text-xs font-bold">想说的话（可选）
            <textarea className={field} maxLength={500} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="不想做太久的话，五分钟也好呀。"/>
          </label>}
          {editor.kind === "reschedule" && <p className="text-xs text-[var(--life-text-muted)]">改期成功需 Ta 同意；每次确认后计入最多 2 次。</p>}
          {error && <p role="alert" className="text-sm text-[var(--life-danger)]">{error}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <AppButton disabled={busy} onClick={close}>取消</AppButton>
            <AppButton variant="primary" disabled={busy || (editor.kind === "create" && !title.trim())} onClick={() => void save()}>{busy ? "保存中…" : editor.kind === "create" ? "发送邀请" : "提出修改"}</AppButton>
          </div>
        </div>
      </section>
    </div>}
  </AppPageShell>;
}

function ResultButtons({ proposal, me, busy, early = false, onResult }: { proposal: Proposal; me: "cat" | "fish" | null; busy: boolean; early?: boolean; onResult: (result: ParticipationResult) => void }) {
  const confirm = useAppConfirm();
  if (!me) return null;
  const current = proposal.results[me];
  return <div className="grid gap-2">
    {current && <p className="text-xs text-[var(--life-text-body)]">我的执行结果 · 已记录：{activityLabel(current)}</p>}
    {!current && <>
      <AppButton variant="primary" disabled={busy} onClick={() => {
        void confirm({ title: "我们已完成这件小事？", description: "确认后会存入历史，并取消尚未发送的提醒。只需要一人确认就好 ♡", confirmLabel: "我们已完成" }).then((approved) => { if (approved) onResult("done"); });
      }}>我们已完成 ♡</AppButton>
      {!early && <div className="grid grid-cols-2 gap-2">
        {([["partial","做了一点"],["not_done","今天没做"]] as [ParticipationResult,string][]).map(([value,label]) =>
          <button key={value} type="button" disabled={busy} onClick={() => onResult(value)}
            className="rounded-xl border border-[var(--life-border)] bg-[var(--life-cream)] px-1 py-2.5 text-xs font-semibold disabled:opacity-50">{label}</button>)}
      </div>}
    </>}
  </div>;
}
