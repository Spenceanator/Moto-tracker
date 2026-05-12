// ============ BILL OF SALE GENERATOR ============
// Modes: vehicle (Utah TC-843 compliant), firearm, general
// Output: PDF via jsPDF with embedded signatures and DL photo

var _bos={
  mode:"vehicle",
  seller:{name:"",address:"",city:"",state:"UT",zip:"",phone:""},
  buyer:{name:"",address:"",city:"",state:"",zip:"",phone:""},
  // Vehicle
  vehicleType:"motorcycle",year:"",make:"",model:"",vin:"",plate:"",color:"",plateIncluded:false,
  // Odometer
  odoReading:"",odoStatus:"actual",
  // Title
  titleStatus:"clean",lienHolder:"",
  // Firearm
  fMake:"",fModel:"",fSerial:"",fCaliber:"",fType:"",fBarrelLen:"",
  buyerEligible:false,
  // General
  itemDesc:"",
  // Sale
  price:"",tradeIn:"",saleDate:today(),
  // Signatures
  sellerSig:null,buyerSig:null,sellerSigTyped:"",buyerSigTyped:"",
  // DL photo
  buyerDL:null,
  // UI state
  sigTarget:null,sigMode:"draw",
  // Prefill source
  prefillId:null
};

function _bosReset(){
  _bos={mode:"vehicle",seller:{name:"",address:"",city:"",state:"UT",zip:"",phone:""},buyer:{name:"",address:"",city:"",state:"",zip:"",phone:""},vehicleType:"motorcycle",year:"",make:"",model:"",vin:"",plate:"",color:"",plateIncluded:false,odoReading:"",odoStatus:"actual",titleStatus:"clean",lienHolder:"",fMake:"",fModel:"",fSerial:"",fCaliber:"",fType:"",fBarrelLen:"",buyerEligible:false,itemDesc:"",price:"",tradeIn:"",saleDate:today(),sellerSig:null,buyerSig:null,sellerSigTyped:"",buyerSigTyped:"",buyerDL:null,sigTarget:null,sigMode:"draw",prefillId:null};
}

function _bosPrefillBike(bikeId){
  var b=data.bikes.find(function(x){return x.id===bikeId})||data.sold.find(function(x){return x.id===bikeId});
  if(!b)return;
  _bos.year=b.year||"";_bos.make=b.make||"";_bos.model=b.model||"";
  _bos.vin=b.vin||"";_bos.color=b.color||"";
  _bos.price=b.sellPrice||b.askingPrice||b.actualBuyPrice||"";
  _bos.vehicleType="motorcycle";
  _bos.prefillId=bikeId;
}

function _bosPrefillSold(soldItem){
  _bosPrefillBike(soldItem.id);
  if(soldItem.sellPrice)_bos.price=soldItem.sellPrice;
  if(soldItem.sellDate)_bos.saleDate=soldItem.sellDate;
  if(soldItem.buyerName){_bos.buyer.name=soldItem.buyerName}
}

