import fs from "node:fs"; import { randomBytes } from "node:crypto";
const k = fs.readFileSync(".env","utf8").match(/^NEAR_AI_CLOUD_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
const ml = await (await fetch("https://cloud-api.near.ai/v1/models",{headers:{Authorization:`Bearer ${k}`}})).json().catch(()=>({}));
const ms = (ml.data??[]).map(m=>m.id);
for (const m of ms) {
  const q=new URLSearchParams({model:m,provider:"near",signing_algo:"ecdsa",nonce:randomBytes(32).toString("hex"),include_tls_fingerprint:"false"});
  let row={model:m};
  try{const r=await fetch(`https://cloud-api.near.ai/v1/attestation/report?${q}`,{headers:{"x-no-aliasing":"true",Authorization:`Bearer ${k}`}});
  row.status=r.status; const j=await r.json().catch(()=>null);
  const as=j?.model_attestations??[]; row.models=as.length; row.gw=!!j?.gateway_attestation; row.nv=as.some(a=>a.nvidia_payload); row.cm=as.some(a=>a.compose_manager_attestation);
  const ups=as.flatMap(a=>(a.compose_manager_attestation?.actions??[]).filter(x=>x.action==="compose_up"));
  const last=ups.at(-1); row.latestUp=last?.file??null; row.abliterated=/abliterat/i.test(JSON.stringify(as.map(a=>[a.info?.app_compose,last])));
  }catch(e){row.err=String(e).slice(0,80)}
  console.log(JSON.stringify(row));
}
