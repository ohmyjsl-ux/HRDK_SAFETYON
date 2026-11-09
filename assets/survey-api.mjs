export async function surveyApi(body, token, signal) {
  const settings=window.SAFETY_ON_SUPABASE||{};
  const base=(window.SAFETY_ON_SURVEY?.functionsBaseUrl || (settings.url ? settings.url+'/functions/v1' : '')).replace(/\/$/,'');
  if(!base || !settings.publishableKey) throw Error('만족도 조사 연결 설정을 확인하고 다시 시도해 주세요.');
  let response;
  try {
    response=await fetch(base+'/safety-survey',{
      method:'POST',headers:{'Content-Type':'application/json',apikey:settings.publishableKey,...(token?{Authorization:'Bearer '+token}:{})},
      body:JSON.stringify(body),signal:signal||AbortSignal.timeout(20000)
    });
  } catch(e) { if(e.name==='AbortError')throw e; throw Error('연결하지 못했습니다. 입력한 응답은 유지됩니다. 잠시 후 다시 시도해 주세요.'); }
  let data;try{data=await response.json();}catch{throw Error('만족도 조사 서버 연결을 확인해 주세요.');}
  if(!response.ok){const error=Error(data.error||'응답을 저장하지 못했습니다. 입력한 내용은 유지됩니다.');error.code=data.code;throw error;}
  return data;
}
export function readStored(key,session=false){try{return (session?sessionStorage:localStorage).getItem(key);}catch{return null;}}
export function writeStored(key,value,session=false){try{(session?sessionStorage:localStorage).setItem(key,value);return true;}catch{return false;}}
