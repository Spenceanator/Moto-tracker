// ============ LOG ============
var LOG_TYPES={wrench:{icon:"\u{1F527}",label:"Wrench",color:"#f59e0b",weight:15},ride:{icon:"\u{1F3CD}",label:"Ride",color:"#a855f7",weight:20},received:{icon:"\u{1F4E6}",label:"Received",color:"#22c55e",weight:2},note:{icon:"\u{1F4DD}",label:"Note",color:"#888",weight:10}};
var ACT_WEIGHTS={"task-done":15,"task-undone":1,"job-status":1,"timer-stop":0,"expense-add":1,"part-add":2,"part-status":1,"note-add":10,"note-append":5,"log-wrench":15,"log-ride":20,"log-received":2,"chat-send":1,"job-created":2,"bike-add":2};
function calcSessions(acts,gapMin){
  if(!gapMin)gapMin=30;var gap=gapMin*60000;
  // Group by entity
  var byEntity={};acts.forEach(function(a){if(!a.id)return;var key=a.id;if(!byEntity[key])byEntity[key]={id:a.id,type:a.type,actions:[]};byEntity[key].actions.push(a)});
  var sessions=[];
  Object.keys(byEntity).forEach(function(key){
    var ent=byEntity[key];var sorted=ent.actions.slice().sort(function(a,b){return a.ts-b.ts});
    var cluster=[];
    sorted.forEach(function(a){
      if(cluster.length===0){cluster.push(a);return}
      if(a.ts-cluster[cluster.length-1].ts>gap){
        sessions.push(buildSession(ent,cluster));cluster=[a];
      }else{cluster.push(a)}
    });
    if(cluster.length>0)sessions.push(buildSession(ent,cluster));
  });
  // Also handle actions without entity ID
  var noEnt=acts.filter(function(a){return!a.id}).sort(function(a,b){return a.ts-b.ts});
  var cluster2=[];
  noEnt.forEach(function(a){
    if(cluster2.length===0){cluster2.push(a);return}
    if(a.ts-cluster2[cluster2.length-1].ts>gap){
      sessions.push(buildSession({id:"",type:"general",actions:[]},cluster2));cluster2=[a];
    }else{cluster2.push(a)}
  });
  if(cluster2.length>0)sessions.push(buildSession({id:"",type:"general",actions:[]},cluster2));
  sessions.sort(function(a,b){return b.start-a.start});
  return sessions;
}
function buildSession(ent,cluster){
  var span=cluster.length>1?cluster[cluster.length-1].ts-cluster[0].ts:0;
  var weightMins=cluster.reduce(function(s,a){return s+(ACT_WEIGHTS[a.action]||1)},0);
  var mins=Math.max(Math.round(span/60000),weightMins);
  // Get entity name
  var name="General";
  if(ent.id){
    var found=data.bikes.find(function(b){return b.id===ent.id})||data.jobs.find(function(j){return j.id===ent.id})||data.sold.find(function(b){return b.id===ent.id});
    if(found)name=found.name||[found.vehicleYear,found.vehicleMake,found.vehicleModel].filter(Boolean).join(" ")||(found.customer||"");
    if(found&&found.customer&&!found.name)name=(found.customer?found.customer+" — ":"")+name;
  }
  return{entityId:ent.id,entityType:ent.type,name:name,start:cluster[0].ts,end:cluster[cluster.length-1].ts,mins:mins,count:cluster.length,actions:cluster};
}
function fmtMins(m){var h=Math.floor(m/60);var r=m%60;return h>0?h+"h "+r+"m":r+"m"}
function rLog(entity,entityType,entityId){
  if(!entity.log)entity.log=[];
  var w=h("div",{class:"fc g10"});
  var todayStr=new Date().toISOString().split("T")[0];
  var todayEntry=entity.log.slice().sort(function(a,b){return b.ts-a.ts}).find(function(e){return new Date(e.ts).toISOString().split("T")[0]===todayStr&&(e.type||"note")==="note"});

  // Quick-log type buttons
  var qRow=h("div",{class:"f g6 fw"});
  var activeType=ui.logType||"note";
  ["wrench","ride","received","note"].forEach(function(t){
    var lt=LOG_TYPES[t];var isOn=activeType===t;
    qRow.append(h("button",{style:{padding:"6px 10px",borderRadius:"6px",fontSize:"11px",fontWeight:600,border:"1px solid "+(isOn?lt.color:lt.color+"40"),background:isOn?lt.color+"20":"transparent",color:isOn?lt.color:lt.color+"80",cursor:"pointer"},onClick:function(){ui.logType=t;R()}},lt.icon+" "+lt.label));
  });
  w.append(qRow);

  var addW=h("div",{class:"fc g6"});
  if(activeType==="ride"){
    var rideRow=h("div",{class:"f g6"});
    var miStart=h("input",{type:"text",placeholder:"Start mi",style:{width:"80px",fontSize:"12px"}});
    var miEnd=h("input",{type:"text",placeholder:"End mi",style:{width:"80px",fontSize:"12px"}});
    rideRow.append(miStart,miEnd);addW.append(rideRow);
  }
  var ta=h("textarea",{rows:activeType==="received"?"1":"3",placeholder:activeType==="wrench"?"What did you do?":activeType==="ride"?"Route/purpose (optional)":activeType==="received"?"Which parts arrived?":"What happened?",style:{fontSize:"13px"}});
  addW.append(ta);

  if(activeType==="received"){
    var pendingParts=(entity.parts||[]).filter(function(p){return p.status==="ordered"||p.status==="shipped"});
    if(pendingParts.length>0){
      var ppRow=h("div",{class:"f g4 fw"});
      pendingParts.forEach(function(p){
        var isMarked=ui._recvParts&&ui._recvParts[p.id];
        ppRow.append(h("button",{style:{padding:"4px 8px",borderRadius:"4px",fontSize:"10px",border:"1px solid "+(isMarked?"#22c55e":"#333"),background:isMarked?"rgba(34,197,94,0.1)":"transparent",color:isMarked?"#22c55e":"#888",cursor:"pointer"},onClick:function(){if(!ui._recvParts)ui._recvParts={};ui._recvParts[p.id]=!ui._recvParts[p.id];R()}},p.name));
      });addW.append(ppRow);
    }
  }

  var btnRow=h("div",{class:"f g6"});
  if(activeType==="note"&&todayEntry){
    btnRow.append(h("button",{class:"bs",style:{padding:"8px 16px",fontSize:"12px",color:"#f59e0b",borderColor:"rgba(245,158,11,0.3)"},onClick:function(){
      if(!ta.value.trim())return;
      todayEntry.text=todayEntry.text+"\n"+ta.value.trim();todayEntry.ts=Date.now();
      logAct("note-append",ta.value.trim().slice(0,60),entityType,entityId);
      ta.value="";save();R()}},"\u21B3 Append to today"));
  }
  var addBtn=h("button",{class:"bp",style:{padding:"8px 16px",fontSize:"12px"},onClick:function(){
    var lt=LOG_TYPES[activeType];
    if(activeType==="received"){
      var marked=[];
      if(ui._recvParts){(entity.parts||[]).forEach(function(p){if(ui._recvParts[p.id]){p.status="arrived";p.arrivedAt=Date.now();marked.push(p.name);logAct("part-status",p.name+" \u2192 arrived",entityType,entityId)}})}
      var text=marked.length>0?"Received: "+marked.join(", "):"";
      if(ta.value.trim())text=(text?text+"\n":"")+ta.value.trim();
      if(!text){save();R();return}
      entity.log.push({id:mid(),ts:Date.now(),text:text,type:"received"});
      logAct("log-received",text.slice(0,60),entityType,entityId);
      ui._recvParts={};ta.value="";save();R();
    }else if(activeType==="ride"){
      var ms=parseFloat((miStart?miStart.value:"").replace(/[^0-9.]/g,""))||0;
      var me=parseFloat((miEnd?miEnd.value:"").replace(/[^0-9.]/g,""))||0;
      var miles=me>ms?me-ms:0;
      var text2=(miles>0?miles+" mi":"")+(ta.value.trim()?(miles>0?" \u2014 ":"")+ta.value.trim():"");
      if(!text2)return;
      entity.log.push({id:mid(),ts:Date.now(),text:text2,type:"ride",miles:miles});
      logAct("log-ride",text2.slice(0,60),entityType,entityId);
      ta.value="";save();R();
    }else{
      if(!ta.value.trim())return;
      entity.log.push({id:mid(),ts:Date.now(),text:ta.value.trim(),type:activeType});
      logAct(activeType==="wrench"?"log-wrench":"note-add",ta.value.trim().slice(0,60),entityType,entityId);
      ta.value="";save();R();
    }
  }});addBtn.innerHTML=I.plus+" Log";
  btnRow.append(addBtn);
  addW.append(btnRow);w.append(addW);

  // Entries newest first
  var sorted=entity.log.slice().sort(function(a,b){return b.ts-a.ts});
  if(sorted.length===0){w.append(h("p",{style:{color:"#444",fontSize:"12px",textAlign:"center",padding:"16px"}},"No entries yet. Start documenting."));return w}
  var timeline=h("div",{class:"fc",style:{borderLeft:"2px solid #222",marginLeft:"6px",paddingLeft:"12px"}});
  sorted.forEach(function(entry){
    var d=new Date(entry.ts);
    var dateStr=d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    var timeStr=("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
    var lt=LOG_TYPES[entry.type||"note"]||LOG_TYPES.note;
    var isEditing=ui.logEdit===entry.id;
    var card=h("div",{class:"fc g4",style:{position:"relative",padding:"10px 0",borderBottom:"1px solid #1a1a1a"}});
    card.append(h("div",{style:{position:"absolute",left:"-17px",top:"14px",width:"8px",height:"8px",borderRadius:"50%",background:lt.color}}));
    var hdr=h("div",{class:"f ac jb"});
    hdr.append(h("span",{style:{color:"#555",fontSize:"10px",fontVariantNumeric:"tabular-nums"}},lt.icon+" "+dateStr+" "+timeStr));
    var btns=h("div",{class:"f g4"});
    btns.append(h("button",{class:"ib",style:{fontSize:"10px",padding:"2px"},onClick:function(){ui.logEdit=isEditing?null:entry.id;R()}},isEditing?"cancel":"edit"));
    btns.append(h("button",{class:"ib",style:{color:"#ef444460",fontSize:"10px",padding:"2px"},onClick:function(){entity.log=entity.log.filter(function(e){return e.id!==entry.id});save();R()}},"\u00d7"));
    hdr.append(btns);card.append(hdr);
    if(isEditing){
      var editTa=h("textarea",{rows:"4",style:{fontSize:"12px",lineHeight:"1.5"},onInput:function(e){entry.text=e.target.value}});editTa.value=entry.text;
      card.append(editTa,h("button",{class:"bs",style:{alignSelf:"flex-start",fontSize:"10px",marginTop:"4px"},onClick:function(){ui.logEdit=null;save();R()}},"Save"));
    }else{
      card.append(h("p",{style:{color:"#ccc",fontSize:"12px",lineHeight:"1.5",whiteSpace:"pre-wrap"}},entry.text));
    }
    timeline.append(card)});
  w.append(timeline);
  return w;
}

// ============ PARTS TRACKING ============
var PART_STATUS=["needed","ordered","shipped","arrived","installed"];
var PART_COLORS={needed:"#ef4444",ordered:"#f59e0b",shipped:"#60a5fa",arrived:"#22c55e",installed:"#888"};
function rParts(entity,entityType,entityId){
  if(!entity.parts)entity.parts=[];
  var w=h("div",{class:"fc g10"});
  // Add part form
  var addW=h("div",{class:"fc g6"});
  var r1=h("div",{class:"f g6 fw"});
  var pName=h("input",{type:"text",placeholder:"Part name",style:{flex:2,minWidth:"120px"}});
  var pSource=h("input",{type:"text",placeholder:"Source (eBay, Amazon...)",style:{flex:1,minWidth:"80px"}});
  r1.append(pName,pSource);
  var r2=h("div",{class:"f g6 fw"});
  var pCost=h("input",{type:"text",placeholder:"$ Cost",style:{width:"80px",flex:"none"}});
  var pUrl=h("input",{type:"text",placeholder:"URL or order # (optional)",style:{flex:1,minWidth:"100px"}});
  r2.append(pCost,pUrl);
  var addBtn=h("button",{class:"bp",style:{alignSelf:"flex-start",padding:"8px 16px",fontSize:"12px"},onClick:function(){
    if(!pName.value.trim())return;
    entity.parts.push({id:mid(),name:pName.value.trim(),source:pSource.value.trim(),url:pUrl.value.trim(),cost:pCost.value.trim().replace(/[^0-9.]/g,""),status:"needed",orderedAt:null,arrivedAt:null,createdAt:Date.now()});
    logAct("part-add",pName.value.trim(),entityType,entityId);
    pName.value="";pSource.value="";pCost.value="";pUrl.value="";save();R()}});addBtn.innerHTML=I.plus+" Add Part";
  addW.append(r1,r2,addBtn);w.append(addW);
  // Group by status
  var byStatus={};entity.parts.forEach(function(p){if(!byStatus[p.status])byStatus[p.status]=[];byStatus[p.status].push(p)});
  PART_STATUS.forEach(function(st){
    var parts=byStatus[st];if(!parts||parts.length===0)return;
    var sec=h("div",{class:"fc g4"});
    sec.append(h("span",{style:{color:PART_COLORS[st],fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},st+" ("+parts.length+")"));
    parts.forEach(function(p){
      var isExp=ui.partExp===p.id;
      var card=h("div",{class:"fc g4",style:{padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"6px",borderLeft:"3px solid "+PART_COLORS[p.status]}});
      var top=h("div",{class:"f ac g8",style:{cursor:"pointer"},onClick:function(){ui.partExp=isExp?null:p.id;R()}});
      top.append(h("span",{style:{color:"#e5e5e5",fontSize:"13px",flex:1,fontWeight:600}},p.name));
      if(p.cost)top.append(h("span",{style:{color:"#f59e0b",fontSize:"11px",flexShrink:0}},"$"+p.cost));
      if(p.source)top.append(h("span",{style:{color:"#555",fontSize:"10px",flexShrink:0}},p.source));
      card.append(top);
      if(isExp){
        // Editable fields
        var editRow=h("div",{class:"fc g4",style:{marginTop:"4px"}});
        editRow.append(h("input",{type:"text",value:p.name,placeholder:"Part name",style:{fontSize:"12px",fontWeight:600},onInput:function(e){p.name=e.target.value;ss()}}));
        var editR2=h("div",{class:"f g6"});
        editR2.append(h("input",{type:"text",value:p.cost||"",placeholder:"$ Cost",style:{width:"80px",fontSize:"12px"},onInput:function(e){p.cost=e.target.value.replace(/[^0-9.]/g,"");ss()}}));
        editR2.append(h("input",{type:"text",value:p.source||"",placeholder:"Source",style:{flex:1,fontSize:"12px"},onInput:function(e){p.source=e.target.value;ss()}}));
        editRow.append(editR2);
        editRow.append(h("input",{type:"text",value:p.url||"",placeholder:"URL or order #",style:{fontSize:"12px"},onInput:function(e){p.url=e.target.value;ss()}}));
        card.append(editRow);
        // Status buttons
        var stRow=h("div",{class:"f g4 fw",style:{marginTop:"4px"}});
        PART_STATUS.forEach(function(s){
          var isCur=p.status===s;
          stRow.append(h("button",{style:{padding:"3px 8px",borderRadius:"4px",fontSize:"9px",fontWeight:700,border:"1px solid "+(isCur?PART_COLORS[s]:PART_COLORS[s]+"40"),background:isCur?PART_COLORS[s]+"20":"transparent",color:isCur?PART_COLORS[s]:PART_COLORS[s]+"60",cursor:"pointer"},onClick:function(){
            var old=p.status;p.status=s;
            if(s==="ordered"&&!p.orderedAt)p.orderedAt=Date.now();
            if(s==="arrived")p.arrivedAt=Date.now();
            logAct("part-status",p.name+" → "+s,entityType,entityId);
            save();R()
          }},s));
        });card.append(stRow);
        // Details
        var dRow=h("div",{class:"fc g4",style:{marginTop:"4px",fontSize:"11px"}});
        if(p.url){var link=p.url.startsWith("http")?h("a",{href:p.url,target:"_blank",style:{color:"#60a5fa",textDecoration:"none"}},p.url.length>40?p.url.slice(0,40)+"...":p.url):h("span",{style:{color:"#888"}},p.url);dRow.append(link)}
        if(p.orderedAt)dRow.append(h("span",{style:{color:"#555"}},"Ordered: "+new Date(p.orderedAt).toLocaleDateString()));
        if(p.arrivedAt)dRow.append(h("span",{style:{color:"#555"}},"Arrived: "+new Date(p.arrivedAt).toLocaleDateString()));
        if(p.orderedAt&&!p.arrivedAt&&p.status!=="needed"){var days=Math.round((Date.now()-p.orderedAt)/86400000);dRow.append(h("span",{style:{color:days>7?"#ef4444":"#888"}},days+"d waiting"))}
        card.append(dRow);
        // Delete
        card.append(h("button",{style:{alignSelf:"flex-start",padding:"3px 8px",borderRadius:"4px",fontSize:"9px",border:"1px solid rgba(239,68,68,0.2)",color:"#ef444460",cursor:"pointer",marginTop:"2px"},onClick:function(){entity.parts=entity.parts.filter(function(x){return x.id!==p.id});save();R()}},"Delete"));
      }
      sec.append(card)});
    w.append(sec)});
  if(entity.parts.length===0)w.append(h("p",{style:{color:"#444",fontSize:"12px",textAlign:"center",padding:"12px"}},"No parts tracked yet."));
  // Summary
  if(entity.parts.length>0){
    var totalCost=entity.parts.reduce(function(s,p){return s+(parseFloat(p.cost)||0)},0);
    var waiting=entity.parts.filter(function(p){return p.status==="ordered"||p.status==="shipped"}).length;
    var sumRow=h("div",{class:"f g12",style:{fontSize:"10px",color:"#555",marginTop:"4px"}});
    if(totalCost>0)sumRow.append(h("span",null,"Total: $"+$$(totalCost)));
    if(waiting>0)sumRow.append(h("span",{style:{color:"#f59e0b"}},waiting+" in transit"));
    w.append(sumRow)}
  return w;
}

// ============ PHOTO LOG ============
function rPhotoLog(entity){
  if(!entity.photos)entity.photos=[];
  var w=h("div",{class:"fc g10"});
  // Upload
  var upBtn=h("button",{class:"bp",style:{alignSelf:"flex-start",padding:"8px 16px",fontSize:"12px"},onClick:function(){
    var inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.multiple=true;
    inp.onchange=function(){
      var files=Array.from(inp.files);var pending=files.length;
      files.forEach(function(f){compressImg(f,1200,function(b64){
        entity.photos.push({id:mid(),ts:Date.now(),data:b64,caption:""});
        pending--;if(pending===0){save();R()}
      })});
    };inp.click()}});upBtn.innerHTML=I.cam+" Add Photos";
  w.append(upBtn);
  // Grid
  if(entity.photos.length>0){
    var sorted=entity.photos.slice().sort(function(a,b){return b.ts-a.ts});
    var grid=h("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:"8px"}});
    sorted.forEach(function(p){
      var cell=h("div",{class:"fc g2",style:{position:"relative"}});
      var img=h("img",{src:p.data,style:{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:"6px",cursor:"pointer"},onClick:function(){
        var ov=h("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",cursor:"pointer"},onClick:function(){ov.remove()}});
        ov.append(h("img",{src:p.data,style:{maxWidth:"100%",maxHeight:"100%",borderRadius:"8px",objectFit:"contain"}}));
        document.body.append(ov)}});
      cell.append(img);
      var dateStr=new Date(p.ts).toLocaleDateString("en-US",{month:"short",day:"numeric"});
      cell.append(h("span",{style:{color:"#555",fontSize:"9px",textAlign:"center"}},dateStr));
      // Delete X
      cell.append(h("button",{style:{position:"absolute",top:"2px",right:"2px",width:"16px",height:"16px",borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:"9px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},onClick:function(e){e.stopPropagation();entity.photos=entity.photos.filter(function(x){return x.id!==p.id});save();R()}},"×"));
      grid.append(cell)});
    w.append(grid)}
  else w.append(h("p",{style:{color:"#444",fontSize:"12px",textAlign:"center",padding:"12px"}},"No photos yet."));
  return w;
}

function rTask(task,bike){
  var unv=!task.verified;
  var c=task.done?"#22c55e":task.blocked?"#ef4444":unv?"#a855f7":"#f59e0b";
  var isActive=ui.activeTask===task.id;
  var row=h("div",{class:"task",style:{borderLeft:(unv&&!task.done?"3px dashed ":"3px solid ")+c,background:task.done?"rgba(34,197,94,0.06)":task.blocked?"rgba(239,68,68,0.06)":unv?"rgba(168,85,247,0.04)":"rgba(255,255,255,0.03)"}});
  var main=h("div",{class:"f ac g10",style:{cursor:"pointer"},onClick:function(e){if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="BUTTON")return;ui.activeTask=isActive?null:task.id;R()}});
  if(unv&&!task.done){
    main.append(h("button",{style:{padding:"3px 6px",borderRadius:"4px",fontSize:"9px",fontWeight:700,border:"1px solid #a855f7",background:"rgba(168,85,247,0.15)",color:"#a855f7",cursor:"pointer",flexShrink:0},onClick:function(e){e.stopPropagation();task.verified=1;ss();R()}},"VERIFY"));
  }else{
    main.append(ckbox(task.done,function(){task.done=!task.done;task.completedAt=task.done?Date.now():null;var etype=bike.type?"bike":"job";logAct(task.done?"task-done":"task-undone",task.name,etype,bike.id);ss();if(bike.shareToken)pushJobPublic(bike);R()}));
  }
  var nameW=h("div",{style:{flex:1,lineHeight:1.4}});
  nameW.append(h("span",{style:{color:task.done?"#666":unv?"#a855f7":"#e5e5e5",textDecoration:task.done?"line-through":"none",fontStyle:unv&&!task.done?"italic":"normal"}},task.name));
  var ind=h("div",{class:"f g6 fw",style:{marginTop:"2px"}});
  if(task.cost)ind.append(h("span",{style:{color:"#888",fontSize:"10px"}},"~$"+task.cost));
  if(task.note)ind.append(h("span",{style:{color:"#555",fontSize:"10px"}},"📝 notes"));
  if(ind.childNodes.length>0)nameW.append(ind);
  main.append(nameW);
  if(!task.done&&!unv){main.append(h("button",{style:{padding:"4px 8px",borderRadius:"4px",fontSize:"10px",fontWeight:600,border:task.blocked?"1px solid #ef4444":"1px solid #333",background:task.blocked?"rgba(239,68,68,0.1)":"transparent",color:task.blocked?"#ef4444":"#555",cursor:"pointer",flexShrink:0},onClick:function(e){e.stopPropagation();task.blocked=!task.blocked;if(!task.blocked)task.blockedReason="";ss();R()}},task.blocked?"Unblock":"Block"))}
  row.append(main);
  if(task.blocked&&task.blockedReason&&!isActive)row.append(h("div",{style:{marginLeft:"32px",marginTop:"2px",color:"#ef4444",fontSize:"10px",fontStyle:"italic"}},task.blockedReason));
  if(task.done&&task.completedAt){var meta=h("div",{class:"f g8 fw",style:{marginLeft:"32px",marginTop:"4px",fontSize:"10px",color:"#555"}});var cd=new Date(task.completedAt);meta.append(h("span",null,"Done "+(cd.getMonth()+1)+"/"+cd.getDate()+"/"+cd.getFullYear()));if(task.createdAt){var days=Math.round((task.completedAt-task.createdAt)/86400000);meta.append(h("span",null,days===0?"same day":days+"d to complete"))}row.append(meta)}
  if(isActive){var ew=h("div",{class:"fc g6",style:{marginTop:"6px",marginLeft:"32px",width:"calc(100% - 32px)",paddingTop:"6px",borderTop:"1px solid #1a1a1a"}});
    if(task.blocked&&!task.done)ew.append(h("input",{type:"text",value:task.blockedReason||"",placeholder:"Why blocked?",style:{background:"rgba(239,68,68,0.08)",borderColor:"rgba(239,68,68,0.2)",color:"#ef4444",padding:"5px 8px",fontSize:"12px"},onInput:function(e){task.blockedReason=e.target.value;ss()}}));
    var costRow=h("div",{class:"f ac g8"});costRow.append(h("input",{type:"text",value:task.cost||"",placeholder:"$ est. cost",style:{width:"100px",background:"rgba(245,158,11,0.08)",borderColor:"rgba(245,158,11,0.2)",color:"#f59e0b",padding:"5px 8px",fontSize:"12px"},onInput:function(e){task.cost=e.target.value.replace(/[^0-9.]/g,"");ss()}}));
    if(task.cost)costRow.append(h("span",{style:{color:"#555",fontSize:"10px"}},"estimate only — track real costs in Parts or Expenses"));
    ew.append(costRow);
    var ta=h("textarea",{rows:"3",placeholder:"Task notes...",style:{background:"rgba(255,255,255,0.03)",fontSize:"12px",padding:"6px 8px",lineHeight:1.4},onInput:function(e){task.note=e.target.value;ss()}});ta.value=task.note||"";ew.append(ta);
    ew.append(h("button",{style:{alignSelf:"flex-start",padding:"4px 10px",borderRadius:"4px",fontSize:"10px",fontWeight:600,border:"1px solid rgba(239,68,68,0.2)",color:"#ef444460",cursor:"pointer",marginTop:"2px"},onClick:function(e){e.stopPropagation();bike.tasks=bike.tasks.filter(function(t){return t.id!==task.id});ss();R()}},"Delete task"));
    row.append(ew)}
  return row;
}
function rAddTask(bike){
  var w=h("div",{class:"f g8"});var inp=h("input",{type:"text",placeholder:"Add task..."});
  var go=function(){if(inp.value.trim()){bike.tasks.push({id:mid(),name:inp.value.trim(),done:0,blocked:0,blockedReason:"",note:"",cost:"",costLogged:0,verified:1,createdAt:Date.now(),completedAt:null});inp.value="";ss();R()}};
  inp.addEventListener("keydown",function(e){if(e.key==="Enter")go()});var btn=h("button",{class:"bp s0",onClick:go});btn.innerHTML=I.plus;w.append(inp,btn);return w;
}

// ============ ISSUE ============
function rIssue(iss,lk,lead,idx){
  var sc={low:"#22c55e",med:"#f59e0b",high:"#ef4444"};
  var row=h("div",{class:"f ac g6",style:{padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"6px"}});
  row.append(h("span",{style:{flex:1,fontSize:"13px"}},iss.name));
  row.append(h("span",{style:{background:(sc[iss.severity]||sc.low)+"20",color:sc[iss.severity]||sc.low,padding:"2px 6px",borderRadius:"4px",fontSize:"10px",fontWeight:600}},iss.severity||"low"));
  row.append(h("span",{style:{color:sc[iss.difficulty]||sc.low,fontSize:"11px"}},iss.difficulty||"easy"));
  if(iss.cost)row.append(h("span",{style:{color:"#f59e0b",fontSize:"11px"}},"$"+iss.cost));
  var del=h("button",{class:"ib",onClick:function(){lead[lk].splice(idx,1);ss();R()}});del.innerHTML=I.trash;row.append(del);
  return row;
}
function rAddIssue(lead,lk){
  var w=h("div",{class:"fc g6",style:{padding:"8px",background:"rgba(255,255,255,0.02)",borderRadius:"8px",border:"1px solid #222"}});
  var ni=h("input",{type:"text",placeholder:"Issue description...",style:{fontSize:"13px",padding:"8px 10px"}});
  var r2=h("div",{class:"f g4 fw ac"});
  var sv="low",df="easy",co="";var sc={low:"#22c55e",med:"#f59e0b",high:"#ef4444"};
  var svB=h("div",{class:"f g4"});["low","med","high"].forEach(function(s){var b=h("button",{style:{padding:"4px 8px",borderRadius:"4px",fontSize:"10px",fontWeight:600,cursor:"pointer",border:s===sv?"1px solid currentColor":"1px solid transparent",background:sc[s]+"20",color:sc[s]},onClick:function(e){sv=s;svB.querySelectorAll("button").forEach(function(x){x.style.border="1px solid transparent"});e.currentTarget.style.border="1px solid currentColor"}},s);svB.append(b)});
  var dfB=h("div",{class:"f g4"});["easy","mod","hard"].forEach(function(d){var b=h("button",{style:{padding:"4px 8px",borderRadius:"4px",fontSize:"11px",cursor:"pointer",border:d===df?"1px solid currentColor":"1px solid transparent",color:sc[{easy:"low",mod:"med",hard:"high"}[d]],background:"transparent"},onClick:function(e){df=d;dfB.querySelectorAll("button").forEach(function(x){x.style.border="1px solid transparent"});e.currentTarget.style.border="1px solid currentColor"}},d);dfB.append(b)});
  var ci=h("input",{type:"text",placeholder:"$ cost",style:{width:"70px",fontSize:"12px",padding:"6px 8px",flex:"none"},onInput:function(e){co=e.target.value}});
  r2.append(svB,dfB,ci);
  w.append(ni,r2,h("button",{class:"bs",style:{alignSelf:"flex-start"},onClick:function(){if(!ni.value.trim())return;if(!lead[lk])lead[lk]=[];lead[lk].push({id:mid(),name:ni.value.trim(),severity:sv,difficulty:df,cost:co.trim()});ni.value="";ci.value="";ss();R()}},"Add"));
  return w;
}

// ============ CHECKLIST ============
// ============ SPECS ============
var SPEC_FIELDS=[
  {key:"tirePsiFront",label:"Tire PSI Front",group:"Tires"},
  {key:"tirePsiRear",label:"Tire PSI Rear",group:"Tires"},
  {key:"tireSizeFront",label:"Tire Size Front",group:"Tires"},
  {key:"tireSizeRear",label:"Tire Size Rear",group:"Tires"},
  {key:"oilType",label:"Oil Type",group:"Fluids"},
  {key:"oilCapacity",label:"Oil Capacity",group:"Fluids"},
  {key:"coolantType",label:"Coolant",group:"Fluids"},
  {key:"brakeFluid",label:"Brake Fluid",group:"Fluids"},
  {key:"fuelType",label:"Fuel / Octane",group:"Fluids"},
  {key:"sparkPlug",label:"Spark Plug",group:"Electrical"},
  {key:"bulbHeadlight",label:"Headlight Bulb",group:"Electrical"},
  {key:"bulbTurnSignal",label:"Turn Signal Bulb",group:"Electrical"},
  {key:"bulbTail",label:"Tail Light Bulb",group:"Electrical"},
  {key:"chainSize",label:"Chain Size / Links",group:"Drivetrain"},
  {key:"valveClearance",label:"Valve Clearance",group:"Drivetrain"},
  {key:"torqueAxleFront",label:"Front Axle Torque",group:"Torque"},
  {key:"torqueAxleRear",label:"Rear Axle Torque",group:"Torque"},
  {key:"torqueDrain",label:"Drain Plug Torque",group:"Torque"},
  {key:"notes",label:"Spec Notes",group:"Other"}
];
function rSpecs(obj,editable){
  if(!obj.specs)obj.specs={};
  var w=h("div",{class:"fc g12"});
  var groups={};SPEC_FIELDS.forEach(function(f){if(!groups[f.group])groups[f.group]=[];groups[f.group].push(f)});
  var hasAny=SPEC_FIELDS.some(function(f){return obj.specs[f.key]});
  Object.keys(groups).forEach(function(g){
    var flds=groups[g];var groupHasData=flds.some(function(f){return obj.specs[f.key]});
    if(!editable&&!groupHasData)return;
    var sec=h("div",{class:"fc g4"});
    sec.append(h("span",{style:{color:"#f59e0b",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px"}},g));
    flds.forEach(function(f){
      var val=obj.specs[f.key]||"";
      if(!editable&&!val)return;
      var row=h("div",{class:"f ac jb",style:{padding:"6px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"6px",minHeight:"34px"}});
      row.append(h("span",{style:{color:"#888",fontSize:"11px",flex:"0 0 auto",marginRight:"12px"}},f.label));
      if(editable){
        var inp=h("input",{type:"text",value:val,placeholder:"-",style:{textAlign:"right",flex:1,background:"transparent",border:"none",color:"#e5e5e5",fontSize:"13px",fontWeight:600,padding:"0",outline:"none",fontFamily:"var(--font)",minWidth:"60px"},onInput:function(e){obj.specs[f.key]=e.target.value.trim();ss()}});
        row.append(inp);
      }else{
        row.append(h("span",{style:{color:"#e5e5e5",fontSize:"13px",fontWeight:600}},val));
      }
      sec.append(row)});
    w.append(sec)});
  if(!hasAny&&!editable)w.append(h("p",{style:{color:"#555",fontSize:"12px",textAlign:"center",padding:"16px"}},"No specs yet. Scan a listing or add manually."));
  return w;
}

function rChecklist(bike,tid){
  var ck="checked_"+tid,checked=bike[ck]||{},tmpl=(bike.checklistTemplates||[]).find(function(t){return t.id===tid});
  if(!tmpl)return h("p",{style:{color:"#555"}},"Not found");
  var w=h("div",{class:"fc g12"}),items=tmpl.items,tot=items.length,dn=items.filter(function(_,i){return checked[i]}).length;
  if(tot>0){var tr=h("div",{class:"pt"});tr.append(h("div",{style:{height:"6px",borderRadius:"6px",background:"linear-gradient(90deg,#f59e0b "+(dn/tot)*100+"%,transparent "+(dn/tot)*100+"%)"}}));w.append(tr,h("span",{style:{color:"#999",fontSize:"12px"}},dn+"/"+tot))}
  var list=h("div",{class:"fc g6"});
  items.forEach(function(item,i){var row=h("div",{class:"f ac g10",style:{padding:"10px 12px",borderRadius:"8px",background:checked[i]?"rgba(34,197,94,0.06)":"rgba(255,255,255,0.03)"}});row.append(ckbox(!!checked[i],function(){if(!bike[ck])bike[ck]={};bike[ck][i]=!bike[ck][i];ss();R()}),h("span",{style:{color:checked[i]?"#666":"#e5e5e5",textDecoration:checked[i]?"line-through":"none",lineHeight:1.4}},item));list.append(row)});
  w.append(list);if(tot>0)w.append(h("button",{class:"bs",style:{alignSelf:"flex-start"},onClick:function(){bike[ck]={};ss();R()}},"Reset"));return w;
}

// ============ PASTE FROM CLAUDE ============
function rPastePanel(){
  var w=h("div",{class:"fc g12",style:{padding:"16px",background:"rgba(34,211,238,0.04)",borderRadius:"10px",border:"1px solid rgba(34,211,238,0.2)"}});
  w.append(h("div",{class:"f ac g8"},ic("paste",{color:"#22d3ee"}),h("span",{style:{color:"#22d3ee",fontSize:"13px",fontWeight:700}},"Import from Claude")));
  w.append(h("p",{style:{color:"#888",fontSize:"11px",lineHeight:1.4}},"Paste the JSON block from our chat."));
  var ta=h("textarea",{class:"paste-zone",rows:"5",placeholder:"Paste JSON here...",onInput:function(e){ui.pasteTxt=e.target.value;ui.pasteErr=""}});
  ta.value=ui.pasteTxt;w.append(ta);
  if(ui.pasteErr)w.append(h("span",{style:{fontSize:"11px",color:"#ef4444"}},ui.pasteErr));
  w.append(h("div",{class:"f g8"},
    h("button",{class:"bp",onClick:function(){
      try{
        var txt=ui.pasteTxt.trim();if(txt.startsWith("```"))txt=txt.replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,"");
        var p=JSON.parse(txt);
        if(!p.make&&!p.model&&!p.year){ui.pasteErr="Need at least year, make, or model";R();return}
        var lead={id:mid(),year:S(p.year),make:S(p.make),model:S(p.model),askingPrice:S(p.askingPrice),mileage:S(p.mileage),titleStatus:S(p.titleStatus),listingSource:S(p.listingSource),estSellPrice:S(p.estSellPrice),notes:S(p.notes),status:({"watching":"watching","pursue":"pursue","pass":"pass"}[p.status])||"watching",flipDifficulty:S(p.flipDifficulty),partsAvailability:S(p.partsAvailability),demandLevel:S(p.demandLevel),estDaysToSell:S(p.estDaysToSell),listingUrl:S(p.listingUrl),sellerName:S(p.sellerName),sellerContact:S(p.sellerContact),
          knownIssues:(p.knownIssues||[]).map(function(i){return{id:mid(),name:S(i.name),severity:i.severity||"low",difficulty:i.difficulty||"easy",cost:S(i.cost)}}),
          hiddenIssues:(p.hiddenIssues||[]).map(function(i){return{id:mid(),name:S(i.name),severity:i.severity||"low",difficulty:i.difficulty||"easy",cost:S(i.cost)}}),specs:p.specs||{},createdAt:Date.now()};
        data.leads.push(lead);ui.showPaste=0;ui.pasteTxt="";ui.pasteErr="";logAct("lead-add",[lead.year,lead.make,lead.model].filter(Boolean).join(" "),"lead","");save();R();flash("Lead imported");
      }catch(e){ui.pasteErr="Invalid JSON: "+e.message;R()}
    }},"Import Lead"),
    h("button",{class:"bs",onClick:function(){ui.showPaste=0;ui.pasteTxt="";ui.pasteErr="";R()}},"Cancel")
  ));return w;
}

