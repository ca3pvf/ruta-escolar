const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DAYS=['Lunes','Martes','Miércoles','Jueves','Viernes'];
const DEFAULTS={entries:['07:30','08:00','08:30'],exits:['13:00','14:00','15:00','16:00'],students:[],events:[],manualOrder:[],disabledCourses:[]};
const COURSES=['Pre-Kinder','Kinder',...Array.from({length:8},(_,i)=>`${i+1}° Básico`),...Array.from({length:4},(_,i)=>`${i+1}° Medio`)];
let data=load(),toastTimer;
function contactsOf(s){const c=(s.contacts||[]).filter(x=>x&&(x.name||x.phone));return c.length?c:(s.parent||s.phone?[{name:s.parent||'',phone:s.phone||'',relation:''}]:[])}
function migrate(d){
 // Registros antiguos sin fecha real no se pueden ubicar en un día concreto: se descartan.
 d.events=(d.events||[]).filter(e=>e.date);
 // Corrige cursos de enseñanza media guardados como 9°–12° Medio.
 d.students=(d.students||[]).map(s=>{const m=/^(9|10|11|12)° Medio$/.exec(s.course||'');const t=m?{...s,course:`${+m[1]-8}° Medio`}:s;return {...t,contacts:contactsOf(t).map(c=>({...c,phone:formatPhone(c.phone)}))}});
 return d}
