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
var _tfSendManifest=null;// full file manifest, sent over DataChannel after connect
var _tfHistory=[];// [{ts, direction, fileCount, totalBytes, status, peerName, files}]
try{_tfHistory=JSON.parse(localStorage.getItem("drydock_transfer_history"))||[]}catch(e){}
var _tfCompleted=null;// {direction, files:[{name,size}], peerName, ts} — shown until dismissed

// --- Device Chat ---
var _tfChatMsgs=[];// [{ts, from, fromName, text}]
var _tfChatMax=100;

// --- Supabase Realtime Channel (broadcast only, no presence API) ---
var _tfPingTimer=null;
var PEER_TIMEOUT=30000;// remove peers after 30s silence
var PING_INTERVAL=10000;// broadcast ping every 10s

function tfJoinChannel(){
  var auth=getAuth();if(!auth)return;
  var userId=auth.email||"unknown";
  var channelName="transfer:"+userId;
  var wsUrl=SB_URL.replace("https://","wss://").replace("http://","ws://")+"/realtime/v1/websocket?apikey="+SB_KEY+"&vsn=1.0.0";

  if(_tfChannel){tfLeaveChannel()}

  var deviceId=getDeviceId();
  var deviceName=getDeviceName();
  var deviceType=getDeviceType();

  var ws=new WebSocket(wsUrl);
  var heartbeatRef=0;
  var heartbeatTimer=null;
  var joinRef="1";
  var channelTopic="realtime:"+channelName;

  ws.onopen=function(){
    console.log("[TF] WebSocket open, joining channel:",channelTopic);
    ws.send(JSON.stringify({topic:channelTopic,event:"phx_join",payload:{config:{broadcast:{self:false}}},ref:joinRef}));
    heartbeatTimer=setInterval(function(){
      heartbeatRef++;
      ws.send(JSON.stringify({topic:"phoenix",event:"heartbeat",payload:{},ref:String(heartbeatRef)}));
    },30000);
    setTimeout(function(){console.log("[TF] Sending initial ping");_tfSendPing();_tfStartPingTimer()},500);
  };

  ws.onmessage=function(evt){
    try{
      var msg=JSON.parse(evt.data);
      if(msg.topic===channelTopic){
        if(msg.event==="broadcast"){
          var p=msg.payload;
          if(p.event==="ping"&&p.from&&p.from!==deviceId){
            var isNew=!_tfPeers[p.from];
            _tfPeers[p.from]={device_id:p.from,device_name:p.fromName||"Unknown",device_type:p.fromType||"desktop",lastSeen:Date.now()};
            if(isNew)console.log("[TF] New peer discovered:",p.fromName||p.from,p.fromType||"desktop");
            if(cv==="transfer")R(true);
          }
          else if(p.event!=="ping"){
            if(p.to&&p.to!==deviceId)return;
            _tfHandleBroadcast(p);
          }
        }else if(msg.event==="system"&&msg.payload&&msg.payload.status==="error"){
          console.error("[TF] Channel system error:",msg.payload.message);
        }else if(msg.event==="phx_reply"){
          if(msg.payload&&msg.payload.status==="ok")console.log("[TF] Channel joined OK");
          else if(msg.payload)console.warn("[TF] Channel reply:",msg.payload.status,JSON.stringify(msg.payload.response||"").slice(0,200));
        }
      }
    }catch(e){console.error("WS message error:",e)}
  };

  ws.onclose=function(evt){
    console.warn("[TF] WebSocket closed, code:",evt.code,"reason:",evt.reason||"none");
    if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}
    if(_tfChannel){
      console.log("[TF] Will reconnect WS in 3s");
      setTimeout(function(){if(_tfChannel)tfJoinChannel()},3000);
    }
  };

  ws.onerror=function(e){console.error("[TF] WebSocket error:",e)};

  _tfChannel={ws:ws,topic:channelTopic,deviceId:deviceId,deviceName:deviceName};
}

function _tfSendPing(){
  tfBroadcast("ping",{fromType:getDeviceType()});
}

