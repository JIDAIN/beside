import { NextResponse } from "next/server";
import { authorizeLifeRequest, LIFE_NO_STORE_HEADERS, lifeJsonError } from "@/lib/server/life-api";
import { MealPhotoCompressionError, compressMealPhoto } from "@/lib/server/image-compression";
import { bindWishPhoto, deleteWishPhoto, getWish, readWishPhoto, uploadWishPhoto, wishPhotoPath } from "@/lib/server/life-wish-photos";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
async function load(request:Request,context:Context){
 const denied=await authorizeLifeRequest(request);
 if(denied)return {error:denied};
 const {id}=await context.params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){
  return {error:lifeJsonError("无效心愿 ID",400,"BAD_ID")};
 }
 const wish=await getWish(id);
 if(!wish)return {error:lifeJsonError("心愿不存在",404,"NOT_FOUND")};
 return {wish};
}
export async function GET(request:Request,context:Context) {
 try {
  const state=await load(request,context);
  if(state.error)return state.error;
  if(!state.wish?.imagePath)return lifeJsonError("此心愿没有封面",404,"PHOTO_NOT_FOUND");
  const object=await readWishPhoto(state.wish.imagePath);
  return new Response(await object.arrayBuffer(),{headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return lifeJsonError("封面读取失败",502,"PHOTO_READ_FAILED");}
}
export async function PUT(request:Request,context:Context){
 try {
  const state=await load(request,context);
  if(state.error)return state.error;
  const wish=state.wish!;
  const data=await request.formData();
  const file=data.get("file");
  if(!(file instanceof File))return lifeJsonError("请选择图片",400,"PHOTO_REQUIRED");
  const compressed=await compressMealPhoto(await file.arrayBuffer(),file.type);
  const path=wishPhotoPath(wish.id);
  await uploadWishPhoto(path,compressed.bytes);
  let updated;
  try{updated=await bindWishPhoto(wish.id,path);}
  catch(e){await deleteWishPhoto(path).catch(()=>undefined);throw e;}
  if(wish.imagePath&&wish.imagePath!==path)await deleteWishPhoto(wish.imagePath).catch(()=>undefined);
  return NextResponse.json({ok:true,item:updated},{headers:LIFE_NO_STORE_HEADERS});
 }catch(e){
  if(e instanceof MealPhotoCompressionError)return lifeJsonError(e.message,400,e.code);
  return lifeJsonError("封面上传失败，心愿记录已保留，可重试上传",502,"PHOTO_UPLOAD_FAILED");
 }
}
export async function DELETE(request:Request,context:Context) {
 try{
  const state=await load(request,context);
  if(state.error)return state.error;
  const wish=state.wish!;
  const updated=await bindWishPhoto(wish.id,null);
  if(wish.imagePath)await deleteWishPhoto(wish.imagePath).catch(()=>undefined);
  return NextResponse.json({ok:true,item:updated},{headers:LIFE_NO_STORE_HEADERS});
 }catch{return lifeJsonError("删除封面失败",502,"PHOTO_DELETE_FAILED");}
}
