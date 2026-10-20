import {koreanDate,validateReport,draftFromFindings,escapeHtml} from './report-core.mjs';
const $=id=>document.getElementById(id);
const config=window.SAFETY_ON_REPORT||{},db=window.SAFETY_ON_SUPABASE||{};
const preview=config.preview===true||new URLSearchParams(location.search).get('preview')==='1'||location.protocol==='file:';
const base=(config.functionsBaseUrl||`${db.url||''}/functions/v1`).replace(/\/$/,'');
let photo=null,findings=[],receipt=null,photoVersion=0,busy=false,analysisBusy=false,lastApplied='',pendingDraft='',submissionId=crypto.randomUUID();
const date=$('reportDate');date.value=koreanDate();date.max=koreanDate();
if(preview)$('previewNotice').hidden=false;
const message=(text,warn=false)=>{const p=$('analysisMessage');p.textContent=text;p.className='status-message'+(warn?' warn':'');p.hidden=false;};
const counts=()=>{$('locationCount').textContent=$('location').value.length;$('contentCount').textContent=$('content').value.length;};
['location','content'].forEach(id=>$(id).addEventListener('input',()=>{counts();if(id==='content'&&$(id).value!==lastApplied)$('draftLabel').hidden=true;}));
$('cameraButton').onclick=()=>$('cameraInput').click();$('fileButton').onclick=()=>$('fileInput').click();
['cameraInput','fileInput'].forEach(id=>$(id).addEventListener('change',async e=>{if(e.target.files?.[0])await selectPhoto(e.target.files[0]);e.target.value='';}));
async function selectPhoto(file){
  const version=++photoVersion;
  try {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('JPG·PNG·WEBP 사진을 선택해 주세요. HEIC 사진은 JPG로 변환해 주세요.');
    if(file.size>15*1024*1024)throw Error('15MB 이하의 사진을 선택해 주세요.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();img.src=url;await img.decode();
      const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      let dataUrl=canvas.toDataURL('image/jpeg',.82);
      if(dataUrl.length>2100000)dataUrl=canvas.toDataURL('image/jpeg',.6);
      if(dataUrl.length>2100000)throw Error('사진 용량이 큽니다. 가까이에서 다시 촬영해 주세요.');
      if(version!==photoVersion)return;
      photo=dataUrl;receipt=null;findings=[];$('findingList').replaceChildren();$('analysisResults').hidden=true;$('aiConsent').checked=false;$('photoPrivacyChecked').checked=false;
      $('photoImage').src=photo;$('photoInfo').textContent=`현장 사진 · ${canvas.width} × ${canvas.height}`;
      $('photoEmpty').hidden=true;$('photoPreview').hidden=false;$('analysisOptions').hidden=false;
      message('사진에 개인정보가 없는지 확인하고 전송에 동의하면 자동 분석합니다. 아래 신고서를 직접 작성해도 됩니다.');
    }finally{URL.revokeObjectURL(url);}
  }catch(e){message(e.message,true);}
}
$('removePhoto').onclick=()=>{photoVersion++;photo=null;receipt=null;findings=[];$('photoImage').removeAttribute('src');$('photoPreview').hidden=true;$('photoEmpty').hidden=false;$('analysisOptions').hidden=true;$('analysisResults').hidden=true;$('analysisMessage').hidden=true;$('aiConsent').checked=false;$('photoPrivacyChecked').checked=false;};
async function request(name,body,timeoutMs=45000){
  if(preview)throw Error(name==='safety-report-analyze'?'미리보기에서는 실제 AI 분석을 실행하지 않습니다. 아래 신고서를 직접 작성해 볼 수 있어요.':'미리보기에서는 실제 접수되지 않습니다. 연결 설정 후 접수할 수 있습니다.');
  if(!db.url||!db.publishableKey)throw Error('현재 연결을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const res=await fetch(`${base}/${name}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:db.publishableKey},body:JSON.stringify(body),signal:controller.signal});let data;try{data=await res.json();}catch{throw Error('연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.');}if(!res.ok)throw Error(data.error||'처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');return data;}
  catch(e){if(e.name==='AbortError')throw Error('응답이 지연되고 있습니다. 입력한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.');if(e instanceof TypeError)throw Error('연결하지 못했습니다. 인터넷 연결을 확인해 주세요.');throw e;}finally{clearTimeout(timer);}
}
async function analyzePhoto(){
  if(analysisBusy||busy)return;
  if(!photo)return message('사진을 먼저 선택해 주세요.',true);
  if(!$('photoPrivacyChecked').checked){message('사진과 장소 설명에 개인정보·기밀정보가 없는지 확인해 주세요.',true);$('photoPrivacyChecked').focus();return;}
  if(!$('aiConsent').checked){message('사진 전송 동의 항목을 확인해 주세요.',true);$('aiConsent').focus();return;}
  analysisBusy=true;$('analyzeButton').disabled=true;$('analyzeButton').textContent='사진을 살펴보고 있어요…';const version=photoVersion;
  ['cameraButton','fileButton','removePhoto','photoPrivacyChecked','aiConsent'].forEach(id=>$(id).disabled=true);
  message('위험 의심사항을 분석하고 있습니다. 잠시 기다려 주세요.');
  try{
    const result=await request('safety-report-analyze',{photo,location:$('location').value.trim(),aiConsent:true,photoPrivacyChecked:true});
    if(version!==photoVersion)return;
    receipt=result.analysis_receipt;findings=result.findings||[];
    if(!findings.length){$('analysisResults').hidden=true;message(result.image_status==='unclear_image'?'사진이 불분명해 위험요소를 확인하기 어려워요. 다시 촬영하거나 직접 작성해 주세요.':'사진에서 뚜렷한 위험 의심사항을 찾지 못했어요. 안전하다는 뜻은 아니며, 발견한 사항을 직접 작성할 수 있습니다.',true);return;}
    $('findingList').innerHTML=findings.map(f=>`<label class="finding"><input type="checkbox" value="${escapeHtml(f.id)}" checked><div><strong>${escapeHtml(f.observation)}</strong><p>예상 위험: ${escapeHtml(f.risk)}</p><p class="suggestion">개선 의견: ${escapeHtml(f.suggestion)}</p></div></label>`).join('');
    $('findingCount').textContent=`${findings.length}개 항목`;$('analysisResults').hidden=false;
    message(result.note||'실제 상황에 맞는 항목을 확인해 주세요.');
    if(!$('content').value.trim())applyDraft(draftFromFindings(findings));
  }catch(e){if(version===photoVersion)message(e.message,true);}
  finally{analysisBusy=false;$('analyzeButton').disabled=false;$('analyzeButton').textContent='AI로 신고 초안 작성';['cameraButton','fileButton','removePhoto','photoPrivacyChecked','aiConsent'].forEach(id=>$(id).disabled=false);}
}
$('analyzeButton').onclick=analyzePhoto;
['photoPrivacyChecked','aiConsent'].forEach(id=>$(id).addEventListener('change',()=>{
  if(photo&&$('photoPrivacyChecked').checked&&$('aiConsent').checked)void analyzePhoto();
}));
function applyDraft(text){$('content').value=text;lastApplied=text;$('draftLabel').hidden=false;counts();}
$('applyDraft').onclick=()=>{
  const ids=[...$('findingList').querySelectorAll('input:checked')].map(e=>e.value);
  if(!ids.length)return message('신고할 항목을 하나 이상 선택해 주세요.',true);
  const text=draftFromFindings(findings.filter(f=>ids.includes(f.id)));
  if($('content').value.trim()&&$('content').value!==text){pendingDraft=text;$('replaceDialog').showModal();}else applyDraft(text);
};
$('cancelReplace').onclick=()=>$('replaceDialog').close();$('confirmReplace').onclick=()=>{applyDraft(pendingDraft);$('replaceDialog').close();$('content').focus();};
document.querySelectorAll('[name=privacyConsent]').forEach(el=>el.addEventListener('change',()=>{const yes=document.querySelector('[name=privacyConsent]:checked')?.value==='yes';$('phone').disabled=!yes;$('phone').placeholder=yes?'숫자만 입력해 주세요':'개인정보 이용 동의 후 입력할 수 있어요';if(!yes)$('phone').value='';}));
$('phone').oninput=()=>{$('phone').value=$('phone').value.replace(/\D/g,'').slice(0,11);};
function fieldFocus(message){const mapping=[['구분','reporterType'],['일자','reportDate'],['위험장소','location'],['신고내용','content'],['동의','privacyConsent'],['휴대전화','phone'],['확인 항목','reviewed']];for(const [term,id]of mapping)if(message.includes(term)){const node=$(id)||document.querySelector(`[name=${id}]`);node?.focus();break;}}
$('reportForm').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  if(analysisBusy){$('submitError').textContent='사진 분석 중입니다. 분석이 끝난 후 내용을 확인하고 접수해 주세요.';$('submitError').hidden=false;return;}
  const payload={submissionId,reporterType:document.querySelector('[name=reporterType]:checked')?.value,reportDate:date.value,location:$('location').value,content:$('content').value,phone:$('phone').value,privacyConsent:document.querySelector('[name=privacyConsent]:checked')?.value,reviewed:$('reviewed').checked,website:$('website').value};
  $('submitError').hidden=true;
  try{validateReport(payload);busy=true;$('submitButton').disabled=true;$('submitButton').textContent='접수하고 있어요…';
    const result=await request('safety-report-submit',{...payload,photo,analysisReceipt:receipt},60000);
    // Only a real successful server response may show a receipt.
    if(!result.receipt_number)throw Error('접수 결과를 확인하지 못했습니다. 입력한 내용을 유지한 채 다시 시도해 주세요.');
    window.dispatchEvent(new Event('safety-report-submitted'));
    $('receiptNumber').textContent=result.receipt_number;$('reportForm').hidden=true;document.querySelector('.photo-card').hidden=true;$('successView').hidden=false;
    document.querySelectorAll('.steps li').forEach((el,i)=>el.classList.toggle('active',i===2));
    photo=null;receipt=null;findings=[];$('photoImage').removeAttribute('src');$('phone').value='';$('successView').focus();$('successView').scrollIntoView({behavior:'smooth'});
  }catch(error){$('submitError').textContent=error.message;$('submitError').hidden=false;fieldFocus(error.message);}
  finally{busy=false;$('submitButton').disabled=false;$('submitButton').textContent='안전신문고 접수하기 →';}
});
$('newReport').onclick=()=>{if(preview)location.reload();else location.href='report.html';};
