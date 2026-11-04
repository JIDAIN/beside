import { randomUUID } from "node:crypto";
import { listWishes } from "@/lib/server/life-wishes";
import type { WishEntry } from "@/lib/life/wish-list-model";

const url=(process.env.SUPABASE_URL||"https://bfhntnzngozdqsmgfvjk.supabase.co").replace(/\/$/,"");
const slug=process.env.COUPLE_SPACE_SLUG||"couple-better-game";
const bucket="wish-photos";
function headers(extra:Record<string,string>={}) {
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)throw new Error("数据库服务配置不完整");
 return {apikey:secret,Authorization:"Bearer "+secret,...extra};
}
const encode=(path:string)=>path.split("/").map(encodeURIComponent).join("/");
async function expectOk(response:Response,label:string){
 if(!response.ok)throw new Error(label+"失败（"+response.status+"）");
}
export async function getWish(id:string):Promise<WishEntry|null>{
 const items=await listWishes();
 return items.find(item=>item.id===id)??null;
}
export function wishPhotoPath(id:string){
 return slug+"/"+id+"/"+randomUUID()+".webp";
}
export async function uploadWishPhoto(path:string,bytes:Uint8Array) {
 const result=await fetch(url+"/storage/v1/object/"+bucket+"/"+encode(path),{
  method:"POST",headers:headers({"Content-Type":"image/webp","x-upsert":"false"}),
  body:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,cache:"no-store"
 });
 await expectOk(result,"上传封面");
}
export async function readWishPhoto(path:string){
 const response=await fetch(url+"/storage/v1/object/authenticated/"+bucket+"/"+encode(path),{
  headers:headers(),cache:"no-store"
 });
 await expectOk(response,"读取封面");
 return response;
}
export async function deleteWishPhoto(path:string){
 const response=await fetch(url+"/storage/v1/object/"+bucket,{
  method:"DELETE",headers:headers({"Content-Type":"application/json"}),
  body:JSON.stringify({prefixes:[path]}),cache:"no-store"
 });
 await expectOk(response,"删除封面");
}
export async function bindWishPhoto(id:string,path:string|null):Promise<WishEntry>{
 const response=await fetch(url+"/rest/v1/rpc/bind_life_wish_image",{
  method:"POST",headers:headers({"Content-Type":"application/json"}),
  body:JSON.stringify({p_space_slug:slug,p_id:id,p_new_path:path}),cache:"no-store"
 });
 await expectOk(response,"保存封面关联");
 return response.json() as Promise<WishEntry>;
}
