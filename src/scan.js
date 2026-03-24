// ============ RECEIPT SCAN ============
function scanReceipt(b64,statusEl,cb){
  if(!data.apiKey){flash("Add API key in Settings");return}
  statusEl.innerHTML='<span class="spin"></span> Reading receipt...';
  fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json","x-api-key":data.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-5-20250929",max_tokens:500,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64.split(",")[1]}},
      {type:"text",text:"Read this receipt/invoice. Return ONLY a JSON object with these fields (use empty string if not found): {\"amount\":\"total as number string\",\"vendor\":\"store or business name\",\"date\":\"YYYY-MM-DD\",\"category\":\"one of: Parts, Tools, Transport, Registration/Insurance, Storage, Listing Fees, Fuel, Other\",\"description\":\"brief 2-5 word summary of what was purchased\"}. Return only the JSON, no other text."}
    ]}]})
  }).then(function(r){return r.json()}).then(function(d){
    try{
      var txt=d.content[0].text.trim();if(txt.startsWith("```"))txt=txt.replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,"");
      var p=JSON.parse(txt);cb(p);statusEl.innerHTML='<span style="color:#22c55e">Receipt read</span>';
    }catch(e){statusEl.innerHTML='<span style="color:#ef4444">Could not parse</span>';console.error(d)}
  }).catch(function(e){statusEl.innerHTML='<span style="color:#ef4444">API error</span>';console.error(e)});
}

// ============ LISTING SCAN (Chat) ============
function scanChat(msgs,statusEl,cb){
  if(!data.apiKey){flash("Add API key in Settings");return}
  statusEl.innerHTML='<span class="spin"></span> Thinking...';
  fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json","x-api-key":data.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-5-20250929",max_tokens:2000,system:"You are a motorcycle/vehicle flip analyst. When analyzing listings, always include the full updated JSON lead object at the END of your response inside a ```json code fence. Before the JSON you can include brief commentary, answers to questions, red flags, or analysis. The JSON schema: {year,make,model,askingPrice,estSellPrice,mileage,titleStatus,listingSource,listingUrl,sellerName,sellerContact,flipDifficulty,partsAvailability,demandLevel,estDaysToSell,notes,status,knownIssues:[{name,severity(low/med/high),difficulty(easy/mod/hard),cost}],hiddenIssues:[same],specs:{tirePsiFront,tirePsiRear,tireSizeFront,tireSizeRear,oilType,oilCapacity,fuelType,sparkPlug,chainSize,coolantType,brakeFluid,bulbHeadlight,bulbTurnSignal,bulbTail,valveClearance,torqueAxleFront,torqueAxleRear,torqueDrain,notes}}. Use empty string for unknown fields. Look up factory specs for the exact year/make/model. Be realistic about pricing. Flag red flags.",messages:msgs})
  }).then(function(r){return r.json()}).then(function(d){
    try{
      var txt=d.content[0].text;cb(txt);statusEl.innerHTML='';
    }catch(e){statusEl.innerHTML='<span style="color:#ef4444">Bad response</span>';console.error(d)}
  }).catch(function(e){statusEl.innerHTML='<span style="color:#ef4444">API error</span>';console.error(e)});
}
function parseLeadFromText(txt){
  var m=txt.match(/```json\s*([\s\S]*?)```/);if(!m)m=txt.match(/(\{[\s\S]*\})\s*$/);
  if(m){try{return JSON.parse(m[1].trim())}catch(e){}}return null;
}
function getCommentary(txt){
  var idx=txt.indexOf("```json");if(idx===-1)idx=txt.lastIndexOf("{");if(idx===-1)return txt;
  return txt.slice(0,idx).trim();
}