// ============ FORM RENDERING ============
function rBillOfSaleView(){
  var root=h("div",{class:"fc g16",style:{paddingBottom:"100px"}});
  // Header
  root.append(h("div",{class:"fc g4"},
    h("div",{class:"lbl"},"Bill of Sale"),
    h("div",{style:{color:"#888",fontSize:"11px"}},"Generate a legally compliant bill of sale")
  ));

  // Mode toggle
  var modeBar=h("div",{class:"nb"});
  [{k:"vehicle",l:"Vehicle"},{k:"firearm",l:"Firearm"},{k:"general",l:"General"}].forEach(function(m){
    var btn=h("button",{class:"nt"+(_bos.mode===m.k?" a":""),onclick:function(){_bos.mode=m.k;R()}},m.l);
    modeBar.append(btn);
  });
  root.append(modeBar);

  // Prefill picker (vehicle mode only)
  if(_bos.mode==="vehicle"&&data.bikes.length>0){
    var pfSel=document.createElement("select");
    pfSel.style.cssText="width:100%;background:rgba(255,255,255,0.05);border:1px solid #333;border-radius:6px;color:#e5e5e5;padding:10px 12px;font-size:12px;font-family:var(--font)";
    var defOpt=document.createElement("option");defOpt.value="";defOpt.textContent="— Auto-fill from inventory —";defOpt.style.background="#111";pfSel.appendChild(defOpt);
    data.bikes.forEach(function(b){
      var opt=document.createElement("option");opt.value=b.id;opt.textContent=[b.year,b.make,b.model].filter(Boolean).join(" ")||"Unnamed bike";opt.style.background="#111";
      if(_bos.prefillId===b.id)opt.selected=true;
      pfSel.appendChild(opt);
    });
    data.sold.forEach(function(b){
      var opt=document.createElement("option");opt.value=b.id;opt.textContent="[SOLD] "+([b.year,b.make,b.model].filter(Boolean).join(" ")||"Unnamed");opt.style.background="#111";
      if(_bos.prefillId===b.id)opt.selected=true;
      pfSel.appendChild(opt);
    });
    pfSel.onchange=function(){if(pfSel.value){_bosPrefillBike(pfSel.value)}else{_bos.year="";_bos.make="";_bos.model="";_bos.vin="";_bos.color="";_bos.prefillId=null}R()};
    root.append(pfSel);
  }

  // ---- SELLER ----
  root.append(_bosSection("Seller Information",[
    _bosRow([_bosField("Name","seller.name",_bos.seller.name),_bosField("Phone","seller.phone",_bos.seller.phone)]),
    _bosField("Address","seller.address",_bos.seller.address),
    _bosRow([_bosField("City","seller.city",_bos.seller.city),_bosField("State","seller.state",_bos.seller.state,"60px"),_bosField("Zip","seller.zip",_bos.seller.zip,"80px")])
  ]));

  // ---- BUYER ----
  root.append(_bosSection("Buyer Information",[
    _bosRow([_bosField("Name","buyer.name",_bos.buyer.name),_bosField("Phone","buyer.phone",_bos.buyer.phone)]),
    _bosField("Address","buyer.address",_bos.buyer.address),
    _bosRow([_bosField("City","buyer.city",_bos.buyer.city),_bosField("State","buyer.state",_bos.buyer.state,"60px"),_bosField("Zip","buyer.zip",_bos.buyer.zip,"80px")])
  ]));

  // ---- DL PHOTO ----
  root.append(_bosDLSection());

  // ---- ITEM DESCRIPTION ----
  if(_bos.mode==="vehicle"){
    // Vehicle type selector
    var vtBar=h("div",{class:"f fw g4",style:{marginBottom:"8px"}});
    ["motorcycle","car","truck","van","trailer","boat","off-highway","snowmobile"].forEach(function(vt){
      var btn=h("button",{class:"chip"+(_bos.vehicleType===vt?" on":""),style:{color:_bos.vehicleType===vt?"#f59e0b":"",borderColor:_bos.vehicleType===vt?"#f59e0b":""},onclick:function(){_bos.vehicleType=vt;R()}},vt.charAt(0).toUpperCase()+vt.slice(1));
      vtBar.append(btn);
    });
    root.append(_bosSection("Vehicle Description",[
      vtBar,
      _bosRow([_bosField("Year","year",_bos.year,"80px"),_bosField("Make","make",_bos.make),_bosField("Model","model",_bos.model)]),
      _bosRow([_bosField("VIN","vin",_bos.vin),_bosField("Color","color",_bos.color,"100px")]),
      _bosRow([_bosField("License Plate","plate",_bos.plate),_bosCheckbox("Plate included in sale","plateIncluded",_bos.plateIncluded)])
    ]));
  }else if(_bos.mode==="firearm"){
    root.append(_bosSection("Firearm Description",[
      _bosRow([_bosField("Make","fMake",_bos.fMake),_bosField("Model","fModel",_bos.fModel)]),
      _bosRow([_bosField("Serial Number","fSerial",_bos.fSerial),_bosField("Caliber/Gauge","fCaliber",_bos.fCaliber)]),
      _bosRow([_bosField("Type (pistol/rifle/shotgun)","fType",_bos.fType),_bosField("Barrel Length","fBarrelLen",_bos.fBarrelLen,"100px")])
    ]));
  }else{
    var ta=document.createElement("textarea");ta.rows=3;ta.placeholder="Describe the item(s) being sold...";ta.value=_bos.itemDesc;
    ta.oninput=function(){_bos.itemDesc=ta.value};
    root.append(_bosSection("Item Description",[ta]));
  }

  // ---- SALE TERMS ----
  root.append(_bosSection("Sale Terms",[
    _bosRow([_bosField("Sale Price ($)","price",_bos.price,"120px"),_bos.mode==="vehicle"?_bosField("Trade-in ($)","tradeIn",_bos.tradeIn,"120px"):null,_bosField("Date","saleDate",_bos.saleDate,"140px","date")].filter(Boolean))
  ]));

  // ---- ODOMETER (vehicle only, not for boats/trailers/snowmobiles) ----
  if(_bos.mode==="vehicle"&&["motorcycle","car","truck","van"].indexOf(_bos.vehicleType)>-1){
    var odoBar=h("div",{class:"f g8",style:{marginTop:"4px"}});
    [["actual","Actual mileage"],["not_actual","Not actual"],["exceeds","Exceeds mechanical limit"]].forEach(function(o){
      var btn=h("button",{class:"chip"+(_bos.odoStatus===o[0]?" on":""),style:{color:_bos.odoStatus===o[0]?"#f59e0b":"",borderColor:_bos.odoStatus===o[0]?"#f59e0b":"",fontSize:"10px"},onclick:function(){_bos.odoStatus=o[0];R()}},o[1]);
      odoBar.append(btn);
    });
    root.append(_bosSection("Odometer Disclosure",[
      h("div",{style:{color:"#888",fontSize:"10px",marginBottom:"4px"}},"Federal & Utah law require odometer disclosure for vehicles under 20 years old"),
      _bosField("Odometer Reading","odoReading",_bos.odoReading,"160px"),
      odoBar
    ]));
  }

  // ---- TITLE STATUS (vehicle only) ----
  if(_bos.mode==="vehicle"){
    var tsBar=h("div",{class:"f g8",style:{marginTop:"4px"}});
    [["clean","Clean"],["salvage","Salvage"],["rebuilt","Rebuilt"]].forEach(function(t){
      var btn=h("button",{class:"chip"+(_bos.titleStatus===t[0]?" on":""),style:{color:_bos.titleStatus===t[0]?"#f59e0b":"",borderColor:_bos.titleStatus===t[0]?"#f59e0b":"",fontSize:"10px"},onclick:function(){_bos.titleStatus=t[0];R()}},t[1]);
      tsBar.append(btn);
    });
    root.append(_bosSection("Title & Lien Status",[
      tsBar,
      _bosField("Lien holder (if any)","lienHolder",_bos.lienHolder)
    ]));
  }

  // ---- BUYER ELIGIBILITY (firearm only) ----
  if(_bos.mode==="firearm"){
    root.append(_bosSection("Buyer Eligibility",[
      h("div",{style:{color:"#888",fontSize:"10px",marginBottom:"8px"}},"Buyer acknowledges they are legally eligible to purchase and possess a firearm under federal and state law."),
      _bosCheckbox("Buyer confirms eligibility","buyerEligible",_bos.buyerEligible)
    ]));
  }

  // ---- SIGNATURES ----
  root.append(_bosSigSection());

  // ---- GENERATE BUTTON ----
  var genBtn=h("button",{class:"bp",style:{width:"100%",marginTop:"8px",padding:"14px"},onclick:function(){_bosGeneratePDF()}});
  genBtn.innerHTML=I.dlFile+" Generate PDF";
  root.append(genBtn);

  // ---- RESET ----
  var rstBtn=h("button",{class:"bs",style:{width:"100%",justifyContent:"center"},onclick:function(){_bosReset();R()}});
  rstBtn.innerHTML=I.trash+" Clear Form";
  root.append(rstBtn);

  return root;
}

