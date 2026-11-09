import {SURVEY,koreanDay} from './survey-core.mjs';
import {surveyApi,readStored,writeStored} from './survey-api.mjs';
const key='safetyon-survey:'+SURVEY.id;
const launch=document.getElementById('safetySurveyLaunch');
let config=null, dialog=null, checkbox=null, frame=null, opened=false, expires;
function finish(){
  if(checkbox?.checked&&config)writeStored(key+':hide-day',koreanDay(config.server_now));
  writeStored(key+':dismissed','yes',true);document.documentElement.style.overflow=previousOverflow;
  if(launch&&!launch.hidden)launch.focus();
}
let previousOverflow='';
function open(){
  if(!config||config.state!=='open')return;
  if(!dialog){
    dialog=document.createElement('dialog');dialog.className='so-survey-dialog';dialog.setAttribute('aria-labelledby','safetySurveyModalTitle');
    dialog.innerHTML='<div class="so-survey-dialog-head"><h2 id="safetySurveyModalTitle">안전 지원 서비스 만족도 조사</h2><button class="so-survey-dialog-close" type="button" aria-label="설문 팝업 닫기">×</button></div><iframe title="안전 지원 서비스 만족도 설문지"></iframe><div class="so-survey-dialog-foot"><label><input type="checkbox">오늘 하루 보지 않기</label><a href="survey.html" target="_blank" rel="noopener">새 화면에서 참여</a><button type="button">닫기</button></div>';
    checkbox=dialog.querySelector('input');frame=dialog.querySelector('iframe');document.body.append(dialog);
    dialog.querySelectorAll('button').forEach(b=>b.onclick=()=>dialog.close());
    dialog.addEventListener('close',finish);
    dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
  }
  if(dialog.open)return;
  if(!frame.src)frame.src='survey.html?embed=1';
  previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();opened=true;
}
function expire(){
  config={...config,state:'closed'};launch.hidden=true;if(dialog?.open)dialog.close();
}
async function init(){
  if(!launch)return;
  try{
    config=await surveyApi({action:'config'});
    if(config.id!==SURVEY.id||config.version!==SURVEY.version||config.state!=='open')return;
    launch.hidden=false;launch.onclick=event=>{event.preventDefault();open();};
    const remaining=+new Date(config.ends_at)-+new Date(config.server_now);
    if(remaining<=0){expire();return;}
    clearTimeout(expires);expires=setTimeout(expire,Math.min(remaining,2_147_000_000));
    const participated=readStored(key+':submitted')||readStored(key+':submitted',true);
    const hiddenToday=readStored(key+':hide-day')===koreanDay(config.server_now);
    if(!opened&&!participated&&!hiddenToday&&!readStored(key+':dismissed',true)&&!document.querySelector('dialog[open]'))open();
  }catch{/* 본 서비스 이용을 방해하지 않습니다. 설문 연결 전에는 팝업을 띄우지 않습니다. */}
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow||event.data?.type!=='safetyon-survey-submitted'||event.data.surveyId!==SURVEY.id)return;
  launch.textContent='설문 참여완료';
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!dialog?.open)init();});
init();
