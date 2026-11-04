import { NextResponse } from "next/server";
import { authorizeLifeRequest, lifeJsonError, readJsonBody, LIFE_NO_STORE_HEADERS } from "@/lib/server/life-api";
import { resolveFixedLifeIdentity } from "@/lib/server/fixed-life-auth";
import { parseWishWrite, writeWish } from "@/lib/server/life-wishes";
import { deleteWishPhoto, getWish } from "@/lib/server/life-wish-photos";
export const runtime="nodejs";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) {
 const denied=await authorizeLifeRequest(request);if(denied)return denied;
 const {id}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(id))return lifeJsonError("心愿 ID 无效",400,"BAD_ID");
 const body=await readJsonBody(request);if(!body.ok)return body.response;
 let data;
 try {data=parseWishWrite(body.value);}
 catch(e){return lifeJsonError(e instanceof Error?e.message:"填写内容不正确",400,"BAD_REQUEST");}
 try {const item=await writeWish(resolveFixedLifeIdentity(request)!.partnerKey,id,data);return NextResponse.json({ok:true,item},{headers:LIFE_NO_STORE_HEADERS});}
 catch {return lifeJsonError("心愿暂时无法保存，请稍后重试",503,"WISH_WRITE_FAILED");}
}
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}) {
 const denied=await authorizeLifeRequest(request);if(denied)return denied;
 const {id}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(id))return lifeJsonError("心愿 ID 无效",400,"BAD_ID");
 try {
 const current=await getWish(id);
 if(!current)return lifeJsonError("心愿不存在",404,"NOT_FOUND");
 await writeWish(resolveFixedLifeIdentity(request)!.partnerKey,id,null,true);
 if(current.imagePath)await deleteWishPhoto(current.imagePath).catch(()=>undefined);
 return NextResponse.json({ok:true},{headers:LIFE_NO_STORE_HEADERS});
 }
 catch {return lifeJsonError("删除失败，请稍后重试",503,"WISH_DELETE_FAILED");}
}
