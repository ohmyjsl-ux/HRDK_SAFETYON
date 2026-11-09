// 첨부2 원문과 선택번호를 유지합니다. 원문 ①은 5점, ⑤는 1점입니다.
export const SURVEY = Object.freeze({
  id: '2026-practical-safety', version: '2026-11-09-v1',
  title: '안전 지원 서비스 만족도 조사',
  start: '2026-11-09T00:00:00+09:00', end: '2026-11-16T00:00:00+09:00',
  period: '2026. 11. 9.(월) ~ 11. 15.(일) 23:59 · 한국시간',
  roles: ['시험관리위원', '시험감독위원', '시설관리위원', '관리원', '기타'],
  choices: ['매우 그렇다', '그렇다', '보통이다', '그렇지 않다', '전혀 그렇지 않다'],
  questions: [
    '시험장에서 제공된 생수 나눔 캠페인은 무더위 속 갈증 해소와 온열질환 예방에 실질적인 도움이 되었습니까?',
    '시험위원이 착용한 안전조끼는 시험 중 안전사고 예방에 도움이 되었습니까?',
    '취약계층(외국인, 고령자 등)을 위한 안전 지원 서비스가 적절히 제공되었습니까?',
    '시험장에서 느끼는 전반적인 체감 안전 수준에 만족하십니까?',
    '시험장 안전관리와 관련하여 개선이 필요한 사항이나 추가 지원이 필요한 부분이 있으면 자유롭게 기재해 주십시오.'
  ]
});
export const CIRCLED = ['①', '②', '③', '④', '⑤'];
export function phase(now, start=SURVEY.start, end=SURVEY.end) {
  const time = Number(new Date(now));
  if (!Number.isFinite(time)) return 'unavailable';
  return time < +new Date(start) ? 'not_started' : time < +new Date(end) ? 'open' : 'closed';
}
export function koreanDay(now) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
}
export function koreanTime(now) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(now));
}
export function score(choice) { return Number.isInteger(choice) && choice >= 1 && choice <= 5 ? 6-choice : null; }
export function summarize(rows) {
  const counts = SURVEY.questions.slice(0,4).map(() => [0,0,0,0,0]);
  const roles = Object.fromEntries(SURVEY.roles.map(role=>[role,0]));
  for (const r of rows) {
    if (Object.hasOwn(roles,r.role)) roles[r.role]++;
    counts.forEach((c,i)=>{const choice=r['q'+(i+1)];if(score(choice)!==null)c[choice-1]++;});
  }
  return {total:rows.length,roles,questions:counts.map((c,i)=>({
    question:SURVEY.questions[i],counts:c,
    average:rows.length?c.reduce((n,v,j)=>n+v*(5-j),0)/rows.length:null,
    positive:rows.length?(c[0]+c[1])/rows.length:null
  }))};
}
export function validateSurvey(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw Error('설문 응답을 확인해 주세요.');
  if(input.website) throw Error('잠시 후 다시 시도해 주세요.');
  if(input.surveyId!==SURVEY.id || input.version!==SURVEY.version) throw Error('설문 화면을 새로고침한 후 다시 참여해 주세요.');
  if(!SURVEY.roles.includes(input.role)) throw Error('국가기술자격시험에서 담당하신 역할을 선택해 주세요.');
  for(let i=1;i<=4;i++) if(score(input['q'+i])===null) throw Error(i+'번 문항에 응답해 주세요.');
  if(typeof input.comment!=='string' || Array.from(input.comment).length>2000) throw Error('개선 의견은 2,000자 이내로 작성해 주세요.');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.respondentId||'')) throw Error('설문 화면을 새로고침한 후 다시 참여해 주세요.');
  return {role:input.role,q1:input.q1,q2:input.q2,q3:input.q3,q4:input.q4,comment:input.comment.trim()};
}
