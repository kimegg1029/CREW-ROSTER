(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = "crew-roster-events-v1";
  const THEME_KEY = "crew-roster-theme";
  const TYPES = {
    flight:{label:"비행",color:"#e46b68"}, NS:{label:"해외체류",color:"#8c9bd8"},
    DO:{label:"휴무",color:"#63a78c"}, RDO:{label:"지정 OFF",color:"#63a78c"},
    PV:{label:"생리휴가",color:"#b58acb"}, SANLV:{label:"본사 교육",color:"#d5a34d"},
    STBY:{label:"본사대기",color:"#d5a34d"}, DH:{label:"항공이동",color:"#8aa6b8"},
    personal:{label:"개인 일정",color:"#d5a34d"}, unknown:{label:"미확인",color:"#9aa0a8"}
  };
  let events = loadEvents(), viewDate = new Date(), editingId = null;
  function isDate(value){
    return typeof value==="string" && value.length===10 && value[4]==="-" && value[7]==="-";
  }
  function loadEvents(){
    try {
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      if(!Array.isArray(value)) return [];
      return value.filter(event=>event && typeof event==="object" &&
        typeof event.id==="string" && isDate(event.start) && isDate(event.end) &&
        event.end>=event.start && typeof event.title==="string"
      ).map(event=>({
        ...event,
        type:TYPES[event.type]?event.type:"unknown",
        showUp:event.showUp||"",
        color:event.color||TYPES[event.type]?.color||TYPES.unknown.color
      }));
    } catch { return []; }
  }
  function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(events))}
  function iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
  function parseDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function render(){
    $("monthLabel").textContent=viewDate.toLocaleDateString("ko-KR",{year:"numeric",month:"long"});
    const y=viewDate.getFullYear(),m=viewDate.getMonth(),daysInMonth=new Date(y,m+1,0).getDate();
    const monthKey=iso(new Date(y,m,1)).slice(0,7);
    const monthEvents=events.filter(e=>e.start.slice(0,7)===monthKey||e.end.slice(0,7)===monthKey||(e.start<monthKey+"-01"&&e.end>=monthKey+"-01"));
    $("eventCount").textContent="등록된 일정 "+monthEvents.length+"개";
    const today=iso(new Date()), weekdays=["일","월","화","수","목","금","토"];
    $("rosterBody").innerHTML=Array.from({length:daysInMonth},(_,i)=>{
      const d=new Date(y,m,i+1),key=iso(d),list=events.filter(e=>e.start<=key&&e.end>=key).sort((a,b)=>a.start.localeCompare(b.start));
      const first=list[0], rowColor=first?(first.color||TYPES[first.type]?.color||TYPES.unknown.color):"transparent";
      const showups=list.filter(e=>e.type==="flight"&&e.showUp&&e.start===key).map(e=>escapeHtml(e.showUp)).join("<br>");
      const schedule=list.map(e=>{
        const label=e.type==="flight"?e.title:(TYPES[e.type]?.label||e.title||"일정");
        return '<button type="button" class="schedule-item '+(e.type==="flight"?"":"nonflight")+'" data-event="'+escapeHtml(e.id)+'" title="'+escapeHtml(e.note||label)+'">'+escapeHtml(label)+'</button>';
      }).join("");
      const dayClass=d.getDay()===0?"sunday":d.getDay()===6?"saturday":"";
      return '<tr class="'+dayClass+(key===today?" today":"")+(list.length?" has-event":"")+'" style="--row-color:'+escapeHtml(rowColor)+'">'+
        '<td class="date-cell">'+(m+1)+"/"+(i+1)+'</td><td class="day-cell">'+weekdays[d.getDay()]+'</td>'+
        '<td><div class="schedule-list">'+(schedule||'<span class="empty-mark">—</span>')+'</div></td>'+
        '<td class="showup">'+(showups||'<span class="empty-mark">—</span>')+'</td></tr>';
    }).join("");
  }
  function updateShowUpVisibility(){ $("showUpField").hidden=$("eventType").value!=="flight"; }
  function openEditor(date,event){
    editingId=event?.id||null;
    $("dialogTitle").textContent=event?"일정 수정":"일정 추가";
    $("eventType").value=event?.type||"flight"; $("eventTitle").value=event?.title||"";
    $("showUpTime").value=event?.showUp||"";
    $("startDate").value=event?.start||date||iso(new Date()); $("endDate").value=event?.end||date||iso(new Date());
    $("eventNote").value=event?.note||""; $("eventColor").value=event?.color||TYPES[$("eventType").value]?.color||TYPES.unknown.color;
    $("deleteEvent").hidden=!event; updateShowUpVisibility(); $("eventDialog").showModal();
  }
  $("rosterBody").addEventListener("click",e=>{
    const item=e.target.closest("[data-event]");
    if(item){const found=events.find(x=>x.id===item.dataset.event);if(found)openEditor(found.start,found);return}
    const row=e.target.closest("tr");if(row){const dateCell=row.querySelector(".date-cell");if(dateCell){const [mm,dd]=dateCell.textContent.split("/").map(Number);openEditor(iso(new Date(viewDate.getFullYear(),mm-1,dd)))}}
  });
  $("eventType").addEventListener("change",()=>{$("eventColor").value=TYPES[$("eventType").value]?.color||TYPES.unknown.color;updateShowUpVisibility()});
  $("eventForm").addEventListener("submit",e=>{
    e.preventDefault(); const start=$("startDate").value,end=$("endDate").value;
    if(!start||!end||end<start){alert("종료일은 시작일과 같거나 이후여야 합니다.");return}
    const type=$("eventType").value;
    const data={id:editingId||((crypto.randomUUID&&crypto.randomUUID())||String(Date.now())),type,title:$("eventTitle").value.trim(),showUp:type==="flight"?$("showUpTime").value:"",start,end,note:$("eventNote").value.trim(),color:$("eventColor").value};
    if(!data.title){alert(type==="flight"?"편명을 입력해 주세요.":"일정명을 입력해 주세요.");return}
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
  function exportBackup(){const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),events},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="crew-roster-backup-"+iso(new Date())+".json";a.click();URL.revokeObjectURL(url)}
  $("backupButton").addEventListener("click",exportBackup);
  $("backupButton").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")exportBackup()});
  $("settingsButton").addEventListener("click",()=>$("importFile").click());
  $("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text()),incoming=Array.isArray(data)?data:data.events;if(!Array.isArray(incoming))throw new Error("format");if(!confirm("백업 일정으로 현재 일정을 교체할까요?"))return;events=incoming.filter(x=>x&&x.id&&x.start&&x.end&&x.title).map(x=>({...x,showUp:x.showUp||""}));persist();render();alert("복원했습니다.")}catch{alert("올바른 CREW ROSTER 백업 파일이 아닙니다.")}finally{e.target.value=""}});

  let selectedRosterPhoto=null;
  $("photoImportButton").addEventListener("click",()=>{
    $("photoMonth").value=iso(new Date()).slice(0,7);
    $("photoDialog").showModal();
  });
  function closePhotoDialog(){ $("photoDialog").close(); }
  $("closePhotoDialog").addEventListener("click",closePhotoDialog);
  $("closePhotoDialogBottom").addEventListener("click",closePhotoDialog);
  $("rosterPhoto").addEventListener("change",e=>{
    selectedRosterPhoto=e.target.files?.[0]||null;
    $("runOcrButton").disabled=!selectedRosterPhoto;
    $("ocrText").value=""; $("importRows").value="";
    if(selectedRosterPhoto){
      $("photoPreview").src=URL.createObjectURL(selectedRosterPhoto);
      $("photoPreview").hidden=false;
      $("ocrStatus").textContent="사진 준비 완료. 글자 인식을 시작해 줘.";
    }else{$("photoPreview").hidden=true;$("ocrStatus").textContent="사진을 선택해 줘.";}
  });
  function suggestRowsFromOcrWords(words, imageWidth, imageHeight){
    const month=$("photoMonth").value||iso(new Date()).slice(0,7);
    const [year,monthNo]=month.split("-").map(Number);
    const daysInMonth=new Date(year,monthNo,0).getDate();
    const firstWeekday=new Date(year,monthNo-1,1).getDay();
    const tokens=(words||[]).map(w=>{
      const text=String(w.text||"").trim();
      const box=w.bbox||{};
      return {text,x:((box.x0||0)+(box.x1||0))/2,y:((box.y0||0)+(box.y1||0))/2,
        top:box.y0||0,bottom:box.y1||0,confidence:Number(w.confidence||0)};
    }).filter(w=>w.text);
    // Calendar date numerals are isolated numeric OCR words. Cluster them by
    // horizontal week-row position; this preserves the original table layout.
    const anchors=tokens.filter(w=>/^\\d{1,2}$/.test(w.text)&&Number(w.text)>=1&&Number(w.text)<=31&&w.confidence>=20&&w.y<imageHeight*.82);
    anchors.sort((a,b)=>a.y-b.y);
    const groups=[];
    for(const anchor of anchors){
      let group=groups.find(g=>Math.abs(g.center-anchor.y)<imageHeight*.055);
      if(!group){group={center:anchor.y,items:[]};groups.push(group);}
      group.items.push(anchor);
      group.center=group.items.reduce((s,x)=>s+x.y,0)/group.items.length;
    }
    groups.sort((a,b)=>a.center-b.center);
    if(groups.length<3)return "";
    const allX=anchors.map(w=>w.x);
    const left=Math.min(...allX);
    const right=Math.max(...allX);
    const colWidth=(right-left)/6 || imageWidth/7;
    const output=[];
    for(let gi=0;gi<groups.length;gi++){
      const group=groups[gi];
      const bandTop=group.center-imageHeight*.012;
      const bandBottom=gi+1<groups.length?(group.center+groups[gi+1].center)/2:imageHeight;
      for(const anchor of group.items){
        const day=Number(anchor.text);
        const col=Math.max(0,Math.min(6,Math.round((anchor.x-left)/colWidth)));
        const mappedDay=gi*7+col-firstWeekday+1;
        // Use the calendar's actual grid position to exclude adjacent-month dates.
        if(mappedDay<1||mappedDay>daysInMonth)continue;
        const dateValue=year+"-"+String(monthNo).padStart(2,"0")+"-"+String(mappedDay).padStart(2,"0");
        const cellWords=tokens.filter(w=>{
          const wordCol=Math.max(0,Math.min(6,Math.floor((w.x-left)/colWidth)));
          return wordCol===col&&w.y>=bandTop&&w.y<bandBottom&&
            !(w===anchor);
        }).sort((a,b)=>a.y-b.y||a.x-b.x);
        const cellText=cellWords.map(w=>w.text).join(" ").toUpperCase();
        const flights=[...cellText.matchAll(/\\bZE\\s?\\d{2,4}\\b/g)].map(m=>m[0].replace(/\\s/g,""));
        const codes=[...cellText.matchAll(/\\b(NS|DO|RDO|PV|SANLV|STBY|DH)\\b/g)].map(m=>m[1]);
        const times=[...cellText.matchAll(/\\b([01]?\\d|2[0-3])[:.]([0-5]\\d)\\b/g)].map(m=>m[0].replace(".",":"));
        if(flights.length){
          flights.forEach((flight,i)=>output.push([dateValue,"flight",flight,times[i]||times[0]||""].join(" | ")));
        }else if(codes.length){
          [...new Set(codes)].forEach(code=>output.push([dateValue,code,code,""].join(" | ")));
        }
      }
    }
    return [...new Set(output)].join("\\n");
  }
  $("runOcrButton").addEventListener("click",async()=>{
    if(!selectedRosterPhoto)return;
    if(!window.Tesseract){$("ocrStatus").textContent="글자 인식 모듈을 불러오지 못했어. 인터넷 연결을 확인해 줘.";return;}
    $("runOcrButton").disabled=true;
    $("ocrStatus").textContent="글자 인식 준비 중…";
    let worker;
    try{
      worker=await Tesseract.createWorker("eng+kor",1,{logger:message=>{
        if(message.status==="recognizing text")$("ocrStatus").textContent="글자 인식 중… "+Math.round((message.progress||0)*100)+"%";
        else if(message.status)$("ocrStatus").textContent=message.status;
      }});
      const result=await worker.recognize(selectedRosterPhoto);
      const text=result.data.text||"";
      $("ocrText").value=text;
      const preview=$("photoPreview");
      $("importRows").value=suggestRowsFromOcrWords(result.data.words,preview.naturalWidth,preview.naturalHeight);
      $("ocrStatus").textContent="인식 완료. 원문과 일정 후보를 확인하고 필요한 부분을 수정해 줘.";
    }catch(error){
      console.error("OCR error",error);
      $("ocrStatus").textContent="인식에 실패했어. 더 선명한 사진으로 다시 시도해 줘.";
    }finally{
      if(worker)await worker.terminate().catch(()=>{});
      $("runOcrButton").disabled=!selectedRosterPhoto;
    }
  });
  $("savePhotoRows").addEventListener("click",()=>{
    const rows=$("importRows").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const imported=[];
    for(const row of rows){
      const parts=row.split("|").map(x=>x.trim());
      if(parts.length<3||!isDate(parts[0]))continue;
      const [date,typeRaw,title,showUp=""]=parts;
      const type=TYPES[typeRaw]?typeRaw:"unknown";
      if(!title)continue;
      imported.push({
        id:(crypto.randomUUID&&crypto.randomUUID())||String(Date.now()+imported.length),
        type,title,showUp:type==="flight"?showUp:"",
        start:date,end:date,note:"사진에서 가져옴",
        color:TYPES[type].color
      });
    }
    if(!imported.length){alert("등록할 일정이 없어. 후보를 날짜 | 유형 | 편명/일정 | Show-up 순서로 입력해 줘.");return;}
    if(!confirm(imported.length+"개 일정을 근무표에 추가할까?"))return;
    events.push(...imported);persist();viewDate=new Date(imported[0].start+"T12:00:00");render();closePhotoDialog();
    alert(imported.length+"개 일정을 등록했어.");
  });

  if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
  try { render(); } catch (error) { console.error("CREW ROSTER 초기화 오류:",error); $("eventCount").textContent="일정 데이터를 확인해 주세요."; }
})();