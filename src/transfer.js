// ============ P2P FILE TRANSFER ============
// Device identity, Supabase Realtime presence/signaling, WebRTC DataChannel,
// chunked transfer with ack, resume, wake lock, retry

// --- Constants (also in config.js) ---
var CHUNK_SIZE=65536;
var TRANSFER_CHANNEL="drydock-transfer";
var CHUNK_TIMEOUT=5000;
var MAX_CHUNK_RETRIES=3;
var RECONNECT_DELAYS=[2000,4000,8000,16000];
var RTC_CONFIG={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]};

// --- Device Identity ---
function getDeviceId(){
  var id=localStorage.getItem("drydock_device_id");
  if(!id){id=crypto.randomUUID();localStorage.setItem("drydock_device_id",id)}
  return id;
}
function getDeviceName(){
  var stored=localStorage.getItem("drydock_device_name");
  if(stored)return stored;
  var ua=navigator.userAgent;
  var browser="Browser";
  if(ua.indexOf("Chrome")>-1&&ua.indexOf("Edg")===-1)browser="Chrome";
  else if(ua.indexOf("Edg")>-1)browser="Edge";
  else if(ua.indexOf("Safari")>-1&&ua.indexOf("Chrome")===-1)browser="Safari";
  else if(ua.indexOf("Firefox")>-1)browser="Firefox";
  var platform="Unknown";
  if(ua.indexOf("iPhone")>-1)platform="iPhone";
  else if(ua.indexOf("iPad")>-1)platform="iPad";
  else if(ua.indexOf("Android")>-1)platform="Android";
  else if(ua.indexOf("Windows")>-1)platform="Windows";
  else if(ua.indexOf("Mac")>-1)platform="Mac";
  else if(ua.indexOf("Linux")>-1)platform="Linux";
  return platform+" - "+browser;
}
function getDeviceType(){
  return /Mobile|iPhone|iPad|Android/i.test(navigator.userAgent)?"mobile":"desktop";
}

// --- Transfer State ---
var _tfChannel=null;
var _tfPeers={};// {device_id: {device_id, device_name, device_type, available, timestamp}}
var _tfPC=null;// RTCPeerConnection
var _tfDC=null;// DataChannel
var _tfSending=false;
var _tfReceiving=false;
var _tfSendQueue=[];// [{file:File, name, size, type}]
var _tfSendState={fileIndex:0,chunkIndex:0,totalChunks:0,bytesSent:0,totalBytes:0,retries:0,ackTimer:null};
var _tfRecvState={fileIndex:0,chunkIndex:0,chunks:[],files:[],manifest:null,bytesReceived:0,totalBytes:0,lastMeta:null};
var _tfPeerDeviceId=null;
var _tfReconnectAttempt=0;
var _tfWakeLock=null;
var _tfIncomingReq=null;// pending transfer request from peer
var _tfHistory=[];// [{ts, direction, fileCount, totalBytes, status, peerName}]
try{_tfHistory=JSON.parse(localStorage.getItem("drydock_transfer_history"))||[]}catch(e){}

