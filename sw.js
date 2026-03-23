var CACHE="drydock-v1";
self.addEventListener("install",function(e){self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(self.clients.claim())});

// Background poll for chat and intake
var SB_URL="https://pcojcgvwstwgrbjtfbni.supabase.co";
var SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb2pjZ3Z3c3R3Z3JianRmYm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzEwNTksImV4cCI6MjA4ODk0NzA1OX0.0R54Z5cXeQrMzFCQ-r6ybuN8T3fsNZOfEvG4Hqwc9mI";

self.addEventListener("message",function(e){
  if(e.data&&e.data.type==="POLL_CONFIG"){
    self._tokens=e.data.tokens||[];
    self._auth=e.data.auth||null;
    self._lastChatCheck=e.data.lastChatCheck||0;
    self._lastIntakeCount=e.data.intakeCount||0;
  }
});

// Periodic sync (if supported)
self.addEventListener("periodicsync",function(e){
  if(e.tag==="drydock-poll"){
    e.waitUntil(bgPoll());
  }
});

// Also poll on push (for manual trigger)
self.addEventListener("push",function(e){
  var payload=e.data?e.data.text():"New update";
  e.waitUntil(self.registration.showNotification("Drydock",{body:payload,icon:"/Moto-tracker/icon-192.png",tag:"drydock",renotify:true}));
});

self.addEventListener("notificationclick",function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window"}).then(function(clients){
    if(clients.length>0){clients[0].focus();return}
    return self.clients.openWindow("/Moto-tracker/app.html");
  }));
});

function bgPoll(){
  if(!self._tokens||!self._tokens.length)return Promise.resolve();
  var headers={"apikey":SB_KEY,"Content-Type":"application/json"};
  if(self._auth)headers["Authorization"]="Bearer "+self._auth;
  var tokenFilter=self._tokens.map(function(t){return"token.eq."+t}).join(",");
  return fetch(SB_URL+"/rest/v1/job_chat?or=("+tokenFilter+")&sender=eq.customer&order=created_at.desc&limit=5",{headers:headers})
  .then(function(r){return r.json()}).then(function(msgs){
    if(msgs&&msgs.length>0){
      var newest=new Date(msgs[0].created_at).getTime();
      if(newest>self._lastChatCheck){
        self._lastChatCheck=newest;
        return self.registration.showNotification("Drydock Message",{
          body:"New customer message",
          tag:"drydock-chat",
          renotify:true
        });
      }
    }
  }).catch(function(){});
}