function load(){try{return migrate({...structuredClone(DEFAULTS),...JSON.parse(localStorage.getItem('rutaEscolarData')||'{}')})}catch{return structuredClone(DEFAULTS)}}
function save(){localStorage.setItem('rutaEscolarData',JSON.stringify(data));updateStats()}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function toast(msg){let el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function todayIndex(){let d=new Date().getDay();return d===0||d===6?0:d-1}
function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
// Fecha real del día de la semana elegido (lunes=0) en la semana en curso; sábado y domingo apuntan a la semana siguiente.
function dateForDay(day){const t=new Date();t.setHours(12,0,0,0);const dow=t.getDay();t.setDate(t.getDate()+(dow===0?1:dow===6?2:1-dow)+day);return isoDate(t)}
function prettyDate(iso){const[y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long'}).format(new Date(y,m-1,d))}
// Teléfonos chilenos: acepta 9 1234 5678, 09 1234 5678, 56 9 1234 5678, +56912345678, 0056...
function normalizePhone(raw){let d=String(raw||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.length===10&&d.startsWith('09'))d=d.slice(1);if(d.length===9&&d.startsWith('9'))d='56'+d;return d}
function isValidPhone(d){return /^569\d{8}$/.test(d)||(!d.startsWith('56')&&d.length>=10&&d.length<=15)}
function formatPhone(raw){const d=normalizePhone(raw);return /^569\d{8}$/.test(d)?`+56 9 ${d.slice(3,7)} ${d.slice(7)}`:String(raw||'').trim()}
function dateText(){return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}
function showView(name){$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));$$('[data-view]').forEach(b=>b.classList.toggle('selected',b.classList.contains('navitem')&&b.dataset.view===name));if(name==='students')renderStudents();if(name==='routes')renderRoute();if(name==='schedule')renderTimes();if(name==='messages')renderMessageStudents();if(name==='settings'){renderArchive();renderCourseToggles()}window.scrollTo(0,0)}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
function timeOptions(times,selected){return times.map(t=>`<option ${t===selected?'selected':''} value="${t}">${t}</option>`).join('')}
function initFormOptions(){ $('#studentCourse').innerHTML=courseOptions();$('#studentEntry').innerHTML=timeOptions(data.entries,data.entries[0]);$('#studentExit').innerHTML=timeOptions(data.exits,data.exits[0]);renderStudentExitByDay();$('#studentDays').innerHTML=DAYS.map((d,i)=>`<label class="daycheck"><input type="checkbox" value="${i}" checked>${d.slice(0,3)}</label>`).join('');$('#routeDay').innerHTML=DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('');$('#routeDay').value=String(Math.max(0,todayIndex()));}
function renderStudentExitByDay(existing={}){const el=$('#studentExitByDay');if(!el)return;el.innerHTML=DAYS.map((d,i)=>`<div class="day-exit-row"><span>${d}</span><label class="day-exit-toggle"><input type="checkbox" data-special-day="${i}" ${existing[i]?'checked':''}> Usar horario especial</label><input type="time" data-day-exit="${i}" value="${existing[i]||''}" ${existing[i]?'':'disabled'} aria-label="Salida ${d}"></div>`).join('');$$('[data-special-day]').forEach(c=>c.onchange=()=>{const t=$(`[data-day-exit="${c.dataset.specialDay}"]`);t.disabled=!c.checked;if(!c.checked)t.value='';});}
function renderStudents(){let q=$('#studentSearch').value.toLowerCase();let list=data.students.filter(s=>(s.name+' '+s.course+' '+s.address+' '+contactsOf(s).map(c=>c.name+' '+c.phone).join(' ')).toLowerCase().includes(q));$('#studentList').innerHTML=list.length?list.map(s=>{const cs=contactsOf(s);return `<article class="student-card"><div class="avatar">👧</div><div class="grow"><strong>${esc(s.name)}</strong><small>${esc(s.course)} · ${esc(s.address||'Sin dirección')}<br>${cs.length>1?'Apoderados:':'Apoderado:'}${cs.map(c=>`<br>${esc(c.name)}${c.relation?' ('+esc(c.relation)+')':''} · ${esc(c.phone)}`).join('')}</small></div><div class="card-actions"><button class="icon-btn" data-edit="${s.id}" aria-label="Editar">✎</button>${cs.map((c,i)=>`<button class="icon-btn" data-call="${s.id}" data-i="${i}" aria-label="Llamar a ${esc(c.name)}">☎${cs.length>1?i+1:''}</button>`).join('')}</div></article>`}).join(''):'<div class="empty">No hay alumnos. Pulsa “Nuevo” para registrar el primero.</div>';$$('[data-edit]').forEach(b=>b.onclick=()=>editStudent(b.dataset.edit));$$('[data-call]').forEach(b=>b.onclick=()=>{let s=data.students.find(x=>x.id===b.dataset.call);location.href='tel:'+contactsOf(s)[+b.dataset.i||0].phone})}
function resetStudentForm(){ $('#studentForm').reset();$('#studentId').value='';$('#formTitle').textContent='Nuevo alumno';$('#studentDays').innerHTML=DAYS.map((d,i)=>`<label class="daycheck"><input type="checkbox" value="${i}" checked>${d.slice(0,3)}</label>`).join(''); }
function openStudentForm(s){$('#studentForm').classList.remove('hidden');$('#studentId').value=s?.id||'';$('#formTitle').textContent=s?'Editar alumno':'Nuevo alumno';$('#studentName').value=s?.name||'';$('#studentCourse').innerHTML=courseOptions(s?.course);$('#studentCourse').value=s?.course||$('#studentCourse').options[0]?.value||'';$('#studentAddress').value=s?.address||'';formContacts=s?contactsOf(s).map(c=>({name:c.name||'',phone:c.phone||'',relation:c.relation||''})):[];while(formContacts.length<2)formContacts.push({name:'',phone:'',relation:''});renderContactBlocks();$('#studentEntry').value=s?.entry||data.entries[0];$('#studentExit').value=s?.exit||data.exits[0];renderStudentExitByDay(s?.exitByDay||{});$$('#studentDays input').forEach(c=>c.checked?s?.days?c.checked=s.days.includes(+c.value):true:c.checked=false);$('#studentForm').scrollIntoView({behavior:'smooth',block:'start'})}
function editStudent(id){openStudentForm(data.students.find(s=>s.id===id))}
$('#addStudent').onclick=()=>openStudentForm(null);$('#cancelStudent').onclick=()=>$('#studentForm').classList.add('hidden');$('#studentSearch').oninput=renderStudents;
$('#studentForm').onsubmit=e=>{e.preventDefault();let id=$('#studentId').value;let s={id:id||uid(),name:$('#studentName').value.trim(),course:$('#studentCourse').value,address:$('#studentAddress').value.trim(),contacts:cleanContacts(),parent:cleanContacts()[0]?.name||'',phone:cleanContacts()[0]?.phone||'',entry:$('#studentEntry').value,exit:$('#studentExit').value,exitByDay:Object.fromEntries($$('[data-day-exit]').filter(x=>!x.disabled&&x.value).map(x=>[x.dataset.dayExit,x.value])),days:$$('#studentDays input:checked').map(c=>+c.value)};const bad=s.contacts.filter(c=>!isValidPhone(normalizePhone(c.phone)));if(bad.length&&!confirm(`Estos teléfonos no parecen celulares chilenos válidos (ej. +56 9 1234 5678), así que WhatsApp podría no abrir el chat:\n${bad.map(c=>(c.name||'Sin nombre')+' · '+(c.phone||'vacío')).join('\n')}\n\n¿Guardar de todos modos?`))return;if(id)data.students=data.students.map(x=>x.id===id?s:x);else data.students.push(s);save();$('#studentForm').classList.add('hidden');renderStudents();renderMessageStudents();toast('Alumno guardado en este dispositivo')};
function routeKind(){return $('#routeType').value}
function updateRouteSlots(){let type=routeKind();$('#slotLabel').firstChild.textContent=type==='pickup'?'Filtro de horario (opcional)':type==='dropoff'?'Confirmación de llegada':'Horario de salida';let times=type==='afternoon'?data.exits:data.entries;if(type==='afternoon'){const custom=data.students.map(s=>s.exitByDay?.[$('#routeDay').value]||s.exit).filter(Boolean);times=[...new Set([...times,...custom])].sort()}$('#routeSlot').innerHTML=(type==='pickup'?'<option value="all">Todos los horarios de ingreso</option>':'')+times.map((t,i)=>`<option value="${t}">${type==='afternoon'?'Salida':'Ingreso'} ${i+1} · ${t}</option>`).join('');if(type==='pickup')$('#routeSlot').value='all';renderRoute()}
function snap(id){const s=data.students.find(x=>x.id===id);return s?{name:s.name,course:s.course,parent:s.parent,phone:s.phone}:{}}
function eventKey(date,type,slot,id){return `${date}|${type}|${slot}|${id}`}
function getEvent(date,type,slot,id){return data.events.find(e=>e.key===eventKey(date,type,slot,id))}
function renderRoute(){if(!$('#routeList'))return;let day=+$('#routeDay').value||0,date=dateForDay(day),type=routeKind(),slot=$('#routeSlot').value;let students=data.students.filter(s=>s.days.includes(day)&&(type==='pickup'?(slot==='all'||s.entry===slot):type==='afternoon'?(s.exitByDay?.[day]||s.exit)===slot:s.entry===slot));let order=data.manualOrder.filter(id=>students.some(s=>s.id===id));students.sort((a,b)=>{let ai=order.indexOf(a.id),bi=order.indexOf(b.id);if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return -1;return ai-bi}if(type==='pickup'&&slot==='all'&&a.entry!==b.entry)return a.entry.localeCompare(b.entry);return a.name.localeCompare(b.name,'es')});let done=students.filter(s=>getEvent(date,type,slot,s.id)?.done).length;$('#routeSummary').textContent=`${DAYS[day]} ${prettyDate(date)} · ${slot||'sin horario'} · ${done} de ${students.length} completados`;$('#routeList').innerHTML=students.length?students.map((s,i)=>{let ev=getEvent(date,type,slot,s.id),checked=!!ev?.done;return `<label class="route-card ${checked?'done':''}"><span class="route-index">${i+1}</span><div class="grow"><strong>${esc(s.name)}</strong><small>${esc(s.course)} · ${esc(s.address||'Dirección pendiente')}<br>${type==='afternoon'?'Apoderado: ':'Contacto: '}${esc(s.parent)} · ${esc(s.phone)}${contactsOf(s).length>1?' (+'+(contactsOf(s).length-1)+' más)':''}</small></div><input type="checkbox" data-check="${s.id}" ${checked?'checked':''} aria-label="Marcar ${esc(s.name)}"></label>`}).join(''):'<div class="empty">No hay alumnos asignados a este horario y día. Revisa sus fichas o agrega alumnos de ejemplo desde Configuración.</div>';$$('[data-check]').forEach(c=>c.onchange=()=>{let key=eventKey(date,type,slot,c.dataset.check),old=data.events.find(e=>e.key===key);if(old){old.done=c.checked;old.at=c.checked?new Date().toISOString():null}else data.events.push({key,date,day,type,slot,id:c.dataset.check,...snap(c.dataset.check),done:c.checked,at:c.checked?new Date().toISOString():null,synced:false});save();renderRoute()});updateStats()}
const DEFAULT_ARRIVAL='Hola, le informamos que [ALUMNO] ya llegó al colegio y se encuentra en el establecimiento educacional. ¡Que tenga un excelente día!';
function arrivalMessageText(student){return (data.arrivalText||DEFAULT_ARRIVAL).replaceAll('[ALUMNO]',student.name)}
function msgKey(date,id,i){return `${date}|msg|arrival|${id}-${i}`}
function renderArrival(){
 const day=+$('#routeDay').value||0,date=dateForDay(day);
 const list=data.students.filter(s=>s.days.includes(day)&&data.events.some(e=>e.date===date&&e.type==='pickup'&&e.id===s.id&&e.done)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 $('#arrivalIntro').textContent=`${DAYS[day]} ${prettyDate(date)} · ${list.length} alumno${list.length===1?'':'s'} retirado${list.length===1?'':'s'} en casa. Pulsa “Enviar” junto a cada apoderado: se abre WhatsApp con el mensaje listo y tú confirmas el envío allí.`;
 $('#arrivalList').innerHTML=list.length?list.map(s=>`<article class="student-card arrival-card"><div class="grow"><strong>${esc(s.name)}</strong><small>${esc(s.course)}</small>${contactsOf(s).map((c,i)=>{const sent=data.events.find(e=>e.key===msgKey(date,s.id,i)&&e.done);return `<div class="arrival-contact ${sent?'sent':''}"><div class="grow"><b>${esc(c.name||'Apoderado '+(i+1))}${c.relation?' ('+esc(c.relation)+')':''}</b><small>${esc(c.phone)}${sent?' · ✔ WhatsApp abierto a las '+hhmm(sent.at):''}</small></div><button class="primary" data-send="${s.id}" data-i="${i}">${sent?'Abrir de nuevo':'Enviar'}</button></div>`}).join('')}</div></article>`).join(''):'<div class="empty">Todavía no hay alumnos marcados como retirados en casa para este día. Marca primero la nómina de retiro.</div>';
 $$('[data-send]').forEach(btn=>btn.onclick=()=>sendArrival(btn.dataset.send,+btn.dataset.i,date))}
function sendArrival(id,i,date){
 const s=data.students.find(x=>x.id===id),c=s&&contactsOf(s)[i];if(!c)return;
 const phone=normalizePhone(c.phone);if(!isValidPhone(phone)){toast(`Teléfono no válido para WhatsApp: ${c.name||'apoderado'} (${c.phone||'vacío'})`);return}
 const key=msgKey(date,id,i),at=new Date().toISOString();let ev=data.events.find(e=>e.key===key);
 if(ev){ev.done=true;ev.at=at}else data.events.push({key,date,day:+$('#routeDay').value||0,type:'msg',slot:'arrival',id,done:true,at,name:s.name,course:s.course,parent:c.name,phone:c.phone});
 save();renderArrival();
 window.open(`https://wa.me/${phone}?text=${encodeURIComponent(arrivalMessageText(s))}`,'_blank','noopener')}
function openArrivalPanel(scroll){$('#arrivalPanel').classList.remove('hidden');$('#arrivalText').value=data.arrivalText||DEFAULT_ARRIVAL;renderArrival();localStorage.setItem('rutaArrivalOpen',isoDate(new Date()));if(scroll)$('#arrivalPanel').scrollIntoView({behavior:'smooth',block:'start'})}
function refreshArrival(){if($('#arrivalPanel')&&!$('#arrivalPanel').classList.contains('hidden'))renderArrival()}
function restoreArrival(){if(localStorage.getItem('rutaArrivalOpen')===isoDate(new Date())){showView('routes');openArrivalPanel(false)}}
$('#arrivalMessage').onclick=()=>openArrivalPanel(true);
$('#closeArrival').onclick=()=>{$('#arrivalPanel').classList.add('hidden');localStorage.removeItem('rutaArrivalOpen')};
$('#arrivalText').oninput=e=>{data.arrivalText=e.target.value;save()};
$('#arrivalTextReset').onclick=()=>{delete data.arrivalText;$('#arrivalText').value=DEFAULT_ARRIVAL;save();toast('Mensaje restablecido')};
const _renderRoute=renderRoute;renderRoute=function(){_renderRoute();refreshArrival()};
$('#routeDay').onchange=renderRoute;$('#routeType').onchange=updateRouteSlots;$('#routeSlot').onchange=renderRoute;$('#resetRoute').onclick=()=>{if(!confirm('¿Restablecer las marcas de esta lista?'))return;let d=+$('#routeDay').value,type=routeKind(),slot=$('#routeSlot').value;data.events=data.events.filter(e=>!(e.date===dateForDay(d)&&e.type===type&&e.slot===slot));save();renderRoute();toast('Marcas restablecidas')};
function renderTimes(){ $('#entryTimes').innerHTML=data.entries.map((t,i)=>`<div class="time-row"><b>Ingreso ${i+1}</b><input type="time" value="${t}" data-entry="${i}"><button data-remove-entry="${i}">✕</button></div>`).join('');$('#exitTimes').innerHTML=data.exits.map((t,i)=>`<div class="time-row"><b>Salida ${i+1}</b><input type="time" value="${t}" data-exit="${i}"><button data-remove-exit="${i}">✕</button></div>`).join('');$$('[data-remove-entry]').forEach(b=>b.onclick=()=>{if(data.entries.length===1)return toast('Debe existir al menos un horario');data.entries.splice(+b.dataset.removeEntry,1);renderTimes()});$$('[data-remove-exit]').forEach(b=>b.onclick=()=>{if(data.exits.length===1)return toast('Debe existir al menos un horario');data.exits.splice(+b.dataset.removeExit,1);renderTimes()})}
$('#addEntry').onclick=()=>{data.entries.push('09:00');renderTimes()};$('#addExit').onclick=()=>{data.exits.push('17:00');renderTimes()};$('#saveTimes').onclick=()=>{data.entries=$$('[data-entry]').map(x=>x.value).sort();data.exits=$$('[data-exit]').map(x=>x.value).sort();save();initFormOptions();updateRouteSlots();toast('Horarios guardados')};
function renderMessageStudents(){let sel=$('#messageStudent');if(!sel)return;sel.innerHTML=data.students.flatMap(s=>contactsOf(s).map((c,i)=>`<option value="${s.id}|${i}">${esc(s.name)} → ${esc(c.name||'Apoderado')}</option>`)).join('');if(!sel.innerHTML)sel.innerHTML='<option value="">No hay alumnos registrados</option>'}
$('#openWhatsApp').onclick=()=>{const[sid,ci]=($('#messageStudent').value||'').split('|');const s=data.students.find(x=>x.id===sid),c=s&&contactsOf(s)[+ci||0];if(!c)return toast('Registra o selecciona un alumno primero');let text=$('#messageText').value.replaceAll('[ALUMNO]',s.name);let phone=normalizePhone(c.phone);if(!isValidPhone(phone))return toast(`Teléfono no válido para WhatsApp: ${c.phone||'vacío'}`);$('#messageStatus').textContent=`Mensaje preparado para ${c.name} (${c.phone}). Se abrió WhatsApp; confirma el envío allí.`;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');toast('Mensaje preparado en WhatsApp')};
function updateStats(){const real=isoDate(new Date()),weekday=![0,6].includes(new Date().getDay()),d=todayIndex(),done=data.events.filter(e=>e.date===real&&e.type==='pickup'&&e.done).length;$('#statStudents').textContent=data.students.length;$('#statDone').textContent=done;$('#statPending').textContent=weekday?Math.max(0,data.students.filter(s=>s.days.includes(d)).length-done):0}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#loadDemo').onclick=()=>{if(data.students.length&&!confirm('Se añadirán alumnos de ejemplo a los datos actuales. ¿Continuar?'))return;let names=[['Sofía Ramírez','1° Básico','María López','+56912345678','Av. Los Pinos 123','07:30','13:00'],['Mateo González','2° Básico','Carlos González','+56987654321','Los Aromos 245','07:30','13:00'],['Valentina Torres','3° Básico','Jorge Torres','+56911223344','Pasaje El Sol 42','08:00','14:00'],['Lucas Pérez','4° Básico','Paula Pérez','+56922334455','Calle Norte 88','08:00','15:00'],['Emilia Castro','5° Básico','Andrés Castro','+56933445566','Los Robles 12','08:30','15:00'],['Benjamín Silva','6° Básico','Claudia Silva','+56944556677','Las Flores 65','08:30','16:00']];names.forEach(a=>data.students.push({id:uid(),name:a[0],course:a[1],parent:a[2],phone:a[3],contacts:[{name:a[2],phone:a[3],relation:''}],address:a[4],entry:a[5],exit:a[6],days:[0,1,2,3,4]}));save();renderStudents();renderMessageStudents();initFormOptions();toast('Se añadieron 6 alumnos ficticios')};
$('#clearData').onclick=()=>{if(!confirm('Esto borrará alumnos, horarios personalizados y registros de este dispositivo. ¿Continuar?'))return;data=structuredClone(DEFAULTS);save();initFormOptions();renderStudents();renderTimes();renderMessageStudents();renderRoute();renderCourseToggles();renderArchive();toast('Datos locales borrados')};
$('#exportData').onclick=()=>{let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='respaldo-ruta-escolar.json';a.click();URL.revokeObjectURL(url);toast('Respaldo descargado')};
$('#importData').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{let imported=JSON.parse(await file.text());if(!Array.isArray(imported.students)||!Array.isArray(imported.entries)||!Array.isArray(imported.exits))throw Error('Formato incorrecto');data=migrate({...structuredClone(DEFAULTS),...imported});save();renderCourseToggles();renderArchive();initFormOptions();renderStudents();renderTimes();renderMessageStudents();renderRoute();toast('Respaldo importado correctamente')}catch{toast('No se pudo importar: archivo inválido')}e.target.value=''};

// Importación de contactos: Contact Picker API (navegadores compatibles) y archivo vCard (.vcf).
function decodeVCardValue(value=''){
 return value.replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();
}
function parseVCard(text){
 const cards=text.replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'').split(/BEGIN:VCARD/i).slice(1);
 return cards.map(block=>{
  const lines=block.split(/\r?\n/);let name='',phone='';
  for(const line of lines){
   const idx=line.indexOf(':');if(idx<0)continue;
   const key=line.slice(0,idx).toUpperCase(),value=decodeVCardValue(line.slice(idx+1));
   if(!name&&(key.startsWith('FN')||key.startsWith('N;')||key==='N')){
    if(key.startsWith('FN'))name=value;
    else {const parts=value.split(';').filter(Boolean);name=[parts[1],parts[0],parts.slice(2).join(' ')].filter(Boolean).join(' ')}
   }
   if(!phone&&key.startsWith('TEL')&&value)phone=value;
  }
  return {name,phone};
 }).filter(c=>c.name||c.phone);
}
let formContacts=[];
function cleanContacts(){return formContacts.filter(c=>c.name.trim()||c.phone.trim()).map(c=>({name:c.name.trim(),phone:formatPhone(c.phone),relation:(c.relation||'').trim()}))}
function renderContactBlocks(){
 $('#contactBlocks').innerHTML=formContacts.map((c,i)=>`<div class="contact-block"><div class="contact-head"><b>${i===0?'Apoderado principal':'Apoderado '+(i+1)}</b>${i>1?`<button type="button" class="icon-btn" data-rmc="${i}" aria-label="Quitar apoderado ${i+1}">✕</button>`:''}</div><label>Nombre<input data-c="name" data-i="${i}" value="${esc(c.name)}" ${i===0?'required':''} placeholder="Nombre y apellido"></label><div class="formgrid"><label>Teléfono<input data-c="phone" data-i="${i}" type="tel" value="${esc(c.phone)}" ${i===0?'required':''} placeholder="+56 9 1234 5678"></label><label>Parentesco (opcional)<input data-c="relation" data-i="${i}" value="${esc(c.relation||'')}" placeholder="Mamá, papá, abuela…"></label></div><div class="contact-tools"><button type="button" class="secondary" data-pick="${i}">♙ Elegir del teléfono</button><label class="secondary import-contact-label">Importar contacto (.vcf)<input type="file" data-vcf="${i}" accept=".vcf,text/vcard,text/x-vcard" hidden></label></div></div>`).join('');
 $$('[data-c]').forEach(inp=>inp.oninput=()=>{formContacts[+inp.dataset.i][inp.dataset.c]=inp.value});
 $$('[data-rmc]').forEach(btn=>btn.onclick=()=>{formContacts.splice(+btn.dataset.rmc,1);renderContactBlocks()});
 $$('[data-pick]').forEach(btn=>btn.onclick=()=>pickContactFor(+btn.dataset.pick));
 $$('[data-vcf]').forEach(inp=>inp.onchange=e=>importVcfFor(+inp.dataset.vcf,e));
 $('#addContact').classList.toggle('hidden',formContacts.length>=4)}
