import { NextResponse } from "next/server";
import { authorizeLifeRequest, lifeJsonError, readJsonBody, LIFE_NO_STORE_HEADERS } from "@/lib/server/life-api";
import { resolveFixedLifeIdentity } from "@/lib/server/fixed-life-auth";
import { listWishes, parseWishWrite, writeWish } from "@/lib/server/life-wishes";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
 const denied=await authorizeLifeRequest(request); if(denied) return denied;
 try { return NextResponse.json({ok:true,items:await listWishes()},{headers:LIFE_NO_STORE_HEADERS}); }
 catch { return lifeJsonError("心愿清单暂时无法读取，请稍后重试",503,"WISH_READ_FAILED"); }
}
export async function POST(request:Request) {
 const denied=await authorizeLifeRequest(request);if(denied)return denied;
 const actor=resolveFixedLifeIdentity(request)!.partnerKey;
 const body=await readJsonBody(request);if(!body.ok)return body.response;
 let data;
 try {data=parseWishWrite(body.value);}
 catch(e){return lifeJsonError(e instanceof Error?e.message:"填写内容不正确",400,"BAD_REQUEST");}
 try {
 const item=await writeWish(actor,null,data);
 return NextResponse.json({ok:true,item},{headers:LIFE_NO_STORE_HEADERS,status:201});
 } catch {return lifeJsonError("心愿暂时无法保存，请稍后重试",503,"WISH_WRITE_FAILED");}
}
