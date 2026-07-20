const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const money=n=>Math.round(Number(n)||0).toLocaleString('ko-KR')+'원';
const num=v=>Number(String(v??0).replace(/[^0-9-]/g,''))||0;
const decimalNum=v=>Number(String(v??0).replace(/,/g,'').replace(/[^0-9.-]/g,''))||0;
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const today=new Date(), pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const monthKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const colors=['#ff585d','#2966ff','#42bd73','#8b63ff','#ffad2e','#2fc0b4','#8795aa'];

function sample(){
  const m=monthKey(today), day=n=>`${m}-${pad(n)}`;
  return {
    categories:[
      {id:uid(),area:'지출',section:'식비',item:'식재료',icon:'🛒',color:'#ff585d'},
      {id:uid(),area:'지출',section:'식비',item:'외식/배달',icon:'🍴',color:'#ff8a2a'},
      {id:uid(),area:'지출',section:'식비',item:'간식/음료',icon:'🥤',color:'#ffbd38'},
      {id:uid(),area:'지출',section:'교통',item:'대중교통',icon:'🚌',color:'#2966ff'},
      {id:uid(),area:'지출',section:'생활',item:'생활비',icon:'🏠',color:'#42bd73'},
      {id:uid(),area:'지출',section:'여가',item:'문화/여가',icon:'🎮',color:'#8b63ff'},
      {id:uid(),area:'지출',section:'고정비',item:'정기 구독',icon:'↻',color:'#ffad2e'},
      {id:uid(),area:'지출',section:'기타',item:'기타 지출',icon:'•••',color:'#8795aa'},
      {id:uid(),area:'수입',section:'근로',item:'급여',icon:'₩',color:'#2966ff'},
      {id:uid(),area:'수입',section:'기타',item:'기타 수입',icon:'＋',color:'#42bd73'},
      {id:uid(),area:'이체',section:'계좌 이동',item:'계좌 이체',icon:'⇄',color:'#2fc0b4'}
    ],
    payments:[
      {id:'p1',name:'카드(신한)',icon:'💳',color:'#2966ff'},
      {id:'p2',name:'카카오뱅크',icon:'🏦',color:'#ffad2e'},
      {id:'p3',name:'현금',icon:'₩',color:'#42bd73'}
    ],
    accounts:[
      {id:'a1',type:'입출금',name:'우리은행 입출금통장',opening:5200000},
      {id:'a2',type:'예금',name:'신한은행 정기예금',opening:4600000},
      {id:'a3',type:'투자',name:'키움증권 종합계좌',opening:5420000}
    ],
    transactions:[
      {id:uid(),date:day(1),type:'수입',area:'수입',section:'근로',item:'급여',title:'월급',amount:2800000,paymentId:'p2',accountId:'a1',memo:'7월 급여'},
      {id:uid(),date:day(1),type:'지출',area:'지출',section:'식비',item:'식재료',title:'마트 장보기',amount:-48700,paymentId:'p1',accountId:'a1',memo:'식재료 구입'},
      {id:uid(),date:day(1),type:'지출',area:'지출',section:'교통',item:'대중교통',title:'교통카드',amount:-54000,paymentId:'p1',accountId:'a1',memo:'월 충전'},
      {id:uid(),date:day(2),type:'지출',area:'지출',section:'식비',item:'외식/배달',title:'점심 식사',amount:-12000,paymentId:'p1',accountId:'a1',memo:'회사 근처'},
      {id:uid(),date:day(2),type:'지출',area:'지출',section:'식비',item:'간식/음료',title:'카페',amount:-5500,paymentId:'p3',accountId:'a1',memo:''}
    ],
    budgets:[
      {id:uid(),area:'지출',section:'식비',item:'식재료',amount:300000},
      {id:uid(),area:'지출',section:'식비',item:'외식/배달',amount:250000},
      {id:uid(),area:'지출',section:'교통',item:'대중교통',amount:200000},
      {id:uid(),area:'지출',section:'고정비',item:'정기 구독',amount:120000}
    ],
    subscriptions:[{id:uid(),service:'Netflix',category:'OTT',price:17000,day:23,paymentId:'p1',accountId:'a1',active:true}],
    stocks:[],
    settings:{dark:false,theme:'light',autoSave:true,googleAutoSync:false,currency:'KRW',dateFormat:'YYYY-MM-DD'}
  };
}

let S=sample(),desktopInfo=null,googleInfo={connected:false},appReady=false;
let page='dashboard', selectedMonth=monthKey(today), txFilter='전체', lastTransactionDate=iso(today), foodMode='일', foodTab='summary', analysisMode='overview', analysisArea='지출', analysisSection='식비', analysisItem='외식/배달', excludeRent=false;
let lastTransactionCategory={지출:{section:'',item:''},수입:{section:'',item:''},이체:{section:'',item:''}};
let openBudgetSections=new Set();
const googleBridge=()=>window.financeOne?.isDesktop?window.financeOne:window.Capacitor?.Plugins?.FinanceOneGoogle;
let mobileSyncTimer=0,mobilePendingState=null;
function scheduleMobileGoogleSync(){
  const bridge=googleBridge();
  if(window.financeOne?.isDesktop||!bridge?.googleUpload||!googleInfo.connected||S.settings.googleAutoSync!==true)return;
  mobilePendingState=JSON.parse(JSON.stringify(S));
  clearTimeout(mobileSyncTimer);
  const last=Number(localStorage.getItem('financeone_google_last_upload')||0);
  const delay=Math.max(30000,15*60*1000-(Date.now()-last));
  mobileSyncTimer=setTimeout(async()=>{const state=mobilePendingState;mobilePendingState=null;try{if(state){await bridge.googleUpload(state);localStorage.setItem('financeone_google_last_upload',String(Date.now()))}}catch(error){console.warn('Mobile Google auto sync failed',error)}},delay);
}
const save=()=>window.financeOne?.isDesktop
  ? window.financeOne.save(S).catch(()=>toast('SQLite 저장에 실패했습니다.'))
  : (localStorage.setItem('financeone_v5',JSON.stringify(S)),scheduleMobileGoogleSync());
let toastTimer;
const toast=m=>{const t=$('#toast');clearTimeout(toastTimer);t.textContent=m;t.classList.add('show');toastTimer=setTimeout(()=>t.classList.remove('show'),2200)};
const monthTx=()=>S.transactions.filter(x=>x.date.startsWith(selectedMonth));
const paymentOptions=()=>S.accounts.filter(x=>x.paymentEnabled).map(x=>({id:x.id,name:x.name,icon:x.paymentIcon||'💳',color:x.paymentColor||'#2966ff'}));
const pay=id=>{const a=S.accounts.find(x=>x.id===id);if(a)return{name:a.name,icon:a.paymentIcon||'💳',color:a.paymentColor||'#2966ff'};return S.payments.find(x=>x.id===id)||{name:'미지정',icon:'?',color:'#8795aa'}};
const account=id=>S.accounts.find(x=>x.id===id)||{name:'미지정'};
const majorAreas=['지출','수입','이체'];
const cat=(a,s,i)=>S.categories.find(x=>(a==null||x.area===a)&&(s==null||x.section===s)&&x.item===i)||{icon:'•',color:'#8795aa'};
const txCatLabel=x=>`${x.area==='이체'?'이체':x.section}${x.item&&x.item!==x.section?` · ${x.item}`:''}`;
const txIcon=x=>x.icon||cat(x.area,x.section,x.item).icon||(x.type==='수입'?'＋':x.type==='이체'?'⇄':'−');
const txAsset=x=>x.type==='이체'?`${account(x.accountId).name}${x.targetAccountId?` → ${account(x.targetAccountId).name}`:''}`:pay(x.paymentId).name;
const areas=()=>[...new Set(S.categories.map(x=>x.area))];
const sections=a=>[...new Set(S.categories.filter(x=>x.area===a).map(x=>x.section))];
const items=(a,s)=>S.categories.filter(x=>x.area===a&&x.section===s);
const rentTx=x=>x.type==='지출'&&(x.item==='월세'||x.title==='월세'||x.section==='월세'||String(x.title||'').includes('월세'));
const visibleMonthTx=()=>monthTx().filter(x=>!excludeRent||!rentTx(x));
const totals=()=>{const tx=visibleMonthTx(),inc=tx.filter(x=>x.type==='수입').reduce((a,b)=>a+Math.abs(b.amount),0),exp=tx.filter(x=>x.type==='지출').reduce((a,b)=>a+Math.abs(b.amount),0);return{inc,exp,sav:inc-exp}};
const usedFor=b=>monthTx().filter(x=>x.type==='지출'&&x.area===b.area&&x.section===b.section&&x.item===b.item).reduce((a,x)=>a+Math.abs(x.amount),0);
const accountFlow=id=>S.transactions.reduce((sum,x)=>sum+(x.accountId===id?Number(x.amount)||0:0)+(x.targetAccountId===id?Math.abs(Number(x.amount)||0):0),0);
const balance=a=>a.trackBalance===false?0:(Number(a.opening)||0)+accountFlow(a.id);
function normalizeTransactions(){S.transactions.forEach(x=>{if(x.area==='수입'||x.type==='수입'){x.type='수입';x.area='수입';x.amount=Math.abs(Number(x.amount)||0)}else if(x.area==='지출'||x.type==='지출'){x.type='지출';x.area='지출';x.amount=-Math.abs(Number(x.amount)||0)}else if(x.area==='이체'||x.type==='이체'){x.type='이체';x.area='이체'}})}
function normalizeAssetPayments(){S.accounts.forEach(a=>{if(a.trackBalance==null)a.trackBalance=true;if(a.paymentEnabled==null)a.paymentEnabled=false;a.paymentIcon=a.paymentIcon||'💳';a.paymentColor=a.paymentColor||'#2966ff'});(S.payments||[]).forEach(p=>{let a=S.accounts.find(x=>x.legacyPaymentId===p.id);if(!a){a={id:uid(),type:'자산',name:p.name,opening:0,trackBalance:false,paymentEnabled:true,paymentIcon:p.icon||'💳',paymentColor:p.color||'#2966ff',legacyPaymentId:p.id};S.accounts.push(a)}S.transactions.filter(x=>x.paymentId===p.id).forEach(x=>x.paymentId=a.id);S.subscriptions.filter(x=>x.paymentId===p.id).forEach(x=>x.paymentId=a.id)});S.payments=[];if(!paymentOptions().length&&S.accounts.length)S.accounts[0].paymentEnabled=true}
function syncSubscriptions(){
  const current=monthKey(today),dueDay=today.getDate();
  S.subscriptions.forEach(s=>{
    const day=Math.min(s.day,new Date(today.getFullYear(),today.getMonth()+1,0).getDate());
    const dueDate=`${current}-${pad(day)}`,ref=`subscription:${s.id}:${current}`;
    let existing=S.transactions.find(x=>x.autoRef===ref);
    const manualDuplicate=S.transactions.find(x=>!x.autoRef&&x.type==='지출'&&x.date===dueDate&&(x.accountId===s.accountId||x.paymentId===s.paymentId)&&Math.abs(Number(x.amount)||0)===Math.abs(Number(s.price)||0)&&(String(x.title||'').includes(s.service)||String(x.item||'')===s.category||String(x.item||'')==='월세'));
    if(manualDuplicate&&existing){S.transactions=S.transactions.filter(x=>x.id!==existing.id);existing=null}
    if(existing){
      if(!s.active&&dueDate>=todayStr()){S.transactions=S.transactions.filter(x=>x.id!==existing.id);return}
      if(s.active)Object.assign(existing,{date:dueDate,title:`${s.service} 정기결제`,amount:-Math.abs(s.price),paymentId:s.paymentId,accountId:s.accountId});
      return;
    }
    if(manualDuplicate||!s.active||s.day>dueDay)return;
    S.transactions.push({id:uid(),autoRef:ref,date:dueDate,type:'지출',area:'지출',section:'고정비',item:'정기 구독',title:`${s.service} 정기결제`,amount:-Math.abs(s.price),paymentId:s.paymentId,accountId:s.accountId,memo:'정기구독 자동 차감'});
  });
}

function changeMonth(delta){const [y,m]=selectedMonth.split('-').map(Number),d=new Date(y,m-1+delta,1);selectedMonth=monthKey(d);render()}
function header(title,actions=''){const [y,m]=selectedMonth.split('-');return `<div class="top"><div><h1>${title}</h1></div><div class="controls"><button class="pill" data-month="-1">‹</button><span class="month-label">${y}년 ${Number(m)}월</span><button class="pill" data-month="1">›</button>${actions}</div></div>`}
function metric(icon,kind,title,value,sub=''){return `<div class="card metric"><div class="ico ${kind}">${icon}</div><h4>${title}</h4><strong>${value}</strong><small>${sub}</small></div>`}
function empty(text){return `<div class="empty">${text}</div>`}
function categoryTotals(filter=()=>true){const map={};visibleMonthTx().filter(x=>x.type==='지출'&&filter(x)).forEach(x=>{map[x.item]=(map[x.item]||0)+Math.abs(x.amount)});return Object.entries(map).map(([name,value],i)=>({name,value,color:cat(null,null,name).color||colors[i%colors.length]}))}
function donut(data,center){const sum=data.reduce((a,b)=>a+b.value,0)||1;let at=0;const stops=data.map((x,i)=>{const from=at/sum*100;at+=x.value;return `${x.color||colors[i%colors.length]} ${from}% ${at/sum*100}%`}).join(',');return `<div class="donut" data-center="${esc(center)}" style="background:conic-gradient(${stops||'#edf1f7 0 100%'})"></div>`}
function legend(data){const sum=data.reduce((a,b)=>a+b.value,0)||1;return `<div class="legend">${data.map(x=>`<p><span><i class="dot" style="background:${x.color}"></i>${esc(x.name)}</span><b>${(x.value/sum*100).toFixed(1)}%</b><span>${money(x.value)}</span></p>`).join('')}</div>`}
function barChart(data,color='#2966ff'){const max=Math.max(...data.map(x=>x.value),1);return `<div class="bar-chart"><div class="axis-label">금액(원)</div><div class="bars">${data.map(x=>`<div class="bar-col" title="${esc(x.label)}: ${money(x.value)}"><b>${money(x.value)}</b><div class="vbar" style="height:${Math.max(4,x.value/max*145)}px;background:${x.color||color}"></div><span>${esc(x.label)}</span></div>`).join('')}</div></div>`}
function selectOptions(arr,value,label=x=>x){return arr.map(x=>`<option value="${esc(x.id??x)}" ${(x.id??x)===value?'selected':''}>${esc(label(x))}</option>`).join('')}
function categorySelects(prefix,a='지출',s='',i=''){a=areas().includes(a)?a:areas()[0];s=sections(a).includes(s)?s:sections(a)[0];const opts=items(a,s).map(x=>({id:x.item,label:x.item}));i=opts.some(x=>x.id===i)?i:(opts[0]?.id||'');return `<select id="${prefix}Area" data-chain="${prefix}">${selectOptions(areas(),a)}</select><select id="${prefix}Section" data-chain="${prefix}">${selectOptions(sections(a),s)}</select><select id="${prefix}Item">${selectOptions(opts,i,x=>x.label)}</select>`}

