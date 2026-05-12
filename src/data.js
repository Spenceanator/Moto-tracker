var SK="mototracker_data",DV=4,IRS_RATE=0.70,APP_VERSION="6.3.0";
// ============ ENTITY-LEVEL CHANGE TRACKING ============
var _lastSnap={},_snapCols=['bikes','leads','sold','expenses','trips','jobs','customers'];
function _snapKey(e){return JSON.stringify(e,function(k,v){return k==="_ts"?undefined:v})}
function _updateSnapshot(){_lastSnap={};_snapCols.forEach(function(c){_lastSnap[c]={};(data[c]||[]).forEach(function(e){if(e.id)_lastSnap[c][e.id]=_snapKey(e)})})}
var DT=[
  {id:"buy",name:"Buy",items:["Title clean and matches VIN","Compression check (or engine turns over)","Frame straight - no cracks or welds","Transport plan figured out","Calculated max buy price","Checked comps for realistic sell price","Known issues identified and priced out","No title mismatch or lien issues"]},
  {id:"release",name:"Release",items:[
    "T: Tire tread adequate - no flat spots, cracking, or dry rot",
    "T: Tire pressure set to spec",
    "T: Wheels spin free, no wobble or bearing play",
    "C: Throttle snaps closed from all steering positions",
    "C: Clutch engages and disengages cleanly",
    "C: Front brake lever firm, no sponge",
    "C: Rear brake pedal firm, stops straight",
    "C: Cables lubed, no fraying",
    "C: Mirrors adjusted and tight",
    "L: Headlight hi/lo functional",
    "L: Tail light and brake light (both levers activate)",
    "L: Turn signals all four",
    "L: Horn works",
    "L: Battery holds charge overnight",
    "L: Charging system verified (13.5-14.5V at 3k RPM)",
    "O: Engine oil fresh and at correct level",
    "O: Coolant level correct (if liquid-cooled)",
    "O: Brake fluid front and rear - not dark or contaminated",
    "O: No active leaks - engine, fork seals, brake lines",
    "C: Frame - no cracks, bends, or suspect welds",
    "C: Steering head bearings smooth, no notch",
    "C: Swingarm pivot - no excess play",
    "C: Chain tension and alignment to spec, lubed",
    "C: Sprockets - no hooked or missing teeth",
    "C: All critical fasteners torqued (axles, engine mounts, triple clamp)",
    "S: Side stand holds, spring returns, kill switch cuts engine",
    "RIDE: Cold start verified",
    "RIDE: Hot restart verified",
    "RIDE: Idles steady after warmup",
    "RIDE: Test ride completed - 10+ mi mixed riding",
    "RIDE: No warning lights or abnormal sounds",
    "SELL: Title in hand, signed and ready",
    "SELL: Photos taken - all angles + detail shots of wear/damage",
    "SELL: Known issues documented honestly for listing",
    "SELL: Listing price set from recent sold comps",
    "SELL: VIN plate visible and matches title"
  ]}
];
var ECAT=["Parts","Tools","Transport","Registration/Insurance","Storage","Listing Fees","Fuel","Other"];
var TRIP_PURPOSE=["Pickup","Delivery","Parts Run","Test Ride","Inspection","Meetup/Showing","Other"];
var JOB_STATUS=["intake","in-progress","waiting","done","delivered"];
var DEF_LEAD_PROMPT='Analyze this motorcycle/vehicle listing screenshot. Extract all visible information and research the vehicle specs. Return ONLY a JSON object with these fields (use empty string if not found):\n{"year":"","make":"","model":"","askingPrice":"","mileage":"","titleStatus":"clean or salvage if stated","listingSource":"FB Marketplace, KSL, Craigslist, etc if visible","listingUrl":"","sellerName":"","sellerContact":"","estSellPrice":"your estimate of realistic sell price after fixing","flipDifficulty":"easy, moderate, or hard","partsAvailability":"excellent, good, fair, or poor","demandLevel":"high, medium, or low","estDaysToSell":"number estimate","notes":"any red flags, observations, or key details from the listing","status":"watching","knownIssues":[{"name":"issue description","severity":"low/med/high","difficulty":"easy/mod/hard","cost":"estimated dollar amount"}],"hiddenIssues":[{"name":"likely hidden issue based on age/type/symptoms","severity":"low/med/high","difficulty":"easy/mod/hard","cost":"estimated dollar amount"}],"specs":{"tirePsiFront":"psi spec","tirePsiRear":"psi spec","tireSizeFront":"size","tireSizeRear":"size","oilType":"weight and type","oilCapacity":"quarts or liters","fuelType":"octane requirement","sparkPlug":"part number","chainSize":"size and link count","coolantType":"type if liquid cooled","brakeFluid":"DOT type","bulbHeadlight":"bulb number","bulbTurnSignal":"bulb number","bulbTail":"bulb number","valveClearance":"intake/exhaust spec","torqueAxleFront":"ft-lbs","torqueAxleRear":"ft-lbs","torqueDrain":"ft-lbs","notes":"any other notable specs"}}\nLook up factory specs for this exact year/make/model. Be realistic about pricing and issues. Flag red flags. Return only the JSON, no other text.';
function fresh(){return{version:DV,bikes:[],leads:[],sold:[],expenses:[],trips:[],jobs:[],customers:[],activity:[],apiKey:"",vehicles:[],leadPrompt:"",checklistTemplates:JSON.parse(JSON.stringify(DT))}}
function migrate(d){
  if(!d.version)d.version=DV;if(!d.checklistTemplates)d.checklistTemplates=JSON.parse(JSON.stringify(DT));
  if(!d.leads)d.leads=[];if(!d.sold)d.sold=[];if(!d.expenses)d.expenses=[];if(!d.trips)d.trips=[];if(!d.jobs)d.jobs=[];d.jobs.forEach(function(j){if(j.laborHours&&!j.laborSeconds){j.laborSeconds=Math.round((parseFloat(j.laborHours)||0)*3600);delete j.laborHours}if(j.laborSeconds==null)j.laborSeconds=0;if(j.timerStart===undefined)j.timerStart=null;if(j.tasks)j.tasks.forEach(function(t){if(t.verified===undefined)t.verified=1})});if(!d.apiKey)d.apiKey="";if(!d.vehicles){d.vehicles=[];if(d.vehicle){d.vehicles.push(d.vehicle);delete d.vehicle}}if(d.leadPrompt==null)d.leadPrompt="";
  // Migrate customers from existing jobs
  if(!d.customers)d.customers=[];
  if(!d.activity)d.activity=[];
  // Migrate workLog/notes strings to log entries
  if(d.bikes)d.bikes.forEach(function(b){
    if(!b.log)b.log=[];
    if(b.workLog&&b.log.length===0){b.log.push({id:mid(),ts:b.createdAt||Date.now(),text:b.workLog});b.workLog=""}
    if(!b.parts)b.parts=[];
    if(!b.photos)b.photos=[];
  });
  if(d.jobs)d.jobs.forEach(function(j){
    if(!j.log)j.log=[];
    if(j.notes&&j.log.length===0){j.log.push({id:mid(),ts:j.createdAt||Date.now(),text:j.notes});j.notes=""}
    if(!j.parts)j.parts=[];
  });
  if(d.customers.length===0&&d.jobs.length>0){
    var seen={};d.jobs.forEach(function(j){
      if(!j.customer)return;var key=j.customer.toLowerCase().trim();
      if(!key||seen[key])return;
      var cust={id:mid(),name:j.customer.trim(),contact:j.customerContact||"",vehicles:[]};
      var veh=[j.vehicleYear,j.vehicleMake,j.vehicleModel].filter(Boolean);
      if(veh.length>0)cust.vehicles.push({year:j.vehicleYear||"",make:j.vehicleMake||"",model:j.vehicleModel||""});
      d.customers.push(cust);seen[key]=cust.id;j.customerId=cust.id;
    });
    // Second pass: link remaining jobs and merge vehicles
    d.jobs.forEach(function(j){
      if(j.customerId||!j.customer)return;var key=j.customer.toLowerCase().trim();
      if(seen[key]){j.customerId=seen[key];
        var c=d.customers.find(function(x){return x.id===seen[key]});
        if(c&&j.vehicleMake){var exists=c.vehicles.some(function(v){return v.year===j.vehicleYear&&v.make===j.vehicleMake&&v.model===j.vehicleModel});
          if(!exists)c.vehicles.push({year:j.vehicleYear||"",make:j.vehicleMake||"",model:j.vehicleModel||""})}}
    });
  }
  d.leads.forEach(function(l){if(!l.knownIssues)l.knownIssues=[];if(!l.hiddenIssues)l.hiddenIssues=[];
    ["year","make","model","askingPrice","estSellPrice","mileage","titleStatus","listingSource","flipDifficulty","partsAvailability","demandLevel","estDaysToSell","notes","listingUrl","sellerName","sellerContact"].forEach(function(k){if(l[k]!=null&&typeof l[k]!=="string")l[k]=String(l[k]);if(l[k]===undefined)l[k]=""});
    if(l.status&&!{"watching":1,"pursue":1,"pass":1}[l.status])l.status="watching";if(!l.specs)l.specs={};
    l.knownIssues.forEach(function(i){if(i.cost!=null&&typeof i.cost!=="string")i.cost=String(i.cost)});
    l.hiddenIssues.forEach(function(i){if(i.cost!=null&&typeof i.cost!=="string")i.cost=String(i.cost)})});
  if(d.bikes)d.bikes=d.bikes.map(function(b){if(!b.checklistTemplates)b.checklistTemplates=JSON.parse(JSON.stringify(d.checklistTemplates));if(!b.tasks)b.tasks=[];
    b.tasks.forEach(function(t){if(t.cost==null)t.cost="";if(t.verified===undefined)t.verified=1});if(!b.specs)b.specs={};if(!b.buyDate)b.buyDate="";if(!b.actualBuyPrice)b.actualBuyPrice="";if(!b.source)b.source="";return b});
  // Stamp _ts on entities that don't have one (migration from pre-6.3.0)
  var blobTs=d._ts||Date.now();
  ['bikes','leads','sold','expenses','trips','jobs','customers'].forEach(function(c){(d[c]||[]).forEach(function(e){if(e.id&&!e._ts)e._ts=blobTs})});
  return d}