// --- Supabase Realtime Presence ---
function tfJoinChannel(){
  var auth=getAuth();if(!auth)return;
  // Use Supabase Realtime via WebSocket
  var userId=auth.email||"unknown";
  var channelName="transfer:"+userId;
  // Build Realtime URL
  var wsUrl=SB_URL.replace("https://","wss://").replace("http://","ws://")+"/realtime/v1/websocket?apikey="+SB_KEY+"&vsn=1.0.0";

  if(_tfChannel){tfLeaveChannel()}

  var deviceId=getDeviceId();
  var deviceName=getDeviceName();
  var deviceType=getDeviceType();

  // Use Supabase JS client pattern via REST-based channel simulation
  // Since we don't have the Supabase JS SDK, we'll use a lightweight WebSocket approach
  var ws=new WebSocket(wsUrl);
  var heartbeatRef=0;
  var heartbeatTimer=null;
  var joinRef="1";
  var channelTopic="realtime:"+channelName;

  ws.onopen=function(){
    // Join channel
    ws.send(JSON.stringify({topic:channelTopic,event:"phx_join",payload:{config:{presence:{key:deviceId},broadcast:{self:false}}},ref:joinRef}));
    // Start heartbeat
    heartbeatTimer=setInterval(function(){
      heartbeatRef++;
      ws.send(JSON.stringify({topic:"phoenix",event:"heartbeat",payload:{},ref:String(heartbeatRef)}));
    },30000);
    // Track presence
    setTimeout(function(){
      _tfPresenceTrack(ws,channelTopic,deviceId,deviceName,deviceType);
    },500);
  };

  ws.onmessage=function(evt){
    try{
      var msg=JSON.parse(evt.data);
      if(msg.topic===channelTopic){
        if(msg.event==="presence_state"){
          // Initial presence state - populate peers
          _tfHandlePresenceState(msg.payload);
        }else if(msg.event==="presence_diff"){
          // Presence changes
          _tfHandlePresenceDiff(msg.payload);
        }else if(msg.event==="broadcast"){
          // Signaling messages
          var p=msg.payload;
          if(p.to&&p.to!==deviceId)return;// not for us
          _tfHandleBroadcast(p);
        }
      }
    }catch(e){console.error("WS message error:",e)}
  };

  ws.onclose=function(){
    if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}
    // Reconnect after a delay if we should still be connected
    if(_tfChannel){
      setTimeout(function(){if(_tfChannel)tfJoinChannel()},3000);
    }
  };

  ws.onerror=function(e){console.error("WS error:",e)};

  _tfChannel={ws:ws,topic:channelTopic,deviceId:deviceId,deviceName:deviceName};
}

function _tfPresenceTrack(ws,topic,deviceId,deviceName,deviceType){
  if(ws.readyState!==1)return;
  ws.send(JSON.stringify({
    topic:topic,
    event:"presence",
    payload:{type:"presence",event:"track",payload:{
      device_id:deviceId,
      device_name:deviceName,
      device_type:deviceType,
      available:true,
      timestamp:Date.now()
    }},
    ref:String(Date.now())
  }));
}

function _tfHandlePresenceState(state){
  _tfPeers={};
  Object.keys(state).forEach(function(key){
    var metas=state[key].metas||state[key];
    if(Array.isArray(metas)){
      metas.forEach(function(m){
        if(m.device_id&&m.device_id!==getDeviceId()){
          _tfPeers[m.device_id]=m;
        }
      });
    }else if(metas.device_id&&metas.device_id!==getDeviceId()){
      _tfPeers[metas.device_id]=metas;
    }
  });
  if(cv==="transfer")R();
}

function _tfHandlePresenceDiff(diff){
  if(diff.joins){
    Object.keys(diff.joins).forEach(function(key){
      var metas=(diff.joins[key].metas||diff.joins[key]);
      if(Array.isArray(metas)){
        metas.forEach(function(m){
          if(m.device_id&&m.device_id!==getDeviceId())_tfPeers[m.device_id]=m;
        });
      }else if(metas.device_id&&metas.device_id!==getDeviceId()){
        _tfPeers[metas.device_id]=metas;
      }
    });
  }
  if(diff.leaves){
    Object.keys(diff.leaves).forEach(function(key){
      var metas=(diff.leaves[key].metas||diff.leaves[key]);
      if(Array.isArray(metas)){
        metas.forEach(function(m){if(m.device_id)delete _tfPeers[m.device_id]});
      }else if(metas.device_id){delete _tfPeers[metas.device_id]}
    });
  }
  if(cv==="transfer")R();
}

function tfLeaveChannel(){
  if(_tfChannel&&_tfChannel.ws){
    try{_tfChannel.ws.close()}catch(e){}
  }
  _tfChannel=null;
  _tfPeers={};
}

function tfBroadcast(eventType,payload){
  if(!_tfChannel||!_tfChannel.ws||_tfChannel.ws.readyState!==1)return;
  var msg={
    topic:_tfChannel.topic,
    event:"broadcast",
    payload:Object.assign({event:eventType,from:getDeviceId(),fromName:getDeviceName()},payload),
    ref:String(Date.now())
  };
  _tfChannel.ws.send(JSON.stringify(msg));
}

// --- Broadcast Handler ---
function _tfHandleBroadcast(payload){
  var evt=payload.event;
  if(evt==="offer")_tfHandleOffer(payload);
  else if(evt==="answer")_tfHandleAnswer(payload);
  else if(evt==="ice")_tfHandleIce(payload);
  else if(evt==="transfer-req")_tfHandleTransferReq(payload);
  else if(evt==="transfer-ack")_tfHandleTransferAck(payload);
  else if(evt==="transfer-rej")_tfHandleTransferRej(payload);
  else if(evt==="transfer-resume")_tfHandleTransferResume(payload);
}