function side(){const t=totals();$('#side').innerHTML=`<h3>이번 달 요약</h3><p><b class="blue">수입</b><strong>${money(t.inc)}</strong></p><p><b class="red">지출</b><strong>${money(t.exp)}</strong></p><p><b class="green">잔액</b><strong>${money(t.sav)}</strong></p>`}
function dashboard(){const t=totals(),spend=categoryTotals(),recent=[...visibleMonthTx()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6),tracked=S.accounts.filter(x=>x.trackBalance!==false);return header('대시보드','<button class="pill rent-toggle '+(excludeRent?'active':'')+'" id="toggleRent">'+(excludeRent?'월세 포함':'월세 제외')+'</button><button class="btn primary" id="addTx">+ 거래 추가</button>')+`<div class="grid cols4">${metric('＋','soft-blue','이번 달 수입',money(t.inc),`${visibleMonthTx().filter(x=>x.type==='수입').length}건`)}${metric('−','soft-red','이번 달 지출',money(t.exp),`${visibleMonthTx().filter(x=>x.type==='지출').length}건`)}${metric('₩','soft-green','이번 달 잔액',money(t.sav),'수입 − 지출')}${metric('⌂','soft-purple','총 자산',money(tracked.reduce((a,x)=>a+balance(x),0)),`${tracked.length}개 자산`)}</div><div class="grid cols2 section-gap"><div class="card"><h3>카테고리별 지출</h3>${spend.length?`<div class="chart-pair">${donut(spend,`총 지출\n${money(t.exp)}`)}${legend(spend)}</div>`:empty('이번 달 지출이 없습니다.')}</div><div class="card"><h3>일별 지출 추이</h3>${barChart(dailyData())}</div></div><div class="grid cols2 section-gap"><div class="card"><div class="card-head"><h3>소비 캘린더</h3><span>날짜를 누르면 거래를 확인할 수 있습니다.</span></div>${calendar()}</div><div class="card"><div class="card-head"><h3>최근 거래</h3><button class="link" data-go="transactions">전체 보기</button></div>${recent.length?recent.map(txLine).join(''):empty('거래가 없습니다.')}</div></div>`}
function txLine(x){return `<div class="tx-line compact-tx" data-edit-tx="${x.id}" tabindex="0" role="button"><i class="tx-dot ${x.type==='수입'?'income':x.type==='이체'?'transfer':'expense'}">${txIcon(x)}</i><div class="tx-copy"><b class="tx-title">${esc(x.title)}</b><span class="tx-meta-row"><i class="tx-meta-text">${esc(txCatLabel(x))} ㅣ ${esc(txAsset(x))}${Number(x.splitCount)>1?` ㅣ ${Number(x.splitCount)}N빵`:''}</i><span class="tx-inline-actions"><button class="tx-copy-btn" data-copy-tx="${x.id}" title="거래 복사" aria-label="거래 복사">=</button><button class="tx-delete-btn" data-del-tx="${x.id}" title="거래 삭제" aria-label="거래 삭제">×</button></span></span></div><strong class="${x.amount>=0?'blue':'red'}">${x.amount>=0?'+':''}${money(x.amount)}</strong></div>`}
function dailyData(filter=()=>true){const [y,m]=selectedMonth.split('-').map(Number),days=new Date(y,m,0).getDate(),map={};visibleMonthTx().filter(x=>x.type==='지출'&&filter(x)).forEach(x=>map[Number(x.date.slice(8))]=(map[Number(x.date.slice(8))]||0)+Math.abs(x.amount));return Array.from({length:days},(_,i)=>({label:`${i+1}일`,value:map[i+1]||0})).filter(x=>x.value||days<=14)}
function calendar(){const [y,m]=selectedMonth.split('-').map(Number),first=new Date(y,m-1,1).getDay(),days=new Date(y,m,0).getDate(),map={};monthTx().filter(x=>x.type==='지출').forEach(x=>map[Number(x.date.slice(8))]=(map[Number(x.date.slice(8))]||0)+Math.abs(x.amount));return `<div class="calendar"><div class="weekdays">${['일','월','화','수','목','금','토'].map(x=>`<b>${x}</b>`).join('')}</div><div class="cal-grid">${'<i></i>'.repeat(first)}${Array.from({length:days},(_,i)=>{const d=i+1,v=map[d]||0;return `<button data-day="${d}" class="${v?'spent':''}"><b>${d}</b>${v?`<span>${money(v)}</span>`:''}</button>`}).join('')}</div></div>`}

function transactions(){
  let list=[...monthTx()].sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)));
  if(txFilter!=='전체')list=list.filter(x=>x.type===txFilter);
  const byDate={};list.forEach(x=>(byDate[x.date]||(byDate[x.date]=[])).push(x));
  const dayName=d=>['일','월','화','수','목','금','토'][new Date(`${d}T00:00:00`).getDay()];
  const rows=Object.entries(byDate).map(([date,rows])=>{
    const sum=rows.reduce((a,x)=>a+x.amount,0);
    return `<section class="tx-day"><div class="tx-day-head"><span>${Number(date.slice(8))}일 ${dayName(date)}요일</span><b class="${sum>=0?'blue':'red'}">${sum>=0?'+':''}${money(sum)}</b></div>${rows.map(txLine).join('')}</section>`;
  }).join('');
  return header('거래 내역','<button class="btn primary" id="addTx">+ 거래 추가</button>')+`<div class="tabs tx-filter-tabs">${['전체','수입','지출','이체'].map(x=>`<button data-filter="${x}" class="${txFilter===x?'active':''}">${x}</button>`).join('')}</div><div class="tx-list-card">${list.length?rows:empty('조건에 맞는 거래가 없습니다.')}</div>`
}

function groupedStats(list,key){const map={};list.forEach(x=>{const name=x[key]||'미지정';const row=map[name]||(map[name]={name,value:0,count:0,last:''});row.value+=Math.abs(x.amount);row.count++;if(x.date>row.last)row.last=x.date});return Object.values(map).sort((a,b)=>b.value-a.value)}
function analysisTabs(){return `<div class="tabs analysis-tabs"><button data-analysis-mode="overview" class="${analysisMode==='overview'?'active':''}">전체 현황</button><button data-analysis-mode="detail" class="${analysisMode==='detail'?'active':''}">카테고리 상세 탐색</button></div>`}
function monthlyComparison(){const rows=[];for(let n=5;n>=0;n--){const [y,m]=selectedMonth.split('-').map(Number),d=new Date(y,m-1-n,1),key=monthKey(d),tx=S.transactions.filter(x=>x.date.startsWith(key)&&(!excludeRent||!rentTx(x)));rows.push({label:`${d.getMonth()+1}월`,income:tx.filter(x=>x.amount>0).reduce((a,x)=>a+x.amount,0),expense:Math.abs(tx.filter(x=>x.amount<0).reduce((a,x)=>a+x.amount,0))})}const max=Math.max(...rows.flatMap(x=>[x.income,x.expense]),1);return `<div class="dual-chart"><div class="chart-key"><span><i class="income"></i>수입</span><span><i class="expense"></i>지출</span></div><div class="dual-bars">${rows.map(x=>`<div class="dual-col"><div class="dual-values"><span title="수입 ${money(x.income)}" style="height:${Math.max(3,x.income/max*150)}px"></span><i title="지출 ${money(x.expense)}" style="height:${Math.max(3,x.expense/max*150)}px"></i></div><b>${x.label}</b><small>${money(x.income)}<br>${money(x.expense)}</small></div>`).join('')}</div></div>`}
function analysisOverview(){const t=totals(),tx=visibleMonthTx(),expenses=tx.filter(x=>x.type==='지출'),sectionsRows=groupedStats(expenses,'section'),itemRows=groupedStats(expenses,'item'),paymentRows=paymentOptions().map(p=>{const list=expenses.filter(x=>x.paymentId===p.id);return{name:`${p.icon} ${p.name}`,value:list.reduce((a,x)=>a+Math.abs(x.amount),0),count:list.length,color:p.color}}).filter(x=>x.count).sort((a,b)=>b.value-a.value),budgetTotal=S.budgets.reduce((a,b)=>a+b.amount,0),budgetUsed=S.budgets.reduce((a,b)=>a+usedFor(b),0),tracked=S.accounts.filter(x=>x.trackBalance!==false),assetTotal=tracked.reduce((a,x)=>a+balance(x),0),topDay=groupedStats(expenses.map(x=>({...x,day:x.date})),'day')[0];return header('분석 및 통계','<button class="pill rent-toggle '+(excludeRent?'active':'')+'" id="toggleRent">'+(excludeRent?'월세 포함':'월세 제외')+'</button>')+analysisTabs()+`<div class="grid cols4">${metric('＋','soft-blue','총 수입',money(t.inc),`${tx.filter(x=>x.amount>0).length}건`)}${metric('−','soft-red','총 지출',money(t.exp),`${expenses.length}건`)}${metric('₩','soft-green','수입 − 지출',money(t.sav),t.inc?`저축률 ${(t.sav/t.inc*100).toFixed(1)}%`:'수입 없음')}${metric('⌂','soft-purple','현재 총자산',money(assetTotal),`${tracked.length}개 자산`)}</div><div class="grid cols2 section-gap"><div class="card"><h3>최근 6개월 수입·지출</h3>${monthlyComparison()}</div><div class="card"><h3>이번 달 지출 분류</h3>${sectionsRows.length?`<div class="chart-pair">${donut(sectionsRows.map((x,i)=>({...x,color:colors[i%colors.length]})),`총 지출\n${money(t.exp)}`)}${legend(sectionsRows.map((x,i)=>({...x,color:colors[i%colors.length]})))}</div>`:empty('지출이 없습니다.')}</div></div><div class="overview-grid section-gap"><div class="card"><h3>지출 항목 TOP 5</h3>${statList(itemRows.slice(0,5),'data-analysis-overview-item','')}</div><div class="card"><h3>자산별 사용</h3>${paymentRows.length?`<table class="table"><tbody>${paymentRows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${x.count}건</td><td class="right"><b>${money(x.value)}</b></td></tr>`).join('')}</tbody></table>`:empty('사용 내역이 없습니다.')}</div><div class="card"><h3>예산 사용</h3><strong class="overview-big">${money(budgetUsed)} / ${money(budgetTotal)}</strong><div class="progress overview-progress"><span style="width:${budgetTotal?Math.min(100,budgetUsed/budgetTotal*100):0}%"></span></div><p class="hint">${budgetTotal?`${(budgetUsed/budgetTotal*100).toFixed(1)}% 사용 · ${money(budgetTotal-budgetUsed)} 남음`:'예산이 등록되지 않았습니다.'}</p></div><div class="card"><h3>한눈에 보는 기록</h3><div class="summary-lines"><p><span>총 거래</span><b>${tx.length}건</b></p><p><span>가장 많이 쓴 날</span><b>${topDay?.name||'없음'}</b></p><p><span>가장 큰 지출</span><b>${money(Math.max(...expenses.map(x=>Math.abs(x.amount)),0))}</b></p><p><span>평균 지출</span><b>${money(expenses.length?t.exp/expenses.length:0)}</b></p></div></div></div><div class="card section-gap"><div class="card-head"><h3>자산별 현재 잔액</h3><button class="link" data-go="assets">자산 관리로 이동</button></div><div class="account-overview">${tracked.map(a=>`<div><span>${esc(a.type)}</span><b>${esc(a.name)}</b><strong>${money(balance(a))}</strong></div>`).join('')}</div></div>`}
function analysisPage(){if(analysisMode==='overview')return analysisOverview();const detail=analysis();return detail.replace(header('분석 및 통계'),header('분석 및 통계')+analysisTabs())}
function analysisPicker(level){const all=monthTx().filter(x=>x.type!=='이체'),values=level==='area'?[...new Set(all.map(x=>x.area))]:level==='section'?[...new Set(all.filter(x=>x.area===analysisArea).map(x=>x.section))]:[...new Set(all.filter(x=>x.area===analysisArea&&x.section===analysisSection).map(x=>x.item))],title=level==='area'?'영역 선택':level==='section'?'분류 선택':'항목 선택',current=level==='area'?analysisArea:level==='section'?analysisSection:analysisItem;$('#submodal').innerHTML=`<div class="modal analysis-picker-modal"><div class="modalbox analysis-picker-box"><div class="modal-title"><div><h2>${title}</h2><p class="hint">선택 즉시 해당 기준으로 통계를 다시 계산합니다.</p></div><button class="close" id="closeAnalysisPicker">×</button></div><div class="analysis-choice-list">${values.map(v=>`<button data-analysis-choice="${esc(v)}" class="${v===current?'active':''}"><span>${esc(v)}</span><b>›</b></button>`).join('')}</div></div></div>`;$('#closeAnalysisPicker').onclick=closeSubmodal;$$('[data-analysis-choice]').forEach(b=>b.onclick=()=>{if(level==='area'){analysisArea=b.dataset.analysisChoice;analysisSection='';analysisItem=''}else if(level==='section'){analysisSection=b.dataset.analysisChoice;analysisItem=''}else analysisItem=b.dataset.analysisChoice;closeSubmodal();render()})}
function statList(data,attr,selected){return data.length?`<div class="stat-list">${data.map((x,i)=>`<button ${attr}="${esc(x.name)}" class="${selected===x.name?'active':''}"><i style="background:${colors[i%colors.length]}"></i><span><b>${esc(x.name)}</b><small>${x.count}건 · 최근 ${x.last.slice(5)}</small></span><strong>${money(x.value)}</strong></button>`).join('')}</div>`:empty('분석할 거래가 없습니다.')}
function analysis(){const all=monthTx().filter(x=>x.type!=='이체'),areaRows=groupedStats(all,'area');if(!areaRows.some(x=>x.name===analysisArea))analysisArea=areaRows[0]?.name||'지출';const areaTx=all.filter(x=>x.area===analysisArea),sectionRows=groupedStats(areaTx,'section');if(!sectionRows.some(x=>x.name===analysisSection))analysisSection=sectionRows[0]?.name||'';const sectionTx=areaTx.filter(x=>x.section===analysisSection),itemRows=groupedStats(sectionTx,'item');if(!itemRows.some(x=>x.name===analysisItem))analysisItem=itemRows[0]?.name||'';const itemTx=sectionTx.filter(x=>x.item===analysisItem),contentRows=groupedStats(itemTx,'title'),sum=itemTx.reduce((a,x)=>a+Math.abs(x.amount),0),top=contentRows[0];return header('분석 및 통계')+`<div class="analysis-path"><button data-analysis-pick="area">${analysisArea||'영역'} <i>⌄</i></button><b>›</b><button data-analysis-pick="section">${analysisSection||'분류'} <i>⌄</i></button><b>›</b><button data-analysis-pick="item">${analysisItem||'항목'} <i>⌄</i></button><span>각 단계를 눌러 분석 대상을 바꿀 수 있습니다.</span></div><div class="grid cols3">${metric('₩','soft-blue','선택 합계',money(sum),`${itemTx.length}건`)}${metric('◫','soft-green','건당 평균',money(itemTx.length?sum/itemTx.length:0),'선택 항목 기준')}${metric('★','soft-orange','가장 많이 쓴 내용',top?.name||'없음',top?`${top.count}건 · ${money(top.value)}`:'거래 없음')}</div><div class="analysis-grid section-gap"><div class="card"><h3>1. 영역</h3>${statList(areaRows,'data-analysis-area',analysisArea)}</div><div class="card"><h3>2. 분류</h3>${statList(sectionRows,'data-analysis-section',analysisSection)}</div><div class="card"><h3>3. 항목</h3>${statList(itemRows,'data-analysis-item',analysisItem)}</div></div><div class="grid cols2 section-gap"><div class="card"><h3>${esc(analysisItem)} 내용별 통계</h3>${statList(contentRows,'data-analysis-title','')}</div><div class="card"><h3>내용별 금액 비교</h3>${contentRows.length?barChart(contentRows.slice(0,10).map(x=>({label:x.name,value:x.value}))):empty('표시할 데이터가 없습니다.')}</div></div><div class="card section-gap"><h3>선택 항목 거래</h3>${itemTx.length?`<table class="table responsive-table"><thead><tr><th>날짜</th><th>내용</th><th>금액</th><th>자산</th><th>메모</th></tr></thead><tbody>${[...itemTx].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr class="clickable-row" data-row-edit="${x.id}" tabindex="0"><td data-label="날짜">${x.date}</td><td data-label="내용"><b>${esc(x.title)}</b></td><td data-label="금액" class="${x.amount>=0?'blue':'red'}"><b>${money(Math.abs(x.amount))}</b></td><td data-label="자산">${pay(x.paymentId).icon} ${esc(pay(x.paymentId).name)}</td><td data-label="메모">${esc(x.memo)}</td></tr>`).join('')}</tbody></table>`:empty('거래가 없습니다.')}</div>`}