// ============ FORM HELPERS ============
function _bosSection(title,children){
  var sec=h("div",{class:"fc g8"});
  sec.append(h("div",{style:{color:"#f59e0b",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px"}},title));
  var card=h("div",{class:"fc g8",style:{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid #222",borderRadius:"10px"}});
  children.forEach(function(c){if(c)card.append(c)});
  sec.append(card);
  return sec;
}
function _bosRow(children){
  var row=h("div",{class:"f g8",style:{flexWrap:"wrap"}});
  children.forEach(function(c){if(c)row.append(c)});
  return row;
}
function _bosField(label,key,val,width,type){
  var wrap=h("div",{class:"fc g2",style:{flex:width?"0 0 "+width:"1",minWidth:"0"}});
  wrap.append(h("div",{style:{color:"#888",fontSize:"10px"}},label));
  var inp=document.createElement("input");inp.type=type||"text";inp.value=val||"";
  inp.style.cssText="width:100%;background:rgba(255,255,255,0.05);border:1px solid #333;border-radius:6px;color:#e5e5e5;padding:8px 10px;font-size:13px;font-family:var(--font)";
  inp.oninput=function(){_bosSetVal(key,inp.value)};
  wrap.append(inp);
  return wrap;
}
function _bosCheckbox(label,key,val){
  var wrap=h("div",{class:"f ac g8",style:{cursor:"pointer"},onclick:function(){_bosSetVal(key,!val);R()}});
  var ck=h("button",{class:"ck"+(val?" on":"")});
  if(val){ck.innerHTML=I.check}
  wrap.append(ck);
  wrap.append(h("div",{style:{fontSize:"12px",color:"#ccc"}},label));
  return wrap;
}
function _bosSetVal(key,val){
  var parts=key.split(".");
  if(parts.length===2){_bos[parts[0]][parts[1]]=val}
  else{_bos[parts[0]]=val}
}

// ============ DL PHOTO ============
function _bosDLSection(){
  var sec=h("div",{class:"fc g8"});
  var required=_bos.mode==="firearm";
  sec.append(h("div",{style:{color:"#f59e0b",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px"}},"Buyer's ID"+(required?" (Recommended)":"")));
  var card=h("div",{class:"fc g8",style:{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid #222",borderRadius:"10px"}});
  if(_bos.buyerDL){
    var img=document.createElement("img");img.src=_bos.buyerDL;
    img.style.cssText="width:100%;max-height:200px;object-fit:contain;border-radius:6px;border:1px solid #333";
    card.append(img);
    var rmBtn=h("button",{class:"bs",style:{justifyContent:"center"},onclick:function(){_bos.buyerDL=null;R()}});
    rmBtn.innerHTML=I.trash+" Remove";
    card.append(rmBtn);
  }else{
    var inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.capture="environment";
    inp.style.display="none";inp.id="bos-dl-input";
    inp.onchange=function(e){
      if(!e.target.files||!e.target.files[0])return;
      compressImg(e.target.files[0],800,function(dataUrl){_bos.buyerDL=dataUrl;R()});
    };
    var captureBtn=h("button",{class:"bg",style:{width:"100%",minHeight:"60px",flexDirection:"column",gap:"4px"},onclick:function(){inp.click()}});
    captureBtn.innerHTML=I.cam;
    captureBtn.append(h("div",{style:{fontSize:"11px"}},"Tap to capture driver's license"));
    card.append(inp);
    card.append(captureBtn);
  }
  sec.append(card);
  return sec;
}

// ============ SIGNATURE PAD ============
function _bosSigSection(){
  var sec=h("div",{class:"fc g8"});
  sec.append(h("div",{style:{color:"#f59e0b",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px"}},"Signatures"));
  var card=h("div",{class:"fc g12",style:{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid #222",borderRadius:"10px"}});

  // Seller sig
  card.append(_bosSigPad("Seller Signature","seller"));
  // Buyer sig
  card.append(_bosSigPad("Buyer Signature","buyer"));

  sec.append(card);
  return sec;
}

function _bosSigPad(label,who){
  var wrap=h("div",{class:"fc g6"});
  wrap.append(h("div",{style:{color:"#ccc",fontSize:"11px",fontWeight:"600"}},label));

  var sig=who==="seller"?_bos.sellerSig:_bos.buyerSig;
  var typed=who==="seller"?_bos.sellerSigTyped:_bos.buyerSigTyped;

  // Mode toggle
  var modeBar=h("div",{class:"f g4"});
  var drawBtn=h("button",{class:"chip"+(_bos.sigMode==="draw"?" on":""),style:{fontSize:"10px",color:_bos.sigMode==="draw"?"#22d3ee":"",borderColor:_bos.sigMode==="draw"?"#22d3ee":""},onclick:function(){_bos.sigMode="draw";R()}},"Draw");
  var typeBtn=h("button",{class:"chip"+(_bos.sigMode==="type"?" on":""),style:{fontSize:"10px",color:_bos.sigMode==="type"?"#22d3ee":"",borderColor:_bos.sigMode==="type"?"#22d3ee":""},onclick:function(){_bos.sigMode="type";R()}},"Type");
  modeBar.append(drawBtn);modeBar.append(typeBtn);
  wrap.append(modeBar);

  if(_bos.sigMode==="draw"){
    if(sig){
      var img=document.createElement("img");img.src=sig;
      img.style.cssText="width:100%;height:80px;object-fit:contain;background:#111;border-radius:6px;border:1px solid #333";
      wrap.append(img);
      var clrBtn=h("button",{class:"bs",style:{justifyContent:"center",fontSize:"10px"},onclick:function(){if(who==="seller")_bos.sellerSig=null;else _bos.buyerSig=null;R()}},"Clear");
      wrap.append(clrBtn);
    }else{
      var cvs=document.createElement("canvas");cvs.width=400;cvs.height=120;
      cvs.style.cssText="width:100%;height:100px;background:#111;border-radius:6px;border:1px solid #333;cursor:crosshair;touch-action:none";
      _bosInitCanvas(cvs,who);
      wrap.append(cvs);
      var saveBtn=h("button",{class:"bs",style:{justifyContent:"center",fontSize:"10px"},onclick:function(){
        var dataUrl=cvs.toDataURL("image/png");
        if(who==="seller")_bos.sellerSig=dataUrl;else _bos.buyerSig=dataUrl;
        R();
      }},"Save Signature");
      wrap.append(saveBtn);
    }
  }else{
    // Type-to-sign
    var inp=document.createElement("input");inp.type="text";inp.placeholder="Type full name...";inp.value=typed;
    inp.style.cssText="width:100%;background:#111;border:1px solid #333;border-radius:6px;color:#e5e5e5;padding:10px 12px;font-size:18px;font-family:'Segoe Script','Brush Script MT','Comic Sans MS',cursive;font-style:italic";
    inp.oninput=function(){
      if(who==="seller"){_bos.sellerSigTyped=inp.value}else{_bos.buyerSigTyped=inp.value}
      // Auto-generate signature image from typed text
      var c=document.createElement("canvas");c.width=400;c.height=120;
      var ctx=c.getContext("2d");ctx.fillStyle="#111";ctx.fillRect(0,0,400,120);
      ctx.font="italic 32px 'Segoe Script','Brush Script MT','Comic Sans MS',cursive";ctx.fillStyle="#e5e5e5";
      ctx.fillText(inp.value,20,75);
      // Underline
      ctx.strokeStyle="#555";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(20,90);ctx.lineTo(380,90);ctx.stroke();
      var dataUrl=c.toDataURL("image/png");
      if(who==="seller")_bos.sellerSig=dataUrl;else _bos.buyerSig=dataUrl;
    };
    wrap.append(inp);
    if(typed){
      wrap.append(h("div",{style:{fontSize:"9px",color:"#666",marginTop:"2px"}},"Preview: \""+typed+"\""));
    }
  }
  return wrap;
}

function _bosInitCanvas(cvs,who){
  var ctx=cvs.getContext("2d");
  var drawing=false,lastX=0,lastY=0;
  ctx.strokeStyle="#e5e5e5";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";
  // Signature line
  ctx.strokeStyle="#333";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(20,100);ctx.lineTo(380,100);ctx.stroke();
  ctx.strokeStyle="#e5e5e5";ctx.lineWidth=2;

  function getPos(e){
    var rect=cvs.getBoundingClientRect();
    var scaleX=cvs.width/rect.width,scaleY=cvs.height/rect.height;
    var touch=e.touches?e.touches[0]:e;
    return{x:(touch.clientX-rect.left)*scaleX,y:(touch.clientY-rect.top)*scaleY};
  }
  function start(e){e.preventDefault();drawing=true;var p=getPos(e);lastX=p.x;lastY=p.y}
  function move(e){if(!drawing)return;e.preventDefault();var p=getPos(e);ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(p.x,p.y);ctx.stroke();lastX=p.x;lastY=p.y}
  function end(){drawing=false}

  cvs.addEventListener("mousedown",start);cvs.addEventListener("mousemove",move);cvs.addEventListener("mouseup",end);cvs.addEventListener("mouseleave",end);
  cvs.addEventListener("touchstart",start,{passive:false});cvs.addEventListener("touchmove",move,{passive:false});cvs.addEventListener("touchend",end);
}

// ============ PDF GENERATION ============
function _bosGeneratePDF(){
  if(typeof jspdf==="undefined"&&typeof window.jspdf==="undefined"){flash("jsPDF not loaded");return}
  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({orientation:"portrait",unit:"mm",format:"letter"});
  var W=215.9,H=279.4;// letter size in mm
  var mg=15,y=mg,lh=5.5,col=mg;

  // Helper functions
  function bold(text,x,yy,sz){doc.setFont("helvetica","bold");doc.setFontSize(sz||11);doc.text(text,x,yy);doc.setFont("helvetica","normal")}
  function txt(text,x,yy,sz){doc.setFontSize(sz||10);doc.text(text,x,yy)}
  function line(y1){doc.setDrawColor(180);doc.setLineWidth(0.3);doc.line(mg,y1,W-mg,y1)}
  function field(label,value,x,yy,w){
    doc.setFontSize(8);doc.setTextColor(120);doc.text(label,x,yy);
    doc.setFontSize(10);doc.setTextColor(0);doc.text(S(value),x,yy+4.5);
    doc.setDrawColor(180);doc.setLineWidth(0.2);doc.line(x,yy+6,x+w,yy+6);
    return yy+10;
  }
  function checkbox(checked,x,yy,label){
    doc.setDrawColor(0);doc.setLineWidth(0.3);doc.rect(x,yy-3,3.5,3.5);
    if(checked){doc.setFont("helvetica","bold");doc.text("✓",x+0.5,yy);doc.setFont("helvetica","normal")}
    doc.setFontSize(9);doc.setTextColor(0);doc.text(label,x+5.5,yy);
  }

  doc.setTextColor(0);

  // ---- HEADER ----
  doc.setFontSize(16);doc.setFont("helvetica","bold");
  var title=_bos.mode==="vehicle"?"BILL OF SALE — MOTOR VEHICLE":_bos.mode==="firearm"?"BILL OF SALE — FIREARM":"BILL OF SALE";
  doc.text(title,W/2,y,{align:"center"});
  y+=5;
  if(_bos.mode==="vehicle"){
    doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(100);
    doc.text("Utah Code Title 41 · Modeled after Form TC-843",W/2,y,{align:"center"});
    y+=2;
  }
  doc.setTextColor(0);doc.setFont("helvetica","normal");
  y+=3;line(y);y+=6;

  // ---- SELLER ----
  bold("SELLER",mg,y);y+=5;
  var halfW=(W-mg*2-10)/2;
  y=field("Full Legal Name",_bos.seller.name,mg,y,halfW);
  y-=10;y=field("Phone",_bos.seller.phone,mg+halfW+10,y,halfW);
  y=field("Address",_bos.seller.address,mg,y,W-mg*2);
  var thirdW=(W-mg*2-20)/3;
  y=field("City",_bos.seller.city,mg,y,thirdW);
  y-=10;y=field("State",_bos.seller.state,mg+thirdW+10,y,30);
  y-=10;y=field("Zip",_bos.seller.zip,mg+thirdW+50,y,40);
  y+=2;line(y);y+=6;

  // ---- BUYER ----
  bold("BUYER",mg,y);y+=5;
  y=field("Full Legal Name",_bos.buyer.name,mg,y,halfW);
  y-=10;y=field("Phone",_bos.buyer.phone,mg+halfW+10,y,halfW);
  y=field("Address",_bos.buyer.address,mg,y,W-mg*2);
  y=field("City",_bos.buyer.city,mg,y,thirdW);
  y-=10;y=field("State",_bos.buyer.state,mg+thirdW+10,y,30);
  y-=10;y=field("Zip",_bos.buyer.zip,mg+thirdW+50,y,40);
  y+=2;line(y);y+=6;

  // ---- ITEM DESCRIPTION ----
  if(_bos.mode==="vehicle"){
    bold("VEHICLE DESCRIPTION",mg,y);y+=5;
    txt("Type: "+_bos.vehicleType.charAt(0).toUpperCase()+_bos.vehicleType.slice(1),mg,y);y+=5;
    y=field("Year",_bos.year,mg,y,25);
    y-=10;y=field("Make",_bos.make,mg+35,y,50);
    y-=10;y=field("Model",_bos.model,mg+95,y,50);
    y-=10;y=field("Color",_bos.color,mg+155,y,30);
    y=field("Vehicle Identification Number (VIN)",_bos.vin,mg,y,120);
    y-=10;y=field("License Plate",_bos.plate,mg+130,y,55);
    checkbox(_bos.plateIncluded,mg,y,"Plate included in sale");
    checkbox(!_bos.plateIncluded,mg+60,y,"Plate NOT included");
    y+=6;
  }else if(_bos.mode==="firearm"){
    bold("FIREARM DESCRIPTION",mg,y);y+=5;
    y=field("Make",_bos.fMake,mg,y,halfW);
    y-=10;y=field("Model",_bos.fModel,mg+halfW+10,y,halfW);
    y=field("Serial Number",_bos.fSerial,mg,y,80);
    y-=10;y=field("Caliber/Gauge",_bos.fCaliber,mg+90,y,50);
    y=field("Type",_bos.fType,mg,y,60);
    y-=10;y=field("Barrel Length",_bos.fBarrelLen,mg+70,y,40);
    y+=2;
  }else{
    bold("ITEM DESCRIPTION",mg,y);y+=5;
    var lines=doc.splitTextToSize(_bos.itemDesc||"(none)",W-mg*2);
    doc.setFontSize(10);lines.forEach(function(ln){doc.text(ln,mg,y);y+=lh});
    y+=3;
  }
  line(y);y+=6;

  // ---- SALE TERMS ----
  bold("SALE TERMS",mg,y);y+=5;
  y=field("Purchase Price","$"+S(_bos.price),mg,y,60);
  y-=10;
  if(_bos.mode==="vehicle"&&_bos.tradeIn){
    y=field("Trade-in Allowance","$"+S(_bos.tradeIn),mg+70,y,50);
    y-=10;
    var net=parseFloat(_bos.price||0)-parseFloat(_bos.tradeIn||0);
    y=field("Net Purchase Price","$"+net.toFixed(2),mg+130,y,55);
  }else{y+=10}
  y-=10;y=field("Date of Sale",_bos.saleDate,W-mg-50,y,50);
  y+=2;

  // As-is clause
  doc.setFontSize(8);doc.setTextColor(60);
  var asIs="The Seller hereby sells and transfers the above described "
    +(_bos.mode==="vehicle"?"vehicle":_bos.mode==="firearm"?"firearm":"item(s)")
    +" to the Buyer \"AS IS\" with no warranties, express or implied. The Seller certifies that the "
    +(_bos.mode==="vehicle"?"vehicle":"item")
    +" is sold free and clear of all lawful claims, debts, and demands"
    +(_bos.lienHolder?" except lien held by: "+_bos.lienHolder:"")
    +".";
  var asLines=doc.splitTextToSize(asIs,W-mg*2);
  asLines.forEach(function(ln){doc.text(ln,mg,y);y+=3.5});
  doc.setTextColor(0);
  y+=3;line(y);y+=6;

  // ---- ODOMETER (vehicle only) ----
  if(_bos.mode==="vehicle"&&["motorcycle","car","truck","van"].indexOf(_bos.vehicleType)>-1){
    bold("ODOMETER DISCLOSURE",mg,y);y+=3;
    doc.setFontSize(7);doc.setTextColor(100);
    doc.text("Federal law (49 CFR 580) and Utah Code 41-1a-902 require odometer disclosure for vehicles under 20 years old.",mg,y);
    doc.setTextColor(0);y+=5;
    y=field("Odometer Reading",_bos.odoReading+" miles",mg,y,80);y-=2;
    checkbox(_bos.odoStatus==="actual",mg,y,"Actual mileage");
    checkbox(_bos.odoStatus==="not_actual",mg+45,y,"NOT actual mileage (warning: odometer discrepancy)");
    y+=5;
    checkbox(_bos.odoStatus==="exceeds",mg,y,"Mileage exceeds mechanical odometer limit");
    y+=5;line(y);y+=6;
  }

  // ---- TITLE STATUS (vehicle only) ----
  if(_bos.mode==="vehicle"){
    bold("TITLE STATUS",mg,y);y+=5;
    checkbox(_bos.titleStatus==="clean",mg,y,"Clean title");
    checkbox(_bos.titleStatus==="salvage",mg+35,y,"Salvage title");
    checkbox(_bos.titleStatus==="rebuilt",mg+75,y,"Rebuilt title");
    y+=5;
    if(_bos.lienHolder){txt("Existing lien held by: "+_bos.lienHolder,mg,y);y+=5}
    y+=2;line(y);y+=6;
  }

  // ---- BUYER ELIGIBILITY (firearm only) ----
  if(_bos.mode==="firearm"){
    bold("BUYER ELIGIBILITY ACKNOWLEDGMENT",mg,y);y+=5;
    checkbox(_bos.buyerEligible,mg,y,"Buyer certifies they are legally eligible to purchase and possess");
    y+=4;
    checkbox(_bos.buyerEligible,mg,y,"a firearm under all applicable federal and state laws.");
    y+=5;line(y);y+=6;
  }

  // ---- SIGNATURES ----
  // Check if we need a new page
  if(y>H-70){doc.addPage();y=mg}

  bold("SIGNATURES",mg,y);y+=3;
  doc.setFontSize(8);doc.setTextColor(100);
  doc.text("By signing below, both parties agree to the terms of this bill of sale.",mg,y);
  doc.setTextColor(0);y+=6;

  // Seller signature
  txt("Seller Signature:",mg,y);y+=2;
  if(_bos.sellerSig){
    try{doc.addImage(_bos.sellerSig,"PNG",mg,y,70,20)}catch(e){}
  }
  doc.setDrawColor(0);doc.setLineWidth(0.3);doc.line(mg,y+22,mg+85,y+22);
  txt("Date: "+_bos.saleDate,mg+90,y+20);doc.line(mg+90,y+22,mg+140,y+22);
  txt("Print Name: "+_bos.seller.name,mg,y+28);doc.line(mg,y+30,mg+85,y+30);
  y+=36;

  // Buyer signature
  txt("Buyer Signature:",mg,y);y+=2;
  if(_bos.buyerSig){
    try{doc.addImage(_bos.buyerSig,"PNG",mg,y,70,20)}catch(e){}
  }
  doc.line(mg,y+22,mg+85,y+22);
  txt("Date: "+_bos.saleDate,mg+90,y+20);doc.line(mg+90,y+22,mg+140,y+22);
  txt("Print Name: "+_bos.buyer.name,mg,y+28);doc.line(mg,y+30,mg+85,y+30);
  y+=36;

  // ---- BUYER DL PHOTO (new page if needed) ----
  if(_bos.buyerDL){
    if(y>H-80){doc.addPage();y=mg}
    bold("BUYER IDENTIFICATION (for seller's records)",mg,y);y+=6;
    try{doc.addImage(_bos.buyerDL,"JPEG",mg,y,80,50)}catch(e){txt("(DL image could not be embedded)",mg,y)}
    y+=55;
  }

  // ---- SAVE PDF ----
  var fn="bill-of-sale-"+_bos.saleDate+".pdf";
  doc.save(fn);
  flash("PDF saved: "+fn);
}