// --- Transfer Request Flow ---
function tfRequestTransfer(peerDeviceId,files){
  var manifest=files.map(function(f){return{name:f.name,size:f.size,type:f.type}});
  var totalBytes=files.reduce(function(s,f){return s+f.size},0);
  _tfSendQueue=files.map(function(f){return{file:f,name:f.name,size:f.size,type:f.type}});
  _tfPeerDeviceId=peerDeviceId;
  _tfSendState={fileIndex:0,chunkIndex:0,totalChunks:0,bytesSent:0,totalBytes:totalBytes,retries:0,ackTimer:null};

  tfBroadcast("transfer-req",{
    to:peerDeviceId,
    files:manifest,
    totalBytes:totalBytes
  });
  _tfSending="waiting";// waiting for ack
  if(cv==="transfer")R();
}

function _tfHandleTransferReq(payload){
  _tfIncomingReq={
    from:payload.from,
    fromName:payload.fromName||"Unknown Device",
    files:payload.files||[],
    totalBytes:payload.totalBytes||0
  };
  if(cv==="transfer")R();
  // Play notification sound
  pingSound();
}

function tfAcceptTransfer(){
  if(!_tfIncomingReq)return;
  _tfPeerDeviceId=_tfIncomingReq.from;
  _tfRecvState={fileIndex:0,chunkIndex:0,chunks:[],files:[],manifest:_tfIncomingReq.files,bytesReceived:0,totalBytes:_tfIncomingReq.totalBytes,lastMeta:null};
  _tfReceiving=true;
  tfBroadcast("transfer-ack",{to:_tfIncomingReq.from});
  _tfIncomingReq=null;
  acquireWakeLock();
  if(cv==="transfer")R();
}

function tfRejectTransfer(){
  if(!_tfIncomingReq)return;
  tfBroadcast("transfer-rej",{to:_tfIncomingReq.from});
  _tfIncomingReq=null;
  if(cv==="transfer")R();
}

function _tfHandleTransferAck(payload){
  if(_tfSending!=="waiting")return;
  _tfSending=true;
  acquireWakeLock();
  // Start WebRTC connection as sender (offerer)
  _tfCreateConnection(true);
}

function _tfHandleTransferRej(payload){
  _tfSending=false;
  _tfSendQueue=[];
  flash("Transfer declined");
  if(cv==="transfer")R();
}

// --- WebRTC Connection ---
function _tfCreateConnection(isOfferer){
  if(_tfPC){try{_tfPC.close()}catch(e){}_tfPC=null}

  var pc=new RTCPeerConnection(RTC_CONFIG);
  _tfPC=pc;

  pc.onicecandidate=function(e){
    if(e.candidate){
      tfBroadcast("ice",{to:_tfPeerDeviceId,candidate:e.candidate});
    }
  };

  pc.oniceconnectionstatechange=function(){
    if(pc.iceConnectionState==="disconnected"||pc.iceConnectionState==="failed"){
      _tfStartReconnect();
    }
  };

  if(isOfferer){
    var dc=pc.createDataChannel(TRANSFER_CHANNEL,{ordered:true});
    _tfDC=dc;
    _tfSetupDataChannel(dc);

    pc.createOffer().then(function(offer){
      return pc.setLocalDescription(offer);
    }).then(function(){
      tfBroadcast("offer",{to:_tfPeerDeviceId,sdp:pc.localDescription});
    }).catch(function(e){console.error("Offer error:",e)});
  }else{
    pc.ondatachannel=function(e){
      _tfDC=e.channel;
      _tfSetupDataChannel(e.channel);
    };
  }
}

function _tfSetupDataChannel(dc){
  dc.binaryType="arraybuffer";
  dc.onopen=function(){
    if(_tfSending===true){
      // Start sending files
      _tfSendNextChunk();
    }
  };
  dc.onmessage=function(evt){
    if(typeof evt.data==="string"){
      var msg=JSON.parse(evt.data);
      if(msg.type==="meta"){
        _tfRecvState.lastMeta=msg;
      }else if(msg.type==="ack"){
        _tfHandleAck(msg);
      }else if(msg.type==="done"){
        _tfHandleTransferDone();
      }
    }else{
      // ArrayBuffer - chunk data
      _tfHandleChunkData(evt.data);
    }
  };
  dc.onclose=function(){
    if(_tfSending||_tfReceiving)_tfStartReconnect();
  };
}