function budget(){
  const rows=S.budgets.map(b=>({...b,used:usedFor(b)}));
  const grouped={};
  rows.forEach(b=>{const key=`${b.area}|${b.section}`;const g=grouped[key]||(grouped[key]={key,area:b.area,section:b.section,amount:0,used:0,items:[]});g.amount+=Number(b.amount)||0;g.used+=Number(b.used)||0;g.items.push(b)});
  const groups=Object.values(grouped).sort((a,b)=>b.amount-a.amount||a.section.localeCompare(b.section,'ko'));
  const total=groups.reduce((a,b)=>a+b.amount,0),used=groups.reduce((a,b)=>a+b.used,0);
  const body=groups.map(g=>{const r=g.amount?g.used/g.amount*100:0,open=openBudgetSections.has(g.key);return `<tbody class="budget-group"><tr class="budget-section-row" data-toggle-budget-section="${esc(g.key)}"><td><button class="budget-fold" aria-label="하위 예산 ${open?'접기':'펼치기'}">${open?'▾':'▸'}</button> <b>${esc(g.section)}</b><small>${g.items.length}개 항목</small></td><td><b>${money(g.amount)}</b></td><td>${money(g.used)}</td><td>${money(g.amount-g.used)}</td><td><b>${r.toFixed(1)}%</b><div class="progress"><span style="width:${Math.min(r,100)}%;background:${g.items[0]?cat(g.items[0].area,g.items[0].section,g.items[0].item).color:'#2966ff'}"></span></div></td><td></td></tr>${open?g.items.map(b=>{const ir=b.amount?b.used/b.amount*100:0;return `<tr class="budget-item-row"><td><span class="budget-indent">${cat(b.area,b.section,b.item).icon} ${esc(b.item)}</span></td><td>${money(b.amount)}</td><td>${money(b.used)}</td><td>${money(b.amount-b.used)}</td><td><b>${ir.toFixed(1)}%</b><div class="progress"><span style="width:${Math.min(ir,100)}%;background:${cat(b.area,b.section,b.item).color}"></span></div></td><td class="actions"><button data-edit-budget="${b.id}">수정</button><button data-del-budget="${b.id}">삭제</button></td></tr>`}).join(''):''}</tbody>`}).join('');
  return header('예산 관리','<button class="pill" id="manageCats">카테고리 관리</button><button class="btn primary" id="addBudget">+ 예산 추가</button>')+`<div class="grid cols3">${metric('₩','soft-blue','총 예산',money(total),`${groups.length}개 큰 분류`)}${metric('−','soft-red','사용액',money(used),'거래에서 자동 계산')}${metric('＋','soft-green','남은 예산',money(total-used),`${total?Math.round(used/total*100):0}% 사용`)}</div><div class="card section-gap"><div class="card-head"><div><h3>분류별 예산</h3><p class="hint">식비·교통 같은 큰 분류를 먼저 보고, 행을 누르면 소분류 예산이 펼쳐집니다.</p></div></div>${groups.length?`<div class="table-wrap"><table class="table budget-hierarchy"><thead><tr><th>큰 분류 / 세부 항목</th><th>예산</th><th>사용액</th><th>남은 금액</th><th>사용률</th><th></th></tr></thead>${body}</table></div>`:empty('등록된 예산이 없습니다.')}</div>`
}