$('#addContact').onclick=()=>{if(formContacts.length<4){formContacts.push({name:'',phone:'',relation:''});renderContactBlocks()}};
function applyImportedContact(i,contact){
 if(!contact.name&&!contact.phone){toast('No se encontró nombre ni teléfono en el contacto');return}
 if(contact.name)formContacts[i].name=contact.name;
 if(contact.phone)formContacts[i].phone=formatPhone(contact.phone.replace(/^tel:/i,''));
 renderContactBlocks();toast('Contacto importado. Revisa los datos antes de guardar.');
}
async function pickContactFor(i){
 try{
  if(navigator.contacts&&typeof navigator.contacts.select==='function'){
   const contacts=await navigator.contacts.select(['name','tel'],{multiple:false});
   if(contacts&&contacts.length)applyImportedContact(i,{name:contacts[0].name?.[0]||'',phone:contacts[0].tel?.[0]||''});
  }else{toast('Este navegador no permite abrir la agenda directamente. Usa “Importar contacto (.vcf)”.');$(`[data-vcf="${i}"]`).click()}
 }catch(err){if(err?.name!=='AbortError')toast('No se pudo abrir la agenda. Prueba importando un archivo .vcf.')}
}
async function importVcfFor(i,e){
 const file=e.target.files?.[0];if(!file)return;
 try{
  const contacts=parseVCard(await file.text());
  if(!contacts.length)throw new Error('Sin contactos');
  let chosen=contacts[0];
  if(contacts.length>1){
   const options=contacts.map((c,k)=>`${k+1}. ${c.name||'Sin nombre'}${c.phone?' — '+c.phone:''}`).join('\n');
   const answer=prompt('El archivo contiene varios contactos. Escribe el número del contacto que deseas importar:\n'+options,'1');
   if(answer===null)return;
   const index=Number(answer)-1;if(!Number.isInteger(index)||index<0||index>=contacts.length){toast('Selección no válida');return}chosen=contacts[index];
  }
  applyImportedContact(i,chosen);
 }catch(err){toast('No se pudo leer el archivo. Exporta el contacto en formato vCard (.vcf).')}
 finally{e.target.value=''}
}

