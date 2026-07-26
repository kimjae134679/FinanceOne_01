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
    foodPurchases:[],
    foodConsumptions:[],
    settings:{dark:false,theme:'light',autoSave:true,googleAutoSync:false,currency:'KRW',dateFormat:'YYYY-MM-DD'}
  };
}

let S=sample(),desktopInfo=null,googleInfo={connected:false},googleBackups=[],appReady=false,hadLocalData=false;
let page='dashboard', selectedMonth=monthKey(today), txFilter='전체', lastTransactionDate=iso(today), lastTransactionDateAt=0, foodMode='일', foodTab='inventory', foodCategoryFilter='전체', analysisMode='overview', analysisArea='지출', analysisSection='식비', analysisItem='외식/배달', excludeRent=false;
let lastTransactionCategory={지출:{section:'',item:''},수입:{section:'',item:''},이체:{section:'',item:''}};
let openBudgetSections=new Set();
const TRANSACTION_DATE_MEMORY_MS=10*60*1000;
function rememberTransactionDate(date){if(/^\d{4}-\d{2}-\d{2}$/.test(date)){lastTransactionDate=date;lastTransactionDateAt=Date.now()}}
function transactionDateForNew(){return lastTransactionDateAt&&Date.now()-lastTransactionDateAt<=TRANSACTION_DATE_MEMORY_MS?lastTransactionDate:iso(new Date())}
const googleBridge=()=>window.financeOne?.isDesktop?window.financeOne:window.Capacitor?.Plugins?.FinanceOneGoogle;
const GOOGLE_AUTO_KEY='financeone_google_auto_sync_v2';
const GOOGLE_LAST_REMOTE_KEY='financeone_google_last_remote';
const GOOGLE_FIRST_CHECK_KEY='financeone_google_first_restore_check';
let mobileSyncTimer=0,mobilePendingState=null,suppressGoogleUpload=false;
const googleAutoEnabled=()=>localStorage.getItem(GOOGLE_AUTO_KEY)==='1';
function setGoogleAutoEnabled(enabled){localStorage.setItem(GOOGLE_AUTO_KEY,enabled?'1':'0');S.settings=S.settings||sample().settings;S.settings.googleAutoSync=!!enabled}
function applyGoogleAutoPreference(){S.settings=S.settings||sample().settings;S.settings.googleAutoSync=googleAutoEnabled()}
const backupTime=file=>new Date(file?.modifiedTime||file?.createdTime||0).getTime()||0;
function markRemoteSynced(value){const time=typeof value==='number'?value:new Date(value||Date.now()).getTime();localStorage.setItem(GOOGLE_LAST_REMOTE_KEY,String(time||Date.now()))}
function scheduleMobileGoogleSync(){
  const bridge=googleBridge();
  if(suppressGoogleUpload||window.financeOne?.isDesktop||!bridge?.googleUpload||!googleInfo.connected||!googleAutoEnabled())return;
  mobilePendingState=JSON.parse(JSON.stringify(S));
  clearTimeout(mobileSyncTimer);
  mobileSyncTimer=setTimeout(async()=>{const state=mobilePendingState;mobilePendingState=null;try{if(state){const result=await bridge.googleUpload(state),when=result?.lastBackupTime||new Date().toISOString();localStorage.setItem('financeone_google_last_upload',when);markRemoteSynced(when)}}catch(error){console.warn('Mobile Google auto sync failed',error)}},30000);
}
const save=()=>window.financeOne?.isDesktop
  ? window.financeOne.save(S).catch(()=>toast('SQLite 저장에 실패했습니다.'))
  : (localStorage.setItem('financeone_v5',JSON.stringify(S)),scheduleMobileGoogleSync());