function subscriptions(){const sum=S.subscriptions.filter(x=>x.active).reduce((a,b)=>a+b.price,0);return header('정기 구독 관리','<button class="btn primary" id="addSub">+ 구독 추가</button>')+`<div class="grid cols3">${metric('↻','soft-purple','월 구독료',money(sum),'활성 구독 합계')}${metric('✓','soft-green','활성 구독',S.subscriptions.filter(x=>x.active).length+'개','예산에 포함')}${metric('▣','soft-orange','연간 예상',money(sum*12),'월 구독료 × 12')}</div><div class="card section-gap"><table class="table"><thead><tr><th>서비스</th><th>종류</th><th>월 요금</th><th>결제일</th><th>자산</th><th>상태</th><th></th></tr></thead><tbody>${S.subscriptions.map(s=>`<tr><td><b>${esc(s.service)}</b></td><td>${esc(s.category)}</td><td>${money(s.price)}</td><td>매월 ${s.day}일</td><td>${pay(s.paymentId).icon} ${esc(pay(s.paymentId).name)}</td><td><span class="tag ${s.active?'soft-green':'soft-orange'}">${s.active?'활성':'정지'}</span></td><td class="actions"><button data-edit-sub="${s.id}">수정</button><button data-toggle-sub="${s.id}">${s.active?'정지':'재개'}</button><button data-del-sub="${s.id}">삭제</button></td></tr>`).join('')}</tbody></table></div>`}
function foodTx(){return monthTx().filter(x=>x.type==='지출'&&x.section==='식비'&&cat(x.area,x.section,x.item).foodAnalysis===true)}
function foodItemStats(){const list=foodTx(),[y,m]=selectedMonth.split('-').map(Number),days=new Date(y,m,0).getDate(),weeks=days/7,map={};list.forEach(x=>{const name=(x.title||x.item||'미지정').trim()||'미지정',row=map[name]||(map[name]={name,value:0,count:0,last:'',dates:[]});row.value+=Math.abs(x.amount);row.count++;row.dates.push(x.date);if(x.date>row.last)row.last=x.date});return Object.values(map).map(row=>{const dates=[...new Set(row.dates)].sort(),gaps=[];for(let i=1;i<dates.length;i++){gaps.push((new Date(`${dates[i]}T00:00:00`)-new Date(`${dates[i-1]}T00:00:00`))/86400000)}const cycle=gaps.length?gaps.reduce((a,x)=>a+x,0)/gaps.length:0;return {...row,weekly:row.value/weeks,daily:row.value/days,purchase:row.value/row.count,cycle}}).sort((a,b)=>b.value-a.value)}
function foodQuickForm(){const foodItems=S.categories.filter(x=>x.area==='지출'&&x.section==='식비'),assets=S.accounts.filter(x=>x.paymentEnabled||x.trackBalance!==false),ready=foodItems.length&&assets.length;return `<div class="card food-entry"><div class="card-head"><div><h3>식비 거래 추가</h3><p class="hint">거래내역처럼 날짜·내용·금액을 입력하세요. 저장하면 아래 내역과 통계에 즉시 반영됩니다.</p></div></div>${ready?'':`<div class="inline-warning">${!foodItems.length?'식비 카테고리가 없습니다. 설정의 카테고리 관리에서 지출 / 식비 항목을 먼저 추가하세요.':''}${!assets.length?' 거래에 사용할 자산이 없습니다. 자산 관리에서 ‘거래 사용’을 켜세요.':''}</div>`}<div class="food-form"><label>날짜<input id="foodDate" type="date" value="${iso(today)}"></label><label>구매·식사 항목<input id="foodTitle" placeholder="예: 우유, 밥, 닭갈비, 커피"></label><label>식비 분류<select id="foodItem">${selectOptions(foodItems.map(x=>x.item),foodItems[0]?.item)}</select></label><label>금액<input id="foodAmount" inputmode="numeric" placeholder="예: 6000"></label><label>자산<select id="foodAsset">${selectOptions(assets,assets[0]?.id,a=>`${a.paymentIcon||'⌂'} ${a.name}`)}</select></label><label class="food-memo">메모<input id="foodMemo" placeholder="수량·상점 등 선택 입력"></label></div><div class="food-save-row"><span>‘식비 거래 저장’을 누르면 추가됩니다.</span><button class="btn primary" id="saveFoodEntry" ${ready?'':'disabled'}>+ 식비 거래 저장</button></div></div>`}
function food(){const list=[...foodTx()].sort((a,b)=>b.date.localeCompare(a.date)),total=list.reduce((a,x)=>a+Math.abs(x.amount),0),[y,m]=selectedMonth.split('-').map(Number),days=new Date(y,m,0).getDate(),stats=foodItemStats();return header('식비 관리')+foodQuickForm()+`<div class="grid cols4 section-gap">${metric('🍴','soft-red','이번 달 식비',money(total),`${list.length}건`)}${metric('日','soft-green','1일 평균',money(total/days),`${days}일 기준`)}${metric('週','soft-blue','주 평균',money(total/(days/7)),'월 지출 환산')}${metric('↻','soft-orange','등록 항목',`${stats.length}개`,'우유·밥 등 내용 기준')}</div><div class="card section-gap"><div class="card-head"><div><h3>항목별 소비 통계</h3><p class="hint">‘구매·식사 항목’에 입력한 이름별로 계산합니다.</p></div></div>${stats.length?`<div class="table-wrap"><table class="table food-stats-table"><thead><tr><th>항목</th><th>횟수</th><th>월 합계</th><th>주 평균</th><th>1일 평균</th><th>회당 평균</th><th>구매 주기</th><th>최근 구매</th></tr></thead><tbody>${stats.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${x.count}회</td><td class="red"><b>${money(x.value)}</b></td><td>${money(x.weekly)}</td><td>${money(x.daily)}</td><td>${money(x.purchase)}</td><td>${x.cycle?`약 ${x.cycle.toFixed(1)}일`:'1회 기록'}</td><td>${x.last}</td></tr>`).join('')}</tbody></table></div>`:empty('위 입력칸에서 우유·밥·커피 같은 항목을 추가해 보세요.')}</div><div class="card section-gap"><div class="card-head"><h3>식비 지출 추이</h3><div class="tabs compact">${['일','주','월'].map(x=>`<button data-food-mode="${x}" class="${foodMode===x?'active':''}">${x}</button>`).join('')}</div></div>${barChart(foodTrend(),'#ff585d')}</div><div class="card section-gap"><div class="card-head"><div><h3>식비 거래내역</h3><p class="hint">행을 누르면 전체 내용을 수정할 수 있습니다.</p></div><b>${list.length}건</b></div>${list.length?`<div class="table-wrap"><table class="table responsive-table food-ledger"><thead><tr><th>날짜</th><th>항목</th><th>분류</th><th>자산</th><th>계좌</th><th>금액</th><th>메모</th><th></th></tr></thead><tbody>${list.map(x=>`<tr class="clickable-row" data-row-edit="${x.id}" tabindex="0"><td data-label="날짜">${x.date}</td><td data-label="항목"><b>${esc(x.title)}</b></td><td data-label="분류">${cat(x.area,x.section,x.item).icon} ${esc(x.item)}</td><td data-label="자산">${pay(x.paymentId).icon} ${esc(pay(x.paymentId).name)}</td><td data-label="계좌">${esc(account(x.accountId).name)}</td><td data-label="금액" class="red"><b>${money(Math.abs(x.amount))}</b></td><td data-label="메모">${esc(x.memo)||'-'}</td><td data-label="관리" class="actions"><button data-del-tx="${x.id}">삭제</button></td></tr>`).join('')}</tbody></table></div>`:empty('식비 거래가 없습니다.')}</div>`}
function saveFoodEntry(){const title=$('#foodTitle').value.trim(),amount=Math.abs(num($('#foodAmount').value)),item=$('#foodItem').value,assetId=$('#foodAsset').value,c=S.categories.find(x=>x.area==='지출'&&x.section==='식비'&&x.item===item);if(!c)return toast('식비 카테고리를 먼저 추가하세요.');if(!assetId)return toast('거래에 사용할 자산을 먼저 추가하세요.');if(!title||!amount)return toast('먹은 내용과 금액을 입력하세요.');S.transactions.push({id:uid(),date:$('#foodDate').value,type:'지출',area:'지출',section:'식비',item,title,amount:-amount,paymentId:assetId,accountId:assetId,memo:$('#foodMemo').value.trim(),icon:c?.icon});selectedMonth=$('#foodDate').value.slice(0,7);render();toast(`${title} ${money(amount)} 기록 완료`)}
function foodTrend(){if(foodMode==='일')return dailyData(x=>x.section==='식비');if(foodMode==='주'){const out=[1,2,3,4,5].map(n=>({label:`${n}주`,value:0}));foodTx().forEach(x=>out[Math.min(4,Math.floor((Number(x.date.slice(8))-1)/7))].value+=Math.abs(x.amount));return out}const out=[];for(let n=5;n>=0;n--){const [y,m]=selectedMonth.split('-').map(Number),d=new Date(y,m-1-n,1),key=monthKey(d);out.push({label:`${d.getMonth()+1}월`,value:Math.abs(S.transactions.filter(x=>x.date.startsWith(key)&&x.amount<0&&x.section==='식비').reduce((a,x)=>a+x.amount,0))})}return out}

function assets(){const tracked=S.accounts.filter(x=>x.trackBalance!==false),payments=paymentOptions(),total=tracked.reduce((a,x)=>a+balance(x),0);return header('자산 관리','<button class="btn primary" id="addAccount">+ 자산 추가</button>')+`<div class="grid cols4 asset-metrics">${metric('⌂','soft-blue','총 자산',money(total),`${tracked.length}개 자산`)}${metric('＋','soft-green','이번 달 유입',money(totals().inc),'거래 자동 반영')}${metric('−','soft-red','이번 달 유출',money(totals().exp),'거래 자동 반영')}${metric('💳','soft-purple','거래 사용 가능',`${payments.length}개`,'자산관리에서 거래 사용 체크')}</div><div class="card section-gap account-card"><div class="card-head"><div><h3>내 자산</h3><p class="hint">계좌·카드·현금·전자지갑은 모두 이 화면에서 관리합니다. 자산 수정에서 ‘자산 반영’과 ‘거래 사용’을 켜거나 끌 수 있습니다.</p></div><span>${S.accounts.length}개</span></div><div class="mobile-account-list">${S.accounts.map(a=>`<article class="mobile-account"><div class="account-icon">${a.paymentIcon||'⌂'}</div><button class="account-main" data-edit-account="${a.id}"><span>${esc(a.type)}${a.paymentEnabled?' · 거래 사용':''}</span><b>${esc(a.name)}</b><strong>${a.trackBalance===false?'잔액 미추적':money(balance(a))}</strong><small>${a.trackBalance===false?'거래 전용':'현재 잔액을 직접 맞출 수 있습니다.'}</small></button><div class="account-actions"><button data-edit-account="${a.id}">수정</button><button class="danger-text" data-del-account="${a.id}">삭제</button></div></article>`).join('')}</div><div class="desktop-account-table"><div class="table-wrap"><table class="table asset-table"><thead><tr><th>유형</th><th>자산명</th><th>사용 설정</th><th>현재 잔액</th><th>반영된 거래</th><th></th></tr></thead><tbody>${S.accounts.map(a=>`<tr><td>${esc(a.type)}</td><td><b>${a.paymentIcon||'⌂'} ${esc(a.name)}</b></td><td><div class="asset-flags">${a.trackBalance===false?'':'<span class="tag soft-blue">자산 반영</span>'}${a.paymentEnabled?'<span class="tag soft-green">거래 사용</span>':''}</div></td><td class="blue"><b>${a.trackBalance===false?'미추적':money(balance(a))}</b></td><td>${a.trackBalance===false?'-':money(accountFlow(a.id))}</td><td class="actions"><button data-edit-account="${a.id}">수정</button><button data-del-account="${a.id}">삭제</button></td></tr>`).join('')}</tbody></table></div></div></div>`}



function ensureStocks(){
  if(!Array.isArray(S.stocks))S.stocks=[];
  S.stocks=S.stocks.map(x=>({
    id:x.id||uid(), side:x.side||'매수', symbol:(x.symbol||x.ticker||x.name||'').trim(),
    displayName:x.displayName||x.name||x.symbol||x.ticker||'', date:x.date||iso(today),
    accountId:x.accountId||'', currency:x.currency==='USD'?'USD':'KRW', quantity:Number(x.quantity)||0,
    price:Number(x.price??x.avgPrice??x.currentPrice)||0, closePrice:Number(x.closePrice??x.currentPrice??x.avgPrice)||0,
    exchangeRate:x.currency==='USD'?(Number(x.exchangeRate)||1):1, memo:x.memo||'', updatedAt:x.updatedAt||new Date().toISOString()
  }));
}
const stockSignedQty=x=>(x.side==='매도'?-1:1)*(Number(x.quantity)||0);
const stockRate=x=>x.currency==='USD'?(Number(x.exchangeRate)||1):1;
const stockTradeValue=x=>(Number(x.quantity)||0)*(Number(x.price)||0)*stockRate(x);
const stockPrice=(n,c='KRW')=>c==='USD'?`$${Math.round(Number(n||0)).toLocaleString('en-US')}`:money(Math.round(Number(n||0)));
const stockDualPrice=(n,c,rate)=>c==='USD'?`${stockPrice(n,'USD')} / ${money(Math.floor(Number(n||0)*(Number(rate)||1)))}`:`${money(Math.round(Number(n||0)))} / $${Math.round(Number(n||0)/(Number(rate)||1)).toLocaleString('en-US')}`;
function stockHoldings(){
  ensureStocks();const map=new Map();
  [...S.stocks].sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>{
    const key=`${String(x.symbol).toUpperCase()}|${x.accountId}|${x.currency}`;
    if(!map.has(key))map.set(key,{symbol:String(x.symbol).toUpperCase(),displayName:x.displayName||x.symbol,accountId:x.accountId,currency:x.currency,quantity:0,cost:0,closePrice:x.closePrice||x.price,exchangeRate:x.exchangeRate||1});
    const h=map.get(key),q=Number(x.quantity)||0,unit=(Number(x.price)||0)*stockRate(x);
    if(x.side==='매수'){h.cost+=q*unit;h.quantity+=q}else if(h.quantity>0){const avg=h.cost/h.quantity;h.cost-=Math.min(q,h.quantity)*avg;h.quantity-=q}
    if(x.closePrice)h.closePrice=x.closePrice;if(x.exchangeRate)h.exchangeRate=x.exchangeRate;if(x.displayName)h.displayName=x.displayName;
  });return [...map.values()].filter(x=>Math.abs(x.quantity)>1e-10);
}
function stockValue(h){return h.quantity*h.closePrice*(h.currency==='USD'?h.exchangeRate:1)}
function stocks(){
  ensureStocks();const holdings=stockHoldings(),cost=holdings.reduce((a,x)=>a+x.cost,0),value=holdings.reduce((a,x)=>a+stockValue(x),0),profit=value-cost,rate=cost?profit/cost*100:0;
  const accountName=id=>S.accounts.find(a=>a.id===id)?.name||'계좌 미지정';
  const trades=[...S.stocks].sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));
  return header('주식 관리','<button class="btn primary" id="addStock">+ 주식 거래</button>')+
  `<div class="grid cols4 stock-metrics">${metric('₩','soft-blue','총 매입원가',money(cost),`${holdings.length}개 보유 종목`)}${metric('▦','soft-purple','현재 평가금',money(value),'날짜별 종가·환율 반영')}${metric(profit>=0?'＋':'−',profit>=0?'soft-green':'soft-red','평가 손익',`${profit>=0?'+':''}${money(profit)}`,`${rate>=0?'+':''}${rate.toFixed(2)}%`)}${metric('◎','soft-orange','거래 기록',`${trades.length}건`,'매수·매도 통합')}</div>`+
  `<div class="card section-gap stock-card"><div class="card-head"><div><h3>보유 주식</h3><p class="hint">종목은 대소문자와 관계없이 조회합니다. 입력한 표기는 그대로 유지합니다.</p></div><span>${holdings.length}개</span></div>${holdings.length?`<div class="desktop-stock-table table-wrap"><table class="table stock-table"><thead><tr><th>종목</th><th>계좌</th><th>보유 수량</th><th>평균 원가</th><th>종가</th><th>평가금</th><th>손익 / 수익률</th></tr></thead><tbody>${holdings.map(h=>{const v=stockValue(h),pf=v-h.cost,pc=h.cost?pf/h.cost*100:0;return `<tr><td><b>${esc(h.displayName||h.symbol)}</b><small>${esc(h.symbol)} · ${h.currency}</small></td><td>${esc(accountName(h.accountId))}</td><td>${h.quantity.toLocaleString('ko-KR',{maximumFractionDigits:6})}주</td><td>${stockPrice(h.quantity?h.cost/h.quantity/(h.currency==='USD'?h.exchangeRate:1):0,h.currency)}</td><td>${stockDualPrice(h.closePrice,h.currency,h.exchangeRate)}</td><td><b>${money(v)}</b></td><td class="${pf>=0?'blue':'red'}"><b>${pf>=0?'+':''}${money(pf)}</b><small>${pc>=0?'+':''}${pc.toFixed(2)}%</small></td></tr>`}).join('')}</tbody></table></div>`:empty('보유 중인 주식이 없습니다.')}</div>`+
  `<div class="card section-gap stock-card"><div class="card-head"><h3>매수·매도 내역</h3><span>${trades.length}건</span></div>${trades.length?`<div class="desktop-stock-table table-wrap"><table class="table stock-table"><thead><tr><th>날짜</th><th>구분</th><th>종목</th><th>수량</th><th>거래가</th><th>해당일 종가</th><th>환율</th><th></th></tr></thead><tbody>${trades.map(x=>`<tr><td>${esc(x.date)}</td><td><b class="${x.side==='매수'?'red':'blue'}">${x.side}</b></td><td><b>${esc(x.displayName||x.symbol)}</b><small>${esc(String(x.symbol).toUpperCase())} · ${x.currency}</small></td><td>${Number(x.quantity).toLocaleString('ko-KR',{maximumFractionDigits:6})}주</td><td>${stockPrice(x.price,x.currency)}</td><td>${stockDualPrice(x.closePrice,x.currency,x.exchangeRate)}</td><td>${x.currency==='USD'?Number(x.exchangeRate).toLocaleString('ko-KR')+'원':'1원'}</td><td class="actions"><button data-edit-stock="${x.id}">수정</button><button data-del-stock="${x.id}">삭제</button></td></tr>`).join('')}</tbody></table></div>`:empty('등록된 주식 거래가 없습니다.')}</div>`;
}
async function fetchHistoricalStockData(symbol,date,currency){
  if(window.financeOne?.stockLookup)return window.financeOne.stockLookup(symbol,date,currency);
  const normalized=String(symbol||'').trim().toUpperCase();if(!normalized)throw Error('종목을 입력하세요.');
  const start=Math.floor(new Date(`${date}T00:00:00Z`).getTime()/1000)-7*86400,end=Math.floor(new Date(`${date}T23:59:59Z`).getTime()/1000)+86400;
  const yahoo=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}?period1=${start}&period2=${end}&interval=1d&events=history`;
  const res=await fetch(yahoo);if(!res.ok)throw Error('종목 데이터를 가져오지 못했습니다.');const json=await res.json(),r=json?.chart?.result?.[0];
  if(!r?.timestamp?.length)throw Error('해당 종목 또는 날짜의 종가가 없습니다.');let close=0;
  r.timestamp.forEach((t,i)=>{const d=new Date(t*1000).toISOString().slice(0,10);const c=r.indicators?.quote?.[0]?.close?.[i];if(d<=date&&Number.isFinite(c))close=c});if(!close)throw Error('해당 날짜 이전의 종가가 없습니다.');
  let exchangeRate=1;if(currency==='USD'){const fx=await fetch(`https://api.frankfurter.app/${date}?from=USD&to=KRW`);if(fx.ok){const f=await fx.json();exchangeRate=Number(f?.rates?.KRW)||1}else throw Error('해당 날짜의 환율을 가져오지 못했습니다.')}
  return{symbol:normalized,closePrice:close,exchangeRate};
}
function stockModal(id=null){
  ensureStocks();const existing=S.stocks.find(x=>x.id===id),x=existing||{id:uid(),side:'매수',symbol:'',displayName:'',date:iso(today),accountId:S.accounts.find(a=>a.type==='투자')?.id||S.accounts[0]?.id||'',currency:'USD',quantity:0,price:0,closePrice:0,exchangeRate:1,memo:''};
  $('#modal').innerHTML=modal(id?'주식 거래 수정':'주식 거래 추가',`<div class="stock-side-tabs"><button type="button" data-stock-side="매수" class="stock-buy ${x.side==='매수'?'active':''}">매수</button><button type="button" data-stock-side="매도" class="${x.side==='매도'?'active':''}">매도</button></div><input id="stSide" type="hidden" value="${x.side}"><div class="modal-grid stock-modal-grid"><div class="field"><label>종목</label><input id="stSymbol" value="${esc(x.displayName||x.symbol)}" placeholder="예: QLD, soxl, SOXX, tsll" autocomplete="off"></div><div class="field"><label>날짜</label><input id="stDate" type="date" value="${x.date}"></div><div class="field"><label>통화</label><select id="stCurrency">${selectOptions(['KRW','USD'],x.currency)}</select></div><div class="field"><label>투자 계좌</label><select id="stAccount"><option value="">계좌 미지정</option>${selectOptions(S.accounts,x.accountId,a=>a.name)}</select></div><div class="field"><label>수량</label><input id="stQuantity" inputmode="decimal" value="${x.quantity||''}" placeholder="0"></div><div class="field"><label>거래 가격</label><input id="stPrice" inputmode="decimal" value="${x.price||''}" placeholder="실제 매수·매도가"></div><div class="field"><label>해당 날짜 종가</label><input id="stClosePrice" inputmode="decimal" value="${x.closePrice||''}" placeholder="자동 입력"></div><div class="field" id="stExchangeField"><label>원/달러 환율</label><input id="stExchangeRate" inputmode="decimal" value="${x.exchangeRate||1}" placeholder="자동 입력"></div><div class="field wide stock-lookup-row"><button type="button" class="btn primary" id="lookupStock">종가·환율 자동 조회</button><small id="stockLookupStatus">종목과 날짜를 입력한 뒤 누르세요.</small></div><div class="field wide"><label>메모</label><input id="stMemo" value="${esc(x.memo||'')}"></div></div>${id?`<div class="tx-modal-danger"><button class="pill danger" id="deleteStockInModal">이 거래 삭제</button></div>`:''}`);
  modalBase();$$('[data-stock-side]').forEach(b=>b.onclick=()=>{$('#stSide').value=b.dataset.stockSide;$$('[data-stock-side]').forEach(v=>v.classList.toggle('active',v===b))});
  const toggleRate=()=>{$('#stExchangeField').hidden=$('#stCurrency').value!=='USD'};$('#stCurrency').onchange=toggleRate;toggleRate();
  $('#lookupStock').onclick=async()=>{const status=$('#stockLookupStatus'),btn=$('#lookupStock');try{btn.disabled=true;status.textContent='조회 중...';const display=$('#stSymbol').value.trim(),data=await fetchHistoricalStockData(display,$('#stDate').value,$('#stCurrency').value);$('#stClosePrice').value=Math.round(data.closePrice);$('#stExchangeRate').value=Math.round(data.exchangeRate);status.textContent=`${data.symbol} 종가와 환율을 입력했습니다.`}catch(e){status.textContent=e.message||'조회에 실패했습니다.'}finally{btn.disabled=false}};
  $('#deleteStockInModal')?.addEventListener('click',()=>{closeModal();deleteStock(id)});
  $('#saveModal').onclick=()=>{const display=$('#stSymbol').value.trim(),currency=$('#stCurrency').value,n={...x,side:$('#stSide').value,symbol:display.toUpperCase(),displayName:display,date:$('#stDate').value,accountId:$('#stAccount').value,currency,quantity:decimalNum($('#stQuantity').value),price:decimalNum($('#stPrice').value),closePrice:decimalNum($('#stClosePrice').value),exchangeRate:currency==='USD'?decimalNum($('#stExchangeRate').value):1,memo:$('#stMemo').value.trim(),updatedAt:new Date().toISOString()};if(!display||!/^\d{4}-\d{2}-\d{2}$/.test(n.date))return toast('종목과 날짜를 입력하세요.');if(n.quantity<=0||n.price<=0)return toast('수량과 거래 가격을 입력하세요.');if(n.closePrice<=0)return toast('종가를 조회하거나 입력하세요.');if(currency==='USD'&&n.exchangeRate<=0)return toast('환율을 조회하거나 입력하세요.');if(id)S.stocks[S.stocks.findIndex(v=>v.id===id)]=n;else S.stocks.push(n);closeModal();render();toast(`${n.side} 거래를 저장했습니다.`)};
}
function deleteStock(id){const x=S.stocks.find(v=>v.id===id);confirmDialog({title:'주식 거래 삭제',message:`${x?.displayName||x?.symbol||'선택한 거래'} 기록을 삭제할까요?`,details:[`${x?.date||''} · ${x?.side||''}`],confirmText:'삭제',danger:true,onConfirm:()=>{S.stocks=S.stocks.filter(v=>v.id!==id);render();toast('주식 거래를 삭제했습니다.')}})}

