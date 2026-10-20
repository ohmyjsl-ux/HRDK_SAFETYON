import {escapeHtml as esc,STATUSES,safeCell} from './report-core.mjs';
const $=id=>document.getElementById(id);
let rows=[],offset=0,loading=false,authVersion=0;
const status=$('reportStatusFilter'),list=$('reportList'),feedback=$('reportAdminMessage');
function note(text,bad=false){feedback.textContent=text;feedback.hidden=false;feedback.style.color=bad?'#b42318':'#526a86';}
async function call(body){
  const client=window.__safetyAdminBridge?.getClient();
  if(!client)throw Error('먼저 관리자 계정으로 로그인해 주세요.');
  const {data:{session}}=await client.auth.getSession();
  if(!session)throw Error('관리자 로그인이 필요합니다.');
  const cfg=window.SAFETY_ON_SUPABASE||{},base=(window.SAFETY_ON_REPORT?.functionsBaseUrl||`${cfg.url}/functions/v1`).replace(/\/$/,'');
  const r=await fetch(`${base}/safety-report-admin`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  let d;try{d=await r.json();}catch{throw Error('안전신문고 연결을 확인해 주세요.');}
  if(!r.ok)throw Error(d.error||'안전신문고를 불러오지 못했습니다.');return d;
}
function dateText(value){return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function render(){
  $('reportLoadedCount').textContent=`${rows.length}건 불러옴`;
  list.innerHTML=rows.length?rows.map(r=>`<article class="notice" data-report="${esc(r.id)}"><div class="notice-head"><strong>${esc(r.receipt_number)}</strong><span class="order-chip">${esc(r.reporter_type)}</span>${r.ai_used?'<span class="order-chip">AI 초안 활용</span>':''}<span class="state">${esc(r.status)}</span></div><p class="meta">확인일 ${esc(r.report_date)} · 접수 ${esc(dateText(r.created_at))}</p><h3 style="font-size:1rem;margin:8px 0">${esc(r.location)}</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.content)}</p><details><summary style="cursor:pointer;color:#1268e5;font-weight:700">연락처·사진·처리내용 확인</summary><p class="meta">${r.phone?`동의한 연락처: ${esc(r.phone)}`:'연락처 없음 또는 처리 완료 후 파기됨'}</p>${r.has_image?`<button type="button" class="report-photo btn light" data-id="${esc(r.id)}">첨부사진 보기</button><div class="report-photo-slot"></div>`:''}<label style="display:block;font-weight:700;margin:12px 0 6px" for="state-${esc(r.id)}">처리상태</label><select id="state-${esc(r.id)}" class="report-state" style="padding:10px;border:1px solid #cbd5e1;border-radius:10px;width:100%">${STATUSES.map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select><label style="display:block;font-weight:700;margin:12px 0 6px" for="note-${esc(r.id)}">조치내용·관리자 메모</label><textarea id="note-${esc(r.id)}" class="report-note" maxlength="2000" style="width:100%;min-height:100px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;box-sizing:border-box">${esc(r.action_note)}</textarea><p class="meta">조치완료·종결로 저장하면 연락처와 첨부사진이 파기되며 다시 열 수 없습니다.</p><button type="button" class="report-save btn" data-id="${esc(r.id)}">처리내용 저장</button><p class="report-result meta" role="status"></p></details></article>`).join(''):'<p class="empty">접수된 신고가 없습니다.</p>';
  list.querySelectorAll('.report-photo').forEach(b=>b.onclick=async()=>{b.disabled=true;const slot=b.closest('details').querySelector('.report-photo-slot');try{const d=await call({action:'photo',id:b.dataset.id});const url=new URL(d.url);if(url.protocol!=='https:')throw Error('사진 주소를 확인할 수 없습니다.');slot.replaceChildren();const img=document.createElement('img');img.alt='접수된 현장 사진';img.src=url.href;img.style.cssText='display:block;width:100%;max-height:400px;object-fit:contain;margin:12px 0;border-radius:12px';slot.append(img);}catch(e){slot.textContent=e.message;}finally{b.disabled=false;}});
  list.querySelectorAll('.report-save').forEach(b=>b.onclick=async()=>{
    const article=b.closest('[data-report]'),r=rows.find(x=>x.id===b.dataset.id),next=article.querySelector('.report-state').value,result=article.querySelector('.report-result');
    if(['조치완료','종결'].includes(next)&&!confirm('연락처와 첨부사진을 파기하고 처리 완료로 저장할까요? 이 작업은 되돌릴 수 없습니다.'))return;
    b.disabled=true;result.textContent='저장 중…';
    try{const saved=await call({action:'update',id:r.id,status:next,actionNote:article.querySelector('.report-note').value,expectedUpdatedAt:r.updated_at});await load();note(saved.cleanup_pending?'처리내용과 연락처 파기는 완료했습니다. 사진 파기가 지연되어 다음 새로고침 시 재시도합니다.':'처리내용을 저장했습니다.',saved.cleanup_pending);}catch(e){result.textContent=e.message;result.style.color='#b42318';}finally{b.disabled=false;}
  });
}
async function load(append=false){
  if(loading)return;loading=true;$('reportRefresh').disabled=true;
  const version=authVersion;
    try{if(!append){offset=0;rows=[];}const d=await call({action:'list',status:status.value,offset});if(version!==authVersion)return;rows.push(...d.rows);offset+=d.rows.length;render();$('reportMore').hidden=!d.has_more;if(d.cleanup_pending)note('처리 완료된 사진 중 파기 대기 항목이 있습니다. 서버 연결을 확인하고 새로고침해 주세요.',true);else feedback.hidden=true;}
  catch(e){if(version!==authVersion)return;note(e.message,true);if(!rows.length)list.innerHTML='<p class="empty">안전신문고를 불러오지 못했습니다.</p>';}
  finally{loading=false;$('reportRefresh').disabled=false;}
}
$('reportRefresh').onclick=()=>load();$('reportMore').onclick=()=>load(true);status.onchange=()=>load();
$('reportExport').onclick=()=>{
  if(!rows.length)return note('내보낼 신고가 없습니다.');
  const header=['접수번호','이용자 구분','확인일자','장소/분야','신고내용','AI초안 활용','상태','조치내용','접수시각'];
  const data=[header,...rows.map(r=>[r.receipt_number,r.reporter_type,r.report_date,r.location,r.content,r.ai_used?'예':'아니오',r.status,r.action_note,dateText(r.created_at)])];
  const csv='\uFEFF'+data.map(row=>row.map(v=>'"'+safeCell(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='안전신문고_불러온신고.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('safety-admin-ready',()=>load());
window.addEventListener('safety-admin-logout',()=>{authVersion++;rows=[];offset=0;loading=false;list.replaceChildren();$('reportLoadedCount').textContent='';$('reportMore').hidden=true;feedback.hidden=true;});
if(window.__safetyAdminBridge?.getClient())load();
