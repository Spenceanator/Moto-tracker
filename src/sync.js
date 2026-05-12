// ============ UNREAD CHAT TRACKING ============
var _chatRead={};try{_chatRead=JSON.parse(localStorage.getItem("drydock_chat_read"))||{}}catch(e){}
var _chatCounts={};
var _lastNotifTs=0;

function requestNotifPermission(){
  if("Notification" in window && Notification.permission==="default"){
    Notification.requestPermission();
  }
}
function sendNotif(title,body,jobId){
  if("Notification" in window && Notification.permission==="granted"){
    try{
      var n=new Notification(title,{body:body,tag:"drydock-"+(jobId||Date.now()),data:{jobId:jobId||""}});
      n.onclick=function(){window.focus();if(jobId){var jj=data.jobs.find(function(j){return j.id===jobId});if(jj&&jj.shareToken){_chatRead[jj.shareToken]=Date.now();try{localStorage.setItem("drydock_chat_read",JSON.stringify(_chatRead))}catch(e){}_chatCounts[jj.shareToken]=0}nav("job",jobId);setTimeout(function(){ui.bTab="chat";R()},50)}};
    }catch(e){}
  }
}
function pingSound(){
  try{var ctx=new(window.AudioContext||window.webkitAudioContext)();var osc=ctx.createOscillator();var gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=880;osc.type="sine";gain.gain.value=0.08;osc.start();gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);osc.stop(ctx.currentTime+0.3)}catch(e){}
}

var _notifItems=[];
function addNotifItem(type,text,jobId){
  _notifItems.unshift({type:type,text:text,jobId:jobId||"",ts:Date.now()});
  if(_notifItems.length>20)_notifItems=_notifItems.slice(0,20);
}

