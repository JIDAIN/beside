"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { TodayActivityCard } from "@/components/life/today/TodayActivityCard";
import { TodayMoodCard } from "@/components/life/today/TodayMoodCard";
import { TodaySleepCard } from "@/components/life/today/TodaySleepCard";
import { displayDate } from "@/components/life/today/today-life-model";
import { fetchLifeDay, LifeApiError } from "@/lib/life/life-client";
import { syncLifeDayCaches } from "@/lib/life/month-bundle";
import type { LifeDayRecord } from "@/lib/life/life-service";
import { useStaleQuery } from "@/lib/client/use-stale-query";

export function LifeCalendarDayPage({ date }: { date: string }) {
  const { mePartnerKey, taPartnerKey } = useLifeIdentity();
  const [actionError, setActionError] = useState<string | null>(null);

  const dayFetcher = useCallback(() => fetchLifeDay(date), [date]);
  const dayQuery = useStaleQuery<LifeDayRecord>({
    key: `life-day:${date}`,
    fetcher: dayFetcher,
    staleMs: 60_000,
  });

  const day = dayQuery.data ?? null;
  const queryError = dayQuery.error instanceof LifeApiError
    ? dayQuery.error.message
    : dayQuery.error?.message ?? null;
  const error = actionError ?? queryError;

  const reloadDay = useCallback(async () => {
    setActionError(null);
    try {
      const next = await fetchLifeDay(date);
      syncLifeDayCaches(date, next);
      dayQuery.update(next);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "重新读取这一天的记录失败");
    }
  }, [date, dayQuery]);

  if (!mePartnerKey || !taPartnerKey) {
    return <AppPageShell title={displayDate(date)} subtitle="正在确认当前账号…"><section className="life-surface life-section-card text-sm text-[var(--life-text-muted)]">正在确认当前账号…</section></AppPageShell>;
  }

  return (
    <AppPageShell title={displayDate(date)} subtitle="翻开这一天，看看我们留下了什么。" actions={<Link href="/calendar" className="life-back-link">返回月历</Link>}>
      {error ? <div className="mb-3 rounded-[var(--life-radius-control)] bg-[color:color-mix(in_srgb,var(--life-coral)_14%,white)] px-3 py-2.5 text-sm text-[var(--life-danger)]">{error}</div> : null}
      {day ? (
        <div className="grid gap-3">
          <TodayMoodCard key={`mood-${date}`} date={date} day={day} onChanged={reloadDay} onError={setActionError} />
          <TodaySleepCard key={`sleep-${date}`} date={date} day={day} onChanged={reloadDay} onError={setActionError} />
          <TodayActivityCard key={`activity-${date}`} date={date} day={day} onChanged={reloadDay} onError={setActionError} />
        </div>
      ) : dayQuery.loading ? <section className="life-surface life-section-card text-sm text-[var(--life-text-muted)]">正在翻开这一天…</section> : null}
    </AppPageShell>
  );
}
