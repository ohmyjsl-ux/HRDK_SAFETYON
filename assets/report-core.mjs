export const REPORTER_TYPES = ['고객', '직원', '수급업체 근로자'];
export const STATUSES = ['접수', '검토중', '조치중', '조치완료', '종결'];
export const MAX_IMAGE_BYTES = 1_600_000;
export const PRIVACY_VERSION = '2026-10-20-v1';
export function koreanDate(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Seoul', year:'numeric',month:'2-digit',day:'2-digit' }).format(now);
}
export class InputError extends Error { constructor(message, status=400) { super(message); this.status=status; } }
export function shortText(value, max, label, required=true) {
  const s = typeof value === 'string' ? value.trim() : '';
  if(required && !s) throw new InputError(`${label}을(를) 입력해 주세요.`);
  if(s.length>max) throw new InputError(`${label}은(는) ${max.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`);
  return s;
}
export function validateReport(input, now=new Date()) {
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new InputError('신고서 내용을 확인해 주세요.');
  if(input.website) throw new InputError('잠시 후 다시 시도해 주세요.');
  if(!REPORTER_TYPES.includes(input.reporterType)) throw new InputError('이용자 구분을 선택해 주세요.');
  const reportDate=shortText(input.reportDate,10,'확인일자');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || !Number.isFinite(Date.parse(reportDate+'T00:00:00Z')) || new Date(reportDate+'T00:00:00Z').toISOString().slice(0,10)!==reportDate || reportDate>koreanDate(now) || reportDate<'2000-01-01') throw new InputError('확인일자를 올바르게 선택해 주세요. 미래 날짜는 입력할 수 없습니다.');
  if(!['yes','no'].includes(input.privacyConsent)) throw new InputError('개인정보 수집·이용 동의 여부를 선택해 주세요.');
  if(input.reviewed!==true) throw new InputError('사진과 신고내용 확인 항목을 선택해 주세요.');
  let phone=null;
  if(input.privacyConsent==='yes' && input.phone) {
    phone=String(input.phone).replace(/[\s-]/g,'');
    if(!/^01[016789]\d{7,8}$/.test(phone)) throw new InputError('휴대전화번호를 확인해 주세요.');
  }
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId||'')) throw new InputError('접수 요청을 새로 시작해 주세요.');
  return {submission_id:input.submissionId,reporter_type:input.reporterType,report_date:reportDate,location:shortText(input.location,100,'위험장소/제도개선 분야'),content:shortText(input.content,2000,'신고내용'),phone,privacy_consent:input.privacyConsent==='yes',privacy_version:PRIVACY_VERSION,reviewed:true};
}
export function validatePhoto(dataUrl, required=false) {
  if(!dataUrl) { if(required) throw new InputError('분석할 사진을 먼저 선택해 주세요.'); return null; }
  if(typeof dataUrl!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) throw new InputError('JPEG 형식의 현장 사진을 사용해 주세요.');
  const b64=dataUrl.slice(dataUrl.indexOf(',')+1);
  if(b64.length%4!==0||b64.length>Math.ceil(MAX_IMAGE_BYTES/3)*4) throw new InputError('사진 용량이 너무 큽니다. 다시 촬영해 주세요.');
  let binary; try {binary=atob(b64);} catch {throw new InputError('사진 파일을 읽을 수 없습니다.');}
  if(binary.length>MAX_IMAGE_BYTES || binary.length<16 || binary.charCodeAt(0)!==255 || binary.charCodeAt(1)!==216 || binary.charCodeAt(2)!==255 || binary.charCodeAt(binary.length-2)!==255 || binary.charCodeAt(binary.length-1)!==217) throw new InputError('사진 파일을 읽을 수 없습니다. 다시 선택해 주세요.');
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
export function validateAnalysis(value) {
  if(!value || !['hazards_found','no_clear_hazard','unclear_image'].includes(value.image_status) || !Array.isArray(value.findings) || value.findings.length>5) throw new InputError('분석 결과를 정리하지 못했습니다. 직접 작성하거나 다시 분석해 주세요.',502);
  const findings=value.image_status==='hazards_found'?value.findings.map((f,i)=>({id:String(i+1),observation:shortText(f.observation,300,'관찰내용'),risk:shortText(f.risk,300,'예상위험'),suggestion:shortText(f.suggestion,300,'개선의견')})):[];
  if(value.image_status==='hazards_found'&&!findings.length) throw new InputError('분석 결과를 정리하지 못했습니다.',502);
  return {image_status:value.image_status,findings,note:shortText(value.note,500,'분석안내',false)};
}
export function draftFromFindings(findings) {
  return findings.map((f,i)=>`${findings.length>1?`${i+1}. `:''}${f.observation}\n예상 위험: ${f.risk}\n개선 요청: ${f.suggestion}`).join('\n\n').slice(0,2000);
}
export function escapeHtml(s) {return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function safeCell(value) {const s=String(value??'');return /^[\s]*[=+@-]/.test(s)?"'"+s:s;}
