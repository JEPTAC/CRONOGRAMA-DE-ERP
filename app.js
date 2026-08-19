(function(){
'use strict';

const PROJECT_START='2026-08-19';
const PROJECT_KEY=(window.QA_FIREBASE_SETTINGS&&window.QA_FIREBASE_SETTINGS.projectKey)||'erp-launch-2026';
const PRIVATE_COLLECTION=(window.QA_FIREBASE_SETTINGS&&window.QA_FIREBASE_SETTINGS.privateCollection)||'erpQaTracker';
const PUBLIC_COLLECTION=(window.QA_FIREBASE_SETTINGS&&window.QA_FIREBASE_SETTINGS.publicCollection)||'erpQaPublic';
const USERS_COLLECTION=(window.QA_FIREBASE_SETTINGS&&window.QA_FIREBASE_SETTINGS.usersCollection)||'users';
const LOCAL_KEY='ei-erp-qa-tracker-2026-v1';
const DAILY_MIN=420; // 7 h efectivas planificadas por día.
const PAGE_SIZE=24;
const EXECUTIVE_MODE=new URLSearchParams(location.search).get('executive')==='1';

// Festivos nacionales de Colombia 2026. El rango base del proyecto no cruza festivos
// entre 19-ago y 11-sep; esta lista permite recalcular si el plan se extiende.
const HOLIDAYS_2026=new Set([
 '2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03','2026-05-01',
 '2026-05-18','2026-06-08','2026-06-15','2026-06-29','2026-07-20','2026-08-07',
 '2026-08-17','2026-10-12','2026-11-02','2026-11-16','2026-12-08','2026-12-25'
]);

const TASK_BLUEPRINT=[
 ['Preparación','Línea base y ambiente QA','Congelar alcance de la versión, respaldos, datos de prueba, evidencias y criterios Go/No-Go.',210,0],
 ['Preparación','Autenticación, perfiles y permisos','Correo/contraseña, Google, usuario inactivo/sin perfil, cierre de sesión y permisos por rol.',210,6],

 ['PVE','PVE · creación, necesidad y Compras','Compra requerida/no requerida, materiales, variantes, cantidades y liberación desde Compras.',210,8],
 ['PVE','PVE · Recepción y parciales','Recepción de mercancía completa/parcial, lotes, stickers, saldos y reintentos.',210,8],
 ['PVE','PVE · Alistamiento, Corte y facturación','Encontrado/no encontrado, Corte sí/no, retorno, evidencia y gate de facturación.',210,8],
 ['PVE','PVE · rutas, novedades y cierre E2E','Entrega en punto, recoge, local, nacional; novedades y cierre sin duplicidad.',210,8],

 ['PVC','PVC · regla financiera y Cartera','Con mora/sin mora, CREDIT/MIXED, envío o bypass de Cartera y decisión financiera.',210,8],
 ['PVC','PVC · Recepción y Alistamiento','Documentación, recepción, encontrado/no encontrado, parciales y responsables.',210,8],
 ['PVC','PVC · Corte y Facturación','Corte sí/no, pendientes, evidencia, devolución y facturación.',210,8],
 ['PVC','PVC · despacho, novedades y cierre','Cuatro rutas, cancelación, novedad, reanudación y cierre E2E.',210,8],

 ['PVP','PVP · condición financiera y anexo','Mora/sin mora, anexo correcto/faltante/incorrecto y gates de Cartera.',210,8],
 ['PVP','PVP · Recepción y Alistamiento','Validaciones documentales, parciales y no encontrado.',210,8],
 ['PVP','PVP · Corte y Facturación','Corte sí/no, evidencia y bloqueo cuando falten requisitos.',210,8],
 ['PVP','PVP · despacho, novedad y cierre','Cuatro rutas, anexos, novedad y cierre de trazabilidad.',210,8],

 ['PVN','PVN · Caja y liberación inicial','Retenido/no retenido, condición de Caja, datos obligatorios y liberación.',210,4],
 ['PVN','PVN · Recepción y Alistamiento','Recepción documental, alistamiento y parciales.',210,4],
 ['PVN','PVN · factura, Corte y Caja','Factura, Corte si aplica, reintentos y consistencia del estado.',210,4],
 ['PVN','PVN · despacho y cierre','Cuatro rutas, evidencia y cierre completo.',210,4],

 ['Excepciones','Novedades por módulo','Documento faltante, dato incorrecto, no encontrado, espera y devoluciones.',210,10],
 ['Excepciones','Aprobaciones y cancelación','Aprobar/rechazar reportes, cancelación, notas obligatorias y retorno de flujo.',210,6],
 ['Excepciones','SLA, Centro de Excepciones y reportes','Escalamiento, vencimiento, responsable, resolución y auditoría.',210,2],
 ['Integridad','Idempotencia y concurrencia','Doble clic, reintento, flowRevision y dos usuarios sobre la misma tarea/pedido.',210,3],

 ['Corte / Inventario','Corte extremo y multi-carreto','Referencias compartidas, múltiples carretos, cantidad real, merma y foto final.',210,3],
 ['Corte / Inventario','Inventario, lotes y maestro','Lotes, movimientos, ATP/MRP y compatibilidad de materiales/históricos.',210,2],

 ['Despachos','Rutas y documentación de despacho','Entrega en punto, recoge, local y nacional; guía, transportadora y foto.',210,2],
 ['Despachos','Direcciones y permisos','DIVIPOLA, urbano/rural/lugar conocido, coordenadas y permiso de cierre.',210,2],

 ['Calendario','Calendario y Workforce','Semanal/mensual, asignación futura, auto-reporte, aprobaciones, catálogo y vencimientos.',210,2],
 ['Calendario','VSM, tiempos y dashboard','Jornada hábil, tiempo no trazabilizado, filtros, indicadores y consistencia temporal.',210,1],

 ['Seguridad','Seguridad y perfiles reales','Roles, lecturas/escrituras autorizadas, cambio de rol y aislamiento de datos.',210,1],
 ['Seguridad','Drive, red y recuperación','Carga/reintento de evidencia, red intermitente, refresco, sesión y offline básico.',210,2],

 ['UX / Responsive','Responsive y navegadores','390 px, portátil, escritorio, iPhone/iPad/Android, zoom y teclado.',210,1],
 ['UX / Responsive','Búsqueda, filtros y consistencia UI','Búsqueda global, filtros, popups, tablas, estados y navegación.',210,1],

 ['Corrección','Correcciones críticas y altas','Intervenir defectos bloqueantes/altos, revisar impactos cruzados y dejar build candidata.',210,0],
 ['Corrección','Re-pruebas y regresión dirigida','Repetir casos fallidos y rutas afectadas; verificar que no se reintroduzcan errores.',210,0],

 ['Cierre','Regresión E2E final','Muestreo crítico PVE/PVC/PVP/PVN, excepciones, Corte, despacho, seguridad y concurrencia.',210,0],
 ['Cierre','Go/No-Go y cierre ejecutivo','Consolidar evidencia, defectos, cobertura, riesgos, rollback y recomendación de lanzamiento.',210,0]
].map((x,i)=>({id:'T'+String(i+1).padStart(2,'0'),phase:x[0],title:x[1],scope:x[2],durationMin:x[3],scenarioCount:x[4]}));

const EXTRA_SCENARIOS=[
 ['Crítica','Todos','Autenticación','Usuario sin perfil','Acceso bloqueado y mensaje controlado.'],
 ['Alta','Todos','Autenticación','Usuario inactivo','Acceso bloqueado.'],
 ['Alta','Todos','Autenticación','Sesión local/temporal','Persistencia según selección.'],
 ['Alta','Todos','Autenticación','Cerrar sesión','Sesión terminada y retorno seguro.'],
 ['Alta','Todos','Roles','Ruta no autorizada','Usuario no puede ejecutar acción fuera de su rol.'],
 ['Alta','Todos','Roles','Cambio de usuario/rol','No conserva privilegios del perfil anterior.'],

 ['Crítica','Todos','Recepción','Documento obligatorio ausente','No permite confirmar y conserva datos para corregir.'],
 ['Alta','Todos','Recepción','Documento incorrecto / reasignación','La corrección queda persistida y trazada.'],
 ['Alta','Todos','Alistamiento','Ítem no encontrado con motivo','Motivo obligatorio; conserva pendiente.'],
 ['Alta','Todos','Alistamiento','Pedido parcial','No cierra líneas pendientes y diferencia tiempos.'],
 ['Crítica','Todos','Corte','Corte pendiente','Facturación permanece bloqueada.'],
 ['Alta','Todos','Corte','Foto final ausente','No finaliza ejecución sin evidencia.'],
 ['Alta','Todos','Corte','Cantidad real distinta','Diferencia/merma queda registrada.'],
 ['Alta','Todos','Despacho','Guía/transportadora faltante','Ruta nacional no puede cerrar.'],
 ['Alta','Todos','Despacho','Foto vehículo ausente','Cierre bloqueado hasta adjuntar evidencia.'],
 ['Alta','Todos','Despacho','Permiso de entrega no autorizado','Usuario no autorizado no puede cerrar.'],

 ['Alta','Todos','Aprobaciones','Cancelar pedido aprobado','Solo rol autorizado decide y nota queda auditada.'],
 ['Alta','Todos','Aprobaciones','Cancelar pedido rechazado','Pedido retorna al estado correcto.'],
 ['Alta','Todos','Reportes','Reporte aprobado','Estado y evidencia quedan consistentes.'],
 ['Alta','Todos','Reportes','Reporte rechazado','Motivo y responsable quedan visibles.'],
 ['Alta','Todos','Novedades','SLA vencido','Escala y conserva responsable/tiempo.'],
 ['Alta','Todos','Novedades','Resolución de novedad','Retorna al punto correcto del flujo.'],

 ['Crítica','Todos','Integridad','Doble clic / reintento','No duplica eventos, lotes, facturas ni movimientos.'],
 ['Crítica','Todos','Integridad','Conflicto flowRevision','Rechaza versión obsoleta sin sobrescribir.'],
 ['Alta','Todos','Integridad','Dos auxiliares misma tarea','Bloqueo de tarea y sesiones independientes.'],

 ['Alta','Todos','Corte','Multi-carreto','Cantidades, lotes y merma coherentes.'],
 ['Alta','Todos','Corte','Referencia compartida','Agrupa sin mezclar cantidades/destinos.'],
 ['Alta','Todos','Inventario','Lote correcto','Lote consumido coincide con registro físico.'],
 ['Alta','Todos','Inventario','ATP/MRP','No genera negativos o inconsistencias.'],
 ['Alta','Todos','Maestro','Material histórico/tolerancia','Históricos no rompen el flujo.'],

 ['Alta','Todos','Despacho','Dirección urbana','DIVIPOLA válida y editable.'],
 ['Alta','Todos','Despacho','Dirección rural','No exige nomenclatura urbana incompatible.'],
 ['Alta','Todos','Despacho','Lugar conocido','Persistencia e identificación suficientes.'],
 ['Alta','Todos','Despacho','Cuatro rutas','Cada ruta aplica solo sus requisitos.'],

 ['Alta','Todos','Calendario','Asignación futura','Actividad aparece en fecha/usuario correctos.'],
 ['Alta','Todos','Workforce','Actividad auto-reportada','Pide aprobación cuando corresponde.'],
 ['Alta','Todos','VSM','Tiempo hábil','Excluye almuerzo, fin de semana y festivos.'],

 ['Crítica','Todos','Seguridad','Lectura/escritura no autorizada','Servidor rechaza acceso fuera del rol.'],
 ['Alta','Todos','Drive','Fallo / red intermitente','Reintento controlado sin duplicidad.'],
 ['Alta','Todos','Sesión','Refresco / renovación','Recupera estado sin pantalla blanca ni pérdida.'],

 ['Alta','Todos','Responsive','390 px / móvil','Sin desbordes y controles utilizables.'],
 ['Media','Todos','UI','Escritorio / filtros / popups','Jerarquía, tablas y navegación consistentes.'],

 ['Alta','Todos','PWA','Offline básico y reconexión','Informa estado y recupera datos al volver conexión.'],
 ['Crítica','Todos','E2E','Regresión rutas críticas','PVE/PVC/PVP/PVN completan ruta representativa sin bloqueantes.']
];

function pad(n){return String(n).padStart(2,'0')}
function iso(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function parseISO(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12,0,0)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function isBusinessDay(d){const dow=d.getDay();return dow!==0&&dow!==6&&!HOLIDAYS_2026.has(iso(d))}
function businessDaysFrom(start,count){let d=parseISO(start),arr=[];while(arr.length<count){if(isBusinessDay(d))arr.push(iso(d));d=addDays(d,1)}return arr}
const WORK_DAYS=businessDaysFrom(PROJECT_START,18);

function formatDate(s,short=false){const d=parseISO(s);return new Intl.DateTimeFormat('es-CO',short?{day:'2-digit',month:'short'}:{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function minutesLabel(m){const h=Math.floor(m/60),min=m%60;return min?`${h} h ${min} min`:`${h} h`}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function nowCO(){return new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date())}
function todayISO(){const p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Bogota'}).formatToParts(new Date());const o={};p.forEach(x=>o[x.type]=x.value);return `${o.year}-${o.month}-${o.day}`}

function scheduleTasks(tasks){
 const out=[];let dayIndex=0,used=0;
 for(const task of tasks){
   if(used+task.durationMin>DAILY_MIN){dayIndex++;used=0}
   const date=WORK_DAYS[dayIndex];
   out.push({...task,date,dayIndex,slot:used===0?'07:00–10:30':'10:30–12:00 · 13:40–15:40'});
   used+=task.durationMin;
   if(used>=DAILY_MIN){dayIndex++;used=0}
 }
 return out;
}
const PLANNED_TASKS=scheduleTasks(TASK_BLUEPRINT);

function buildScenarios(){
 let n=1,rows=[];const routes=['ENTREGA EN PUNTO','CLIENTE RECOGE','DESPACHO LOCAL','DESPACHO NACIONAL'];
 const add=(priority,type,variant,route,expected,group)=>rows.push({id:`QA-${String(n++).padStart(3,'0')}`,priority,type,variant,route,expected,group,status:'pending',note:'',ticket:''});
 for(const purchase of ['Compra requerida','Compra no requerida'])for(const receipt of ['Recepción completa','Recepción parcial'])for(const cut of ['Corte sí','Corte no'])for(const route of routes)
   add('Alta','PVE',`${purchase} · ${receipt} · ${cut}`,route,'Compras/recepción/corte/salida coherentes; parciales no cierran con saldo.','PVE');
 for(const mora of ['Con mora','Sin mora'])for(const pay of ['CREDIT','MIXED'])for(const cut of ['Corte sí','Corte no'])for(const route of routes)
   add('Alta','PVC',`${mora} · ${pay} · ${cut}`,route,'Cartera interviene solo cuando corresponde y se respetan todos los gates.','PVC');
 for(const mora of ['Con mora','Sin mora'])for(const annex of ['Anexo PVP correcto','Anexo PVP faltante/incorrecto'])for(const cut of ['Corte sí','Corte no'])for(const route of routes)
   add('Alta','PVP',`${mora} · ${annex} · ${cut}`,route,'Anexo/condición financiera se valida; faltantes bloquean o generan novedad.','PVP');
 for(const retained of ['Retenido por Caja','No retenido inicialmente'])for(const cut of ['Corte sí','Corte no'])for(const route of routes)
   add('Alta','PVN',`${retained} · ${cut}`,route,'Caja interviene según condición; factura y evidencias quedan asociadas.','PVN');
 EXTRA_SCENARIOS.forEach(x=>add(x[0],x[1],`${x[2]} · ${x[3]}`,'Según escenario',x[4],x[2]));
 return rows;
}
const BASE_SCENARIOS=buildScenarios();
if(BASE_SCENARIOS.length!==156)console.warn('Matriz esperada 156, actual:',BASE_SCENARIOS.length);

function scenarioDate(s){
 const g=s.group;
 if(g==='PVE')return WORK_DAYS[s.id.endsWith('001')?1: Number(s.id.slice(3))<=16?1:2];
 if(g==='PVC')return WORK_DAYS[Number(s.id.slice(3))<=48?3:4];
 if(g==='PVP')return WORK_DAYS[Number(s.id.slice(3))<=80?5:6];
 if(g==='PVN')return WORK_DAYS[Number(s.id.slice(3))<=104?7:8];
 const map={
  'Autenticación':0,'Roles':0,'Recepción':9,'Alistamiento':9,'Aprobaciones':9,'Reportes':10,'Novedades':10,
  'Integridad':10,'Corte':11,'Inventario':11,'Maestro':11,'Despacho':12,'Calendario':13,'Workforce':13,'VSM':13,
  'Seguridad':14,'Drive':14,'Sesión':14,'Responsive':15,'UI':15,'PWA':14,'E2E':17
 };
 return WORK_DAYS[map[g]??15];
}
BASE_SCENARIOS.forEach(s=>s.plannedDate=scenarioDate(s));

function seedState(){
 return {
  version:1,
  title:'Plan Maestro QA · ERP Trazabilidad Logística',
  startDate:PROJECT_START,
  targetDate:WORK_DAYS[WORK_DAYS.length-1],
  dailyMinutes:DAILY_MIN,
  taskState:Object.fromEntries(PLANNED_TASKS.map(t=>[t.id,{status:'pending',note:'',evidence:'',actualMinutes:0}])),
  scenarioState:Object.fromEntries(BASE_SCENARIOS.map(s=>[s.id,{status:'pending',note:'',ticket:''}])),
  defects:[],
  updatedAt:null,
  updatedBy:null
 };
}
let state=seedState();
let db=null,auth=null,currentUser=null,currentProfile=null,remoteReady=false,saveTimer=null,page=1;

const $=id=>document.getElementById(id);
function firebaseConfigPresent(){const c=window.QA_FIREBASE_CONFIG||{};return !!(c.apiKey&&c.projectId&&c.authDomain)}
function configuredFirebase(){return firebaseConfigPresent()&&!!(window.firebase&&firebase.initializeApp)}
function loadScript(src){return new Promise((resolve,reject)=>{const x=document.createElement('script');x.src=src;x.async=false;x.onload=resolve;x.onerror=()=>reject(new Error('No se pudo cargar '+src));document.head.appendChild(x)})}
async function loadFirebaseSdk(){
 if(!firebaseConfigPresent())return false;
 if(window.firebase&&firebase.initializeApp)return true;
 const base='https://www.gstatic.com/firebasejs/12.17.0/';
 await loadScript(base+'firebase-app-compat.js');
 await loadScript(base+'firebase-auth-compat.js');
 await loadScript(base+'firebase-firestore-compat.js');
 return !!(window.firebase&&firebase.initializeApp);
}
function setConnection(kind,label){$('connectionDot').className='dot '+kind;$('connectionLabel').textContent=label}
function saveLocal(){localStorage.setItem(LOCAL_KEY,JSON.stringify(state));$('lastUpdate').textContent=state.updatedAt||'guardado local'}
function loadLocal(){try{const raw=localStorage.getItem(LOCAL_KEY);if(raw)state=mergeState(JSON.parse(raw));}catch(e){console.warn(e)}}
function mergeState(remote){const base=seedState();return {...base,...remote,taskState:{...base.taskState,...(remote.taskState||{})},scenarioState:{...base.scenarioState,...(remote.scenarioState||{})},defects:Array.isArray(remote.defects)?remote.defects:[]}}

async function initFirebase(){
 if(!firebaseConfigPresent()){setConnection('local','Modo local · Firebase pendiente');return}
 try{
   await loadFirebaseSdk();
   if(!configuredFirebase())throw new Error('SDK Firebase incompleto');
   if(!firebase.apps.length)firebase.initializeApp(window.QA_FIREBASE_CONFIG);
   auth=firebase.auth();db=firebase.firestore();
   setConnection('online','Firebase disponible');
   if(EXECUTIVE_MODE){await loadPublicSnapshot();listenPublic();}
   auth.onAuthStateChanged(async user=>{
     currentUser=user||null;currentProfile=null;
     if(user){
       $('userPill').textContent=user.email||'Usuario autenticado';
       try{const p=await db.collection(USERS_COLLECTION).doc(user.uid).get();if(p.exists)currentProfile=p.data()}catch(e){console.warn('Perfil no disponible',e)}
       if(!EXECUTIVE_MODE){await loadPrivateState();listenPrivate();}
     }else{
       $('userPill').textContent='Sin sesión Firebase';
       if(!EXECUTIVE_MODE)setConnection('online','Firebase · inicia sesión para sincronizar');
     }
     applyPermissions();renderAll();
   });
 }catch(e){console.error(e);setConnection('error','Firebase no conectado');}
}
async function loadPrivateState(){
 if(!db||!currentUser)return;
 try{const snap=await db.collection(PRIVATE_COLLECTION).doc(PROJECT_KEY).get();if(snap.exists)state=mergeState(snap.data());remoteReady=true;setConnection('online','Firebase sincronizado');saveLocal();}
 catch(e){console.error(e);setConnection('error','Sin permiso de lectura');}
}
function listenPrivate(){
 if(!db||!currentUser)return;
 db.collection(PRIVATE_COLLECTION).doc(PROJECT_KEY).onSnapshot(s=>{if(s.exists&&remoteReady){state=mergeState(s.data());saveLocal();renderAll();}},e=>console.warn('snapshot privado',e));
}
async function loadPublicSnapshot(){
 if(!db)return;
 try{const snap=await db.collection(PUBLIC_COLLECTION).doc(PROJECT_KEY).get();if(snap.exists)applyPublic(snap.data());}
 catch(e){console.warn('Resumen público no disponible',e)}
}
function listenPublic(){
 if(!db)return;
 db.collection(PUBLIC_COLLECTION).doc(PROJECT_KEY).onSnapshot(s=>{if(s.exists){applyPublic(s.data());renderAll();}},e=>console.warn(e));
}
function applyPublic(pub){
 if(pub.taskState)state.taskState={...state.taskState,...pub.taskState};
 if(pub.scenarioSummary){
   // La vista pública no necesita el detalle de cada caso. Conservar matriz base local.
   state.publicScenarioSummary=pub.scenarioSummary;
 }
 state.publicCriticalOpen=pub.criticalOpen??state.publicCriticalOpen;
 state.updatedAt=pub.updatedAt||state.updatedAt;
 state.targetDate=pub.targetDate||state.targetDate;
}
function publicPayload(){
 const ss=summaryScenarioCounts();
 const safeTaskState={};Object.entries(state.taskState).forEach(([id,v])=>safeTaskState[id]={status:v.status||'pending',actualMinutes:Number(v.actualMinutes||0)});
 return {projectKey:PROJECT_KEY,title:state.title,startDate:state.startDate,targetDate:state.targetDate,plannedHours:126,scenarioSummary:ss,criticalOpen:criticalOpen(),taskState:safeTaskState,updatedAt:state.updatedAt,updatedBy:state.updatedBy||null};
}
async function persistRemote(){
 if(EXECUTIVE_MODE||!db||!currentUser)return false;
 const payload={...state,updatedAt:nowCO(),updatedBy:currentUser.email||currentUser.uid};
 state.updatedAt=payload.updatedAt;state.updatedBy=payload.updatedBy;
 try{
   await db.collection(PRIVATE_COLLECTION).doc(PROJECT_KEY).set(payload,{merge:true});
   if(window.QA_FIREBASE_SETTINGS?.publicExecutiveSnapshot!==false)await db.collection(PUBLIC_COLLECTION).doc(PROJECT_KEY).set(publicPayload(),{merge:true});
   remoteReady=true;setConnection('online','Firebase sincronizado');saveLocal();return true;
 }catch(e){console.error(e);setConnection('error','No se pudo guardar en Firebase');return false}
}
function queueSave(){state.updatedAt=nowCO();saveLocal();clearTimeout(saveTimer);saveTimer=setTimeout(()=>persistRemote(),900);renderAll()}

function applyPermissions(){
 document.body.classList.toggle('executive-mode',EXECUTIVE_MODE);
 document.querySelectorAll('.editor-only').forEach(el=>el.classList.toggle('hidden',EXECUTIVE_MODE));
 $('saveBtn').classList.toggle('hidden',EXECUTIVE_MODE);
 $('loginBtn').classList.toggle('hidden',EXECUTIVE_MODE);
 if(EXECUTIVE_MODE){$('modeNote').innerHTML='<b>Vista para seguimiento superior:</b> muestra únicamente alcance, avance, cronograma y riesgos. No expone notas internas, tickets, pedidos, clientes ni evidencias operativas.';}
}

function taskStatus(id){return state.taskState[id]?.status||'pending'}
function scenarioStatus(id){return state.scenarioState[id]?.status||'pending'}
function statusLabel(v){return ({pending:'Pendiente',in_progress:'En curso',done:'Completado',approved:'Aprobado',failed:'Fallido',retest:'Re-prueba',blocked:'Bloqueado'}[v]||v)}
function statusClass(v){return ['done','approved'].includes(v)?'done':v}
function scenarioMerged(s){return {...s,...(state.scenarioState[s.id]||{})}}
function summaryScenarioCounts(){
 const obj={total:BASE_SCENARIOS.length,approved:0,failed:0,blocked:0,in_progress:0,retest:0,pending:0};
 BASE_SCENARIOS.forEach(s=>{const v=scenarioStatus(s.id);obj[v]=(obj[v]||0)+1});return obj;
}
function criticalOpen(){return state.defects.filter(d=>d.severity==='Crítica'&&d.status!=='Cerrado').length}
function streamStats(){
 const streams=['PVE','PVC','PVP','PVN','Transversal'];const out={};streams.forEach(x=>out[x]={total:0,ok:0});
 BASE_SCENARIOS.forEach(s=>{const key=['PVE','PVC','PVP','PVN'].includes(s.type)?s.type:'Transversal';out[key].total++;if(scenarioStatus(s.id)==='approved')out[key].ok++});return out;
}
function progressPercent(){
 if(EXECUTIVE_MODE&&state.publicScenarioSummary)return Math.round((state.publicScenarioSummary.approved||0)/(state.publicScenarioSummary.total||156)*100);
 const s=summaryScenarioCounts();return Math.round(s.approved/s.total*100);
}

function renderAll(){renderKPIs();renderProgress();renderRisks();renderTimeline();renderGantt();renderMatrix();renderDefects();$('lastUpdate').textContent=state.updatedAt||'sin guardar';}
function renderKPIs(){
 const p=progressPercent(),summary=EXECUTIVE_MODE&&state.publicScenarioSummary?state.publicScenarioSummary:summaryScenarioCounts();
 $('kpiProgress').textContent=p+'%';$('kpiCases').textContent=summary.total||156;$('kpiHours').textContent='126';
 $('kpiCritical').textContent=EXECUTIVE_MODE?(state.publicCriticalOpen??0):criticalOpen();
 const dt=state.targetDate||WORK_DAYS[17];$('kpiDate').textContent=formatDate(dt,true);$('heroTarget').textContent=formatDate(dt,true)+' 2026';
 $('progressRing').style.setProperty('--p',p);$('ringValue').textContent=p+'%';
}
function renderProgress(){
 const stats=streamStats();$('streamProgress').innerHTML=Object.entries(stats).map(([k,v])=>{const p=v.total?Math.round(v.ok/v.total*100):0;return `<div class="mini-row"><span>${k}</span><div class="bar"><i style="width:${p}%"></i></div><strong>${p}%</strong></div>`}).join('');
}
function renderRisks(){
 const summary=summaryScenarioCounts();const crit=EXECUTIVE_MODE?(state.publicCriticalOpen??0):criticalOpen();
 const arr=[
  ['critical','Bloqueantes abiertos','Defectos críticos sin cierre',crit],
  ['', 'Escenarios fallidos','Requieren corrección o decisión',summary.failed||0],
  ['', 'Escenarios bloqueados','No pudieron ejecutarse',summary.blocked||0],
  ['', 'Pendientes de prueba','Cobertura aún no ejecutada',summary.pending||0]
 ];
 $('riskList').innerHTML=arr.map(x=>`<div class="risk ${x[0]}"><span class="badge">${x[0]?'Crítico':'Control'}</span><div><b>${x[1]}</b><p>${x[2]}</p></div><span class="count">${x[3]}</span></div>`).join('');
}

function tasksForDate(date){return PLANNED_TASKS.filter(t=>t.date===date)}
function dayHtml(date,compact=false){
 const ts=tasksForDate(date);const today=date===todayISO();const done=ts.filter(t=>taskStatus(t.id)==='done').length;
 return `<article class="day ${today?'today':''}">
   <div class="day-date"><b>${formatDate(date)}</b><span>Bloque ERP: 7 h efectivas</span>${today?'<span class="today-tag">HOY</span>':''}</div>
   <div class="day-tasks">${ts.map(t=>`<div class="task-chip ${EXECUTIVE_MODE?'':'clickable'}" data-task="${t.id}" data-phase="${esc(t.phase)}"><span class="color"></span><div><b>${esc(t.title)}</b><span>${compact?esc(t.phase):esc(t.scope)} · ${t.scenarioCount?`${t.scenarioCount} escenarios base`:'actividad de soporte/re-prueba'}</span></div><span class="state ${statusClass(taskStatus(t.id))}">${statusLabel(taskStatus(t.id))}</span></div>`).join('')}</div>
   <div class="day-hours"><b>${done===ts.length&&ts.length?'7 h':'7 h'}</b><span>07:00–12:00<br>13:40–15:40</span></div>
 </article>`;
}
function renderTimeline(){
 const today=todayISO();let idx=WORK_DAYS.findIndex(d=>d>=today);if(idx<0)idx=WORK_DAYS.length-3;const upcoming=WORK_DAYS.slice(Math.max(0,idx),Math.min(WORK_DAYS.length,idx+4));
 $('nextDays').innerHTML=upcoming.map(d=>dayHtml(d,true)).join('');$('fullTimeline').innerHTML=WORK_DAYS.map(d=>dayHtml(d,false)).join('');
 document.querySelectorAll('[data-task]').forEach(el=>{if(!EXECUTIVE_MODE)el.onclick=()=>openTask(el.dataset.task)});
}
function renderGantt(){
 const labels=WORK_DAYS.map(d=>`<div class="${d===todayISO()?'today':''}">${formatDate(d,true)}</div>`).join('');
 let html=`<div class="gantt-head"><div class="label">Frente</div>${labels}</div>`;
 const groups=[...new Set(PLANNED_TASKS.map(t=>t.phase))];
 groups.forEach(g=>{
   const dates=new Set(PLANNED_TASKS.filter(t=>t.phase===g).map(t=>t.date));
   const allDone=PLANNED_TASKS.filter(t=>t.phase===g).every(t=>taskStatus(t.id)==='done');
   html+=`<div class="gantt-row"><div class="label"><b>${esc(g)}</b></div>${WORK_DAYS.map(d=>`<div class="gantt-cell ${dates.has(d)?'active':''} ${allDone&&dates.has(d)?'done':''} ${d===todayISO()?'today':''}"></div>`).join('')}</div>`;
 });
 $('gantt').innerHTML=html;
}

function filteredScenarios(){
 const t=$('filterType').value,st=$('filterStatus').value,q=$('filterText').value.trim().toLowerCase();
 return BASE_SCENARIOS.map(scenarioMerged).filter(s=>(!t||s.type===t)&&(!st||s.status===st)&&(!q||`${s.id} ${s.type} ${s.variant} ${s.route} ${s.expected}`.toLowerCase().includes(q)));
}
function renderMatrix(){
 const rows=filteredScenarios();const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));if(page>pages)page=pages;const chunk=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 $('matrixBody').innerHTML=chunk.map(s=>`<tr><td><b>${s.id}</b></td><td>${formatDate(s.plannedDate,true)}</td><td><span class="priority ${s.priority}">${s.priority}</span></td><td>${s.type}</td><td>${esc(s.variant)}</td><td>${esc(s.route)}</td><td>${esc(s.expected)}</td><td>${statusLabel(s.status)}</td><td class="editor-only">${EXECUTIVE_MODE?'':`<button class="btn secondary small" data-scenario="${s.id}">Actualizar</button>`}</td></tr>`).join('');
 $('matrixCount').textContent=`${rows.length} escenarios`;$('pageInfo').textContent=`${page} / ${pages}`;$('prevPage').disabled=page<=1;$('nextPage').disabled=page>=pages;
 document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>openScenario(b.dataset.scenario));
 applyPermissions();
}
function renderDefects(){
 const defs=state.defects||[];
 $('defectList').innerHTML=defs.length?defs.slice().reverse().map(d=>`<div class="defect"><div class="defect-head"><span class="priority ${d.severity}">${d.severity}</span><h5>${esc(d.title)}</h5><span class="state ${d.status==='Cerrado'?'done':''}" style="margin-left:auto">${esc(d.status)}</span></div><p>${esc(d.description)}</p><footer><span>${esc(d.module||'Transversal')}</span><span>·</span><span>${esc(d.createdAt||'')}</span>${d.ticket?`<span>· ${esc(d.ticket)}</span>`:''}</footer></div>`).join(''):'<div class="executive-note">No hay hallazgos registrados todavía. Esto no significa que el ERP esté aprobado: la matriz aún debe ejecutarse.</div>';
}

function openModal(html){$('modalContent').innerHTML=html;$('modal').classList.remove('hidden');const close=$('modalContent').querySelector('[data-close]');if(close)close.onclick=closeModal}
function closeModal(){$('modal').classList.add('hidden')}
function openTask(id){
 const t=PLANNED_TASKS.find(x=>x.id===id),v=state.taskState[id]||{};
 openModal(`<div class="modal-head"><div><h3>${esc(t.title)}</h3><p>${formatDate(t.date)} · ${minutesLabel(t.durationMin)} · ${esc(t.phase)}</p></div><button class="btn secondary small" data-close>Cerrar</button></div>
 <div class="executive-note">${esc(t.scope)}</div><div class="form-grid" style="margin-top:14px">
 <div class="field"><label>Estado</label><select class="select" id="taskStatus"><option value="pending">Pendiente</option><option value="in_progress">En curso</option><option value="done">Completado</option><option value="blocked">Bloqueado</option></select></div>
 <div class="field"><label>Tiempo real (min)</label><input class="input" type="number" min="0" id="taskActual" value="${Number(v.actualMinutes||0)}"></div>
 <div class="field full"><label>Nota de seguimiento</label><textarea class="textarea" id="taskNote">${esc(v.note||'')}</textarea></div>
 <div class="field full"><label>Evidencia / enlace interno</label><input class="input" id="taskEvidence" value="${esc(v.evidence||'')}" placeholder="URL o referencia de evidencia"></div>
 </div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn secondary" data-close>Cancelar</button><button class="btn" id="taskSave">Guardar</button></div>`);
 $('taskStatus').value=v.status||'pending';
 $('taskSave').onclick=()=>{state.taskState[id]={status:$('taskStatus').value,actualMinutes:Number($('taskActual').value||0),note:$('taskNote').value.trim(),evidence:$('taskEvidence').value.trim()};queueSave();closeModal()};
}
function openScenario(id){
 const s=scenarioMerged(BASE_SCENARIOS.find(x=>x.id===id));
 openModal(`<div class="modal-head"><div><h3>${s.id} · ${esc(s.type)}</h3><p>${formatDate(s.plannedDate)} · ${esc(s.priority)}</p></div><button class="btn secondary small" data-close>Cerrar</button></div>
 <div class="executive-note"><b>Escenario:</b> ${esc(s.variant)}<br><b>Ruta:</b> ${esc(s.route)}<br><b>Esperado:</b> ${esc(s.expected)}</div>
 <div class="form-grid" style="margin-top:14px"><div class="field"><label>Estado</label><select class="select" id="scenarioStatus"><option value="pending">Pendiente</option><option value="in_progress">En prueba</option><option value="approved">Aprobado</option><option value="failed">Fallido</option><option value="retest">Re-prueba</option><option value="blocked">Bloqueado</option></select></div>
 <div class="field"><label>Ticket / defecto</label><input class="input" id="scenarioTicket" value="${esc(s.ticket||'')}"></div>
 <div class="field full"><label>Nota / evidencia</label><textarea class="textarea" id="scenarioNote">${esc(s.note||'')}</textarea></div></div>
 <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn secondary" data-close>Cancelar</button><button class="btn" id="scenarioSave">Guardar resultado</button></div>`);
 $('scenarioStatus').value=s.status||'pending';
 $('scenarioSave').onclick=()=>{state.scenarioState[id]={status:$('scenarioStatus').value,ticket:$('scenarioTicket').value.trim(),note:$('scenarioNote').value.trim()};queueSave();closeModal()};
}
function openDefect(){
 openModal(`<div class="modal-head"><div><h3>Registrar hallazgo</h3><p>Defecto o decisión detectada durante el ciclo de pruebas.</p></div><button class="btn secondary small" data-close>Cerrar</button></div><div class="form-grid">
 <div class="field"><label>Severidad</label><select class="select" id="defSeverity"><option>Crítica</option><option selected>Alta</option><option>Media</option><option>Baja</option></select></div><div class="field"><label>Estado</label><select class="select" id="defStatus"><option>Abierto</option><option>En corrección</option><option>Re-prueba</option><option>Cerrado</option></select></div>
 <div class="field full"><label>Título</label><input class="input" id="defTitle"></div><div class="field"><label>Módulo</label><input class="input" id="defModule" placeholder="Corte, Recepción, Caja..."></div><div class="field"><label>Ticket</label><input class="input" id="defTicket" placeholder="Opcional"></div><div class="field full"><label>Descripción</label><textarea class="textarea" id="defDesc"></textarea></div></div>
 <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn secondary" data-close>Cancelar</button><button class="btn" id="defSave">Registrar</button></div>`);
 $('defSave').onclick=()=>{const title=$('defTitle').value.trim();if(!title)return alert('Escriba un título.');state.defects.push({id:'D'+Date.now(),severity:$('defSeverity').value,status:$('defStatus').value,title,module:$('defModule').value.trim(),ticket:$('defTicket').value.trim(),description:$('defDesc').value.trim(),createdAt:nowCO()});queueSave();closeModal()};
}
function openLogin(){
 if(!firebaseConfigPresent())return openModal(`<div class="modal-head"><div><h3>Firebase pendiente de configurar</h3><p>El tracker está funcionando en modo local.</p></div><button class="btn secondary small" data-close>Cerrar</button></div><div class="executive-note">Pegue en <b>firebase-config.js</b> la configuración WEB del Firebase correcto de Trazabilidad Logística y publique las reglas del archivo <b>firestore.rules.snippet</b>. No se precargó ningún proyecto para evitar mezclar el ERP con otro Firebase histórico.</div>`);
 openModal(`<div class="modal-head"><div><h3>Sesión de seguimiento</h3><p>Use una cuenta autorizada del Firebase de Trazabilidad Logística.</p></div><button class="btn secondary small" data-close>Cerrar</button></div>
 <div class="login-box"><div class="form-grid"><div class="field full"><label>Correo</label><input class="input" id="loginEmail" type="email"></div><div class="field full"><label>Contraseña</label><input class="input" id="loginPassword" type="password"></div></div><div class="login-actions"><button class="btn" id="emailLogin">Ingresar</button><button class="btn secondary" id="googleLogin">Google</button>${currentUser?'<button class="btn secondary" id="logoutBtn">Cerrar sesión actual</button>':''}</div><div class="sync-message" id="loginMsg"></div></div>`);
 $('emailLogin').onclick=async()=>{try{await auth.signInWithEmailAndPassword($('loginEmail').value.trim(),$('loginPassword').value);closeModal()}catch(e){$('loginMsg').textContent=e.message;$('loginMsg').className='sync-message error'}};
 $('googleLogin').onclick=async()=>{try{await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());closeModal()}catch(e){$('loginMsg').textContent=e.message;$('loginMsg').className='sync-message error'}};
 if($('logoutBtn'))$('logoutBtn').onclick=async()=>{await auth.signOut();closeModal()};
}

function exportCSV(){
 const rows=[['Fecha','Fase','Actividad','Horas plan','Escenarios base','Estado']];PLANNED_TASKS.forEach(t=>rows.push([t.date,t.phase,t.title,t.durationMin/60,t.scenarioCount,statusLabel(taskStatus(t.id))]));
 const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cronograma_qa_erp_2026.csv';a.click();URL.revokeObjectURL(a.href);
}
function resetPlan(){if(!confirm('¿Restaurar estados, notas y hallazgos al plan base?'))return;state=seedState();queueSave()}

function initEvents(){
 document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));$('view-'+b.dataset.view).classList.remove('hidden')});
 $('printBtn').onclick=()=>window.print();$('saveBtn').onclick=async()=>{state.updatedAt=nowCO();saveLocal();const ok=await persistRemote();alert(ok?'Avance guardado en Firebase y copia local.':'Avance guardado localmente. Firebase no está disponible o no autorizó la escritura.')};$('loginBtn').onclick=openLogin;
 $('resetPlanBtn').onclick=resetPlan;$('exportBtn').onclick=exportCSV;$('newDefectBtn').onclick=openDefect;
 ['filterType','filterStatus','filterText'].forEach(id=>$(id).addEventListener(id==='filterText'?'input':'change',()=>{page=1;renderMatrix()}));
 $('prevPage').onclick=()=>{if(page>1){page--;renderMatrix()}};$('nextPage').onclick=()=>{page++;renderMatrix()};
 $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
}

loadLocal();applyPermissions();initEvents();renderAll();initFirebase();
})();
