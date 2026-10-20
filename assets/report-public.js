import {escapeHtml as esc} from './report-core.mjs';
const $=id=>document.getElementById(id),cfg=window.SAFETY_ON_REPORT||{},db=window.SAFETY_ON_SUPABASE||{};
const preview=cfg.preview===true||new URLSearchParams(location.search).get('preview')==='1'||location.protocol==='file:';
let statsBusy=false,resultsBusy=false,resultsLoaded=false,offset=0,publications=[];
const sizeText=n=>Number(n)<1024*1024?`${Math.max(1,Math.round(Number(n)/1024))}KB`:`${(Number(n)/1024/1024).toFixed(1)}MB`;
async function publicCall(body){
  if(preview)throw Error('연결 설정 후 실제 자료를 확인할 수 있습니다.');
  const base=(cfg.functionsBaseUrl||`${db.url}/functions/v1`).replace(/\/$/,'');
  const r=await fetch(base+'/safety-report-public',{method:'POST',headers:{'Content-Type':'application/json',apikey:db.publishableKey},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  let d;try{d=await r.json();}catch{throw Error('공개 자료 연결을 확인해 주세요.');}
  if(!r.ok)throw Error(d.error||'자료를 불러오지 못했습니다.');return d;
}
async function loadStats(){
  if(statsBusy)return;statsBusy=true;
  try{
    const d=await publicCall({action:'stats'}),c=d.counts;
    if(!c||!['received','processing','completed','total'].every(k=>Number.isSafeInteger(Number(c[k]))&&Number(c[k])>=0)||Number(c.total)!==Number(c.received)+Number(c.processing)+Number(c.completed))throw Error('집계 정보를 확인하지 못했습니다.');
    for(const [id,k] of [['statTotal','total'],['statReceived','received'],['statProcessing','processing'],['statCompleted','completed']])$(id).textContent=Number(c[k]).toLocaleString('ko-KR');
    const time=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d.as_of));
    $('statsMessage').textContent=`${time} 기준`;
  }catch{$('statsMessage').textContent=preview?'연결 후 현황 표시':'현황을 갱신하지 못했습니다.';}
  finally{statsBusy=false;}
}
function selectTab(results){
  for(const [id,on] of [['reportTab',!results],['resultsTab',results]]){$(id).setAttribute('aria-selected',String(on));$(id).tabIndex=on?0:-1;}
  $('reportPanel').hidden=results;$('resultsPanel').hidden=!results;
  if(results&&!resultsLoaded)void loadPublications();
}
$('reportTab').onclick=()=>selectTab(false);$('resultsTab').onclick=()=>selectTab(true);
for(const id of ['reportTab','resultsTab'])$(id).onkeydown=e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
  const results=e.key==='End'||e.key!=='Home'&&id==='reportTab';selectTab(results);$(results?'resultsTab':'reportTab').focus();
};
async function openPDF(button,id){
  const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
  button.disabled=true;const message=button.parentElement.querySelector('.pdf-message');
  try{
    const d=await publicCall({action:'publication-open',id}),url=new URL(d.url);
    if(url.protocol!=='https:'||url.origin!==new URL(db.url).origin)throw Error('자료 주소를 확인할 수 없습니다.');
    const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='PDF 열기 ↗';message.replaceChildren(link);
    if(popup)popup.location.replace(url.href);
  }catch(e){if(popup)popup.close();message.textContent=e.message;}
  finally{button.disabled=false;}
}
async function loadPublications(append=false){
  if(resultsBusy)return;resultsBusy=true;$('resultsRefresh').disabled=true;$('publicationsMore').disabled=true;$('resultsMessage').textContent='개선결과 자료를 불러오고 있습니다.';
  try{
    const start=append?offset:0,d=await publicCall({action:'publications',offset:start});
    if(!Array.isArray(d.rows))throw Error('자료를 확인하지 못했습니다.');
    publications=append?[...publications,...d.rows]:d.rows;offset=start+d.rows.length;resultsLoaded=true;
    $('publicationsList').innerHTML=publications.map(p=>`<article class="card result-document"><span class="document-month">${esc(p.report_month.slice(0,7).replace('-','년 '))}월</span><h3>${esc(p.title)}</h3><p class="help document-summary">${esc(p.summary)}</p><div class="document-bottom"><span class="tiny">PDF · ${sizeText(p.file_size)}</span><button class="button primary publication-open" type="button" data-id="${esc(p.id)}">PDF 보기 ↗</button><span class="pdf-message help" role="status"></span></div></article>`).join('');
    $('publicationsList').querySelectorAll('.publication-open').forEach(b=>b.onclick=()=>openPDF(b,b.dataset.id));
    $('publicationsMore').hidden=!d.has_more;$('resultsMessage').textContent=publications.length?`${publications.length}건의 게시 자료를 불러왔습니다.`:'아직 게시된 개선결과 자료가 없습니다.';
  }catch(e){$('resultsMessage').textContent=e.message;}
  finally{resultsBusy=false;$('resultsRefresh').disabled=false;$('publicationsMore').disabled=false;}
}
$('resultsRefresh').onclick=()=>loadPublications();$('publicationsMore').onclick=()=>loadPublications(true);
window.addEventListener('safety-report-submitted',()=>void loadStats());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void loadStats();});
setInterval(()=>{if(!document.hidden)void loadStats();},60000);void loadStats();