let toastTimer;
const toast=m=>{const t=$('#toast');if(!t)return;clearTimeout(toastTimer);t.textContent=String(m||'').slice(0,140);t.classList.add('show');toastTimer=setTimeout(()=>t.classList.remove('show'),3200)};
const errorText=e=>String(e?.message||e||'오류가 발생했습니다.').replace(/^Error invoking remote method '[^']+':\s*/,'');
const formatBackupDate=value=>{if(!value)return'없음';const raw=/^\d+$/.test(String(value))?Number(value):value,d=new Date(raw);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('ko-KR')};
const formatBytes=value=>{const n=Number(value)||0;if(n<1024)return`${n} B`;if(n<1024*1024)return`${(n/1024).toFixed(1)} KB`;return`${(n/1024/1024).toFixed(1)} MB`};
function googleSetupDialog(){
  const pkg=googleInfo.packageName||'com.financeone.mobile',sha=googleInfo.sha1||'앱에서 확인하지 못함';
  $('#submodal').innerHTML=`<div class="modal app-confirm"><div class="modalbox confirm-box google-help-box"><div class="confirm-icon">G</div><h2>Google 연결 설정</h2><p>Google Cloud의 Android OAuth 클라이언트에 아래 두 값을 등록하면 됩니다.</p><div class="oauth-values"><label>패키지명</label><code>${esc(pkg)}</code><button data-copy-oauth="${esc(pkg)}">복사</button><label>SHA-1</label><code>${esc(sha)}</code><button data-copy-oauth="${esc(sha)}">복사</button></div><ol><li>Google Cloud Console의 사용자 인증 정보 페이지를 엽니다.</li><li>Android OAuth 클라이언트를 선택하거나 새로 만듭니다.</li><li>위 패키지명과 SHA-1을 붙여넣고 저장합니다.</li><li>1~5분 뒤 앱에서 다시 연결합니다.</li></ol><div class="modal-actions"><button class="pill" id="closeGoogleHelp">닫기</button><button class="btn primary" id="openGoogleConsole">Google Cloud 열기</button></div></div></div>`;
  $('#closeGoogleHelp').onclick=closeSubmodal;
  $$('[data-copy-oauth]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyOauth);toast('복사했습니다.')}catch(_){toast('길게 눌러 값을 복사해 주세요.')}});
  $('#openGoogleConsole').onclick=async()=>{const bridge=googleBridge();try{if(bridge?.openGoogleCloudConsole)await bridge.openGoogleCloudConsole();else window.open(googleInfo.cloudConsoleUrl||'https://console.cloud.google.com/apis/credentials','_blank')}catch(e){toast(errorText(e))}};
}
function handleGoogleError(error){
  const text=errorText(error),code=String(error?.code||'');
  if(code.includes('OAUTH_CONFIG_MISMATCH')||/UnregisteredOnApiConsole|DEVELOPER_ERROR|OAuth 설정|연결 설정/.test(text)){toast('Google 연결 설정이 필요합니다.');googleSetupDialog();return}
  toast(text);
}
async function loadGoogleBackups({rerender=true}={}){
  const bridge=googleBridge();
  if(!googleInfo.connected||!bridge?.listBackups){googleBackups=[];if(rerender)render();return}
  try{const result=await bridge.listBackups();googleBackups=Array.isArray(result?.files)?result.files:[];if(result?.lastBackupTime)googleInfo.lastBackupTime=result.lastBackupTime;if(rerender)render()}
  catch(error){handleGoogleError(error)}
}
async function restoreGoogleBackupFile(file,{silent=false}={}){
  const bridge=googleBridge();
  if(!bridge?.restoreBackup||!file?.id)return false;
  const result=await bridge.restoreBackup({fileId:file.id});
  if(!validBackup(result?.state))throw Error('Drive 백업 형식이 올바르지 않거나 손상되었습니다.');
  const enabled=googleAutoEnabled();
  S=result.state;S.settings=S.settings||sample().settings;S.settings.googleAutoSync=false;
  normalizeAssetPayments();normalizeTransactions();normalizeFoodData();
  suppressGoogleUpload=true;
  try{await save()}finally{suppressGoogleUpload=false}
  S.settings.googleAutoSync=enabled;
  markRemoteSynced(backupTime(file));
  const wasReady=appReady;appReady=false;render();appReady=wasReady;
  if(!silent)toast('Google Drive 데이터를 불러왔습니다.');
  return true;
}
function offerGoogleRestore(file){
  if(!file)return;
  localStorage.setItem(GOOGLE_FIRST_CHECK_KEY,'1');
  markRemoteSynced(backupTime(file));
  confirmDialog({title:'Drive에 기존 데이터가 있습니다',message:'Google Drive에 저장된 FinanceOne 데이터를 이 기기로 불러올까요?',details:['불러오기를 누르면 현재 데이터를 Drive 데이터로 교체합니다.','자동 백업은 직접 켜기 전까지 꺼진 상태로 유지됩니다.'],confirmText:'불러오기',danger:false,onConfirm:async()=>{try{await restoreGoogleBackupFile(file)}catch(error){handleGoogleError(error)}}});
}
async function checkGoogleRemoteOnStart(){
  if(!googleInfo.connected||!googleBackups.length)return;
  const latest=googleBackups[0],remote=backupTime(latest),last=Number(localStorage.getItem(GOOGLE_LAST_REMOTE_KEY)||0);
  if(googleAutoEnabled()&&last&&remote>last){
    try{await restoreGoogleBackupFile(latest,{silent:true});toast('다른 기기에서 저장된 최신 데이터를 받았습니다.')}catch(error){handleGoogleError(error)}
    return;
  }
  if(!last&&localStorage.getItem(GOOGLE_FIRST_CHECK_KEY)!=='1')offerGoogleRestore(latest);
}
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
function normalizeFoodData(){
  if(!Array.isArray(S.foodPurchases))S.foodPurchases=[];
  if(!Array.isArray(S.foodConsumptions))S.foodConsumptions=[];
  S.foodPurchases=S.foodPurchases.map(x=>{const wasFixed=x.trackingMode==='fixed',name=String(x.name||x.category||'이름 없음').trim()||'이름 없음',legacyUnit=['g','kg','ml','L','개','회'].includes(x.packageUnit)?x.packageUnit:'개',legacyAmount=Math.max(.01,Number(x.packageAmount)||1),legacyQuantity=Math.max(.01,Number(x.quantity)||1),totalUnit=['g','kg','ml','L','개','회'].includes(x.totalUnit)?x.totalUnit:(wasFixed?'회':legacyUnit),totalAmount=Math.max(.01,Number(x.totalAmount)||(wasFixed?Number(x.servings)||1:legacyAmount*legacyQuantity)),finishedDate=/^\d{4}-\d{2}-\d{2}$/.test(x.finishedDate||'')?x.finishedDate:'';return {...x,id:String(x.id||uid()),name,category:String(x.category||name).trim()||name,variant:String(x.variant||'').trim(),purchaseDate:/^\d{4}-\d{2}-\d{2}$/.test(x.purchaseDate||'')?x.purchaseDate:iso(today),store:String(x.store||'').trim(),price:Math.max(0,Number(x.price)||0),totalAmount,totalUnit,packageAmount:totalAmount,packageUnit:totalUnit,quantity:1,trackingMode:'free',servings:null,finishedDate,memo:String(x.memo||'').trim(),createdAt:x.createdAt||new Date().toISOString()}});
  const ids=new Set(S.foodPurchases.map(x=>x.id));
  S.foodConsumptions=S.foodConsumptions.filter(x=>ids.has(String(x.purchaseId))).map(x=>{const type=x.type==='finish'?'finish':'portion',unit=['g','kg','ml','L','개','회'].includes(x.unit)?x.unit:'회';return {...x,id:String(x.id||uid()),purchaseId:String(x.purchaseId),type,date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')?x.date:iso(today),servings:type==='finish'?0:1,amount:type==='finish'?0:Math.max(.01,Number(x.amount)||Number(x.servings)||1),unit,cost:Math.max(0,Number(x.cost)||0),memo:String(x.memo||'').trim(),createdAt:x.createdAt||new Date().toISOString()}});
  S.foodConsumptions.filter(x=>x.type==='finish').forEach(x=>{const p=S.foodPurchases.find(v=>v.id===x.purchaseId);if(p&&!p.finishedDate)p.finishedDate=x.date});
  S.foodConsumptions=S.foodConsumptions.filter(x=>x.type!=='finish');
  S.foodPurchases.forEach(recalculateFoodPurchaseCosts);
}
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
const FOOD_UNITS=['g','kg','ml','L','개','회'];
const foodEvents=p=>S.foodConsumptions.filter(x=>x.purchaseId===p.id);
const foodPortions=p=>foodEvents(p);
const foodConsumed=p=>foodPortions(p).length;
const foodIsFinished=p=>/^\d{4}-\d{2}-\d{2}$/.test(p.finishedDate||'');
const foodPurchase=id=>S.foodPurchases.find(x=>x.id===id);
const foodCategory=p=>String(p.category||p.name||'이름 없음').trim();
const foodMatches=p=>foodCategoryFilter==='전체'||foodCategory(p)===foodCategoryFilter;
const foodMeasure=(amount,unit)=>{amount=Math.max(0,Number(amount)||0);if(unit==='kg')return {amount:amount*1000,unit:'g',dimension:'weight'};if(unit==='g')return {amount,unit:'g',dimension:'weight'};if(unit==='L')return {amount:amount*1000,unit:'ml',dimension:'volume'};if(unit==='ml')return {amount,unit:'ml',dimension:'volume'};if(unit==='개')return {amount,unit:'개',dimension:'count'};return {amount,unit:'회',dimension:'event'}};
const foodPackageMeasure=p=>foodMeasure(Number(p.totalAmount)||Number(p.packageAmount)||1,p.totalUnit||p.packageUnit||'개');
const foodEventMeasure=x=>foodMeasure(x.amount||x.servings||1,x.unit||'회');
const foodNumber=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2});
const foodAmountLabel=(amount,unit)=>`${foodNumber(amount)}${unit}`;
const foodPurchaseTitle=p=>p.variant?`${foodCategory(p)} · ${p.variant}`:foodCategory(p);
function foodUnitPrice(p){const m=foodPackageMeasure(p);return {value:m.amount?Number(p.price)/m.amount:0,unit:m.unit,dimension:m.dimension}}
function foodUnitPriceLabel(p){const u=foodUnitPrice(p);return `${u.value.toLocaleString('ko-KR',{minimumFractionDigits:u.value<10?2:0,maximumFractionDigits:2})}원/${u.unit}`}
function foodMeasuredConsumed(p,excludeId=''){const pack=foodPackageMeasure(p);return foodPortions(p).filter(x=>x.id!==excludeId).reduce((sum,x)=>{const m=foodEventMeasure(x);return sum+(m.dimension===pack.dimension?m.amount:0)},0)}
function foodConsumedSummary(p){
  const portions=foodPortions(p);if(!portions.length)return '0회 먹음';
  const values=portions.map(foodEventMeasure),same=values.every(x=>x.unit===values[0].unit&&Math.abs(x.amount-values[0].amount)<.0001);
  if(same)return `${portions.length}회 · 매회 ${foodAmountLabel(values[0].amount,values[0].unit)}`;
  const byUnit={};values.forEach(x=>byUnit[x.unit]=(byUnit[x.unit]||0)+x.amount);
  return `${portions.length}회 · 총 ${Object.entries(byUnit).map(([unit,amount])=>foodAmountLabel(amount,unit)).join(' + ')}`;
}
function foodCostFor(){return 0}
function recalculateFoodPurchaseCosts(p){
  if(!p)return;
  const portions=foodPortions(p),pack=foodPackageMeasure(p),total=Math.round(Number(p.price)||0),finished=foodIsFinished(p);
  portions.forEach(x=>x.cost=0);
  if(!portions.length)return;
  if(finished){
    const measures=portions.map(foodEventMeasure),sameDimension=measures.every(x=>x.dimension===measures[0].dimension),weight=measures.reduce((a,x)=>a+(sameDimension?x.amount:1),0)||portions.length;
    let given=0;portions.forEach((x,index)=>{x.cost=index===portions.length-1?total-given:Math.round(total*(sameDimension?measures[index].amount:1)/weight);given+=x.cost});
    return;
  }
  let allocated=0;
  if(pack.amount&&pack.dimension!=='event'){
    portions.forEach(x=>{const m=foodEventMeasure(x);if(m.dimension===pack.dimension&&allocated<total){x.cost=Math.max(0,Math.min(total-allocated,Math.round(total*m.amount/pack.amount)));allocated+=x.cost}});
  }
}
function foodEventCostLabel(x,p){return Number(x.cost)>0?money(x.cost):(foodIsFinished(p)?money(0):'정산 대기')}
function foodLastPurchase(){return [...S.foodPurchases].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]}
function foodUnitOptions(value){return FOOD_UNITS.map(x=>`<option value="${x}" ${x===value?'selected':''}>${x}</option>`).join('')}
function foodQuickForm(){const last=foodLastPurchase(),category=last?foodCategory(last):'',variant=last?.variant||'',store=last?.store||'',amount=last?.totalAmount||last?.packageAmount||1,unit=last?.totalUnit||last?.packageUnit||'개';return `<div class="card food-entry"><div class="card-head food-entry-head"><h3>식품 구매 기록</h3><button class="btn primary" id="saveFoodEntry">+ 구매 기록 저장</button></div><div class="food-form food-purchase-form"><label>구매일<input id="foodDate" type="date" value="${iso(new Date())}"></label><label>식품 종류<input id="foodTitle" value="${esc(category)}" placeholder="예: 우유, 닭갈비, 브로콜리"></label><label>상품·브랜드<input id="foodVariant" value="${esc(variant)}" placeholder="예: 서울우유 2L"></label><label>마트·구매처<input id="foodStore" value="${esc(store)}" placeholder="예: 이마트, 쿠팡"></label><label>구매 가격<input id="foodAmount" inputmode="numeric" placeholder="예: 12000"></label><label>구매 총량<input id="foodTotalAmount" inputmode="decimal" value="${foodNumber(amount)}" placeholder="예: 600"></label><label>총량 단위<select id="foodTotalUnit">${foodUnitOptions(unit)}</select></label><label class="food-memo">메모<input id="foodMemo" placeholder="선택 입력"></label></div></div>`}
function foodTabs(){return `<div class="tabs food-tabs">${[['inventory','재고·먹기'],['history','먹은 기록'],['stats','통계'],['prices','가격 비교']].map(([id,label])=>`<button data-food-tab="${id}" class="${foodTab===id?'active':''}">${label}</button>`).join('')}</div>`}
function foodCategoryTabs(){const categories=[...new Set(S.foodPurchases.map(foodCategory))].sort((a,b)=>a.localeCompare(b,'ko'));if(foodCategoryFilter!=='전체'&&!categories.includes(foodCategoryFilter))foodCategoryFilter='전체';return categories.length?`<div class="food-category-tabs"><button data-food-category="전체" class="${foodCategoryFilter==='전체'?'active':''}">전체</button>${categories.map(x=>`<button data-food-category="${esc(x)}" class="${foodCategoryFilter===x?'active':''}">${esc(x)}</button>`).join('')}</div>`:''}
function foodInventory(){
  const list=S.foodPurchases.filter(foodMatches).sort((a,b)=>Number(foodIsFinished(a))-Number(foodIsFinished(b))||b.purchaseDate.localeCompare(a.purchaseDate));
  return `<div class="card section-gap"><div class="card-head"><h3>보유 식품과 먹기 기록</h3><b>${list.filter(x=>!foodIsFinished(x)).length}개 보유</b></div>${list.length?`<div class="food-inventory-grid">${list.map(p=>{const events=foodEvents(p).sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt).localeCompare(String(b.createdAt))),used=foodConsumed(p),finished=foodIsFinished(p),pack=foodPackageMeasure(p),measured=foodMeasuredConsumed(p),pct=finished?100:pack.amount?Math.min(100,measured/pack.amount*100):0;return `<article class="food-purchase-card ${finished?'finished':''}"><div class="food-purchase-head"><div><span>${esc(p.purchaseDate)} · ${esc(p.store||'구매처 미입력')}</span><h4>${esc(foodPurchaseTitle(p))}</h4></div><strong>${money(p.price)}</strong></div><div class="food-purchase-meta"><span>총 ${foodAmountLabel(p.totalAmount||p.packageAmount,p.totalUnit||p.packageUnit)}</span><span>${foodUnitPriceLabel(p)}</span><span>${foodConsumedSummary(p)}</span></div><div class="food-progress"><i style="width:${pct}%"></i></div><div class="food-remain"><b>${finished?`다 먹음 · ${p.finishedDate}`:`${foodNumber(used)}회 먹은 상태`}</b></div>${!finished?`<div class="food-consume-actions"><button data-food-consume="${p.id}">1회 먹음</button><button class="primary-mini" data-food-finish="${p.id}">다 먹음</button></div>`:''}<div class="food-card-history"><b>먹은 기록</b>${events.length?`<div>${events.map(x=>`<button data-food-consumption-edit="${x.id}"><span>${esc(x.date)}</span><strong>${foodAmountLabel(x.amount||x.servings,x.unit||'회')}</strong></button>`).join('')}</div>`:`<span>아직 먹은 기록이 없습니다.</span>`}</div><div class="food-card-foot"><span>${esc(p.memo)||'메모 없음'}</span>${finished?`<button data-food-reopen="${p.id}">완료 취소</button>`:''}<button data-food-edit="${p.id}">수정</button><button class="danger-text" data-food-delete="${p.id}">삭제</button></div></article>`}).join('')}</div>`:empty('선택한 종류의 구매 기록이 없습니다.')}</div>`
}
function foodHistory(){
  const list=S.foodConsumptions.filter(x=>x.date.startsWith(selectedMonth)).map(x=>({...x,purchase:foodPurchase(x.purchaseId)})).filter(x=>x.purchase&&foodMatches(x.purchase)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
  return `<div class="card section-gap"><div class="card-head"><h3>먹은 기록</h3><b>${list.length}건</b></div>${list.length?`<div class="table-wrap"><table class="table responsive-table food-ledger"><thead><tr><th>날짜</th><th>종류</th><th>상품·브랜드</th><th>먹은 양</th><th>계산 식비</th><th>메모</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td data-label="날짜">${x.date}</td><td data-label="종류"><b>${esc(foodCategory(x.purchase))}</b></td><td data-label="상품·브랜드">${esc(x.purchase.variant)||'-'}</td><td data-label="먹은 양">${foodAmountLabel(x.amount||x.servings,x.unit||'회')}</td><td data-label="계산 식비" class="red"><b>${foodEventCostLabel(x,x.purchase)}</b></td><td data-label="메모">${esc(x.memo)||'-'}</td><td data-label="관리"><button data-food-consumption-edit="${x.id}">수정</button><button data-food-consumption-delete="${x.id}">삭제</button></td></tr>`).join('')}</tbody></table></div>`:empty('선택한 달에 먹은 기록이 없습니다.')}</div>`
}
function foodItemStats(){
  const list=S.foodConsumptions.filter(x=>x.date.startsWith(selectedMonth)),map={};
  list.forEach(x=>{const p=foodPurchase(x.purchaseId);if(!p||!foodMatches(p))return;const name=foodCategory(p),key=name.toLocaleLowerCase('ko'),r=map[key]||(map[key]={name,cost:0,count:0,last:'',amounts:{}});r.cost+=Number(x.cost)||0;const m=foodEventMeasure(x);r.amounts[m.unit]=(r.amounts[m.unit]||0)+m.amount;r.count++;if(x.date>r.last)r.last=x.date});
  return Object.values(map).sort((a,b)=>b.cost-a.cost);
}
function foodTrend(){
  const month=S.foodConsumptions.filter(x=>x.date.startsWith(selectedMonth)&&foodMatches(foodPurchase(x.purchaseId)||{}));
  if(foodMode==='일'){const [,m]=selectedMonth.split('-').map(Number),days=new Date(Number(selectedMonth.slice(0,4)),m,0).getDate(),out=Array.from({length:days},(_,i)=>({label:`${i+1}일`,value:0}));month.forEach(x=>out[Number(x.date.slice(8))-1].value+=Number(x.cost)||0);return out}
  if(foodMode==='주'){const out=[1,2,3,4,5].map(n=>({label:`${n}주`,value:0}));month.forEach(x=>out[Math.min(4,Math.floor((Number(x.date.slice(8))-1)/7))].value+=Number(x.cost)||0);return out}
  const out=[];for(let n=5;n>=0;n--){const [y,m]=selectedMonth.split('-').map(Number),d=new Date(y,m-1-n,1),key=monthKey(d);out.push({label:`${d.getMonth()+1}월`,value:S.foodConsumptions.filter(x=>x.date.startsWith(key)&&foodMatches(foodPurchase(x.purchaseId)||{})).reduce((a,x)=>a+(Number(x.cost)||0),0)})}return out
}
function foodStats(){
  const list=S.foodConsumptions.filter(x=>x.date.startsWith(selectedMonth)&&foodMatches(foodPurchase(x.purchaseId)||{})),total=list.reduce((a,x)=>a+(Number(x.cost)||0),0),[y,m]=selectedMonth.split('-').map(Number),days=new Date(y,m,0).getDate(),stats=foodItemStats();
  return `<div class="grid cols4 section-gap">${metric('🍴','soft-red','이번 달 먹은 식비',money(total),`${list.length}회 먹음`)}${metric('日','soft-green','1일 평균',money(total/days),`${days}일 기준`)}${metric('週','soft-blue','주 평균',money(total/(days/7)),'먹은 비용 기준')}${metric('▦','soft-orange','먹은 식품',`${stats.length}종`,'식비 기록 기준')}</div><div class="card section-gap"><div class="card-head"><h3>종류별 소비 통계</h3></div>${stats.length?`<div class="table-wrap"><table class="table food-stats-table"><thead><tr><th>식품 종류</th><th>먹은 횟수</th><th>먹은 양</th><th>월 식비</th><th>회당 평균</th><th>최근 섭취</th></tr></thead><tbody>${stats.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${x.count}회</td><td>${Object.entries(x.amounts).map(([unit,amount])=>foodAmountLabel(amount,unit)).join(' + ')||'-'}</td><td class="red"><b>${money(x.cost)}</b></td><td>${money(x.count?x.cost/x.count:0)}</td><td>${x.last}</td></tr>`).join('')}</tbody></table></div>`:empty('먹은 기록을 추가하면 종류별 통계가 표시됩니다.')}</div><div class="card section-gap"><div class="card-head"><h3>먹은 식비 추이</h3><div class="tabs compact">${['일','주','월'].map(x=>`<button data-food-mode="${x}" class="${foodMode===x?'active':''}">${x}</button>`).join('')}</div></div>${barChart(foodTrend(),'#ff585d')}</div>`
}
function foodPrices(){
  const groups={};S.foodPurchases.filter(foodMatches).forEach(p=>{const category=foodCategory(p),u=foodUnitPrice(p),key=`${category.toLocaleLowerCase('ko')}|${u.dimension}`,g=groups[key]||(groups[key]={name:category,unit:u.unit,rows:[]});g.rows.push({...p,unitPrice:u.value})});
  const list=Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  return `<div class="card section-gap"><div class="card-head"><h3>종류·상품·마트별 가격 비교</h3></div>${list.length?`<div class="food-price-groups">${list.map(g=>{const rows=g.rows.sort((a,b)=>a.unitPrice-b.unitPrice),best=rows[0];return `<section class="food-price-group"><div><h4>${esc(g.name)}</h4><span>최저 ${foodUnitPriceLabel(best)} · ${esc(best.variant||best.store||'상품명 미입력')}</span></div><div class="table-wrap"><table class="table food-price-table"><thead><tr><th>상품·브랜드</th><th>마트·구매처</th><th>구매일</th><th>총 가격</th><th>구매 총량</th><th>단위 가격</th></tr></thead><tbody>${rows.map((x,i)=>`<tr class="${i===0?'best-price':''}"><td><b>${esc(x.variant||x.name)}</b>${i===0?' <span class="tag soft-green">최저가</span>':''}</td><td>${esc(x.store)||'-'}</td><td>${x.purchaseDate}</td><td>${money(x.price)}</td><td>${foodAmountLabel(x.totalAmount||x.packageAmount,x.totalUnit||x.packageUnit)}</td><td><b>${foodUnitPriceLabel(x)}</b></td></tr>`).join('')}</tbody></table></div></section>`}).join('')}</div>`:empty('구매 기록을 추가하면 종류·상품·마트별 단가를 비교할 수 있습니다.')}</div>`
}
function food(){return header('식비 관리')+foodQuickForm()+foodTabs()+foodCategoryTabs()+(foodTab==='history'?foodHistory():foodTab==='stats'?foodStats():foodTab==='prices'?foodPrices():foodInventory())}
function saveFoodEntry(){const name=$('#foodTitle').value.trim(),variant=$('#foodVariant').value.trim(),price=Math.abs(num($('#foodAmount').value)),totalAmount=Math.max(.01,decimalNum($('#foodTotalAmount').value)),totalUnit=$('#foodTotalUnit').value;if(!name||!price)return toast('식품 종류와 구매 가격을 입력하세요.');const purchaseDate=$('#foodDate').value||iso(today);S.foodPurchases.push({id:uid(),name,category:name,variant,purchaseDate,store:$('#foodStore').value.trim(),price,totalAmount,totalUnit,packageAmount:totalAmount,packageUnit:totalUnit,quantity:1,trackingMode:'free',servings:null,finishedDate:'',memo:$('#foodMemo').value.trim(),createdAt:new Date().toISOString()});selectedMonth=purchaseDate.slice(0,7);foodCategoryFilter=name;foodTab='inventory';render();toast(`${foodPurchaseTitle(S.foodPurchases.at(-1))} 구매 기록을 저장했습니다.`)}
function consumeFood(id,date,amount,unit,memo=''){const p=foodPurchase(id);if(!p||foodIsFinished(p))return toast('이미 다 먹은 식품입니다.');amount=Math.max(.01,Number(amount)||0);S.foodConsumptions.push({id:uid(),purchaseId:p.id,type:'portion',date,servings:1,amount,unit,cost:0,memo,createdAt:new Date().toISOString()});recalculateFoodPurchaseCosts(p);selectedMonth=date.slice(0,7);render();toast(`${foodPurchaseTitle(p)} ${foodAmountLabel(amount,unit)} 먹은 기록을 저장했습니다.`)}
function foodConsumeModal(id){const p=foodPurchase(id);if(!p||foodIsFinished(p))return;const previous=[...foodPortions(p)].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0],unit=previous?.unit||p.totalUnit||p.packageUnit||'개',amount=previous?.amount||(unit==='개'||unit==='회'?1:'');$('#submodal').innerHTML=`<div class="modal"><div class="modalbox"><h2>${esc(foodPurchaseTitle(p))} 1회 먹음</h2><div class="modal-grid"><label>먹은 날짜<input id="foodConsumeDate" type="date" value="${iso(today)}"></label><label>먹은 양<input id="foodConsumeAmount" inputmode="decimal" value="${amount}"></label><label>단위<select id="foodConsumeUnit">${foodUnitOptions(unit)}</select></label><label class="wide">메모<input id="foodConsumeMemo" placeholder="선택 입력"></label></div><div class="modal-actions"><button class="pill" id="cancelFoodConsume">취소</button><button class="btn primary" id="confirmFoodConsume">기록</button></div></div></div>`;$('#cancelFoodConsume').onclick=closeSubmodal;$('#confirmFoodConsume').onclick=()=>{const date=$('#foodConsumeDate').value,amount=decimalNum($('#foodConsumeAmount').value),unit=$('#foodConsumeUnit').value,memo=$('#foodConsumeMemo').value.trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return toast('먹은 날짜를 선택하세요.');if(amount<=0)return toast('먹은 양을 입력하세요.');closeSubmodal();consumeFood(id,date,amount,unit,memo)}}
function finishFoodModal(id){const p=foodPurchase(id);if(!p||foodIsFinished(p))return;confirmDialog({title:'다 먹음',message:`${foodPurchaseTitle(p)}을 다 먹은 것으로 처리할까요?`,confirmText:'확인',onConfirm:()=>{p.finishedDate=iso(new Date());recalculateFoodPurchaseCosts(p);render();toast(`${foodPurchaseTitle(p)}을 다 먹은 것으로 처리했습니다.`)}})}
function reopenFood(id){const p=foodPurchase(id);if(!p)return;p.finishedDate='';recalculateFoodPurchaseCosts(p);render();toast('다 먹음 상태를 취소했습니다.')}
function foodConsumptionEditModal(id){const x=S.foodConsumptions.find(v=>v.id===id),p=x&&foodPurchase(x.purchaseId);if(!x||!p)return;$('#submodal').innerHTML=`<div class="modal"><div class="modalbox"><h2>${esc(foodPurchaseTitle(p))} 먹은 기록 수정</h2><div class="modal-grid"><label>날짜<input id="editFoodConsumptionDate" type="date" value="${x.date}"></label><label>먹은 양<input id="editFoodConsumptionAmount" inputmode="decimal" value="${x.amount||x.servings}"></label><label>단위<select id="editFoodConsumptionUnit">${foodUnitOptions(x.unit||'개')}</select></label><label class="wide">메모<input id="editFoodConsumptionMemo" value="${esc(x.memo)}"></label></div><div class="modal-actions"><button class="pill" id="cancelFoodConsumptionEdit">취소</button><button class="btn primary" id="confirmFoodConsumptionEdit">저장</button></div></div></div>`;$('#cancelFoodConsumptionEdit').onclick=closeSubmodal;$('#confirmFoodConsumptionEdit').onclick=()=>{const date=$('#editFoodConsumptionDate').value,amount=decimalNum($('#editFoodConsumptionAmount').value),unit=$('#editFoodConsumptionUnit').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return toast('날짜를 선택하세요.');if(amount<=0)return toast('먹은 양을 입력하세요.');x.amount=amount;x.unit=unit;x.servings=1;x.date=date;x.memo=$('#editFoodConsumptionMemo').value.trim();recalculateFoodPurchaseCosts(p);selectedMonth=date.slice(0,7);closeSubmodal();render();toast('먹은 기록을 수정했습니다.')}}
function deleteFoodConsumption(id){const x=S.foodConsumptions.find(v=>v.id===id),p=x&&foodPurchase(x.purchaseId);if(!x||!p)return;S.foodConsumptions=S.foodConsumptions.filter(v=>v.id!==id);recalculateFoodPurchaseCosts(p);render();toast('먹은 기록을 삭제했습니다.')}
function foodEditModal(id){const p=foodPurchase(id);if(!p)return;$('#submodal').innerHTML=`<div class="modal"><div class="modalbox"><h2>식품 구매 기록 수정</h2><div class="modal-grid"><label>구매일<input id="editFoodDate" type="date" value="${p.purchaseDate}"></label><label>식품 종류<input id="editFoodName" value="${esc(foodCategory(p))}"></label><label>상품·브랜드<input id="editFoodVariant" value="${esc(p.variant)}"></label><label>마트·구매처<input id="editFoodStore" value="${esc(p.store)}"></label><label>구매 가격<input id="editFoodPrice" inputmode="numeric" value="${p.price}"></label><label>구매 총량<input id="editFoodTotalAmount" inputmode="decimal" value="${p.totalAmount||p.packageAmount}"></label><label>총량 단위<select id="editFoodTotalUnit">${foodUnitOptions(p.totalUnit||p.packageUnit)}</select></label><label class="wide">메모<input id="editFoodMemo" value="${esc(p.memo)}"></label></div><div class="modal-actions"><button class="pill" id="cancelFoodEdit">취소</button><button class="btn primary" id="confirmFoodEdit">저장</button></div></div></div>`;$('#cancelFoodEdit').onclick=closeSubmodal;$('#confirmFoodEdit').onclick=()=>{const name=$('#editFoodName').value.trim(),price=Math.abs(num($('#editFoodPrice').value)),totalAmount=Math.max(.01,decimalNum($('#editFoodTotalAmount').value)),totalUnit=$('#editFoodTotalUnit').value;if(!name||!price)return toast('식품 종류와 가격을 입력하세요.');Object.assign(p,{purchaseDate:$('#editFoodDate').value,name,category:name,variant:$('#editFoodVariant').value.trim(),store:$('#editFoodStore').value.trim(),price,totalAmount,totalUnit,packageAmount:totalAmount,packageUnit:totalUnit,quantity:1,memo:$('#editFoodMemo').value.trim()});recalculateFoodPurchaseCosts(p);foodCategoryFilter=name;closeSubmodal();render();toast('구매 기록을 수정했습니다.')}}

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
function settingsPage(){
  const themes=[['light','라이트','☀'],['dark','다크','◐'],['midnight','미드나이트','☾'],['forest','포레스트','🌲'],['rose','로즈','🌸'],['sand','샌드','🏜'],['system','시스템','◫']];
  const last=googleInfo.lastBackupTime||localStorage.getItem('financeone_google_last_upload');
  const backupRows=googleBackups.length?googleBackups.map(file=>`<div class="drive-backup-row"><div><b>${esc(formatBackupDate(file.createdTime||file.modifiedTime))}</b><span>${esc(file.appVersion||'이전 버전')} · ${formatBytes(file.size)}</span></div><div><button class="pill" data-restore-backup="${esc(file.id)}">복원</button><button class="pill danger" data-delete-backup="${esc(file.id)}">삭제</button></div></div>`).join(''):`<p class="hint drive-empty">저장된 Drive 백업이 없습니다.</p>`;
  return settings()+`<div class="card section-gap google-sync-card"><div class="card-head"><div><h3>Google 계정 및 Drive 동기화</h3><p class="hint">FinanceOne 데이터만 Google Drive의 앱 전용 비공개 공간에 저장합니다.</p></div><span class="google-status ${googleInfo.connected?'connected':''}">${googleInfo.connected?'● 연결됨':'○ 연결 안 됨'}</span></div>${googleInfo.connected?`<div class="google-account"><div class="google-avatar">G</div><div><b>${esc(googleInfo.name||'Google 사용자')}</b><span>${esc(googleInfo.email||'연결된 Google 계정')}</span></div></div><div class="summary-lines google-backup-summary"><p><span>최근 백업</span><b>${esc(formatBackupDate(last))}</b></p></div><div class="data-actions"><button class="btn primary" id="googleUpload">지금 백업</button><button class="pill" id="refreshGoogleBackups">백업 목록 새로고침</button><button class="pill danger" id="googleDisconnect">연결 해제</button></div><div class="drive-backup-list"><div class="card-head"><h4>백업 목록</h4><span>${googleBackups.length}개</span></div>${backupRows}</div>`:`<div class="google-connect"><div><b>PC와 다른 기기 사이의 데이터 이동을 준비하세요.</b><span>Google 로그인 후 수동으로 백업하거나 복원할 수 있습니다.</span></div><button class="btn primary" id="googleLogin">Google 계정 연결</button></div><div class="oauth-help-inline"><span>연결 오류가 나나요?</span><button class="pill" id="googleSetupHelp">해결 방법</button></div>`}</div><div class="grid cols2 section-gap"><div class="card"><h3>색상 테마</h3><p class="hint">선택 즉시 적용되고 자동 저장됩니다.</p><div class="theme-grid">${themes.map(([id,name,icon])=>`<button data-theme="${id}" class="theme-option ${S.settings.theme===id?'active':''}"><i>${icon}</i><b>${name}</b><span></span></button>`).join('')}</div></div><div class="card"><h3>데이터 보호 및 내보내기</h3><div class="summary-lines"><p><span>앱 버전</span><b>${esc(googleInfo.appVersion||desktopInfo?.version||'웹 미리보기')}</b></p><p><span>로컬 백업</span><b>JSON 파일</b></p><p><span>저장 방식</span><b>${desktopInfo?'SQLite':'기기 저장소'}</b></p></div><div class="data-actions section-gap"><button class="pill" id="exportCsv">거래 CSV 내보내기</button><button class="pill" id="exportData">로컬 내보내기</button><button class="pill" id="importDataButton">로컬 가져오기</button></div></div></div>`
}

