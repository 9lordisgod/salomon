import fs from "node:fs"; import { randomBytes } from "node:crypto";
const k = fs.readFileSync(".env","utf8").match(/^NEAR_AI_CLOUD_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
const ms=["deepseek-ai/DeepSeek-V4.1-Flash-1017","deepseek/deepseek-v4.1-flash","Qwen/Qwen3.6-35B-A3B-FP8","Qwen/Qwen3.8-27B","z-ai/glm-5.3","z-ai/glm-5.3-flash","moonshotai/kimi-k2.6","qwen/qwen3.5-397b-a17b","Qwen/Qwen3-VL-30B-A3B-Instruct","openai/privacy-filter"];
for(const m of ms){const q=new URLSearchParams({model:m,provider:"near",signing_algo:"ecdsa",nonce:randomBytes(32).toString("hex"),include_tls_fingerprint:"false"});
const r=await fetch(`https://cloud-api.near.ai/v1/attestation/report?${q}`,{headers:{"x-no-aliasing":"true",Authorization:`Bearer ${k}`}});const t=await r.text();
let n="";try{const j=JSON.parse(t);n=`gw=${!!j.gateway_attestation} models=${(j.model_attestations??[]).length} nv=${(j.model_attestations??[]).some(a=>a.nvidia_payload)}`}catch{}
console.log(m,r.status,n);}
