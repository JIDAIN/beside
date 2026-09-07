import { NextResponse } from "next/server";
import { resolveFixedLifeIdentity } from "@/lib/server/fixed-life-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  if (resolveFixedLifeIdentity(request)) {
    return NextResponse.redirect(new URL("/nest/mailbox", origin));
  }

  const login = new URL("/login", origin);
  login.searchParams.set("next", "/nest/mailbox");
  return NextResponse.redirect(login);
}
