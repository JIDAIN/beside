import { LifeAppShell } from "@/components/life/LifeAppShell";
import { TodayLifePage } from "@/components/life/TodayLifePage";

export const dynamic = "force-dynamic";

function shanghaiIsoDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function Home() {
  const date = shanghaiIsoDate();
  return (
    <LifeAppShell>
      <TodayLifePage initialDate={date} />
    </LifeAppShell>
  );
}