function _tfStartPingTimer(){
  if(_tfPingTimer)clearInterval(_tfPingTimer);
  _tfPingTimer=setInterval(function(){
    if(!_tfChannel||!_tfChannel.ws||_tfChannel.ws.readyState!==1)return;
    _tfSendPing();
    var now=Date.now();var changed=false;
    Object.keys(_tfPeers).forEach(function(id){
      if(now-_tfPeers[id].lastSeen>PEER_TIMEOUT){delete _tfPeers[id];changed=true}
    });
    if(changed&&cv==="transfer")R(true);
  },PING_INTERVAL);
}

function tfLeaveChannel(){
  if(_tfPingTimer){clearInterval(_tfPingTimer);_tfPingTimer=null}
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
  else if(evt==="chat-msg")_tfHandleChatMsg(payload);
}

// --- Transfer Request Flow ---
function tfRequestTransfer(peerDeviceId,files){
  var manifest=files.map(function(f){return{name:f.name,size:f.size,type:f.type}});
  var totalBytes=files.reduce(function(s,f){return s+f.size},0);
  _tfSendQueue=files.map(function(f){return{file:f,name:f.name,size:f.size,type:f.type}});
  _tfSendManifest=manifest;
  _tfPeerDeviceId=peerDeviceId;
  _tfSendState={fileIndex:0,chunkIndex:0,totalChunks:0,bytesSent:0,totalBytes:totalBytes,retries:0,ackTimer:null};

  console.log("[TF] Requesting transfer to",peerDeviceId,":",files.length,"files,",fmtBytes(totalBytes));
  tfBroadcast("transfer-req",{
    to:peerDeviceId,
    fileCount:files.length,
    totalBytes:totalBytes,
    preview:manifest.slice(0,5).map(function(f){return f.name})
  });
  _tfSending="waiting";
  if(cv==="transfer")R();
}

function _tfHandleTransferReq(payload){
  console.log("[TF] Incoming transfer request from",payload.fromName||payload.from,":",payload.fileCount,"files,",fmtBytes(payload.totalBytes||0));
  _tfIncomingReq={
    from:payload.from,
    fromName:payload.fromName||"Unknown Device",
    fileCount:payload.fileCount||0,
    totalBytes:payload.totalBytes||0,
    preview:payload.preview||[]
  };
  if(cv==="transfer")R(true);
  pingSound();
}

function tfAcceptTransfer(){
  if(!_tfIncomingReq)return;
  console.log("[TF] Accepting transfer from",_tfIncomingReq.fromName);
  _tfPeerDeviceId=_tfIncomingReq.from;
  _tfRecvState={fileIndex:0,chunkIndex:0,chunks:[],files:[],manifest:null,bytesReceived:0,totalBytes:_tfIncomingReq.totalBytes,lastMeta:null,fileCount:_tfIncomingReq.fileCount};
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
  console.log("[TF] Transfer accepted by peer, starting WebRTC as offerer");
  _tfSending=true;
  acquireWakeLock();
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
  console.log("[TF] Creating WebRTC connection, role:",isOfferer?"offerer":"answerer");
  if(_tfPC){try{_tfPC.close()}catch(e){}_tfPC=null}

  var pc=new RTCPeerConnection(RTC_CONFIG);
  _tfPC=pc;

  pc.onicecandidate=function(e){
    if(e.candidate){
      tfBroadcast("ice",{to:_tfPeerDeviceId,candidate:e.candidate});
    }
  };

  pc.oniceconnectionstatechange=function(){
    console.log("[TF] ICE state:",pc.iceConnectionState);
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
    }).catch(function(e){console.error("[TF] Offer creation error:",e)});
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
    console.log("[TF] DataChannel OPEN, readyState:",dc.readyState,"bufferedAmount:",dc.bufferedAmountLowThreshold);
    if(_tfSending===true){
      if(_tfSendManifest){
        console.log("[TF] Sending manifest over DataChannel:",_tfSendManifest.length,"files");
        dc.send(JSON.stringify({type:"manifest",files:_tfSendManifest}));
        _tfSendManifest=null;
      }
      _tfSendNextChunk();
    }
  };
  dc.onmessage=function(evt){
    if(typeof evt.data==="string"){
      var msg=JSON.parse(evt.data);
      if(msg.type==="manifest"){
        console.log("[TF] Received manifest:",msg.files.length,"files");
        _tfRecvState.manifest=msg.files;
        _tfRecvState.fileCount=msg.files.length;
        if(cv==="transfer")R(true);
      }else if(msg.type==="meta"){
        _tfRecvState.lastMeta=msg;
      }else if(msg.type==="ack"){
        _tfHandleAck(msg);
      }else if(msg.type==="done"){
        console.log("[TF] Sender signaled DONE, received",_tfRecvState.files.length,"files so far");
        _tfHandleTransferDone();
      }
    }else{
      _tfHandleChunkData(evt.data);
    }
  };
  dc.onclose=function(){
    console.warn("[TF] DataChannel CLOSED, sending:",_tfSending,"receiving:",_tfReceiving);
    if(_tfSending||_tfReceiving)_tfStartReconnect();
  };
}

