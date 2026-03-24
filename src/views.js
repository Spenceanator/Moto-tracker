// ============ LEAD VIEW ============
function rLeadView(){
  var lead=data.leads.find(function(l){return l.id===selLead});
  if(!lead){nav("home");return h("div")}
  var root=h("div",{class:"fc g16"});var title=[lead.year,lead.make,lead.model].filter(Boolean).join(" ")||"Untitled Lead";
  var rehab=calcRehab(lead);
  var hdr=h("div",{class:"f as g12"});var bb=h("button",{class:"ib",style:{marginTop:"2px"},onClick:function(){nav("home")}});bb.innerHTML=I.back;hdr.append(bb);
  if(lead.photo){var pw=h("div",{style:{position:"relative",flexShrink:0}});pw.append(h("img",{class:"photo-thumb",src:lead.photo,style:{cursor:"pointer"},onClick:function(){ui.photoFull=!ui.photoFull;R()}}));pw.append(h("button",{style:{position:"absolute",top:"-4px",right:"-4px",width:"18px",height:"18px",borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:"10px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},onClick:function(){lead.photo=null;ss();R()}},"x"));hdr.append(pw)}
  else{var ap=h("div",{class:"photo-upload",onClick:function(){photoUpload(lead,"photo",R)}});ap.innerHTML=I.cam;hdr.append(ap)}
  var info=h("div",{style:{flex:1}});var nr=h("div",{class:"f ac g8"});nr.append(h("h2",{style:{color:"#f5f5f5",fontSize:"18px",margin:0}},title));
  var eb=h("button",{class:"ib",onClick:function(){ui.lEdit=!ui.lEdit;R()}});eb.innerHTML=I.edit;nr.append(eb);info.append(nr);
  var qs=h("div",{class:"f g12 fw",style:{marginTop:"6px",fontSize:"12px"}});
  if(lead.askingPrice)qs.append(h("span",{style:{color:"#ef4444"}},"Ask: "+lead.askingPrice));
  if(lead.mileage)qs.append(h("span",{style:{color:"#888"}},"Mi: "+lead.mileage));
  if(lead.titleStatus)qs.append(h("span",{style:{color:lead.titleStatus.toLowerCase()==="clean"?"#22c55e":"#f59e0b"}},"Title: "+lead.titleStatus));
  info.append(qs);hdr.append(info);hdr.append(badge(lead.status||"watching"));root.append(hdr);
  if(lead.photo&&ui.photoFull)root.append(h("img",{class:"photo-lg",src:lead.photo,onClick:function(){ui.photoFull=0;R()}}));
  if((lead.listingUrl||lead.sellerName||lead.sellerContact)&&!ui.lEdit){var lw=h("div",{class:"f g8 fw ac",style:{fontSize:"12px"}});if(lead.listingUrl){var la=h("a",{class:"link-btn",href:lead.listingUrl});la.append(ic("link")," View Listing");lw.append(la)}if(lead.sellerName)lw.append(h("span",{style:{color:"#888"}},"Seller: "+lead.sellerName));if(lead.sellerContact)lw.append(h("span",{style:{color:"#888"}},lead.sellerContact));root.append(lw)}
  if(ui.lEdit){
    var p=h("div",{class:"ep fc g12"});p.append(h("span",{class:"lbl",style:{color:"#22d3ee"}},"Edit Lead"));var inps={};
    var r1=h("div",{class:"f g8 fw"});[["year","Year","70px"],["make","Make",""],["model","Model",""]].forEach(function(f){var inp=h("input",{type:"text",value:lead[f[0]]||"",placeholder:f[1],style:f[2]?{width:f[2],flex:"none"}:{flex:1,minWidth:"80px"},onInput:function(e){inps[f[0]]=e.target.value}});inps[f[0]]=lead[f[0]]||"";r1.append(inp)});p.append(r1);
    var r2=h("div",{class:"f g8"});[["askingPrice","Asking price"],["estSellPrice","Est. sell"],["mileage","Mileage"]].forEach(function(f){var inp=h("input",{type:"text",value:lead[f[0]]||"",placeholder:f[1],style:{flex:1},onInput:function(e){inps[f[0]]=e.target.value}});inps[f[0]]=lead[f[0]]||"";r2.append(inp)});p.append(r2);
    var r3=h("div",{class:"f g8"});[["titleStatus","Title status"],["listingSource","Listed where"]].forEach(function(f){var inp=h("input",{type:"text",value:lead[f[0]]||"",placeholder:f[1],style:{flex:1},onInput:function(e){inps[f[0]]=e.target.value}});inps[f[0]]=lead[f[0]]||"";r3.append(inp)});p.append(r3);
    p.append(h("input",{type:"text",value:lead.listingUrl||"",placeholder:"Listing URL",onInput:function(e){inps.listingUrl=e.target.value}}));inps.listingUrl=lead.listingUrl||"";
    var r3b=h("div",{class:"f g8"});[["sellerName","Seller name"],["sellerContact","Seller contact"]].forEach(function(f){var inp=h("input",{type:"text",value:lead[f[0]]||"",placeholder:f[1],style:{flex:1},onInput:function(e){inps[f[0]]=e.target.value}});inps[f[0]]=lead[f[0]]||"";r3b.append(inp)});p.append(r3b);
    var r4=h("div",{class:"f g8 fw"});[["flipDifficulty","Flip difficulty"],["partsAvailability","Parts avail."],["demandLevel","Demand"],["estDaysToSell","Days to sell"]].forEach(function(f){var inp=h("input",{type:"text",value:lead[f[0]]||"",placeholder:f[1],style:{flex:1,minWidth:"90px"},onInput:function(e){inps[f[0]]=e.target.value}});inps[f[0]]=lead[f[0]]||"";r4.append(inp)});p.append(r4);
    var sr=h("div",{class:"f g6"});var st_=lead.status||"watching";
    ["watching","pursue","pass"].forEach(function(s){var sc_={watching:"#22d3ee",pursue:"#22c55e",pass:"#ef4444"};var b=h("button",{class:"sb",style:st_===s?{background:sc_[s]+"20",borderColor:sc_[s],color:sc_[s]}:{},onClick:function(e){st_=s;sr.querySelectorAll("button").forEach(function(x){x.style.background="rgba(255,255,255,0.03)";x.style.borderColor="#333";x.style.color="#777"});e.currentTarget.style.background=sc_[s]+"20";e.currentTarget.style.borderColor=sc_[s];e.currentTarget.style.color=sc_[s]}},s);sr.append(b)});p.append(sr);
    var ntA=h("textarea",{rows:"3",placeholder:"Notes...",onInput:function(e){inps.notes=e.target.value}});ntA.value=lead.notes||"";inps.notes=lead.notes||"";p.append(ntA);
    p.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.lEdit=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){["year","make","model","askingPrice","estSellPrice","mileage","titleStatus","listingSource","flipDifficulty","partsAvailability","demandLevel","estDaysToSell","notes","listingUrl","sellerName","sellerContact"].forEach(function(k){if(inps[k]!==undefined)lead[k]=(inps[k]||"").trim()});lead.status=st_;ui.lEdit=0;save();R();flash()}},"Save")));root.append(p)}
  if(lead.flipDifficulty||lead.partsAvailability||lead.demandLevel||lead.estDaysToSell){var mb=h("div",{class:"f g4 fw"});var mc={easy:"#22c55e",moderate:"#f59e0b",hard:"#ef4444",good:"#22c55e",excellent:"#22c55e",fair:"#f59e0b",poor:"#ef4444",low:"#ef4444",medium:"#f59e0b",high:"#22c55e"};
    if(lead.flipDifficulty){var v=lead.flipDifficulty.toLowerCase();mb.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Flip"),h("span",{class:"metric-value",style:{color:mc[v]||"#888"}},lead.flipDifficulty)))}
    if(lead.partsAvailability){var v2=lead.partsAvailability.toLowerCase();mb.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Parts"),h("span",{class:"metric-value",style:{color:mc[v2]||"#888"}},lead.partsAvailability)))}
    if(lead.demandLevel){var v3=lead.demandLevel.toLowerCase();mb.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Demand"),h("span",{class:"metric-value",style:{color:mc[v3]||"#888"}},lead.demandLevel)))}
    if(lead.estDaysToSell)mb.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Sell in"),h("span",{class:"metric-value",style:{color:"#888"}},lead.estDaysToSell)));root.append(mb)}
  var sellEst=$(lead.estSellPrice);var askNum=$(lead.askingPrice);
  var floorMargin=400;var maxOffer=sellEst>0?sellEst-rehab-floorMargin:0;
  var margin=sellEst-askNum-rehab;
  var fin=h("div",{class:"fc g8",style:{padding:"12px 14px",background:maxOffer>0&&maxOffer>=askNum?"rgba(34,197,94,0.04)":"rgba(239,68,68,0.04)",borderRadius:"10px",border:maxOffer>0&&maxOffer>=askNum?"1px solid rgba(34,197,94,0.15)":"1px solid rgba(239,68,68,0.15)"}});
  fin.append(h("span",{style:{fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#f59e0b"}},"Offer Calculator"));
  var fr=h("div",{class:"f jb fw",style:{fontSize:"12px"}});
  if(sellEst>0)fr.append(h("span",{style:{color:"#22c55e"}},"Comps: $"+sellEst));
  fr.append(h("span",{style:{color:"#ef4444"}},"Rehab: $"+rehab));
  fr.append(h("span",{style:{color:"#888"}},"Floor: $"+floorMargin));
  fin.append(fr);
  if(sellEst>0){
    var fr2=h("div",{class:"f jb",style:{fontSize:"13px",fontWeight:700,paddingTop:"6px",borderTop:"1px solid rgba(255,255,255,0.05)"}});
    fr2.append(h("span",{style:{color:maxOffer>0?"#22c55e":"#ef4444"}},"Max offer: $"+Math.max(0,maxOffer)));
    if(askNum>0)fr2.append(h("span",{style:{color:margin>=200?"#22c55e":margin>=0?"#f59e0b":"#ef4444"}},"Margin @ ask: $"+$$(margin)));
    fin.append(fr2);
    if(askNum>0&&maxOffer>0){var pct=Math.round((1-maxOffer/askNum)*100);if(pct>0)fin.append(h("span",{style:{color:"#888",fontSize:"11px"}},"Negotiate "+pct+"% below asking"))}
  }else{fin.append(h("span",{style:{color:"#555",fontSize:"11px"}},"Add est. sell price to calculate"))}
  root.append(fin);
  if(lead.notes&&!ui.lEdit)root.append(h("p",{style:{color:"#888",fontSize:"13px",lineHeight:1.4,whiteSpace:"pre-line"}},lead.notes));
  // Specs
  var specCount=SPEC_FIELDS.filter(function(f){return lead.specs&&lead.specs[f.key]}).length;
  var specW=h("div",{class:"fc g8"});
  var specHdr=h("button",{class:"f ac g8",style:{padding:0,color:"#f59e0b"},onClick:function(){ui.iExp._specs=!ui.iExp._specs;R()}});
  var sch=document.createElement("span");sch.innerHTML=chev(ui.iExp._specs);sch.style.display="flex";
  specHdr.append(sch,h("span",{class:"lbl",style:{margin:0}},"Specs ("+specCount+"/"+SPEC_FIELDS.length+")"));
  specW.append(specHdr);
  if(ui.iExp._specs)specW.append(rSpecs(lead,true));
  root.append(specW);
  var ki=h("div",{class:"fc g8"});ki.append(h("span",{class:"lbl"},"Known Issues ("+(lead.knownIssues||[]).length+")"));(lead.knownIssues||[]).forEach(function(iss,i){ki.append(rIssue(iss,"knownIssues",lead,i))});ki.append(rAddIssue(lead,"knownIssues"));root.append(ki);
  var hi=h("div",{class:"fc g8"});hi.append(h("span",{class:"lbl",style:{color:"#a855f7"}},"Likely Hidden Issues ("+(lead.hiddenIssues||[]).length+")"));(lead.hiddenIssues||[]).forEach(function(iss,i){hi.append(rIssue(iss,"hiddenIssues",lead,i))});hi.append(rAddIssue(lead,"hiddenIssues"));root.append(hi);
  if(data.bikes.length<2){root.append(h("button",{class:"bp w100",style:{marginTop:"12px",padding:"14px",gap:"8px"},onClick:function(){var name=[lead.year,lead.make,lead.model].filter(Boolean).join(" ")||"New Bike";var desc=["Mileage: "+(lead.mileage||"?"),"Title: "+(lead.titleStatus||"?"),lead.listingSource?"From: "+lead.listingSource:"",lead.notes||""].filter(Boolean).join("\n");var tasks=(lead.knownIssues||[]).concat(lead.hiddenIssues||[]).map(function(iss){return{id:mid(),name:iss.name,done:0,blocked:0,blockedReason:"",note:"Severity: "+(iss.severity||"?")+" | Difficulty: "+(iss.difficulty||"?"),cost:S(iss.cost),costLogged:0,verified:0,createdAt:Date.now(),completedAt:null}});data.bikes.push({id:mid(),name:name,type:"flip",description:desc.trim(),buyPrice:lead.askingPrice||"",actualBuyPrice:"",targetSell:lead.estSellPrice||"",buyDate:today(),source:lead.listingSource||"",workLog:"",tasks:tasks,checklistTemplates:JSON.parse(JSON.stringify(data.checklistTemplates)),photo:lead.photo||null,specs:JSON.parse(JSON.stringify(lead.specs||{})),originLead:JSON.parse(JSON.stringify(lead))});data.leads=data.leads.filter(function(l){return l.id!==lead.id});logAct("lead-convert",name,"bike","");save();nav("home");flash("Converted")}},ic("convert")," Convert to Bike Slot"))}
  else root.append(h("p",{style:{color:"#555",fontSize:"12px",textAlign:"center",marginTop:"12px"}},"2/2 bike slots full"));
  if(ui.cfDel===lead.id)root.append(confirm_("Delete this lead?",function(){data.leads=data.leads.filter(function(l){return l.id!==lead.id});save();nav("home")},function(){ui.cfDel=null;R()}));
  else root.append(h("button",{class:"bd",style:{marginTop:"8px"},onClick:function(){ui.cfDel=lead.id;R()}},"Delete lead"));
  return root;
}

// ============ BIKE VIEW ============
function rBikeView(){
  var bike=data.bikes.find(function(b){return b.id===selBike});if(!bike){nav("home");return h("div")}
  var root=h("div",{class:"fc g16"});var unverified=bike.tasks.filter(function(t){return!t.done&&!t.blocked&&!t.verified}),ready=bike.tasks.filter(function(t){return!t.done&&!t.blocked&&t.verified}),blocked=bike.tasks.filter(function(t){return!t.done&&t.blocked}),done=bike.tasks.filter(function(t){return t.done});
  var waitingParts=(bike.parts||[]).filter(function(p){return p.status==="ordered"||p.status==="shipped"}).length;
  var tmpls=bike.checklistTemplates||[];var tabs=[{key:"tasks",label:"Tasks",count:ready.length},{key:"parts",label:"Parts"+(waitingParts?" ("+waitingParts+")":"")},{key:"info",label:"Info"},{key:"log",label:"Log"}].concat(tmpls.map(function(t){return{key:"cl_"+t.id,label:t.name}}));
  var partsTrackerCost=(bike.parts||[]).reduce(function(s,p){return s+(parseFloat(p.cost)||0)},0);
  var expCost=data.expenses.filter(function(e){return e.bikeId===bike.id}).reduce(function(s,e){return s+(parseFloat(e.amount)||0)},0);
  var totalIn=partsTrackerCost+expCost;
  var buyNum=$(bike.actualBuyPrice||bike.buyPrice);var sellNum=$(bike.targetSell);
  var allIn=buyNum+totalIn;
  var margin=sellNum>0?$$(sellNum-allIn):null;
  var hdr=h("div",{class:"f as g12"});var bb=h("button",{class:"ib",style:{marginTop:"2px"},onClick:function(){nav("home")}});bb.innerHTML=I.back;hdr.append(bb);
  if(bike.photo)hdr.append(h("img",{class:"photo-thumb",src:bike.photo}));
  var info=h("div",{style:{flex:1}});var nr=h("div",{class:"f ac g8"});nr.append(h("h2",{style:{color:"#f5f5f5",fontSize:"20px",margin:0}},bike.name));var eb=h("button",{class:"ib",onClick:function(){ui.edit=!ui.edit;R()}});eb.innerHTML=I.edit;nr.append(eb);info.append(nr);
  if(bike.description&&!ui.edit)info.append(h("p",{style:{marginTop:"6px",color:"#888",fontSize:"13px",lineHeight:1.4,whiteSpace:"pre-line"}},bike.description));
  if(!ui.edit){var pr=h("div",{class:"f g12 fw",style:{marginTop:"6px",fontSize:"12px"}});if(bike.actualBuyPrice)pr.append(h("span",{style:{color:"#ef4444"}},"Paid: $"+bike.actualBuyPrice));else if(bike.buyPrice)pr.append(h("span",{style:{color:"#ef4444"}},"Ask: "+bike.buyPrice));if(bike.targetSell)pr.append(h("span",{style:{color:"#22c55e"}},"Target: "+bike.targetSell));if(margin!==null)pr.append(h("span",{style:{color:margin>=200?"#22c55e":"#ef4444"}},"Margin: $"+$$(margin)));if(bike.buyDate)pr.append(h("span",{style:{color:"#555"}},"Day "+daysBetween(bike.buyDate,today())));info.append(pr)}
  hdr.append(info);hdr.append(badge(bike.type));root.append(hdr);
  if(ui.edit){var p=h("div",{class:"ep fc g12"});p.append(h("span",{class:"lbl"},"Edit Bike"));var ni=h("input",{type:"text",value:bike.name});var ty=bike.type;
    var tr=h("div",{class:"f g8"});["rider","flip"].forEach(function(t){var b=h("button",{style:{flex:1,padding:"8px 12px",background:ty===t?(t==="rider"?"rgba(59,130,246,0.15)":"rgba(168,85,247,0.15)"):"rgba(255,255,255,0.03)",border:ty===t?"1px solid "+(t==="rider"?"#60a5fa":"#a855f7"):"1px solid #333",borderRadius:"6px",cursor:"pointer",color:ty===t?(t==="rider"?"#60a5fa":"#a855f7"):"#777",fontSize:"13px",fontWeight:600,textTransform:"uppercase"},onClick:function(e){ty=t;tr.querySelectorAll("button").forEach(function(x){x.style.background="rgba(255,255,255,0.03)";x.style.border="1px solid #333";x.style.color="#777"});e.currentTarget.style.background=t==="rider"?"rgba(59,130,246,0.15)":"rgba(168,85,247,0.15)";e.currentTarget.style.border="1px solid "+(t==="rider"?"#60a5fa":"#a855f7");e.currentTarget.style.color=t==="rider"?"#60a5fa":"#a855f7"}},t);tr.append(b)});
    var di=h("textarea",{rows:"4",placeholder:"Description..."});di.value=bike.description||"";var bp=h("input",{type:"text",value:bike.actualBuyPrice||bike.buyPrice||"",placeholder:"Actual buy price"});var ts=h("input",{type:"text",value:bike.targetSell||"",placeholder:"Target sell"});var bd=h("input",{type:"date",value:bike.buyDate||"",style:{flex:1}});var src=h("input",{type:"text",value:bike.source||"",placeholder:"Source (FB, KSL...)"});
    p.append(ni,tr,di,h("div",{class:"f g8"},bp,ts),h("div",{class:"f g8"},bd,src));
    p.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.edit=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){bike.name=ni.value.trim()||bike.name;bike.type=ty;bike.description=di.value.trim();bike.actualBuyPrice=bp.value.trim();bike.targetSell=ts.value.trim();bike.buyDate=bd.value;bike.source=src.value.trim();ui.edit=0;save();R();flash()}},"Save")));root.append(p)}
  var stats=h("div",{class:"f g12",style:{padding:"10px 0",borderTop:"1px solid #222",borderBottom:"1px solid #222"}});
  var s_=function(ico,col,txt){var d=h("div",{class:"f ac g6",style:{color:col}});d.innerHTML=I[ico];d.append(h("span",{style:{fontSize:"13px"}},txt));return d};
  stats.append(s_("wrench","#f59e0b",ready.length+" ready"),s_("blocked","#ef4444",blocked.length+" blocked"),s_("check","#22c55e",done.length+" done"));if(unverified.length>0)stats.append(h("div",{class:"f ac g6",style:{color:"#a855f7"}},h("span",{style:{fontSize:"13px"}},unverified.length+" triage")));root.append(stats);
  if(partsTrackerCost>0||expCost>0||margin!==null){
    var finB=h("div",{class:"fc g6",style:{padding:"12px 14px",background:margin!==null&&margin>=200?"rgba(34,197,94,0.04)":"rgba(239,68,68,0.04)",borderRadius:"10px",border:margin!==null&&margin>=200?"1px solid rgba(34,197,94,0.15)":"1px solid rgba(239,68,68,0.15)"}});
    finB.append(h("span",{style:{fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:margin!==null&&margin>=200?"#22c55e":"#ef4444"}},"Live P&L"));
    var fr=h("div",{class:"f g12 fw",style:{fontSize:"12px"}});
    fr.append(h("span",{style:{color:"#888"}},"Buy: $"+buyNum));
    if(partsTrackerCost>0)fr.append(h("span",{style:{color:"#60a5fa"}},"Parts: $"+$$(partsTrackerCost)));
    if(expCost>0)fr.append(h("span",{style:{color:"#f59e0b"}},"Expenses: $"+$$(expCost)));
    finB.append(fr);
    var fr2=h("div",{class:"f jb",style:{fontSize:"13px",fontWeight:700,paddingTop:"4px",borderTop:"1px solid rgba(255,255,255,0.05)"}});
    fr2.append(h("span",{style:{color:"#ef4444"}},"All-in: $"+$$(allIn)));
    if(sellNum>0)fr2.append(h("span",{style:{color:"#888"}},"Target: $"+sellNum));
    if(margin!==null)fr2.append(h("span",{style:{color:margin>=200?"#22c55e":margin>=0?"#f59e0b":"#ef4444"}},"Margin: $"+$$(margin)));
    finB.append(fr2);
    root.append(finB)}
  var tsc=h("div",{style:{overflowX:"auto",WebkitOverflowScrolling:"touch",margin:"0 -4px",padding:"0 4px"}});var tb=h("div",{class:"f g4",style:{background:"rgba(255,255,255,0.03)",borderRadius:"8px",padding:"3px",minWidth:"min-content"}});
  tabs.forEach(function(t){tb.append(h("button",{class:"tab"+(ui.bTab===t.key?" a":""),onClick:function(){ui.bTab=t.key;R()}},t.label+(t.count!==undefined?" ("+t.count+")":"")))});tsc.append(tb);root.append(tsc);
  if(ui.bTab==="tasks"){var c=h("div",{class:"fc g12"});c.append(rAddTask(bike));
    if(unverified.length>0){var sec0=h("div",{class:"fc g6"});sec0.append(h("span",{class:"lbl",style:{color:"#a855f7"}},"Needs Triage ("+unverified.length+")"));unverified.forEach(function(t){sec0.append(rTask(t,bike))});c.append(sec0)}
    if(ready.length>0){var sec=h("div",{class:"fc g6"});sec.append(h("span",{class:"lbl"},"Ready to work"));ready.forEach(function(t){sec.append(rTask(t,bike))});c.append(sec)}
    if(blocked.length>0){var sec2=h("div",{class:"fc g6"});sec2.append(h("span",{class:"lbl",style:{color:"#ef4444"}},"Blocked"));blocked.forEach(function(t){sec2.append(rTask(t,bike))});c.append(sec2)}
    if(done.length>0){var sec3=h("div",{class:"fc g6"});var tog=h("button",{class:"f ac g6",style:{color:"#22c55e",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",padding:0},onClick:function(){ui.showDone=!ui.showDone;R()}});var ch_=document.createElement("span");ch_.innerHTML=chev(ui.showDone);ch_.style.display="flex";tog.append(ch_," Done ("+done.length+")");sec3.append(tog);if(ui.showDone)done.forEach(function(t){sec3.append(rTask(t,bike))});c.append(sec3)}
    if(!ready.length&&!blocked.length&&!done.length&&!unverified.length)c.append(h("p",{style:{color:"#555",fontSize:"13px",textAlign:"center",padding:"20px"}},"No tasks yet."));root.append(c);
  }else if(ui.bTab==="info"){
    var infoW=h("div",{class:"fc g16"});
    infoW.append(h("span",{class:"lbl"},"Specs"));infoW.append(rSpecs(bike,true));
    infoW.append(h("div",{style:{borderTop:"1px solid #222",paddingTop:"12px"}}));
    infoW.append(h("span",{class:"lbl"},"Photos ("+(bike.photos||[]).length+")"));infoW.append(rPhotoLog(bike));
    root.append(infoW);
  }else if(ui.bTab==="parts"){root.append(rParts(bike,"bike",bike.id));
  }else if(ui.bTab==="log"){root.append(rLog(bike,"bike",bike.id));
  }else if(ui.bTab.startsWith("cl_"))root.append(rChecklist(bike,ui.bTab.replace("cl_","")));
  if(!ui.sellFlow){root.append(h("button",{style:{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"6px",color:"#22c55e",padding:"12px",fontSize:"13px",fontWeight:700,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",marginTop:"12px"},onClick:function(){ui.sellFlow=1;ui.sellDate=today();R()}},ic("sold")," Mark as Sold"))
  }else{var sf=h("div",{class:"ep fc g12",style:{borderColor:"rgba(34,197,94,0.3)"}});sf.append(h("span",{class:"lbl",style:{color:"#22c55e"}},"Complete Sale"));var sp=h("input",{type:"text",value:ui.sellPrice,placeholder:"Final sell price",style:{borderColor:"rgba(34,197,94,0.3)"},onInput:function(e){ui.sellPrice=e.target.value}});var sd=h("input",{type:"date",value:ui.sellDate,onInput:function(e){ui.sellDate=e.target.value}});sf.append(sp,sd);
    sf.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.sellFlow=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1,background:"#22c55e"},onClick:function(){if(!ui.sellPrice.trim()){flash("Need sell price");return}var sold=JSON.parse(JSON.stringify(bike));sold.soldPrice=ui.sellPrice.trim();sold.soldDate=ui.sellDate||today();sold.partsCost=partsTrackerCost;sold.expCost=expCost;sold.totalIn=totalIn;sold.daysOwned=daysBetween(bike.buyDate,ui.sellDate||today());sold.profit=$$(parseFloat(ui.sellPrice.replace(/[^0-9.]/g,""))-allIn);data.sold.push(sold);data.bikes=data.bikes.filter(function(b){return b.id!==bike.id});logAct("bike-sold",bike.name+" for $"+ui.sellPrice.trim(),"bike",bike.id);save();nav("home");flash("Sold! Profit: $"+$$(sold.profit))}},"Confirm Sale")));root.append(sf)}
  if(ui.cfDel===bike.id)root.append(confirm_("Delete this bike and all data?",function(){data.bikes=data.bikes.filter(function(b){return b.id!==bike.id});save();nav("home")},function(){ui.cfDel=null;R()}));
  else root.append(h("button",{class:"bd",style:{marginTop:"12px"},onClick:function(){ui.cfDel=bike.id;R()}},"Delete bike"));
  return root;
}

// ============ SETTINGS ============
function rTmplEditor(t){
  var w=h("div",{class:"tw"});var isO=ui.tmExp[t.id];var hd=h("button",{class:"th",onClick:function(){ui.tmExp[t.id]=!isO;R()}});var ch_=document.createElement("span");ch_.innerHTML=chev(isO);ch_.style.display="flex";hd.append(ch_,h("span",{style:{color:"#e5e5e5",fontSize:"14px",fontWeight:600,flex:1}},t.name),h("span",{style:{color:"#555",fontSize:"12px"}},String(t.items.length)));w.append(hd);
  if(isO){var body=h("div",{style:{padding:"0 14px 14px"},class:"fc g8"});body.append(h("div",{class:"f g6"},h("button",{class:"bs",onClick:function(){var n=prompt("Rename:",t.name);if(n&&n.trim()){t.name=n.trim();ss();R()}}},ic("edit")," Rename"),h("button",{class:"bs",style:{color:"#ef4444",background:"rgba(239,68,68,0.08)",borderColor:"rgba(239,68,68,0.2)"},onClick:function(){ui.cfDel=t.id;R()}},ic("trash")," Delete")));
    if(ui.cfDel===t.id)body.append(confirm_("Delete?",function(){data.checklistTemplates=data.checklistTemplates.filter(function(x){return x.id!==t.id});ui.cfDel=null;ss();R()},function(){ui.cfDel=null;R()}));
    var list=h("div",{class:"fc g4"});t.items.forEach(function(item,i){var row=h("div",{class:"f ac g6",style:{padding:"7px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"6px"}});row.append(h("span",{style:{flex:1,color:"#ccc",fontSize:"13px"}},item));
      var ub=h("button",{style:{background:"none",border:"none",padding:"2px",cursor:"pointer",color:i===0?"#333":"#777"},onClick:function(){if(i>0){var tmp=t.items[i];t.items[i]=t.items[i-1];t.items[i-1]=tmp;ss();R()}}});ub.innerHTML=I.up;
      var db=h("button",{style:{background:"none",border:"none",padding:"2px",cursor:"pointer",color:i===t.items.length-1?"#333":"#777"},onClick:function(){if(i<t.items.length-1){var tmp=t.items[i];t.items[i]=t.items[i+1];t.items[i+1]=tmp;ss();R()}}});db.innerHTML=I.down;
      var rb=h("button",{style:{background:"none",border:"none",padding:"2px",cursor:"pointer",color:"#555"},onClick:function(){t.items.splice(i,1);ss();R()}});rb.innerHTML=I.trash;
      row.append(ub,db,rb);list.append(row)});body.append(list);
    var ar=h("div",{class:"f g8"});var ai=h("input",{type:"text",placeholder:"Add item...",style:{fontSize:"13px",padding:"8px 10px"}});var ag=function(){if(ai.value.trim()){t.items.push(ai.value.trim());ai.value="";ss();R()}};ai.addEventListener("keydown",function(e){if(e.key==="Enter")ag()});var ab=h("button",{class:"bp s0",style:{padding:"8px 12px"},onClick:ag});ab.innerHTML=I.plus;ar.append(ai,ab);body.append(ar);w.append(body)}
  return w;
}
function rSettings(){
  var root=h("div",{class:"fc g16"});var hdr=h("div",{class:"f ac g12"});var bb=h("button",{class:"ib",onClick:function(){nav("home")}});bb.innerHTML=I.back;hdr.append(bb,h("h2",{style:{color:"#f5f5f5",fontSize:"20px"}},"Settings"));root.append(hdr);

  // API Key
  root.append(h("span",{class:"lbl",style:{color:"#a855f7"}},"Claude API Key"));
  root.append(h("p",{style:{color:"#777",fontSize:"11px",lineHeight:1.4,marginBottom:"4px"}},"For receipt scanning. Key stays in localStorage on your device."));
  var akInp=h("input",{type:"text",value:data.apiKey||"",placeholder:"sk-ant-...",style:{fontSize:"12px",fontFamily:"var(--font)"},onInput:function(e){data.apiKey=e.target.value.trim();save()}});
  root.append(akInp);
  if(data.apiKey)root.append(h("span",{style:{color:"#22c55e",fontSize:"11px"}},"Key saved"));

  // Cloud Sync
  root.append(h("div",{style:{borderTop:"1px solid #222",marginTop:"12px",paddingTop:"12px"}}));
  root.append(h("span",{class:"lbl",style:{color:"#60a5fa"}},"Cloud Sync"));
  root.append(h("p",{style:{color:"#777",fontSize:"11px",lineHeight:1.4,marginBottom:"4px"}},"Auto-syncs every save. Polls every 15s."));
  var syncRow=h("div",{class:"f g8"});
  syncRow.append(h("button",{class:"bs",style:{fontSize:"10px",color:"#60a5fa",borderColor:"rgba(96,165,250,0.3)"},onClick:function(){_doSync();flash("Pushing to cloud")}},"Push now"));
  syncRow.append(h("button",{class:"bs",style:{fontSize:"10px",color:"#22d3ee",borderColor:"rgba(34,211,238,0.3)"},onClick:function(){syncPull(function(){R()},true);flash("Pulling from cloud")}},"Pull now"));
  root.append(syncRow);

  // Account
  root.append(h("div",{style:{borderTop:"1px solid #222",marginTop:"12px",paddingTop:"12px"}}));
  root.append(h("span",{class:"lbl",style:{color:"#ef4444"}},"Account"));
  var auth=getAuth();
  root.append(h("span",{style:{color:"#888",fontSize:"11px"}},auth?auth.email:"Not signed in"));
  root.append(h("button",{class:"bs",style:{color:"#ef4444",borderColor:"rgba(239,68,68,0.3)",marginTop:"4px"},onClick:function(){localStorage.removeItem(AUTH_SK);window.location.href="index.html"}},"Sign out"));

  // Vehicle list
  root.append(h("div",{style:{borderTop:"1px solid #222",marginTop:"12px",paddingTop:"12px"}}));
  root.append(h("span",{class:"lbl",style:{color:"#60a5fa"}},"Vehicles"));
  root.append(h("p",{style:{color:"#777",fontSize:"11px",lineHeight:1.4,marginBottom:"4px"}},"Non-bike vehicles for mileage tracking. Active bikes auto-appear in trip logging."));
  var vList=h("div",{class:"fc g4"});
  data.vehicles.forEach(function(v,i){var row=h("div",{class:"f ac g8",style:{padding:"8px 10px",background:"rgba(96,165,250,0.06)",borderRadius:"6px"}});row.append(h("span",{style:{flex:1,color:"#e5e5e5",fontSize:"13px"}},v));var del=h("button",{class:"ib",onClick:function(){data.vehicles.splice(i,1);save();R()}});del.innerHTML=I.trash;row.append(del);vList.append(row)});
  root.append(vList);
  var vAdd=h("div",{class:"f g8"});var vInp=h("input",{type:"text",placeholder:'e.g. 2021 Ford Bronco',style:{fontSize:"12px"}});var vBtn=h("button",{class:"bp s0",style:{padding:"8px 12px",background:"#60a5fa"},onClick:function(){if(vInp.value.trim()){data.vehicles.push(vInp.value.trim());vInp.value="";save();R()}}});vBtn.innerHTML=I.plus;vAdd.append(vInp,vBtn);root.append(vAdd);

  // Lead Scan Prompt
  root.append(h("div",{style:{borderTop:"1px solid #222",marginTop:"12px",paddingTop:"12px"}}));
  root.append(h("span",{class:"lbl",style:{color:"#a855f7"}},"Lead Scan Prompt"));
  root.append(h("p",{style:{color:"#777",fontSize:"11px",lineHeight:1.4,marginBottom:"4px"}},"Instructions sent to Claude when scanning listing screenshots. Leave empty for default."));
  var lpTa=h("textarea",{rows:"6",style:{fontSize:"11px",lineHeight:1.4},onInput:function(e){data.leadPrompt=e.target.value;save()}});lpTa.value=data.leadPrompt||"";
  root.append(lpTa);
  var lpBtns=h("div",{class:"f g8 fw"});
  if(data.leadPrompt)lpBtns.append(h("button",{class:"bs",style:{fontSize:"10px"},onClick:function(){data.leadPrompt="";save();R();flash("Reset to default")}},"Reset to default"));
  lpBtns.append(h("button",{class:"bs",style:{fontSize:"10px"},onClick:function(){navigator.clipboard.writeText(data.leadPrompt||DEF_LEAD_PROMPT).then(function(){flash("Prompt copied")})}},"Copy current"));
  if(!data.leadPrompt)lpBtns.append(h("button",{class:"bs",style:{fontSize:"10px"},onClick:function(){data.leadPrompt=DEF_LEAD_PROMPT;save();R()}},"Load default to edit"));
  root.append(lpBtns);

  root.append(h("div",{style:{borderTop:"1px solid #222",marginTop:"12px",paddingTop:"12px"}}));
  root.append(h("p",{style:{color:"#999",fontSize:"13px",lineHeight:1.5,borderBottom:"1px solid #222",paddingBottom:"12px"}},"Templates copy to each new bike. Editing here won't change existing bikes."));
  root.append(h("span",{class:"lbl"},"Checklist Templates"));
  data.checklistTemplates.forEach(function(t){root.append(rTmplEditor(t))});
  var ab=h("button",{class:"bg",onClick:function(){data.checklistTemplates.push({id:mid(),name:"New Checklist",items:[]});ss();R()}});ab.innerHTML=I.plus+" Add template";root.append(ab);
  if(ui.cfDel==="reset-tmpl")root.append(confirm_("Reset all?",function(){data.checklistTemplates=JSON.parse(JSON.stringify(DT));ui.cfDel=null;ss();R()},function(){ui.cfDel=null;R()}));
  else root.append(h("button",{class:"bs",style:{alignSelf:"flex-start",marginTop:"8px"},onClick:function(){ui.cfDel="reset-tmpl";R()}},"Reset to defaults"));
  root.append(h("div",{style:{marginTop:"24px",paddingTop:"12px",borderTop:"1px solid #222"}},h("p",{style:{color:"#555",fontSize:"11px"}},"Drydock v"+APP_VERSION+" · Data v"+DV),h("p",{style:{color:"#555",fontSize:"11px",marginTop:"4px"}},"IRS mileage rate: $"+IRS_RATE+"/mi · Scan powered by Claude")));
  return root;
}

// ============ ANALYTICS ============
function rAnalytics(){
  var root=h("div",{class:"fc g16"});if(data.sold.length===0){root.append(h("p",{style:{color:"#555",fontSize:"13px",textAlign:"center",padding:"40px 0"}},"No completed flips yet."));return root}
  var totalProfit=data.sold.reduce(function(s,b){return s+(b.profit||0)},0),avgProfit=Math.round(totalProfit/data.sold.length),avgDays=Math.round(data.sold.reduce(function(s,b){return s+(b.daysOwned||0)},0)/data.sold.length),totalParts=data.sold.reduce(function(s,b){return s+(b.partsCost||0)},0);
  var mg=h("div",{class:"f g4 fw"});mg.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Total Profit"),h("span",{class:"metric-value",style:{color:totalProfit>=0?"#22c55e":"#ef4444"}},"$"+$$(totalProfit))));mg.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Flips"),h("span",{class:"metric-value"},data.sold.length)));mg.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Avg Profit"),h("span",{class:"metric-value",style:{color:avgProfit>=0?"#22c55e":"#ef4444"}},"$"+$$(avgProfit))));mg.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Avg Days"),h("span",{class:"metric-value"},avgDays)));mg.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Total Parts"),h("span",{class:"metric-value",style:{color:"#f59e0b"}},"$"+$$(totalParts))));root.append(mg);
  var sources={};data.sold.forEach(function(b){var s=b.source||"Unknown";if(!sources[s])sources[s]={count:0,profit:0};sources[s].count++;sources[s].profit+=(b.profit||0)});
  if(Object.keys(sources).length>0){root.append(h("span",{class:"lbl"},"By Source"));Object.entries(sources).sort(function(a,b){return b[1].profit-a[1].profit}).forEach(function(e){root.append(h("div",{class:"f jb ac",style:{padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:"6px",fontSize:"12px"}},h("span",{style:{color:"#e5e5e5"}},e[0]+" ("+e[1].count+")"),h("span",{style:{color:e[1].profit>=0?"#22c55e":"#ef4444"}},"$"+e[1].profit)))})}
  root.append(h("span",{class:"lbl",style:{marginTop:"8px"}},"Flip History"));
  data.sold.slice().reverse().forEach(function(b){var card=h("div",{class:"sold-card fc g4"});card.append(h("div",{class:"f jb ac"},h("span",{style:{color:"#f5f5f5",fontWeight:700,fontSize:"14px"}},b.name),badge("sold")));var meta=h("div",{class:"f g12 fw",style:{fontSize:"11px"}});meta.append(h("span",{style:{color:"#ef4444"}},"Paid: $"+(b.actualBuyPrice||b.buyPrice||"?")));meta.append(h("span",{style:{color:"#22c55e"}},"Sold: $"+b.soldPrice));if(b.partsCost)meta.append(h("span",{style:{color:"#60a5fa"}},"Parts: $"+$$(b.partsCost)));if(b.expCost)meta.append(h("span",{style:{color:"#f59e0b"}},"Exp: $"+$$(b.expCost)));meta.append(h("span",{style:{color:b.profit>=0?"#22c55e":"#ef4444",fontWeight:700}},"Profit: $"+$$(b.profit)));if(b.daysOwned)meta.append(h("span",{style:{color:"#888"}},b.daysOwned+" days"));if(b.source)meta.append(h("span",{style:{color:"#555"}},"via "+b.source));card.append(meta);if(b.soldDate)card.append(h("span",{style:{color:"#555",fontSize:"10px"}},"Sold "+b.soldDate));root.append(card)});
  return root;
}

// ============ EXPENSES ============
function rExpenses(){
  var root=h("div",{class:"fc g12"});
  // Sub-tabs: Expenses | Mileage
  var stb=h("div",{class:"f g4",style:{background:"rgba(255,255,255,0.03)",borderRadius:"8px",padding:"3px"}});
  ["expenses","mileage"].forEach(function(t){stb.append(h("button",{class:"tab"+(ui.expSub===t?" a":""),onClick:function(){ui.expSub=t;R()}},t==="expenses"?"Expenses":"Mileage"))});
  root.append(stb);

  if(ui.expSub==="mileage"){root.append(rMileage());return root}

  var yr=ui.expYear;var exps=data.expenses.filter(function(e){return e.date&&e.date.startsWith(String(yr))});
  if(ui.expFilter)exps=exps.filter(function(e){return e.category===ui.expFilter});
  var total=exps.reduce(function(s,e){return s+(parseFloat(e.amount)||0)},0);
  var years=[];data.expenses.forEach(function(e){if(e.date){var y=parseInt(e.date.slice(0,4));if(years.indexOf(y)===-1)years.push(y)}});if(years.indexOf(yr)===-1)years.push(yr);years.sort();
  var yrRow=h("div",{class:"f ac g8"});years.forEach(function(y){yrRow.append(h("button",{class:"chip"+(y===yr?" on":""),style:{color:y===yr?"#f59e0b":"#777",borderColor:y===yr?"#f59e0b":"#333"},onClick:function(){ui.expYear=y;R()}},String(y)))});root.append(yrRow);
  root.append(h("div",{class:"f jb ac",style:{padding:"10px 0",borderBottom:"1px solid #222"}},h("span",{style:{color:"#f59e0b",fontSize:"20px",fontWeight:700}},"$"+total.toFixed(2)),h("span",{style:{color:"#555",fontSize:"11px"}},exps.length+" expenses")));
  var cats={};exps.forEach(function(e){var c=e.category||"Other";if(!cats[c])cats[c]=0;cats[c]+=(parseFloat(e.amount)||0)});
  if(Object.keys(cats).length>0){var cw=h("div",{class:"fc g4"});Object.entries(cats).sort(function(a,b){return b[1]-a[1]}).forEach(function(e){var pct=total>0?Math.round(e[1]/total*100):0;var row=h("button",{class:"f jb ac",style:{padding:"8px 12px",background:ui.expFilter===e[0]?"rgba(245,158,11,0.08)":"rgba(255,255,255,0.03)",borderRadius:"6px",fontSize:"12px",border:ui.expFilter===e[0]?"1px solid rgba(245,158,11,0.3)":"1px solid transparent",width:"100%"},onClick:function(){ui.expFilter=ui.expFilter===e[0]?null:e[0];R()}});row.append(h("span",{style:{color:"#ccc"}},e[0]),h("span",{style:{color:"#f59e0b"}},"$"+e[1].toFixed(2)+" ("+pct+"%)"));cw.append(row)});root.append(cw);
    if(ui.expFilter)root.append(h("button",{style:{color:"#888",fontSize:"11px",padding:"4px 0"},onClick:function(){ui.expFilter=null;R()}},"Show all categories"))}
  if(exps.length>0)root.append(h("button",{class:"bs",style:{alignSelf:"flex-start"},onClick:expCSV},ic("dlFile")," Export CSV"));

  // Add expense form
  if(ui.addExp){
    var p=h("div",{class:"ep fc g12",style:{borderColor:"rgba(245,158,11,0.3)"}});p.append(h("span",{class:"lbl"},"New Expense"));
    // Scan receipt button
    var scanStatus=h("div",{style:{minHeight:"20px"}});
    // Bike selector
    var expBike="";var bikeRow=h("div",{class:"f g4 fw"});
    var genB=h("button",{class:"chip on",style:{color:"#f59e0b",borderColor:"#f59e0b",fontSize:"10px"},onClick:function(e){expBike="";bikeRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333";x.className="chip"});e.currentTarget.style.color="#f59e0b";e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.className="chip on"}},"General");
    bikeRow.append(genB);
    data.bikes.forEach(function(bk){var b=h("button",{class:"chip",style:{color:"#777",borderColor:"#333",fontSize:"10px"},onClick:function(e){expBike=bk.id;bikeRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333";x.className="chip"});e.currentTarget.style.color="#a855f7";e.currentTarget.style.borderColor="#a855f7";e.currentTarget.className="chip on"}},bk.name);bikeRow.append(b)});
    data.jobs.filter(function(j){return j.status!=="delivered"}).forEach(function(jb){var jTitle=[jb.vehicleYear,jb.vehicleMake,jb.vehicleModel].filter(Boolean).join(" ")||"Job";var b=h("button",{class:"chip",style:{color:"#777",borderColor:"#333",fontSize:"10px"},onClick:function(e){expBike=jb.id;bikeRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333";x.className="chip"});e.currentTarget.style.color="#22d3ee";e.currentTarget.style.borderColor="#22d3ee";e.currentTarget.className="chip on"}},jTitle);bikeRow.append(b)});
    var amtI=h("input",{type:"text",inputmode:"decimal",placeholder:"Amount",style:{fontSize:"16px",borderColor:"rgba(245,158,11,0.3)"}});setTimeout(function(){amtI.focus()},50);
    var dtI=h("input",{type:"date",value:today()});
    var cat="Other";var catRow=h("div",{class:"f g4 fw"});
    ECAT.forEach(function(c){var b=h("button",{class:"chip"+(c===cat?" on":""),style:{color:c===cat?"#f59e0b":"#777",borderColor:c===cat?"#f59e0b":"#333",fontSize:"10px"},onClick:function(e){cat=c;catRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333";x.className="chip"});e.currentTarget.style.color="#f59e0b";e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.className="chip on"}},c);catRow.append(b)});
    var vendI=h("input",{type:"text",placeholder:"Vendor (store, seller...)"});
    var descI=h("input",{type:"text",placeholder:"Description"});
    var receiptData=null;
    var rWrap=h("div",{class:"f g8 fw"});
    var rBtn=h("button",{class:"bs",onClick:function(){var inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=function(){if(inp.files[0]){compressImg(inp.files[0],600,function(b64){receiptData=b64;rBtn.innerHTML="";rBtn.append(ic("check")," Receipt");rBtn.style.color="#22c55e";rBtn.style.borderColor="#22c55e"})}};inp.click()}});rBtn.append(ic("cam")," Receipt");
    var hasKey2=!!data.apiKey;
    var scanBtn=h("button",{class:"scan-btn",style:{flex:1,opacity:hasKey2?1:0.5,cursor:hasKey2?"pointer":"default"},onClick:function(){
      if(!data.apiKey){flash("Add API key in Settings to scan");return}
      var inp=document.createElement("input");inp.type="file";inp.accept="image/*";
      inp.onchange=function(){if(inp.files[0]){compressImg(inp.files[0],800,function(b64){
        receiptData=b64;rBtn.innerHTML="";rBtn.append(ic("check")," Receipt");rBtn.style.color="#22c55e";rBtn.style.borderColor="#22c55e";
        scanReceipt(b64,scanStatus,function(parsed){
          if(parsed.amount){amtI.value=parsed.amount}
          if(parsed.vendor){vendI.value=parsed.vendor}
          if(parsed.date){dtI.value=parsed.date}
          if(parsed.description){descI.value=parsed.description}
          if(parsed.category){cat=parsed.category;catRow.querySelectorAll("button").forEach(function(x){var isCat=x.textContent===cat;x.style.color=isCat?"#f59e0b":"#777";x.style.borderColor=isCat?"#f59e0b":"#333";x.className=isCat?"chip on":"chip"})}
        })})}};inp.click()}});
    scanBtn.append(ic("scan")," Scan Receipt");
    rWrap.append(rBtn,scanBtn);
    p.append(rWrap,scanStatus,bikeRow,amtI,dtI,catRow,vendI,descI);
    p.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.addExp=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){var a=amtI.value.trim().replace(/[^0-9.]/g,"");if(!a){flash("Need amount");return}data.expenses.push({id:mid(),amount:a,date:dtI.value||today(),category:cat,vendor:vendI.value.trim(),description:descI.value.trim(),receipt:receiptData,bikeId:expBike,createdAt:Date.now()});logAct("expense-add","$"+a+(cat?" "+cat:""),"expense","");ui.addExp=0;save();R();flash("Expense added")}},"Add")));root.append(p);
  }else{var ab=h("button",{class:"bg",style:{borderColor:"rgba(245,158,11,0.3)"},onClick:function(){ui.addExp=1;R()}});ab.innerHTML=I.plus+" Add expense";root.append(ab)}

  // List
  var sorted=exps.slice().sort(function(a,b){return(b.date||"").localeCompare(a.date||"")});
  sorted.forEach(function(exp){
    var card=h("div",{class:"card fc g4",style:{padding:"10px 14px"}});var top=h("div",{class:"f jb ac"});top.append(h("span",{style:{color:"#f59e0b",fontSize:"16px",fontWeight:700}},"$"+exp.amount));top.append(h("span",{style:{color:"#555",fontSize:"11px"}},exp.date||""));card.append(top);
    var meta=h("div",{class:"f g8 fw",style:{fontSize:"11px"}});meta.append(h("span",{style:{color:"#888",background:"rgba(245,158,11,0.08)",padding:"2px 6px",borderRadius:"4px"}},exp.category||"Other"));if(exp.bikeId){var bk=data.bikes.find(function(b){return b.id===exp.bikeId})||data.sold.find(function(b){return b.id===exp.bikeId})||data.jobs.find(function(j){return j.id===exp.bikeId});if(bk){var bkName=bk.name||[bk.vehicleYear,bk.vehicleMake,bk.vehicleModel].filter(Boolean).join(" ")||"Job";meta.append(h("span",{style:{color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"2px 6px",borderRadius:"4px"}},bkName))}}if(exp.vendor)meta.append(h("span",{style:{color:"#888"}},exp.vendor));if(exp.receipt)meta.append(h("span",{style:{color:"#22c55e"}},"\u{1F4F7}"));card.append(meta);
    if(exp.description)card.append(h("span",{style:{color:"#666",fontSize:"12px"}},exp.description));
    if(exp.receipt&&ui.expDetail===exp.id)card.append(h("img",{src:exp.receipt,style:{width:"100%",maxHeight:"250px",borderRadius:"8px",objectFit:"cover",border:"1px solid #333",marginTop:"6px",cursor:"pointer"},onClick:function(){ui.expDetail=null;R()}}));
    var btns=h("div",{class:"f g4",style:{marginTop:"4px"}});if(exp.receipt)btns.append(h("button",{class:"ib",style:{fontSize:"11px",color:"#888"},onClick:function(e){e.stopPropagation();ui.expDetail=ui.expDetail===exp.id?null:exp.id;R()}},"receipt"));
    btns.append(h("button",{class:"ib",onClick:function(e){e.stopPropagation();data.expenses=data.expenses.filter(function(x){return x.id!==exp.id});save();R();flash("Deleted")}},ic("trash")));card.append(btns);root.append(card)});
  if(sorted.length===0)root.append(h("p",{style:{color:"#555",fontSize:"12px",textAlign:"center",padding:"20px 0"}},"No expenses"+(ui.expFilter?" in "+ui.expFilter:"")+" for "+yr));
  return root;
}

// ============ MILEAGE ============
function rMileage(){
  var root=h("div",{class:"fc g12"});
  var yr=ui.expYear;var trips=data.trips.filter(function(t){return t.date&&t.date.startsWith(String(yr))});
  var totalMi=trips.reduce(function(s,t){return s+(t.miles||0)},0);
  var totalDed=totalMi*IRS_RATE;

  // Year selector
  var years=[];data.trips.forEach(function(t){if(t.date){var y=parseInt(t.date.slice(0,4));if(years.indexOf(y)===-1)years.push(y)}});if(years.indexOf(yr)===-1)years.push(yr);years.sort();
  var yrRow=h("div",{class:"f ac g8"});years.forEach(function(y){yrRow.append(h("button",{class:"chip"+(y===yr?" on":""),style:{color:y===yr?"#60a5fa":"#777",borderColor:y===yr?"#60a5fa":"#333"},onClick:function(){ui.expYear=y;R()}},String(y)))});root.append(yrRow);

  // Summary
  var sm=h("div",{class:"f g4 fw"});
  sm.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Miles"),h("span",{class:"metric-value",style:{color:"#60a5fa"}},totalMi.toFixed(1))));
  sm.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Trips"),h("span",{class:"metric-value"},trips.length)));
  sm.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"Deduction"),h("span",{class:"metric-value",style:{color:"#22c55e"}},"$"+totalDed.toFixed(2))));
  sm.append(h("div",{class:"metric"},h("span",{class:"metric-label"},"$/mi"),h("span",{class:"metric-value",style:{color:"#888"}},"$"+IRS_RATE)));
  root.append(sm);

  if(trips.length>0)root.append(h("button",{class:"bs",style:{alignSelf:"flex-start"},onClick:tripCSV},ic("dlFile")," Export CSV"));

  // Add trip
  if(ui.addTrip){
    var p=h("div",{class:"ep fc g12",style:{borderColor:"rgba(96,165,250,0.3)"}});
    p.append(h("span",{class:"lbl",style:{color:"#60a5fa"}},"Log Trip"));
    var allVeh=data.vehicles.slice();data.bikes.forEach(function(b){if(allVeh.indexOf(b.name)===-1)allVeh.push(b.name)});
    if(allVeh.length===0)p.append(h("span",{style:{color:"#ef4444",fontSize:"11px"}},"Add vehicles in Settings or bikes first"));
    var dtI=h("input",{type:"date",value:today()});
    var soI=h("input",{type:"text",inputmode:"decimal",placeholder:"Start odometer",style:{flex:1}});setTimeout(function(){soI.focus()},50);
    var eoI=h("input",{type:"text",inputmode:"decimal",placeholder:"End odometer",style:{flex:1}});
    var veh=allVeh[0]||"";var vehRow=h("div",{class:"f g4 fw"});
    allVeh.forEach(function(v){var isBike=data.bikes.some(function(b){return b.name===v})&&data.vehicles.indexOf(v)===-1;var b=h("button",{class:"chip"+(v===veh?" on":""),style:{color:v===veh?"#60a5fa":"#777",borderColor:v===veh?"#60a5fa":"#333",fontSize:"10px"},onClick:function(e){veh=v;vehRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333";x.className="chip"});e.currentTarget.style.color="#60a5fa";e.currentTarget.style.borderColor="#60a5fa";e.currentTarget.className="chip on"}},v+(isBike?" \u{1F3CD}":""));vehRow.append(b)});
    var purp="Pickup";var purpRow=h("div",{class:"f g4 fw"});
    TRIP_PURPOSE.forEach(function(pp){var b=h("button",{class:"chip"+(pp===purp?" on":""),style:{color:pp===purp?"#60a5fa":"#777",borderColor:pp===purp?"#60a5fa":"#333",fontSize:"10px"},onClick:function(e){purp=pp;purpRow.querySelectorAll("button").forEach(function(x){x.style.color="#777";x.style.borderColor="#333";x.className="chip"});e.currentTarget.style.color="#60a5fa";e.currentTarget.style.borderColor="#60a5fa";e.currentTarget.className="chip on"}},pp);purpRow.append(b)});
    var destI=h("input",{type:"text",placeholder:"Destination (optional)"});
    p.append(dtI,vehRow,h("div",{class:"f g8"},soI,eoI),purpRow,destI);
    p.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.addTrip=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1,background:"#60a5fa"},onClick:function(){
      if(!veh){flash("Select a vehicle");return}
      var so=parseFloat(soI.value),eo=parseFloat(eoI.value);
      if(isNaN(so)||!soI.value.trim()){flash("Need start odometer");return}
      if(isNaN(eo)||!eoI.value.trim()){flash("Need end odometer");return}
      if(eo<=so){flash("End must be greater than start");return}
      var mi=eo-so;data.trips.push({id:mid(),date:dtI.value||today(),startOdo:so,endOdo:eo,miles:mi,purpose:purp,destination:destI.value.trim(),vehicle:veh,createdAt:Date.now()});logAct("trip-log",mi+" mi"+(destI.value.trim()?" → "+destI.value.trim():""),"trip","");
      ui.addTrip=0;save();R();flash(mi.toFixed(1)+" mi = $"+(mi*IRS_RATE).toFixed(2))
    }},"Log Trip")));root.append(p);
  }else{var ab=h("button",{class:"bg",style:{borderColor:"rgba(96,165,250,0.3)"},onClick:function(){ui.addTrip=1;R()}});ab.append(ic("car")," ",document.createTextNode("Log trip"));root.append(ab)}

  // Trip list
  var sorted=trips.slice().sort(function(a,b){return(b.date||"").localeCompare(a.date||"")});
  sorted.forEach(function(trip){
    var card=h("div",{class:"card fc g4",style:{padding:"10px 14px",borderLeftColor:"#60a5fa"}});
    var top=h("div",{class:"f jb ac"});top.append(h("span",{style:{color:"#60a5fa",fontSize:"16px",fontWeight:700}},trip.miles.toFixed(1)+" mi"));top.append(h("span",{style:{color:"#555",fontSize:"11px"}},trip.date));card.append(top);
    var meta=h("div",{class:"f g8 fw",style:{fontSize:"11px"}});
    meta.append(h("span",{style:{color:"#888",background:"rgba(96,165,250,0.08)",padding:"2px 6px",borderRadius:"4px"}},trip.purpose));
    meta.append(h("span",{style:{color:"#22c55e"}},"$"+(trip.miles*IRS_RATE).toFixed(2)));
    meta.append(h("span",{style:{color:"#888"}},trip.startOdo+" \u2192 "+trip.endOdo));
    if(trip.destination)meta.append(h("span",{style:{color:"#666"}},trip.destination));
    if(trip.vehicle)meta.append(h("span",{style:{color:"#555"}},trip.vehicle));
    card.append(meta);
    card.append(h("button",{class:"ib",style:{alignSelf:"flex-end",marginTop:"2px"},onClick:function(){data.trips=data.trips.filter(function(t){return t.id!==trip.id});save();R();flash("Deleted")}},ic("trash")));
    root.append(card)});
  if(sorted.length===0)root.append(h("p",{style:{color:"#555",fontSize:"12px",textAlign:"center",padding:"20px 0"}},"No trips logged for "+yr));
  return root;
}

// ============ HOME ============
// ============ JOB VIEW ============
function rJobView(){
  var job=data.jobs.find(function(j){return j.id===selJob});if(!job){nav("home");return h("div")}
  var root=h("div",{class:"fc g16"});
  var ready=job.tasks.filter(function(t){return!t.done&&!t.blocked}),blocked=job.tasks.filter(function(t){return!t.done&&t.blocked}),done=job.tasks.filter(function(t){return t.done});
  var jobPartsCost=(job.parts||[]).reduce(function(s,p){return s+(parseFloat(p.cost)||0)},0);
  var expCost=data.expenses.filter(function(e){return e.bikeId===job.id}).reduce(function(s,e){return s+(parseFloat(e.amount)||0)},0);
  var totalCost=jobPartsCost+expCost;var quotedNum=$(job.quoted);

  // Header
  var hdr=h("div",{class:"f as g12"});var bb=h("button",{class:"ib",style:{marginTop:"2px"},onClick:function(){nav("home")}});bb.innerHTML=I.back;hdr.append(bb);
  if(job.photo){var pw2=h("div",{style:{position:"relative",flexShrink:0}});pw2.append(h("img",{class:"photo-thumb",src:job.photo}));pw2.append(h("button",{style:{position:"absolute",top:"-4px",right:"-4px",width:"18px",height:"18px",borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:"10px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},onClick:function(){job.photo=null;ss();R()}},"x"));hdr.append(pw2)}
  else{var ap2=h("div",{class:"photo-upload",onClick:function(){photoUpload(job,"photo",R)}});ap2.innerHTML=I.cam;hdr.append(ap2)}
  var info=h("div",{style:{flex:1}});
  var vTitle=[job.vehicleYear,job.vehicleMake,job.vehicleModel].filter(Boolean).join(" ")||"Service Job";
  var nr=h("div",{class:"f ac g8"});nr.append(h("h2",{style:{color:"#f5f5f5",fontSize:"20px",margin:0}},vTitle));
  var eb=h("button",{class:"ib",onClick:function(){ui.jEdit=!ui.jEdit;R()}});eb.innerHTML=I.edit;nr.append(eb);info.append(nr);
  if(job.customer){
    var custInfo=h("div",{class:"f ac g6",style:{marginTop:"2px"}});
    var linkedCust=job.customerId?data.customers.find(function(c){return c.id===job.customerId}):null;
    var jobCount=linkedCust?data.jobs.filter(function(j){return j.customerId===linkedCust.id}).length:0;
    custInfo.append(h("span",{style:{color:"#22d3ee",fontSize:"12px"}},job.customer+(job.customerContact?" \u00b7 "+job.customerContact:"")));
    if(jobCount>1)custInfo.append(h("span",{style:{color:"#22d3ee50",fontSize:"10px"}},jobCount+" jobs"));
    info.append(custInfo);
  }
  if(job.scheduledDate){var sd=job.scheduledDate;var isToday=sd===today();var isPast=sd<today();info.append(h("span",{style:{color:isPast?"#ef4444":isToday?"#22c55e":"#888",fontSize:"11px",fontWeight:isToday||isPast?700:400}},"\u{1F4C5} "+(isToday?"Today":isPast?"Overdue — "+sd:sd)))}
  if(job.problem&&!ui.jEdit)info.append(h("p",{style:{marginTop:"4px",color:"#888",fontSize:"13px",lineHeight:1.4}},job.problem));
  hdr.append(info);hdr.append(badge(job.status));root.append(hdr);

  // Share link
  var shareRow=h("div",{class:"f ac g8"});
  var shareBtn=h("button",{class:"bs",style:{fontSize:"10px",color:"#22d3ee",borderColor:"rgba(34,211,238,0.3)"},onClick:function(){
    var url=getStatusUrl(job);pushJobPublic(job);
    navigator.clipboard.writeText(url).then(function(){flash("Status link copied")}).catch(function(){prompt("Copy this link:",url)});
  }});shareBtn.append(ic("copy")," Share status");shareRow.append(shareBtn);
  if(job.shareToken)shareRow.append(h("span",{style:{color:"#444",fontSize:"10px"}},"Live"));
  root.append(shareRow);

  // Status advance bar
  var sc_={intake:"#22d3ee","in-progress":"#f59e0b",waiting:"#ef4444",done:"#22c55e",delivered:"#888"};
  var statusBar=h("div",{class:"f g4",style:{padding:"4px",background:"rgba(255,255,255,0.03)",borderRadius:"10px"}});
  JOB_STATUS.forEach(function(s){var isCur=job.status===s;var b=h("button",{style:{flex:1,padding:"8px 4px",borderRadius:"8px",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",border:"none",cursor:"pointer",background:isCur?(sc_[s]||"#888")+"25":"transparent",color:isCur?sc_[s]||"#888":"#444",textAlign:"center"},onClick:function(){
    var old=job.status;job.status=s;
    if(s==="done"&&old!=="done")job.completedAt=Date.now();
    if(s==="delivered")job.deliveredAt=Date.now();
    if(s!=="done"&&s!=="delivered"){job.completedAt=null;job.deliveredAt=null}
    if(s!=="in-progress"&&s!=="waiting"&&job.timerStart){job.laborSeconds=getJobSecs(job);job.timerStart=null}
    logAct("job-status","→ "+s,"job",job.id);
    save();if(job.shareToken)pushJobPublic(job);R();flash(s)}},s.replace("-"," "));statusBar.append(b)});
  root.append(statusBar);

  // Progress photos (visible on main view)
  if(!job.publicPhotos)job.publicPhotos=[];
  var photoSec=h("div",{class:"fc g8"});
  var photoHdr=h("div",{class:"f ac jb"});
  photoHdr.append(h("span",{class:"lbl",style:{color:"#22d3ee"}},"Progress Photos"+(job.publicPhotos.length?" ("+job.publicPhotos.length+")":"")));
  var addPhotoBtn=h("button",{class:"bs",style:{color:"#22d3ee",borderColor:"rgba(34,211,238,0.3)",padding:"4px 10px",fontSize:"11px"},onClick:function(){var inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.multiple=true;inp.onchange=function(){if(!job.publicPhotos)job.publicPhotos=[];Array.from(inp.files).forEach(function(f){compressImg(f,600,function(b64){job.publicPhotos.push(b64);save();R()})})};inp.click()}});addPhotoBtn.append(ic("cam")," Add");photoHdr.append(addPhotoBtn);
  photoSec.append(photoHdr);
  if(job.publicPhotos.length>0){
    var pgrid=h("div",{class:"f g8 fw"});
    job.publicPhotos.forEach(function(p,i){
      var pw=h("div",{style:{position:"relative",flexShrink:0}});
      pw.append(h("img",{class:"photo-thumb",src:p}));
      var rm=h("button",{style:{position:"absolute",top:"-4px",right:"-4px",width:"18px",height:"18px",borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:"10px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},onClick:function(){job.publicPhotos.splice(i,1);save();R()}});rm.textContent="\u00d7";pw.append(rm);
      pgrid.append(pw);
    });
    photoSec.append(pgrid);
    if(job.shareToken)photoSec.append(h("span",{style:{color:"#444",fontSize:"10px"}},"Visible to customer on status page"));
  }
  root.append(photoSec);

  // Timer
  var isRunning=!!job.timerStart;var totalSecs=getJobSecs(job);var laborHrs=totalSecs/3600;
  var timerW=h("div",{class:"f ac jb",style:{padding:"12px 14px",background:isRunning?"rgba(96,165,250,0.08)":"rgba(255,255,255,0.03)",borderRadius:"10px",border:isRunning?"1px solid rgba(96,165,250,0.3)":"1px solid #222"}});
  var timerLeft=h("div",{class:"f ac g8"});
  timerLeft.append(ic("timer",{color:isRunning?"#60a5fa":"#555"}));
  var timerDisp=h("span",{style:{fontSize:"18px",fontWeight:700,fontVariantNumeric:"tabular-nums",color:isRunning?"#60a5fa":"#e5e5e5"}},fmtTime(totalSecs));
  if(isRunning)timerDisp.setAttribute("data-timer-job",job.id);
  timerLeft.append(timerDisp);
  if(laborHrs>0.01){var rateNum=parseFloat(job.laborRate)||0;if(rateNum>0)timerLeft.append(h("span",{style:{fontSize:"11px",color:"#555"}},"$"+Math.round(laborHrs*rateNum)))}
  timerW.append(timerLeft);
  var timerBtns=h("div",{class:"f g6"});
  // Start/stop
  var togBtn=h("button",{style:{padding:"8px 16px",borderRadius:"8px",fontSize:"12px",fontWeight:700,border:"none",cursor:"pointer",background:isRunning?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)",color:isRunning?"#ef4444":"#22c55e"},onClick:function(){
    if(job.timerStart){job.laborSeconds=getJobSecs(job);job.timerStart=null;logAct("timer-stop",fmtTime(job.laborSeconds),"job",job.id)}else{job.timerStart=Date.now();startTimerTick()}
    save();R()}},isRunning?"Stop":"Start");
  timerBtns.append(togBtn);
  // Manual adjust
  var adjBtn=h("button",{class:"ib",style:{color:"#555"},onClick:function(){
    var cur=getJobSecs(job);var hrs=Math.floor(cur/3600);var mins=Math.floor((cur%3600)/60);
    var val=prompt("Edit time (hours:minutes):",hrs+":"+("0"+mins).slice(-2));
    if(val!==null){var parts=val.split(":");var newSecs=(parseInt(parts[0])||0)*3600+(parseInt(parts[1])||0)*60;
      if(job.timerStart){job.laborSeconds=newSecs;job.timerStart=Date.now()}else{job.laborSeconds=newSecs}
      save();R()}}});
  adjBtn.innerHTML=I.edit;timerBtns.append(adjBtn);
  timerW.append(timerBtns);root.append(timerW);
  if(isRunning)startTimerTick();

  // Edit panel
  if(ui.jEdit){
    var p=h("div",{class:"ep fc g12"});p.append(h("span",{class:"lbl",style:{color:"#22d3ee"}},"Edit Job"));var inps={};
    var r1=h("div",{class:"f g8 fw"});[["vehicleYear","Year","70px"],["vehicleMake","Make",""],["vehicleModel","Model",""]].forEach(function(f){var inp=h("input",{type:"text",value:job[f[0]]||"",placeholder:f[1],style:f[2]?{width:f[2],flex:"none"}:{flex:1,minWidth:"80px"},onInput:function(e){inps[f[0]]=e.target.value}});inps[f[0]]=job[f[0]]||"";r1.append(inp)});p.append(r1);
    var r1b=h("div",{class:"f g8"});[["customer","Customer name"],["customerContact","Phone / contact"]].forEach(function(f){var inp=h("input",{type:"text",value:job[f[0]]||"",placeholder:f[1],style:{flex:1},onInput:function(e){inps[f[0]]=e.target.value}});inps[f[0]]=job[f[0]]||"";r1b.append(inp)});p.append(r1b);
    var probI=h("textarea",{rows:"3",placeholder:"Problem description...",onInput:function(e){inps.problem=e.target.value}});probI.value=job.problem||"";inps.problem=job.problem||"";p.append(probI);
    var r2=h("div",{class:"f g8"});
    var qI=h("input",{type:"text",value:job.quoted||"",placeholder:"Quoted price",style:{flex:1},onInput:function(e){inps.quoted=e.target.value}});inps.quoted=job.quoted||"";
    var lrI=h("input",{type:"text",value:job.laborRate||"",placeholder:"Labor $/hr",style:{flex:1},onInput:function(e){inps.laborRate=e.target.value}});inps.laborRate=job.laborRate||"";
    r2.append(qI,lrI);p.append(r2);
    var sdI=h("input",{type:"date",value:job.scheduledDate||"",style:{flex:1}});
    var sdRow=h("div",{class:"f ac g8"});sdRow.append(h("span",{style:{color:"#888",fontSize:"12px"}},"Scheduled:"),sdI);p.append(sdRow);
    p.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.jEdit=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){
      ["vehicleYear","vehicleMake","vehicleModel","customer","customerContact","problem","quoted","laborRate"].forEach(function(k){if(inps[k]!==undefined)job[k]=(inps[k]||"").trim()});
      job.scheduledDate=sdI.value||"";
      // Sync customer record
      if(job.customerId){
        var cust=data.customers.find(function(c){return c.id===job.customerId});
        if(cust){
          if(job.customer)cust.name=job.customer;
          if(job.customerContact)cust.contact=job.customerContact;
          // Update vehicle in customer's list
          var veh=cust.vehicles.find(function(v){return v.year===(inps.vehicleYear||"").trim()&&v.make===(inps.vehicleMake||"").trim()&&v.model===(inps.vehicleModel||"").trim()});
          if(!veh&&(inps.vehicleMake||"").trim()){
            cust.vehicles.push({year:(inps.vehicleYear||"").trim(),make:(inps.vehicleMake||"").trim(),model:(inps.vehicleModel||"").trim()});
          }
        }
      }
      ui.jEdit=0;save();R();flash()
    }},"Save")));root.append(p)}

  // Financials
  var laborTotal=Math.round(laborHrs*(parseFloat(job.laborRate)||0));
  if(totalCost>0||quotedNum>0||laborTotal>0){
    var finB=h("div",{class:"fc g6",style:{padding:"12px 14px",background:"rgba(34,211,238,0.04)",borderRadius:"10px",border:"1px solid rgba(34,211,238,0.15)"}});
    finB.append(h("span",{style:{fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#22d3ee"}},"Job Financials"));
    var fr=h("div",{class:"f jb fw",style:{fontSize:"12px"}});
    if(jobPartsCost>0)fr.append(h("span",{style:{color:"#60a5fa"}},"Parts: $"+$$(jobPartsCost)));
    if(expCost>0)fr.append(h("span",{style:{color:"#f59e0b"}},"Expenses: $"+$$(expCost)));
    if(laborTotal>0)fr.append(h("span",{style:{color:"#60a5fa"}},"Labor: $"+laborTotal+" ("+laborHrs.toFixed(1)+"h)"));
    finB.append(fr);
    var fr2=h("div",{class:"f jb",style:{fontSize:"13px",fontWeight:700,paddingTop:"4px",borderTop:"1px solid rgba(255,255,255,0.05)"}});
    fr2.append(h("span",{style:{color:"#ef4444"}},"Cost: $"+$$(totalCost+laborTotal)));
    if(quotedNum>0){fr2.append(h("span",{style:{color:"#22c55e"}},"Quoted: $"+quotedNum));fr2.append(h("span",{style:{color:quotedNum-totalCost-laborTotal>=0?"#22c55e":"#ef4444"}},"Profit: $"+$$(quotedNum-totalCost-laborTotal)))}
    finB.append(fr2);root.append(finB)}

  // Stats
  var stats=h("div",{class:"f g12",style:{padding:"10px 0",borderTop:"1px solid #222",borderBottom:"1px solid #222"}});
  var s_=function(ico,col,txt){var d=h("div",{class:"f ac g6",style:{color:col}});d.innerHTML=I[ico];d.append(h("span",{style:{fontSize:"13px"}},txt));return d};
  stats.append(s_("wrench","#f59e0b",ready.length+" ready"),s_("blocked","#ef4444",blocked.length+" blocked"),s_("check","#22c55e",done.length+" done"));root.append(stats);

  // Tabs
  var jobWaitingParts=(job.parts||[]).filter(function(p){return p.status==="ordered"||p.status==="shipped"}).length;
  var tabs=[{key:"tasks",label:"Tasks",count:ready.length},{key:"parts",label:"Parts"+(jobWaitingParts?" ("+jobWaitingParts+")":"")},{key:"log",label:"Log"}];
  if(job.shareToken)tabs.push({key:"chat",label:"Chat"});
  var tsc=h("div",{style:{overflowX:"auto",WebkitOverflowScrolling:"touch",margin:"0 -4px",padding:"0 4px"}});var tb=h("div",{class:"f g4",style:{background:"rgba(255,255,255,0.03)",borderRadius:"8px",padding:"3px",minWidth:"min-content"}});
  tabs.forEach(function(t){tb.append(h("button",{class:"tab"+(ui.bTab===t.key?" a":""),onClick:function(){ui.bTab=t.key;R()}},t.label+(t.count!==undefined?" ("+t.count+")":"")))});tsc.append(tb);root.append(tsc);

  if(ui.bTab==="tasks"){var c=h("div",{class:"fc g12"});c.append(rAddTask(job));
    if(ready.length>0){var sec=h("div",{class:"fc g6"});sec.append(h("span",{class:"lbl"},"Ready to work"));ready.forEach(function(t){sec.append(rTask(t,job))});c.append(sec)}
    if(blocked.length>0){var sec2=h("div",{class:"fc g6"});sec2.append(h("span",{class:"lbl",style:{color:"#ef4444"}},"Blocked"));blocked.forEach(function(t){sec2.append(rTask(t,job))});c.append(sec2)}
    if(done.length>0){var sec3=h("div",{class:"fc g6"});var tog=h("button",{class:"f ac g6",style:{color:"#22c55e",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",padding:0},onClick:function(){ui.showDone=!ui.showDone;R()}});var ch_=document.createElement("span");ch_.innerHTML=chev(ui.showDone);ch_.style.display="flex";tog.append(ch_," Done ("+done.length+")");sec3.append(tog);if(ui.showDone)done.forEach(function(t){sec3.append(rTask(t,job))});c.append(sec3)}
    if(!ready.length&&!blocked.length&&!done.length)c.append(h("p",{style:{color:"#555",fontSize:"13px",textAlign:"center",padding:"20px"}},"No tasks yet."));
    root.append(c);
  }else if(ui.bTab==="parts"){root.append(rParts(job,"job",job.id));
  }else if(ui.bTab==="log"){var w=h("div",{class:"fc g12"});
    w.append(h("span",{class:"lbl"},"Work Log"));
    w.append(rLog(job,"job",job.id));
    w.append(h("div",{style:{borderTop:"1px solid #222",paddingTop:"12px",marginTop:"8px"}}));
    w.append(h("span",{class:"lbl",style:{color:"#22d3ee"}},"Customer-visible notes"));
    w.append(h("p",{style:{color:"#555",fontSize:"11px"}},"Shown on the shared status page."));
    var pubTa=h("textarea",{rows:"6",placeholder:"Update for the customer...",style:{borderColor:"rgba(34,211,238,0.2)"},onInput:function(e){job.publicNotes=e.target.value;ss()}});pubTa.value=job.publicNotes||"";w.append(pubTa);
    if(job.shareToken)w.append(h("button",{class:"bs",style:{alignSelf:"flex-start",color:"#22d3ee",borderColor:"rgba(34,211,238,0.3)",fontSize:"11px"},onClick:function(){pushJobPublic(job);flash("Status page updated")}},"Push update now"));
    root.append(w)}
  else if(ui.bTab==="chat"&&job.shareToken){
    var cw=h("div",{class:"fc g10"});
    var chatBox=h("div",{id:"job-chat-box",style:{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"400px",overflowY:"auto",padding:"8px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",border:"1px solid #222",minHeight:"120px"}});
    chatBox.innerHTML='<span style="color:#444;font-size:11px;text-align:center;padding:20px">Loading...</span>';
    cw.append(chatBox);
    // Input
    var chatRow=h("div",{class:"f g8"});
    var chatIn=h("textarea",{rows:"2",placeholder:"Reply to customer...",style:{flex:1,fontSize:"12px",resize:"none"}});
    var chatSend=h("button",{class:"bp",style:{padding:"8px 16px",fontSize:"12px",alignSelf:"flex-end"},onClick:function(){
      var msg=chatIn.value.trim();if(!msg)return;
      chatSend.disabled=true;chatSend.textContent="...";
      var auth_=getAuth();fetch(SB_URL+"/rest/v1/job_chat",{method:"POST",headers:sbHeaders(),body:JSON.stringify({token:job.shareToken,sender:"mechanic",message:msg,sender_email:auth_?auth_.email:"",user_agent:navigator.userAgent})})
      .then(function(){chatIn.value="";logAct("chat-send",msg.slice(0,40),"job",job.id);loadJobChat(job.shareToken)})
      .catch(function(){flash("Send failed")})
      .finally(function(){chatSend.disabled=false;chatSend.textContent="Send"});
    }});chatSend.textContent="Send";
    chatIn.onkeydown=function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatSend.click()}};
    chatRow.append(chatIn,chatSend);cw.append(chatRow);
    root.append(cw);
    loadJobChat(job.shareToken);
  }

  // Timestamps
  var ts=h("div",{class:"f g12 fw",style:{fontSize:"10px",color:"#555",padding:"8px 0"}});
  if(job.createdAt)ts.append(h("span",null,"Created "+new Date(job.createdAt).toLocaleDateString()));
  if(job.completedAt)ts.append(h("span",null,"Done "+new Date(job.completedAt).toLocaleDateString()));
  if(job.deliveredAt)ts.append(h("span",null,"Delivered "+new Date(job.deliveredAt).toLocaleDateString()));
  if(job.createdAt){var age=daysBetween(new Date(job.createdAt).toISOString().split("T")[0],today());ts.append(h("span",null,age+"d in shop"))}
  root.append(ts);

  // Delete
  if(ui.cfDel===job.id)root.append(confirm_("Delete this job?",function(){data.jobs=data.jobs.filter(function(j){return j.id!==job.id});save();nav("home")},function(){ui.cfDel=null;R()}));
  else root.append(h("button",{class:"bd",style:{marginTop:"8px"},onClick:function(){ui.cfDel=job.id;R()}},"Delete job"));
  return root;
}

// ============ CLIENT PROFILE ============
function rClientView(){
  var cust=data.customers.find(function(c){return c.id===selClient});
  if(!cust){nav("home");return h("div")}
  var root=h("div",{class:"fc g16"});
  var custJobs=data.jobs.filter(function(j){return j.customerId===cust.id});
  var activeJobs=custJobs.filter(function(j){return j.status!=="delivered"});
  var deliveredJobs=custJobs.filter(function(j){return j.status==="delivered"});

  // Header
  var hdr=h("div",{class:"f as g12"});
  var bb=h("button",{class:"ib",style:{marginTop:"2px"},onClick:function(){nav("home");hTab="clients"}});bb.innerHTML=I.back;hdr.append(bb);
  var info=h("div",{style:{flex:1}});
  var nr=h("div",{class:"f ac g8"});
  if(ui.edit){
    var ni=h("input",{type:"text",value:cust.name,style:{fontSize:"18px",fontWeight:700,flex:1},onInput:function(e){cust.name=e.target.value}});
    nr.append(ni);
  }else{
    nr.append(h("h2",{style:{color:"#f5f5f5",fontSize:"20px",margin:0}},cust.name||"Unnamed Client"));
  }
  var eb=h("button",{class:"ib",onClick:function(){ui.edit=!ui.edit;R()}});eb.innerHTML=I.edit;nr.append(eb);
  info.append(nr);
  // Contact
  if(ui.edit){
    var ci=h("input",{type:"text",value:cust.contact||"",placeholder:"Phone / email / contact",style:{marginTop:"6px",fontSize:"13px"},onInput:function(e){cust.contact=e.target.value}});
    info.append(ci);
  }else if(cust.contact){
    info.append(h("span",{style:{color:"#888",fontSize:"13px",marginTop:"4px"}},cust.contact));
  }
  var meta=h("div",{class:"f g12",style:{marginTop:"6px",fontSize:"12px"}});
  if(activeJobs.length>0)meta.append(h("span",{style:{color:"#22d3ee"}},activeJobs.length+" active"));
  if(deliveredJobs.length>0)meta.append(h("span",{style:{color:"#22c55e"}},deliveredJobs.length+" delivered"));
  info.append(meta);hdr.append(info);root.append(hdr);

  // Save bar when editing
  if(ui.edit){
    root.append(h("div",{class:"f g8"},h("button",{class:"bs",style:{flex:1,justifyContent:"center"},onClick:function(){ui.edit=0;R()}},"Cancel"),h("button",{class:"bp",style:{flex:1},onClick:function(){
      // Sync name/contact to all linked jobs
      custJobs.forEach(function(j){j.customer=cust.name;j.customerContact=cust.contact||""});
      ui.edit=0;save();R();flash("Client updated")
    }},"Save")));
  }

  // Vehicles
  var vSec=h("div",{class:"fc g8"});
  vSec.append(h("span",{class:"lbl",style:{color:"#60a5fa"}},"Vehicles ("+cust.vehicles.length+")"));
  cust.vehicles.forEach(function(v,vi){
    var vTitle=[v.year,v.make,v.model].filter(Boolean).join(" ")||"Unknown Vehicle";
    var vJobs=custJobs.filter(function(j){return j.vehicleYear===v.year&&j.vehicleMake===v.make&&j.vehicleModel===v.model});
    var vCard=h("div",{class:"f ac g10",style:{padding:"10px 12px",background:"rgba(96,165,250,0.06)",borderRadius:"8px",border:"1px solid rgba(96,165,250,0.12)"}});
    var vInfo=h("div",{style:{flex:1}});
    if(ui.edit){
      var vRow=h("div",{class:"f g6 fw"});
      var vy=h("input",{type:"text",value:v.year||"",placeholder:"Year",style:{width:"60px",flex:"none",fontSize:"12px",padding:"4px 6px"},onInput:function(e){v.year=e.target.value}});
      var vm=h("input",{type:"text",value:v.make||"",placeholder:"Make",style:{flex:1,minWidth:"60px",fontSize:"12px",padding:"4px 6px"},onInput:function(e){v.make=e.target.value}});
      var vmo=h("input",{type:"text",value:v.model||"",placeholder:"Model",style:{flex:1,minWidth:"60px",fontSize:"12px",padding:"4px 6px"},onInput:function(e){v.model=e.target.value}});
      vRow.append(vy,vm,vmo);vInfo.append(vRow);
    }else{
      vInfo.append(h("span",{style:{color:"#e5e5e5",fontSize:"13px",fontWeight:600}},vTitle));
    }
    if(vJobs.length>0)vInfo.append(h("span",{style:{color:"#555",fontSize:"10px",marginTop:"2px"}},vJobs.length+" job"+(vJobs.length!==1?"s":"")));
    vCard.append(vInfo);
    if(ui.edit){var del=h("button",{class:"ib",style:{color:"#ef444460"},onClick:function(){cust.vehicles.splice(vi,1);R()}});del.innerHTML=I.trash;vCard.append(del)}
    vSec.append(vCard)});
  // Add vehicle
  if(ui.edit){
    var avBtn=h("button",{class:"bg",style:{borderColor:"rgba(96,165,250,0.3)",fontSize:"12px",padding:"8px"},onClick:function(){cust.vehicles.push({year:"",make:"",model:""});R()}});
    avBtn.innerHTML=I.plus+" Add vehicle";vSec.append(avBtn);
  }
  root.append(vSec);

  // Job history
  var jSec=h("div",{class:"fc g8"});
  jSec.append(h("span",{class:"lbl",style:{color:"#22d3ee"}},"Jobs ("+custJobs.length+")"));
  custJobs.sort(function(a,b){return(b.createdAt||0)-(a.createdAt||0)});
  custJobs.forEach(function(j){
    var vt=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean).join(" ")||"Service Job";
    var card=h("button",{class:"card fc g4",onClick:function(){nav("job",j.id)}});
    var top=h("div",{class:"f ac g10"});
    top.append(h("span",{style:{color:"#f5f5f5",fontSize:"14px",fontWeight:600,flex:1}},vt));
    top.append(badge(j.status));card.append(top);
    if(j.problem)card.append(h("span",{style:{color:"#666",fontSize:"11px",lineHeight:1.3}},j.problem.slice(0,80)+(j.problem.length>80?"...":"")));
    jSec.append(card)});
  if(custJobs.length===0)jSec.append(h("p",{style:{color:"#555",fontSize:"12px"}},"No jobs yet"));
  root.append(jSec);

  // Quick add job for this client
  var njBtn=h("button",{class:"bg",style:{borderColor:"rgba(34,211,238,0.3)"},onClick:function(){
    nav("home");hTab="jobs";ui.addJob=1;
    setTimeout(function(){
      var chips=document.querySelectorAll(".chip");
      chips.forEach(function(chip){if(chip.textContent.indexOf(cust.name)===0)chip.click()})
    },100);
  }});njBtn.innerHTML=I.plus+" New job for "+cust.name;root.append(njBtn);

  // Delete
  if(ui.cfDel===cust.id){
    root.append(confirm_("Delete this client? Jobs will keep their data but lose the link.",function(){
      data.jobs.forEach(function(j){if(j.customerId===cust.id)j.customerId=""});
      data.customers=data.customers.filter(function(c){return c.id!==cust.id});
      save();nav("home");hTab="clients"
    },function(){ui.cfDel=null;R()}));
  }else{
    root.append(h("button",{class:"bd",style:{marginTop:"12px"},onClick:function(){ui.cfDel=cust.id;R()}},"Delete client"));
  }
  return root;
}

