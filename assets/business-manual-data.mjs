export const FORMS=Object.freeze({
  report:{id:'report',title:'안전사고 보고서',tag:'별첨1',pages:1,file:'forms/work-study-accident-report.pdf',download:'일학습병행_안전사고_보고서.pdf',summary:'사고자 인적사항, 기업 현황, 사고 경위, 기업·학교 조치사항, 사후 관리 계획'},
  recurrence:{id:'recurrence',title:'산업재해재발방지계획서',tag:'별첨2',pages:2,file:'forms/work-study-recurrence-plan.pdf',download:'일학습병행_산업재해재발방지계획서.pdf',summary:'사업장·재해자 개요, 6하 원칙에 따른 발생 과정, 원인 분석, 교육적·기술적·관리적 재발방지계획'},
  investigation:{id:'investigation',title:'산업재해조사표',tag:'참고자료 · 제공 원문',pages:2,file:'forms/work-study-investigation-reference.pdf',download:'산업재해조사표_제공원문_참고용.pdf',summary:'제공 PDF의 참고 서식과 작성방법입니다. 원문은 2021. 11. 19. 개정 표기이며, 실제 법정 제출에는 최신 서식을 확인하세요.'},
  original:{id:'original',title:'일학습병행 안전사고 관련 서식 전체',tag:'업로드 원본',pages:3,file:'forms/work-study-forms-original.pdf',download:'일학습병행_안전사고_관련서식_원본.pdf',summary:'제공된 3쪽 PDF를 그대로 보관한 원본입니다.'}
});
export const SOURCES=Object.freeze({
  plan:'경기서부지사 기업인재혁신부 「일학습병행 학습근로자 안전사고 보고체계 개선 계획(안)」(2026. 10. 29.)',
  latestForm:'https://www.law.go.kr/법령별표서식/(산업안전보건법 시행규칙,20260801,서식30)',
  legalInfo:'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1024053535',
  formNotice:'https://www.moel.go.kr/local/cheongju/info/dataroom/view.do?bbs_seq=20260100716'
});
export const ROLE_LABELS={company:'학습기업 담당자용',center:'공동훈련센터 담당자용'};
export const MANUALS=Object.freeze({
 company:{
  label:ROLE_LABELS.company,
  subtitle:'학습기업 안전관리 책임자가 사고 직후부터 재발방지계획 보고까지 확인하는 대응 절차',
  deadlines:[{when:'사고 즉시',what:'공동훈련센터 유선보고'},{when:'10일 이내',what:'재발방지계획서 센터 보고'}],
  immediate:[
   {title:'현장 안전 확보·응급조치',bullets:['학습근로자의 안전을 우선 확보하고, 긴급한 구조·구급이 필요하면 119에 신고합니다.','위험작업을 중지하고 추가 사고가 발생하지 않도록 현장 접근을 통제합니다.','응급조치는 119 상담원 등 전문인력의 안내에 따라 시행합니다.'],contacts:['emergency']},
   {title:'공동훈련센터에 즉시 유선보고',deadline:'사고 즉시',bullets:['응급조치 후 공동훈련센터 안전관리 담당자에게 즉시 전화로 보고합니다. 서류 작성을 기다리지 않습니다.','기업명, 사고 발생 일시·장소, 재해자 상태, 응급조치 내용, 현장 연락처를 전달합니다.','보호자·학교 등 관계자 상황 공유는 공동훈련센터와 연락하여 역할을 확인합니다.'],contacts:['center']},
   {title:'사고 내용·기업 조치사항 기록',bullets:['사고 발생 경위, 부상 부위·정도, 응급조치 및 사고 상황 공유 내역을 시간 순서로 기록합니다.','안전사고 보고서(별첨1)의 기업 관련 내용을 작성·전달하여 센터의 3일 이내 지사 보고에 협조합니다.','추가로 확인되거나 변경된 사항은 공동훈련센터에 신속하게 공유합니다.'],forms:['report'],contacts:['center']}
  ],
  after:[
   {title:'재발방지계획서 작성·센터 보고',deadline:'사고 발생일부터 10일 이내',bullets:['사고 발생일부터 10일 이내에 산업재해재발방지계획서(별첨2)를 작성하여 공동훈련센터에 보고합니다.','사업장·재해자 개요와 6하 원칙에 따른 재해발생 과정, 인적·물적·관리적 원인을 기재합니다.','교육적·기술적·관리적 재발방지계획을 구체적으로 작성합니다. 센터의 지사 보고도 10일 이내이므로 전달 일정을 미리 조율합니다.'],forms:['recurrence'],contacts:['center']},
   {title:'서류 보완·후속조치 공유',bullets:['공동훈련센터의 확인·보완 요청에 따라 사고 기록과 재발방지계획을 보완합니다.','기업 조치사항, 추가 확인사항, 재발방지대책 실행 현황을 공동훈련센터에 공유합니다.','법정 산업재해 보고·산재보험 처리 등은 해당 기관의 기준에 따라 별도로 확인합니다.'],forms:['report','recurrence']},
   {title:'재발방지·안전보건교육 이행',bullets:['수립한 재발방지대책을 실행하고 필요한 안전보건교육을 추가 실시합니다.','학습근로자 보호와 사고 사후 관리 계획의 이행 내역을 기록합니다.','공동훈련센터·지사의 현장 확인과 사후관리 요청에 협조하고 업무 연락처를 현행화합니다.']}
  ],
  specials:[
   {title:'초기 유선보고 때 무엇을 전달하나요?',paragraphs:['기업명과 현장 연락처, 사고 발생 일시·장소, 재해자 상태, 응급조치·119 신고 여부, 추가 위험 여부를 우선 전달합니다.','확인된 사실을 먼저 알리고, 추가 내용은 확인되는 대로 보완합니다.']},
   {title:'보고서·계획서 작성 시 확인할 내용',paragraphs:['별첨1: 사고자 인적사항, 기업 현황, 사고 경위, 기업 조치사항, 학교 조치사항, 사후 관리 계획을 확인합니다.','별첨2: 발생 과정과 원인을 6하 원칙에 따라 작성하고, 원인에 대응하는 교육적·기술적·관리적 대책을 적습니다.']},
   {title:'업무보고 기한과 법정 신고는 구분하세요',paragraphs:['즉시 유선보고 및 3일·10일 기한은 업로드한 지사 개선계획의 업무보고 기준입니다. 공동훈련센터 보고로 법정 산업재해 보고나 산재보험 절차가 끝나는 것은 아닙니다.','법정 신고 대상·기한과 최신 제출 서식은 관할 기관의 안내를 별도로 확인하세요.']}
  ]
 },
 center:{
  label:ROLE_LABELS.center,
  subtitle:'공동훈련센터 안전관리 담당자가 사고 접수부터 지사 보고·사후관리까지 확인하는 대응 절차',
  deadlines:[{when:'3일 이내',what:'안전사고 보고서 지사 보고'},{when:'10일 이내',what:'재발방지계획서 지사 보고'}],
  immediate:[
   {title:'사고 접수·현장 조치 확인',bullets:['학습기업의 유선보고를 받으면 사고 발생 일시·장소, 재해자 상태, 응급조치 여부와 현장 연락처를 확인합니다.','긴급한 구조·구급이 필요한 경우 119 신고와 현장 안전조치가 이루어지고 있는지 우선 확인합니다.','학습기업 안전관리 책임자와 연락을 유지하고 확인된 내용을 기록합니다.'],contacts:['emergency','company']},
   {title:'보호자·관계자 상황 공유',bullets:['업로드한 보고체계에 따라 사고자 보호자에게 사고 상황을 공유합니다.','기업·학교 등 관계자 조치사항과 상황 공유 내역을 시간 순서로 정리합니다.','센터 안전관리 정·부 담당자 간 사고 대응 내용과 담당 업무를 공유합니다.'],contacts:['company']},
   {title:'안전사고 보고서 작성·지사 보고',deadline:'사고 발생일부터 3일 이내',bullets:['사고 발생일부터 3일 이내에 안전사고 보고서(별첨1)를 관할 공단 지부·지사에 보고합니다.','사고자 인적사항, 기업 현황, 사고 경위, 기업·학교 조치사항, 사후 관리 계획의 누락 여부를 확인합니다.','제출 후 수신 여부를 확인하고 추가·변경 사항은 지사 담당자에게 공유합니다.'],forms:['report'],contacts:['branch']}
  ],
  after:[
   {title:'기업 재발방지계획서 취합·확인',bullets:['학습기업이 작성한 산업재해재발방지계획서(별첨2)를 취합합니다.','발생 과정과 원인, 교육적·기술적·관리적 재발방지대책이 구체적으로 작성되었는지 확인합니다.','센터의 지사 보고도 사고 발생일부터 10일 이내이므로 학습기업 제출 일정을 미리 조율합니다.'],forms:['recurrence'],contacts:['company']},
   {title:'재발방지계획서 지사 보고',deadline:'사고 발생일부터 10일 이내',bullets:['사고 발생일부터 10일 이내에 학습기업이 작성한 산업재해재발방지계획서(별첨2)를 공단 지부·지사에 보고합니다.','안전사고 보고서, 기업 조치사항 및 사후 관리 계획과 내용이 일치하는지 확인합니다.','보고 내용과 제출 결과를 센터·지사 정·부 담당자와 공유하여 누락을 방지합니다.'],forms:['recurrence'],contacts:['branch']},
   {title:'개선 이행·사후관리 점검',bullets:['학습기업의 재발방지대책, 추가 안전보건교육 등 사후 관리 계획 이행을 확인합니다.','학습근로자 보호와 훈련 관련 상황을 학습기업과 공유합니다.','지사의 현장 모니터링에 협조하고 담당자 연락처·관련 서식 정보를 현행화합니다.']}
  ],
  specials:[
   {title:'3일 이내 제출하는 안전사고 보고서',paragraphs:['학습기업에서 확인한 발생 경위와 기업 조치사항을 바탕으로 별첨1을 작성합니다.','학교·보호자에게 상황을 공유한 내역과 사후 관리 계획을 함께 확인하고, 관할 공단 지부·지사에 보고합니다.']},
   {title:'10일 이내 제출하는 재발방지계획서',paragraphs:['학습기업이 작성한 별첨2를 취합하여 공단 지부·지사에 보고합니다.','기업의 센터 보고와 센터의 지사 보고가 모두 사고 발생일부터 10일 이내이므로, 사전에 전달·검토 일정을 조율합니다.']},
   {title:'정·부 담당자 공유와 개인정보 관리',paragraphs:['사고 대응과 서류 제출 상황을 정·부 담당자 간 공유하여 담당자 부재에 따른 업무 공백을 줄입니다.','작성한 보고서에는 인적사항·부상 정보 등이 포함되므로 담당자가 지정한 업무 제출 경로로 전달하세요. 이 화면은 안내·빈 서식 열람용이며 작성한 사고 자료를 업로드하는 기능은 없습니다.']}
  ]
 }
});
export function roleFromUrl(url){return new URL(url).searchParams.get('role')==='center'?'center':'company';}
export function stepsForRole(role){const m=MANUALS[role]||MANUALS.company;return [...m.immediate.map(x=>({...x,phase:'사고 직후'})),...m.after.map(x=>({...x,phase:'사고 이후'}))];}
export function phoneHref(value){
 if(typeof value!=='string'||!/^\+?[\d\s()-]{2,25}$/.test(value.trim()))return null;
 const number=value.replace(/[^\d+]/g,'');return /^\+?\d{2,15}$/.test(number)?'tel:'+number:null;
}
