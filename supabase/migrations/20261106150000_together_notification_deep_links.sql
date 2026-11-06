-- Deep link existing PushPlus Together notifications to their exact proposal.
-- The entry point still requires a trusted Web session, with password login on first visit.
-- This migration only changes future generated notification copies.
create or replace function private.life_proposal_notify(
 p public.life_proposals,p_recipient text,p_kind text,p_at timestamptz,p_version integer
) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_title text; v_body text; v_variant integer; v_intro text; v_outro text; v_name text; v_date text; v_suffix text; v_note text; v_duration text;
begin
 if p_recipient not in ('cat','fish') then raise exception 'invalid recipient'; end if;
 v_title := case p_kind
  when 'invite' then '一起做吧｜收到新邀请 ♡'
  when 'counter' then '一起做吧｜Ta 提出了新建议'
  when 'accepted' then '一起做吧｜小约定成立啦'
  when 'changed' then '一起做吧｜时间调整好啦'
  when 'declined' then '一起做吧｜这次先休息'
  when 'unchanged' then '一起做吧｜保留原来的约定'
  when 'cancelled' then '一起做吧｜约定已取消'
  when 'withdrawn' then '一起做吧｜邀请已撤回'
  when 'before' then '一起做吧｜小约定快开始啦'
  when 'encourage' then '一起做吧｜拉你一把 ♡'
  when 'result' then '一起做吧｜今天做得怎么样？'
  when 'followup' then '一起做吧｜有件小事待确认'
  else '一起做吧｜团子的小提醒' end;
 v_body := case p_kind
  when 'invite' then 'Ta 邀请你一起做件小事，打开伴岛看看吧。'
  when 'counter' then 'Ta 想调整一下时间或时长，等你回应哦。'
  when 'accepted' then '我们的小约定定好啦！'
  when 'changed' then '新的约定时间已经确认啦。'
  when 'declined' then '这次邀请先结束了，下次再一起做吧。'
  when 'unchanged' then '这次先按原约定进行，有需要也可以再商量。'
  when 'cancelled' then 'Ta 已经取消了这次约定，不需要再准备啦。'
  when 'withdrawn' then 'Ta 已撤回这次邀请，下次再一起做点小事吧。'
  when 'before' then '可以慢慢准备一下啦，不必追求完美。'
  when 'encourage' then '你说过愿意被拉一把，先试 5 分钟也很好呀。'
  when 'result' then '我们的小约定进行得怎么样？去小窝轻轻记录一下吧。'
  when 'followup' then '如果已经做了，可以回来补记；不想记录也没关系。'
  else '打开伴岛看看吧。' end;
 -- Keep the proposal title and scheduled time factual, HTML-escaped for PushPlus.
 v_variant:=private.tuanzi_copy_variant(p.id::text||':'||p_kind||':'||p_version||':'||p_recipient);
 v_name:=replace(replace(replace(coalesce(p.title,''),'&','&amp;'),'<','&lt;'),'>','&gt;');
 -- User-entered note may contain markup: truncate first, then escape before HTML.
 v_note:=replace(replace(replace(left(btrim(coalesce(p.note,'')),220),'&','&amp;'),'<','&lt;'),'>','&gt;');
 v_note:=replace(replace(v_note,E'\r\n','<br>'),E'\n','<br>');
 v_duration:=coalesce(case when p_kind in ('counter','changed') then p.candidate_duration end,p.duration_minutes)::text;
 v_date:=to_char(coalesce(case when p_kind in ('counter','changed') then p.candidate_at end,p.scheduled_at) at time zone 'Asia/Shanghai','MM月DD日 HH24:MI');
 v_intro:=case v_variant
   when 1 then '主人主人～团子来给你送消息啦！💗'
   when 2 then '亲爱的主人～有件关于你和老婆的小事呀～ 🌷'
   when 3 then '主人～团子悄悄来报个信啦！💕'
   when 4 then '报告主人～伴岛「一起做吧」有新消息哦！✨'
   else '主人主人～宝贝老婆的小约定有进展啦～ 💌' end;
 v_outro:=case v_variant
   when 1 then '有空再看看吧，不用着急呀～'
   when 2 then '团子把消息带到啦～'
   when 3 then '一起慢慢商量就好～'
   when 4 then '去伴岛看看详情吧～'
   else '小约定也要轻轻松松的呀～' end;
 -- Avoid claiming a partner initiated a system-scheduled reminder.
 v_body:=v_intro||'<br><br>'
   ||case p_kind
     when 'invite' then '亲亲老婆邀请你一起做：'
     when 'counter' then '老婆给这个小约定提出了新建议：'
     when 'accepted' then '你们的小约定已经定好啦：'
     when 'changed' then '你们确认了新的约定时间：'
     when 'declined' then '老婆这次想先休息，下次有机会再一起做：'
     when 'unchanged' then '这次先保留原来的约定：'
     when 'cancelled' then '这个小约定已经取消啦：'
     when 'withdrawn' then '这个邀请已经撤回啦：'
     when 'before' then '你们的小约定快开始啦：'
     when 'encourage' then '你之前想让团子轻轻拉你一把：'
     when 'result' then '小约定结束啦，来记录一下真实的完成情况吧：'
     when 'followup' then '这个小约定还有结果可以补充：'
     else '你们的小约定有新消息：' end
   ||'<br><b>'||v_name||'</b>'
   ||'<br>🕒 '||v_date||'（北京时间）'
   ||'<br>⏳ '||v_duration||' 分钟'
   ||case when v_note<>'' then '<br>📝 '||v_note||case when char_length(btrim(coalesce(p.note,'')))>220 then '…' else '' end else '' end
   ||'<br><br>'||v_outro||' ——团子';
 -- A record-specific link survives the existing generic Beside footer.
 -- The UUID is a locator, never an authentication credential.
 v_body:=v_body||'<br><br><a href="https://couple-better-game.vercel.app/open/together?proposal='
   ||p.id::text||'">🌷 查看这条约定</a>';
 v_title:='💌 团子 · Beside 一起做吧';
 insert into public.life_reminder_instances(
  couple_space_id,recipient,source_kind,source_ref,title,content,due_at,dedupe_key,metadata
 ) values(
  p.couple_space_id,p_recipient,'proposal',p.id::text,v_title,v_body,greatest(p_at,now()),
  'proposal:'||p.id::text||':'||p_kind||':'||p_version::text||':'||p_recipient,
  jsonb_build_object('proposalId',p.id,'phase',p_kind,'destination','/nest/together')
 ) on conflict(couple_space_id,recipient,dedupe_key) do update
   set status='pending', snoozed_until=null,
       due_at=excluded.due_at, title=excluded.title, content=excluded.content, updated_at=now()
   where public.life_reminder_instances.notified_at is null
     and public.life_reminder_instances.status='dismissed';
end; $$;



revoke all on function private.life_proposal_notify(public.life_proposals,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function private.life_proposal_notify(public.life_proposals,text,text,timestamptz,integer) to service_role;
