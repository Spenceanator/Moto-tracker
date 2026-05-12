var _rPending=false;
function _inputFocused(){var el=document.activeElement;return el&&(el.tagName==="INPUT"||el.tagName==="TEXTAREA"||el.tagName==="SELECT"||el.isContentEditable)}
function R(force){
  if(!force&&_inputFocused()){_rPending=true;return}
  _rPending=false;
  var app=document.getElementById("app");app.innerHTML="";var wrap=h("div",{style:{paddingTop:"16px",paddingBottom:"40px"}});
  if(cv==="home")wrap.append(rHome());else if(cv==="settings")wrap.append(rSettings());else if(cv==="bike")wrap.append(rBikeView());else if(cv==="lead")wrap.append(rLeadView());else if(cv==="job")wrap.append(rJobView());else if(cv==="client")wrap.append(rClientView());else if(cv==="transfer")wrap.append(rTransferView());
  app.append(wrap);renderNotifBell()}
document.addEventListener("focusout",function(){if(_rPending)setTimeout(function(){if(_rPending&&!_inputFocused())R()},50)});
R();renderNav();syncPull(function(){R();startPoll();fetchIntake(function(){R()})});
// Join transfer presence channel
try{tfJoinChannel()}catch(e){console.warn("Transfer channel init:",e)}
window.addEventListener("beforeunload",function(){try{tfLeaveChannel()}catch(e){}});
document.addEventListener("visibilitychange",function(){if(!document.hidden){pollCheck();startPoll();fetchIntake(function(){R()})}});
// Poll intake every 30s
setInterval(function(){fetchIntake(function(){R()})},30000);
// Poll chats every 20s
setInterval(function(){pollAllChats()},20000);
// Initial chat poll
setTimeout(function(){pollAllChats()},2000);
// Register service worker for PWA + background notifications
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").then(function(reg){
    // Push token config to SW for background polling
    function pushSWConfig(){
      if(!reg.active)return;
      var tokens=data.jobs.filter(function(j){return j.shareToken&&j.status!=="delivered"}).map(function(j){return j.shareToken});
      var auth=getAuth();
      reg.active.postMessage({type:"POLL_CONFIG",tokens:tokens,auth:auth?auth.access_token:"",lastChatCheck:Date.now(),intakeCount:_intakeItems.length});
    }
    if(reg.active)pushSWConfig();
    reg.addEventListener("updatefound",function(){reg.installing.addEventListener("statechange",function(){if(this.state==="activated")pushSWConfig()})});
    // Update SW config periodically
    setInterval(pushSWConfig,60000);
    // Register periodic sync if available
    if("periodicSync" in reg){reg.periodicSync.register("drydock-poll",{minInterval:5*60*1000}).catch(function(){})}
  }).catch(function(e){console.log("SW registration failed:",e)});
}