function _tfHandleOffer(payload){
  if(!_tfReceiving&&!_tfSending){console.warn("[TF] Got offer but not in transfer state, ignoring");return}
  console.log("[TF] Received WebRTC offer from",payload.from);
  _tfCreateConnection(false);
  _tfPC.setRemoteDescription(new RTCSessionDescription(payload.sdp)).then(function(){
    return _tfPC.createAnswer();
  }).then(function(answer){
    return _tfPC.setLocalDescription(answer);
  }).then(function(){
    tfBroadcast("answer",{to:payload.from,sdp:_tfPC.localDescription});
  }).catch(function(e){console.error("[TF] Answer creation error:",e)});
}

function _tfHandleAnswer(payload){
  if(!_tfPC){console.warn("[TF] Got answer but no PC");return}
  console.log("[TF] Received WebRTC answer");
  _tfPC.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(function(e){console.error("[TF] Remote desc error:",e)});
}

function _tfHandleIce(payload){
  if(!_tfPC)return;
  _tfPC.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(function(e){console.error("[TF] ICE candidate error:",e)});
}

// --- Chunked Send ---
function _tfSendNextChunk(){
  if(!_tfSending||!_tfDC||_tfDC.readyState!=="open")return;

  var si=_tfSendState;
  if(si.fileIndex>=_tfSendQueue.length){
    console.log("[TF] All files sent, signaling DONE");
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
    if(!_tfDC||_tfDC.readyState!=="open"){console.warn("[TF] DC not open when chunk ready, state:",_tfDC?_tfDC.readyState:"null");return}
    if(si.chunkIndex===0||si.chunkIndex%10===0)console.log("[TF] Sending file",si.fileIndex+1+"/"+_tfSendQueue.length,"("+fileObj.name+") chunk",si.chunkIndex+"/"+totalChunks);
    _tfDC.send(JSON.stringify({
      type:"meta",
      fileIndex:si.fileIndex,
      chunkIndex:si.chunkIndex,
      totalChunks:totalChunks,
      fileName:fileObj.name,
      fileSize:fileObj.size,
      fileType:fileObj.type
    }));
    _tfDC.send(e.target.result);
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
    console.warn("[TF] Ack timeout, retry",si.retries+"/"+MAX_CHUNK_RETRIES,"for file",si.fileIndex,"chunk",si.chunkIndex);
    if(si.retries>=MAX_CHUNK_RETRIES){
      console.error("[TF] Max chunk retries exceeded, starting reconnect");
      _tfStartReconnect();
    }else{
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
      si.fileIndex++;
      si.chunkIndex=0;
      si.totalChunks=0;
    }

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

  if(!rs.chunks[meta.fileIndex])rs.chunks[meta.fileIndex]=[];
  rs.chunks[meta.fileIndex][meta.chunkIndex]=buffer;
  rs.bytesReceived+=buffer.byteLength;

  if(_tfDC&&_tfDC.readyState==="open"){
    _tfDC.send(JSON.stringify({type:"ack",fileIndex:meta.fileIndex,chunkIndex:meta.chunkIndex,status:"ok"}));
  }

  if(meta.chunkIndex===0||meta.chunkIndex%10===0)console.log("[TF] Receiving file",meta.fileIndex+1,"("+meta.fileName+") chunk",meta.chunkIndex+"/"+meta.totalChunks,fmtBytes(rs.bytesReceived)+"/"+fmtBytes(rs.totalBytes));

  if(meta.chunkIndex===meta.totalChunks-1){
    var allChunks=rs.chunks[meta.fileIndex];
    var blob=new Blob(allChunks,{type:meta.fileType});
    rs.files.push({name:meta.fileName,size:meta.fileSize,type:meta.fileType,blob:blob});
    rs.chunks[meta.fileIndex]=null;
    console.log("[TF] File complete:",meta.fileName,"("+fmtBytes(meta.fileSize)+"), total files received:",rs.files.length);
  }

  _tfPersistRecvState();
  if(cv==="transfer")R();
}

function _tfHandleTransferDone(){
  _tfReceiving=false;
  releaseWakeLock();
  localStorage.removeItem("drydock_transfer_state");

  var peerName=_tfPeers[_tfPeerDeviceId]?_tfPeers[_tfPeerDeviceId].device_name:"Unknown";
  var receivedFiles=_tfRecvState.files.map(function(f){return{name:f.name,size:f.size}});
  _tfHistory.unshift({ts:Date.now(),direction:"receive",fileCount:receivedFiles.length,totalBytes:_tfRecvState.totalBytes,status:"completed",peerName:peerName,files:receivedFiles});
  if(_tfHistory.length>20)_tfHistory=_tfHistory.slice(0,20);
  try{localStorage.setItem("drydock_transfer_history",JSON.stringify(_tfHistory))}catch(e){}

  var dlFiles=_tfRecvState.files.slice();
  console.log("[TF] Transfer done, preparing download for",dlFiles.length,"files, JSZip available:",typeof JSZip!=="undefined");
  if(typeof JSZip!=="undefined"&&dlFiles.length>1){
    console.log("[TF] Bundling",dlFiles.length,"files into zip");
    var zip=new JSZip();
    dlFiles.forEach(function(f){
      console.log("[TF] Adding to zip:",f.name,"("+fmtBytes(f.blob.size)+")");
      zip.file(f.name,f.blob);
    });
    var now=new Date();
    var ts=now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2)+"-"+("0"+now.getDate()).slice(-2)+"_"+("0"+now.getHours()).slice(-2)+("0"+now.getMinutes()).slice(-2)+("0"+now.getSeconds()).slice(-2);
    var zipName="drydock-transfer-"+ts+".zip";
    zip.generateAsync({type:"blob"}).then(function(blob){
      console.log("[TF] Zip generated:",zipName,"("+fmtBytes(blob.size)+"), triggering download");
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url;a.download=zipName;
      document.body.appendChild(a);a.click();
      document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url)},10000);
    }).catch(function(err){
      console.error("[TF] Zip generation FAILED:",err);
    });
  }else{
    console.log("[TF] Direct download (single file or no JSZip)");
    dlFiles.forEach(function(f,i){
      console.log("[TF] Downloading file",i+1+"/"+dlFiles.length+":",f.name,"("+fmtBytes(f.blob.size)+")");
      var url=URL.createObjectURL(f.blob);
      var a=document.createElement("a");
      a.href=url;a.download=f.name;
      document.body.appendChild(a);a.click();
      document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url)},10000);
    });
  }

  _tfCompleted={direction:"receive",files:receivedFiles,peerName:peerName,ts:Date.now(),totalBytes:_tfRecvState.totalBytes};
  pingSound();
  _tfCleanup();
  if(cv==="transfer")R(true);
}

