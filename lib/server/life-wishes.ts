import { validateWishInput, type WishEntry, type WishWrite } from "@/lib/life/wish-list-model";

const base = process.env.SUPABASE_URL || "https://bfhntnzngozdqsmgfvjk.supabase.co";
const slug = process.env.COUPLE_SPACE_SLUG || "couple-better-game";
function secret() { const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; if(!key) throw new Error("缺少数据库服务端配置"); return key; }
async function rpc<T>(name:string,payload:Record<string,unknown>):Promise<T> {
 const key=secret();
 const response=await fetch(base+"/rest/v1/rpc/"+name,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 if(!response.ok) throw new Error("心愿云端操作失败："+response.status);
 return response.json() as Promise<T>;
}
export function parseWishWrite(value:unknown):WishWrite {
 if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("心愿格式不正确");
 const v=value as Record<string,unknown>;
 const fields=["description","location","openingHours","priceNote","durationNote","bestTimeNote","practicalNotes","imagePath","archivedAt"];
 for(const field of fields) if(v[field]!==null&&v[field]!==undefined&&(typeof v[field]!=="string"||(v[field] as string).length>4000)) throw new Error("无效字段："+field);
 if(!Array.isArray(v.referenceUrls)||v.referenceUrls.length>20||v.referenceUrls.some((x:unknown)=>typeof x!=="string"||x.length>2000)) throw new Error("参考链接无效");
 if(!Array.isArray(v.checklist)||v.checklist.length>60||v.checklist.some((raw:unknown)=>{const x=raw as Record<string,unknown>|null;return !x||typeof x!=="object"||typeof x.id!=="string"||typeof x.title!=="string"||!Number.isInteger(x.sortOrder);})) throw new Error("打卡清单无效");
 if(!Array.isArray(v.visits)||v.visits.length>200||v.visits.some((raw:unknown)=>{const x=raw as Record<string,unknown>|null;return !x||typeof x!=="object"||typeof x.id!=="string"||typeof x.visitedOn!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(x.visitedOn)||!(x.note===null||(typeof x.note==="string"&&x.note.length<=1000))||!Array.isArray(x.completedItemIds)||x.completedItemIds.some((id:unknown)=>typeof id!=="string");})) throw new Error("体验记录无效");
 if(typeof v.wantToRepeat!=="boolean") throw new Error("重复体验意愿无效");
 const itemIds=new Set((v.checklist as {id:string}[]).map(x=>x.id));
 if(itemIds.size!==(v.checklist as unknown[]).length)throw new Error("打卡项目 ID 重复");
 if((v.visits as {completedItemIds:string[]}[]).some(visit=>visit.completedItemIds.some(id=>!itemIds.has(id))))throw new Error("体验记录包含不存在的打卡项目");
 if(new Set((v.visits as {id:string}[]).map(x=>x.id)).size!==(v.visits as unknown[]).length)throw new Error("体验记录 ID 重复");
 v.referenceUrls=(v.referenceUrls as string[]).map(x=>x.trim()).filter(Boolean);
 const errors=validateWishInput({title:String(v.title??""),category:String(v.category??""),referenceUrls:v.referenceUrls as string[],checklist:v.checklist as {title:string}[]});
 if(errors.length) throw new Error(errors.join("；"));
 return {title:(v.title as string).trim(),category:v.category as WishWrite["category"],description:(v.description as string|null)??null,location:(v.location as string|null)??null,openingHours:(v.openingHours as string|null)??null,priceNote:(v.priceNote as string|null)??null,durationNote:(v.durationNote as string|null)??null,bestTimeNote:(v.bestTimeNote as string|null)??null,practicalNotes:(v.practicalNotes as string|null)??null,imagePath:null,referenceUrls:v.referenceUrls as string[],checklist:v.checklist as WishWrite["checklist"],visits:v.visits as WishWrite["visits"],wantToRepeat:v.wantToRepeat,archivedAt:(v.archivedAt as string|null)??null};
}
export const listWishes=()=>rpc<WishEntry[]>("list_life_wishes",{p_space_slug:slug});
export const writeWish=(actor:"cat"|"fish",id:string|null,data:WishWrite|null,remove=false)=>rpc<WishEntry>("write_life_wish",{p_space_slug:slug,p_actor:actor,p_id:id,p_data:data,p_delete:remove});