function settings(){return header('설정')+`<div class="grid cols2"><div class="card"><div class="card-head"><h3>카테고리 관리</h3><button class="btn primary" id="manageCats">관리창 열기</button></div><p class="hint">영역·분류·항목을 별도 관리창에서 추가·변경·삭제할 수 있습니다.</p><div class="category-summary">${areas().map(a=>`<p><b>${a}</b><span>${sections(a).length}개 분류 · ${S.categories.filter(x=>x.area===a).length}개 항목</span></p>`).join('')}</div></div><div class="card"><div class="card-head"><h3>자산 설정</h3><button class="btn primary" data-go="assets">자산 관리로 이동</button></div><p class="hint">계좌·카드·현금·전자지갑은 모두 자산 관리에서 관리합니다.</p><div class="summary-lines"><p><span>전체 자산 항목</span><b>${S.accounts.length}개</b></p><p><span>거래 사용 가능 자산</span><b>${paymentOptions().length}개</b></p></div></div><div class="card"><h3>화면 및 저장</h3><div class="manage-row"><span>다크 모드</span><button class="pill" id="toggleDark">${S.settings.dark?'켜짐':'꺼짐'}</button></div><div class="manage-row"><span>로컬 자동 저장</span><b>변경 후 저장</b></div><p class="hint">처음 실행해 화면만 열린 상태에서는 빈 데이터를 덮어쓰지 않습니다. 거래·설정 등 변경이 생긴 뒤부터 로컬에 저장됩니다.</p></div><div class="card"><h3>데이터 관리</h3><div class="data-actions"><button class="pill" id="exportData">백업 파일 저장</button><button class="pill" id="importDataButton">백업 복원</button><input type="file" id="importData" accept="application/json" hidden><button class="pill danger" id="resetData">전체 초기화</button></div></div></div>`}
function settingsPage(){const themes=[['light','라이트','☀'],['dark','다크','◐'],['midnight','미드나이트','☾'],['forest','포레스트','🌲'],['rose','로즈','🌸'],['sand','샌드','🏜'],['system','시스템','◫']];return settings()+`<div class="card section-gap google-sync-card"><div class="card-head"><div><h3>Google 계정 및 Drive 동기화</h3><p class="hint">FinanceOne 데이터만 Google Drive의 앱 전용 비공개 공간에 저장합니다.</p></div><span class="google-status ${googleInfo.connected?'connected':''}">${googleInfo.connected?'● 연결됨':'○ 연결 안 됨'}</span></div>${googleInfo.connected?`<div class="google-account"><div class="google-avatar">G</div><div><b>${esc(googleInfo.name||'Google 사용자')}</b><span>${esc(googleInfo.email||'연결된 Google 계정')}</span></div></div><div class="data-actions"><button class="btn primary" id="googleUpload">현재 데이터를 Drive에 저장</button><button class="pill" id="googleDownload">Drive 데이터 불러오기</button><button class="pill danger" id="googleDisconnect">연결 해제</button></div>`:`<div class="google-connect"><div><b>PC와 다른 기기 사이의 데이터 이동을 준비하세요.</b><span>Google 로그인 후 수동으로 올리거나 내려받을 수 있습니다.</span></div><button class="btn primary" id="googleLogin">Google 계정 연결</button></div>`}</div><div class="grid cols2 section-gap"><div class="card"><h3>색상 테마</h3><p class="hint">선택 즉시 적용되고 자동 저장됩니다.</p><div class="theme-grid">${themes.map(([id,name,icon])=>`<button data-theme="${id}" class="theme-option ${S.settings.theme===id?'active':''}"><i>${icon}</i><b>${name}</b><span></span></button>`).join('')}</div></div><div class="card"><h3>데이터 보호 및 내보내기</h3><div class="summary-lines"><p><span>앱 버전</span><b>${desktopInfo?.version||'웹 미리보기'}</b></p><p><span>자동 백업</span><b>${desktopInfo?`${desktopInfo.backupCount||0}개 보관`:'데스크톱에서 사용'}</b></p><p><span>저장 방식</span><b>${desktopInfo?'SQLite':'브라우저 저장소'}</b></p></div><div class="data-actions section-gap"><button class="pill" id="exportCsv">거래 CSV 내보내기</button></div></div></div>`}

