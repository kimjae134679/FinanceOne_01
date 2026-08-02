import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(process.argv[2] || 'www/app.js', 'utf8');
const start = app.indexOf('const FOOD_UNITS=');
const end = app.indexOf('function foodQuickForm', start);
assert.ok(start >= 0 && end > start, '식비 계산 함수 구간을 찾지 못했습니다.');

const context = vm.createContext({
  console,
  S: {
    foodPurchases: [
      {id:'old-pasta',name:'파스타 면',category:'파스타 면',source:'existing',priceKnown:false,purchaseDate:'',price:0,totalAmount:4,totalUnit:'회',finishedDate:''},
      {id:'new-pasta',name:'파스타 면',category:'파스타 면',source:'purchase',priceKnown:true,purchaseDate:'2026-08-02',price:8000,totalAmount:4,totalUnit:'회',finishedDate:''}
    ],
    foodConsumptions: [
      {id:'old-e1',mealId:'meal-1',purchaseId:'old-pasta',date:'2026-08-01',amount:1,unit:'회',cost:999},
      {id:'old-e2',mealId:'meal-2',purchaseId:'old-pasta',date:'2026-08-02',amount:1,unit:'회',cost:999},
      {id:'new-e1',mealId:'meal-3',purchaseId:'new-pasta',date:'2026-08-02',amount:1,unit:'회',cost:0}
    ]
  }
});

vm.runInContext(`
const money=n=>Math.round(Number(n)||0).toLocaleString('ko-KR')+'원';
${app.slice(start, end)}
globalThis.foodQa={foodPurchase,foodHasPrice,foodPurchaseDateLabel,recalculateFoodPurchaseCosts,foodMealCostLabel,foodIsFinished};
`, context);

const {S, foodQa:q} = context;
const oldStock = q.foodPurchase('old-pasta');
const newStock = q.foodPurchase('new-pasta');

assert.equal(oldStock.purchaseDate, '', '기존 재고에 구매일이 생성됐습니다.');
assert.equal(q.foodPurchaseDateLabel(oldStock), '기존 보유 재고 · 구매일 미기록');
assert.equal(q.foodHasPrice(oldStock), false);
q.recalculateFoodPurchaseCosts(oldStock);
assert.deepEqual(S.foodConsumptions.filter(x=>x.purchaseId===oldStock.id).map(x=>x.cost), [0,0], '가격 미기록 재고가 금액에 관여합니다.');
assert.equal(q.foodMealCostLabel(S.foodConsumptions.filter(x=>x.purchaseId===oldStock.id)), '금액 미기록');
assert.deepEqual(S.foodPurchases.filter(q.foodHasPrice).map(x=>x.id), ['new-pasta'], '가격 비교 대상 필터가 잘못됐습니다.');

oldStock.priceKnown=true;
oldStock.price=6000;
oldStock.finishedDate='2026-08-02';
q.recalculateFoodPurchaseCosts(oldStock);
assert.equal(S.foodConsumptions.filter(x=>x.purchaseId===oldStock.id).reduce((sum,x)=>sum+x.cost,0), 6000, '나중에 입력한 가격이 기존 먹은 기록에 재정산되지 않습니다.');
assert.equal(S.foodPurchases.filter(x=>!q.foodIsFinished(x)).map(x=>x.id).includes(oldStock.id), false, '다 먹은 재고가 재고 목록에 남습니다.');
assert.equal(S.foodConsumptions.filter(x=>x.purchaseId===oldStock.id).length, 2, '다 먹음 처리로 먹은 기록이 사라졌습니다.');
assert.notEqual(oldStock.id, newStock.id, '같은 식품을 다시 산 기록이 이전 재고와 합쳐졌습니다.');

console.log('PASS: 기존 재고 등록·금액 제외·재정산·완료·동일품목 재등록 시나리오');
