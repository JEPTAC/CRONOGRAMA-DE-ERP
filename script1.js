
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

 ['Excepciones','Novedades por módulo','Documento faltante, dato incorrecto, no encontrado, espera y devoluciones.',210,4],
 ['Excepciones','Aprobaciones y cancelación','Aprobar/rechazar reportes, cancelación, notas obligatorias y retorno de flujo.',210,2],
 ['Excepciones','SLA, Centro de Excepciones y reportes','Escalamiento, vencimiento, responsable, resolución y auditoría.',210,4],
 ['Integridad','Idempotencia y concurrencia','Doble clic, reintento, flowRevision y dos usuarios sobre la misma tarea/pedido.',210,3],

 ['Corte / Inventario','Corte extremo y multi-carreto','Referencias compartidas, múltiples carretos, cantidad real, merma y foto final.',210,5],
 ['Corte / Inventario','Inventario, lotes y maestro','Lotes, movimientos, ATP/MRP y compatibilidad de materiales/históricos.',210,3],

 ['Despachos','Rutas y documentación de despacho','Entrega en punto, recoge, local y nacional; guía, transportadora y foto.',210,4],
 ['Despachos','Direcciones y permisos','DIVIPOLA, urbano/rural/lugar conocido, coordenadas y permiso de cierre.',210,3],

 ['Calendario','Calendario y Workforce','Semanal/mensual, asignación futura, auto-reporte, aprobaciones, catálogo y vencimientos.',210,2],
 ['Calendario','VSM, tiempos y dashboard','Jornada hábil, tiempo no trazabilizado, filtros, indicadores y consistencia temporal.',210,1],

 ['Seguridad','Seguridad y perfiles reales','Roles, lecturas/escrituras autorizadas, cambio de rol y aislamiento de datos.',210,1],
 ['Seguridad','Drive, red y recuperación','Carga/reintento de evidencia, red intermitente, refresco, sesión y offline básico.',210,3],

 ['UX / Responsive','Responsive y navegadores','390 px, portátil, escritorio, iPhone/iPad/Android, zoom y teclado.',210,1],
 ['UX / Responsive','Búsqueda, filtros y consistencia UI','Búsqueda global, filtros, popups, tablas, estados y navegación.',210,1],

 ['Corrección','Correcciones críticas y altas','Intervenir defectos bloqueantes/altos, revisar impactos cruzados y dejar build candidata.',210,0],
 ['Corrección','Re-pruebas y regresión dirigida','Repetir casos fallidos y rutas afectadas; verificar que no se reintroduzcan errores.',210,0],

 ['Cierre','Regresión E2E final','Muestreo crítico PVE/PVC/PVP/PVN, excepciones, Corte, despacho, seguridad y concurrencia.',210,1],
 ['Cierre','Go/No-Go y cierre ejecutivo','Consolidar evidencia, defectos, cobertura, riesgos, rollback y recomendación de lanzamiento.',210,0]].map((x,i)=>({id:'T'+String(i+1).padStart(2,'0'),phase:x[0],title:x[1],scope:x[2],durationMin:x[3],scenarioCount:x[4]}));

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
 const out=[];
 tasks.forEach((task,i)=>{
   const dayIndex=Math.floor(i/2),session=i%2===0?'AM':'PM';
   const date=WORK_DAYS[dayIndex];
   out.push({...task,date,dayIndex,halfIndex:i,session,slot:session==='AM'?'07:30–11:00':'13:50–17:20'});
 });
 return out;
}
const PLANNED_TASKS=scheduleTasks(TASK_BLUEPRINT);

