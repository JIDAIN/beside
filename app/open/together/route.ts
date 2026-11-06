import { NextResponse } from "next/server";
import { resolveFixedLifeIdentity } from "@/lib/server/fixed-life-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Unauthenticated notification entry point. The proposal ID locates a record;
 * it is never proof of a Cat/Fish identity or permission to mutate.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("proposal");
  const proposal = raw && UUID.test(raw) ? raw : null;
  const destination = proposal
    ? `/nest/together?proposal=${encodeURIComponent(proposal)}`
    : "/nest/together";

  if (resolveFixedLifeIdentity(request)) {
    return NextResponse.redirect(new URL(destination, url.origin));
  }
  const login = new URL("/login", url.origin);
  login.searchParams.set("next", destination);
  return NextResponse.redirect(login);
}