function _tfHandleOffer(payload){
  if(!_tfReceiving&&!_tfSending)return;
  _tfCreateConnection(false);
  _tfPC.setRemoteDescription(new RTCSessionDescription(payload.sdp)).then(function(){
    return _tfPC.createAnswer();
  }).then(function(answer){
    return _tfPC.setLocalDescription(answer);
  }).then(function(){
    tfBroadcast("answer",{to:payload.from,sdp:_tfPC.localDescription});
  }).catch(function(e){console.error("Answer error:",e)});
}

function _tfHandleAnswer(payload){
  if(!_tfPC)return;
  _tfPC.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(function(e){console.error("Remote desc error:",e)});
}

function _tfHandleIce(payload){
  if(!_tfPC)return;
  _tfPC.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(function(e){console.error("ICE error:",e)});
}

// --- Chunked Send ---
function _tfSendNextChunk(){
  if(!_tfSending||!_tfDC||_tfDC.readyState!=="open")return;

  var si=_tfSendState;
  if(si.fileIndex>=_tfSendQueue.length){
    // All files sent
    _tfDC.send(JSON.stringify({type:"done"}));
    _tfFinishSend("completed");
    return;
  }

  var fileObj=_tfSendQueue[si.fileIndex];
  var totalChunks=Math.ceil(fileObj.size/CHUNK_SIZE);
  si.totalChunks=totalChunks;

  var start=si.chunkIndex*CHUNK_SIZE;
  var end=Math.min(start+CHUNK_SIZE,fileObj.size);
  var blob=fileObj.file.slice(start,end);

  var reader=new FileReader();
  reader.onload=function(e){
    if(!_tfDC||_tfDC.readyState!=="open")return;
    // Send meta
    _tfDC.send(JSON.stringify({
      type:"meta",
      fileIndex:si.fileIndex,
      chunkIndex:si.chunkIndex,
      totalChunks:totalChunks,
      fileName:fileObj.name,
      fileSize:fileObj.size,
      fileType:fileObj.type
    }));
    // Send binary
    _tfDC.send(e.target.result);

    // Start ack timeout
    si.retries=0;
    _tfStartAckTimer();
  };
  reader.readAsArrayBuffer(blob);
}

function _tfStartAckTimer(){
  var si=_tfSendState;
  if(si.ackTimer)clearTimeout(si.ackTimer);
  si.ackTimer=setTimeout(function(){
    si.retries++;
    if(si.retries>=MAX_CHUNK_RETRIES){
      _tfStartReconnect();
    }else{
      // Resend current chunk
      _tfSendNextChunk();
    }
  },CHUNK_TIMEOUT);
}

function _tfHandleAck(msg){
  var si=_tfSendState;
  if(si.ackTimer){clearTimeout(si.ackTimer);si.ackTimer=null}

  if(msg.status==="ok"){
    var fileObj=_tfSendQueue[si.fileIndex];
    var chunkEnd=Math.min((si.chunkIndex+1)*CHUNK_SIZE,fileObj.size);
    si.bytesSent+=(chunkEnd-si.chunkIndex*CHUNK_SIZE);
    si.chunkIndex++;

    if(si.chunkIndex>=si.totalChunks){
      // File complete, move to next
      si.fileIndex++;
      si.chunkIndex=0;
      si.totalChunks=0;
    }

    // Persist resume state
    _tfPersistSendState();

    if(cv==="transfer")R();
    _tfSendNextChunk();
  }
}

