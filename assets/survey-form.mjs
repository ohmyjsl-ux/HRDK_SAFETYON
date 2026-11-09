import {SURVEY,CIRCLED,validateSurvey} from './survey-core.mjs';
import {surveyApi,readStored,writeStored} from './survey-api.mjs';
const $=id=>document.getElementById(id), form=$('surveyForm'), fields=$('surveyFields');
const key='safetyon-survey:'+SURVEY.id, error=$('surveyError'), state=$('surveyState');
let respondent=readStored(key+':respondent')||readStored(key+':respondent',true), submitted=false, busy=false, config=null, deadlineTimer;
if(!respondent){respondent=crypto.randomUUID();writeStored(key+':respondent',respondent);writeStored(key+':respondent',respondent,true);}
if(new URL(location.href).searchParams.get('embed')==='1')document.body.classList.add('so-survey-embed');
function question(name,title,options,number){
  const f=document.createElement('fieldset');f.className='so-survey-question';
  const legend=document.createElement('legend');legend.textContent=(number?number+'. ':'<기초자료> ')+title;f.append(legend);
  const list=document.createElement('div');list.className='so-survey-choices';
  options.forEach((option,i)=>{
    const label=document.createElement('label');label.className='so-survey-choice';
    const input=document.createElement('input');input.type='radio';input.name=name;input.value=name==='role'?option:String(i+1);input.required=true;
    const text=document.createElement('span'),n=document.createElement('em');n.textContent=CIRCLED[i];n.setAttribute('aria-hidden','true');
    text.append(n,document.createTextNode(option));label.append(input,text);list.append(label);
  });f.append(list);return f;
}
const questions=$('surveyQuestions');
questions.append(question('role','고객님이 국가기술자격시험에서 담당하신 역할은 무엇입니까?',SURVEY.roles));
SURVEY.questions.slice(0,4).forEach((text,i)=>questions.append(question('q'+(i+1),text,SURVEY.choices,i+1)));
const last=document.createElement('div');last.className='so-survey-question';
const lastLabel=document.createElement('label');lastLabel.htmlFor='surveyComment';lastLabel.style.cssText='display:block;font-weight:700;margin-bottom:12px';lastLabel.textContent='5. '+SURVEY.questions[4];
const optional=document.createElement('span');optional.className='so-survey-optional';optional.textContent=' (선택)';lastLabel.append(optional);
const comment=document.createElement('textarea');comment.id='surveyComment';comment.name='comment';comment.maxLength=2000;comment.rows=5;comment.placeholder='개선 의견이 있으시면 자유롭게 작성해 주세요.';
const counter=document.createElement('p');counter.className='so-survey-counter';counter.textContent='0 / 2,000자';comment.addEventListener('input',()=>{counter.textContent=Array.from(comment.value).length.toLocaleString('ko-KR')+' / 2,000자';});
last.append(lastLabel,comment,counter);questions.append(last);
function showSuccess(already=false){
  submitted=true;form.hidden=true;document.querySelector('.so-survey-intro').hidden=true;state.hidden=true;$('surveyRetry').hidden=true;
  $('surveySuccess').hidden=false;$('surveySuccessMessage').textContent=already?'이 브라우저에서는 설문 참여를 완료했습니다.':'설문 응답이 정상적으로 저장되었습니다.';
  $('surveySuccess').focus();window.scrollTo({top:0,behavior:'instant'});
  if(window.parent!==window)window.parent.postMessage({type:'safetyon-survey-submitted',surveyId:SURVEY.id},location.origin);
}
function setState(data){
  config=data;clearTimeout(deadlineTimer);state.dataset.state=data.state;state.hidden=false;
  const messages={open:'시험관계자 여러분의 의견을 기다립니다. 응답자 구분과 1~4번은 필수, 5번 자유의견은 선택입니다.',closed:'만족도 조사가 마감되었습니다. 소중한 관심에 감사드립니다.',not_started:'아직 조사 시작 전입니다. 11월 9일부터 참여하실 수 있습니다.',disabled:'현재 만족도 조사를 진행하지 않습니다.'};
  state.textContent=messages[data.state]||'현재 만족도 조사에 연결할 수 없습니다.';
  fields.disabled=data.state!=='open';
  if(data.state==='open'){
    const remaining=+new Date(data.ends_at)-+new Date(data.server_now);
    if(remaining>0)deadlineTimer=setTimeout(()=>{if(!submitted)setState({...data,state:'closed'});},Math.min(remaining,2_147_000_000));
  }
}
async function check(){
  fields.disabled=true;$('surveyRetry').hidden=true;state.textContent='조사 참여 가능 여부를 확인하고 있습니다.';
  try{
    const data=await surveyApi({action:'config'});
    if(data.id!==SURVEY.id || data.version!==SURVEY.version)throw Error('설문 화면을 새로고침해 주세요.');
    setState(data);
    if(readStored(key+':submitted')||readStored(key+':submitted',true))showSuccess(true);
  }catch(e){state.textContent=e.message;state.dataset.state='unavailable';$('surveyRetry').hidden=false;}
}
$('surveyRetry').onclick=check;
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||submitted)return;error.hidden=true;
  const data=new FormData(form),payload={action:'submit',surveyId:SURVEY.id,version:SURVEY.version,respondentId:respondent,role:data.get('role'),comment:comment.value,website:$('surveyWebsite').value};
  for(let i=1;i<=4;i++)payload['q'+i]=Number(data.get('q'+i));
  try{validateSurvey(payload);}catch(e){
    error.textContent=e.message;error.hidden=false;
    const missing=['role','q1','q2','q3','q4'].find(name=>!data.get(name));
    (missing?form.querySelector('input[name="'+missing+'"]'):comment).focus();return;
  }
  if(!config||config.state!=='open'){error.textContent='현재는 조사 참여 기간이 아닙니다.';error.hidden=false;return;}
  busy=true;$('surveySubmit').disabled=true;$('surveySubmit').textContent='응답 저장 중…';
  // 요청 중 선택을 바꿔 저장값과 화면값이 달라지지 않게 잠급니다. 실패하면 복구합니다.
  fields.disabled=true;
  try{
    const result=await surveyApi(payload);
    if(result.saved!==true)throw Error('응답 저장 여부를 확인하지 못했습니다. 잠시 후 같은 내용으로 다시 제출해 주세요.');
    writeStored(key+':submitted',result.receipt);writeStored(key+':submitted',result.receipt,true);showSuccess();
  }catch(e){
    if(e.code==='SURVEY_CLOSED'||e.code==='SURVEY_NOT_OPEN')setState({...config,state:'closed'});
    else fields.disabled=config.state!=='open';
    error.textContent=e.message;error.hidden=false;
  }finally{busy=false;$('surveySubmit').disabled=false;$('surveySubmit').textContent='설문 제출하기';}
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy&&!submitted)check();});
check();
