// Captures genuine NEAR AI Cloud fixtures. Never prints/writes the API key.
import fs from "node:fs"; import { createHash, randomBytes } from "node:crypto";
const sha=(b)=>createHash("sha256").update(b).digest("hex");
const k = fs.readFileSync(".env","utf8").match(/^ATTEST_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
if(!k) throw new Error("key missing");
const MODEL=process.argv[2]??"deepseek/deepseek-v3.2", slug=MODEL.replace(/[^A-Za-z0-9]+/g,"_")+(process.argv[3]??"");
const B="https://cloud-api.near.ai/v1", out="fixtures/recorded", raw=out+"/raw";
const H={Accept:"application/json","x-no-aliasing":"true",Authorization:`Bearer ${k}`};
const status={}; const at=new Date().toISOString();
const nonce=randomBytes(32).toString("hex");
const q=new URLSearchParams({model:MODEL,provider:"near",signing_algo:"ecdsa",nonce,include_tls_fingerprint:"false"});
let r=await fetch(`${B}/attestation/report?${q}`,{headers:H}); status.report=r.status;
const repTxt=await r.text(); fs.writeFileSync(`${raw}/${slug}.report.raw.json`,repTxt);
fs.writeFileSync(`${raw}/${slug}.nonce.txt`,nonce);
// completion
const reqBody=JSON.stringify({model:MODEL,messages:[{role:"user",content:"Say OK."}],max_tokens:8,stream:false});
r=await fetch(`${B}/chat/completions`,{method:"POST",headers:{...H,"Content-Type":"application/json"},body:reqBody}); status.completion=r.status;
const respBytes=Buffer.from(await r.arrayBuffer());
fs.writeFileSync(`${raw}/${slug}.completion.req.json`,reqBody); fs.writeFileSync(`${raw}/${slug}.completion.resp.json`,respBytes);
let chatId; try{chatId=JSON.parse(respBytes).id}catch{}
let sig=null;
if(chatId){ for(let i=0;i<4;i++){ r=await fetch(`${B}/signature/${encodeURIComponent(chatId)}?model=${encodeURIComponent(MODEL)}&signing_algo=ecdsa`,{headers:H}); status.signature=r.status; if(r.status===200){sig=await r.text();break} await new Promise(s=>setTimeout(s,1000)); }
  if(sig) fs.writeFileSync(`${raw}/${slug}.signature.raw.json`,sig);}
fs.writeFileSync(`${out}/${slug}.capture.meta.json`,JSON.stringify({model_id:MODEL,captured_at_utc:at,gateway:B,status,nonceHash:sha(nonce),report_sha256:sha(repTxt),chat_id:chatId??null,request_sha256:sha(reqBody),response_sha256:sha(respBytes),signature_present:!!sig},null,2));
console.log(JSON.stringify(status), "chatId", !!chatId);
