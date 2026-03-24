var CACHE="drydock-v1";
self.addEventListener("install",function(e){self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(self.clients.claim())});

// Handle push notifications from server
self.addEventListener("push",function(e){
  var data={title:"Drydock",body:"New update",tag:"drydock"};
  if(e.data){
    try{data=e.data.json()}catch(err){data.body=e.data.text()}
  }
  e.waitUntil(
      self.registration.showNotification(data.title||"Drydock",{
        body:data.body||"",
        icon:"/Moto-tracker/icon-192.png",
        badge:"/Moto-tracker/icon-192.png",
        tag:data.tag||"drydock",
        renotify:true,
        data:data.data||{}
      })
  );
});

// Click notification to open app
self.addEventListener("notificationclick",function(e){
  e.notification.close();
  e.waitUntil(
      self.clients.matchAll({type:"window"}).then(function(clients){
        // Focus existing window if open
        for(var i=0;i<clients.length;i++){
          if(clients[i].url.indexOf("/Moto-tracker/")>-1){
            clients[i].focus();
            clients[i].postMessage({type:"NOTIFICATION_CLICK",data:e.notification.data});
            return;
          }
        }
        // Otherwise open new window
        return self.clients.openWindow("/Moto-tracker/app.html");
      })
  );
});