function more(){return header('전체 메뉴')+`<div class="mobile-more-grid"><button data-go="stocks"><i>▦</i><span><b>주식 관리</b><small>보유 종목·평가손익·수익률</small></span><em>›</em></button><button data-go="budget"><i>♜</i><span><b>예산 관리</b><small>카테고리별 한도와 사용액</small></span><em>›</em></button><button data-go="subscriptions"><i>⟳</i><span><b>정기 구독</b><small>월 구독료와 결제일 관리</small></span><em>›</em></button><button data-go="food"><i>▥</i><span><b>식비 분석</b><small>식비 기록과 소비 패턴</small></span><em>›</em></button><button data-go="assets"><i>⌂</i><span><b>자산 관리</b><small>카드·계좌·현금 관리</small></span><em>›</em></button><button data-go="settings"><i>⚙</i><span><b>설정</b><small>카테고리·테마·동기화</small></span><em>›</em></button></div>`}
const pages={dashboard,transactions,analysis:analysisPage,budget,subscriptions,food,assets,stocks,settings:settingsPage,more};
function render(){syncSubscriptions();ensureStocks();applyGoogleAutoPreference();const chosen=S.settings.theme||(S.settings.dark?'dark':'light'),resolved=chosen==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):chosen;document.documentElement.dataset.theme=resolved;document.documentElement.classList.toggle('dark',['dark','midnight'].includes(resolved));side();$('#app').dataset.page=page;$('#app').innerHTML=pages[page]();const secondary=['budget','subscriptions','food','assets','stocks','settings'];$$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page||(b.dataset.page==='more'&&secondary.includes(page))));bind();if(appReady)save()}
function bind(){
  $('#toggleRent')?.addEventListener('click',()=>{excludeRent=!excludeRent;render()});
  $('#googleSetupHelp')?.addEventListener('click',googleSetupDialog);
  $('#refreshGoogleBackups')?.addEventListener('click',()=>loadGoogleBackups());
  $$('[data-restore-backup]').forEach(button=>button.onclick=()=>confirmDialog({title:'Drive 백업 복원',message:'현재 기기의 데이터를 선택한 백업으로 교체합니다.',details:['복원 전에 현재 데이터를 로컬 파일로 내보내는 것을 권장합니다.'],confirmText:'복원',danger:true,onConfirm:async()=>{try{const file=googleBackups.find(x=>x.id===button.dataset.restoreBackup);await restoreGoogleBackupFile(file);toast('선택한 Drive 백업을 복원했습니다.')}catch(error){handleGoogleError(error)}}}));
  $$('[data-delete-backup]').forEach(button=>button.onclick=()=>confirmDialog({title:'Drive 백업 삭제',message:'선택한 백업을 Google Drive에서 삭제할까요?',details:['삭제한 백업은 앱에서 복구할 수 없습니다.'],confirmText:'삭제',danger:true,onConfirm:async()=>{try{await googleBridge().deleteBackup({fileId:button.dataset.deleteBackup});await loadGoogleBackups();toast('Drive 백업을 삭제했습니다.')}catch(error){handleGoogleError(error)}}}));
  const googleActions=$('.google-sync-card .data-actions');
  if(googleInfo.connected&&googleActions&&!$('#toggleGoogleAutoSync'))googleActions.insertAdjacentHTML('beforebegin',`<div class="manage-row auto-sync-row"><span><b>자동 Drive 동기화</b><small>처음에는 꺼져 있습니다. 켜면 변경사항을 올리고, 실행할 때 다른 기기의 최신 데이터를 받습니다.</small></span><button class="pill" id="toggleGoogleAutoSync">${S.settings.googleAutoSync===true?'켜짐':'꺼짐'}</button></div>`);
  $$('[data-page],[data-go]').forEach(b=>b.onclick=()=>{page=b.dataset.page||b.dataset.go;render();window.scrollTo(0,0)});
  $$('[data-month]').forEach(b=>b.onclick=()=>changeMonth(Number(b.dataset.month)));
  $$('[data-quick]').forEach(b=>b.onclick=()=>txModal(null,b.dataset.quick));
  $('#addTx')?.addEventListener('click',()=>txModal());
  $$('[data-edit-tx]').forEach(b=>b.onclick=()=>txModal(b.dataset.editTx));
  $('#app').onclick=e=>{const cell=e.target.closest('[data-inline-field]');if(cell&&!e.target.closest('input,select,button'))openInlineEditor(cell)};
  $$('[data-row-edit]').forEach(row=>{row.onclick=e=>{if(e.target.closest('button'))return;txModal(row.dataset.rowEdit)};row.onkeydown=e=>{if(e.key==='Enter')txModal(row.dataset.rowEdit)}});
  $$('[data-copy-tx]').forEach(b=>b.onclick=e=>{e.stopPropagation();const src=S.transactions.find(x=>x.id===b.dataset.copyTx);if(!src)return;const copy={...src,id:uid(),autoRef:undefined};S.transactions.push(copy);lastTransactionCategory[copy.type]={section:copy.section,item:copy.item};save();render();toast(`${copy.title} 거래를 복사했습니다.`)});
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
  $$('[data-food-category]').forEach(b=>b.onclick=()=>{foodCategoryFilter=b.dataset.foodCategory;render()});
  $$('[data-food-mode]').forEach(b=>b.onclick=()=>{foodMode=b.dataset.foodMode;render()});
  $('#saveFoodEntry')?.addEventListener('click',saveFoodEntry);
  $$('[data-food-consume]').forEach(b=>b.onclick=()=>foodConsumeModal(b.dataset.foodConsume));
  $$('[data-food-finish]').forEach(b=>b.onclick=()=>finishFoodModal(b.dataset.foodFinish));
  $$('[data-food-reopen]').forEach(b=>b.onclick=()=>reopenFood(b.dataset.foodReopen));
  $$('[data-food-edit]').forEach(b=>b.onclick=()=>foodEditModal(b.dataset.foodEdit));
  $$('[data-food-consumption-edit]').forEach(b=>b.onclick=()=>foodConsumptionEditModal(b.dataset.foodConsumptionEdit));
  $$('[data-food-delete]').forEach(b=>b.onclick=()=>{const p=foodPurchase(b.dataset.foodDelete);confirmDialog({title:'식품 기록 삭제',message:`${p?.name||'선택한 식품'}의 구매 기록을 삭제할까요?`,details:['연결된 먹은 기록도 함께 삭제됩니다.','일반 거래내역에는 영향이 없습니다.'],confirmText:'삭제',danger:true,onConfirm:()=>{S.foodPurchases=S.foodPurchases.filter(x=>x.id!==b.dataset.foodDelete);S.foodConsumptions=S.foodConsumptions.filter(x=>x.purchaseId!==b.dataset.foodDelete);render();toast('식품 기록을 삭제했습니다.')}})});
  $$('[data-food-consumption-delete]').forEach(b=>b.onclick=()=>deleteFoodConsumption(b.dataset.foodConsumptionDelete));
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
  $('#toggleGoogleAutoSync')?.addEventListener('click',async()=>{const enabled=!googleAutoEnabled();setGoogleAutoEnabled(enabled);render();toast(`자동 Drive 동기화를 ${enabled?'켰습니다.':'껐습니다.'}`);if(enabled){await loadGoogleBackups({rerender:false});const latest=googleBackups[0],last=Number(localStorage.getItem(GOOGLE_LAST_REMOTE_KEY)||0);if(latest&&(!last||backupTime(latest)>last))offerGoogleRestore(latest);else save()}});
  $('#googleLogin')?.addEventListener('click',async e=>{
    const button=e.currentTarget,bridge=googleBridge();
    if(!bridge?.googleLogin)return toast('이 설치본에는 Google 연동 기능이 없습니다. 최신 버전으로 업데이트하세요.');
    button.disabled=true;
    try{
      toast(window.financeOne?.isDesktop?'시스템 브라우저에서 Google 로그인을 완료하세요.':'Google 계정을 선택하고 Drive 접근을 허용하세요.');
      googleInfo=await bridge.googleLogin();
      setGoogleAutoEnabled(false);
      localStorage.removeItem(GOOGLE_LAST_REMOTE_KEY);
      localStorage.removeItem(GOOGLE_FIRST_CHECK_KEY);
      render();
      toast('Google 계정을 연결했습니다. 자동 Drive 백업은 꺼져 있습니다.');
      await loadGoogleBackups();
      if(googleBackups[0])offerGoogleRestore(googleBackups[0]);
    }catch(error){
      button.disabled=false;
      handleGoogleError(error);
    }
  });
  $('#googleUpload')?.addEventListener('click',async e=>{const button=e.currentTarget,bridge=googleBridge();button.disabled=true;toast('Google Drive에 저장 중입니다.');try{await save();const result=await bridge.googleUpload(S);const when=result?.lastBackupTime||new Date().toISOString();localStorage.setItem('financeone_google_last_upload',when);markRemoteSynced(when);googleInfo.lastBackupTime=when;button.disabled=false;await loadGoogleBackups();toast('현재 데이터를 Google Drive에 백업했습니다.')}catch(error){button.disabled=false;handleGoogleError(error)}});
  $('#googleDownload')?.addEventListener('click',e=>{const button=e.currentTarget,bridge=googleBridge();confirmDialog({title:'Drive 데이터 불러오기',message:'현재 기기의 데이터를 Google Drive 데이터로 교체합니다.',details:['현재 데이터는 먼저 Drive에 저장하거나 백업 파일로 보관하는 것을 권장합니다.'],confirmText:'불러오기',danger:true,onConfirm:async()=>{button.disabled=true;try{const result=await bridge.googleDownload();if(!validBackup(result.state))throw Error('Drive 백업 형식이 올바르지 않거나 손상되었습니다.');S=result.state;S.settings=S.settings||sample().settings;normalizeAssetPayments();normalizeTransactions();normalizeFoodData();await save();render();toast('Google Drive 데이터를 불러왔습니다.')}catch(error){button.disabled=false;handleGoogleError(error)}}})});
  $('#googleDisconnect')?.addEventListener('click',e=>{const button=e.currentTarget,bridge=googleBridge();confirmDialog({title:'Google 연결 해제',message:'Google 계정 연결을 해제할까요?',details:['Drive에 저장된 FinanceOne 데이터는 삭제되지 않습니다.'],confirmText:'연결 해제',danger:true,onConfirm:async()=>{button.disabled=true;try{googleInfo=await bridge.googleDisconnect();googleBackups=[];render();toast('Google 연결을 해제했습니다.')}catch(error){button.disabled=false;handleGoogleError(error)}}})});
  $('#exportCsv')?.addEventListener('click',exportCsv);
  $$('#exportData').forEach(button=>button.addEventListener('click',exportData));$('#importData')?.addEventListener('change',importData);$$('#importDataButton').forEach(button=>button.addEventListener('click',()=>{const bridge=googleBridge();if(bridge?.importBackup)importData();else $('#importData')?.click();}));
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
  const x=existing||{id:uid(),date:transactionDateForNew(),type,area:type,section:defaultSection,item:defaultItem,title:'',amount:0,originalAmount:0,splitCount:1,paymentId:firstAsset,accountId:firstAsset,memo:''};
  const shownAmount=Math.abs(Number(x.originalAmount)||Number(x.amount)||0),shownSplit=Math.max(1,Math.trunc(Number(x.splitCount)||1));
  $('#modal').innerHTML=modal(id?'거래 수정':'거래 추가',`<div class="modal-grid tx-modal-grid"><div class="field"><label>구분</label><select id="txType" ${id?'disabled':''}>${selectOptions(['지출','수입','이체'],x.type)}</select>${id?'<small class="field-help">구분은 수정할 수 없습니다.</small>':''}</div><div class="field"><label>날짜</label><input id="txDate" type="date" value="${x.date}"></div><div class="field wide"><label>분류</label><div class="triple tx-category-chain">${categorySelects('tx',x.area,x.section,x.item)}</div><small class="field-help">구분에 맞는 중분류·소분류를 선택하세요.</small></div><div class="field wide"><label>내용</label><input id="txTitle" value="${esc(x.title)}"></div><div class="field"><label>전체 금액</label><input id="txAmount" inputmode="numeric" value="${shownAmount||''}"></div><div class="field"><label>N빵 인원</label><input id="txSplitCount" type="number" min="1" step="1" value="${shownSplit}"><small class="field-help">기본 1명 · 정수만 입력 · 나눈 뒤 소수점은 버립니다.</small></div><div class="field"><label>자산</label><select id="txAssetUnified">${selectOptions(accounts,selectedAsset,a=>`${a.paymentIcon||'⌂'} ${a.name}`)}</select><small class="field-help">거래에 사용할 자산입니다. 자산 반영을 켠 자산은 잔액도 같이 반영됩니다.</small></div><div class="field wide"><label>메모</label><input id="txMemo" value="${esc(x.memo)}"></div></div>${id?`<div class="tx-modal-danger"><button class="pill danger" id="deleteTxInModal">이 거래 삭제</button><small>삭제하면 복구할 수 없습니다.</small></div>`:''}`);
  modalBase();
  if(id&&$('#deleteTxInModal'))$('#deleteTxInModal').onclick=()=>confirmDialog({title:'거래 삭제',message:`${x.title||'이 거래'}을(를) 삭제할까요?`,details:[`${x.date} · ${money(Math.abs(x.amount))}`],confirmText:'삭제',danger:true,onConfirm:()=>{S.transactions=S.transactions.filter(v=>v.id!==id);closeSubmodal();closeModal();render();toast('거래를 삭제했습니다.')}});
  $('#txType').onchange=()=>{const t=$('#txType').value,remembered=lastTransactionCategory[t]||{};$('#txArea').value=t;updateChain('tx');if(sections(t).includes(remembered.section)){$('#txSection').value=remembered.section;updateChain('tx');if(items(t,remembered.section).some(v=>v.item===remembered.item))$('#txItem').value=remembered.item}};
  $('#txSplitCount').oninput=()=>{const v=Math.trunc(Number($('#txSplitCount').value)||1);$('#txSplitCount').value=Math.max(1,v)};
  $('#saveModal').onclick=()=>{const originalAmount=Math.abs(num($('#txAmount').value)),splitCount=Math.max(1,Math.trunc(Number($('#txSplitCount').value)||1)),amount=Math.floor(originalAmount/splitCount),kind=id?x.type:$('#txType').value,date=$('#txDate').value,title=$('#txTitle').value.trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return toast('거래 날짜를 입력하세요.');if(!title||!originalAmount)return toast('내용과 금액을 입력하세요.');if(!amount)return toast('N빵 후 금액이 1원 이상이어야 합니다.');let section=$('#txSection').value,item=$('#txItem').value;const area=kind;const assetId=$('#txAssetUnified').value;const c=cat(area,section,item);const signed=kind==='수입'?Math.abs(amount):-Math.abs(amount);const n={...x,date,type:kind,area,section,item,title,amount:signed,originalAmount,splitCount,paymentId:assetId,accountId:assetId,memo:$('#txMemo').value,icon:c.icon};if(id)S.transactions[S.transactions.findIndex(v=>v.id===id)]=n;else{S.transactions.push(n);rememberTransactionDate(date)}lastTransactionCategory[kind]={section,item};selectedMonth=date.slice(0,7);txFilter='전체';page='transactions';closeModal();render();toast(splitCount>1?`${splitCount}N빵으로 ${money(amount)}을 반영했습니다.`:'거래를 저장했습니다.')}
}
function dayModal(day){const key=`${selectedMonth}-${pad(day)}`,list=S.transactions.filter(x=>x.date===key);$('#modal').innerHTML=modal(`${Number(selectedMonth.slice(5))}월 ${day}일 거래`,list.length?list.map(txLine).join(''):empty('이 날짜의 거래가 없습니다.'),'거래 추가');modalBase();$('#saveModal').onclick=()=>{closeModal();rememberTransactionDate(key);txModal(null,'지출')}}
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
function validBackup(n){return n&&typeof n==='object'&&!Array.isArray(n)&&['categories','payments','accounts','transactions','budgets','subscriptions'].every(k=>Array.isArray(n[k]))&&(n.stocks==null||Array.isArray(n.stocks))&&(n.foodPurchases==null||Array.isArray(n.foodPurchases))&&(n.foodConsumptions==null||Array.isArray(n.foodConsumptions))&&n.transactions.length<=100000&&n.categories.length<=10000&&n.transactions.every(x=>typeof x.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(Number(x.amount)))}
async function importData(e){const bridge=googleBridge();if(bridge?.importBackup&&!e?.target?.files?.[0]){try{const result=await bridge.importBackup();if(result?.canceled)return;const n=result.state;if(!validBackup(n))throw Error('형식이 올바르지 않거나 손상된 백업입니다.');confirmDialog({title:'백업 데이터 복원',message:'현재 데이터를 선택한 백업 파일로 교체합니다.',details:[result.fileName||result.filePath||'FinanceOneBackup.json','현재 데이터가 필요하면 먼저 백업 파일로 저장하세요.'],confirmText:'복원',danger:true,onConfirm:async()=>{S=n;S.settings=S.settings||sample().settings;normalizeAssetPayments();normalizeTransactions();normalizeFoodData();await save();render();toast('백업을 복원했습니다.')}})}catch(error){toast(String(error.message||error))}return}const f=e?.target?.files?.[0];if(!f)return;if(f.size>10*1024*1024)return toast('10MB 이하 백업 파일만 복원할 수 있습니다.');const r=new FileReader();r.onload=()=>{try{const n=JSON.parse(r.result);if(!validBackup(n))throw Error();confirmDialog({title:'백업 데이터 복원',message:'현재 데이터를 선택한 백업 파일로 교체합니다.',details:[f.name,'현재 데이터가 필요하면 먼저 백업 파일로 저장하세요.'],confirmText:'복원',danger:true,onConfirm:async()=>{S=n;S.settings=S.settings||sample().settings;normalizeAssetPayments();normalizeTransactions();normalizeFoodData();await save();render();toast('백업을 복원했습니다.')}})}catch{toast('형식이 올바르지 않거나 손상된 백업입니다.')}};r.readAsText(f)}