// --- Chunked Receive ---
function _tfHandleChunkData(buffer){
  var rs=_tfRecvState;
  var meta=rs.lastMeta;
  if(!meta)return;

  // Initialize file chunks array if needed
  if(!rs.chunks[meta.fileIndex])rs.chunks[meta.fileIndex]=[];
  rs.chunks[meta.fileIndex][meta.chunkIndex]=buffer;
  rs.bytesReceived+=buffer.byteLength;

  // Send ack
  if(_tfDC&&_tfDC.readyState==="open"){
    _tfDC.send(JSON.stringify({type:"ack",fileIndex:meta.fileIndex,chunkIndex:meta.chunkIndex,status:"ok"}));
  }

  // Check if file is complete
  if(meta.chunkIndex===meta.totalChunks-1){
    var allChunks=rs.chunks[meta.fileIndex];
    var blob=new Blob(allChunks,{type:meta.fileType});
    rs.files.push({name:meta.fileName,size:meta.fileSize,type:meta.fileType,blob:blob});
    rs.chunks[meta.fileIndex]=null;// free memory
  }

  _tfPersistRecvState();
  if(cv==="transfer")R();
}

function _tfHandleTransferDone(){
  _tfReceiving=false;
  releaseWakeLock();
  localStorage.removeItem("drydock_transfer_state");

  // Trigger downloads or offer to attach
  var peerName=_tfPeers[_tfPeerDeviceId]?_tfPeers[_tfPeerDeviceId].device_name:"Unknown";
  _tfHistory.unshift({ts:Date.now(),direction:"receive",fileCount:_tfRecvState.files.length,totalBytes:_tfRecvState.totalBytes,status:"completed",peerName:peerName});
  if(_tfHistory.length>20)_tfHistory=_tfHistory.slice(0,20);
  try{localStorage.setItem("drydock_transfer_history",JSON.stringify(_tfHistory))}catch(e){}

  // Download received files
  _tfRecvState.files.forEach(function(f){
    var url=URL.createObjectURL(f.blob);
    var a=document.createElement("a");
    a.href=url;a.download=f.name;
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  flash(_tfRecvState.files.length+" file"+((_tfRecvState.files.length!==1)?"s":"")+" received");
  _tfCleanup();
  if(cv==="transfer")R();
}

function _tfFinishSend(status){
  _tfSending=false;
  releaseWakeLock();
  localStorage.removeItem("drydock_transfer_state");

  var peerName=_tfPeers[_tfPeerDeviceId]?_tfPeers[_tfPeerDeviceId].device_name:"Unknown";
  _tfHistory.unshift({ts:Date.now(),direction:"send",fileCount:_tfSendQueue.length,totalBytes:_tfSendState.totalBytes,status:status,peerName:peerName});
  if(_tfHistory.length>20)_tfHistory=_tfHistory.slice(0,20);
  try{localStorage.setItem("drydock_transfer_history",JSON.stringify(_tfHistory))}catch(e){}

  if(status==="completed")flash("Transfer complete");
  _tfCleanup();
  if(cv==="transfer")R();
}

function _tfCleanup(){
  if(_tfPC){try{_tfPC.close()}catch(e){}}
  _tfPC=null;_tfDC=null;
  _tfSendQueue=[];
  _tfSendState={fileIndex:0,chunkIndex:0,totalChunks:0,bytesSent:0,totalBytes:0,retries:0,ackTimer:null};
  _tfRecvState={fileIndex:0,chunkIndex:0,chunks:[],files:[],manifest:null,bytesReceived:0,totalBytes:0,lastMeta:null};
  _tfPeerDeviceId=null;
  _tfReconnectAttempt=0;
  _tfIncomingReq=null;
}

function tfCancelTransfer(){
  if(_tfSending)_tfFinishSend("cancelled");
  else if(_tfReceiving){
    _tfReceiving=false;releaseWakeLock();
    localStorage.removeItem("drydock_transfer_state");
    _tfCleanup();
    flash("Transfer cancelled");
    if(cv==="transfer")R();
  }
}

// --- Resume State ---
function _tfPersistSendState(){
  try{
    var state={
      id:mid(),direction:"send",peerDeviceId:_tfPeerDeviceId,
      files:_tfSendQueue.map(function(f,i){
        var tc=Math.ceil(f.size/CHUNK_SIZE);
        var cc=i<_tfSendState.fileIndex?tc:i===_tfSendState.fileIndex?_tfSendState.chunkIndex:0;
        return{name:f.name,size:f.size,type:f.type,chunksCompleted:cc,totalChunks:tc};
      }),
      startedAt:new Date().toISOString(),lastChunkAt:new Date().toISOString()
    };
    localStorage.setItem("drydock_transfer_state",JSON.stringify(state));
  }catch(e){}
}

function _tfPersistRecvState(){
  try{
    var rs=_tfRecvState;
    var state={
      id:mid(),direction:"receive",peerDeviceId:_tfPeerDeviceId,
      files:(rs.manifest||[]).map(function(f,i){
        var tc=Math.ceil(f.size/CHUNK_SIZE);
        var cc=rs.files.length>i?tc:(rs.chunks[i]?rs.chunks[i].filter(Boolean).length:0);
        return{name:f.name,size:f.size,type:f.type,chunksCompleted:cc,totalChunks:tc};
      }),
      startedAt:new Date().toISOString(),lastChunkAt:new Date().toISOString()
    };
    localStorage.setItem("drydock_transfer_state",JSON.stringify(state));
  }catch(e){}
}

function _tfHandleTransferResume(payload){
  // Peer wants to resume - re-establish connection
  if(_tfSending){
    _tfSendState.chunkIndex=payload.chunkIndex||0;
    _tfSendState.fileIndex=payload.fileIndex||0;
    _tfCreateConnection(true);
  }
}

// --- Wake Lock ---
function acquireWakeLock(){
  if("wakeLock" in navigator){
    navigator.wakeLock.request("screen").then(function(lock){
      _tfWakeLock=lock;
      lock.addEventListener("release",function(){_tfWakeLock=null});
    }).catch(function(e){console.warn("Wake lock failed:",e)});
  }
}
function releaseWakeLock(){
  if(_tfWakeLock){try{_tfWakeLock.release()}catch(e){}_tfWakeLock=null}
}
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible"&&(_tfSending||_tfReceiving)&&!_tfWakeLock){
    acquireWakeLock();
  }
});

