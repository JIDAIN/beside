-- Real final send path, but only disposable PostgreSQL and mocked HTTP.
\set ON_ERROR_STOP on
do $$
declare
 v_space uuid; v_proposal public.life_proposals%rowtype;
 v_content text;v_title text;v_result jsonb;v_link text;
begin
 v_link:='<a href="https://couple-better-game.vercel.app/nest/together" target="_blank" rel="noopener noreferrer">🌷 打开伴岛 Beside</a>';
 select id into v_space from public.couple_spaces where slug='couple-better-game';
 insert into public.life_proposals(couple_space_id,title,note,duration_minutes,scheduled_at)
 values(v_space,'去散步 & 看电影 <今晚>','带上水 & 纸巾 <别忘记>',45,now()+interval '2 days')
 returning * into v_proposal;
 perform private.life_proposal_notify(v_proposal,'fish','invite',now(),1);
 select title,content into v_title,v_content
 from public.life_reminder_instances where source_ref=v_proposal.id::text and recipient='fish';
 if v_content not like '%去散步 &amp; 看电影 &lt;今晚&gt;%' then
   raise exception 'proposal title missing/unsafe: %',v_content;end if;
 if v_content not like '%带上水 &amp; 纸巾 &lt;别忘记&gt;%' then
   raise exception 'proposal note missing/unsafe: %',v_content;end if;
 if v_content not like '%45 分钟%' or v_content not like '%北京时间%' then
   raise exception 'proposal schedule or duration missing';end if;

 truncate public.push_test_log;
 v_result:=private.life_pushplus_send('fish',v_title,v_content);
 if coalesce((v_result->>'ok')::boolean,false)=false then raise exception 'mock send failed: %',v_result;end if;
 select content into v_content from public.push_test_log limit 1;
 if v_content not like '%'||v_link then raise exception 'no clickable contextual footer: %',v_content;end if;
 if v_content not like '%带上水 &amp; 纸巾%' then raise exception 'note dropped from sent payload';end if;

 -- All other PushPlus sources get the shared website footer.
 truncate public.push_test_log;
 perform private.life_pushplus_send('cat','🌙 团子 · 伴岛晚间提醒','今日记录小结');
 select content into v_content from public.push_test_log limit 1;
 if v_content not like '%<a href="https://couple-better-game.vercel.app"%' then
   raise exception 'generic Beside link missing: %',v_content;end if;

 -- Idempotent decoration and fixed URL, no untrusted HTML in href.
 if private.life_pushplus_append_site_link(v_content,'🌙 团子 · 伴岛晚间提醒') is distinct from v_content then
   raise exception 'duplicate footer';end if;
 if private.life_pushplus_append_site_link('祝你今天开心','一起做吧') not like '%'||v_link then
   raise exception 'Together link routing failed';end if;
end $$;
