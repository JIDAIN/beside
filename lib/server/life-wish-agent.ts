import { buildWishCreate, buildWishUpdate, buildWishVisit, normalizeWishCategory, wishFields } from "@/lib/life/wish-ai";
import { wishIntent, type WishEntry } from "@/lib/life/wish-list-model";
import { listWishes, parseWishWrite, writeWish } from "./life-wishes";

type Actor = "cat" | "fish";
type Query = { id?:unknown; name?:unknown; category?:unknown; status?:unknown; limit?:unknown };

function text(value:unknown) {return typeof value==="string"?value.trim():"";}
function uuid(value:string) {return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
function normalizeName(value:string) {return value.trim().normalize("NFKC").toLocaleLowerCase();}
function isSameWish(a:WishEntry, name:string, category:string) {
 return normalizeName(a.title)===normalizeName(name) && a.category===category;
}

export async function queryAgentWishes(query:Query) {
 const all=await listWishes();
 const id=text(query.id);
 if(id && !uuid(id))throw new Error("心愿 ID 无效");
 const name=text(query.name).toLocaleLowerCase();
 const categoryRaw=query.category;
 const category=categoryRaw===undefined?null:normalizeWishCategory(categoryRaw);
 if(categoryRaw!==undefined && !category)throw new Error("心愿分类无效");
 const status=text(query.status).toLowerCase();
 if(status && !["want","again","done","active","all"].includes(status))throw new Error("状态只能是 want/again/done/active/all");
 const limit=Math.max(1,Math.min(1000,Number(query.limit??100)||100));
 return all.filter(item=>(!id||item.id===id)&&(!name||(item.title+" "+(item.location??"")+" "+(item.practicalNotes??"")).toLocaleLowerCase().includes(name))&&(!category||item.category===category)&&(!status||status==="all"||(status==="active"?wishIntent(item)!=="done":wishIntent(item)===status))).slice(0,limit);
}

export async function mutateAgentWish(action:string,idRaw:unknown,input:unknown,actor:Actor) {
 if(action==="create") {
   const payload=parseWishWrite(buildWishCreate(input));
   const existing=(await listWishes()).find(item=>isSameWish(item,payload.title,payload.category));
   if(existing)return {item:existing,alreadyExists:true,message:"已有同名同分类心愿，未重复新增；如需补充请使用 update 并指定 ID"};
   const item=await writeWish(actor,null,payload);
   return {item,alreadyExists:false};
 }
 const id=text(idRaw);
 if(!uuid(id))throw new Error("修改、打卡或删除心愿必须先查询并提供有效的记录 ID");
 const existing=(await listWishes()).find(item=>item.id===id);
 if(!existing)throw new Error("该心愿不存在，请先查询最新清单");
 if(action==="delete") {
   const deleted=await writeWish(actor,id,null,true);
   return {deletedId:id,deleted:true,item:deleted};
 }
 if(action==="update") {
   const payload=parseWishWrite(buildWishUpdate(wishFields(existing),input));
   return {item:await writeWish(actor,id,payload),updated:true};
 }
 if(action==="add_visit") {
   const payload=parseWishWrite(buildWishVisit(existing,input));
   return {item:await writeWish(actor,id,payload),visitAdded:true};
 }
 throw new Error("心愿仅支持 create/update/add_visit/delete");
}