const PHASE_META={
 'Preparación':{code:'01',label:'Preparación y gobierno',support:'Calidad + TI',accent:'#53657a'},
 'PVE':{code:'02',label:'Flujo PVE',support:'Compras + Logística',accent:'#3975bd'},
 'PVC':{code:'03',label:'Flujo PVC',support:'Cartera + Logística',accent:'#5266b0'},
 'PVP':{code:'04',label:'Flujo PVP',support:'Cartera + Facturación',accent:'#765fa8'},
 'PVN':{code:'05',label:'Flujo PVN',support:'Caja + Logística',accent:'#2f7f9b'},
 'Excepciones':{code:'06',label:'Novedades y excepciones',support:'Líderes de proceso',accent:'#a16c28'},
 'Integridad':{code:'07',label:'Integridad transaccional',support:'TI + usuarios concurrentes',accent:'#a14b5b'},
 'Corte / Inventario':{code:'08',label:'Corte e inventario',support:'Corte + Bodega',accent:'#2f7f72'},
 'Despachos':{code:'09',label:'Despachos y entrega',support:'Despachos',accent:'#4d815f'},
 'Calendario':{code:'10',label:'Calendario, Workforce y VSM',support:'Jefatura + usuarios clave',accent:'#647389'},
 'Seguridad':{code:'11',label:'Seguridad e integraciones',support:'TI',accent:'#9b4d4d'},
 'UX / Responsive':{code:'12',label:'Experiencia y responsive',support:'Usuarios clave',accent:'#7265a1'},
 'Corrección':{code:'13',label:'Correcciones y re-pruebas',support:'Desarrollo + Calidad',accent:'#b36d35'},
 'Cierre':{code:'14',label:'Cierre y liberación',support:'Jefatura / Gerencia',accent:'#38465c'}
};
const PHASE_ORDER=[...new Set(PLANNED_TASKS.map(t=>t.phase))];
let collapsedPhases=new Set();
let selectedTaskId=null;