// --- Reconnect ---
function _tfStartReconnect(){
  if(_tfReconnectAttempt>=RECONNECT_DELAYS.length){
    // Give up
    if(_tfSending)_tfFinishSend("failed");
    else if(_tfReceiving){_tfReceiving=false;releaseWakeLock();_tfCleanup();flash("Transfer failed");if(cv==="transfer")R()}
    return;
  }
  var delay=RECONNECT_DELAYS[_tfReconnectAttempt];
  _tfReconnectAttempt++;
  setTimeout(function(){
    if(!_tfSending&&!_tfReceiving)return;
    _tfCreateConnection(_tfSending?true:false);
  },delay);
}

// --- Format Helpers ---
function fmtBytes(b){
  if(b<1024)return b+" B";
  if(b<1048576)return(b/1024).toFixed(1)+" KB";
  if(b<1073741824)return(b/1048576).toFixed(1)+" MB";
  return(b/1073741824).toFixed(1)+" GB";
}

// --- Transfer View UI ---
function rTransferView(){
  var root=h("div",{class:"fc g16"});

  // Header
  var hdr=h("div",{class:"f ac g10"});
  hdr.append(h("button",{class:"ib",onClick:function(){nav("home")}},ic("back")));
  hdr.append(h("h2",{style:{fontSize:"18px",fontWeight:800,color:"#f59e0b",letterSpacing:"-0.5px",flex:1}},"TRANSFER"));
  // Device name edit
  var myName=getDeviceName();
  hdr.append(h("span",{style:{color:"#555",fontSize:"11px"}},myName));
  root.append(hdr);

  // Connection status
  var connected=_tfChannel&&_tfChannel.ws&&_tfChannel.ws.readyState===1;
  var statusDot=h("div",{class:"f ac g6"});
  statusDot.append(h("span",{style:{width:"6px",height:"6px",borderRadius:"50%",background:connected?"#22c55e":"#ef4444",display:"inline-block"}}));
  statusDot.append(h("span",{style:{color:connected?"#22c55e":"#ef4444",fontSize:"11px"}},connected?"Connected":"Connecting..."));
  if(!connected){
    statusDot.append(h("button",{class:"bs",style:{padding:"4px 10px",fontSize:"10px",marginLeft:"auto"},onClick:function(){tfJoinChannel();R()}},"Retry"));
  }
  root.append(statusDot);

  // Incoming transfer request modal
  if(_tfIncomingReq){
    root.append(_tfRenderIncomingModal());
  }

  // Active transfer progress
  if(_tfSending||_tfReceiving){
    root.append(_tfRenderProgress());
  }

  // Nearby Devices
  if(!_tfSending&&!_tfReceiving){
    var devSec=h("div",{class:"fc g8"});
    devSec.append(h("span",{style:{color:"#f59e0b",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Nearby Devices"));

    var peerKeys=Object.keys(_tfPeers);
    if(peerKeys.length===0){
      var emptyW=h("div",{style:{textAlign:"center",padding:"32px 16px"}});
      emptyW.append(h("div",{style:{fontSize:"28px",marginBottom:"8px",opacity:0.3}},"📡"));
      emptyW.append(h("p",{style:{color:"#555",fontSize:"12px",lineHeight:1.5}},"No devices found. Open Drydock on another device on the same network and navigate to Transfer."));
      devSec.append(emptyW);
    }else{
      peerKeys.forEach(function(peerId){
        var peer=_tfPeers[peerId];
        var card=h("div",{class:"f ac g10",style:{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid #222",borderRadius:"10px"}});
        var icon=peer.device_type==="mobile"?"📱":"🖥️";
        card.append(h("span",{style:{fontSize:"20px"}},icon));
        var info=h("div",{style:{flex:1}});
        info.append(h("span",{style:{color:"#e5e5e5",fontSize:"14px",fontWeight:600,display:"block"}},peer.device_name||"Unknown"));
        info.append(h("span",{style:{color:"#22c55e",fontSize:"10px"}},"Online now"));
        card.append(info);
        var sendBtn=h("button",{class:"bp",style:{padding:"8px 14px",fontSize:"12px"},onClick:function(){
          // Open file picker
          var inp=document.createElement("input");inp.type="file";inp.multiple=true;inp.accept="image/*,video/*";
          inp.onchange=function(){
            if(inp.files.length>0){
              tfRequestTransfer(peerId,Array.from(inp.files));
            }
          };inp.click();
        }});sendBtn.textContent="Send Files";
        card.append(sendBtn);
        devSec.append(card);
      });
    }
    root.append(devSec);
  }

  // Transfer History
  if(_tfHistory.length>0&&!_tfSending&&!_tfReceiving){
    var histSec=h("div",{class:"fc g6"});
    histSec.append(h("span",{style:{color:"#888",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Transfer History"));
    _tfHistory.forEach(function(entry){
      var row=h("div",{class:"f ac g8",style:{padding:"8px 0",borderBottom:"1px solid #1a1a1a",fontSize:"11px"}});
      row.append(h("span",{style:{color:entry.direction==="send"?"#60a5fa":"#22c55e",fontSize:"9px",fontWeight:700,textTransform:"uppercase",flexShrink:0,width:"50px"}},entry.direction==="send"?"Sent":"Received"));
      row.append(h("span",{style:{color:"#ccc",flex:1}},entry.fileCount+" file"+(entry.fileCount!==1?"s":"")+" ("+fmtBytes(entry.totalBytes)+")"));
      row.append(h("span",{style:{color:entry.status==="completed"?"#22c55e":entry.status==="failed"?"#ef4444":"#888",fontSize:"10px",flexShrink:0}},entry.status));
      var ts=new Date(entry.ts);
      row.append(h("span",{style:{color:"#555",fontSize:"10px",flexShrink:0}},ts.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+("0"+ts.getHours()).slice(-2)+":"+("0"+ts.getMinutes()).slice(-2)));
      histSec.append(row);
    });
    root.append(histSec);
  }

  return root;
}

// --- Incoming Transfer Modal ---
function _tfRenderIncomingModal(){
  var req=_tfIncomingReq;
  var modal=h("div",{style:{padding:"20px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:"12px"}});
  var title=h("div",{class:"fc g4",style:{marginBottom:"12px"}});
  title.append(h("span",{style:{color:"#f59e0b",fontSize:"14px",fontWeight:700}},req.fromName+" wants to send"));
  title.append(h("span",{style:{color:"#888",fontSize:"12px"}},req.files.length+" file"+(req.files.length!==1?"s":"")+" ("+fmtBytes(req.totalBytes)+")"));
  modal.append(title);

  var fileList=h("div",{class:"fc g2",style:{marginBottom:"12px",maxHeight:"150px",overflowY:"auto"}});
  req.files.forEach(function(f){
    fileList.append(h("div",{class:"f ac jb",style:{padding:"4px 0",fontSize:"11px"}},h("span",{style:{color:"#ccc"}},f.name),h("span",{style:{color:"#555"}},fmtBytes(f.size))));
  });
  modal.append(fileList);

  var btns=h("div",{class:"f g8"});
  btns.append(h("button",{class:"bs",style:{flex:1,justifyContent:"center",color:"#ef4444",borderColor:"rgba(239,68,68,0.3)"},onClick:function(){tfRejectTransfer()}},"Reject"));
  btns.append(h("button",{class:"bp",style:{flex:1},onClick:function(){tfAcceptTransfer()}},"Accept"));
  modal.append(btns);
  return modal;
}

// --- Progress UI ---
function _tfRenderProgress(){
  var isSend=!!_tfSending;
  var w=h("div",{class:"fc g10",style:{padding:"16px",background:"rgba(255,255,255,0.03)",border:"1px solid #222",borderRadius:"12px"}});

  var peerName=_tfPeerDeviceId&&_tfPeers[_tfPeerDeviceId]?_tfPeers[_tfPeerDeviceId].device_name:"Unknown";
  w.append(h("span",{style:{color:"#f59e0b",fontSize:"12px",fontWeight:700}},(isSend?"Sending to ":"Receiving from ")+peerName));

  if(_tfSending==="waiting"){
    w.append(h("div",{class:"f ac g8"},h("span",{class:"spin"}),h("span",{style:{color:"#888",fontSize:"12px"}},"Waiting for response...")));
  }else{
    var state=isSend?_tfSendState:_tfRecvState;
    var files=isSend?_tfSendQueue:(state.manifest||[]);
    var totalBytes=state.totalBytes||1;
    var doneBytes=isSend?state.bytesSent:state.bytesReceived;
    var overallPct=Math.round((doneBytes/totalBytes)*100);

    // Per-file progress
    files.forEach(function(f,i){
      var fileTotal=Math.ceil(f.size/CHUNK_SIZE);
      var fileDone=0;
      if(isSend){
        if(i<state.fileIndex)fileDone=fileTotal;
        else if(i===state.fileIndex)fileDone=state.chunkIndex;
      }else{
        if(state.files&&state.files.length>i)fileDone=fileTotal;
        else if(state.chunks&&state.chunks[i])fileDone=state.chunks[i].filter(Boolean).length;
      }
      var filePct=fileTotal>0?Math.round((fileDone/fileTotal)*100):0;
      var fRow=h("div",{class:"fc g2"});
      var fInfo=h("div",{class:"f ac jb",style:{fontSize:"11px"}});
      fInfo.append(h("span",{style:{color:"#ccc"}},f.name));
      fInfo.append(h("span",{style:{color:"#888"}},filePct+"%  "+fmtBytes(fileDone*CHUNK_SIZE)+"/"+fmtBytes(f.size)));
      fRow.append(fInfo);
      // Segmented progress bar
      var barBg=h("div",{style:{height:"6px",background:"rgba(255,255,255,0.05)",borderRadius:"3px",overflow:"hidden"}});
      barBg.append(h("div",{style:{height:"100%",width:filePct+"%",background:"#f59e0b",borderRadius:"3px",transition:"width 0.2s"}}));
      fRow.append(barBg);
      w.append(fRow);
    });

    // Overall
    var oRow=h("div",{class:"fc g2",style:{marginTop:"4px",paddingTop:"8px",borderTop:"1px solid #1a1a1a"}});
    var oInfo=h("div",{class:"f ac jb",style:{fontSize:"12px",fontWeight:600}});
    oInfo.append(h("span",{style:{color:"#f59e0b"}},"Overall"));
    oInfo.append(h("span",{style:{color:"#f59e0b"}},overallPct+"%  "+fmtBytes(doneBytes)+"/"+fmtBytes(totalBytes)));
    oRow.append(oInfo);
    var oBar=h("div",{style:{height:"8px",background:"rgba(255,255,255,0.05)",borderRadius:"4px",overflow:"hidden"}});
    oBar.append(h("div",{style:{height:"100%",width:overallPct+"%",background:"#f59e0b",borderRadius:"4px",transition:"width 0.2s"}}));
    oRow.append(oBar);
    w.append(oRow);
  }

  w.append(h("button",{class:"bs",style:{alignSelf:"flex-start",color:"#ef4444",borderColor:"rgba(239,68,68,0.3)",marginTop:"4px"},onClick:function(){tfCancelTransfer()}},"Cancel"));
  return w;
}