function _tfFinishSend(status){
  console.log("[TF] Send finished, status:",status,"files:",_tfSendQueue.length);
  _tfSending=false;
  releaseWakeLock();
  localStorage.removeItem("drydock_transfer_state");

  var peerName=_tfPeers[_tfPeerDeviceId]?_tfPeers[_tfPeerDeviceId].device_name:"Unknown";
  var sentFiles=_tfSendQueue.map(function(f){return{name:f.name,size:f.size}});
  _tfHistory.unshift({ts:Date.now(),direction:"send",fileCount:sentFiles.length,totalBytes:_tfSendState.totalBytes,status:status,peerName:peerName,files:sentFiles});
  if(_tfHistory.length>20)_tfHistory=_tfHistory.slice(0,20);
  try{localStorage.setItem("drydock_transfer_history",JSON.stringify(_tfHistory))}catch(e){}

  if(status==="completed"){
    _tfCompleted={direction:"send",files:sentFiles,peerName:peerName,ts:Date.now(),totalBytes:_tfSendState.totalBytes};
    pingSound();
  }
  _tfCleanup();
  if(cv==="transfer")R(true);
}

function _tfCleanup(){
  if(_tfPC){try{_tfPC.close()}catch(e){}}
  _tfPC=null;_tfDC=null;
  _tfSendQueue=[];_tfSendManifest=null;
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
  console.warn("[TF] Reconnect attempt",_tfReconnectAttempt+1+"/"+RECONNECT_DELAYS.length);
  if(_tfReconnectAttempt>=RECONNECT_DELAYS.length){
    console.error("[TF] Max reconnect attempts exhausted, giving up");
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

// --- Device Chat ---
function tfSendChat(text){
  if(!text||!text.trim())return;
  var msg={ts:Date.now(),from:getDeviceId(),fromName:getDeviceName(),text:text.trim()};
  _tfChatMsgs.push(msg);
  if(_tfChatMsgs.length>_tfChatMax)_tfChatMsgs=_tfChatMsgs.slice(-_tfChatMax);
  tfBroadcast("chat-msg",{text:msg.text,ts:msg.ts});
  if(cv==="transfer")R(true);
}

function _tfHandleChatMsg(payload){
  _tfChatMsgs.push({ts:payload.ts||Date.now(),from:payload.from,fromName:payload.fromName||"Unknown",text:payload.text||""});
  if(_tfChatMsgs.length>_tfChatMax)_tfChatMsgs=_tfChatMsgs.slice(-_tfChatMax);
  if(cv==="transfer")R(true);
  pingSound();
}

function tfSendDebugLogs(){
  var logs=typeof _dbgFiltered==="function"?_dbgFiltered():(_dbgLogs||[]);
  if(logs.length===0){flash("No logs to send");return}
  var text=logs.slice(-50).map(function(l){
    var d=new Date(l.ts);
    return("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2)+"."+("00"+d.getMilliseconds()).slice(-3)+" ["+l.level+"] "+l.text;
  }).join("\n");
  tfSendChat("[DEBUG DUMP]\n"+text);
}

function _tfRenderChat(){
  var w=h("div",{class:"fc g8"});
  w.append(h("span",{style:{color:"#22d3ee",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}},"Device Chat"));

  // Messages
  var msgBox=h("div",{id:"tf-chat-msgs",style:{maxHeight:"200px",overflowY:"auto",background:"rgba(255,255,255,0.02)",border:"1px solid #222",borderRadius:"8px",padding:"8px",WebkitOverflowScrolling:"touch"}});
  if(_tfChatMsgs.length===0){
    msgBox.append(h("div",{style:{color:"#444",fontSize:"11px",textAlign:"center",padding:"12px"}},"No messages yet. Type below or paste logs."));
  }else{
    var myId=getDeviceId();
    _tfChatMsgs.forEach(function(m){
      var isMine=m.from===myId;
      var row=h("div",{style:{marginBottom:"6px",textAlign:isMine?"right":"left"}});
      var bubble=h("div",{style:{display:"inline-block",maxWidth:"85%",padding:"6px 10px",borderRadius:isMine?"10px 10px 2px 10px":"10px 10px 10px 2px",background:isMine?"rgba(34,211,238,0.08)":"rgba(255,255,255,0.05)",border:"1px solid "+(isMine?"rgba(34,211,238,0.15)":"#222"),textAlign:"left"}});
      if(!isMine){
        bubble.append(h("div",{style:{fontSize:"9px",color:"#22d3ee",fontWeight:600,marginBottom:"2px"}},m.fromName));
      }
      // Render text with newlines preserved, use pre-wrap for log dumps
      var isLogDump=m.text.indexOf("[DEBUG DUMP]")===0;
      bubble.append(h("div",{style:{fontSize:isLogDump?"9px":"12px",color:isLogDump?"#888":"#ccc",whiteSpace:"pre-wrap",wordBreak:"break-all",lineHeight:1.4,fontFamily:isLogDump?"var(--font)":"inherit",maxHeight:isLogDump?"150px":"none",overflowY:isLogDump?"auto":"visible"}},m.text));
      var d=new Date(m.ts);
      bubble.append(h("div",{style:{fontSize:"8px",color:"#444",marginTop:"2px"}},("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)));
      row.append(bubble);
      msgBox.append(row);
    });
  }
  w.append(msgBox);

  // Input row
  var inputRow=h("div",{class:"f g6 ac"});
  var chatInput=h("textarea",{id:"tf-chat-input",placeholder:"Type a message or paste logs...",style:{flex:1,minHeight:"36px",maxHeight:"100px",resize:"vertical",background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:"6px",color:"#e5e5e5",padding:"8px 10px",fontSize:"12px",fontFamily:"var(--font)",outline:"none",lineHeight:1.4}});
  inputRow.append(chatInput);

  var sendBtn=h("button",{class:"bp",style:{padding:"8px 12px",fontSize:"11px",flexShrink:0,alignSelf:"flex-end"},onClick:function(){
    var inp=document.getElementById("tf-chat-input");
    if(inp&&inp.value.trim()){tfSendChat(inp.value);inp.value=""}
  }});sendBtn.textContent="Send";
  inputRow.append(sendBtn);
  w.append(inputRow);

  // Quick actions
  var actions=h("div",{class:"f g6 fw"});
  var logBtn=h("button",{class:"bs",style:{fontSize:"10px",padding:"5px 10px",color:"#22d3ee",borderColor:"rgba(34,211,238,0.2)"},onClick:function(){tfSendDebugLogs()}});
  logBtn.textContent="Paste Logs";
  actions.append(logBtn);

  var copyBtn=h("button",{class:"bs",style:{fontSize:"10px",padding:"5px 10px",color:"#888"},onClick:function(){
    var text=_tfChatMsgs.map(function(m){
      var d=new Date(m.ts);
      return("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+" ["+m.fromName+"] "+m.text;
    }).join("\n");
    navigator.clipboard.writeText(text).then(function(){flash("Chat copied")});
  }});
  copyBtn.textContent="Copy All";
  actions.append(copyBtn);

  var clearBtn=h("button",{class:"bs",style:{fontSize:"10px",padding:"5px 10px",color:"#555"},onClick:function(){_tfChatMsgs=[];R(true)}});
  clearBtn.textContent="Clear";
  actions.append(clearBtn);
  w.append(actions);

  // Auto-scroll chat to bottom after render
  setTimeout(function(){
    var el=document.getElementById("tf-chat-msgs");
    if(el)el.scrollTop=el.scrollHeight;
  },0);

  return w;
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

  var hdr=h("div",{class:"f ac g10"});
  hdr.append(h("button",{class:"ib",onClick:function(){nav("home")}},ic("back")));
  hdr.append(h("h2",{style:{fontSize:"18px",fontWeight:800,color:"#f59e0b",letterSpacing:"-0.5px",flex:1}},"TRANSFER"));
  var myName=getDeviceName();
  hdr.append(h("span",{style:{color:"#555",fontSize:"11px"}},myName));
  root.append(hdr);

  var connected=_tfChannel&&_tfChannel.ws&&_tfChannel.ws.readyState===1;
  var statusDot=h("div",{class:"f ac g6"});
  statusDot.append(h("span",{style:{width:"6px",height:"6px",borderRadius:"50%",background:connected?"#22c55e":"#ef4444",display:"inline-block"}}));
  statusDot.append(h("span",{style:{color:connected?"#22c55e":"#ef4444",fontSize:"11px"}},connected?"Connected":"Connecting..."));
  if(!connected){
    statusDot.append(h("button",{class:"bs",style:{padding:"4px 10px",fontSize:"10px",marginLeft:"auto"},onClick:function(){tfJoinChannel();R()}},"Retry"));
  }
  root.append(statusDot);

  if(_tfIncomingReq){
    root.append(_tfRenderIncomingModal());
  }

  if(_tfCompleted){
    root.append(_tfRenderCompleted());
  }

  if(_tfSending||_tfReceiving){
    root.append(_tfRenderProgress());
  }

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

  // Device Chat — always visible when channel is connected
  if(connected){
    root.append(_tfRenderChat());
  }

  return root;
}

// --- Incoming Transfer Modal ---
function _tfRenderIncomingModal(){
  var req=_tfIncomingReq;
  var modal=h("div",{style:{padding:"20px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:"12px"}});
  var title=h("div",{class:"fc g4",style:{marginBottom:"12px"}});
  title.append(h("span",{style:{color:"#f59e0b",fontSize:"14px",fontWeight:700}},req.fromName+" wants to send"));
  title.append(h("span",{style:{color:"#888",fontSize:"12px"}},req.fileCount+" file"+(req.fileCount!==1?"s":"")+" ("+fmtBytes(req.totalBytes)+")"));
  modal.append(title);

  if(req.preview&&req.preview.length>0){
    var fileList=h("div",{class:"fc g2",style:{marginBottom:"12px"}});
    req.preview.forEach(function(name){
      fileList.append(h("div",{style:{padding:"2px 0",fontSize:"11px",color:"#ccc"}},name));
    });
    if(req.fileCount>req.preview.length){
      fileList.append(h("div",{style:{padding:"2px 0",fontSize:"11px",color:"#555"}},"... and "+(req.fileCount-req.preview.length)+" more"));
    }
    modal.append(fileList);
  }

  var btns=h("div",{class:"f g8"});
  btns.append(h("button",{class:"bs",style:{flex:1,justifyContent:"center",color:"#ef4444",borderColor:"rgba(239,68,68,0.3)"},onClick:function(){tfRejectTransfer()}},"Reject"));
  btns.append(h("button",{class:"bp",style:{flex:1},onClick:function(){tfAcceptTransfer()}},"Accept"));
  modal.append(btns);
  return modal;
}

// --- Completion Card ---
function _tfRenderCompleted(){
  var c=_tfCompleted;
  var isSend=c.direction==="send";
  var w=h("div",{style:{padding:"16px",background:isSend?"rgba(96,165,250,0.06)":"rgba(34,197,94,0.06)",border:"1px solid "+(isSend?"rgba(96,165,250,0.2)":"rgba(34,197,94,0.2)"),borderRadius:"12px"}});

  var hdr=h("div",{class:"f ac g8",style:{marginBottom:"10px"}});
  hdr.append(h("span",{style:{fontSize:"22px"}},isSend?"✓":"⬇"));
  var title=h("div",{class:"fc",style:{flex:1}});
  title.append(h("span",{style:{color:isSend?"#60a5fa":"#22c55e",fontSize:"14px",fontWeight:700}},isSend?"Transfer Complete":"Files Received"));
  title.append(h("span",{style:{color:"#888",fontSize:"11px"}},(isSend?"Sent to ":"Received from ")+c.peerName+" · "+fmtBytes(c.totalBytes)));
  hdr.append(title);
  hdr.append(h("button",{style:{color:"#555",fontSize:"18px",background:"none",border:"none",cursor:"pointer",padding:"4px"},onClick:function(){_tfCompleted=null;R(true)}},"×"));
  w.append(hdr);

  var list=h("div",{class:"fc g4"});
  c.files.forEach(function(f){
    var row=h("div",{class:"f ac jb",style:{padding:"4px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"6px",fontSize:"11px"}});
    row.append(h("span",{style:{color:"#ccc",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},f.name));
    row.append(h("span",{style:{color:"#555",flexShrink:0,marginLeft:"8px"}},fmtBytes(f.size)));
    list.append(row);
  });
  w.append(list);

  if(!isSend){
    var dlNote=c.files.length>1?"Saved as a zip file in your Downloads folder.":"Saved to your Downloads folder.";
    dlNote+=" On iOS, check Files → Downloads.";
    w.append(h("div",{style:{marginTop:"8px",padding:"8px 10px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:"6px",fontSize:"11px",color:"#f59e0b",lineHeight:1.4}},dlNote));
  }

  return w;
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
      var barBg=h("div",{style:{height:"6px",background:"rgba(255,255,255,0.05)",borderRadius:"3px",overflow:"hidden"}});
      barBg.append(h("div",{style:{height:"100%",width:filePct+"%",background:"#f59e0b",borderRadius:"3px",transition:"width 0.2s"}}));
      fRow.append(barBg);
      w.append(fRow);
    });

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

