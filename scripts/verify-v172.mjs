import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('www/app.js','utf8');
const css=fs.readFileSync('www/release-v172.css','utf8');
const cut=app.indexOf('async function initialize()');
assert.ok(cut>0,'앱 테스트 구간을 찾지 못했습니다.');
const storage=new Map();
const context=vm.createContext({
  console,
  window:{},
  localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  setTimeout,clearTimeout,Date,Math,JSON,Intl,URL,Blob
});
vm.runInContext(app.slice(0,cut)+`
S={
  transactions:[],categories:[],payments:[],accounts:[],budgets:[],subscriptions:[],stocks:[],
  settings:{periodMode:'rolling'},
  foodPurchases:[{id:'rice',name:'햇반현미 130g',category:'햇반현미 130g',source:'purchase',priceKnown:true,purchaseDate:'2026-07-24',price:10980,totalAmount:12,totalUnit:'개',finishedDate:''}],
  foodConsumptions:Array.from({length:6},(_,i)=>({id:'rice-'+i,purchaseId:'rice',mealId:'meal-'+i,type:'portion',date:'2026-07-'+String(20+i).padStart(2,'0'),amount:1,unit:'회',cost:0}))
};
normalizeFoodData();
const rice=S.foodPurchases[0],riceEvents=S.foodConsumptions.filter(x=>x.purchaseId==='rice');
const riceResult={units:riceEvents.map(x=>x.unit),costs:riceEvents.map(x=>x.cost),sum:riceEvents.reduce((s,x)=>s+x.cost,0)};
periodMode='rolling';foodCategoryFilter='전체';
const riceStats=foodStats(),ricePrices=foodPrices();
S.foodPurchases=[{id:'milk',name:'우유',category:'우유',source:'purchase',priceKnown:true,purchaseDate:'2026-08-01',price:6000,totalAmount:3,totalUnit:'개',finishedDate:''}];
S.foodConsumptions=[];
const milk=S.foodPurchases[0];
finishFood(milk,'2026-08-05');
const finishResult={finishedDate:milk.finishedDate,events:S.foodConsumptions.map(x=>({date:x.date,amount:x.amount,unit:x.unit,cost:x.cost,autoFinished:x.autoFinished}))};
globalThis.qa={riceResult,riceStats,ricePrices,finishResult};
`,context);

assert.deepEqual([...context.qa.riceResult.units],Array(6).fill('개'),'묶음 상품의 기존 1회 기록이 1개로 정규화되지 않았습니다.');
assert.deepEqual([...context.qa.riceResult.costs],Array(6).fill(915),'햇반 10,980원/12개의 회당 915원 계산이 틀렸습니다.');
assert.equal(context.qa.riceResult.sum,5490,'6개 섭취 금액 합계가 틀렸습니다.');
assert.ok(context.qa.riceStats.includes('5,490원'),'최근 1개월 식비 통계에 햇반 소비금액이 표시되지 않습니다.');
assert.ok(!context.qa.riceStats.includes('<table'),'모바일 종류별 통계가 다시 넓은 표로 회귀했습니다.');
assert.ok(context.qa.ricePrices.includes('915원/개'),'가격 비교에 햇반 개당 단가가 표시되지 않습니다.');
assert.equal(context.qa.finishResult.finishedDate,'2026-08-05');
assert.equal(context.qa.finishResult.events.length,1,'먹은 기록 없는 다 먹음이 한 건으로 남지 않았습니다.');
assert.deepEqual({...context.qa.finishResult.events[0]},{date:'2026-08-05',amount:3,unit:'개',cost:6000,autoFinished:true},'완료일에 남은 전량과 총액이 기록되지 않았습니다.');

for(const token of ['data-period-mode="rolling"','data-period-mode="month"','dateInPeriod(x.date)','food-history-list','food-stats-list','food-compare-list','autoFinished:true','data-food-meal-amount','CATEGORY_ICON_SUGGESTIONS',"calendarTx().filter(x=>x.type==='지출'&&(!excludeRent||!rentTx(x)))"]){
  assert.ok(app.includes(token),`v1.7.2 필수 구현 누락: ${token}`);
}
for(const token of ['.period-switch','.food-history-list','.food-stats-list','.food-compare-list','@media(max-width:900px)']){
  assert.ok(css.includes(token),`v1.7.2 반응형 스타일 누락: ${token}`);
}
console.log('PASS: 최근 1개월·햇반 단가·다 먹음 자동 기록·모바일 목록 QA');
