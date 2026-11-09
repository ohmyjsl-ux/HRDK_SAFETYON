import {SURVEY,score,summarize,koreanTime} from './survey-core.mjs';
export function buildSurveyWorkbook(rows,XLSX,now=new Date()) {
  if(!XLSX?.utils?.book_new)throw Error('엑셀 기능을 불러오지 못했습니다. 인터넷 연결을 확인하고 관리자 화면을 새로고침해 주세요.');
  if(!rows.length)throw Error('아직 제출된 응답이 없습니다.');
  const stats=summarize(rows), end=rows.length+1;
  const raw=[['응답번호','제출일시(한국시간)','담당 역할',
    ...[1,2,3,4].flatMap(i=>[i+'번 응답',i+'번 선택번호(원문)',i+'번 점수(5점 만점)']),'5번 자유의견']];
  for(const r of rows)raw.push([String(r.id),koreanTime(r.created_at),r.role,
    ...[1,2,3,4].flatMap(i=>[SURVEY.choices[r['q'+i]-1],r['q'+i],score(r['q'+i])]),r.comment||'']);
  const summary=[
    [SURVEY.title+' 결과'],['조사기간',SURVEY.period],['다운로드 시각(한국시간)',koreanTime(now)],
    ['전체 응답 수',rows.length],['전체 평균(1~4번, 5점 만점)',stats.questions.reduce((n,q)=>n+q.average,0)/4],
    ['점수 기준','원문 선택번호 ① 매우 그렇다=5점, ②=4점, ③=3점, ④=2점, ⑤ 전혀 그렇지 않다=1점'],
    ['만족 응답률 기준','매우 그렇다·그렇다 응답 수 ÷ 전체 응답 수'],
    ['문항','응답 수','평균(5점 만점)','만족 응답률',...SURVEY.choices],
    ...stats.questions.map((q,i)=>[(i+1)+'. '+q.question,rows.length,q.average,q.positive,...q.counts]),
    [],['담당 역할','응답 수'],...SURVEY.roles.map(role=>[role,stats.roles[role]]),
    [],['5번 자유의견 문항',SURVEY.questions[4]],['자유의견 확인','응답원본 시트의 마지막 열에서 전체 자유의견을 확인할 수 있습니다.']
  ];
  const workbook=XLSX.utils.book_new(), summarySheet=XLSX.utils.aoa_to_sheet(summary),rawSheet=XLSX.utils.aoa_to_sheet(raw);
  // 원본 자유의견은 수식으로 실행하지 않고 문자열 셀로 저장합니다.
  for(let i=2;i<=end;i++){const cell=rawSheet['P'+i];if(cell){cell.t='s';delete cell.f;}}
  function formula(cell,f,value,format){summarySheet[cell]={t:'n',f,v:value,...(format?{z:format}:{})};}
  formula('B4',`COUNTA('응답원본'!A2:A${end})`,rows.length,'0');
  formula('B5',`AVERAGE('응답원본'!F2:F${end},'응답원본'!I2:I${end},'응답원본'!L2:L${end},'응답원본'!O2:O${end})`,summary[4][1],'0.00');
  stats.questions.forEach((q,i)=>{
    const row=9+i, choiceColumn=['E','H','K','N'][i],scoreColumn=['F','I','L','O'][i];
    formula('B'+row,`COUNT('응답원본'!${scoreColumn}2:${scoreColumn}${end})`,rows.length,'0');
    formula('C'+row,`AVERAGE('응답원본'!${scoreColumn}2:${scoreColumn}${end})`,q.average,'0.00');
    formula('D'+row,`(E${row}+F${row})/B${row}`,q.positive,'0.0%');
    q.counts.forEach((n,j)=>formula(String.fromCharCode(69+j)+row,`COUNTIF('응답원본'!${choiceColumn}2:${choiceColumn}${end},${j+1})`,n,'0'));
  });
  SURVEY.roles.forEach((role,i)=>formula('B'+(15+i),`COUNTIF('응답원본'!C2:C${end},A${15+i})`,stats.roles[role],'0'));
  summarySheet['!cols']=[{wch:78},{wch:26},{wch:19},{wch:18},...Array.from({length:5},()=>({wch:20}))];
  summarySheet['!rows']=summary.map((_,i)=>({hpt:i>=8&&i<=11?42:23}));
  summarySheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}}];
  rawSheet['!cols']=[{wch:12},{wch:24},{wch:19},...[1,2,3,4].flatMap(()=>[{wch:22},{wch:21},{wch:23}]),{wch:80}];
  rawSheet['!autofilter']={ref:'A1:P'+end};
  workbook.Props={Title:SURVEY.title,Subject:'국가기술자격 실기시험 안전 지원 서비스',Author:'한국산업인력공단 경기서부지사'};
  workbook.Workbook={CalcPr:{fullCalcOnLoad:true}};
  XLSX.utils.book_append_sheet(workbook,summarySheet,'항목별집계');XLSX.utils.book_append_sheet(workbook,rawSheet,'응답원본');
  return workbook;
}
export async function fetchAllSurveyRows(call,onProgress=()=>{}){
  const result=[];let after=0,cutoff,total;
  do{
    const page=await call({action:'export',after,...(cutoff===undefined?{}:{cutoff})});
    if(!Array.isArray(page.rows)||!Number.isSafeInteger(page.cutoff)||!Number.isSafeInteger(page.total))throw Error('설문 응답을 읽지 못했습니다. 다시 내려받아 주세요.');
    if(cutoff!==undefined&&(page.cutoff!==cutoff||page.total!==total))throw Error('응답 집계가 변경되었습니다. 다시 내려받아 주세요.');
    cutoff=page.cutoff;total=page.total;
    for(const row of page.rows){const id=Number(row.id);if(!Number.isSafeInteger(id)||id<=after||id>cutoff)throw Error('응답 조회 순서를 확인하지 못했습니다.');after=id;result.push(row);}
    onProgress(result.length,total);
    if(!page.hasMore)break;
    if(!page.rows.length||page.nextAfter!==after)throw Error('나머지 응답을 읽지 못했습니다. 다시 내려받아 주세요.');
  }while(true);
  if(result.length!==total)throw Error('전체 응답 수와 일치하지 않아 다운로드를 중단했습니다. 다시 내려받아 주세요.');
  return result;
}