function pollAllChats(){
  var tokens=data.jobs.filter(function(j){return j.shareToken&&j.status!=="delivered"}).map(function(j){return j.shareToken});
  if(tokens.length===0)return;
  var tokenFilter=tokens.map(function(t){return"token.eq."+t}).join(",");
  fetch(SB_URL+"/rest/v1/job_chat?or=("+tokenFilter+")&sender=eq.customer&order=created_at.desc&limit=50",{method:"GET",headers:sbHeaders()})
  .then(function(r){return r.json()}).then(function(msgs){
    if(!msgs)return;
    var prevCounts=JSON.parse(JSON.stringify(_chatCounts));
    _chatCounts={};
    msgs.forEach(function(m){
      var lastRead=_chatRead[m.token]||0;
      var msgTime=new Date(m.created_at).getTime();
      if(msgTime>lastRead){
        if(!_chatCounts[m.token])_chatCounts[m.token]=0;
        _chatCounts[m.token]++;
      }
    });
    // Notify per job that has NEW unread (not already notified)
    var totalUnread=Object.keys(_chatCounts).reduce(function(s,k){return s+_chatCounts[k]},0);
    if(Date.now()-_lastNotifTs>15000){
      Object.keys(_chatCounts).forEach(function(token){
        var prev=prevCounts[token]||0;
        if(_chatCounts[token]>prev){
          var job=data.jobs.find(function(j){return j.shareToken===token});
          if(job){
            var vt=[job.vehicleYear,job.vehicleMake,job.vehicleModel].filter(Boolean).join(" ")||"Job";
            var label=(job.customer?job.customer+" — ":"")+vt;
            sendNotif("💬 "+label,(job.customer||"Customer")+" sent a message",job.id);
            addNotifItem("chat",label,job.id);
            _lastNotifTs=Date.now();
          }
        }
      });
      if(totalUnread>0&&Object.keys(_chatCounts).some(function(k){return(_chatCounts[k]||0)>(prevCounts[k]||0)}))pingSound();
    }
    updateUnreadBadge(totalUnread);
    renderNotifBell();
  }).catch(function(){});
}
function getUnreadTotal(){return Object.keys(_chatCounts).reduce(function(s,k){return s+(_chatCounts[k]||0)},0)}
function updateUnreadBadge(count){
  var el=document.getElementById("chat-badge");
  if(el){el.textContent=count>0?count:"";el.style.display=count>0?"inline-block":"none"}
}
var _notifOpen=false;
function renderNotifBell(){
  var total=getUnreadTotal()+_intakeItems.length;
  var el=document.getElementById("notif-bell");
  if(!el)return;
  var badge=el.querySelector(".nb-count");
  if(badge){badge.textContent=total>0?total:"";badge.style.display=total>0?"flex":"none"}
  var btn=el.querySelector("button");
  if(btn){btn.style.animation=total>0?"bellShake 0.8s ease-in-out infinite":"none";btn.style.color=total>0?"#f59e0b":"#555"}
}
function toggleNotifMenu(){
  _notifOpen=!_notifOpen;
  var menu=document.getElementById("notif-menu");
  if(!menu)return;
  if(!_notifOpen){menu.style.display="none";return}
  menu.style.display="flex";menu.innerHTML="";
  // Unread chats
  var unreadJobs=data.jobs.filter(function(j){return j.shareToken&&_chatCounts[j.shareToken]>0});
  if(unreadJobs.length>0){
    var hdr=document.createElement("div");hdr.style.cssText="color:#f59e0b;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:8px 12px 4px";hdr.textContent="Messages";menu.appendChild(hdr);
    unreadJobs.forEach(function(j){
      var vt=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean).join(" ")||"Job";
      var label=(j.customer?j.customer+" — ":"")+vt;
      var count=_chatCounts[j.shareToken]||0;
      var row=document.createElement("button");row.style.cssText="display:flex;align-items:center;gap:8px;padding:8px 12px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid #1a1a1a;cursor:pointer;font-family:var(--font)";
      row.onmouseenter=function(){row.style.background="#1a1a1c"};row.onmouseleave=function(){row.style.background="none"};
      var txt=document.createElement("span");txt.style.cssText="flex:1;color:#e5e5e5;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";txt.textContent=label;
      var badge=document.createElement("span");badge.style.cssText="background:#f59e0b;color:#000;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px";badge.textContent=count;
      row.appendChild(txt);row.appendChild(badge);
      row.onclick=function(){_notifOpen=false;menu.style.display="none";_chatRead[j.shareToken]=Date.now();try{localStorage.setItem("drydock_chat_read",JSON.stringify(_chatRead))}catch(e){}_chatCounts[j.shareToken]=0;renderNotifBell();nav("job",j.id);setTimeout(function(){ui.bTab="chat";R()},50)};
      menu.appendChild(row);
    });
  }
  // Intake requests
  if(_intakeItems.length>0){
    var hdr2=document.createElement("div");hdr2.style.cssText="color:#22c55e;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:8px 12px 4px";hdr2.textContent="Requests";menu.appendChild(hdr2);
    _intakeItems.forEach(function(item){
      var row=document.createElement("button");row.style.cssText="display:flex;align-items:center;gap:8px;padding:8px 12px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid #1a1a1a;cursor:pointer;font-family:var(--font)";
      row.onmouseenter=function(){row.style.background="#1a1a1c"};row.onmouseleave=function(){row.style.background="none"};
      var txt=document.createElement("span");txt.style.cssText="flex:1;color:#e5e5e5;font-size:12px";txt.textContent=(item.customer_name||"Unknown")+" — "+[item.vehicle_year,item.vehicle_make,item.vehicle_model].filter(Boolean).join(" ");
      row.appendChild(txt);
      row.onclick=function(){_notifOpen=false;menu.style.display="none";hTab="jobs";cv="home";R()};
      menu.appendChild(row);
    });
  }
  if(unreadJobs.length===0&&_intakeItems.length===0){
    var empty=document.createElement("div");empty.style.cssText="color:#444;font-size:11px;text-align:center;padding:16px";empty.textContent="No notifications";menu.appendChild(empty);
  }
}
// Request notification permission on first interaction
document.addEventListener("click",function(){requestNotifPermission()},{once:true});

