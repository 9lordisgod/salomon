import fs from "node:fs";
const k = fs.readFileSync(".env","utf8").match(/^NEAR_AI_CLOUD_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
if(!k){console.log("no key");process.exit(1)}
const r = await fetch("https://cloud-api.near.ai/v1/models",{headers:{Authorization:`Bearer ${k}`}});
console.log("status",r.status); const j=await r.json().catch(()=>null);
console.log((j?.data??[]).map(m=>m.id).join("\n"));
