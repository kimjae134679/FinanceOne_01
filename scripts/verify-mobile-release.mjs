import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('www/app.js');
const index = read('www/index.html');
const css = read('www/pc-v6.css');
const mobileCss = read('www/mobile-app.css');
const releaseCss = read('www/release-v171.css');
const gradle = read('android/app/build.gradle');
const workflow = read('.github/workflows/android-build.yml');
const googlePlugin = read('android/app/src/main/java/com/financeone/mobile/FinanceOneGooglePlugin.java');
const existingStockSpec = read('FOOD_EXISTING_STOCK_SPEC_v1_KO.md');

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
if (!app.includes('calendarHeatStyle') || !releaseCss.includes('--heat-color') || !releaseCss.includes('linear-gradient(90deg,#35b96f')) {
  throw new Error('소비 캘린더의 녹색→빨강 지출 강도 표시가 누락되었습니다.');
}
if (!app.includes('class="bar-scroll"') || !releaseCss.includes('calc(var(--bar-count) * 54px)')) {
  throw new Error('좁은 화면용 차트 가로 스크롤 처리가 누락되었습니다.');
}
if (!releaseCss.includes('.dark .budget-section-row') || !releaseCss.includes('.dark .tabs button.active')) {
  throw new Error('다크 모드 표·탭 대비 보정이 누락되었습니다.');
}
if (!app.includes('ensureModalCloseButtons') || !app.includes("addEventListener('backbutton'") || !releaseCss.includes('max-height:calc(100dvh')) {
  throw new Error('모바일 모달 닫기·안전 영역 처리가 누락되었습니다.');
}

if (app.includes("type:'finish'") || app.includes('type:"finish"')) {
  throw new Error('다 먹음 상태가 별도 먹은 날짜 기록으로 생성됩니다.');
}
if (!app.includes("purchaseIds.forEach(purchaseId=>")) {
  throw new Error('한 끼에 여러 식재료를 함께 기록하는 처리가 누락되었습니다.');
}
if (!app.includes("S.foodPurchases.filter(p=>!foodIsFinished(p)&&foodMatches(p))")) {
  throw new Error('다 먹은 구매 건이 재고 목록에서 제외되지 않습니다.');
}
if (!app.includes("S.foodPurchases.push({id:uid()") || !app.includes("purchaseId,type:'portion'")) {
  throw new Error('같은 식품 재구매를 독립 구매 ID로 기록하지 않습니다.');
}
if (!app.includes('id="addExistingFood"') || !app.includes("source:'existing',priceKnown")) {
  throw new Error('구매일 없는 기존 재고 등록 기능이 누락되었습니다.');
}
if (!app.includes("source==='existing'?'':") || !app.includes("!foodHasPrice(p)?'금액 미기록'")) {
  throw new Error('기존 재고의 구매일·가격 미기록 처리가 누락되었습니다.');
}
if (!app.includes('foodMatches(p)&&foodHasPrice(p)') || !app.includes('가격이 있는 기록 기준')) {
  throw new Error('금액 미기록 재고가 식비 통계 또는 가격 비교에서 제외되지 않습니다.');
}
if (!existingStockSpec.includes('같은 상품을 다시 등록하거나 새로 구매해도 각각 독립 재고로 저장')) {
  throw new Error('기존 재고 기능 기획서가 누락되었거나 구현 기준과 다릅니다.');
}

console.log(`PASS: FinanceOne Mobile v${pkg.version} Google 동기화·거래 날짜·모달·식비·버전·캐시 반영 확인`);
