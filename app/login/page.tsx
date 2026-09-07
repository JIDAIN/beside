import { LifeLoginPage } from "@/components/life/LifeLoginPage";

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

function safeNextPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/login")) {
    return "/";
  }
  return candidate;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LifeLoginPage nextPath={safeNextPath(params.next)} />;
}
