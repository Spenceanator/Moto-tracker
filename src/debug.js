// ============ ON-SCREEN DEBUG CONSOLE ============
// Triple-tap nav bar to toggle. Works on iOS without Safari dev tools.
// Intercepts console.log/warn/error and stores in a ring buffer.

var _dbgLogs=[];
var _dbgMax=500;
var _dbgOpen=false;
var _dbgEl=null;
var _dbgFilter="all";// all|error|warn|tf

// Intercept console methods
var _origLog=console.log,_origWarn=console.warn,_origErr=console.error;
function _dbgPush(level,args){
  var text=Array.prototype.slice.call(args).map(function(a){
    if(a===null)return"null";if(a===undefined)return"undefined";
    if(typeof a==="object"){try{return JSON.stringify(a).slice(0,300)}catch(e){return String(a)}}
    return String(a);
  }).join(" ");
  _dbgLogs.push({ts:Date.now(),level:level,text:text});
  if(_dbgLogs.length>_dbgMax)_dbgLogs=_dbgLogs.slice(-_dbgMax);
  if(_dbgOpen)_dbgRender();
}
console.log=function(){_dbgPush("log",arguments);_origLog.apply(console,arguments)};
console.warn=function(){_dbgPush("warn",arguments);_origWarn.apply(console,arguments)};
console.error=function(){_dbgPush("error",arguments);_origErr.apply(console,arguments)};

// Also capture unhandled errors
window.addEventListener("error",function(e){
  _dbgPush("error",["Uncaught: "+e.message+" at "+e.filename+":"+e.lineno]);
});
window.addEventListener("unhandledrejection",function(e){
  _dbgPush("error",["Unhandled rejection: "+(e.reason?e.reason.message||e.reason:"unknown")]);
});

// Triple-tap nav bar to toggle
(function(){
  var taps=0,tapTimer=null;
  document.addEventListener("click",function(e){
    var nav=document.getElementById("site-nav");
    if(!nav||!nav.contains(e.target))return;
    taps++;
    if(tapTimer)clearTimeout(tapTimer);
    tapTimer=setTimeout(function(){taps=0},500);
    if(taps>=3){taps=0;_dbgToggle()}
  });
})();

function _dbgToggle(){
  _dbgOpen=!_dbgOpen;
  if(_dbgOpen){_dbgCreate();_dbgRender()}
  else if(_dbgEl){_dbgEl.remove();_dbgEl=null}
}

function _dbgCreate(){
  if(_dbgEl)_dbgEl.remove();
  var el=document.createElement("div");
  el.id="dbg-console";
  el.style.cssText="position:fixed;bottom:0;left:0;right:0;height:45vh;background:#0c0c0c;border-top:2px solid #f59e0b;z-index:99999;display:flex;flex-direction:column;font-family:'JetBrains Mono','Fira Code',monospace;font-size:10px";
  // Toolbar
  var tb=document.createElement("div");
  tb.style.cssText="display:flex;align-items:center;gap:4px;padding:4px 8px;background:#111;border-bottom:1px solid #222;flex-shrink:0";
  // Filter buttons
  ["all","error","warn","tf"].forEach(function(f){
    var btn=document.createElement("button");
    btn.textContent=f==="tf"?"[TF]":f.toUpperCase();
    btn.style.cssText="padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600;font-family:inherit;cursor:pointer;border:1px solid "+(_dbgFilter===f?"#f59e0b":"#333")+";background:"+(_dbgFilter===f?"rgba(245,158,11,0.15)":"transparent")+";color:"+(_dbgFilter===f?"#f59e0b":"#666");
    btn.onclick=function(){_dbgFilter=f;_dbgRender()};
    tb.appendChild(btn);
  });
  // Spacer
  var sp=document.createElement("div");sp.style.flex="1";tb.appendChild(sp);
  // Copy button
  var cpBtn=document.createElement("button");cpBtn.textContent="COPY";
  cpBtn.style.cssText="padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600;font-family:inherit;cursor:pointer;border:1px solid #333;background:transparent;color:#22d3ee";
  cpBtn.onclick=function(){
    var filtered=_dbgFiltered();
    var text=filtered.map(function(l){
      var d=new Date(l.ts);
      return("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2)+"."+("00"+d.getMilliseconds()).slice(-3)+" ["+l.level+"] "+l.text;
    }).join("\n");
    navigator.clipboard.writeText(text).then(function(){cpBtn.textContent="COPIED";setTimeout(function(){cpBtn.textContent="COPY"},1500)});
  };
  tb.appendChild(cpBtn);
  // Clear button
  var clBtn=document.createElement("button");clBtn.textContent="CLEAR";
  clBtn.style.cssText="padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600;font-family:inherit;cursor:pointer;border:1px solid #333;background:transparent;color:#888";
  clBtn.onclick=function(){_dbgLogs=[];_dbgRender()};
  tb.appendChild(clBtn);
  // Close button
  var xBtn=document.createElement("button");xBtn.textContent="×";
  xBtn.style.cssText="padding:2px 6px;font-size:14px;font-family:inherit;cursor:pointer;border:none;background:transparent;color:#555";
  xBtn.onclick=function(){_dbgToggle()};
  tb.appendChild(xBtn);
  el.appendChild(tb);
  // Log container
  var lc=document.createElement("div");
  lc.id="dbg-log-container";
  lc.style.cssText="flex:1;overflow-y:auto;padding:4px 8px;-webkit-overflow-scrolling:touch";
  el.appendChild(lc);
  document.body.appendChild(el);
  _dbgEl=el;
}

function _dbgFiltered(){
  if(_dbgFilter==="all")return _dbgLogs;
  if(_dbgFilter==="tf")return _dbgLogs.filter(function(l){return l.text.indexOf("[TF]")>-1});
  return _dbgLogs.filter(function(l){return l.level===_dbgFilter});
}

function _dbgRender(){
  var lc=document.getElementById("dbg-log-container");
  if(!lc)return;
  var wasAtBottom=lc.scrollHeight-lc.scrollTop-lc.clientHeight<30;
  var filtered=_dbgFiltered();
  // Only re-render if count changed
  if(lc.childNodes.length===filtered.length)return;
  lc.innerHTML="";
  var colors={log:"#888",warn:"#f59e0b",error:"#ef4444"};
  filtered.forEach(function(l){
    var row=document.createElement("div");
    row.style.cssText="padding:1px 0;border-bottom:1px solid #1a1a1a;word-break:break-all;line-height:1.4;color:"+((colors[l.level])||"#888");
    var d=new Date(l.ts);
    var ts=("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2);
    row.textContent=ts+" "+l.text;
    lc.appendChild(row);
  });
  if(wasAtBottom)lc.scrollTop=lc.scrollHeight;
  // Update filter button styles
  if(_dbgEl){
    var btns=_dbgEl.querySelectorAll("button");
    ["all","error","warn","tf"].forEach(function(f,i){
      if(btns[i]){
        btns[i].style.borderColor=_dbgFilter===f?"#f59e0b":"#333";
        btns[i].style.background=_dbgFilter===f?"rgba(245,158,11,0.15)":"transparent";
        btns[i].style.color=_dbgFilter===f?"#f59e0b":"#666";
      }
    });
  }
}
