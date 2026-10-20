import {escapeHtml as esc,koreanDate} from './report-core.mjs';
const $=id=>document.getElementById(id);
const sizeText=n=>Number(n)<1024*1024?`${Math.max(1,Math.round(Number(n)/1024))}KB`:`${(Number(n)/1024/1024).toFixed(1)}MB`;
let rows=[],offset=0,loading=false,uploading=false,authVersion=0,uploadId=crypto.randomUUID();
const month=$('publicationMonth'),title=$('publicationTitle'),file=$('publicationFile'),message=$('publicationAdminMessage');
month.value=koreanDate().slice(0,7);
function note(text,bad=false){message.textContent=text;message.style.color=bad?'#b42318':'#526a86';message.hidden=false;}
async function call(body){
  const version=authVersion,client=window.__safetyAdminBridge?.getClient();if(!client)throw Error('관리자 로그인이 필요합니다.');
  const {data:{session}}=await client.auth.getSession();if(!session||version!==authVersion)throw Error('관리자 로그인이 필요합니다.');
  const cfg=window.SAFETY_ON_SUPABASE||{},base=(window.SAFETY_ON_REPORT?.functionsBaseUrl||`${cfg.url}/functions/v1`).replace(/\/$/,'');
  const r=await fetch(base+'/safety-report-admin',{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  let d;try{d=await r.json();}catch{throw Error('자료 연결을 확인해 주세요.');}if(version!==authVersion)throw Error('관리자 로그인이 변경되었습니다.');
  if(!r.ok)throw Error(d.error||'자료를 처리하지 못했습니다.');return d;
}
function render(){
  $('publicationLoadedCount').textContent=`${rows.length}건 불러옴`;
  $('publicationAdminList').innerHTML=rows.length?rows.map(p=>`<article class="notice publication-document" data-publication="${esc(p.id)}"><div class="notice-head"><strong>${esc(p.report_month.slice(0,7))}</strong><span class="state">${p.published?'게시중':'비공개'}</span><span class="order-chip">PDF · ${sizeText(p.file_size)}</span></div><h3>${esc(p.title)}</h3><p class="meta summary">${esc(p.summary)}</p><div class="publication-actions"><button class="btn light publication-preview" type="button">PDF 확인 ↗</button><button class="btn publication-toggle" type="button">${p.published?'비공개로 전환':'공유용 PDF 게시'}</button></div><p class="publication-preview-message meta" role="status"></p><details><summary>제목·설명 수정</summary><div class="publication-edit"><label>대상 월<input class="pub-month" type="month" value="${esc(p.report_month.slice(0,7))}"></label><label>제목<input class="pub-title" maxlength="120" value="${esc(p.title)}"></label><label>설명<textarea class="pub-summary" maxlength="800" rows="3">${esc(p.summary)}</textarea></label><button type="button" class="btn light publication-save">수정 저장</button></div></details><p class="publication-save-message meta" role="status"></p></article>`).join(''):'<p class="empty">등록된 월별 결과 자료가 없습니다.</p>';
  $('publicationAdminList').querySelectorAll('[data-publication]').forEach(article=>{
    const p=rows.find(r=>r.id===article.dataset.publication);
    article.querySelector('.publication-preview').onclick=async e=>{
      const version=authVersion,b=e.currentTarget,slot=article.querySelector('.publication-preview-message'),popup=window.open('about:blank','_blank');if(popup)popup.opener=null;b.disabled=true;
      try{const d=await call({action:'publication-open',id:p.id}),url=new URL(d.url),base=new URL(window.SAFETY_ON_SUPABASE.url);if(url.protocol!=='https:'||url.origin!==base.origin)throw Error('PDF 주소를 확인할 수 없습니다.');if(version!==authVersion)throw Error('로그인이 변경되었습니다.');const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='PDF 열기 ↗';slot.replaceChildren(a);if(popup)popup.location.replace(url.href);}catch(error){if(popup)popup.close();slot.textContent=error.message;}finally{b.disabled=false;}
    };
    async function save(button,published,edit=false){
      const version=authVersion,slot=article.querySelector('.publication-save-message');
      if(published&&!p.published&&!confirm('개인정보·결재자 서명·기밀정보 등이 제외된 공유용 PDF인지 확인하셨나요? 확인한 자료를 이용자 화면에 게시합니다.'))return;
      if(!published&&p.published&&!confirm('이 자료를 이용자 목록에서 숨길까요? 이미 발급된 PDF 링크는 최대 5분 동안 열릴 수 있습니다.'))return;
      button.disabled=true;slot.textContent='저장 중…';
      try{await call({action:'publication-update',id:p.id,title:edit?article.querySelector('.pub-title').value:p.title,reportMonth:edit?article.querySelector('.pub-month').value:p.report_month.slice(0,7),summary:edit?article.querySelector('.pub-summary').value:p.summary,published,publicReviewed:published&&!p.published,expectedUpdatedAt:p.updated_at});if(version!==authVersion)return;await load();note(published?'게시 자료를 저장했습니다. 이용자 화면의 자료 새로고침으로 확인할 수 있습니다.':'비공개로 저장했습니다.');}catch(error){slot.textContent=error.message;}finally{button.disabled=false;}
    }
    article.querySelector('.publication-toggle').onclick=e=>save(e.currentTarget,!p.published);
    article.querySelector('.publication-save').onclick=e=>save(e.currentTarget,p.published,true);
  });
}
async function load(append=false){
  if(loading)return;loading=true;const version=authVersion;$('publicationRefresh').disabled=true;
  try{const start=append?offset:0,d=await call({action:'publications-list',offset:start});if(version!==authVersion)return;rows=append?[...rows,...d.rows]:d.rows;offset=start+d.rows.length;render();$('publicationAdminMore').hidden=!d.has_more;message.hidden=true;}
  catch(error){if(version===authVersion)note(error.message,true);}
  finally{loading=false;$('publicationRefresh').disabled=false;}
}
file.onchange=()=>{uploadId=crypto.randomUUID();};
$('publicationForm').onsubmit=async e=>{
  e.preventDefault();if(uploading)return;const version=authVersion,selected=file.files?.[0];
  if(!month.value||!title.value.trim())return note('대상 월과 제목을 입력해 주세요.',true);
  if(!selected||!selected.name.toLowerCase().endsWith('.pdf')||selected.size>8*1024*1024||!selected.size)return note('8MB 이하의 PDF 파일을 선택해 주세요.',true);
  uploading=true;$('publicationUpload').disabled=true;note('PDF를 비공개로 등록하고 있습니다.');
  try{
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('PDF를 읽을 수 없습니다.'));reader.readAsDataURL(selected);});
    if(version!==authVersion)return;
    await call({action:'publication-upload',id:uploadId,title:title.value,reportMonth:month.value,summary:$('publicationSummary').value,fileBase64:data});
    if(version!==authVersion)return;file.value='';uploadId=crypto.randomUUID();await load();note('비공개로 등록했습니다. PDF를 확인한 뒤 ‘공유용 PDF 게시’를 눌러 주세요.');
  }catch(error){if(version===authVersion)note(error.message,true);}
  finally{uploading=false;$('publicationUpload').disabled=false;}
};
$('publicationRefresh').onclick=()=>load();$('publicationAdminMore').onclick=()=>load(true);
window.addEventListener('safety-admin-ready',()=>load());
window.addEventListener('safety-admin-logout',()=>{authVersion++;rows=[];offset=0;loading=false;$('publicationAdminList').replaceChildren();$('publicationLoadedCount').textContent='';$('publicationAdminMore').hidden=true;$('publicationForm').reset();file.value='';month.value=koreanDate().slice(0,7);uploadId=crypto.randomUUID();message.hidden=true;});
if(window.__safetyAdminBridge?.getClient())void load();