// ============ SUPABASE SYNC ============
var _syncTimer=null,_syncing=0,_lastPushTs=0,_pollInt=null,_localDirty=0;
function syncPush(){_localDirty=1;if(_syncTimer)clearTimeout(_syncTimer);_syncTimer=setTimeout(function(){_doSync()},2000)}

// ---- Entity-level merge ----
function mergeData(local,remote){
  var m=JSON.parse(JSON.stringify(local));
  var cols=['bikes','leads','sold','expenses','trips','jobs','customers'];
  var stats={kept:0,taken:0,merged:0};
  cols.forEach(function(c){
    var lm={},rm={},ids={};
    (local[c]||[]).forEach(function(e){if(e.id){lm[e.id]=e;ids[e.id]=1}});
    (remote[c]||[]).forEach(function(e){if(e.id){rm[e.id]=e;ids[e.id]=1}});
    var result=[];
    Object.keys(ids).forEach(function(id){
      var l=lm[id],r=rm[id];
      if(l&&!r){result.push(l);stats.kept++}
      else if(r&&!l){result.push(r);stats.taken++}
      else{result.push((r._ts||0)>(l._ts||0)?r:l);stats.merged++}
    });
    m[c]=result;
  });
  // Cross-collection dedup: if an ID is in sold[], remove from bikes[]
  var soldIds={};m.sold.forEach(function(e){if(e.id)soldIds[e.id]=1});
  m.bikes=m.bikes.filter(function(b){return!soldIds[b.id]});
  // Activity: merge by union, dedupe by ts+action+id
  var actMap={};
  (local.activity||[]).forEach(function(a){actMap[a.ts+"|"+a.action+"|"+(a.id||"")]=a});
  (remote.activity||[]).forEach(function(a){var k=a.ts+"|"+a.action+"|"+(a.id||"");if(!actMap[k])actMap[k]=a});
  m.activity=Object.keys(actMap).map(function(k){return actMap[k]}).sort(function(a,b){return a.ts-b.ts});
  if(m.activity.length>2000)m.activity=m.activity.slice(-2000);
  // Top-level fields
  m._ts=Math.max(local._ts||0,remote._ts||0);
  m.apiKey=local.apiKey||remote.apiKey;
  m.leadPrompt=(local._ts||0)>=(remote._ts||0)?local.leadPrompt:remote.leadPrompt;
  if(!m.leadPrompt)m.leadPrompt=local.leadPrompt||remote.leadPrompt||"";
  // Checklist templates: keep from whichever blob is newer
  if((remote._ts||0)>(local._ts||0)&&remote.checklistTemplates)m.checklistTemplates=remote.checklistTemplates;
  // Vehicles list: merge by name
  var vMap={};(local.vehicles||[]).forEach(function(v){vMap[v]=1});(remote.vehicles||[]).forEach(function(v){vMap[v]=1});
  m.vehicles=Object.keys(vMap);
  console.log("[SYNC] Merge complete — local-only:"+stats.kept+", remote-only:"+stats.taken+", both:"+stats.merged);
  return m;
}

