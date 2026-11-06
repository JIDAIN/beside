import { NextResponse } from "next/server";
import { LIFE_NO_STORE_HEADERS, authorizeLifeRequest, lifeJsonError, readJsonBody } from "@/lib/server/life-api";
import { resolveFixedLifeIdentity } from "@/lib/server/fixed-life-auth";
import { ProposalError, listTogetherProposals, mutateTogetherProposal, parseAction, parseCreate, parseRequestId } from "@/lib/server/life-proposals";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function errorResponse(error: unknown) {
  if (error instanceof ProposalError) return lifeJsonError(error.message, error.status, "PROPOSAL_ERROR");
  return lifeJsonError("操作暂时没有完成，请重试", 503, "PROPOSAL_ERROR");
}
export async function GET(request: Request) {
  const denied = await authorizeLifeRequest(request); if (denied) return denied;
  try { return NextResponse.json({ ok: true, items: await listTogetherProposals() }, { headers: LIFE_NO_STORE_HEADERS }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  const denied = await authorizeLifeRequest(request); if (denied) return denied;
  const body = await readJsonBody(request); if (!body.ok) return body.response;
  try {
    const input = parseCreate(body.value);
    const requestId = parseRequestId(body.value?.requestId);
    const actor = resolveFixedLifeIdentity(request)!.partnerKey;
    const item = await mutateTogetherProposal(actor, "create", null, input, 0, requestId);
    return NextResponse.json({ ok: true, item }, { status: 201, headers: LIFE_NO_STORE_HEADERS });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  const denied = await authorizeLifeRequest(request); if (denied) return denied;
  const body = await readJsonBody(request); if (!body.ok) return body.response;
  try {
    const { id, action, version, data } = parseAction(body.value);
    const requestId = parseRequestId(body.value?.requestId);
    const actor = resolveFixedLifeIdentity(request)!.partnerKey;
    const item = await mutateTogetherProposal(actor, action, id, data, version, requestId);
    return NextResponse.json({ ok: true, item }, { headers: LIFE_NO_STORE_HEADERS });
  } catch (error) { return errorResponse(error); }
}
