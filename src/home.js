function rHome(){
  var root=h("div",{class:"fc g10"});var hdr=h("div",{class:"f ac jb",style:{marginBottom:"12px"}});
  var ajCount=data.jobs.filter(function(j){return j.status!=="delivered"}).length;
  hdr.append(h("div",null,h("h1",{style:{fontSize:"22px",fontWeight:800,color:"#f59e0b",letterSpacing:"-0.5px"}},"DRYDOCK"),h("p",{style:{marginTop:"4px",color:"#555",fontSize:"12px"}},data.bikes.length+"/2 slots \u00b7 "+data.leads.length+" leads"+(ajCount?" \u00b7 "+ajCount+" jobs":"")+" \u00b7 v"+APP_VERSION)));
  var total=getUnreadTotal()+_intakeItems.length;
  var btnRow=h("div",{class:"f ac g4"});
  var bellWrap=h("div",{style:{position:"relative"}});bellWrap.id="notif-bell";
  var bellBtn=h("button",{class:"ibs",style:{position:"relative",fontSize:"16px"},onClick:function(e){e.stopPropagation();toggleNotifMenu()}});bellBtn.textContent="🔔";
  if(total>0){bellBtn.style.animation="bellShake 0.8s ease-in-out infinite";bellBtn.style.color="#f59e0b"}
  var bellCount=document.createElement("span");bellCount.className="nb-count";
  bellCount.style.cssText="position:absolute;top:0;right:0;background:#f59e0b;color:#000;font-size:8px;font-weight:800;min-width:14px;height:14px;border-radius:7px;display:"+(total>0?"flex":"none")+";align-items:center;justify-content:center;padding:0 3px";
  bellCount.textContent=total>0?total:"";
  bellBtn.appendChild(bellCount);bellWrap.appendChild(bellBtn);
  var bellMenu=h("div",{id:"notif-menu",style:{display:"none",position:"absolute",top:"38px",right:0,width:"280px",maxHeight:"320px",overflowY:"auto",background:"#111113",border:"1px solid #252528",borderRadius:"10px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",zIndex:999,flexDirection:"column"}});
  bellWrap.appendChild(bellMenu);
  document.addEventListener("click",function(e){if(_notifOpen&&!bellWrap.contains(e.target)){_notifOpen=false;bellMenu.style.display="none"}});
  btnRow.append(bellWrap);
  var gb=h("button",{class:"ibs",onClick:function(){nav("settings")}});gb.innerHTML=I.gear;btnRow.append(gb);
  hdr.append(btnRow);root.append(hdr);
  root.append(rBackup());
  var nvb=h("div",{class:"nb"});
  var activeJobs=data.jobs.filter(function(j){return j.status!=="delivered"}).length;
  var readyCount=0;data.bikes.forEach(function(b){readyCount+=b.tasks.filter(function(t){return!t.done&&!t.blocked&&t.verified}).length});data.jobs.forEach(function(j){if(j.status==="intake"||j.status==="in-progress")readyCount+=j.tasks.filter(function(t){return!t.done&&!t.blocked&&t.verified}).length});
  var unreadTotal=getUnreadTotal();
  ["today","bikes","leads","jobs","clients","sold","expenses","activity"].forEach(function(t){var labels={today:"Today"+(readyCount?" ("+readyCount+")":""),bikes:"Bikes ("+data.bikes.length+")",leads:"Leads ("+data.leads.length+")",jobs:"Jobs"+(activeJobs?" ("+activeJobs+")":"")+(_intakeItems.length?" +"+_intakeItems.length:""),clients:"Clients ("+data.customers.length+")",sold:"Sold ("+data.sold.length+")",expenses:"$",activity:"📊"};
    nvb.append(h("button",{class:"nt"+(hTab===t?" a":""),onClick:function(){hTab=t;ui.addBike=0;ui.addLead=0;ui.addJob=0;ui.showPaste=0;ui.leadFilter=null;ui.jobFilter="active";ui.addExp=0;ui.addTrip=0;ui.scanLead=0;R()}},labels[t]))});root.append(nvb);

  if(hTab==="today"){
    var tw=h("div",{class:"fc g12"});

    // Activity heatmap (16 weeks)
    var actW=h("div",{class:"fc g6"});
    var actToggle=ui.actOpen===undefined?true:ui.actOpen;
    var actHdr=h("button",{class:"f ac g6",style:{padding:0},onClick:function(){ui.actOpen=!actToggle;R()}});
    var ch2=document.createElement("span");ch2.innerHTML=chev(actToggle);ch2.style.display="flex";ch2.style.color="#f59e0b";
    actHdr.append(ch2,h("span",{style:{color:"#f59e0b",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Activity"));
    actW.append(actHdr);
    if(actToggle){
      // Build day counts for last 112 days (16 weeks)
      var dayCounts={};var maxCount=0;
      (data.activity||[]).forEach(function(a){
        var d=new Date(a.ts).toISOString().split("T")[0];
        dayCounts[d]=(dayCounts[d]||0)+1;
        if(dayCounts[d]>maxCount)maxCount=dayCounts[d];
      });
      // Build grid: 7 rows (Sun-Sat) x 16 cols
      var now=new Date();var todayStr=now.toISOString().split("T")[0];
      var dayLabels=["S","M","T","W","T","F","S"];
      var grid=h("div",{style:{display:"flex",gap:"3px",overflowX:"auto",padding:"4px 0"}});
      // Day labels column
      var lblCol=h("div",{style:{display:"flex",flexDirection:"column",gap:"3px",marginRight:"2px"}});
      dayLabels.forEach(function(d,i){lblCol.append(h("div",{style:{width:"10px",height:"10px",fontSize:"7px",color:"#444",display:"flex",alignItems:"center",justifyContent:"center"}},i%2===1?d:""))});
      grid.append(lblCol);
      // Weeks
      var startDay=new Date(now);startDay.setDate(startDay.getDate()-111-startDay.getDay());
      for(var w=0;w<16;w++){
        var col=h("div",{style:{display:"flex",flexDirection:"column",gap:"3px"}});
        for(var d=0;d<7;d++){
          var cellDate=new Date(startDay);cellDate.setDate(cellDate.getDate()+w*7+d);
          var ds=cellDate.toISOString().split("T")[0];
          var count=dayCounts[ds]||0;
          var intensity=maxCount>0?count/maxCount:0;
          var bg=count===0?"rgba(255,255,255,0.03)":intensity<0.25?"rgba(245,158,11,0.15)":intensity<0.5?"rgba(245,158,11,0.3)":intensity<0.75?"rgba(245,158,11,0.5)":"rgba(245,158,11,0.75)";
          var isToday_=ds===todayStr;
          var cell=h("div",{title:ds+": "+count+" actions",style:{width:"10px",height:"10px",borderRadius:"2px",background:bg,border:isToday_?"1px solid #f59e0b":"none",cursor:count?"pointer":"default"}});
          col.append(cell);
        }
        grid.append(col);
      }
      actW.append(grid);
      // Legend
      var leg=h("div",{class:"f ac g4",style:{fontSize:"9px",color:"#444"}});
      leg.append(h("span",null,"less"));
      [0,0.15,0.3,0.5,0.75].forEach(function(v){leg.append(h("div",{style:{width:"10px",height:"10px",borderRadius:"2px",background:v===0?"rgba(255,255,255,0.03)":"rgba(245,158,11,"+v+")"}}))});
      leg.append(h("span",null,"more"));
      var todayCount=dayCounts[todayStr]||0;
      var totalActs=(data.activity||[]).length;
      leg.append(h("span",{style:{marginLeft:"auto",color:"#555"}},todayCount+" today · "+totalActs+" total"));
      actW.append(leg);

      // Today's feed
      var todayActs=(data.activity||[]).filter(function(a){return a.action!=="timer-start"&&new Date(a.ts).toISOString().split("T")[0]===todayStr}).sort(function(a,b){return b.ts-a.ts});
      if(todayActs.length>0){
        var dayFeed=h("div",{class:"fc g2",style:{marginTop:"6px"}});
        dayFeed.append(h("span",{style:{color:"#f59e0b",fontSize:"9px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Today · "+todayActs.length+" actions"));
        var aI={"task-done":"✓","task-undone":"↩","job-status":"◆","timer-stop":"⏱","expense-add":"$","trip-log":"🚗","job-created":"＋","lead-add":"◎","lead-convert":"⇒","bike-add":"🏍","bike-sold":"💰","note-add":"📝","note-append":"📝","chat-send":"💬","part-add":"🔩","part-status":"🔩","log-wrench":"🔧","log-ride":"🏍","log-received":"📦"};
        var aC={"task-done":"#22c55e","task-undone":"#888","job-status":"#22d3ee","timer-stop":"#60a5fa","expense-add":"#f59e0b","trip-log":"#a855f7","job-created":"#22d3ee","lead-add":"#22d3ee","lead-convert":"#a855f7","bike-add":"#a855f7","bike-sold":"#22c55e","note-add":"#888","note-append":"#888","chat-send":"#22d3ee","part-add":"#60a5fa","part-status":"#60a5fa","log-wrench":"#f59e0b","log-ride":"#a855f7","log-received":"#22c55e"};
        todayActs.forEach(function(a){
          var t=new Date(a.ts);var time=("0"+t.getHours()).slice(-2)+":"+("0"+t.getMinutes()).slice(-2);
          var row=h("div",{class:"f ac g6",style:{padding:"2px 0",fontSize:"11px"}});
          row.append(h("span",{style:{color:"#444",fontSize:"10px",fontVariantNumeric:"tabular-nums",flexShrink:0,width:"36px"}},time));
          row.append(h("span",{style:{color:aC[a.action]||"#888",fontSize:"10px",flexShrink:0}},aI[a.action]||"·"));
          row.append(h("span",{style:{color:"#ccc",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},a.detail||(a.action||"").replace(/-/g," ")));
          dayFeed.append(row)});
        actW.append(dayFeed);
      }
    }
    tw.append(actW);

    // Unread messages
    var unreadJobs=data.jobs.filter(function(j){return j.shareToken&&_chatCounts[j.shareToken]>0});
    if(unreadJobs.length>0){
      var msgSec=h("div",{class:"fc g4",style:{padding:"12px",background:"rgba(245,158,11,0.06)",borderRadius:"10px",border:"1px solid rgba(245,158,11,0.2)"}});
      var totalUn=getUnreadTotal();
      msgSec.append(h("span",{style:{color:"#f59e0b",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"💬 Unread Messages ("+totalUn+")"));
      unreadJobs.forEach(function(j){
        var vt=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean).join(" ")||"Job";
        var label=(j.customer?j.customer+" — ":"")+vt;
        var count=_chatCounts[j.shareToken]||0;
        var row=h("button",{class:"f ac jb",style:{padding:"8px 0",width:"100%",textAlign:"left"},onClick:function(){_chatRead[j.shareToken]=Date.now();try{localStorage.setItem("drydock_chat_read",JSON.stringify(_chatRead))}catch(e){}_chatCounts[j.shareToken]=0;nav("job",j.id);setTimeout(function(){ui.bTab="chat";R()},50)}});
        row.append(h("span",{style:{color:"#f5f5f5",fontSize:"12px",flex:1}},label));
        row.append(h("span",{style:{background:"#f59e0b",color:"#000",fontSize:"10px",fontWeight:700,padding:"2px 8px",borderRadius:"10px"}},count+""));
        msgSec.append(row)});
      tw.append(msgSec)}

    // Weekly summary with sessions
    var weekAgo=Date.now()-7*86400000;
    var weekActs=(data.activity||[]).filter(function(a){return a.ts>weekAgo&&a.action!=="timer-start"});
    var weekSessions=calcSessions(weekActs);
    var weekMins=weekSessions.reduce(function(s,se){return s+se.mins},0);
    var weekTasks=weekActs.filter(function(a){return a.action==="task-done"}).length;
    var weekExpense=weekActs.filter(function(a){return a.action==="expense-add"}).reduce(function(s,a){var m=a.detail.match(/\$(\d+\.?\d*)/);return s+(m?parseFloat(m[1]):0)},0);
    if(weekActs.length>0){
      var weekOpen=ui.weekOpen;
      var sumSec=h("div",{class:"fc g4",style:{padding:"12px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",border:"1px solid #1a1a1a"}});
      var sumHdr=h("button",{class:"f ac g6",style:{padding:0,width:"100%"},onClick:function(){ui.weekOpen=!weekOpen;R()}});
      var wch=document.createElement("span");wch.innerHTML=chev(weekOpen);wch.style.cssText="display:flex;color:#888";
      sumHdr.append(wch,h("span",{style:{color:"#888",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",flex:1,textAlign:"left"}},"This Week"));
      var sumBadges=h("div",{class:"f g8 fw",style:{fontSize:"10px"}});
      if(weekMins>0)sumBadges.append(h("span",{style:{color:"#60a5fa"}},fmtMins(weekMins)));
      if(weekTasks>0)sumBadges.append(h("span",{style:{color:"#22c55e"}},weekTasks+"✓"));
      if(weekExpense>0)sumBadges.append(h("span",{style:{color:"#f59e0b"}},"$"+$$(weekExpense)));
      sumBadges.append(h("span",{style:{color:"#444"}},weekSessions.length+" sessions"));
      sumHdr.append(sumBadges);sumSec.append(sumHdr);
      if(weekOpen){
        // Session list grouped by day
        var sessByDay={};weekSessions.forEach(function(se){var d=new Date(se.start).toISOString().split("T")[0];if(!sessByDay[d])sessByDay[d]=[];sessByDay[d].push(se)});
        var dayKeys=Object.keys(sessByDay).sort(function(a,b){return b<a?-1:1});
        var sFeed=h("div",{class:"fc g2",style:{marginTop:"8px",maxHeight:"300px",overflowY:"auto"}});
        dayKeys.forEach(function(day){
          var dayDate=new Date(day+"T12:00:00");
          var dayLabel=dayDate.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
          var dayMins=sessByDay[day].reduce(function(s,se){return s+se.mins},0);
          var isToday_=day===todayStr;
          sFeed.append(h("div",{style:{color:isToday_?"#f59e0b":"#555",fontSize:"10px",fontWeight:700,padding:"6px 0 2px",borderTop:"1px solid #1a1a1a",marginTop:"4px"}},(isToday_?"Today":dayLabel)+" — "+fmtMins(dayMins)));
          sessByDay[day].forEach(function(se){
            var t=new Date(se.start);var time=("0"+t.getHours()).slice(-2)+":"+("0"+t.getMinutes()).slice(-2);
            var row=h("div",{class:"f ac g8",style:{padding:"3px 0",fontSize:"11px",cursor:se.entityId?"pointer":"default"},onClick:function(){if(se.entityId)nav(se.entityType,se.entityId)}});
            row.append(h("span",{style:{color:"#60a5fa",fontSize:"10px",fontVariantNumeric:"tabular-nums",flexShrink:0,fontWeight:600}},fmtMins(se.mins)));
            row.append(h("span",{style:{color:"#e5e5e5",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},se.name));
            row.append(h("span",{style:{color:"#444",fontSize:"10px"}},se.count+" actions"));
            row.append(h("span",{style:{color:"#444",fontSize:"10px"}},time));
            sFeed.append(row)});
        });
        sumSec.append(sFeed)}
      tw.append(sumSec)}

    // Running timer banner — just shows what's active, not a launcher
    var runningJobs=data.jobs.filter(function(j){return j.timerStart});
    if(runningJobs.length>0){
      runningJobs.forEach(function(j){
        var vt=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean).join(" ")||"Job";
        var label=(j.customer?j.customer+" — ":"")+vt;
        var secs=getJobSecs(j);
        var banner=h("div",{class:"f ac g10",style:{padding:"10px 14px",background:"rgba(96,165,250,0.08)",borderRadius:"10px",border:"1px solid rgba(96,165,250,0.2)",cursor:"pointer"},onClick:function(){nav("job",j.id)}});
        var timerDisp=h("span",{style:{color:"#60a5fa",fontSize:"16px",fontWeight:700,fontVariantNumeric:"tabular-nums"},id:"today-timer-"+j.id},fmtTime(secs));
        banner.append(timerDisp);
        banner.append(h("span",{style:{color:"#e5e5e5",fontSize:"12px",flex:1}},label));
        banner.append(h("button",{style:{padding:"4px 12px",borderRadius:"6px",fontSize:"11px",fontWeight:700,border:"none",cursor:"pointer",background:"rgba(239,68,68,0.15)",color:"#ef4444"},onClick:function(e){e.stopPropagation();j.laborSeconds=getJobSecs(j);j.timerStart=null;logAct("timer-stop",fmtTime(j.laborSeconds),"job",j.id);save();R()}},"Stop"));
        tw.append(banner)});
      // Tick the today timers
      startTimerTick();
    }

    // Waiting parts across all entities
    var allWaiting=[];
    data.bikes.forEach(function(b){(b.parts||[]).forEach(function(p){if(p.status==="ordered"||p.status==="shipped"){var days=p.orderedAt?Math.round((Date.now()-p.orderedAt)/86400000):0;allWaiting.push({name:p.name,source:p.source,status:p.status,days:days,entity:b.name,entityType:"bike",entityId:b.id})}})});
    data.jobs.forEach(function(j){(j.parts||[]).forEach(function(p){if(p.status==="ordered"||p.status==="shipped"){var days=p.orderedAt?Math.round((Date.now()-p.orderedAt)/86400000):0;var vt=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean).join(" ")||"Job";allWaiting.push({name:p.name,source:p.source,status:p.status,days:days,entity:(j.customer?j.customer+" — ":"")+vt,entityType:"job",entityId:j.id})}})});
    if(allWaiting.length>0){
      var partsSec=h("div",{class:"fc g4",style:{padding:"12px",background:"rgba(96,165,250,0.04)",borderRadius:"10px",border:"1px solid rgba(96,165,250,0.12)"}});
      partsSec.append(h("span",{style:{color:"#60a5fa",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"🔩 Waiting Parts ("+allWaiting.length+")"));
      allWaiting.sort(function(a,b){return b.days-a.days});
      allWaiting.forEach(function(p){
        var row=h("div",{class:"f ac g8",style:{fontSize:"11px",padding:"3px 0"}});
        row.append(h("span",{style:{color:p.status==="shipped"?"#60a5fa":"#f59e0b",fontSize:"9px",fontWeight:700,textTransform:"uppercase",flexShrink:0}},p.status));
        row.append(h("span",{style:{color:"#e5e5e5",flex:1,cursor:"pointer"},onClick:function(){nav(p.entityType,p.entityId);ui.bTab="parts";R()}},p.name));
        row.append(h("span",{style:{color:"#666",fontSize:"10px",flexShrink:0,maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},p.entity));
        row.append(h("span",{style:{color:p.days>7?"#ef4444":"#888",flexShrink:0}},p.days+"d"));
        partsSec.append(row)});
      tw.append(partsSec)}

    // Collect all ready tasks across bikes and jobs
    var sections=[];
    data.bikes.forEach(function(bike){
      var ready=bike.tasks.filter(function(t){return!t.done&&!t.blocked&&t.verified});
      var triage=bike.tasks.filter(function(t){return!t.done&&!t.blocked&&!t.verified});
      if(ready.length>0||triage.length>0)sections.push({name:bike.name,type:"bike",id:bike.id,ready:ready,triage:triage,entity:bike})
    });
    data.jobs.filter(function(j){return j.status==="intake"||j.status==="in-progress"}).forEach(function(job){
      var vTitle=[job.vehicleYear,job.vehicleMake,job.vehicleModel].filter(Boolean).join(" ")||job.problem||"Job";
      var label=(job.customer?job.customer+" — ":"")+vTitle;
      var ready=job.tasks.filter(function(t){return!t.done&&!t.blocked&&t.verified});
      var triage=job.tasks.filter(function(t){return!t.done&&!t.blocked&&!t.verified});
      if(ready.length>0||triage.length>0)sections.push({name:label,type:"job",id:job.id,ready:ready,triage:triage,entity:job})
    });
    // Scheduled today / overdue (always shows regardless of other tasks)
    var scheduled=data.jobs.filter(function(j){return j.scheduledDate&&j.status!=="delivered"&&j.status!=="done"&&j.scheduledDate<=today()});
    if(scheduled.length>0){
      var schSec=h("div",{class:"fc g4",style:{padding:"12px",background:"rgba(96,165,250,0.04)",borderRadius:"10px",border:"1px solid rgba(96,165,250,0.15)"}});
      schSec.append(h("span",{style:{color:"#60a5fa",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"\u{1F4C5} Scheduled ("+scheduled.length+")"));
      scheduled.forEach(function(j){
        var vt=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean).join(" ")||"Job";
        var isOver=j.scheduledDate<today();
        var row=h("button",{class:"f ac jb",style:{padding:"6px 0",width:"100%",textAlign:"left"},onClick:function(){nav("job",j.id)}});
        row.append(h("span",{style:{color:isOver?"#ef4444":"#e5e5e5",fontSize:"12px",flex:1}},(j.customer?j.customer+" — ":"")+vt));
        row.append(h("span",{style:{color:isOver?"#ef4444":"#22c55e",fontSize:"11px",fontWeight:700}},isOver?"Overdue":"Today"));
        row.append(badge(j.status));
        schSec.append(row)});
      tw.append(schSec)}
    if(sections.length===0&&scheduled.length===0){
      tw.append(h("div",{style:{textAlign:"center",padding:"40px 20px"}},h("p",{style:{color:"#22c55e",fontSize:"16px",fontWeight:700}},"Nothing actionable"),h("p",{style:{color:"#555",fontSize:"12px",marginTop:"8px"}},"Everything is blocked, waiting, or done.")));
    }else{
      sections.forEach(function(sec){
        var secW=h("div",{class:"fc g6"});
        var hdr2=h("button",{class:"f ac g8",style:{padding:0},onClick:function(){nav(sec.type,sec.id)}});
        var col=sec.type==="bike"?"#a855f7":"#22d3ee";
        hdr2.append(h("span",{style:{color:col,fontSize:"13px",fontWeight:700}},sec.name));
        hdr2.append(h("span",{style:{color:"#555",fontSize:"11px"}},sec.ready.length+" ready"+(sec.triage.length?" · "+sec.triage.length+" triage":"")));
        secW.append(hdr2);
        sec.ready.forEach(function(t){secW.append(rTask(t,sec.entity))});
        if(sec.triage.length>0){sec.triage.forEach(function(t){secW.append(rTask(t,sec.entity))})}
        tw.append(secW)})
    }
    // Blocked summary
    var blockedAll=[];
    data.bikes.forEach(function(b){b.tasks.filter(function(t){return!t.done&&t.blocked}).forEach(function(t){blockedAll.push({name:t.name,reason:t.blockedReason||"",source:b.name})})});
    data.jobs.filter(function(j){return j.status==="intake"||j.status==="in-progress"}).forEach(function(j){var vt=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean).join(" ")||"Job";j.tasks.filter(function(t){return!t.done&&t.blocked}).forEach(function(t){blockedAll.push({name:t.name,reason:t.blockedReason||"",source:(j.customer?j.customer+" — ":"")+vt})})});
    if(blockedAll.length>0){
      var bSec=h("div",{class:"fc g4",style:{marginTop:"8px",padding:"12px",background:"rgba(239,68,68,0.04)",borderRadius:"10px",border:"1px solid rgba(239,68,68,0.1)"}});
      bSec.append(h("span",{style:{color:"#ef4444",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Blocked ("+blockedAll.length+")"));
      blockedAll.forEach(function(b){
        var row=h("div",{class:"f ac g8",style:{padding:"4px 0",fontSize:"11px"}});
        row.append(h("span",{style:{color:"#ef4444",flex:1}},b.name));
        if(b.reason)row.append(h("span",{style:{color:"#666",fontStyle:"italic"}},b.reason));
        row.append(h("span",{style:{color:"#555"}},b.source));
        bSec.append(row)});
      tw.append(bSec)}
    root.append(tw);
  }else if(hTab==="bikes"){
    var list=h("div",{class:"fc g10"});
    data.bikes.forEach(function(bike){var uv=bike.tasks.filter(function(t){return!t.done&&!t.blocked&&!t.verified}).length,r=bike.tasks.filter(function(t){return!t.done&&!t.blocked&&t.verified}).length,bl=bike.tasks.filter(function(t){return!t.done&&t.blocked}).length,dn=bike.tasks.filter(function(t){return t.done}).length;
      var card=h("button",{class:"card fc g6",onClick:function(){nav("bike",bike.id)}});var top=h("div",{class:"f ac g10"});if(bike.photo)top.append(h("img",{src:bike.photo,style:{width:"36px",height:"36px",minWidth:"36px",borderRadius:"6px",objectFit:"cover",border:"1px solid #333"}}));top.append(h("span",{style:{color:"#f5f5f5",fontSize:"16px",fontWeight:700,flex:1}},bike.name),badge(bike.type));card.append(top);
      if(bike.description)card.append(h("span",{style:{color:"#666",fontSize:"12px",lineHeight:1.3}},bike.description.slice(0,80)+(bike.description.length>80?"...":"")));
      if(bike.tasks.length>0){var st2=h("div",{class:"f g12",style:{fontSize:"12px"}});if(r>0)st2.append(h("span",{style:{color:"#f59e0b"}},r+" ready"));if(bl>0)st2.append(h("span",{style:{color:"#ef4444"}},bl+" blocked"));if(dn>0)st2.append(h("span",{style:{color:"#22c55e"}},dn+" done"));if(uv>0)st2.append(h("span",{style:{color:"#a855f7"}},uv+" triage"));card.append(st2)}
      var ptc=(bike.parts||[]).reduce(function(s,p){return s+(parseFloat(p.cost)||0)},0);var ec=data.expenses.filter(function(e){return e.bikeId===bike.id}).reduce(function(s,e){return s+(parseFloat(e.amount)||0)},0);var ai2=$(bike.actualBuyPrice||bike.buyPrice)+ptc+ec;
      var pr2=h("div",{class:"f g12 fw",style:{fontSize:"11px"}});if(ai2>0)pr2.append(h("span",{style:{color:"#ef4444"}},"All-in: $"+$$(ai2)));if(bike.targetSell){var m2=$$($(bike.targetSell)-ai2);pr2.append(h("span",{style:{color:m2>=200?"#22c55e":"#ef4444"}},"Margin: $"+$$(m2)))}if(bike.buyDate)pr2.append(h("span",{style:{color:"#555"}},"Day "+daysBetween(bike.buyDate,today())));card.append(pr2);list.append(card)});
    if(ui.addBike){var p=h("div",{class:"ep fc g12"});var ni=h("input",{type:"text",placeholder:"Bike name"});setTimeout(function(){ni.focus()},50);var ty="flip";var tr=h("div",{class:"f g8"});["rider","flip"].forEach(function(t){var b=h("button",{style:{flex:1,padding:"8px 12px",background:t==="flip"?"rgba(168,85,247,0.15)":"rgba(255,255,255,0.03)",border:t==="flip"?"1px solid #a855f7":"1px solid #333",borderRadius:"6px",cursor:"pointer",color:t==="flip"?"#a855f7":"#777",fontSize:"13px",fontWeight:600,textTransform:"uppercase"},onClick:function(e){ty=t;tr.querySelectorAll("button").forEach(function(x){x.style.background="rgba(255,255,255,0.03)";x.style.border="1px solid #333";x.style.color="#777"});var col=t==="rider"?"#60a5fa":"#a855f7";e.currentTarget.style.background=t==="rider"?"rgba(59,130,246,0.15)":"rgba(168,85,247,0.15)";e.currentTarget.style.border="1px solid "+col;e.currentTarget.style.color=col}},t);tr.append(b)});var di=h("textarea",{rows:"3",placeholder:"Description"});var bpI=h("input",{type:"text",placeholder:"Buy price"});p.append(ni,tr,di,bpI,h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.addBike=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){if(!ni.value.trim())return;data.bikes.push({id:mid(),name:ni.value.trim(),type:ty,description:di.value.trim(),buyPrice:bpI.value.trim(),actualBuyPrice:"",targetSell:"",buyDate:today(),source:"",workLog:"",tasks:[],checklistTemplates:JSON.parse(JSON.stringify(data.checklistTemplates)),photo:null,specs:{}});logAct("bike-add",ni.value.trim(),"bike","");ui.addBike=0;save();R()}},"Add Bike")));list.append(p)}
    else if(data.bikes.length<2){var ab2=h("button",{class:"bg",onClick:function(){ui.addBike=1;R()}});ab2.innerHTML=I.plus+" Add bike";list.append(ab2)}
    else list.append(h("p",{style:{color:"#555",fontSize:"12px",textAlign:"center",padding:"8px 0"}},"2/2 slots"));
    root.append(list);
  }else if(hTab==="leads"){
    var list2=h("div",{class:"fc g10"});var fc2=h("div",{class:"f g6 fw",style:{marginBottom:"4px"}});
    [null,"pursue","watching","pass"].forEach(function(f){var fk=String(f);var fL={"null":"All",pursue:"Pursue",watching:"Watching",pass:"Pass"};var fC={"null":"#888",pursue:"#22c55e",watching:"#22d3ee",pass:"#ef4444"};var active=ui.leadFilter===f;var b=h("button",{class:"chip"+(active?" on":""),style:{color:active?(fC[fk]||"#888"):"#777",borderColor:active?(fC[fk]||"#888"):"#333"},onClick:function(){ui.leadFilter=f;R()}},fL[fk]);fc2.append(b)});list2.append(fc2);
    var sorted=data.leads.slice().sort(function(a,b){return({pursue:0,watching:1,pass:2}[a.status||"watching"]||1)-({pursue:0,watching:1,pass:2}[b.status||"watching"]||1)});
    if(ui.leadFilter)sorted=sorted.filter(function(l){return(l.status||"watching")===ui.leadFilter});
    sorted.forEach(function(lead){var title=[lead.year,lead.make,lead.model].filter(Boolean).join(" ")||"Untitled";var rehab=calcRehab(lead),margin=calcMargin(lead),issues=(lead.knownIssues||[]).length+(lead.hiddenIssues||[]).length;
      var card=h("button",{class:"card fc g6",onClick:function(){nav("lead",lead.id)}});var top=h("div",{class:"f ac g10"});if(lead.photo)top.append(h("img",{src:lead.photo,style:{width:"36px",height:"36px",minWidth:"36px",borderRadius:"6px",objectFit:"cover",border:"1px solid #333"}}));top.append(h("span",{style:{color:"#f5f5f5",fontSize:"16px",fontWeight:700,flex:1}},title),badge(lead.status||"watching"));card.append(top);
      var meta=h("div",{class:"f g12 fw",style:{fontSize:"11px"}});if(lead.askingPrice)meta.append(h("span",{style:{color:"#ef4444"}},"Ask: "+lead.askingPrice));if(lead.mileage)meta.append(h("span",{style:{color:"#888"}},"Mi: "+lead.mileage));if(issues>0)meta.append(h("span",{style:{color:"#f59e0b"}},issues+" issues"));if(rehab>0)meta.append(h("span",{style:{color:"#f59e0b"}},"Rehab: $"+rehab));if(lead.estSellPrice)meta.append(h("span",{style:{color:margin>=200?"#22c55e":"#ef4444"}},"Margin: $"+$$(margin)));card.append(meta);
      if(lead.titleStatus)card.append(h("span",{style:{color:"#555",fontSize:"11px"}},"Title: "+lead.titleStatus));list2.append(card)});
    if(sorted.length===0&&ui.leadFilter)list2.append(h("p",{style:{color:"#555",fontSize:"12px",textAlign:"center",padding:"16px 0"}},"No "+ui.leadFilter+" leads"));
    // Scan listing chat
    if(ui.scanLead){
      var scanW=h("div",{class:"fc g12",style:{padding:"16px",background:"rgba(168,85,247,0.04)",borderRadius:"10px",border:"1px solid rgba(168,85,247,0.2)"}});
      scanW.append(h("div",{class:"f ac g8"},ic("scan",{color:"#a855f7"}),h("span",{style:{color:"#a855f7",fontSize:"13px",fontWeight:700}},"Scan Listing")));

      // Step 1: No image yet
      if(!ui.scanImg){
        scanW.append(h("p",{style:{color:"#888",fontSize:"11px",lineHeight:1.4}},"Screenshot or photo a listing. Add any extra context you have."));
        var initCtx=h("textarea",{rows:"2",placeholder:"Optional: extra info, questions, your concerns...",style:{fontSize:"12px"},id:"scan-ctx"});
        var scanStatus=h("div",{style:{minHeight:"20px"}});
        var pickBtn=h("button",{class:"scan-btn",onClick:function(){
          var inp=document.createElement("input");inp.type="file";inp.accept="image/*";
          inp.onchange=function(){if(inp.files[0]){compressImg(inp.files[0],1200,function(b64){
            ui.scanImg=b64;
            var ctx=document.getElementById("scan-ctx");var userText=(ctx?ctx.value:"").trim();
            var prompt=(data.leadPrompt||DEF_LEAD_PROMPT)+(userText?"\n\nAdditional context from me: "+userText:"");
            var firstMsg={role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64.split(",")[1]}},{type:"text",text:prompt}]};
            ui.scanMsgs=[firstMsg];ui.scanLoading=1;R();
            scanChat(ui.scanMsgs,document.getElementById("scan-status")||scanStatus,function(txt){
              var parsed=parseLeadFromText(txt);var comment=getCommentary(txt);
              ui.scanParsed=parsed;ui.scanComments.push({role:"assistant",text:comment});
              ui.scanMsgs.push({role:"assistant",content:txt});ui.scanLoading=0;R();
            })})}};inp.click()}});
        pickBtn.append(ic("cam")," Choose Photo / Screenshot");
        scanW.append(initCtx,pickBtn,scanStatus);
      }else{
        // Show image thumb
        scanW.append(h("img",{src:ui.scanImg,style:{width:"100%",maxHeight:"150px",objectFit:"cover",borderRadius:"8px",border:"1px solid #333"}}));

        // Chat history
        if(ui.scanComments.length>0){
          var chatW=h("div",{class:"fc g8",style:{maxHeight:"250px",overflowY:"auto",padding:"4px 0"}});
          ui.scanComments.forEach(function(c){
            var bubble=h("div",{style:{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",lineHeight:1.5,whiteSpace:"pre-wrap",maxWidth:"100%",background:c.role==="assistant"?"rgba(168,85,247,0.08)":"rgba(34,211,238,0.08)",color:c.role==="assistant"?"#ccc":"#22d3ee",borderLeft:c.role==="assistant"?"3px solid #a855f7":"3px solid #22d3ee"}},c.text);
            chatW.append(bubble)});
          scanW.append(chatW);
        }

        // Lead preview
        if(ui.scanParsed){
          var lp=ui.scanParsed;var title=[lp.year,lp.make,lp.model].filter(Boolean).join(" ")||"Untitled";
          var prev=h("div",{class:"card fc g6",style:{borderColor:"rgba(168,85,247,0.3)",background:"rgba(168,85,247,0.04)"}});
          prev.append(h("span",{style:{color:"#a855f7",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Lead Preview"));
          prev.append(h("span",{style:{color:"#f5f5f5",fontSize:"16px",fontWeight:700}},title));
          var pm=h("div",{class:"f g8 fw",style:{fontSize:"11px"}});
          if(lp.askingPrice)pm.append(h("span",{style:{color:"#ef4444"}},"Ask: "+lp.askingPrice));
          if(lp.estSellPrice)pm.append(h("span",{style:{color:"#22c55e"}},"Est sell: "+lp.estSellPrice));
          if(lp.mileage)pm.append(h("span",{style:{color:"#888"}},"Mi: "+lp.mileage));
          if(lp.titleStatus)pm.append(h("span",{style:{color:"#888"}},"Title: "+lp.titleStatus));
          if(lp.flipDifficulty)pm.append(h("span",{style:{color:"#888"}},"Flip: "+lp.flipDifficulty));
          if(lp.demandLevel)pm.append(h("span",{style:{color:"#888"}},"Demand: "+lp.demandLevel));
          prev.append(pm);
          var issues=(lp.knownIssues||[]).length+(lp.hiddenIssues||[]).length;
          if(issues>0)prev.append(h("span",{style:{color:"#f59e0b",fontSize:"11px"}},issues+" issues identified"));
          if(lp.specs){var sc=Object.values(lp.specs).filter(function(v){return v}).length;if(sc>0)prev.append(h("span",{style:{color:"#60a5fa",fontSize:"11px"}},sc+" specs loaded"))}
          if(lp.notes)prev.append(h("span",{style:{color:"#666",fontSize:"11px",lineHeight:1.3,whiteSpace:"pre-wrap"}},lp.notes.slice(0,200)));
          scanW.append(prev);
        }

        // Follow-up input
        var scanStatus2=h("div",{id:"scan-status",style:{minHeight:"20px"}});
        if(ui.scanLoading){scanStatus2.innerHTML='<span class="spin"></span> Thinking...'}
        scanW.append(scanStatus2);
        if(!ui.scanLoading){
          var fuW=h("div",{class:"f g8"});
          var fuInp=h("input",{type:"text",placeholder:'Ask questions, add context, request changes...',style:{fontSize:"12px"},id:"scan-followup"});
          var fuSend=function(){var v=document.getElementById("scan-followup");if(!v||!v.value.trim())return;var msg=v.value.trim();
            ui.scanComments.push({role:"user",text:msg});ui.scanMsgs.push({role:"user",content:msg});ui.scanLoading=1;R();
            scanChat(ui.scanMsgs,document.getElementById("scan-status")||scanStatus2,function(txt){
              var parsed=parseLeadFromText(txt);var comment=getCommentary(txt);
              if(parsed)ui.scanParsed=parsed;ui.scanComments.push({role:"assistant",text:comment});
              ui.scanMsgs.push({role:"assistant",content:txt});ui.scanLoading=0;R();
            })};
          fuInp.addEventListener("keydown",function(e){if(e.key==="Enter")fuSend()});
          var fuBtn=h("button",{class:"bp s0",style:{padding:"8px 12px",background:"#a855f7"},onClick:fuSend});fuBtn.innerHTML=I.plus;
          fuW.append(fuInp,fuBtn);scanW.append(fuW);
        }

        // Accept / Cancel
        var actRow=h("div",{class:"f g8"});
        actRow.append(h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.scanLead=0;ui.scanMsgs=[];ui.scanParsed=null;ui.scanImg=null;ui.scanComments=[];ui.scanLoading=0;R()}},"Cancel"));
        if(ui.scanParsed&&!ui.scanLoading){
          actRow.append(h("button",{class:"bp",style:{flex:1,background:"#22c55e"},onClick:function(){
            var p=ui.scanParsed;
            var lead={id:mid(),year:S(p.year),make:S(p.make),model:S(p.model),askingPrice:S(p.askingPrice),mileage:S(p.mileage),titleStatus:S(p.titleStatus),listingSource:S(p.listingSource),estSellPrice:S(p.estSellPrice),notes:S(p.notes),status:({"watching":"watching","pursue":"pursue","pass":"pass"}[p.status])||"watching",flipDifficulty:S(p.flipDifficulty),partsAvailability:S(p.partsAvailability),demandLevel:S(p.demandLevel),estDaysToSell:S(p.estDaysToSell),listingUrl:S(p.listingUrl),sellerName:S(p.sellerName),sellerContact:S(p.sellerContact),
              knownIssues:(p.knownIssues||[]).map(function(i){return{id:mid(),name:S(i.name),severity:i.severity||"low",difficulty:i.difficulty||"easy",cost:S(i.cost)}}),
              hiddenIssues:(p.hiddenIssues||[]).map(function(i){return{id:mid(),name:S(i.name),severity:i.severity||"low",difficulty:i.difficulty||"easy",cost:S(i.cost)}}),
              photo:ui.scanImg,specs:p.specs||{},createdAt:Date.now()};
            data.leads.push(lead);ui.scanLead=0;ui.scanMsgs=[];ui.scanParsed=null;ui.scanImg=null;ui.scanComments=[];ui.scanLoading=0;logAct("lead-add",[lead.year,lead.make,lead.model].filter(Boolean).join(" ")+" (scan)","lead","");save();R();flash("Lead created");
          }},"Accept Lead"));
        }
        scanW.append(actRow);
      }
      list2.append(scanW);
    }
    if(ui.showPaste){list2.append(rPastePanel())}else if(!ui.scanLead){
      var impRow=h("div",{class:"f g8"});
      var hasKey=!!data.apiKey;
      var scanBtn=h("button",{style:{flex:1,background:hasKey?"rgba(168,85,247,0.06)":"rgba(255,255,255,0.02)",border:hasKey?"1px solid rgba(168,85,247,0.2)":"1px solid #222",borderRadius:"10px",color:hasKey?"#a855f7":"#444",padding:"12px 16px",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",cursor:hasKey?"pointer":"default",fontWeight:600,opacity:hasKey?1:0.5},onClick:function(){if(!data.apiKey){flash("Add API key in Settings to scan");return}ui.scanLead=1;R()}});
      scanBtn.append(ic("scan")," Scan Listing");
      var pBtn=h("button",{style:{flex:1,background:"rgba(34,211,238,0.06)",border:"1px solid rgba(34,211,238,0.2)",borderRadius:"10px",color:"#22d3ee",padding:"12px 16px",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",cursor:"pointer",fontWeight:600},onClick:function(){ui.showPaste=1;R()}});
      pBtn.append(ic("paste")," Paste JSON");
      impRow.append(scanBtn,pBtn);list2.append(impRow)}
    if(ui.addLead){var p2=h("div",{class:"ep fc g12"});p2.append(h("span",{class:"lbl",style:{color:"#22d3ee"}},"New Lead"));var yr_=h("input",{type:"text",placeholder:"Year",style:{width:"70px",flex:"none"}});setTimeout(function(){yr_.focus()},50);var mk=h("input",{type:"text",placeholder:"Make",style:{flex:1,minWidth:"80px"}});var md=h("input",{type:"text",placeholder:"Model",style:{flex:1,minWidth:"80px"}});p2.append(h("div",{class:"f g8 fw"},yr_,mk,md));var pr3=h("input",{type:"text",placeholder:"Asking price",style:{flex:1}});var mi=h("input",{type:"text",placeholder:"Mileage",style:{flex:1}});p2.append(h("div",{class:"f g8"},pr3,mi));var ti=h("input",{type:"text",placeholder:"Title status"});var src=h("input",{type:"text",placeholder:"Listed where"});var url=h("input",{type:"text",placeholder:"Listing URL"});var sn=h("input",{type:"text",placeholder:"Seller name",style:{flex:1}});var sc2=h("input",{type:"text",placeholder:"Seller contact",style:{flex:1}});
      p2.append(ti,src,url,h("div",{class:"f g8"},sn,sc2));p2.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.addLead=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){if(!yr_.value.trim()&&!mk.value.trim()&&!md.value.trim())return;data.leads.push({id:mid(),year:yr_.value.trim(),make:mk.value.trim(),model:md.value.trim(),askingPrice:pr3.value.trim(),mileage:mi.value.trim(),titleStatus:ti.value.trim(),listingSource:src.value.trim(),listingUrl:url.value.trim(),sellerName:sn.value.trim(),sellerContact:sc2.value.trim(),estSellPrice:"",notes:"",status:"watching",knownIssues:[],hiddenIssues:[],flipDifficulty:"",partsAvailability:"",demandLevel:"",estDaysToSell:"",specs:{},createdAt:Date.now()});logAct("lead-add",[yr_.value.trim(),mk.value.trim(),md.value.trim()].filter(Boolean).join(" "),"lead","");ui.addLead=0;save();R()}},"Add Lead")));list2.append(p2)}
    else{var ab3=h("button",{class:"bg",style:{borderColor:"rgba(34,211,238,0.3)"},onClick:function(){ui.addLead=1;R()}});ab3.innerHTML=I.plus+" Add lead";list2.append(ab3)}
    root.append(list2);
  }else if(hTab==="jobs"){
    var jList=h("div",{class:"fc g10"});
    // Filter chips
    var jfRow=h("div",{class:"f ac g4 fw",style:{marginBottom:"4px"}});
    var jfOpts=[{key:"active",label:"Active",color:"#f59e0b"},{key:"all",label:"All",color:"#888"},{key:"delivered",label:"Delivered",color:"#555"}];
    jfOpts.forEach(function(o){var isOn=ui.jobFilter===o.key;var b=h("button",{class:"chip"+(isOn?" on":""),style:{color:isOn?o.color:"#555",borderColor:isOn?o.color:"#333",fontSize:"10px"},onClick:function(){ui.jobFilter=o.key;R()}},o.label);jfRow.append(b)});
    var intakeUrl=window.location.href.replace(/\/[^\/]*$/,"/")+("intake.html");
    var shareIntake=h("button",{class:"chip",style:{color:"#22c55e",borderColor:"rgba(34,197,94,0.3)",fontSize:"10px",marginLeft:"auto"},onClick:function(){navigator.clipboard.writeText(intakeUrl).then(function(){flash("Intake link copied!")}).catch(function(){prompt("Copy this link:",intakeUrl)})}});shareIntake.innerHTML="📋 Intake Link";
    jfRow.append(shareIntake);
    jList.append(jfRow);
    // Incoming requests
    if(_intakeItems.length>0){
      var incW=h("div",{class:"fc g6",style:{padding:"12px",background:"rgba(34,197,94,0.04)",borderRadius:"10px",border:"1px solid rgba(34,197,94,0.15)"}});
      incW.append(h("span",{style:{color:"#22c55e",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Incoming Requests ("+_intakeItems.length+")"));
      _intakeItems.forEach(function(item){
        var vt=[item.vehicle_year,item.vehicle_make,item.vehicle_model].filter(Boolean).join(" ");
        var card=h("div",{class:"fc g4",style:{padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:"8px",border:"1px solid #222"}});
        var top=h("div",{class:"f ac jb"});
        top.append(h("span",{style:{color:"#f5f5f5",fontSize:"13px",fontWeight:700}},item.customer_name||"Unknown"));
        if(item.customer_contact)top.append(h("span",{style:{color:"#888",fontSize:"11px"}},item.customer_contact));
        card.append(top);
        if(vt)card.append(h("span",{style:{color:"#22d3ee",fontSize:"12px"}},vt));
        if(item.problem)card.append(h("span",{style:{color:"#888",fontSize:"12px",lineHeight:1.4}},item.problem.slice(0,120)+(item.problem.length>120?"...":"")));
        if(item.preferred_date)card.append(h("span",{style:{color:"#60a5fa",fontSize:"11px"}},"\u{1F4C5} Preferred: "+item.preferred_date));
        if(item.created_at)card.append(h("span",{style:{color:"#555",fontSize:"10px"}},"Submitted "+new Date(item.created_at).toLocaleDateString()));
        var btns=h("div",{class:"f g8",style:{marginTop:"4px"}});
        btns.append(h("button",{class:"bp",style:{flex:1,fontSize:"12px",padding:"8px"},onClick:function(){acceptIntake(item)}},"Accept"));
        btns.append(h("button",{class:"bs",style:{flex:1,justifyContent:"center",color:"#ef4444",borderColor:"rgba(239,68,68,0.3)"},onClick:function(){dismissIntake(item)}},"Dismiss"));
        card.append(btns);incW.append(card)});
      jList.append(incW)}
    // Filter jobs
    var filteredJobs=data.jobs;
    if(ui.jobFilter==="active")filteredJobs=data.jobs.filter(function(j){return j.status!=="delivered"});
    else if(ui.jobFilter==="delivered")filteredJobs=data.jobs.filter(function(j){return j.status==="delivered"});
    // Group by customer
    var groups={};var order=[];
    filteredJobs.forEach(function(job){var key=job.customerId||( job.customer?job.customer.trim().toLowerCase():"_none");if(!groups[key]){var cust=job.customerId?data.customers.find(function(c){return c.id===job.customerId}):null;groups[key]={name:cust?cust.name:(job.customer||""),contact:cust?cust.contact:(job.customerContact||""),custId:job.customerId||"",jobs:[]};order.push(key)}groups[key].jobs.push(job);if(job.customerContact&&!groups[key].contact)groups[key].contact=job.customerContact});
    // Sort: groups with active jobs first
    order.sort(function(a,b){var aAct=groups[a].jobs.some(function(j){return j.status!=="delivered"});var bAct=groups[b].jobs.some(function(j){return j.status!=="delivered"});if(aAct&&!bAct)return-1;if(!aAct&&bAct)return 1;return 0});
    order.forEach(function(key){
      var grp=groups[key];var activeJobs=grp.jobs.filter(function(j){return j.status!=="delivered"});var doneJobs=grp.jobs.filter(function(j){return j.status==="delivered"});
      var isOpen=ui.jExp[key]!==undefined?ui.jExp[key]:(ui.jobFilter==="delivered"||activeJobs.length>0);
      // Client header
      var cHead=h("button",{class:"f ac g10",style:{padding:"10px 14px",background:"rgba(34,211,238,0.04)",border:"1px solid rgba(34,211,238,0.12)",borderRadius:"10px",width:"100%",textAlign:"left"},onClick:function(){ui.jExp[key]=!isOpen;R()}});
      var ch2=document.createElement("span");ch2.innerHTML=chev(isOpen);ch2.style.display="flex";ch2.style.color="#22d3ee";
      var cInfo=h("div",{style:{flex:1}});
      cInfo.append(h("span",{style:{color:"#22d3ee",fontSize:"14px",fontWeight:700}},grp.name||"Walk-in / No Name"));
      var cMeta=h("div",{class:"f g8",style:{fontSize:"10px",color:"#666"}});
      if(grp.contact)cMeta.append(h("span",null,grp.contact));
      cMeta.append(h("span",null,activeJobs.length+" active"));
      if(doneJobs.length>0)cMeta.append(h("span",null,doneJobs.length+" delivered"));
      cInfo.append(cMeta);
      cHead.append(ch2,cInfo);jList.append(cHead);

      if(isOpen){
        var jobsToShow=activeJobs.concat(doneJobs);
        jobsToShow.sort(function(a,b){var o={intake:0,"in-progress":1,waiting:2,done:3,delivered:4};return(o[a.status]||0)-(o[b.status]||0)});
        var jWrap=h("div",{class:"fc g6",style:{marginLeft:"16px",paddingLeft:"12px",borderLeft:"2px solid rgba(34,211,238,0.12)"}});
        jobsToShow.forEach(function(job){
          var vTitle=[job.vehicleYear,job.vehicleMake,job.vehicleModel].filter(Boolean).join(" ")||"Untitled";
          var r=job.tasks.filter(function(t){return!t.done&&!t.blocked}).length,bl=job.tasks.filter(function(t){return!t.done&&t.blocked}).length,dn=job.tasks.filter(function(t){return t.done}).length;
          var card=h("button",{class:"card fc g6",style:{padding:"10px 12px",opacity:job.status==="delivered"?0.5:1},onClick:function(){nav("job",job.id)}});
          var top=h("div",{class:"f ac g8"});
          top.append(h("span",{style:{color:"#f5f5f5",fontSize:"14px",fontWeight:600,flex:1}},vTitle),badge(job.status));card.append(top);
          if(job.problem)card.append(h("span",{style:{color:"#666",fontSize:"11px",lineHeight:1.3}},job.problem.slice(0,60)+(job.problem.length>60?"...":"")));
          var st=h("div",{class:"f g8 fw",style:{fontSize:"10px"}});
          if(r>0)st.append(h("span",{style:{color:"#f59e0b"}},r+" ready"));if(bl>0)st.append(h("span",{style:{color:"#ef4444"}},bl+" blocked"));if(dn>0)st.append(h("span",{style:{color:"#22c55e"}},dn+" done"));
          if(job.quoted)st.append(h("span",{style:{color:"#22c55e"}},"$"+job.quoted));
          var js=getJobSecs(job);if(js>0)st.append(h("span",{style:{color:"#60a5fa"}},fmtTime(js)));
          if(job.timerStart)st.append(h("span",{style:{color:"#60a5fa",fontWeight:700,animation:"pulse 1.5s ease infinite"}},"REC"));
          if(job.scheduledDate){var isSD=job.scheduledDate===today(),isPSD=job.scheduledDate<today();if(isSD||isPSD)st.append(h("span",{style:{color:isPSD?"#ef4444":"#22c55e",fontWeight:700}},isPSD?"OVERDUE":"TODAY"));else st.append(h("span",{style:{color:"#555"}},job.scheduledDate))}
          card.append(st);jWrap.append(card)});
        jList.append(jWrap)}
    });
    if(filteredJobs.length===0)jList.append(h("p",{style:{color:"#555",fontSize:"13px",textAlign:"center",padding:"20px"}},data.jobs.length===0?"No service jobs yet.":"No "+ui.jobFilter+" jobs"));
    if(ui.addJob){
      var p3=h("div",{class:"ep fc g12"});p3.append(h("span",{class:"lbl",style:{color:"#22d3ee"}},"New Service Job"));
      var selCustId="",selVehIdx=-1;
      // Customer selector
      var custWrap=h("div",{class:"fc g6"});
      var custLabel=h("span",{style:{color:"#888",fontSize:"11px"}},"Customer");custWrap.append(custLabel);
      var custRow=h("div",{class:"f g4 fw"});
      var custFields=h("div",{class:"fc g8",style:{display:"none"}});
      var cName=h("input",{type:"text",placeholder:"Customer name"});
      var cContact=h("input",{type:"text",placeholder:"Phone / contact"});
      custFields.append(cName,cContact);
      // Vehicle fields (shown after customer selected or new)
      var vehWrap=h("div",{class:"fc g6",style:{display:"none"}});
      var vehLabel=h("span",{style:{color:"#888",fontSize:"11px"}},"Vehicle");vehWrap.append(vehLabel);
      var vehRow=h("div",{class:"f g4 fw"});
      var vehFields=h("div",{class:"f g8 fw",style:{display:"none"}});
      var vyr=h("input",{type:"text",placeholder:"Year",style:{width:"70px",flex:"none"}});
      var vmk=h("input",{type:"text",placeholder:"Make",style:{flex:1,minWidth:"80px"}});
      var vmd=h("input",{type:"text",placeholder:"Model",style:{flex:1,minWidth:"80px"}});
      vehFields.append(vyr,vmk,vmd);
      function showVehSelector(){
        vehRow.innerHTML="";vehFields.style.display="none";vehWrap.style.display="flex";selVehIdx=-1;
        if(selCustId){
          var cust=data.customers.find(function(c){return c.id===selCustId});
          if(cust&&cust.vehicles.length>0){
            cust.vehicles.forEach(function(v,vi){
              var vTitle=[v.year,v.make,v.model].filter(Boolean).join(" ");
              var b=h("button",{class:"chip",style:{color:"#777",borderColor:"#333",fontSize:"11px"},onClick:function(e){
                selVehIdx=vi;vyr.value=v.year;vmk.value=v.make;vmd.value=v.model;
                vehRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333"});
                e.currentTarget.style.color="#22d3ee";e.currentTarget.style.borderColor="#22d3ee";
                vehFields.style.display="none";
              }},vTitle);vehRow.append(b)});
          }
        }
        var nb=h("button",{class:"chip",style:{color:"#555",borderColor:"#333",fontSize:"11px",fontStyle:"italic"},onClick:function(e){
          selVehIdx=-2;vyr.value="";vmk.value="";vmd.value="";vehFields.style.display="flex";setTimeout(function(){vyr.focus()},50);
          vehRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333"});
          e.currentTarget.style.color="#22d3ee";e.currentTarget.style.borderColor="#22d3ee";
        }},"+ new vehicle");vehRow.append(nb);
      }
      // Existing customers
      data.customers.forEach(function(c){
        var b=h("button",{class:"chip",style:{color:"#777",borderColor:"#333",fontSize:"11px"},onClick:function(e){
          selCustId=c.id;cName.value=c.name;cContact.value=c.contact||"";custFields.style.display="none";
          custRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333"});
          e.currentTarget.style.color="#22d3ee";e.currentTarget.style.borderColor="#22d3ee";
          showVehSelector();
        }},c.name+(c.vehicles.length?" ("+c.vehicles.length+" vehicles)":""));custRow.append(b)});
      var newCustBtn=h("button",{class:"chip",style:{color:"#555",borderColor:"#333",fontSize:"11px",fontStyle:"italic"},onClick:function(e){
        selCustId="";cName.value="";cContact.value="";custFields.style.display="flex";
        custRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333"});
        e.currentTarget.style.color="#22d3ee";e.currentTarget.style.borderColor="#22d3ee";
        vehWrap.style.display="flex";vehRow.innerHTML="";vehFields.style.display="flex";selVehIdx=-2;
        setTimeout(function(){cName.focus()},50);
      }},"+ new customer");custRow.append(newCustBtn);
      custWrap.append(custRow,custFields);
      vehWrap.append(vehRow,vehFields);
      var prob=h("textarea",{rows:"3",placeholder:"What's wrong? What do they need?"});
      var qt=h("input",{type:"text",placeholder:"Quoted price (optional)"});
      var sdNew=h("input",{type:"date",style:{flex:1}});
      var sdRow2=h("div",{class:"f ac g8"});sdRow2.append(h("span",{style:{color:"#888",fontSize:"12px"}},"Scheduled:"),sdNew);
      p3.append(custWrap,vehWrap,prob,h("div",{class:"f g8"},qt,sdRow2));
      p3.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.addJob=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){
        var cn=cName.value.trim(),cc=cContact.value.trim();
        if(!cn&&!vmk.value.trim())return;
        var custId=selCustId;
        // Create new customer if needed
        if(!custId&&cn){
          var existing=data.customers.find(function(c){return c.name.toLowerCase()===cn.toLowerCase()});
          if(existing){custId=existing.id;if(cc&&!existing.contact)existing.contact=cc}
          else{custId=mid();data.customers.push({id:custId,name:cn,contact:cc,vehicles:[]})}
        }
        // Add vehicle to customer if new
        var vy=vyr.value.trim(),vm=vmk.value.trim(),vmo=vmd.value.trim();
        if(custId&&vm&&selVehIdx===-2){
          var cust=data.customers.find(function(c){return c.id===custId});
          if(cust){var dup=cust.vehicles.some(function(v){return v.year===vy&&v.make===vm&&v.model===vmo});if(!dup)cust.vehicles.push({year:vy,make:vm,model:vmo})}
        }
        data.jobs.push({id:mid(),customerId:custId||"",customer:cn,customerContact:cc,vehicleYear:vy,vehicleMake:vm,vehicleModel:vmo,status:"intake",problem:prob.value.trim(),quoted:qt.value.trim(),scheduledDate:sdNew.value||"",laborSeconds:0,laborRate:"50",timerStart:null,tasks:[],notes:"",photo:null,createdAt:Date.now(),completedAt:null,deliveredAt:null});
        logAct("job-created",(cn?cn+" — ":"")+[vy,vm,vmo].filter(Boolean).join(" "),"job","");
        ui.addJob=0;save();R();flash("Job created")
      }},"Create Job")));jList.append(p3)}
    else{var ab4=h("button",{class:"bg",style:{borderColor:"rgba(34,211,238,0.3)"},onClick:function(){ui.addJob=1;R()}});ab4.innerHTML=I.plus+" New service job";jList.append(ab4)}
    root.append(jList);
  }else if(hTab==="clients"){
    var cList=h("div",{class:"fc g10"});
    if(data.customers.length===0)cList.append(h("p",{style:{color:"#555",fontSize:"13px",textAlign:"center",padding:"20px"}},"No clients yet. They'll appear when you create jobs."));
    data.customers.forEach(function(cust){
      var custJobs=data.jobs.filter(function(j){return j.customerId===cust.id});
      var activeCount=custJobs.filter(function(j){return j.status!=="delivered"}).length;
      var card=h("button",{class:"card fc g6",onClick:function(){nav("client",cust.id)}});
      var top=h("div",{class:"f ac g10"});
      top.append(h("span",{style:{color:"#f5f5f5",fontSize:"16px",fontWeight:700,flex:1}},cust.name||"Unnamed"));
      if(activeCount>0)top.append(h("span",{style:{background:"rgba(34,211,238,0.15)",color:"#22d3ee",padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:600}},activeCount+" active"));
      card.append(top);
      var meta=h("div",{class:"f g8 fw",style:{fontSize:"11px"}});
      if(cust.contact)meta.append(h("span",{style:{color:"#888"}},cust.contact));
      meta.append(h("span",{style:{color:"#555"}},cust.vehicles.length+" vehicle"+(cust.vehicles.length!==1?"s":"")));
      meta.append(h("span",{style:{color:"#555"}},custJobs.length+" job"+(custJobs.length!==1?"s":"")));
      card.append(meta);
      if(cust.vehicles.length>0){var vRow=h("div",{class:"f g4 fw"});cust.vehicles.forEach(function(v){
        vRow.append(h("span",{style:{color:"#60a5fa",fontSize:"10px",background:"rgba(96,165,250,0.08)",padding:"2px 6px",borderRadius:"4px"}},[v.year,v.make,v.model].filter(Boolean).join(" ")))});
        card.append(vRow)}
      cList.append(card)});
    root.append(cList);
  }else if(hTab==="activity"){
    var aw=h("div",{class:"fc g12"});
    var acts=(data.activity||[]).filter(function(a){return a.action!=="timer-start"});
    var aIcons={"task-done":"✓","task-undone":"↩","job-status":"◆","timer-stop":"⏱","expense-add":"$","trip-log":"🚗","job-created":"＋","lead-add":"◎","lead-convert":"⇒","bike-add":"🏍","bike-sold":"💰","note-add":"📝","note-append":"📝","chat-send":"💬","part-add":"🔩","part-status":"🔩","log-wrench":"🔧","log-ride":"🏍","log-received":"📦"};
    var aCols={"task-done":"#22c55e","task-undone":"#888","job-status":"#22d3ee","timer-stop":"#60a5fa","expense-add":"#f59e0b","trip-log":"#a855f7","job-created":"#22d3ee","lead-add":"#22d3ee","lead-convert":"#a855f7","bike-add":"#a855f7","bike-sold":"#22c55e","note-add":"#888","note-append":"#888","chat-send":"#22d3ee","part-add":"#60a5fa","part-status":"#60a5fa","log-wrench":"#f59e0b","log-ride":"#a855f7","log-received":"#22c55e"};

    // Heatmap
    var dayCounts={};var maxCount=0;
    acts.forEach(function(a){var d=new Date(a.ts).toISOString().split("T")[0];dayCounts[d]=(dayCounts[d]||0)+1;if(dayCounts[d]>maxCount)maxCount=dayCounts[d]});
    var now=new Date();var todayStr_=now.toISOString().split("T")[0];
    var grid=h("div",{style:{display:"flex",gap:"3px",overflowX:"auto",padding:"4px 0"}});
    var lblCol=h("div",{style:{display:"flex",flexDirection:"column",gap:"3px",marginRight:"2px"}});
    ["S","M","T","W","T","F","S"].forEach(function(d,i){lblCol.append(h("div",{style:{width:"10px",height:"10px",fontSize:"7px",color:"#444",display:"flex",alignItems:"center",justifyContent:"center"}},i%2===1?d:""))});
    grid.append(lblCol);
    var startDay=new Date(now);startDay.setDate(startDay.getDate()-167-startDay.getDay());
    for(var w2=0;w2<24;w2++){var col=h("div",{style:{display:"flex",flexDirection:"column",gap:"3px"}});
      for(var d2=0;d2<7;d2++){var cellDate=new Date(startDay);cellDate.setDate(cellDate.getDate()+w2*7+d2);var ds=cellDate.toISOString().split("T")[0];var count=dayCounts[ds]||0;var intensity=maxCount>0?count/maxCount:0;var bg=count===0?"rgba(255,255,255,0.03)":intensity<0.25?"rgba(245,158,11,0.15)":intensity<0.5?"rgba(245,158,11,0.3)":intensity<0.75?"rgba(245,158,11,0.5)":"rgba(245,158,11,0.75)";
        col.append(h("div",{title:ds+": "+count+" actions",style:{width:"10px",height:"10px",borderRadius:"2px",background:bg,border:ds===todayStr_?"1px solid #f59e0b":"none"}}))}
      grid.append(col)}
    aw.append(grid);
    var leg=h("div",{class:"f ac g4",style:{fontSize:"9px",color:"#444"}});leg.append(h("span",null,"less"));
    [0,0.15,0.3,0.5,0.75].forEach(function(v){leg.append(h("div",{style:{width:"10px",height:"10px",borderRadius:"2px",background:v===0?"rgba(255,255,255,0.03)":"rgba(245,158,11,"+v+")"}}))});
    leg.append(h("span",null,"more"));leg.append(h("span",{style:{marginLeft:"auto",color:"#555"}},acts.length+" total actions"));
    aw.append(leg);

    // Lifetime stats
    var statSec=h("div",{class:"fc g6",style:{padding:"12px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",border:"1px solid #1a1a1a"}});
    statSec.append(h("span",{style:{color:"#888",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"All Time"));
    var sRow=h("div",{class:"f g12 fw",style:{fontSize:"12px"}});
    var totalTasks=acts.filter(function(a){return a.action==="task-done"}).length;
    var totalTimerSecs=0;acts.filter(function(a){return a.action==="timer-stop"}).forEach(function(a){var hm=a.detail.match(/(\d+)h/);var mm=a.detail.match(/(\d+)m/);var sm=a.detail.match(/(\d+)s/);totalTimerSecs+=(hm?parseInt(hm[1]):0)*3600+(mm?parseInt(mm[1]):0)*60+(sm?parseInt(sm[1]):0)});
    var totalExpense=acts.filter(function(a){return a.action==="expense-add"}).reduce(function(s,a){var m=a.detail.match(/\$(\d+\.?\d*)/);return s+(m?parseFloat(m[1]):0)},0);
    var totalParts=acts.filter(function(a){return a.action==="part-add"}).length;
    var totalNotes=acts.filter(function(a){return a.action==="note-add"||a.action==="note-append"}).length;
    var totalJobs=acts.filter(function(a){return a.action==="job-created"}).length;
    var totalSold=acts.filter(function(a){return a.action==="bike-sold"}).length;
    if(totalTasks)sRow.append(h("span",{style:{color:"#22c55e"}},totalTasks+" tasks"));
    if(totalTimerSecs){var th=Math.floor(totalTimerSecs/3600);var tm=Math.floor((totalTimerSecs%3600)/60);sRow.append(h("span",{style:{color:"#60a5fa"}},th+"h "+tm+"m"))}
    if(totalExpense)sRow.append(h("span",{style:{color:"#f59e0b"}},"$"+$$(totalExpense)));
    if(totalParts)sRow.append(h("span",{style:{color:"#60a5fa"}},totalParts+" parts"));
    if(totalNotes)sRow.append(h("span",{style:{color:"#888"}},totalNotes+" notes"));
    if(totalJobs)sRow.append(h("span",{style:{color:"#22d3ee"}},totalJobs+" jobs"));
    if(totalSold)sRow.append(h("span",{style:{color:"#22c55e"}},totalSold+" sold"));
    var activeDays=Object.keys(dayCounts).length;
    sRow.append(h("span",{style:{color:"#555"}},activeDays+" active days"));
    statSec.append(sRow);aw.append(statSec);

    // Filter
    var actFilter=ui.actFilter||"all";
    var filterRow=h("div",{class:"f g4 fw",style:{marginTop:"4px"}});
    [{key:"all",label:"All"},{key:"task-done",label:"Tasks"},{key:"timer-stop",label:"Timer"},{key:"expense-add",label:"Expenses"},{key:"part-add",label:"Parts"},{key:"note-add",label:"Notes"},{key:"job-status",label:"Status"}].forEach(function(f){
      var isOn=actFilter===f.key;
      filterRow.append(h("button",{class:"chip"+(isOn?" on":""),style:{color:isOn?(aCols[f.key]||"#f59e0b"):"#555",borderColor:isOn?(aCols[f.key]||"#f59e0b"):"#333",fontSize:"10px"},onClick:function(){ui.actFilter=f.key;R()}},f.label))});
    aw.append(filterRow);

    // Full log grouped by day
    var filtered=actFilter==="all"?acts:actFilter==="note-add"?acts.filter(function(a){return a.action==="note-add"||a.action==="note-append"}):actFilter==="part-add"?acts.filter(function(a){return a.action==="part-add"||a.action==="part-status"}):acts.filter(function(a){return a.action===actFilter});
    var byDay={};filtered.sort(function(a,b){return b.ts-a.ts}).forEach(function(a){var d=new Date(a.ts).toISOString().split("T")[0];if(!byDay[d])byDay[d]=[];byDay[d].push(a)});
    var dayKeys=Object.keys(byDay).sort(function(a,b){return b<a?-1:1});
    var logW=h("div",{class:"fc g2"});
    dayKeys.forEach(function(day){
      var dayDate=new Date(day+"T12:00:00");
      var dayLabel=dayDate.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
      var isToday2=day===todayStr_;
      logW.append(h("div",{style:{color:isToday2?"#f59e0b":"#555",fontSize:"10px",fontWeight:700,padding:"8px 0 2px",borderTop:"1px solid #1a1a1a",marginTop:"4px"}},isToday2?"Today — "+byDay[day].length+" actions":dayLabel+" — "+byDay[day].length));
      byDay[day].forEach(function(a){
        var t=new Date(a.ts);var time=("0"+t.getHours()).slice(-2)+":"+("0"+t.getMinutes()).slice(-2);
        var row=h("div",{class:"f ac g6",style:{padding:"3px 0",fontSize:"11px"}});
        row.append(h("span",{style:{color:"#444",fontSize:"10px",fontVariantNumeric:"tabular-nums",flexShrink:0,width:"36px"}},time));
        row.append(h("span",{style:{color:aCols[a.action]||"#888",fontSize:"10px",flexShrink:0}},aIcons[a.action]||"·"));
        row.append(h("span",{style:{color:"#ccc",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},a.detail||(a.action||"").replace(/-/g," ")));
        logW.append(row)})});
    if(filtered.length===0)logW.append(h("p",{style:{color:"#444",fontSize:"12px",textAlign:"center",padding:"20px"}},"No activity"+(actFilter!=="all"?" for this filter":"")));
    aw.append(logW);root.append(aw);
  }else if(hTab==="sold"){root.append(rAnalytics())
  }else if(hTab==="expenses"){root.append(rExpenses())}
  return root;
}