function more(){return header('전체 메뉴')+`<div class="mobile-more-grid"><button data-go="stocks"><i>▦</i><span><b>주식 관리</b><small>보유 종목·평가손익·수익률</small></span><em>›</em></button><button data-go="budget"><i>♜</i><span><b>예산 관리</b><small>카테고리별 한도와 사용액</small></span><em>›</em></button><button data-go="subscriptions"><i>⟳</i><span><b>정기 구독</b><small>월 구독료와 결제일 관리</small></span><em>›</em></button><button data-go="food"><i>▥</i><span><b>식비 분석</b><small>식비 기록과 소비 패턴</small></span><em>›</em></button><button data-go="assets"><i>⌂</i><span><b>자산 관리</b><small>카드·계좌·현금 관리</small></span><em>›</em></button><button data-go="settings"><i>⚙</i><span><b>설정</b><small>카테고리·테마·동기화</small></span><em>›</em></button></div>`}
const pages={dashboard,transactions,analysis:analysisPage,budget,subscriptions,food,assets,stocks,settings:settingsPage,more};
function render(){syncSubscriptions();ensureStocks();S.settings=S.settings||sample().settings;if(S.settings.googleAutoSync==null)S.settings.googleAutoSync=false;const chosen=S.settings.theme||(S.settings.dark?'dark':'light'),resolved=chosen==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):chosen;document.documentElement.dataset.theme=resolved;document.documentElement.classList.toggle('dark',['dark','midnight'].includes(resolved));side();$('#app').dataset.page=page;$('#app').innerHTML=pages[page]();const secondary=['budget','subscriptions','food','assets','stocks','settings'];$$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page||(b.dataset.page==='more'&&secondary.includes(page))));bind();if(appReady)save()}
function bind(){
  $('#toggleRent')?.addEventListener('click',()=>{excludeRent=!excludeRent;render()});
  const googleLoginButton=$('#googleLogin');
  if(googleLoginButton&&!googleInfo.configured&&window.financeOne?.isDesktop)googleLoginButton.textContent='Google OAuth 설정 파일 불러오기';
  const googleActions=$('.google-sync-card .data-actions');
  if(googleInfo.connected&&googleActions&&!$('#toggleGoogleAutoSync'))googleActions.insertAdjacentHTML('beforebegin',`<div class="manage-row auto-sync-row"><span><b>자동 Drive 백업</b><small>처음에는 꺼져 있습니다. 직접 켠 뒤에만 자동 업로드됩니다.</small></span><button class="pill" id="toggleGoogleAutoSync">${S.settings.googleAutoSync===true?'켜짐':'꺼짐'}</button></div>`);
  $$('[data-page],[data-go]').forEach(b=>b.onclick=()=>{page=b.dataset.page||b.dataset.go;render();window.scrollTo(0,0)});
  $$('[data-month]').forEach(b=>b.onclick=()=>changeMonth(Number(b.dataset.month)));
  $$('[data-quick]').forEach(b=>b.onclick=()=>txModal(null,b.dataset.quick));
  $('#addTx')?.addEventListener('click',()=>txModal());
  $$('[data-edit-tx]').forEach(b=>b.onclick=()=>txModal(b.dataset.editTx));
  $('#app').onclick=e=>{const cell=e.target.closest('[data-inline-field]');if(cell&&!e.target.closest('input,select,button'))openInlineEditor(cell)};
  $$('[data-row-edit]').forEach(row=>{row.onclick=e=>{if(e.target.closest('button'))return;txModal(row.dataset.rowEdit)};row.onkeydown=e=>{if(e.key==='Enter')txModal(row.dataset.rowEdit)}});
  $$('[data-copy-tx]').forEach(b=>b.onclick=e=>{e.stopPropagation();const src=S.transactions.find(x=>x.id===b.dataset.copyTx);if(!src)return;const copy={...src,id:uid(),autoRef:undefined};S.transactions.push(copy);lastTransactionDate=copy.date;lastTransactionCategory[copy.type]={section:copy.section,item:copy.item};save();render();toast(`${copy.title} 거래를 복사했습니다.`)});
  $$('[data-del-tx]').forEach(b=>b.onclick=e=>{e.stopPropagation();remove('transactions',b.dataset.delTx,'거래')});
  $$('[data-filter]').forEach(b=>b.onclick=()=>{txFilter=b.dataset.filter;render()});
  $$('[data-day]').forEach(b=>b.onclick=()=>dayModal(Number(b.dataset.day)));
  $$('[data-analysis-area]').forEach(b=>b.onclick=()=>{analysisArea=b.dataset.analysisArea;analysisSection='';analysisItem='';render()});
  $$('[data-analysis-section]').forEach(b=>b.onclick=()=>{analysisSection=b.dataset.analysisSection;analysisItem='';render()});
  $$('[data-analysis-item]').forEach(b=>b.onclick=()=>{analysisItem=b.dataset.analysisItem;render()});
  $$('[data-analysis-pick]').forEach(b=>b.onclick=()=>analysisPicker(b.dataset.analysisPick));
  $$('[data-analysis-mode]').forEach(b=>b.onclick=()=>{analysisMode=b.dataset.analysisMode;render()});
  $$('[data-analysis-overview-item]').forEach(b=>b.onclick=()=>{const c=S.categories.find(x=>x.area==='지출'&&x.item===b.dataset.analysisOverviewItem);analysisMode='detail';analysisArea='지출';analysisSection=c?.section||'';analysisItem=b.dataset.analysisOverviewItem;render()});
  $('#manageCats')?.addEventListener('click',categoryManager);
  $('#addBudget')?.addEventListener('click',()=>budgetModal());
  $$('[data-edit-budget]').forEach(b=>b.onclick=()=>budgetModal(b.dataset.editBudget));
  $$('[data-del-budget]').forEach(b=>b.onclick=()=>remove('budgets',b.dataset.delBudget,'예산'));
  $$('[data-toggle-budget-section]').forEach(row=>row.onclick=e=>{if(e.target.closest('button[data-edit-budget],button[data-del-budget]'))return;const key=row.dataset.toggleBudgetSection;openBudgetSections.has(key)?openBudgetSections.delete(key):openBudgetSections.add(key);render()});
  $('#addSub')?.addEventListener('click',()=>subModal());
  $$('[data-edit-sub]').forEach(b=>b.onclick=()=>subModal(b.dataset.editSub));
  $$('[data-toggle-sub]').forEach(b=>b.onclick=()=>{const s=S.subscriptions.find(x=>x.id===b.dataset.toggleSub);s.active=!s.active;s.statusChangedAt=iso(today);save();render();toast(s.active?'구독을 재개했습니다. 다음 결제일부터 반영됩니다.':'구독을 정지했습니다. 앞으로 자동 차감되지 않습니다.')});
  $$('[data-del-sub]').forEach(b=>b.onclick=()=>remove('subscriptions',b.dataset.delSub,'구독'));
  $$('[data-food-tab]').forEach(b=>b.onclick=()=>{foodTab=b.dataset.foodTab;render()});
  $$('[data-food-mode]').forEach(b=>b.onclick=()=>{foodMode=b.dataset.foodMode;render()});
  $('#saveFoodEntry')?.addEventListener('click',saveFoodEntry);
  $('#addStock')?.addEventListener('click',()=>stockModal());
  $$('[data-edit-stock]').forEach(b=>b.onclick=e=>{e.stopPropagation();stockModal(b.dataset.editStock)});
  $$('[data-del-stock]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteStock(b.dataset.delStock)});
  $('#addAccount')?.addEventListener('click',()=>accountModal());
  $$('[data-edit-account]').forEach(b=>b.onclick=()=>accountModal(b.dataset.editAccount));
  $$('[data-del-account]').forEach(b=>b.onclick=()=>deleteAccount(b.dataset.delAccount));
  $('#addPayment')?.addEventListener('click',()=>paymentModal());
  $$('[data-edit-payment]').forEach(b=>b.onclick=()=>paymentModal(b.dataset.editPayment));
  $$('[data-del-payment]').forEach(b=>b.onclick=()=>deletePayment(b.dataset.delPayment));
  $('#toggleDark')?.addEventListener('click',()=>{S.settings.dark=!S.settings.dark;S.settings.theme=S.settings.dark?'dark':'light';render()});
  $$('.theme-option[data-theme]').forEach(b=>b.onclick=e=>{e.stopPropagation();S.settings.theme=b.dataset.theme;S.settings.dark=['dark','midnight'].includes(b.dataset.theme);render()});
  $('#toggleGoogleAutoSync')?.addEventListener('click',()=>{S.settings.googleAutoSync=S.settings.googleAutoSync!==true;render();toast(`자동 Drive 백업을 ${S.settings.googleAutoSync?'켰습니다.':'껐습니다.'}`)});
  $('#googleLogin')?.addEventListener('click',async e=>{
    const button=e.currentTarget,bridge=googleBridge();
    if(!bridge?.googleLogin)return toast('이 설치본에는 Google 연동 기능이 없습니다. 최신 버전으로 업데이트하세요.');
    button.disabled=true;
    try{
      if(!googleInfo.configured&&bridge.googleImportConfig){
        const result=await bridge.googleImportConfig();
        if(result.canceled){button.disabled=false;return}
        googleInfo=await bridge.googleStatus();
        render();
        toast('OAuth 설정 파일을 불러왔습니다. 이제 Google 계정을 연결하세요.');
        return;
      }
      toast(window.financeOne?.isDesktop?'시스템 브라우저에서 Google 로그인을 완료하세요.':'Google 계정을 선택하고 Drive 접근을 허용하세요.');
      googleInfo=await bridge.googleLogin();
      S.settings.googleAutoSync=false;
      render();
      toast('Google 계정을 연결했습니다. 자동 Drive 백업은 꺼져 있습니다.');
      try{
        if(bridge.googleDownload){
          const result=await bridge.googleDownload();
          if(result?.state&&validBackup(result.state)){
            confirmDialog({
              title:'Drive에 기존 데이터가 있습니다',
              message:'Google Drive에 저장된 FinanceOne 데이터가 발견되었습니다. 이 기기로 불러올까요?',
              details:['불러오기를 누르면 현재 화면의 데이터를 Drive 데이터로 교체합니다.','지금은 자동 Drive 백업이 꺼져 있어 새 데이터로 덮어쓰지 않습니다.'],
              confirmText:'불러오기',
              danger:false,
              onConfirm:async()=>{
                S=result.state;
                S.settings=S.settings||sample().settings;
                S.settings.googleAutoSync=false;
                normalizeAssetPayments();
                await save();
                render();
                toast('Google Drive 데이터를 불러왔습니다.');
              }
            });
          }
        }
      }catch(_){}
    }catch(error){
      button.disabled=false;
      toast(String(error.message||error).replace(/^Error invoking remote method '[^']+':\s*/,''));
    }
  });
  $('#googleUpload')?.addEventListener('click',async e=>{const button=e.currentTarget,bridge=googleBridge();button.disabled=true;toast('Google Drive에 저장 중입니다.');try{await save();await bridge.googleUpload(S);localStorage.setItem('financeone_google_last_upload',String(Date.now()));button.disabled=false;toast('현재 데이터를 Google Drive에 저장했습니다.')}catch(error){button.disabled=false;toast(String(error.message||error).replace(/^Error invoking remote method '[^']+':\s*/,''))}});
  $('#googleDownload')?.addEventListener('click',e=>{const button=e.currentTarget,bridge=googleBridge();confirmDialog({title:'Drive 데이터 불러오기',message:'현재 기기의 데이터를 Google Drive 데이터로 교체합니다.',details:['현재 데이터는 먼저 Drive에 저장하거나 백업 파일로 보관하는 것을 권장합니다.'],confirmText:'불러오기',danger:true,onConfirm:async()=>{button.disabled=true;try{const result=await bridge.googleDownload();if(!validBackup(result.state))throw Error('Drive 백업 형식이 올바르지 않거나 손상되었습니다.');S=result.state;S.settings=S.settings||sample().settings;normalizeAssetPayments();await save();render();toast('Google Drive 데이터를 불러왔습니다.')}catch(error){button.disabled=false;toast(String(error.message||error).replace(/^Error invoking remote method '[^']+':\s*/,''))}}})});
  $('#googleDisconnect')?.addEventListener('click',e=>{const button=e.currentTarget,bridge=googleBridge();confirmDialog({title:'Google 연결 해제',message:'Google 계정 연결을 해제할까요?',details:['Drive에 저장된 FinanceOne 데이터는 삭제되지 않습니다.'],confirmText:'연결 해제',danger:true,onConfirm:async()=>{button.disabled=true;try{googleInfo=await bridge.googleDisconnect();render();toast('Google 연결을 해제했습니다.')}catch(error){button.disabled=false;toast(String(error.message||error).replace(/^Error invoking remote method '[^']+':\s*/,''))}}})});
  $('#exportCsv')?.addEventListener('click',exportCsv);
  $('#exportData')?.addEventListener('click',exportData);$('#importData')?.addEventListener('change',importData);$('#importDataButton')?.addEventListener('click',()=>{const bridge=googleBridge();if(bridge?.importBackup)importData();else $('#importData')?.click();});
  $('#resetData')?.addEventListener('click',()=>confirmDialog({title:'모든 데이터 초기화',message:'거래·자산·카테고리·예산을 모두 삭제합니다.',details:['이 작업은 되돌릴 수 없습니다.'],confirmText:'전체 초기화',danger:true,onConfirm:()=>{S=sample();normalizeAssetPayments();render();toast('초기화했습니다')}}));
}
function remove(key,id,label){confirmDialog({title:`${label} 삭제`,message:`선택한 ${label}을(를) 삭제할까요?`,details:['이 작업은 되돌릴 수 없습니다.'],confirmText:'삭제',danger:true,onConfirm:()=>{S[key]=S[key].filter(x=>x.id!==id);render();toast(`${label} 삭제 완료`)}})}
function closeModal(){$('#modal').innerHTML='';$('#submodal').innerHTML=''}
function closeSubmodal(){$('#submodal').innerHTML=''}
function bindBackdropClose(rootSelector,closer){const overlay=$(rootSelector+' .modal');if(!overlay)return;overlay.addEventListener('mousedown',e=>{if(e.target===overlay)closer()})}
function confirmDialog({title,message,details=[],confirmText='확인',danger=false,onConfirm}){$('#submodal').innerHTML=`<div class="modal app-confirm"><div class="modalbox confirm-box"><div class="confirm-icon ${danger?'danger-icon':''}">${danger?'!':'?'}</div><h2>${esc(title)}</h2><p>${esc(message)}</p>${details.length?`<ul>${details.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="modal-actions"><button class="pill" id="cancelConfirm">취소</button><button class="btn ${danger?'danger-button':'primary'}" id="acceptConfirm">${esc(confirmText)}</button></div></div></div>`;$('#cancelConfirm').onclick=closeSubmodal;$('#acceptConfirm').onclick=async()=>{closeSubmodal();await onConfirm?.()}}
function depTarget(label){if(label.includes('정기구독'))return 'subscriptions';if(label.includes('거래'))return 'transactions';if(label.includes('예산'))return 'budget';return 'assets'}
function dependencyDialog(title,message,items){$('#submodal').innerHTML=`<div class="modal app-confirm"><div class="modalbox confirm-box dependency-box"><div class="confirm-icon link-icon">↔</div><h2>${esc(title)}</h2><p>${esc(message)}</p><div class="dependency-list">${items.map(x=>`<button data-dep-go="${depTarget(x.label)}"><span>${esc(x.label)}</span><b>${x.count}건</b><em>이동</em></button>`).join('')}</div><p class="hint">항목을 누르면 연결된 거래·정기구독·자산 관리 화면으로 이동합니다.</p><div class="modal-actions"><button class="pill" id="goAssetManager">자산 관리</button><button class="btn primary" id="closeDependency">확인</button></div></div></div>`;$('#closeDependency').onclick=closeSubmodal;$('#goAssetManager').onclick=()=>{closeSubmodal();closeModal();page='assets';render();window.scrollTo(0,0)};$$('[data-dep-go]').forEach(b=>b.onclick=()=>{closeSubmodal();closeModal();page=b.dataset.depGo;render();window.scrollTo(0,0)})}
function modal(title,body,saveText='저장'){return `<div class="modal"><div class="modalbox"><div class="modal-title"><h2>${title}</h2><button class="close" id="closeModal">×</button></div>${body}<div class="modal-actions"><button class="pill" id="cancelModal">취소</button><button class="btn primary" id="saveModal">${saveText}</button></div></div></div>`}
function modalBase(){['closeModal','cancelModal'].forEach(id=>$(`#${id}`)?.addEventListener('click',closeModal));$$('[data-chain]').forEach(x=>x.onchange=()=>updateChain(x.dataset.chain));bindBackdropClose('#modal',closeModal)}
function updateChain(p){const a=$(`#${p}Area`).value,sEl=$(`#${p}Section`),old=sEl.value;sEl.innerHTML=selectOptions(sections(a),old);if(!sections(a).includes(sEl.value))sEl.value=sections(a)[0]||'';const iEl=$(`#${p}Item`),oldI=iEl.value,opts=items(a,sEl.value).map(x=>({id:x.item,label:x.item}));iEl.innerHTML=selectOptions(opts,oldI,x=>x.label)}

function commitInline(tx,field,value){
  if(field==='amount')tx.amount=tx.type==='수입'?Math.abs(num(value)):-Math.abs(num(value));
  else if(field==='type'){
    tx.type=value;tx.amount=value==='수입'?Math.abs(tx.amount):-Math.abs(tx.amount);
    const first=S.categories.find(c=>c.area===value);if(first)Object.assign(tx,{area:first.area,section:first.section,item:first.item,icon:first.icon});
  }else tx[field]=value;
  render();toast('바로 수정했습니다.');
}
function openInlineEditor(cell){
  if(cell.classList.contains('inline-editing'))return;
  const tx=S.transactions.find(x=>x.id===cell.dataset.inlineId),field=cell.dataset.inlineField;if(!tx)return;
  if(field==='type')return toast('수입·지출·이체 구분은 수정할 수 없습니다. 새 거래로 다시 입력하세요.');
  cell.classList.add('inline-editing');
  if(field==='category'){
    cell.innerHTML=`<div class="inline-category"><select data-part="area">${selectOptions(areas(),tx.area)}</select><select data-part="section">${selectOptions(sections(tx.area),tx.section)}</select><select data-part="item">${selectOptions(items(tx.area,tx.section).map(x=>x.item),tx.item)}</select><span><button data-inline-save>적용</button><button data-inline-cancel>취소</button></span></div>`;
    const area=cell.querySelector('[data-part="area"]'),section=cell.querySelector('[data-part="section"]'),item=cell.querySelector('[data-part="item"]');
    const refreshItems=()=>{item.innerHTML=selectOptions(items(area.value,section.value).map(x=>x.item),item.value)};
    area.onchange=()=>{section.innerHTML=selectOptions(sections(area.value),sections(area.value)[0]);refreshItems()};section.onchange=refreshItems;
    cell.querySelector('[data-inline-save]').onclick=()=>{const c=cat(area.value,section.value,item.value);Object.assign(tx,{area:area.value,section:section.value,item:item.value,icon:c.icon});render();toast('카테고리를 바꿨습니다.')};
    cell.querySelector('[data-inline-cancel]').onclick=()=>render();return;
  }
  let html='';
  if(field==='paymentId')html=`<select class="inline-control">${selectOptions(paymentOptions(),tx.paymentId,p=>`${p.icon} ${p.name}`)}</select>`;
  else if(field==='accountId')html=`<select class="inline-control">${selectOptions(S.accounts.filter(x=>x.trackBalance!==false),tx.accountId,a=>a.name)}</select>`;
  else if(field==='type')html=`<select class="inline-control">${selectOptions(['지출','수입','이체'],tx.type)}</select>`;
  else if(field==='date')html=`<input class="inline-control" type="date" value="${tx.date}">`;
  else html=`<input class="inline-control" ${field==='amount'?'inputmode="numeric"':''} value="${esc(field==='amount'?Math.abs(tx.amount):tx[field]||'')}">`;
  cell.innerHTML=html;const control=cell.querySelector('.inline-control');control.focus();if(control.select)control.select();
  if(control.tagName==='SELECT'||field==='date')control.onchange=()=>commitInline(tx,field,control.value);
  else{let finished=false;const done=()=>{if(finished)return;finished=true;commitInline(tx,field,control.value)};control.onkeydown=e=>{if(e.key==='Enter')done();if(e.key==='Escape'){finished=true;render()}};control.onblur=done}
}

function txModal(id=null,type='지출'){
  const accounts=S.accounts,existing=S.transactions.find(x=>x.id===id);
  const firstAsset=accounts[0]?.id;
  const selectedAsset=existing?.paymentId||existing?.accountId||firstAsset;
  const remembered=lastTransactionCategory[type]||{},defaultSection=sections(type).includes(remembered.section)?remembered.section:sections(type)[0],defaultItem=items(type,defaultSection).some(v=>v.item===remembered.item)?remembered.item:(items(type,defaultSection)[0]?.item||'');
  const x=existing||{id:uid(),date:lastTransactionDate,type,area:type,section:defaultSection,item:defaultItem,title:'',amount:0,originalAmount:0,splitCount:1,paymentId:firstAsset,accountId:firstAsset,memo:''};
  const shownAmount=Math.abs(Number(x.originalAmount)||Number(x.amount)||0),shownSplit=Math.max(1,Math.trunc(Number(x.splitCount)||1));
  $('#modal').innerHTML=modal(id?'거래 수정':'거래 추가',`<div class="modal-grid tx-modal-grid"><div class="field"><label>구분</label><select id="txType" ${id?'disabled':''}>${selectOptions(['지출','수입','이체'],x.type)}</select>${id?'<small class="field-help">구분은 수정할 수 없습니다.</small>':''}</div><div class="field"><label>날짜</label><input id="txDate" type="date" value="${x.date}"></div><div class="field wide"><label>분류</label><div class="triple tx-category-chain">${categorySelects('tx',x.area,x.section,x.item)}</div><small class="field-help">구분에 맞는 중분류·소분류를 선택하세요.</small></div><div class="field wide"><label>내용</label><input id="txTitle" value="${esc(x.title)}"></div><div class="field"><label>전체 금액</label><input id="txAmount" inputmode="numeric" value="${shownAmount||''}"></div><div class="field"><label>N빵 인원</label><input id="txSplitCount" type="number" min="1" step="1" value="${shownSplit}"><small class="field-help">기본 1명 · 정수만 입력 · 나눈 뒤 소수점은 버립니다.</small></div><div class="field"><label>자산</label><select id="txAssetUnified">${selectOptions(accounts,selectedAsset,a=>`${a.paymentIcon||'⌂'} ${a.name}`)}</select><small class="field-help">거래에 사용할 자산입니다. 자산 반영을 켠 자산은 잔액도 같이 반영됩니다.</small></div><div class="field wide"><label>메모</label><input id="txMemo" value="${esc(x.memo)}"></div></div>${id?`<div class="tx-modal-danger"><button class="pill danger" id="deleteTxInModal">이 거래 삭제</button><small>삭제하면 복구할 수 없습니다.</small></div>`:''}`);
  modalBase();
  if(id&&$('#deleteTxInModal'))$('#deleteTxInModal').onclick=()=>confirmDialog({title:'거래 삭제',message:`${x.title||'이 거래'}을(를) 삭제할까요?`,details:[`${x.date} · ${money(Math.abs(x.amount))}`],confirmText:'삭제',danger:true,onConfirm:()=>{S.transactions=S.transactions.filter(v=>v.id!==id);closeSubmodal();closeModal();render();toast('거래를 삭제했습니다.')}});
  $('#txType').onchange=()=>{const t=$('#txType').value,remembered=lastTransactionCategory[t]||{};$('#txArea').value=t;updateChain('tx');if(sections(t).includes(remembered.section)){$('#txSection').value=remembered.section;updateChain('tx');if(items(t,remembered.section).some(v=>v.item===remembered.item))$('#txItem').value=remembered.item}};
  $('#txSplitCount').oninput=()=>{const v=Math.trunc(Number($('#txSplitCount').value)||1);$('#txSplitCount').value=Math.max(1,v)};
  $('#saveModal').onclick=()=>{const originalAmount=Math.abs(num($('#txAmount').value)),splitCount=Math.max(1,Math.trunc(Number($('#txSplitCount').value)||1)),amount=Math.floor(originalAmount/splitCount),kind=id?x.type:$('#txType').value,date=$('#txDate').value,title=$('#txTitle').value.trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return toast('거래 날짜를 입력하세요.');if(!title||!originalAmount)return toast('내용과 금액을 입력하세요.');if(!amount)return toast('N빵 후 금액이 1원 이상이어야 합니다.');let section=$('#txSection').value,item=$('#txItem').value;const area=kind;const assetId=$('#txAssetUnified').value;const c=cat(area,section,item);const signed=kind==='수입'?Math.abs(amount):-Math.abs(amount);const n={...x,date,type:kind,area,section,item,title,amount:signed,originalAmount,splitCount,paymentId:assetId,accountId:assetId,memo:$('#txMemo').value,icon:c.icon};if(id)S.transactions[S.transactions.findIndex(v=>v.id===id)]=n;else{S.transactions.push(n);lastTransactionDate=date}lastTransactionCategory[kind]={section,item};selectedMonth=date.slice(0,7);txFilter='전체';page='transactions';closeModal();render();toast(splitCount>1?`${splitCount}N빵으로 ${money(amount)}을 반영했습니다.`:'거래를 저장했습니다.')}
}
function dayModal(day){const key=`${selectedMonth}-${pad(day)}`,list=S.transactions.filter(x=>x.date===key);$('#modal').innerHTML=modal(`${Number(selectedMonth.slice(5))}월 ${day}일 거래`,list.length?list.map(txLine).join(''):empty('이 날짜의 거래가 없습니다.'),'거래 추가');modalBase();$('#saveModal').onclick=()=>{closeModal();txModal(null,'지출');$('#txDate').value=key;lastTransactionDate=key}}
function budgetModal(id=null){const b=S.budgets.find(x=>x.id===id)||{id:uid(),area:'지출',section:sections('지출')[0],item:items('지출',sections('지출')[0])[0]?.item,amount:0};$('#modal').innerHTML=modal(id?'예산 수정':'예산 추가',`<div class="field"><label>영역 / 분류 / 항목</label><div class="triple">${categorySelects('bu',b.area,b.section,b.item)}</div></div><div class="field section-gap"><label>월 예산</label><input id="buAmount" value="${b.amount||''}"></div>`);modalBase();$('#saveModal').onclick=()=>{const n={...b,area:$('#buArea').value,section:$('#buSection').value,item:$('#buItem').value,amount:num($('#buAmount').value)};if(!n.amount)return toast('예산 금액을 입력하세요.');if(id)S.budgets[S.budgets.findIndex(x=>x.id===id)]=n;else S.budgets.push(n);closeModal();render()}}
function subModal(id=null){const assets=S.accounts.filter(x=>x.paymentEnabled||x.trackBalance!==false),s=S.subscriptions.find(x=>x.id===id)||{id:uid(),service:'',category:'OTT',price:0,day:1,paymentId:assets[0]?.id,accountId:assets[0]?.id,active:true};const selected=s.paymentId||s.accountId||assets[0]?.id;$('#modal').innerHTML=modal(id?'구독 수정':'구독 추가',`<div class="modal-grid"><div class="field"><label>서비스명</label><input id="subService" value="${esc(s.service)}"></div><div class="field"><label>종류</label><input id="subCategory" value="${esc(s.category)}" placeholder="OTT, AI, 음악 등"></div><div class="field"><label>월 요금</label><input id="subPrice" value="${s.price||''}"></div><div class="field"><label>결제일</label><input id="subDay" type="number" min="1" max="31" value="${s.day}"></div><div class="field wide"><label>자산</label><select id="subAsset">${selectOptions(assets,selected,a=>`${a.paymentIcon||'⌂'} ${a.name}`)}</select><small class="field-help">구독 결제에 사용할 자산입니다. 자산 반영을 켠 자산은 잔액도 같이 반영됩니다.</small></div></div>`);modalBase();$('#saveModal').onclick=()=>{const assetId=$('#subAsset').value;const n={...s,service:$('#subService').value.trim(),category:$('#subCategory').value.trim(),price:num($('#subPrice').value),day:Math.min(31,Math.max(1,num($('#subDay').value))),paymentId:assetId,accountId:assetId};if(!n.service||!n.price)return toast('서비스명과 요금을 입력하세요.');if(id)S.subscriptions[S.subscriptions.findIndex(x=>x.id===id)]=n;else S.subscriptions.push(n);closeModal();render()}}
function accountModal(id=null){const a=S.accounts.find(x=>x.id===id)||{id:uid(),type:'입출금',name:'',opening:0,trackBalance:true,paymentEnabled:false,paymentIcon:'💳',paymentColor:'#2966ff'};const current=id?balance(a):0;$('#modal').innerHTML=modal(id?'자산 수정':'자산 추가',`<div class="modal-grid"><div class="field"><label>유형</label><select id="accType">${selectOptions(['입출금','예금','적금','투자','현금','카드','전자지갑','자산','기타'],a.type)}</select></div><div class="field"><label>자산명</label><input id="accName" value="${esc(a.name)}" placeholder="예: 우리은행 입출금통장"></div><div class="field wide"><label>현재 잔액</label><input id="accCurrent" inputmode="numeric" value="${current}"><small class="field-help">지금 실제로 가진 금액을 입력하면 저장 후 이 금액과 정확히 같아집니다. 예: 540000 입력 → 현재 잔액 540,000원</small></div><div class="field wide asset-switches"><label class="switch-field"><input id="accTrack" type="checkbox" ${a.trackBalance!==false?'checked':''}><span><b>총자산에 반영</b><small>계좌·현금·투자처럼 총자산에 포함합니다.</small></span></label><label class="switch-field"><input id="accPayment" type="checkbox" ${a.paymentEnabled?'checked':''}><span><b>거래에 사용</b><small>체크하면 거래·구독의 자산 목록에 표시됩니다.</small></span></label></div><div class="field"><label>자산 아이콘</label><input id="accPayIcon" value="${esc(a.paymentIcon||'💳')}" maxlength="4"></div><div class="field"><label>표시 색상</label><input id="accPayColor" type="color" value="${a.paymentColor||'#2966ff'}"></div></div>`);modalBase();$('#accType').onchange=()=>{if($('#accType').value==='자산'){$('#accTrack').checked=false;$('#accPayment').checked=true}};$('#saveModal').onclick=()=>{const paymentEnabled=$('#accPayment').checked;if(id&&a.paymentEnabled&&!paymentEnabled){const linked=paymentDependencies(id);if(linked.length)return dependencyDialog('거래 사용을 끌 수 없습니다.',`${a.name}이(가) 아직 자산으로 사용 중입니다.`,linked)}const desiredCurrent=num($('#accCurrent').value),flow=id?accountFlow(a.id):0;const n={...a,type:$('#accType').value,name:$('#accName').value.trim(),opening:desiredCurrent-flow,trackBalance:$('#accTrack').checked,paymentEnabled,paymentIcon:$('#accPayIcon').value||'💳',paymentColor:$('#accPayColor').value};if(!n.name)return toast('자산 이름을 입력하세요.');if(id)S.accounts[S.accounts.findIndex(x=>x.id===id)]=n;else S.accounts.push(n);closeModal();render();toast(`현재 잔액을 ${money(desiredCurrent)}으로 맞췄습니다.`)}}
function assetDependencies(id){return[{label:'거래에 사용된 자산',count:S.transactions.filter(x=>x.accountId===id||x.paymentId===id).length},{label:'이체 도착 자산',count:S.transactions.filter(x=>x.targetAccountId===id).length},{label:'정기구독에 사용된 자산',count:S.subscriptions.filter(x=>x.accountId===id||x.paymentId===id).length}].filter(x=>x.count)}
function paymentDependencies(id){return[{label:'거래 자산',count:S.transactions.filter(x=>x.paymentId===id).length},{label:'정기구독 자산',count:S.subscriptions.filter(x=>x.paymentId===id).length}].filter(x=>x.count)}
function deleteAccount(id){const a=S.accounts.find(x=>x.id===id);if(!a)return;const linked=assetDependencies(id);if(linked.length)return dependencyDialog('자산을 삭제할 수 없습니다.',`${a.name}이(가) 다음 위치에 연결되어 있습니다.`,linked);confirmDialog({title:'자산 삭제',message:`${a.name}을(를) 삭제할까요?`,details:['삭제한 자산 설정은 복구할 수 없습니다.'],confirmText:'삭제',danger:true,onConfirm:()=>{S.accounts=S.accounts.filter(x=>x.id!==id);render();toast('자산을 삭제했습니다.')}})}
function paymentModal(id=null){const p=S.payments.find(x=>x.id===id)||{id:uid(),name:'',icon:'💳',color:'#2966ff'};$('#modal').innerHTML=modal(id?'자산 수정':'자산 추가',`<div class="modal-grid"><div class="field"><label>이름</label><input id="payName" value="${esc(p.name)}"></div><div class="field"><label>아이콘</label><input id="payIcon" value="${esc(p.icon)}" maxlength="4"></div><div class="field wide"><label>색상</label><input id="payColor" type="color" value="${p.color}"></div></div>`);modalBase();$('#saveModal').onclick=()=>{const n={...p,name:$('#payName').value.trim(),icon:$('#payIcon').value||'💳',color:$('#payColor').value};if(!n.name)return toast('자산 이름을 입력하세요.');if(id)S.payments[S.payments.findIndex(x=>x.id===id)]=n;else S.payments.push(n);closeModal();render()}}
function deletePayment(id){if(S.transactions.some(x=>x.paymentId===id)||S.subscriptions.some(x=>x.paymentId===id))return toast('사용 중인 자산은 삭제할 수 없습니다.');remove('payments',id,'자산')}

function reorderCategoryGroup(kind,direction,area='',section='',id=''){
  const step=direction==='up'?-1:1;
  if(kind==='area'){
    const order=areas(),from=order.indexOf(area),to=from+step;if(from<0||to<0||to>=order.length)return;
    [order[from],order[to]]=[order[to],order[from]];
    S.categories=order.flatMap(name=>S.categories.filter(x=>x.area===name));
  }else if(kind==='section'){
    const order=sections(area),from=order.indexOf(section),to=from+step;if(from<0||to<0||to>=order.length)return;
    [order[from],order[to]]=[order[to],order[from]];
    const reordered=order.flatMap(name=>S.categories.filter(x=>x.area===area&&x.section===name));
    let inserted=false;const next=[];
    for(const x of S.categories){if(x.area===area){if(!inserted){next.push(...reordered);inserted=true}}else next.push(x)}
    S.categories=next;
  }else if(kind==='item'){
    const group=S.categories.filter(x=>x.area===area&&x.section===section),from=group.findIndex(x=>x.id===id),to=from+step;if(from<0||to<0||to>=group.length)return;
    [group[from],group[to]]=[group[to],group[from]];
    let gi=0;S.categories=S.categories.map(x=>x.area===area&&x.section===section?group[gi++]:x);
  }
  save();categoryManager();
}
function uniqueCategoryName(base,used){let name=`${base} 복사`,n=2;while(used.includes(name)){name=`${base} 복사 ${n++}`}return name}
function copyCategory(level,area,section,id){
  if(level==='area'){
    const name=uniqueCategoryName(area,areas()),source=S.categories.filter(x=>x.area===area);
    S.categories.push(...source.map(x=>({...x,id:uid(),area:name})));
    toast(`${area} 영역을 복사했습니다.`)
  }else if(level==='section'){
    const name=uniqueCategoryName(section,sections(area)),source=S.categories.filter(x=>x.area===area&&x.section===section);
    S.categories.push(...source.map(x=>({...x,id:uid(),section:name})));
    toast(`${section} 분류를 복사했습니다.`)
  }else{
    const source=S.categories.find(x=>x.id===id);if(!source)return;
    const name=uniqueCategoryName(source.item,items(source.area,source.section).map(x=>x.item));
    S.categories.push({...source,id:uid(),item:name});toast(`${source.item} 항목을 복사했습니다.`)
  }
  save();categoryManager()
}
function categoryManager(){const previousCategoryModal=$('.category-modal'),categoryScrollTop=previousCategoryModal?.scrollTop||0,categorySearchValue=$('#categorySearch')?.value||'';const areaList=areas();const tree=areaList.map((a,ai)=>`<div class="area-node" data-category-text="${esc(a.toLowerCase())}"><div class="node-row"><button class="collapse-btn" data-collapse-area="${esc(a)}" title="소분류 접기/펼치기">▾</button><b>${esc(a)} <small>${S.categories.filter(x=>x.area===a).length}개</small></b><span class="node-actions"><span class="order-controls"><button class="order-btn" data-cat-move="area" data-direction="up" data-area="${esc(a)}" ${ai===0?'disabled':''} title="위로 이동">↑</button><button class="order-btn" data-cat-move="area" data-direction="down" data-area="${esc(a)}" ${ai===areaList.length-1?'disabled':''} title="아래로 이동">↓</button></span><button data-cat-add="section" data-area="${esc(a)}">+ 분류</button><button class="category-copy-btn" data-cat-copy="area" data-area="${esc(a)}" title="영역 복사">=</button>${majorAreas.includes(a)?'<span class="fixed-area-badge">고정</span>':`<button data-cat-edit="area" data-area="${esc(a)}">이름 변경</button><button data-cat-del="area" data-area="${esc(a)}">삭제</button>`}</span></div>${sections(a).map((s,si,sectionList)=>`<div class="section-node" data-area-group="${esc(a)}" data-category-text="${esc(`${a} ${s}`.toLowerCase())}"><div class="node-row"><button class="collapse-btn" data-collapse-section="${esc(a)}||${esc(s)}" title="소분류 접기/펼치기">▾</button><b>${esc(s)} <small>${items(a,s).length}개 항목</small></b><span class="node-actions"><span class="order-controls"><button class="order-btn" data-cat-move="section" data-direction="up" data-area="${esc(a)}" data-section="${esc(s)}" ${si===0?'disabled':''} title="위로 이동">↑</button><button class="order-btn" data-cat-move="section" data-direction="down" data-area="${esc(a)}" data-section="${esc(s)}" ${si===sectionList.length-1?'disabled':''} title="아래로 이동">↓</button></span><button data-cat-add="item" data-area="${esc(a)}" data-section="${esc(s)}">+ 항목</button><button class="category-copy-btn" data-cat-copy="section" data-area="${esc(a)}" data-section="${esc(s)}" title="분류 복사">=</button><button data-cat-edit="section" data-area="${esc(a)}" data-section="${esc(s)}">이름 변경</button><button data-cat-del="section" data-area="${esc(a)}" data-section="${esc(s)}">삭제</button></span></div>${items(a,s).map((i,ii,itemList)=>`<div class="item-node" data-section-group="${esc(a)}||${esc(s)}" data-category-text="${esc(`${a} ${s} ${i.item}`.toLowerCase())}"><span class="item-label"><i style="background:${i.color}22;color:${i.color}">${i.icon}</i><b>${esc(i.item)}</b></span><span class="node-actions"><span class="order-controls"><button class="order-btn" data-cat-move="item" data-direction="up" data-area="${esc(a)}" data-section="${esc(s)}" data-id="${i.id}" ${ii===0?'disabled':''} title="위로 이동">↑</button><button class="order-btn" data-cat-move="item" data-direction="down" data-area="${esc(a)}" data-section="${esc(s)}" data-id="${i.id}" ${ii===itemList.length-1?'disabled':''} title="아래로 이동">↓</button></span><button class="category-copy-btn" data-cat-copy="item" data-id="${i.id}" title="항목 복사">=</button><button data-cat-edit="item" data-id="${i.id}">수정</button><button data-cat-del="item" data-id="${i.id}">삭제</button></span></div>`).join('')}</div>`).join('')}</div>`).join('');$('#modal').innerHTML=`<div class="modal"><div class="modalbox category-modal"><div class="modal-title"><div><h2>카테고리 관리</h2><p class="hint">영역 → 분류 → 항목 순서입니다. ↑ ↓ 버튼으로 표시 순서를 바꿀 수 있습니다.</p></div><button class="close" id="closeModal">×</button></div><div class="category-summary-strip"><div><b>${areas().length}</b><span>영역</span></div><div><b>${areas().reduce((n,a)=>n+sections(a).length,0)}</b><span>분류</span></div><div><b>${S.categories.length}</b><span>항목</span></div></div><div class="manager-toolbar"><button class="btn primary new-area-btn" data-cat-add="area">+ 새 영역</button><input id="categorySearch" class="category-search" placeholder="영역·분류·항목 검색"></div><div class="category-tree">${tree||empty('등록된 카테고리가 없습니다.')}</div></div></div>`;$('#closeModal').onclick=closeModal;bindBackdropClose('#modal',closeModal);$$('[data-cat-add]').forEach(b=>b.onclick=()=>catAdd(b.dataset.catAdd,b.dataset.area,b.dataset.section));$$('[data-cat-copy]').forEach(b=>b.onclick=()=>copyCategory(b.dataset.catCopy,b.dataset.area,b.dataset.section,b.dataset.id));$$('[data-cat-edit]').forEach(b=>b.onclick=()=>catEdit(b.dataset.catEdit,b.dataset.area,b.dataset.section,b.dataset.id));$$('[data-cat-del]').forEach(b=>b.onclick=()=>catDelete(b.dataset.catDel,b.dataset.area,b.dataset.section,b.dataset.id));$$('[data-cat-move]').forEach(b=>b.onclick=()=>reorderCategoryGroup(b.dataset.catMove,b.dataset.direction,b.dataset.area,b.dataset.section,b.dataset.id));$$('[data-collapse-area]').forEach(b=>b.onclick=()=>{const key=b.dataset.collapseArea,rows=$$(`[data-area-group=\"${CSS.escape(key)}\"]`),hide=!rows.every(x=>x.hidden);rows.forEach(x=>x.hidden=hide);b.textContent=hide?'▸':'▾'});$$('[data-collapse-section]').forEach(b=>b.onclick=()=>{const key=b.dataset.collapseSection,rows=$$(`[data-section-group=\"${CSS.escape(key)}\"]`),hide=!rows.every(x=>x.hidden);rows.forEach(x=>x.hidden=hide);b.textContent=hide?'▸':'▾'});$('#categorySearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('.category-tree [data-category-text]').forEach(x=>x.hidden=!!q&&!x.dataset.categoryText.includes(q));if(q)$$('.area-node,.section-node').forEach(x=>{if(x.textContent.toLowerCase().includes(q))x.hidden=false})};if(categorySearchValue){$('#categorySearch').value=categorySearchValue;$('#categorySearch').dispatchEvent(new Event('input'))}requestAnimationFrame(()=>{const modal=$('.category-modal');if(modal)modal.scrollTop=categoryScrollTop})}
function categoryEditor(kind,mode,a='',s='',id=''){
  const item=S.categories.find(x=>x.id===id);const isEdit=mode==='edit';
  const current=kind==='area'?a:kind==='section'?s:(item?.item||'');
  const title=`${kind==='area'?'대분류':kind==='section'?'중분류':'소분류'} ${isEdit?'수정':'추가'}`;
  $('#submodal').innerHTML=`<div class="modal app-confirm"><div class="modalbox confirm-box category-editor-box"><h2>${title}</h2><div class="field"><label>이름</label><input id="catEditorName" value="${esc(current)}" autofocus></div>${kind==='item'?`<div class="modal-grid"><div class="field"><label>아이콘</label><input id="catEditorIcon" value="${esc(item?.icon||'•')}" maxlength="4"></div><div class="field"><label>색상</label><input id="catEditorColor" type="color" value="${item?.color||'#8795aa'}"></div></div>${a==='지출'&&s==='식비'?`<label class="food-analysis-toggle"><input id="catFoodAnalysis" type="checkbox" ${item?.foodAnalysis===true?'checked':''}><span><b>식비 분석에 포함</b><small>기본은 꺼짐이며, 켠 소분류만 식비 분석에 집계됩니다.</small></span></label>`:''}`:''}<div class="modal-actions"><button class="pill" id="cancelCatEditor">취소</button><button class="btn primary" id="saveCatEditor">저장</button></div></div></div>`;
  $('#cancelCatEditor').onclick=closeSubmodal;$('#saveCatEditor').onclick=()=>{const name=$('#catEditorName').value.trim();if(!name)return toast('이름을 입력하세요.');
    if(kind==='area'){if(isEdit){if(areas().includes(name)&&name!==a)return toast('같은 대분류가 이미 있습니다.');cascade(a,name,'area')}else{if(areas().includes(name))return toast('같은 대분류가 이미 있습니다.');S.categories.push({id:uid(),area:name,section:'기본',item:'기타',icon:'•',color:'#8795aa'})}}
    else if(kind==='section'){if(isEdit){if(sections(a).includes(name)&&name!==s)return toast('같은 중분류가 이미 있습니다.');cascade(s,name,'section',a)}else{if(sections(a).includes(name))return toast('같은 중분류가 이미 있습니다.');S.categories.push({id:uid(),area:a,section:name,item:'기타',icon:'•',color:'#8795aa'})}}
    else{if(items(a,s).some(v=>v.item===name&&v.id!==id))return toast('같은 소분류가 이미 있습니다.');const n={id:item?.id||uid(),area:a,section:s,item:name,icon:$('#catEditorIcon').value||'•',color:$('#catEditorColor').value,foodAnalysis:(a==='지출'&&s==='식비')?($('#catFoodAnalysis')?.checked===true):(item?.foodAnalysis===true)};if(isEdit){const old=item.item;S.categories[S.categories.findIndex(v=>v.id===id)]=n;S.transactions.filter(v=>v.area===a&&v.section===s&&v.item===old).forEach(v=>v.item=name);S.budgets.filter(v=>v.area===a&&v.section===s&&v.item===old).forEach(v=>v.item=name)}else S.categories.push(n)}
    save();closeSubmodal();categoryManager();toast('카테고리를 저장했습니다.');};
}
function catAdd(kind,a,s){categoryEditor(kind,'add',a,s)}
function cascade(oldV,newV,kind,a,s){const update=x=>{if(kind==='area'&&x.area===oldV)x.area=newV;if(kind==='section'&&x.area===a&&x.section===oldV)x.section=newV};S.categories.forEach(update);S.transactions.forEach(update);S.budgets.forEach(update)}
function catEdit(kind,a,s,id){if(kind==='area'&&majorAreas.includes(a))return toast('수입·지출·이체 영역은 수정할 수 없습니다.');categoryEditor(kind,'edit',a,s,id)}
function catDelete(kind,a,s,id){if(kind==='area'&&majorAreas.includes(a))return toast('수입·지출·이체 영역은 삭제할 수 없습니다.');const targets=kind==='area'?S.categories.filter(x=>x.area===a):kind==='section'?S.categories.filter(x=>x.area===a&&x.section===s):S.categories.filter(x=>x.id===id),matches=x=>targets.some(c=>x.area===c.area&&x.section===c.section&&x.item===c.item),linked=[{label:'거래내역',count:S.transactions.filter(matches).length},{label:'예산 항목',count:S.budgets.filter(matches).length}].filter(x=>x.count),name=kind==='area'?a:kind==='section'?s:targets[0]?.item||'카테고리';if(linked.length)return dependencyDialog('카테고리를 삭제할 수 없습니다.',`${name}이(가) 다음 위치에 연결되어 있습니다.`,linked);confirmDialog({title:'카테고리 삭제',message:`${name}을(를) 삭제할까요?`,details:[kind==='area'?`${targets.length}개 하위 항목도 함께 삭제됩니다.`:kind==='section'?`${targets.length}개 항목도 함께 삭제됩니다.`:'이 작업은 되돌릴 수 없습니다.'],confirmText:'삭제',danger:true,onConfirm:()=>{const ids=new Set(targets.map(x=>x.id));S.categories=S.categories.filter(x=>!ids.has(x.id));save();categoryManager();toast('카테고리를 삭제했습니다.')}})}

async function exportData(){const bridge=googleBridge();if(bridge?.exportBackup){try{const r=await bridge.exportBackup(S);if(!r?.canceled)toast('백업 파일을 저장했습니다.');return}catch(error){toast(String(error.message||error));return}}const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`FinanceOneBackup-${iso(today)}.json`;a.click();URL.revokeObjectURL(a.href)}
function exportCsv(){const q=v=>`"${String(v??'').replace(/"/g,'""')}"`,rows=[['날짜','구분','내용','영역','분류','항목','자산','계좌','금액','메모'],...S.transactions.map(x=>[x.date,x.type,x.title,x.area,x.section,x.item,pay(x.paymentId).name,account(x.accountId).name,x.amount,x.memo])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`FinanceOne-transactions-${iso(today)}.csv`;a.click();URL.revokeObjectURL(a.href)}
function validBackup(n){return n&&typeof n==='object'&&!Array.isArray(n)&&['categories','payments','accounts','transactions','budgets','subscriptions'].every(k=>Array.isArray(n[k]))&&(n.stocks==null||Array.isArray(n.stocks))&&n.transactions.length<=100000&&n.categories.length<=10000&&n.transactions.every(x=>typeof x.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(Number(x.amount)))}
async function importData(e){const bridge=googleBridge();if(bridge?.importBackup&&!e?.target?.files?.[0]){try{const result=await bridge.importBackup();if(result?.canceled)return;const n=result.state;if(!validBackup(n))throw Error('형식이 올바르지 않거나 손상된 백업입니다.');confirmDialog({title:'백업 데이터 복원',message:'현재 데이터를 선택한 백업 파일로 교체합니다.',details:[result.fileName||result.filePath||'FinanceOneBackup.json','현재 데이터가 필요하면 먼저 백업 파일로 저장하세요.'],confirmText:'복원',danger:true,onConfirm:async()=>{S=n;S.settings=S.settings||sample().settings;normalizeAssetPayments();await save();render();toast('백업을 복원했습니다.')}})}catch(error){toast(String(error.message||error))}return}const f=e?.target?.files?.[0];if(!f)return;if(f.size>10*1024*1024)return toast('10MB 이하 백업 파일만 복원할 수 있습니다.');const r=new FileReader();r.onload=()=>{try{const n=JSON.parse(r.result);if(!validBackup(n))throw Error();confirmDialog({title:'백업 데이터 복원',message:'현재 데이터를 선택한 백업 파일로 교체합니다.',details:[f.name,'현재 데이터가 필요하면 먼저 백업 파일로 저장하세요.'],confirmText:'복원',danger:true,onConfirm:async()=>{S=n;S.settings=S.settings||sample().settings;normalizeAssetPayments();await save();render();toast('백업을 복원했습니다.')}})}catch{toast('형식이 올바르지 않거나 손상된 백업입니다.')}};r.readAsText(f)}


async function initialize(){
  try{
    if(window.financeOne?.isDesktop){
      const stored=await window.financeOne.load();
      desktopInfo=await window.financeOne.info();
      googleInfo=await window.financeOne.googleStatus();
      const legacy=JSON.parse(localStorage.getItem('financeone_v5')||'null');
      S=stored||legacy||sample();
      normalizeAssetPayments();normalizeTransactions();
    }else{
      S=JSON.parse(localStorage.getItem('financeone_v5')||'null')||sample();
      normalizeAssetPayments();normalizeTransactions();
      const bridge=googleBridge();
      if(bridge?.googleStatus)googleInfo=await bridge.googleStatus();
    }
  }catch(error){
    console.error(error);
    S=sample();
  }
  render();
  appReady=true;
}

initialize();
