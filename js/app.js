(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "crew-roster-events-v1";
  const THEME_KEY = "crew-roster-theme";
  const TYPES = {
    flight:{label:"비행",color:"#e46b68"}, NS:{label:"해외체류",color:"#8c9bd8"},
    DO:{label:"DAY OFF",color:"#63a78c"}, RDO:{label:"지정 OFF",color:"#63a78c"},
    PV:{label:"생리휴가",color:"#b58acb"}, SANLV:{label:"본사 교육",color:"#d5a34d"},
    STBY:{label:"본사대기",color:"#d5a34d"}, DH:{label:"항공이동",color:"#8aa6b8"},
    personal:{label:"개인 일정",color:"#d5a34d"}, unknown:{label:"미확인",color:"#9aa0a8"}
  };
  let events = loadEvents();
  let viewDate = new Date();
  let editingId = null;
  function loadEvents(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
  function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(events))}
  function iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
  function parseDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function render(){
    $("monthLabel").textContent = viewDate.toLocaleDateString("ko-KR",{year:"numeric",month:"long"});
    const y=viewDate.getFullYear(),m=viewDate.getMonth();
    const first=new Date(y,m,1), offset=(first.getDay()+6)%7;
    const start=addDays(first,-offset);
    const days=Array.from({length:42},(_,i)=>addDays(start,i));
    const monthEvents=events.filter(e=>e.start.slice(0,7)===iso(first).slice(0,7)||e.end.slice(0,7)===iso(first).slice(0,7)|| (e.start<iso(first)&&e.end>=iso(first)));
    $("eventCount").textContent = "등록된 일정 "+monthEvents.length+"개";
    $("calendar").innerHTML=days.map(d=>{
      const key=iso(d), list=events.filter(e=>e.start<=key&&e.end>=key).sort((a,b)=>a.start.localeCompare(b.start));
      const chips=list.slice(0,3).map(e=>'<button class="event-chip" data-event="'+escapeHtml(e.id)+'" style="--event-color:'+escapeHtml(e.color)+'" title="'+escapeHtml(e.title)+'">'+escapeHtml(e.title)+'</button>').join("");
      return '<div class="day '+(d.getMonth()!==m?'other-month ':'')+(key===iso(new Date())?'today':'')+'" data-date="'+key+'"><div class="day-number">'+d.getDate()+'</div>'+chips+(list.length>3?'<div class="more-events">+'+(list.length-3)+'개 더</div>':"")+'</div>';
    }).join("");
  }
  function openEditor(date, event){
    editingId=event?.id||null;
    $("dialogTitle").textContent=event?"일정 수정":"일정 추가";
    $("eventType").value=event?.type||"flight";
    $("eventTitle").value=event?.title||"";
    $("startDate").value=event?.start||date||iso(new Date());
    $("endDate").value=event?.end||date||iso(new Date());
    $("eventNote").value=event?.note||"";
    $("eventColor").value=event?.color||TYPES[$("eventType").value].color;
    $("deleteEvent").hidden=!event;
    $("eventDialog").showModal();
  }
  $("calendar").addEventListener("click",e=>{
    const chip=e.target.closest("[data-event]");
    if(chip){const found=events.find(x=>x.id===chip.dataset.event);if(found)openEditor(found.start,found);return}
    const day=e.target.closest("[data-date]");
    if(day){const d=parseDate(day.dataset.date);if(d.getMonth()!==viewDate.getMonth()){viewDate=new Date(d.getFullYear(),d.getMonth(),1);render()}openEditor(day.dataset.date)}
  });
  $("eventType").addEventListener("change",()=>{$("eventColor").value=TYPES[$("eventType").value].color});
  $("eventForm").addEventListener("submit",e=>{
    e.preventDefault();
    const start=$("startDate").value,end=$("endDate").value;
    if(!start||!end||end<start){alert("종료일은 시작일과 같거나 이후여야 합니다.");return}
    const type=$("eventType").value;
    const data={id:editingId||((crypto.randomUUID&&crypto.randomUUID())||String(Date.now())),type,title:$("eventTitle").value.trim(),start,end,note:$("eventNote").value.trim(),color:$("eventColor").value};
    if(!data.title){alert("일정 이름을 입력해 주세요.");return}
    if(editingId)events=events.map(x=>x.id===editingId?data:x);else events.push(data);
    persist();$("eventDialog").close();render();
  });
  $("deleteEvent").addEventListener("click",()=>{if(!editingId)return;if(confirm("이 일정을 삭제할까요?")){events=events.filter(x=>x.id!==editingId);persist();$("eventDialog").close();render()}});
  $("closeDialog").addEventListener("click",()=>$("eventDialog").close());
  $("addButton").addEventListener("click",()=>openEditor(iso(new Date())));
  $("prevMonth").addEventListener("click",()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);render()});
  $("nextMonth").addEventListener("click",()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);render()});
  $("themeButton").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"dark":"light")});
  if(localStorage.getItem(THEME_KEY)==="dark")document.body.classList.add("dark");
  function exportBackup(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),events},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="crew-roster-backup-"+iso(new Date())+".json";a.click();URL.revokeObjectURL(url)}
  $("backupButton").addEventListener("click",exportBackup);
  $("backupButton").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")exportBackup()});
  $("settingsButton").addEventListener("click",()=>{$("importFile").click()});
  $("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());const incoming=Array.isArray(data)?data:data.events;if(!Array.isArray(incoming))throw new Error("형식");if(!confirm("백업 일정으로 현재 일정을 교체할까요?"))return;events=incoming.filter(x=>x&&x.id&&x.start&&x.end&&x.title);persist();render();alert("복원했습니다.")}catch{alert("올바른 CREW ROSTER 백업 파일이 아닙니다.")}finally{e.target.value=""}});
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
  render();
})();