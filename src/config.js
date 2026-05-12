var SB_URL="https://pcojcgvwstwgrbjtfbni.supabase.co";
var SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb2pjZ3Z3c3R3Z3JianRmYm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzEwNTksImV4cCI6MjA4ODk0NzA1OX0.0R54Z5cXeQrMzFCQ-r6ybuN8T3fsNZOfEvG4Hqwc9mI";
var AUTH_SK="drydock_auth";
function getAuth(){try{var s=JSON.parse(localStorage.getItem(AUTH_SK));if(s&&s.access_token&&s.expires_at>Date.now()/1000)return s}catch(e){}return null}
function refreshAuth(){
  try{var s=JSON.parse(localStorage.getItem(AUTH_SK));if(!s||!s.refresh_token)return Promise.resolve(null);
    return fetch(SB_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":SB_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:s.refresh_token})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.access_token){var sess={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:d.expires_at||Math.floor(Date.now()/1000)+3600,email:s.email};localStorage.setItem(AUTH_SK,JSON.stringify(sess));return sess}return null
    }).catch(function(){return null})
  }catch(e){return Promise.resolve(null)}
}
function ensureAuth(cb){var a=getAuth();if(a){cb(a);return}refreshAuth().then(function(s){if(s){cb(s)}else{window.location.href="index.html"}})}
function sbHeaders(){var a=getAuth();return{"apikey":SB_KEY,"Authorization":"Bearer "+(a?a.access_token:SB_KEY),"Content-Type":"application/json"}}
// Auth gate - try refresh before redirecting
(function(){var s=getAuth();if(s)return;try{var raw=JSON.parse(localStorage.getItem(AUTH_SK));if(raw&&raw.refresh_token){refreshAuth().then(function(r){if(!r)window.location.href="index.html"});return}}catch(e){}window.location.href="index.html"})();
// Auto-refresh every 45 minutes
setInterval(function(){refreshAuth()},45*60*1000);

// ============ ROLES & NAV ============
var ROLE_MAP={"owner":true};
var PAGES={owner:["app","workspace"],employee:["app","workspace"],customer:["intake"]};
function getRole(){var a=getAuth();if(!a)return null;return"owner"}
function canAccess(page){var r=getRole();if(!r)return false;return(PAGES[r]||[]).indexOf(page)>=0}
function renderNav(){
  var nav=document.getElementById("site-nav");if(!nav)return;
  var a=getAuth();nav.innerHTML="";
  var links=[{page:"app",label:"Drydock",href:"app.html"},{page:"workspace",label:"Workspace",href:"workspace.html"}];
  var tfBtn=document.createElement("button");tfBtn.textContent="Transfer";
  tfBtn.style.cssText="color:"+(cv==="transfer"?"#f59e0b":"#666")+";font-size:13px;background:none;border:none;cursor:pointer;padding:8px 12px;border-radius:6px;font-family:var(--font);transition:color .15s;white-space:nowrap;-webkit-tap-highlight-color:transparent";
  tfBtn.onclick=function(){cv="transfer";selBike=null;selLead=null;selJob=null;selClient=null;R()};
  links.forEach(function(l){
    if(!canAccess(l.page))return;
    var isCur=l.page==="app";
    var el=document.createElement("a");el.href=l.href;el.textContent=l.label;
    el.style.cssText="color:"+(isCur?"#f59e0b":"#666")+";font-size:13px;text-decoration:none;padding:8px 12px;border-radius:6px;font-family:var(--font);transition:color .15s;white-space:nowrap;-webkit-tap-highlight-color:transparent";
    nav.appendChild(el);
  });
  nav.appendChild(tfBtn);
  if(a){
    var out=document.createElement("button");out.textContent="×";out.style.cssText="color:#444;font-size:16px;background:none;border:none;cursor:pointer;padding:8px 12px;font-family:var(--font);margin-left:auto;-webkit-tap-highlight-color:transparent";out.title="Sign out";out.onclick=function(){localStorage.removeItem(AUTH_SK);window.location.href="index.html"};nav.appendChild(out);
  }
}
