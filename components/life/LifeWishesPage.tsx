"use client";

import { useAppConfirm } from "@/components/ui/AppConfirmDialog";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { useStaleQuery } from "@/lib/client/use-stale-query";
import { wishIntent, type WishEntry, type WishCategory, type WishChecklistItem, type WishVisit, type WishWrite } from "@/lib/life/wish-list-model";

const EMPTY_WISHES: WishEntry[] = [];
const categories:Record<WishCategory,string>={go:"想去",play:"想玩",eat:"想吃",do:"想做"};
type View="active"|"want"|"again"|"done"|"all";
const empty=():WishWrite=>({title:"",category:"go",description:null,location:null,openingHours:null,priceNote:null,durationNote:null,bestTimeNote:null,practicalNotes:null,imagePath:null,referenceUrls:[],checklist:[],visits:[],wantToRepeat:true,archivedAt:null});
const fieldClass="mt-1 w-full rounded-xl border border-[var(--life-border)] bg-white px-3 py-2.5 text-sm text-[var(--life-text)]";
async function endpoint<T>(path:string,method="GET",data?:unknown):Promise<T> {
 const response=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data),cache:"no-store"});
 const result=await response.json().catch(()=>({error:"网络错误"}));
 if(!response.ok||!result.ok)throw new Error(result.error||"操作失败");
 return result as T;
}
export function LifeWishesPage(){
  const confirm = useAppConfirm();
 const { mePartnerKey } = useLifeIdentity();
 const fetcher = useCallback(async () => (await endpoint<{items:WishEntry[]}>("/api/life/wishes")).items, []);
 const wishesQuery = useStaleQuery<WishEntry[]>({ key: "wishes", fetcher, enabled: Boolean(mePartnerKey), staleMs: 30_000 });
 const entries = wishesQuery.data ?? EMPTY_WISHES;
 const loading = wishesQuery.loading;
 const setEntries = wishesQuery.update;
 const [error,setError]=useState("");
 const visibleError = error || wishesQuery.error?.message || "";
 const [filter,setFilter]=useState<View>("active");
 const [category,setCategory]=useState<WishCategory|"all">("all");
 const [search,setSearch]=useState("");
 const [editing,setEditing]=useState<WishEntry|null|undefined>(undefined);
 const [detail,setDetail]=useState<WishEntry|null>(null);
 const [form,setForm]=useState<WishWrite>(empty());
 const [saving,setSaving]=useState(false);
 const [photoFile,setPhotoFile]=useState<File|null>(null);
 const [preview,setPreview]=useState<string|null>(null);
 const [dirty,setDirty]=useState(false);
 const reload = useCallback(async () => {
   try { await wishesQuery.refresh(true); setError(""); }
   catch (e) { setError(e instanceof Error ? e.message : "读取失败"); }
 }, [wishesQuery.refresh]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};window.addEventListener("beforeunload",warn);return ()=>window.removeEventListener("beforeunload",warn);},[dirty]);
 const visible=useMemo(()=>entries.filter(x=>{
 const intent=wishIntent(x);const match=filter==="all"||filter==="active"&&intent!=="done"||filter===intent;
 return match&&(category==="all"||x.category===category)&&(x.title+" "+(x.location??"")+" "+(x.practicalNotes??"")).toLowerCase().includes(search.trim().toLowerCase());
 }),[entries,filter,category,search]);
 function openEditor(item?:WishEntry){setError("");setPhotoFile(null);setPreview(null);setDirty(false);setEditing(item??null);setForm(item?{title:item.title,category:item.category,description:item.description,location:item.location,openingHours:item.openingHours,priceNote:item.priceNote,durationNote:item.durationNote,bestTimeNote:item.bestTimeNote,practicalNotes:item.practicalNotes,imagePath:item.imagePath,referenceUrls:[...item.referenceUrls],checklist:item.checklist.map(x=>({...x})),visits:item.visits.map(x=>({...x,completedItemIds:[...x.completedItemIds]})),wantToRepeat:item.wantToRepeat,archivedAt:item.archivedAt}:empty());}
 async function save(){
 setSaving(true);try{
 const path=editing?"/api/life/wishes/"+editing.id:"/api/life/wishes";
 const result=await endpoint<{item:WishEntry}>(path,editing?"PATCH":"POST",form);
 let saved=result.item;
 setEditing(saved);
 setEntries(cur=>[saved,...cur.filter(x=>x.id!==saved.id)]);
 if(photoFile){
   const photoForm=new FormData();photoForm.set("file",photoFile);
   const response=await fetch("/api/life/wishes/"+saved.id+"/photo",{method:"PUT",body:photoForm});
   const payload=await response.json().catch(()=>({error:"封面上传失败"}));
   if(!response.ok||!payload.ok)throw new Error(payload.error||"封面上传失败");
   saved=payload.item as WishEntry;
   setEntries(cur=>[saved,...cur.filter(x=>x.id!==saved.id)]);
 }
 setDetail(saved);setEditing(undefined);setPhotoFile(null);setPreview(null);setDirty(false);setError("");
 }catch(e){setError(e instanceof Error?e.message:"保存失败");}finally{setSaving(false);}
 }
 async function remove(item:WishEntry){
 if (!(await confirm({ title: "删除这条心愿？", description: "「" + item.title + "」及其体验记录将被删除。", confirmLabel: "删除", tone: "danger" }))) return;
 try{await endpoint("/api/life/wishes/"+item.id,"DELETE");setEntries(xs=>xs.filter(x=>x.id!==item.id));setDetail(null);setEditing(undefined);setError("");}catch(e){setError(e instanceof Error?e.message:"删除失败");}
 }
 function addVisit(){setDirty(true);const visit:WishVisit={id:crypto.randomUUID(),visitedOn:new Date().toLocaleDateString("sv-SE"),note:null,completedItemIds:[]};setForm(x=>({...x,visits:[...x.visits,visit]}));}
 const input=(label:string,key:keyof WishWrite,multiline=false)=> <label className="block text-xs font-bold text-[var(--life-text-body)]">{label}{multiline?<textarea className={fieldClass} rows={3} value={String(form[key]??"")} onChange={e=>{setDirty(true);setForm(x=>({...x,[key]:e.target.value||null}));}}/>:<input className={fieldClass} value={String(form[key]??"")} onChange={e=>{setDirty(true);setForm(x=>({...x,[key]:e.target.value||null}));}}/>}</label>;
 async function closeEditor(){if(saving)return;if(dirty&&!(await confirm({ title: "放弃未保存的修改？", description: "这次编辑的内容还没有保存。", confirmLabel: "离开" })))return;setEditing(undefined);setPhotoFile(null);setPreview(null);setDirty(false);setError("");}
 async function removeCover(item:WishEntry){
  if (!(await confirm({ title: "移除封面图片？", description: "心愿内容和体验记录将保留。", confirmLabel: "移除", tone: "danger" }))) return;
  try{const result=await endpoint<{item:WishEntry}>("/api/life/wishes/"+item.id+"/photo","DELETE");setDetail(result.item);setEntries(xs=>xs.map(x=>x.id===item.id?result.item:x));setError("");}
  catch(e){setError(e instanceof Error?e.message:"移除封面失败");}
 }
 const cover=(item:WishEntry)=>"/api/life/wishes/"+item.id+"/photo?v="+encodeURIComponent(item.updatedAt);
 return <AppPageShell title="心愿清单" actions={<Link href="/nest" className="life-back-link">返回小窝</Link>}>
 <div className="grid gap-3">
 <div className="flex items-center gap-2"><input aria-label="搜索心愿" className={fieldClass+" !mt-0 flex-1"} placeholder="搜索心愿…" value={search} onChange={e=>setSearch(e.target.value)}/><button className="rounded-xl bg-[var(--life-teal)] px-4 py-3 text-sm font-bold text-white" onClick={()=>openEditor()}>＋ 新增</button></div>
 <div className="flex gap-2 overflow-x-auto pb-1">{([["active","待安排"],["want","想尝试"],["again","再来一次"],["done","已体验"],["all","全部"]] as [View,string][]).map(([v,n])=><button key={v} aria-pressed={filter===v} onClick={()=>setFilter(v)} className={"shrink-0 rounded-full px-3 py-2 text-xs font-bold "+(filter===v?"bg-[var(--life-teal)] text-white":"bg-white text-[var(--life-text-body)]")}>{n}</button>)}</div>
 <div className="flex flex-wrap gap-2">{([["all","全部"],["go","想去"],["play","想玩"],["eat","想吃"],["do","想做"]] as [WishCategory|"all",string][]).map(([v,n])=><button aria-pressed={category===v} key={v} onClick={()=>setCategory(v)} className={"rounded-xl border px-3 py-1.5 text-xs "+(category===v?"border-[var(--life-teal)] font-bold":"border-[var(--life-border)]")}>{n}</button>)}</div>
 {visibleError?<p role="alert" className="rounded-xl bg-white p-3 text-sm text-[var(--life-danger)]">{visibleError}<button type="button" onClick={() => void reload()} className="ml-2 underline">重试</button></p>:null}
 {loading && entries.length === 0 ? <p className="p-4 text-sm">正在读取…</p> : null}
 {!loading&&!visibleError&&visible.length===0?<p className="life-surface p-8 text-center text-sm text-[var(--life-text-muted)]">这里还没有心愿</p>:null}
 <div className="grid gap-2">{visible.map(x=><button key={x.id} onClick={()=>{setError("");setDetail(x);}} className="life-surface flex w-full items-center gap-3 rounded-2xl p-3 text-left"><span aria-hidden className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--life-cream)] text-xl">{x.imagePath?<Image unoptimized src={cover(x)} width={48} height={48} className="size-12 object-cover" alt=""/>:({go:"⌖",play:"✧",eat:"♨",do:"♡"} as const)[x.category]}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{x.title}</strong><span className="block truncate text-xs text-[var(--life-text-muted)]">{categories[x.category]}{x.location?" · "+x.location:""}</span></span><span className="shrink-0 text-xs text-[var(--life-text-muted)]">{({want:"想尝试",again:"值得再去",done:"已体验"} as const)[wishIntent(x)]}</span><span aria-hidden>›</span></button>)}</div>
 </div>
 {detail&&editing===undefined?<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-2 sm:items-center" onMouseDown={()=>setDetail(null)}><section role="dialog" aria-modal="true" aria-label={detail.title} onMouseDown={e=>e.stopPropagation()} className="island-life-v2 max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[26px] bg-[var(--life-surface)] p-4 text-[var(--life-text)]">
 <div className="flex items-start justify-between gap-2"><div><h2 className="text-xl font-extrabold">{detail.title}</h2><p className="mt-1 text-xs text-[var(--life-text-muted)]">{categories[detail.category]} · {({want:"想尝试",again:"值得再去",done:"已体验"} as const)[wishIntent(detail)]}</p></div><button onClick={()=>setDetail(null)} aria-label="关闭详情">✕</button></div>
 {error?<p role="alert" className="mt-3 rounded-xl bg-white p-3 text-sm text-[var(--life-danger)]">{error}</p>:null}
 {detail.imagePath?<Image unoptimized src={cover(detail)} width={640} height={360} className="mt-4 max-h-60 w-full rounded-2xl object-cover" alt={detail.title+"封面"}/>:null}
 <div className="mt-4 grid gap-3 text-sm">{([["地点",detail.location],["开放时间",detail.openingHours],["费用",detail.priceNote],["预计时长",detail.durationNote],["推荐时间",detail.bestTimeNote],["简介",detail.description],["攻略备注",detail.practicalNotes]] as [string,string|null][]).filter(([,v])=>v).map(([k,v])=><div key={k}><strong className="text-xs">{k}</strong><p className="mt-1 whitespace-pre-wrap text-[var(--life-text-body)]">{v}</p></div>)}
 {detail.checklist.length>0?<section><strong>必打卡 / 必体验</strong><ul className="mt-2 space-y-2">{detail.checklist.map(x=><li key={x.id}>○ {x.title}</li>)}</ul></section>:null}
 {detail.referenceUrls.length>0?<section><strong>参考链接</strong><div className="mt-2 grid gap-1">{detail.referenceUrls.map((u,i)=><a key={i} className="break-all text-[var(--life-teal)] underline" href={u} target="_blank" rel="noopener noreferrer">{u}</a>)}</div></section>:null}
 <section><strong>体验记录 · {detail.visits.length} 次</strong>{detail.visits.map(v=><div key={v.id} className="mt-2 rounded-xl bg-white p-3"><p className="font-bold">{v.visitedOn}</p>{v.note?<p className="whitespace-pre-wrap">{v.note}</p>:null}{v.completedItemIds.length?<p className="mt-1 text-xs text-[var(--life-text-muted)]">打卡 {v.completedItemIds.length} 个项目</p>:null}</div>)}</section></div>
 <div className="mt-5 flex gap-2"><button className="flex-1 rounded-xl bg-[var(--life-teal)] p-3 text-sm font-bold text-white" onClick={()=>{openEditor(detail);addVisit();}}>＋ 记录体验</button><button className="rounded-xl border border-[var(--life-border)] px-4 text-sm" onClick={()=>openEditor(detail)}>编辑</button><button className="rounded-xl border border-[var(--life-border)] px-3 text-sm text-[var(--life-danger)]" onClick={()=>void remove(detail)}>删除</button></div>
 {detail.imagePath?<button className="mt-3 text-xs text-[var(--life-text-muted)]" onClick={()=>void removeCover(detail)}>移除封面</button>:null}
 </section></div>:null}
 {editing!==undefined?<div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-2 sm:items-center"><section role="dialog" aria-modal="true" aria-label="编辑心愿" onChangeCapture={()=>setDirty(true)} className="island-life-v2 max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[26px] bg-[var(--life-surface)] p-4 text-[var(--life-text)]"><div className="flex justify-between"><h2 className="text-lg font-extrabold">{editing?"编辑心愿":"新增心愿"}</h2><button onClick={closeEditor} disabled={saving}>关闭</button></div>
 <div className="mt-4 grid gap-3">
 {input("名称","title")}
 <label className="text-xs font-bold">分类<select value={form.category} onChange={e=>{setDirty(true);setForm(x=>({...x,category:e.target.value as WishCategory}));}} className={fieldClass}>{Object.entries(categories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label className="block text-xs font-bold">封面图片<input className={fieldClass} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>{const file=e.target.files?.[0]??null;if(file&&file.size>10*1024*1024){setPhotoFile(null);setPreview(null);setError("封面图片不能超过 10MB");e.target.value="";return;}setPhotoFile(file);setPreview(file?URL.createObjectURL(file):null);setError("");setDirty(true);}}/>{preview?<Image unoptimized src={preview} width={480} height={270} alt="待上传封面" className="mt-2 max-h-52 w-full rounded-xl object-cover"/>:editing?.imagePath?<Image unoptimized src={cover(editing)} width={480} height={270} alt="当前封面" className="mt-2 max-h-52 w-full rounded-xl object-cover"/>:null}</label>
 {input("地点","location")}{input("开放时间","openingHours")}{input("费用","priceNote")}{input("预计时长","durationNote")}{input("推荐时间","bestTimeNote")}{input("介绍","description",true)}
 <section className="grid gap-2"><div className="flex justify-between"><strong className="text-sm">必打卡 / 必体验</strong><button className="text-xs text-[var(--life-teal)]" onClick={()=>{setDirty(true);setForm(x=>({...x,checklist:[...x.checklist,{id:crypto.randomUUID(),title:"",sortOrder:x.checklist.length}]}));}}>＋ 添加</button></div>{form.checklist.map((v,i)=><div key={v.id} className="flex gap-2"><input aria-label={"项目 "+(i+1)} className={fieldClass+" !mt-0 flex-1"} value={v.title} onChange={e=>{setDirty(true);setForm(x=>({...x,checklist:x.checklist.map(z=>z.id===v.id?{...z,title:e.target.value}:z)}));}}/><button aria-label="移除项目" onClick={()=>{setDirty(true);setForm(x=>({...x,checklist:x.checklist.filter(z=>z.id!==v.id),visits:x.visits.map(visit=>({...visit,completedItemIds:visit.completedItemIds.filter(id=>id!==v.id)}))}));}}>✕</button></div>)}</section>
 {input("攻略备注","practicalNotes",true)}
 <section className="grid gap-2"><div className="flex justify-between"><strong className="text-sm">参考链接</strong><button className="text-xs text-[var(--life-teal)]" onClick={()=>{setDirty(true);setForm(x=>({...x,referenceUrls:[...x.referenceUrls,""]}));}}>＋ 添加</button></div>{form.referenceUrls.map((u,i)=><div key={i} className="flex gap-2"><input aria-label={"链接 "+(i+1)} className={fieldClass+" !mt-0 flex-1"} value={u} onChange={e=>setForm(x=>({...x,referenceUrls:x.referenceUrls.map((a,j)=>i===j?e.target.value:a)}))}/><button aria-label="删除链接" onClick={()=>setForm(x=>({...x,referenceUrls:x.referenceUrls.filter((_,j)=>j!==i)}))}>✕</button></div>)}</section>
 <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.wantToRepeat} onChange={e=>setForm(x=>({...x,wantToRepeat:e.target.checked}))}/>希望以后再去 / 再做</label>
 <section className="grid gap-3"><div className="flex justify-between"><strong className="text-sm">体验记录</strong><button className="text-xs text-[var(--life-teal)]" onClick={addVisit}>＋ 添加体验</button></div>{form.visits.map(v=><div key={v.id} className="grid gap-2 rounded-xl border border-[var(--life-border)] p-3"><div className="flex gap-2"><input aria-label="体验日期" type="date" className={fieldClass+" !mt-0 flex-1"} value={v.visitedOn} onChange={e=>setForm(x=>({...x,visits:x.visits.map(a=>a.id===v.id?{...a,visitedOn:e.target.value}:a)}))}/><button aria-label="删除体验" onClick={()=>setForm(x=>({...x,visits:x.visits.filter(a=>a.id!==v.id)}))}>✕</button></div><textarea aria-label="体验感受" className={fieldClass} placeholder="这次感觉怎么样？" value={v.note??""} onChange={e=>setForm(x=>({...x,visits:x.visits.map(a=>a.id===v.id?{...a,note:e.target.value||null}:a)}))}/>{form.checklist.map((spot:WishChecklistItem)=><label className="flex gap-2 text-xs" key={spot.id}><input type="checkbox" checked={v.completedItemIds.includes(spot.id)} onChange={e=>setForm(x=>({...x,visits:x.visits.map(a=>a.id!==v.id?a:{...a,completedItemIds:e.target.checked?[...a.completedItemIds,spot.id]:a.completedItemIds.filter(id=>id!==spot.id)})}))}/>{spot.title||"未命名项目"}</label>)}</div>)}</section>
 {error?<p role="alert" className="text-sm text-[var(--life-danger)]">{error}</p>:null}
 <div className="sticky bottom-0 bg-[var(--life-surface)] py-2"><button disabled={saving||!form.title.trim()} className="w-full rounded-xl bg-[var(--life-teal)] p-3 text-sm font-extrabold text-white disabled:opacity-50" onClick={()=>void save()}>{saving?"保存中…":"保存心愿"}</button></div>
 </div></section></div>:null}
 </AppPageShell>;
}
