import { LifeAppShell } from "@/components/life/LifeAppShell";
import { LifeCalendarPage } from "@/components/life/LifeCalendarPage";
import { parseCalendarMonth, parseCalendarView } from "@/lib/life/monthly-review";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string | string[]; month?: string | string[] }> }) {
  const params = await searchParams;
  return (
    <LifeAppShell>
      <LifeCalendarPage initialView={parseCalendarView(params.view)} initialMonth={parseCalendarMonth(params.month, currentMonth())} />
    </LifeAppShell>
  );
}