function load(){try{var r=localStorage.getItem(SK);if(!r)return fresh();return migrate(JSON.parse(r))}catch(e){return fresh()}}
function save(){try{var now=Date.now();data._ts=now;
  _snapCols.forEach(function(c){if(!_lastSnap[c])_lastSnap[c]={};(data[c]||[]).forEach(function(e){if(!e.id)return;var sk=_snapKey(e);if(sk!==_lastSnap[c][e.id])e._ts=now;_lastSnap[c][e.id]=sk})});
  localStorage.setItem(SK,JSON.stringify(data));syncPush()}catch(e){}}
function logAct(action,detail,entityType,entityId){
  if(!data.activity)data.activity=[];
  // Auto-append entity name for context
  var ctx="";
  if(entityId){
    var ent=data.bikes.find(function(b){return b.id===entityId})||data.jobs.find(function(j){return j.id===entityId})||data.sold.find(function(b){return b.id===entityId});
    if(ent)ctx=ent.name||[ent.vehicleYear,ent.vehicleMake,ent.vehicleModel].filter(Boolean).join(" ")||(ent.customer?ent.customer:"");
    if(ent&&ent.customer&&!ent.name)ctx=(ent.customer?ent.customer+" — ":"")+ctx;
  }
  var full=detail+(ctx?" · "+ctx:"");
  data.activity.push({ts:Date.now(),action:action,detail:full,type:entityType||"",id:entityId||""});
  if(data.activity.length>2000)data.activity=data.activity.slice(-2000);
}
function loadJobChat(token){
  fetch(SB_URL+"/rest/v1/job_chat?token=eq."+token+"&order=created_at.asc",{method:"GET",headers:sbHeaders()})
  .then(function(r){return r.json()}).then(function(msgs){
    var box=document.getElementById("job-chat-box");if(!box)return;
    box.innerHTML="";
    if(!msgs||msgs.length===0){box.innerHTML='<span style="color:#444;font-size:11px;text-align:center;padding:20px">No messages yet. Customer can chat from their status page.</span>';return}
    msgs.forEach(function(m){
      var isMech=m.sender==="mechanic";
      var div=h("div",{style:{alignSelf:isMech?"flex-end":"flex-start",maxWidth:"85%",padding:"8px 12px",borderRadius:"10px",fontSize:"12px",lineHeight:"1.4",wordWrap:"break-word",background:isMech?"rgba(34,211,238,0.08)":"rgba(245,158,11,0.12)",border:isMech?"1px solid rgba(34,211,238,0.15)":"1px solid rgba(245,158,11,0.2)"}});
      div.append(h("div",null,m.message));
      var metaText=(isMech?(m.sender_email||"You"):"Customer")+" · "+new Date(m.created_at).toLocaleString();
      if(!isMech&&m.user_agent){var ua=m.user_agent;var short=ua.indexOf("Mobile")>-1?"Mobile":"Desktop";metaText+=" · "+short}
      div.append(h("div",{style:{fontSize:"9px",color:"#555",marginTop:"2px"}},metaText));
      box.append(div);
    });
    box.scrollTop=box.scrollHeight;
    // Mark as read
    _chatRead[token]=Date.now();try{localStorage.setItem("drydock_chat_read",JSON.stringify(_chatRead))}catch(e){}
  }).catch(function(){});
}

