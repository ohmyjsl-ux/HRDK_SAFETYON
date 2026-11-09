import {SURVEY,koreanDay} from './survey-core.mjs';
import {surveyApi} from './survey-api.mjs';
import {buildSurveyWorkbook,fetchAllSurveyRows} from './survey-export.mjs';
const $=id=>document.getElementById(id),refresh=$('surveyAdminRefresh'),download=$('surveyAdminExport'),message=$('surveyAdminMessage');
let generation=0,controller=null,busy=false;
function note(text,bad=false){message.textContent=text;message.style.color=bad?'#a33124':'#52677d';}
async function call(body,signal){
  const client=window.__safetyAdminBridge?.getClient();
  if(!client)throw Error('먼저 관리자 계정으로 로그인해 주세요.');
  const {data:{session}}=await client.auth.getSession();
  if(!session)throw Error('관리자 로그인이 필요합니다.');
  return surveyApi(body,session.access_token,signal||AbortSignal.timeout(30000));
}
async function load(){
  if(busy)return;const version=generation;refresh.disabled=true;
  try{
    const summary=await call({action:'summary'});if(version!==generation)return;
    $('surveyAdminTotal').textContent=Number(summary.total).toLocaleString('ko-KR')+'명';
    $('surveyAdminAverage').textContent=summary.average===null?'—':Number(summary.average).toFixed(2)+' / 5점';
    download.disabled=Number(summary.total)===0;note('조회한 시점의 전체 응답입니다. 다운로드는 최신 전체 응답을 가져옵니다.');
  }catch(e){if(version===generation){download.disabled=true;note(e.message,true);}}
  finally{if(version===generation)refresh.disabled=false;}
}
async function exportFile(){
  if(busy)return;busy=true;download.disabled=true;refresh.disabled=true;
  const version=generation;controller=new AbortController();const signal=controller.signal;
  const timer=setTimeout(()=>controller?.abort(),180000);
  try{
    const rows=await fetchAllSurveyRows(async body=>{if(version!==generation)throw Error('관리자 로그인이 변경되었습니다.');return call(body,signal);},(n,total)=>{if(version===generation)note('전체 응답 불러오는 중… '+n.toLocaleString('ko-KR')+' / '+total.toLocaleString('ko-KR')+'명');});
    if(version!==generation||signal.aborted)return;
    const workbook=buildSurveyWorkbook(rows,window.XLSX);
    const bytes=window.XLSX.write(workbook,{bookType:'xlsx',type:'array',compression:true});
    if(version!==generation||signal.aborted)return;
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='안전ON_안전지원서비스_만족도조사_'+koreanDay(new Date())+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    note(rows.length.toLocaleString('ko-KR')+'명의 전체 응답과 항목별 집계를 엑셀로 내려받았습니다.');
  }catch(e){if(version===generation)note(e.name==='AbortError'?'다운로드 연결이 종료되었습니다. 다시 시도해 주세요.':e.message,true);}
  finally{clearTimeout(timer);if(version===generation){busy=false;controller=null;download.disabled=false;refresh.disabled=false;}}
}
if(refresh&&download){
  refresh.onclick=load;download.onclick=exportFile;
  window.addEventListener('safety-admin-ready',()=>{generation++;controller?.abort();busy=false;load();});
  window.addEventListener('safety-admin-logout',()=>{generation++;controller?.abort();controller=null;busy=false;$('surveyAdminTotal').textContent='—';$('surveyAdminAverage').textContent='—';download.disabled=true;refresh.disabled=false;note('관리자 로그인 후 결과를 확인할 수 있습니다.');});
  if(window.__safetyAdminBridge?.getClient())load();
}