async function initialize(){
  try{
    if(window.financeOne?.isDesktop){
      const stored=await window.financeOne.load();
      desktopInfo=await window.financeOne.info();
      googleInfo=await window.financeOne.googleStatus();
      const legacy=JSON.parse(localStorage.getItem('financeone_v5')||'null');
      S=stored||legacy||sample();
      hadLocalData=!!(stored||legacy);
      normalizeAssetPayments();normalizeTransactions();normalizeFoodData();
    }else{
      const stored=JSON.parse(localStorage.getItem('financeone_v5')||'null');
      S=stored||sample();
      hadLocalData=!!stored;
      normalizeAssetPayments();normalizeTransactions();normalizeFoodData();
      const bridge=googleBridge();
      if(bridge?.googleStatus)googleInfo=await bridge.googleStatus();
    }
  }catch(error){
    console.error(error);
    S=sample();
  }
  if(localStorage.getItem(GOOGLE_AUTO_KEY)==null)localStorage.setItem(GOOGLE_AUTO_KEY,hadLocalData&&S.settings?.googleAutoSync===true?'1':'0');
  applyGoogleAutoPreference();
  if(googleInfo.connected)await loadGoogleBackups({rerender:false});
  render();
  appReady=true;
  await checkGoogleRemoteOnStart();
}

initialize();