// ---------- Cursos habilitados ----------
function courseOptions(current){const off=data.disabledCourses||[];return COURSES.filter(c=>!off.includes(c)||c===current).map(c=>`<option>${esc(c)}</option>`).join('')}
function renderCourseToggles(){const el=$('#courseToggles');if(!el)return;const off=data.disabledCourses||[];el.innerHTML=COURSES.map(c=>`<label class="daycheck"><input type="checkbox" data-course="${esc(c)}" ${off.includes(c)?'':'checked'}>${esc(c)}</label>`).join('');$$('[data-course]').forEach(i=>i.onchange=()=>{const next=COURSES.filter(c=>c===i.dataset.course?!i.checked:(data.disabledCourses||[]).includes(c));if(next.length>=COURSES.length){i.checked=true;return toast('Debe quedar al menos un curso habilitado')}data.disabledCourses=next;save();initFormOptions()})}

// ---------- Archivo mensual en PDF (AAAAMM.pdf) ----------
const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const TYPE_LABEL={pickup:'Retiro en casa',dropoff:'Llegada al colegio',afternoon:'Retiro del colegio',msg:'Aviso de llegada (WhatsApp abierto)'};
function monthLabel(ym){const[y,m]=ym.split('-');return `${MONTHS[+m-1]} ${y}`}
function currentMonth(){return isoDate(new Date()).slice(0,7)}
function longDate(iso){const[y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d))}
function hhmm(iso){if(!iso)return '--:--';const d=new Date(iso);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function wrapLine(text,width=98,indent='        '){const out=[];let line=String(text);while(line.length>width){let cut=line.lastIndexOf(' ',width);if(cut<20)cut=width;out.push(line.slice(0,cut));line=indent+line.slice(cut).trimStart()}out.push(line);return out}
function monthReportLines(ym){
 const ev=data.events.filter(e=>e.done&&e.date.startsWith(ym)).sort((a,b)=>a.date.localeCompare(b.date)||(a.at||'').localeCompare(b.at||''));
 const L=[{t:`RUTA ESCOLAR - REGISTRO DE ${monthLabel(ym).toUpperCase()}`,b:1},{t:`Archivo ${ym.replace('-','')}.pdf - generado el ${new Date().toLocaleString('es-CL')}`},{t:'Cada linea: hora de la marca, ruta, horario, alumno, curso y apoderado.'},{t:''}];
 let last='';const totals={},days=new Set();
 ev.forEach(e=>{
  if(e.date!==last){last=e.date;L.push({t:''},{t:longDate(e.date),b:1})}
  const st=data.students.find(s=>s.id===e.id),name=st?.name||e.name||'(alumno eliminado)',course=st?.course||e.course||'',parent=e.type==='msg'?(e.parent||''):(st?.parent||e.parent||''),phone=e.type==='msg'?(e.phone||''):(st?.phone||e.phone||'');
  totals[e.type]=(totals[e.type]||0)+1;days.add(e.date);
  wrapLine(`${hhmm(e.at)}  ${TYPE_LABEL[e.type]||e.type}${e.slot&&e.slot!=='all'&&e.type!=='msg'?' '+e.slot:''}  ${name}${course?' ('+course+')':''}${parent?'  Apod.: '+parent:''}${phone?' '+phone:''}`).forEach(t=>L.push({t}));
 });
 L.push({t:''},{t:'RESUMEN',b:1},{t:`Dias con actividad: ${days.size}`});
 Object.entries(totals).forEach(([k,v])=>L.push({t:`${TYPE_LABEL[k]||k}: ${v} marcas`}));
 if(!ev.length)L.push({t:'Sin registros en este mes.'});
 return L}
// Generador mínimo de PDF (texto, Courier, A4). Sin librerías externas: funciona sin conexión.
function makePdf(lines){
 const clean=t=>String(t).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[^\x20-\x7E\xA0-\xFF]/g,'?');
 const esc2=t=>clean(t).replace(/([\\()])/g,'\\$1');
 const PER=60,pages=[];for(let i=0;i<lines.length;i+=PER)pages.push(lines.slice(i,i+PER));if(!pages.length)pages.push([]);
 const objs=['<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>'];
 const kids=[];
 pages.forEach((pg,i)=>{
  let c='BT /F1 8.5 Tf 12 TL 40 802 Td\n';
  pg.forEach(l=>{c+=l.t?`/${l.b?'F2':'F1'} 8.5 Tf (${esc2(l.t)}) Tj T*\n`:'T*\n'});
  c+=`ET\nBT /F1 8 Tf 40 22 Td (Pagina ${i+1} de ${pages.length}) Tj ET`;
  const cn=objs.length+1,pn=cn+1;
  objs.push(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
  objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cn} 0 R >>`);
  kids.push(`${pn} 0 R`);
 });
 objs[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
 let out='%PDF-1.4\n';const offs=[];
 objs.forEach((b,i)=>{offs.push(out.length);out+=`${i+1} 0 obj\n${b}\nendobj\n`});
 const xref=out.length;
 out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Blob([Uint8Array.from(out,ch=>ch.charCodeAt(0)&255)],{type:'application/pdf'})}
// En iPhone se abre la hoja "Compartir" (Guardar en Archivos); en otros equipos se descarga directo.
async function saveMonthPdf(ym){
 const blob=makePdf(monthReportLines(ym)),name=ym.replace('-','')+'.pdf',file=new File([blob],name,{type:'application/pdf'});
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return true}}catch(e){if(e&&e.name==='AbortError')return false}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);return true}
function archiveMonths(){const m={};data.events.forEach(e=>{const k=e.date.slice(0,7);m[k]=(m[k]||0)+(e.done?1:0)});return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]))}
function renderArchive(){
 const cur=currentMonth(),months=archiveMonths(),pending=months.filter(([k,n])=>k<cur&&n>0);
 const list=$('#archiveList');
 if(list){list.innerHTML=months.length?months.map(([k,n])=>`<div class="archive-row"><div class="grow"><strong>${esc(monthLabel(k))}</strong><small>${n} registros · ${k.replace('-','')}.pdf · ${k<cur?'listo para archivar':'mes en curso'}</small></div><button class="secondary" data-archive="${k}">Generar PDF</button></div>`).join(''):'<p class="muted">Aún no hay registros para archivar.</p>';
  $$('[data-archive]').forEach(b=>b.onclick=async()=>{const k=b.dataset.archive,ok=await saveMonthPdf(k);if(!ok)return;if(k<currentMonth()){if(confirm(`¿Guardaste ${k.replace('-','')}.pdf correctamente?\n\nAceptar: quitar los registros de ${monthLabel(k)} de la app para liberar espacio.\nCancelar: dejarlos en la app.`)){data.events=data.events.filter(e=>!e.date.startsWith(k));save();renderArchive();toast(`Registros de ${monthLabel(k)} archivados`)}}else toast('PDF generado. El mes sigue en curso: no se quitan registros.')})}
 const n=$('#archiveNotice');if(n){n.classList.toggle('hidden',!pending.length);$('#archiveNoticeText').textContent=pending.length?`Hay registros de ${pending.map(([k])=>monthLabel(k)).join(', ')} listos para guardar en PDF.`:''}}

// ---------- Versión, actualizaciones y autorización del teléfono ----------
const APP_VERSION='2.2';
const CORE_FILES=['./','./index.html','./styles.css','./licencia.js','./app.js'],EXTRA_FILES=['./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
$('#appVersion').textContent=APP_VERSION;
let swReg=null,waitingWorker=null,applyingUpdate=false;
function deviceId(){let id=localStorage.getItem('rutaEscolarDevice');if(!id){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=crypto.getRandomValues(new Uint8Array(10));id=[...b].map(x=>A[x%32]).join('').replace(/(.{5})(.{5})/,'$1-$2');localStorage.setItem('rutaEscolarDevice',id)}return id}
const b64uToBytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function verifyActivation(code){try{const key=await crypto.subtle.importKey('jwk',LICENSE_PUBLIC_KEY,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);return await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,b64uToBytes(String(code).replace(/\s/g,'')),new TextEncoder().encode('RUTA-ESCOLAR|'+deviceId()))}catch{return false}}
async function checkLicense(){
 const lock=$('#lock'),st=$('#licenseStatus');$('#deviceId').textContent=$('#deviceIdSettings').textContent=deviceId();
 if(typeof LICENSE_PUBLIC_KEY==='undefined'){lock.classList.remove('hidden');$('#lockMsg').textContent='Falta el archivo licencia.js en la publicación de la app. Avisa a quien la administra.';st.textContent='Falta licencia.js.';return false}
 if(!LICENSE_PUBLIC_KEY){lock.classList.add('hidden');st.textContent='Modo sin protección: el propietario aún no configuró su clave, así que cualquier teléfono podría usar esta copia.';return true}
 const ok=await verifyActivation(localStorage.getItem('rutaEscolarActivation')||'');lock.classList.toggle('hidden',ok);st.textContent=ok?'✔ Este teléfono está autorizado por el propietario.':'Este teléfono no está autorizado.';return ok}
$('#copyDevice').onclick=async()=>{try{await navigator.clipboard.writeText(deviceId());toast('Código de dispositivo copiado')}catch{toast('Selecciona y copia el código manualmente')}};
$('#activate').onclick=async()=>{const code=$('#activationCode').value.trim();if(!code){$('#lockMsg').textContent='Pega primero el código de activación.';return}
 if(await verifyActivation(code)){localStorage.setItem('rutaEscolarActivation',code);$('#activationCode').value='';$('#lockMsg').textContent='';await checkLicense();toast('Teléfono activado')}
 else $('#lockMsg').textContent='Ese código no corresponde a este teléfono. Revisa que lo hayas copiado completo y que el código de dispositivo enviado sea el que aparece arriba.'};
function showUpdateReady(w){waitingWorker=w;$('#updateStatus').textContent='Hay una versión nueva lista para instalar. Tus datos no se modifican.';$('#applyUpdate').classList.remove('hidden');toast('Hay una versión nueva: Más → Versión y actualizaciones')}
function watchRegistration(reg){if(reg.waiting&&navigator.serviceWorker.controller)showUpdateReady(reg.waiting);reg.addEventListener('updatefound',()=>{const nw=reg.installing;if(nw)nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller)showUpdateReady(nw)})})}
async function initUpdates(){
 try{swReg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});watchRegistration(swReg);if(navigator.onLine)swReg.update().catch(()=>{})}catch{}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applyingUpdate)location.reload()})}
$('#checkUpdate').onclick=async()=>{const st=$('#updateStatus');
 if(!swReg){st.textContent='Las actualizaciones solo funcionan cuando la app se abre desde su dirección https.';return}
 if(!navigator.onLine){st.textContent='Sin conexión: no se pudo comprobar. La app sigue funcionando con la versión instalada.';return}
 st.textContent='Buscando actualizaciones…';
 try{await swReg.update();const w=swReg.installing||swReg.waiting;if(w&&w.state!=='installed'&&w.state!=='activated')await new Promise(r=>w.addEventListener('statechange',()=>{if(w.state==='installed'||w.state==='redundant')r()}));
  if(swReg.waiting&&navigator.serviceWorker.controller)showUpdateReady(swReg.waiting);else st.textContent=`Ya tienes la última versión (${APP_VERSION}).`}
 catch{st.textContent='No se pudo comprobar ahora (¿sin señal o sin acceso a la dirección?). Intenta de nuevo más tarde.'}};
async function runDiagnostic(target){const out=[],name='ruta-escolar-'+APP_VERSION,reg='serviceWorker' in navigator?await navigator.serviceWorker.getRegistration():null;
 out.push(`Dirección: ${location.href}`,`Conexión segura (https): ${location.protocol==='https:'||location.hostname==='localhost'?'sí':'NO'}`,`Service worker: ${reg?(reg.active?'activo':reg.installing?'instalando…':reg.waiting?'en espera':'sin activar'):'NO registrado'}`);
 let miss=[];try{if(await caches.has(name)){const c=await caches.open(name);for(const f of [...CORE_FILES,...EXTRA_FILES])if(!(await c.match(f)))miss.push(f)}else miss=[...CORE_FILES,...EXTRA_FILES]}catch{miss=['(no se pudo leer la memoria del teléfono)']}
 const total=CORE_FILES.length+EXTRA_FILES.length,missCore=miss.filter(f=>CORE_FILES.includes(f));
 out.push(`Archivos guardados en el teléfono: ${total-miss.length} de ${total}`);if(miss.length)out.push('Faltan: '+miss.join(', '));
 out.push(missCore.length?'✖ Todavía NO funciona sin internet. Falta subir esos archivos a la publicación y volver a abrir la app con internet.':(reg&&reg.active?'✔ Lista para funcionar sin internet.'+(miss.length?' (Faltan solo archivos secundarios, como íconos.)':''):'⏳ Archivos guardados, pero el service worker aún no está activo. Cierra la app, ábrela de nuevo con internet y repite.'));
 target.textContent=out.join('\n')}
$('#runDiag').onclick=()=>runDiagnostic($('#diagOut'));$('#runDiagLock').onclick=()=>runDiagnostic($('#diagOutLock'));
$('#applyUpdate').onclick=()=>{if(!waitingWorker)return;applyingUpdate=true;$('#updateStatus').textContent='Instalando…';waitingWorker.postMessage({type:'SKIP_WAITING'})};

function startPickupRoute(){ $('#routeType').value='pickup'; updateRouteSlots(); showView('routes'); $('#routeSlot').value='all'; renderRoute(); $('#routeSummary').scrollIntoView({behavior:'smooth',block:'start'}); }
$('#startPickup').onclick=startPickupRoute;
$('#startPickupRoute').onclick=startPickupRoute;
$('#routeDay').addEventListener('change',updateRouteSlots);
function init(){ checkLicense();$('#todayLabel').textContent=dateText();initFormOptions();updateRouteSlots();renderStudents();renderTimes();renderMessageStudents();renderCourseToggles();renderArchive();updateStats();restoreArrival();$('#connection').innerHTML=navigator.onLine?'● Conectado':'● Sin conexión';window.addEventListener('online',()=>$('#connection').innerHTML='● Conectado');window.addEventListener('offline',()=>$('#connection').innerHTML='● Sin conexión');if('serviceWorker'in navigator&&location.protocol!=='file:'){initUpdates()}}
init();