function _doSync(){
  if(_syncing||!getAuth())return;_syncing=1;
  console.log("[SYNC] Push started");
  var url=SB_URL+"/rest/v1/sync?id=eq.main";
  fetch(url+"&select=data,updated_at",{method:"GET",headers:sbHeaders()})
  .then(function(r){return r.json()}).then(function(rows){
    var method,postUrl,toSend;
    if(rows.length>0&&rows[0].data){
      method="PATCH";postUrl=url;
      console.log("[SYNC] Remote exists, merging before push");
      toSend=mergeData(data,rows[0].data);
      data=migrate(toSend);
      localStorage.setItem(SK,JSON.stringify(data));
      _updateSnapshot();
    }else{
      method="POST";postUrl=SB_URL+"/rest/v1/sync";
      toSend=JSON.parse(JSON.stringify(data));
      console.log("[SYNC] No remote row, creating");
    }
    var now=new Date().toISOString();
    var body=JSON.stringify({id:"main",data:toSend,updated_at:now});
    var hdrs=sbHeaders();hdrs["Prefer"]="return=minimal";
    return fetch(postUrl,{method:method,headers:hdrs,body:body})
  }).then(function(r){
    _syncing=0;_localDirty=0;_lastPushTs=Date.now();
    console.log("[SYNC] Push complete");
    var el=document.getElementById("sync-dot");if(el){el.style.background="#22c55e";el.title="Synced"}
    startPoll();
  }).catch(function(e){_syncing=0;console.error("[SYNC] Push failed:",e);var el=document.getElementById("sync-dot");if(el){el.style.background="#ef4444";el.title="Sync failed"}})
}
function syncPull(cb,force){
  if(!getAuth()){if(cb)cb();return}
  console.log("[SYNC] Pull started, force="+!!force);
  fetch(SB_URL+"/rest/v1/sync?id=eq.main&select=data,updated_at",{method:"GET",headers:sbHeaders()})
  .then(function(r){return r.json()}).then(function(rows){
    if(rows.length>0&&rows[0].data){
      var remote=rows[0].data;var remoteTs=remote._ts||0;var localTs=data._ts||0;
      if(force||remoteTs>localTs){
        console.log("[SYNC] Merging — local _ts:"+localTs+", remote _ts:"+remoteTs);
        var merged=mergeData(data,remote);
        merged.apiKey=data.apiKey||merged.apiKey;
        data=migrate(merged);_localDirty=0;_lastPushTs=Date.now();
        _updateSnapshot();
        localStorage.setItem(SK,JSON.stringify(data));
        flash("Synced from cloud");R()
      }else{console.log("[SYNC] Pull skipped — local is newer")}
    }else if(force){flash("Nothing in cloud yet")}
    if(cb)cb()
  }).catch(function(e){console.error("[SYNC] Pull failed:",e);flash("Sync pull failed");if(cb)cb()})
}
function startPoll(){if(_pollInt)return;_pollInt=setInterval(pollCheck,15000)}
function stopPoll(){if(_pollInt){clearInterval(_pollInt);_pollInt=null}}
function pollCheck(){
  if(_syncing||!getAuth())return;
  fetch(SB_URL+"/rest/v1/sync?id=eq.main&select=updated_at",{method:"GET",headers:sbHeaders()})
  .then(function(r){return r.json()}).then(function(rows){
    if(!rows||rows.length===0)return;
    var remoteTime=new Date(rows[0].updated_at).getTime();
    if(remoteTime>_lastPushTs){
      if(_localDirty){
        var el=document.getElementById("sync-dot");if(el){el.style.background="#f59e0b";el.title="Remote changed — tap Pull to update"}
      }else{
        syncPull(function(){var el=document.getElementById("sync-dot");if(el){el.style.background="#22c55e"}})
      }
    }
  }).catch(function(){});
  fetchIntake(function(){R()});
}
// ============ INTAKE ============
var _intakeItems=[];
var _unreadChats=[];// [{jobId, jobLabel, token, count, lastMsg}]
var _lastChatPoll=0;
var _notifPermission=typeof Notification!=="undefined"?Notification.permission:"denied";
function fetchIntake(cb,force){
  if(!getAuth()){if(cb)cb();return}
  fetch(SB_URL+"/rest/v1/intake?status=eq.pending&order=created_at.desc",{method:"GET",headers:sbHeaders()})
  .then(function(r){return r.json()}).then(function(rows){
    var prev=_intakeItems.length;_intakeItems=rows||[];
    if(_intakeItems.length>prev&&prev>=0){
      var iName=(_intakeItems[0].customer_name||"Someone");
      var iVeh=[_intakeItems[0].vehicle_year,_intakeItems[0].vehicle_make,_intakeItems[0].vehicle_model].filter(Boolean).join(" ");
      sendNotif("🔧 New Request",iName+(iVeh?" — "+iVeh:"")+" needs service");
      addNotifItem("intake",iName+(iVeh?" — "+iVeh:""),"");
      renderNotifBell();
      pingSound();
    }
    if(force||_intakeItems.length!==prev){if(cb)cb()}
  }).catch(function(){if(cb)cb()})
}
function acceptIntake(item){
  var cn=(item.customer_name||"").trim(),cc=(item.customer_contact||"").trim();
  var custId="";
  if(cn){
    var existing=data.customers.find(function(c){return c.name.toLowerCase()===cn.toLowerCase()});
    if(existing){custId=existing.id;if(cc&&!existing.contact)existing.contact=cc}
    else{custId=mid();data.customers.push({id:custId,name:cn,contact:cc,vehicles:[]})}
  }
  var vy=item.vehicle_year||"",vm=item.vehicle_make||"",vmo=item.vehicle_model||"";
  if(custId&&vm){
    var cust=data.customers.find(function(c){return c.id===custId});
    if(cust){var dup=cust.vehicles.some(function(v){return v.year===vy&&v.make===vm&&v.model===vmo});if(!dup)cust.vehicles.push({year:vy,make:vm,model:vmo})}
  }
  data.jobs.push({id:mid(),customerId:custId,customer:cn,customerContact:cc,vehicleYear:vy,vehicleMake:vm,vehicleModel:vmo,status:"intake",problem:item.problem||"",quoted:"",scheduledDate:item.preferred_date||"",laborSeconds:0,laborRate:"50",timerStart:null,tasks:[],notes:"Submitted via intake form",photo:null,createdAt:Date.now(),completedAt:null,deliveredAt:null});
  logAct("job-created",(cn?cn+" — ":"")+[vy,vm,vmo].filter(Boolean).join(" "),"job","");
  save();
  fetch(SB_URL+"/rest/v1/intake?id=eq."+item.id,{method:"PATCH",headers:sbHeaders(),body:JSON.stringify({status:"accepted"})}).catch(function(){});
  _intakeItems=_intakeItems.filter(function(i){return i.id!==item.id});
  R();flash("Job created from request");
}
function dismissIntake(item){
  fetch(SB_URL+"/rest/v1/intake?id=eq."+item.id,{method:"PATCH",headers:sbHeaders(),body:JSON.stringify({status:"dismissed"})}).catch(function(){});
  _intakeItems=_intakeItems.filter(function(i){return i.id!==item.id});
  R();
}
// ============ JOB SHARING ============
function getShareToken(job){
  if(job.shareToken)return job.shareToken;
  var token=mid()+mid();job.shareToken=token;save();return token;
}
function getStatusUrl(job){
  var base=window.location.href.replace(/\/[^\/]*$/,"/");
  return base+"status.html?t="+getShareToken(job);
}
function pushJobPublic(job){
  if(!job.shareToken||!getAuth())return;
  var vTitle=[job.vehicleYear,job.vehicleMake,job.vehicleModel].filter(Boolean).join(" ")||"";
  var tasks=(job.tasks||[]).filter(function(t){return t.verified}).map(function(t){return{text:t.name,status:t.done?"done":t.blocked?"blocked":"ready"}});
  var payload={
    token:job.shareToken,
    customer_name:job.customer||"",
    vehicle:vTitle,
    status:job.status||"intake",
    problem:job.problem||"",
    scheduled_date:job.scheduledDate||"",
    tasks_summary:tasks,
    notes_public:job.publicNotes||"",
    photos:job.publicPhotos||[],
    updated_at:new Date().toISOString()
  };
  var url=SB_URL+"/rest/v1/job_public?token=eq."+job.shareToken;
  fetch(url,{method:"GET",headers:sbHeaders()}).then(function(r){return r.json()}).then(function(rows){
    var method=rows.length>0?"PATCH":"POST";
    var postUrl=rows.length>0?url:SB_URL+"/rest/v1/job_public";
    var hdrs=sbHeaders();hdrs["Prefer"]="return=minimal";
    fetch(postUrl,{method:method,headers:hdrs,body:JSON.stringify(payload)});
  }).catch(function(e){console.error("Push job_public failed:",e)});
}
function flash(msg){var el=document.createElement("div");el.textContent=msg||"Saved";Object.assign(el.style,{position:"fixed",top:"calc(env(safe-area-inset-top,0px) + 12px)",left:"50%",transform:"translateX(-50%)",background:"#22c55e",color:"#000",padding:"8px 20px",borderRadius:"8px",fontSize:"13px",fontWeight:"700",fontFamily:"var(--font)",zIndex:"9999",opacity:"1",transition:"opacity 0.3s"});document.body.appendChild(el);setTimeout(function(){el.style.opacity="0";setTimeout(function(){el.remove()},300)},1200)}
function mid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function S(v){return v==null?"":String(v)}
function $(v){return parseFloat(S(v).replace(/[^0-9.]/g,""))||0}
function $$(v){return Math.round(v*100)/100}
function daysBetween(a,b){if(!a||!b)return 0;return Math.round((new Date(b)-new Date(a))/(1e3*60*60*24))}
function today(){return new Date().toISOString().split("T")[0]}
function fmtTime(sec){var h=Math.floor(sec/3600);var m=Math.floor((sec%3600)/60);var s=Math.floor(sec%60);return(h?h+"h ":"")+("0"+m).slice(-2)+"m "+("0"+s).slice(-2)+"s"}
function getJobSecs(job){var base=job.laborSeconds||0;if(job.timerStart)base+=Math.floor((Date.now()-job.timerStart)/1000);return base}
// Timer tick for running jobs
var _timerInt=null;function startTimerTick(){if(_timerInt)return;_timerInt=setInterval(function(){var any=data.jobs.some(function(j){return!!j.timerStart});if(any){var els=document.querySelectorAll("[data-timer-job]");els.forEach(function(el){var j=data.jobs.find(function(j2){return j2.id===el.dataset.timerJob});if(j)el.textContent=fmtTime(getJobSecs(j))});data.jobs.forEach(function(j){if(j.timerStart){var el=document.getElementById("today-timer-"+j.id);if(el)el.textContent=fmtTime(getJobSecs(j))}})}else{clearInterval(_timerInt);_timerInt=null}},1000)}
function compressImg(file,maxW,cb){var r=new FileReader();r.onload=function(e){var img=new Image();img.onload=function(){var ow=img.width,oh=img.height,w=ow,ht=oh;
  // Dynamic quality: small originals stay crisp, large photos compress harder
  var q;if(ow<=maxW){q=0.85}else if(ow<=maxW*2){q=0.75;ht=ht*(maxW/w);w=maxW}else{q=0.6;ht=ht*(maxW/w);w=maxW}
  var c=document.createElement("canvas");c.width=Math.round(w);c.height=Math.round(ht);c.getContext("2d").drawImage(img,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",q))};img.src=e.target.result};r.readAsDataURL(file)}
function dlBackup(){var j=JSON.stringify(data);var b=new Blob([j],{type:"application/json"});var u=URL.createObjectURL(b);var a=document.createElement("a");a.href=u;a.download="drydock-backup-"+today()+".json";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);flash("Backup downloaded")}
function expCSV(){var rows=[["Date","Amount","Category","Vendor","Description"]];data.expenses.forEach(function(e){rows.push([e.date,e.amount,e.category,'"'+(e.vendor||"").replace(/"/g,'""')+'"','"'+(e.description||"").replace(/"/g,'""')+'"'])});dlCSV(rows,"drydock-expenses-"+today()+".csv")}
function tripCSV(){var rows=[["Date","Start Odo","End Odo","Miles","Purpose","Destination","Vehicle","Deduction"]];data.trips.forEach(function(t){rows.push([t.date,t.startOdo,t.endOdo,t.miles,t.purpose,'"'+(t.destination||"").replace(/"/g,'""')+'"','"'+(t.vehicle||"").replace(/"/g,'""')+'"',"$"+(t.miles*IRS_RATE).toFixed(2)])});dlCSV(rows,"drydock-mileage-"+today()+".csv")}
function dlCSV(rows,fn){var csv=rows.map(function(r){return r.join(",")}).join("\n");var b=new Blob([csv],{type:"text/csv"});var u=URL.createObjectURL(b);var a=document.createElement("a");a.href=u;a.download=fn;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);flash("CSV exported")}