function taskProgress(t){
 const v=state.taskState[t.id]||{};
 if(v.status==='done')return 100;
 const actual=Math.max(0,Number(v.actualMinutes||0));
 if(actual>0)return Math.min(v.status==='in_progress'?95:99,Math.round(actual/t.durationMin*100));
 if(v.status==='in_progress')return 50;
 return 0;
}
function plannedTaskScenarios(t){
 if(!t.scenarioCount)return [];
 const sameDateTasks=PLANNED_TASKS.filter(x=>x.date===t.date);
 const daily=BASE_SCENARIOS.filter(s=>s.plannedDate===t.date);
 let offset=0;
 for(const x of sameDateTasks){
   if(x.id===t.id)break;
   offset+=x.scenarioCount||0;
 }
 return daily.slice(offset,offset+t.scenarioCount);
}
function taskAcceptance(t){
 const map={
  'Preparación':'Ambiente estable, dataset de prueba controlado, accesos validados y criterios de aprobación definidos.',
  'PVE':'El PVE completa su ruta sin saltos; parciales conservan saldo; lotes y movimientos no se duplican.',
  'PVC':'Cartera interviene únicamente cuando corresponde y el pedido conserva estados, evidencia y ruta financiera correcta.',
  'PVP':'El anexo y las condiciones financieras se validan antes de avanzar; faltantes bloquean o generan novedad trazable.',
  'PVN':'Caja interviene según la retención definida y factura/evidencias quedan asociadas antes de la salida.',
  'Excepciones':'Cada novedad o aprobación conserva actor, motivo, SLA, evidencia, decisión y retorno al punto correcto del flujo.',
  'Integridad':'No hay duplicidades por doble clic/reintento y las versiones obsoletas no sobrescriben estados válidos.',
  'Corte / Inventario':'Corte pendiente bloquea facturación; cantidad, merma, lotes, inventario y maestro permanecen consistentes.',
  'Despachos':'Cada ruta exige únicamente sus requisitos y el cierre solo ocurre con guía/dirección/evidencia/permisos válidos.',
  'Calendario':'Asignaciones y tiempos respetan jornada Colombia, fin de semana, festivos, responsables y fechas límite.',
  'Seguridad':'Roles, datos e integraciones resisten accesos indebidos, reintentos, refrescos y pérdida temporal de red.',
  'UX / Responsive':'La operación es usable y legible en 390 px, portátil y escritorio, sin controles inaccesibles ni desbordes.',
  'Corrección':'La build candidata corrige defectos prioritarios sin introducir regresiones en rutas relacionadas.',
  'Cierre':'Cero bloqueantes, rutas críticas E2E aprobadas, evidencias consolidadas y decisión Go/No-Go documentada.'
 };
 return map[t.phase]||'Criterios del alcance validados y evidencia registrada.';
}
function evidencePolicy(t){
 if(t.phase==='Corrección')return 'Ticket/hallazgo, cambio aplicado, caso fallido original y resultado de re-prueba.';
 if(t.phase==='Cierre')return 'Matriz QA final, listado de defectos, evidencia E2E, backup/rollback y acta o recomendación de salida.';
 return 'Captura o video breve + estado final + auditoría/evento/registro asociado + ticket si el resultado falla.';
}
function predecessor(t){const i=PLANNED_TASKS.findIndex(x=>x.id===t.id);return i>0?PLANNED_TASKS[i-1]:null}
function successor(t){const i=PLANNED_TASKS.findIndex(x=>x.id===t.id);return i>=0&&i<PLANNED_TASKS.length-1?PLANNED_TASKS[i+1]:null}
function phaseProgress(phase){const ts=PLANNED_TASKS.filter(t=>t.phase===phase);return ts.length?Math.round(ts.reduce((a,t)=>a+taskProgress(t),0)/ts.length):0}
function phaseStatus(phase){const ts=PLANNED_TASKS.filter(t=>t.phase===phase),sts=ts.map(t=>taskStatus(t.id));if(sts.includes('blocked'))return'blocked';if(sts.every(x=>x==='done'))return'done';if(sts.includes('in_progress')||sts.includes('done'))return'in_progress';return'pending'}
function taskWbs(t){const p=PHASE_ORDER.indexOf(t.phase)+1,within=PLANNED_TASKS.filter(x=>x.phase===t.phase).findIndex(x=>x.id===t.id)+1;return `${p}.${within}`}
function shortDateISO(s){const d=parseISO(s);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`}
function currentTimeMinutesCO(){const parts=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Bogota'}).formatToParts(new Date());const o={};parts.forEach(x=>o[x.type]=x.value);return Number(o.hour)*60+Number(o.minute)}
function currentTaskForDate(date){const ts=tasksForDate(date);if(date!==todayISO())return ts[0]||null;const m=currentTimeMinutesCO();if(m<13*60+40)return ts[0]||null;return ts[1]||ts[0]||null}


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

function renderAll(){renderKPIs();renderProgress();renderRisks();renderEnterpriseSchedule();renderRoadmapMeta();renderMatrix();renderDefects();$('lastUpdate').textContent=state.updatedAt||'sin guardar';}
function projectHealth(){
 const critical=EXECUTIVE_MODE?(state.publicCriticalOpen??0):criticalOpen();
 const blockedTasks=PLANNED_TASKS.filter(t=>taskStatus(t.id)==='blocked').length;
 if(critical>0||blockedTasks>1)return {label:'En riesgo',cls:'risk'};
 if(blockedTasks===1)return {label:'Atención requerida',cls:'risk'};
 return {label:'En ejecución',cls:''};
}
function renderKPIs(){
 const p=progressPercent(),summary=EXECUTIVE_MODE&&state.publicScenarioSummary?state.publicScenarioSummary:summaryScenarioCounts();
 $('kpiProgress').textContent=p+'%';$('kpiCases').textContent=summary.total||156;$('kpiHours').textContent='126';
 $('kpiCritical').textContent=EXECUTIVE_MODE?(state.publicCriticalOpen??0):criticalOpen();
 const dt=state.targetDate||WORK_DAYS[17];$('kpiDate').textContent=formatDate(dt,true);$('heroTarget').textContent=formatDate(dt,true)+' 2026';
 $('progressRing').style.setProperty('--p',p);$('ringValue').textContent=p+'%';
}
function renderRoadmapMeta(){
 const p=progressPercent(),done=PLANNED_TASKS.filter(t=>taskStatus(t.id)==='done').length,today=todayISO();
 let idx=WORK_DAYS.findIndex(d=>d>=today);if(idx<0)idx=WORK_DAYS.length-1;
 $('roadmapProgress').textContent=p+'%';$('roadmapTasks').textContent=`${done} / ${PLANNED_TASKS.length}`;$('roadmapToday').textContent=`${idx+1} / ${WORK_DAYS.length}`;$('roadmapHours').textContent='126 h';$('roadmapBlockers').textContent=EXECUTIVE_MODE?(state.publicCriticalOpen??0):criticalOpen();
 const actual=PLANNED_TASKS.reduce((a,t)=>a+Number(state.taskState[t.id]?.actualMinutes||0),0);$('actualHoursMetric').textContent=(Math.round(actual/6)/10)+' h';
 const h=projectHealth();$('roadmapHealth').textContent=h.label;$('roadmapHealth').className='health-badge'+(h.cls?' '+h.cls:'');$('scheduleUpdated').textContent='Último guardado: '+(state.updatedAt||'pendiente');
 const focusDate=WORK_DAYS.includes(today)?today:(WORK_DAYS.find(d=>d>today)||WORK_DAYS[WORK_DAYS.length-1]);$('focusDateLabel').textContent=formatDate(focusDate,true);
 const focus=tasksForDate(focusDate),current=currentTaskForDate(focusDate);
 $('todayFocus').innerHTML=focus.map(t=>`<div class="focus-enterprise ${current&&current.id===t.id?'current':''} ${EXECUTIVE_MODE?'':'clickable'}" data-task="${t.id}"><div class="focus-timeblock"><b>${t.session}</b>${t.slot}</div><div><h5>${esc(t.title)}</h5><p>${esc(t.scope)} · ${t.scenarioCount} escenarios</p></div><span class="state ${statusClass(taskStatus(t.id))}">${statusLabel(taskStatus(t.id))}</span></div>`).join('')||'<div class="executive-note">Sin actividades asignadas.</div>';
 const major=['Preparación','PVE','PVC','PVP','PVN','Excepciones','Corte / Inventario','Despachos','Seguridad','Corrección','Cierre'];
 $('milestoneList').innerHTML=major.map(g=>{const ts=PLANNED_TASKS.filter(t=>t.phase===g);if(!ts.length)return'';const end=ts.at(-1).date,doneAll=ts.every(t=>taskStatus(t.id)==='done');return `<div class="milestone-enterprise ${doneAll?'done':''}"><span class="diamond"></span><div><b>${esc(g)}</b><small>${phaseProgress(g)}% · ${ts.reduce((a,t)=>a+t.scenarioCount,0)} escenarios</small></div><time>${formatDate(end,true)}</time></div>`}).join('');
 document.querySelectorAll('#todayFocus [data-task]').forEach(el=>{if(!EXECUTIVE_MODE)el.onclick=()=>selectScheduleTask(el.dataset.task)});
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
function statusBadge(t){const st=taskStatus(t.id);return `<span class="ims-state ${statusClass(st)}">${statusLabel(st)}</span>`}
function scheduleFilters(){return {q:($('scheduleSearch')?.value||'').trim().toLowerCase(),phase:$('schedulePhaseFilter')?.value||'',status:$('scheduleStatusFilter')?.value||''}}
function taskVisible(t){const f=scheduleFilters();return (!f.q||`${t.title} ${t.scope} ${t.phase}`.toLowerCase().includes(f.q))&&(!f.phase||t.phase===f.phase)&&(!f.status||taskStatus(t.id)===f.status)}
function phaseVisible(phase){return PLANNED_TASKS.some(t=>t.phase===phase&&taskVisible(t))}
function gridSlots(){const today=todayISO();return Array.from({length:36},(_,i)=>{const d=WORK_DAYS[Math.floor(i/2)],pm=i%2===1,weekStart=!pm&&(parseISO(d).getDay()===1||i===0);return `<span class="ims-grid-slot ${pm?'pm':''} ${weekStart?'week-start':''} ${d===today?'today':''}" style="grid-column:${i+1}"></span>`}).join('')}
function scheduleHeader(){
 const months=`<div class="ims-month-band"><span style="grid-column:1/19">Agosto 2026</span><span style="grid-column:19/37">Septiembre 2026</span></div>`;
 const days=WORK_DAYS.map((d,i)=>{const dt=parseISO(d),wd=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][dt.getDay()],today=d===todayISO();return `<span class="ims-day-head ${today?'today':''}" style="grid-column:${i*2+1}/${i*2+3}"><em style="font-style:normal">${wd}</em><b>${pad(dt.getDate())}</b></span>`}).join('');
 const shifts=Array.from({length:36},(_,i)=>`<span class="ims-shift-head ${WORK_DAYS[Math.floor(i/2)]===todayISO()?'today':''}">${i%2===0?'AM':'PM'}</span>`).join('');
 return `<div class="ims-header-row"><div class="ims-left-head"><div class="ims-colhead">WBS</div><div class="ims-colhead">Actividad / alcance</div><div class="ims-colhead">Estado</div><div class="ims-colhead">Inicio</div><div class="ims-colhead">Fin</div><div class="ims-colhead">%</div><div class="ims-colhead">Pred.</div><div class="ims-colhead">QA</div></div><div class="ims-right-head">${months}<div class="ims-day-band">${days}</div><div class="ims-shift-band">${shifts}</div></div></div>`;
}
function phaseSummaryRow(phase){
 const meta=PHASE_META[phase],ts=PLANNED_TASKS.filter(t=>t.phase===phase),visible=ts.filter(taskVisible);if(!visible.length)return'';
 const first=ts[0],last=ts.at(-1),p=phaseProgress(phase),st=phaseStatus(phase),collapsed=collapsedPhases.has(phase),sc=ts.reduce((a,t)=>a+t.scenarioCount,0),start=first.halfIndex+1,end=last.halfIndex+2;
 return `<div class="ims-data-row phase-summary" data-phase-row="${esc(phase)}"><div class="ims-left-cell"><div class="ims-cell ims-wbs">${meta.code}</div><div class="ims-cell ims-taskname"><button class="ims-expand" data-phase-toggle="${esc(phase)}">${collapsed?'▸':'▾'}</button><span class="phase-accent" style="background:${meta.accent}"></span><div class="ims-task-copy"><b>${esc(meta.label)}</b><small>${ts.length} work packages · ${sc} escenarios · apoyo: ${esc(meta.support)}</small></div></div><div class="ims-cell ims-status"><span class="ims-state ${statusClass(st)}">${statusLabel(st)}</span></div><div class="ims-cell ims-date">${shortDateISO(first.date)}</div><div class="ims-cell ims-date">${shortDateISO(last.date)}</div><div class="ims-cell ims-percent">${p}%</div><div class="ims-cell ims-pred">—</div><div class="ims-cell ims-scenarios">${sc}</div></div><div class="ims-right-cell">${gridSlots()}<div class="ims-bar ${statusClass(st)}" style="grid-column:${start}/${end}"><div class="progress-fill" style="width:${p}%"></div><span>${esc(meta.label)} · ${p}%</span></div><span class="ims-milestone-diamond ${st==='done'?'done':''}" style="grid-column:${Math.max(start,end-1)}"></span></div></div>`;
}
function taskRow(t){
 if(!taskVisible(t))return'';const meta=PHASE_META[t.phase],p=taskProgress(t),pred=predecessor(t),critical=$('showCritical')?.checked!==false&&t.phase!=='Corrección',sel=selectedTaskId===t.id,slot=t.halfIndex+1;
 return `<div class="ims-data-row ${sel?'selected':''}" data-task-row="${t.id}"><div class="ims-left-cell"><div class="ims-cell ims-wbs">${taskWbs(t)}</div><div class="ims-cell ims-taskname clickable" data-task="${t.id}"><span class="phase-accent" style="background:${meta.accent}"></span><div class="ims-task-copy"><b>${esc(t.title)}</b><small>${esc(t.slot)} · ${esc(t.scope)}</small></div></div><div class="ims-cell ims-status">${statusBadge(t)}</div><div class="ims-cell ims-date">${shortDateISO(t.date)}<br>${t.session}</div><div class="ims-cell ims-date">${shortDateISO(t.date)}<br>${t.session}</div><div class="ims-cell ims-percent">${p}%</div><div class="ims-cell ims-pred">${pred?taskWbs(pred):'—'}</div><div class="ims-cell ims-scenarios">${t.scenarioCount}</div></div><div class="ims-right-cell clickable" data-task="${t.id}">${gridSlots()}<div class="ims-bar ${statusClass(taskStatus(t.id))} ${critical?'critical':''}" style="grid-column:${slot}/${slot+1}" title="${esc(t.title)} · ${t.slot}"><div class="progress-fill" style="width:${p}%"></div><span>${t.session}</span></div></div></div>`;
}
function renderEnterpriseSchedule(){
 const phaseSelect=$('schedulePhaseFilter');if(phaseSelect&&phaseSelect.options.length===1)PHASE_ORDER.forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=PHASE_META[p]?.label||p;phaseSelect.appendChild(o)});
 if(!selectedTaskId){const today=todayISO(),focusDate=WORK_DAYS.includes(today)?today:(WORK_DAYS.find(d=>d>today)||WORK_DAYS[WORK_DAYS.length-1]);const current=currentTaskForDate(focusDate);selectedTaskId=current?.id||PLANNED_TASKS[0].id;}
 let body='';PHASE_ORDER.forEach(p=>{if(!phaseVisible(p))return;body+=phaseSummaryRow(p);if(!collapsedPhases.has(p))PLANNED_TASKS.filter(t=>t.phase===p).forEach(t=>body+=taskRow(t))});
 $('enterpriseSchedule').innerHTML=scheduleHeader()+body;
 document.querySelectorAll('[data-phase-toggle]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=b.dataset.phaseToggle;collapsedPhases.has(p)?collapsedPhases.delete(p):collapsedPhases.add(p);renderEnterpriseSchedule()});
 document.querySelectorAll('#enterpriseSchedule [data-task]').forEach(el=>el.onclick=e=>{e.stopPropagation();selectScheduleTask(el.dataset.task)});
 document.querySelectorAll('#enterpriseSchedule [data-task-row]').forEach(row=>row.onclick=()=>selectScheduleTask(row.dataset.taskRow));
 if(selectedTaskId)renderTaskInspector(selectedTaskId);
}
function selectScheduleTask(id){selectedTaskId=id;renderEnterpriseSchedule();renderTaskInspector(id)}
function renderTaskInspector(id){
 const t=PLANNED_TASKS.find(x=>x.id===id);if(!t)return;const v=state.taskState[id]||{},pred=predecessor(t),succ=successor(t),scenarios=plannedTaskScenarios(t),meta=PHASE_META[t.phase];
 $('taskInspector').classList.add('has-selection');
 $('taskInspector').innerHTML=`<div class="inspector-head"><div class="micro">${taskWbs(t)} · ${esc(meta.label)}</div><h4>${esc(t.title)}</h4><p>${formatDate(t.date)} · ${t.slot}</p></div><div class="inspector-body"><div class="inspector-grid"><div class="inspector-kv"><span>Estado</span><b>${statusLabel(taskStatus(t.id))}</b></div><div class="inspector-kv"><span>Avance</span><b>${taskProgress(t)}%</b></div><div class="inspector-kv"><span>Plan</span><b>3 h 30 min</b></div><div class="inspector-kv"><span>Real</span><b>${minutesLabel(Number(v.actualMinutes||0))}</b></div><div class="inspector-kv"><span>Predecesor</span><b>${pred?taskWbs(pred):'Inicio'}</b></div><div class="inspector-kv"><span>Siguiente</span><b>${succ?taskWbs(succ):'Release'}</b></div><div class="inspector-kv"><span>Escenarios</span><b>${t.scenarioCount}</b></div><div class="inspector-kv"><span>Apoyo</span><b>${esc(meta.support)}</b></div></div><div class="inspector-section"><h5>Qué se está haciendo</h5><p>${esc(t.scope)}</p></div><div class="inspector-section"><h5>Criterio de cierre</h5><p>${esc(taskAcceptance(t))}</p></div><div class="inspector-section"><h5>Evidencia mínima</h5><p>${esc(evidencePolicy(t))}</p></div>${scenarios.length?`<div class="inspector-section"><h5>Casos QA asignados a este bloque</h5><div class="scenario-stack">${scenarios.map(s=>`<button class="scenario-mini" data-inspector-scenario="${s.id}" type="button"><b>${s.id}</b><span>${esc(s.variant)} · ${esc(s.route)}</span><em>${statusLabel(scenarioStatus(s.id))}</em></button>`).join('')}</div></div>`:''}${EXECUTIVE_MODE?'':`<div class="inspector-edit"><h5>Actualización de avance</h5><div class="field"><label>Estado</label><select class="select" id="inspectorStatus"><option value="pending">Pendiente</option><option value="in_progress">En curso</option><option value="done">Completado</option><option value="blocked">Bloqueado</option></select></div><div class="field"><label>Tiempo real (min)</label><input class="input" id="inspectorActual" type="number" min="0" value="${Number(v.actualMinutes||0)}"></div><div class="field"><label>Nota de seguimiento</label><textarea class="textarea" id="inspectorNote">${esc(v.note||'')}</textarea></div><div class="field"><label>Evidencia / enlace</label><input class="input" id="inspectorEvidence" value="${esc(v.evidence||'')}"></div><div class="inspector-actions"><button class="btn small" id="inspectorSave">Guardar actividad</button></div></div>`}</div>`;
 document.querySelectorAll('[data-inspector-scenario]').forEach(b=>b.onclick=()=>openScenario(b.dataset.inspectorScenario));
 if(!EXECUTIVE_MODE){$('inspectorStatus').value=v.status||'pending';$('inspectorSave').onclick=()=>{state.taskState[id]={status:$('inspectorStatus').value,actualMinutes:Number($('inspectorActual').value||0),note:$('inspectorNote').value.trim(),evidence:$('inspectorEvidence').value.trim()};queueSave();renderTaskInspector(id)}}
}
function renderTimeline(){}
function renderGantt(){}

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
 const rows=[['WBS','Fecha','Sesión','Horario','Fase','Actividad','Alcance','Predecesor','Horas plan','Minutos reales','Escenarios QA','Estado','Avance %','Criterio de cierre','Evidencia mínima']];
 PLANNED_TASKS.forEach(t=>{const pred=predecessor(t),v=state.taskState[t.id]||{};rows.push([taskWbs(t),t.date,t.session,t.slot,t.phase,t.title,t.scope,pred?taskWbs(pred):'',t.durationMin/60,Number(v.actualMinutes||0),t.scenarioCount,statusLabel(taskStatus(t.id)),taskProgress(t),taskAcceptance(t),evidencePolicy(t)])});
 const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='IMS_QA_ERP_Trazabilidad_Logistica_2026.csv';a.click();URL.revokeObjectURL(a.href);
}
function resetPlan(){if(!confirm('¿Restaurar estados, notas y hallazgos al plan base?'))return;state=seedState();queueSave()}

function initEvents(){
 document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(v=>{v.classList.add('hidden');v.classList.remove('active-print')});const target=$('view-'+b.dataset.view);target.classList.remove('hidden');target.classList.add('active-print')});
 $('printBtn').onclick=()=>window.print();$('saveBtn').onclick=async()=>{state.updatedAt=nowCO();saveLocal();const ok=await persistRemote();alert(ok?'Avance guardado en Firebase y copia local.':'Avance guardado localmente. Firebase no está disponible o no autorizó la escritura.')};$('loginBtn').onclick=openLogin;
 $('resetPlanBtn').onclick=resetPlan;$('exportBtn').onclick=exportCSV;$('todayBtn').onclick=()=>{const el=document.querySelector('.ims-day-head.today');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})};$('newDefectBtn').onclick=openDefect;
 ['filterType','filterStatus','filterText'].forEach(id=>$(id).addEventListener(id==='filterText'?'input':'change',()=>{page=1;renderMatrix()}));
 $('prevPage').onclick=()=>{if(page>1){page--;renderMatrix()}};$('nextPage').onclick=()=>{page++;renderMatrix()};
 ['scheduleSearch','schedulePhaseFilter','scheduleStatusFilter'].forEach(id=>$(id)?.addEventListener(id==='scheduleSearch'?'input':'change',renderEnterpriseSchedule));
 $('showCritical')?.addEventListener('change',renderEnterpriseSchedule);$('collapseBtn')?.addEventListener('click',()=>{collapsedPhases=new Set(PHASE_ORDER);renderEnterpriseSchedule()});$('expandBtn')?.addEventListener('click',()=>{collapsedPhases.clear();renderEnterpriseSchedule()});
 $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
}

loadLocal();applyPermissions();initEvents();renderAll();initFirebase();
})();

