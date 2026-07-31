import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('www/app.js');
const index = read('www/index.html');
const css = read('www/pc-v6.css');
const mobileCss = read('www/mobile-app.css');
const gradle = read('android/app/build.gradle');
const workflow = read('.github/workflows/android-build.yml');
const googlePlugin = read('android/app/src/main/java/com/financeone/mobile/FinanceOneGooglePlugin.java');

const required = [
  ['여러 식재료 선택', 'data-food-meal-pick'],
  ['한 끼 묶음 식별자', 'mealId'],
  ['먹은 날짜 누적', 'food-card-history'],
  ['다 먹음 재고 처리', 'data-food-finish'],
  ['먹은 기록 수정', 'data-food-meal-edit'],
  ['식비 통계', 'foodStats()'],
  ['가격 비교', 'foodPrices()'],
  ['모바일 구매 입력 접기', 'toggleFoodEntry']
];

for (const [label, token] of required) {
  if (!app.includes(token) && !css.includes(token)) {
    throw new Error(`모바일 식비 기능 누락: ${label} (${token})`);
  }
}

if (!gradle.includes(`versionName "${pkg.version}"`)) {
  throw new Error('package.json과 Android versionName이 다릅니다.');
}
if (!workflow.includes(`FinanceOne-v${pkg.version}-install-verified`)) {
  throw new Error('GitHub Actions APK 산출물 버전이 package.json과 다릅니다.');
}
if (!/app\.js\?v=\d+/.test(index) || !/pc-v6\.css\?v=\d+/.test(index)) {
  throw new Error('WebView 캐시 방지 버전이 누락되었습니다.');
}

if (!app.includes("result?.modifiedTime||result?.lastBackupTime")) {
  throw new Error('Drive 업로드 결과에서 원격 수정시간을 우선 사용하지 않습니다.');
}
const restoreOffer = app.slice(app.indexOf('function offerGoogleRestore'), app.indexOf('async function checkGoogleRemoteOnStart'));
if (restoreOffer.includes('markRemoteSynced(')) {
  throw new Error('사용자가 복원을 수락하기 전에 원격 백업을 동기화 완료로 기록합니다.');
}
if (!app.includes('offerGoogleRestore(latest,{enableAutoOnRestore:true})')) {
  throw new Error('자동 동기화를 켜기 전에 원격 백업을 확인하는 보호 흐름이 누락되었습니다.');
}
if (!googlePlugin.includes('uploaded.optString("modifiedTime", createdAt)')) {
  throw new Error('Android 네이티브 백업이 Drive 수정시간을 저장하지 않습니다.');
}

const txModal = app.slice(app.indexOf('function txModal'), app.indexOf('function dayModal'));
if (!txModal.includes("else{S.transactions.push(n);rememberTransactionDate(date)}")) {
  throw new Error('새 거래 저장 시 선택 날짜를 기억하지 않습니다.');
}
if (/if\(id\)[^;]*rememberTransactionDate/.test(txModal)) {
  throw new Error('거래 수정 날짜가 새 거래 기본 날짜를 오염시킵니다.');
}
if (!mobileCss.includes('.modal-actions{position:static!important;bottom:auto!important')) {
  throw new Error('모바일 거래창 저장·취소 버튼이 입력란 뒤에 고정되지 않았습니다.');
}

if (app.includes("type:'finish'") || app.includes('type:"finish"')) {
  throw new Error('다 먹음 상태가 별도 먹은 날짜 기록으로 생성됩니다.');
}
if (!app.includes("purchaseIds.forEach(purchaseId=>")) {
  throw new Error('한 끼에 여러 식재료를 함께 기록하는 처리가 누락되었습니다.');
}

console.log(`PASS: FinanceOne Mobile v${pkg.version} Google 동기화·거래 날짜·모달·식비·버전·캐시 반영 확인`);
