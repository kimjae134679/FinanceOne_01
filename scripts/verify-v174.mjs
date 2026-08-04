import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const webRoot=fs.existsSync(path.join(root,'www'))?path.join(root,'www'):root;
const app=fs.readFileSync(path.join(webRoot,'app.js'),'utf8');
const html=fs.readFileSync(path.join(webRoot,'index.html'),'utf8');
const css=fs.readFileSync(path.join(webRoot,'release-v174.css'),'utf8');

const checks=[
  [app.includes("const rentFilterLabel=()=>excludeRent?'월세 제외':'월세 포함'"),'월세 필터 현재 상태 문구'],
  [!app.includes("excludeRent?'월세 포함':'월세 제외'"),'뒤집힌 월세 문구 제거'],
  [app.includes("filter(x=>!excludeRent||!rentTx(x))"),'월세 제외 계산 유지'],
  [app.includes('const GOOGLE_BACKUP_PAGE_SIZE=7'),'백업 페이지 크기 7개'],
  [app.includes('googleBackups.slice(backupStart,backupStart+GOOGLE_BACKUP_PAGE_SIZE)'),'백업 페이지 분할'],
  [app.includes('id="prevGoogleBackups"')&&app.includes('id="nextGoogleBackups"'),'백업 이전/다음 버튼'],
  [app.includes('data-font-size="normal"')&&app.includes('data-font-size="large"')&&app.includes('data-font-size="xlarge"'),'글씨 크기 3단계'],
  [app.includes('applyFontPreference()'),'글씨 크기 렌더 적용'],
  [html.includes('release-v174.css?v=1')&&html.includes('app.js?v=25'),'최신 리소스 캐시 갱신'],
  [css.includes('zoom:1.1')&&css.includes('zoom:1.2'),'글씨와 레이아웃 동시 확대'],
  [css.includes('overflow-wrap:anywhere')&&css.includes('.drive-backup-pager'),'확대 시 넘침 방지 및 페이지 UI']
];
const failed=checks.filter(([ok])=>!ok).map(([,label])=>label);
if(failed.length){console.error('v1.7.4 검증 실패:',failed.join(', '));process.exit(1)}
console.log('v1.7.4 공통 UI 검증 통과');

