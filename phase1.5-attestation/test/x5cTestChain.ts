// TEST-ONLY synthetic cert chain (root → intermediate → P-384 leaf) built with openssl at test time.
// NOT an NVIDIA fixture; never pinned in src. Pins are injected via `x5cPins` in tests only.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, createPrivateKey, X509Certificate, type KeyObject } from "node:crypto";

export interface TestChain { leafKey: KeyObject; leafB64: string; interB64: string; rootB64: string; interSpki: string; rootSpki: string }
const ossl = (d: string, ...a: string[]) => execFileSync("openssl", a, { cwd: d, stdio: ["ignore", "pipe", "pipe"] });
const b64 = (d: string, f: string) => new X509Certificate(readFileSync(join(d, f))).raw.toString("base64");
const spki = (d: string, f: string) => createHash("sha256").update(new X509Certificate(readFileSync(join(d, f))).publicKey.export({ type: "spki", format: "der" })).digest("hex");

export function makeTestChain(tag = "t", leafSubj = `/C=US/O=NVIDIA Corporation/CN=Test Leaf ${tag}`): TestChain {
  const d = mkdtempSync(join(tmpdir(), "x5c-"));
  writeFileSync(join(d, "ca.ext"), "basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n");
  writeFileSync(join(d, "leaf.ext"), "basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n");
  for (const k of ["root", "inter", "leaf"]) ossl(d, "ecparam", "-name", "secp384r1", "-genkey", "-noout", "-out", `${k}.key`);
  ossl(d, "req", "-x509", "-new", "-key", "root.key", "-subj", `/CN=Test Root ${tag}`, "-days", "3", "-out", "root.pem", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign");
  ossl(d, "req", "-new", "-key", "inter.key", "-subj", `/CN=Test Intermediate ${tag}`, "-out", "inter.csr");
  ossl(d, "x509", "-req", "-in", "inter.csr", "-CA", "root.pem", "-CAkey", "root.key", "-CAcreateserial", "-days", "2", "-extfile", "ca.ext", "-out", "inter.pem");
  ossl(d, "req", "-new", "-key", "leaf.key", "-subj", leafSubj, "-out", "leaf.csr");
  ossl(d, "x509", "-req", "-in", "leaf.csr", "-CA", "inter.pem", "-CAkey", "inter.key", "-CAcreateserial", "-days", "1", "-extfile", "leaf.ext", "-out", "leaf.pem");
  return { leafKey: createPrivateKey(readFileSync(join(d, "leaf.key"))), leafB64: b64(d, "leaf.pem"), interB64: b64(d, "inter.pem"), rootB64: b64(d, "root.pem"),
    interSpki: spki(d, "inter.pem"), rootSpki: spki(d, "root.pem") };
}
