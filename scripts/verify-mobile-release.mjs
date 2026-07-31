import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('www/app.js');
const index = read('www/index.html');
const css = read('www/pc-v6.css');
const gradle = read('android/app/build.gradle');
const workflow = read('.github/workflows/android-build.yml');

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

console.log(`PASS: FinanceOne Mobile v${pkg.version} 식비 기능·버전·캐시 반영 확인`);
