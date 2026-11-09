import {FORMS,MANUALS,ROLE_LABELS,SOURCES,roleFromUrl,stepsForRole,phoneHref} from './business-manual-data.mjs';
import {createPdfViewer} from './business-pdf.mjs';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let role=roleFromUrl(location.href),phase='immediate',flowSteps=[],flowIndex=0,toastTimer;
const focusReturn=new Map(),dialogIds=['flowBackdrop','overviewBackdrop','pdfBackdrop'];
const configured=window.SAFETY_ON_BUSINESS_MANUAL?.contacts||{};
const contactGroups={
  emergency:{title:'긴급전화',sub:'인명 보호·긴급 구조',icon:'☎',key:'emergency',rows:[{name:'화재·구조·구급',phone:'119'}]},
  center:{title:'공동훈련센터',sub:'사고 즉시 유선보고',icon:'🏢',key:'corporation',rows:businessContacts('center',['공동훈련센터 안전관리 담당자','공동훈련센터 부 담당자'])},
  branch:{title:'관할 공단 지부·지사',sub:'사고보고·재발방지계획',icon:'🏢',key:'corporation',rows:businessContacts('branch',['경기서부지사 기업인재혁신부 정 담당자','경기서부지사 기업인재혁신부 부 담당자'])},
  company:{title:'학습기업',sub:'사고 확인·서류 보완',icon:'🏭',key:'corporation',rows:businessContacts('company',['학습기업 안전관리 책임자','학습기업 안전관리 부 담당자'])}
};
function businessContacts(group,fallbacks){return ['primary','backup'].map((type,i)=>({name:typeof configured[group]?.[type]?.name==='string'?configured[group][type].name:fallbacks[i],phone:typeof configured[group]?.[type]?.phone==='string'?configured[group][type].phone:'',role:i===0?'정 담당자':'부 담당자'}));}
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function activeModal(){return dialogIds.filter(id=>!$(id).hidden).at(-1);}
function syncModal(){
  const active=activeModal();$('pageShell').inert=!!active;
  for(const id of dialogIds)$(id).inert=!!active&&id!==active;
  document.body.style.overflow=active?'hidden':'';
}
function openDialog(id){
  if(!$(id).hidden)return;
  focusReturn.set(id,document.activeElement);$(id).hidden=false;syncModal();
  $(id).querySelector('button,a[href],[tabindex="-1"]')?.focus();
}
function finishClose(id){
  $(id).hidden=true;syncModal();const target=focusReturn.get(id);focusReturn.delete(id);
  if(target?.isConnected&&!target.closest('[hidden]')&&!target.closest('[inert]'))target.focus();
}
const pdf=createPdfViewer({onOpen:()=>openDialog('pdfBackdrop'),onClose:()=>finishClose('pdfBackdrop')});
function formTools(ids=[]){
 return ids.filter(id=>FORMS[id]).map(id=>`<button class="step-tool" type="button" data-form="${id}">${esc(FORMS[id].tag)} ${esc(FORMS[id].title)} 보기</button>`).join('');
}
function contactTools(ids=[]){
 const rows=ids.flatMap(id=>contactGroups[id]?.rows||[]);
 if(!rows.length)return '';
 const phones=rows.filter(c=>phoneHref(c.phone));
 const buttons=phones.map(c=>`<a class="step-phone-btn" href="${phoneHref(c.phone)}">${esc(c.name)} <strong>${esc(c.phone)}</strong></a>`).join('');
 const missing=ids.filter(id=>id!=='emergency'&&!contactGroups[id]?.rows.some(c=>phoneHref(c.phone))).map(id=>`<span class="contact-missing">${esc(contactGroups[id].title)} 업무 연락처 미등록 · 담당자 번호를 확인하세요.</span>`).join('');
 return `<div class="step-contact"><span class="step-contact-label">연락·보고</span>${buttons}${missing}</div>`;
}
function renderContacts(){
 const ids=role==='company'?['emergency','center','branch']:['emergency','company','branch'];
 $('contactGrid').innerHTML=ids.map(id=>{const g=contactGroups[id];return `<section class="contact-group ${g.key}" aria-label="${esc(g.title)}"><div class="contact-group-head"><span class="contact-group-icon" aria-hidden="true">${g.icon}</span><strong class="contact-group-title">${esc(g.title)}</strong><span class="contact-group-sub">${esc(g.sub)}</span></div><div class="contact-grid">${g.rows.map(c=>`<div class="contact ${phoneHref(c.phone)?'':'phone-missing'}"><div><strong>${esc(c.name)}</strong>${c.role?`<small>${esc(c.role)}</small>`:''}</div><div class="contact-phone-stack">${phoneHref(c.phone)?`<a class="phone" href="${phoneHref(c.phone)}">☎ ${esc(c.phone)}</a>`:'<span class="contact-missing">연락처 미등록</span>'}</div></div>`).join('')}</div></section>`;}).join('');
 const missing=ids.some(id=>id!=='emergency'&&!contactGroups[id].rows.some(c=>phoneHref(c.phone)));
 $('contactsNotice').textContent=missing?'업무 연락처가 아직 등록되지 않았습니다. 담당 공동훈련센터·관할 지사의 연락처를 확인하세요. 부상자 구조·구급은 119로 신고하세요.':'정 담당자 연결이 어려우면 부 담당자에게 연락하여 보고가 누락되지 않도록 하세요.';
 $('contactsNotice').classList.toggle('contact-missing-note',missing);
}
function renderSteps(next){
 phase=next;const immediate=next==='immediate';
 for(const [id,on] of [['tabImmediate',immediate],['tabAfter',!immediate]]){const b=$(id);b.classList.toggle('is-active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;}
 $('steps').setAttribute('aria-labelledby',immediate?'tabImmediate':'tabAfter');
 $('steps').innerHTML=MANUALS[role][next].map((row,i)=>`<article class="step"><div class="step-top"><span class="step-no"><small>STEP</small><b>${i+1+(immediate?0:MANUALS[role].immediate.length)}</b></span><div class="step-content">${row.deadline?`<span class="step-deadline">${esc(row.deadline)}</span>`:''}<h3>${esc(row.title)}</h3><ul>${row.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${contactTools(row.contacts)}${row.forms?`<div class="step-tools">${formTools(row.forms)}</div>`:''}</div></div></article>`).join('');
}
function renderForms(){
 $('formGrid').innerHTML=['report','recurrence','investigation'].map(id=>{const f=FORMS[id];return `<article class="form-card"><span class="form-tag">${esc(f.tag)} · ${f.pages}쪽</span><h3>${esc(f.title)}</h3><p>${esc(f.summary)}</p><div class="form-actions"><button type="button" data-form="${id}">PDF 보기</button><a href="${f.file}" download="${f.download}">서식 다운로드</a>${id==='investigation'?`<a class="official-form" href="${esc(SOURCES.latestForm)}" target="_blank" rel="noopener noreferrer">국가법령정보센터 최신 법정서식 확인 ↗</a>`:''}</div></article>`;}).join('');
}
function setRole(next,{updateUrl=true,focus=false}={}){
 role=next==='center'?'center':'company';const manual=MANUALS[role];
 for(const [id,key] of [['roleCompany','company'],['roleCenter','center']]){const on=key===role;$(id).classList.toggle('is-active',on);$(id).setAttribute('aria-selected',String(on));$(id).tabIndex=on?0:-1;}
 $('manual').setAttribute('aria-labelledby',role==='company'?'roleCompany':'roleCenter');
 $('manualRoleLabel').textContent=manual.label;$('manualSubtitle').textContent=manual.subtitle;
 document.title=manual.label+' | 일학습병행 안전사고 대응 | 안전ON';
 $('deadlineSummary').innerHTML=manual.deadlines.map(x=>`<div><strong>${esc(x.when)}</strong><span>${esc(x.what)}</span></div>`).join('');
 $('specialGrid').innerHTML=manual.specials.map(x=>`<details><summary>${esc(x.title)}<span aria-hidden="true">＋</span></summary><div class="detail-body">${x.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div></details>`).join('');
 renderContacts();renderSteps('immediate');
 if(updateUrl){const url=new URL(location.href);url.searchParams.set('role',role);history.replaceState(null,'',url);}
 if(focus)$(role==='company'?'roleCompany':'roleCenter').focus();
}
function openFlow(){flowSteps=stepsForRole(role);flowIndex=0;renderFlow();openDialog('flowBackdrop');}
function renderFlow(){
 const row=flowSteps[flowIndex];$('flowRoleLabel').textContent=ROLE_LABELS[role]+' · 현장 대응 모드';
 $('flowStepLabel').textContent=row.phase+' · STEP '+(flowIndex+1)+' / '+flowSteps.length;
 $('flowStepTitle').textContent=row.title;$('flowStepBullets').innerHTML=row.bullets.map(x=>`<li>${esc(x)}</li>`).join('');
 $('flowStepContact').innerHTML=(row.deadline?`<span class="step-deadline">${esc(row.deadline)}</span>`:'')+contactTools(row.contacts)+(row.forms?`<div class="step-tools">${formTools(row.forms)}</div>`:'');
 $('progressBar').style.width=(flowIndex+1)/flowSteps.length*100+'%';$('flowProgress').setAttribute('aria-valuenow',String(flowIndex+1));$('flowProgress').setAttribute('aria-valuemax',String(flowSteps.length));
 $('prevBtn').disabled=flowIndex===0;$('nextBtn').textContent=flowIndex===flowSteps.length-1?'확인 완료':'완료 · 다음 단계';
 $('flowBackdrop').querySelector('.flow-body').scrollTop=0;
}
function moveFlow(delta){
 if(delta>0&&flowIndex===flowSteps.length-1){finishClose('flowBackdrop');notify('전체 사고 대응 절차를 확인했습니다.');return;}
 flowIndex=Math.max(0,Math.min(flowSteps.length-1,flowIndex+delta));renderFlow();
}
function openOverview(){
 $('overviewRole').textContent='현재 선택: '+ROLE_LABELS[role];
 document.querySelectorAll('[data-owner]').forEach(el=>el.classList.toggle('is-current',el.dataset.owner===role));
 openDialog('overviewBackdrop');
}
document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',()=>setRole(button.dataset.role)));
$('tabImmediate').onclick=()=>renderSteps('immediate');$('tabAfter').onclick=()=>renderSteps('after');
$('startFlow').onclick=openFlow;$('flowClose').onclick=()=>finishClose('flowBackdrop');
$('prevBtn').onclick=()=>moveFlow(-1);$('nextBtn').onclick=()=>moveFlow(1);
$('allStepsBtn').onclick=openOverview;$('overviewClose').onclick=()=>finishClose('overviewBackdrop');
$('pdfBtn').onclick=()=>pdf.open(FORMS.original);$('pdfClose').onclick=pdf.close;
document.addEventListener('click',event=>{const button=event.target.closest('button[data-form]');if(button&&FORMS[button.dataset.form])pdf.open(FORMS[button.dataset.form]);});
for(const id of dialogIds)$(id).addEventListener('click',event=>{if(event.target!==$(id))return;if(id==='pdfBackdrop')pdf.close();else finishClose(id);});
document.addEventListener('keydown',event=>{
 const active=activeModal();
 if(event.key==='Escape'&&active){event.preventDefault();active==='pdfBackdrop'?pdf.close():finishClose(active);return;}
 if(event.key==='Tab'&&active){
  const targets=[...$(active).querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=targets[0],last=targets.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!$(active).contains(document.activeElement))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
});
for(const list of document.querySelectorAll('[role="tablist"]'))list.addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const tabs=[...list.querySelectorAll('[role="tab"]')],index=tabs.indexOf(document.activeElement);if(index<0)return;
 event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 tabs[next].click();tabs[next].focus();
});
window.addEventListener('popstate',()=>setRole(roleFromUrl(location.href),{updateUrl:false}));
renderForms();setRole(role,{updateUrl:false});
