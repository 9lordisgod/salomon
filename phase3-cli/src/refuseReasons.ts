/** Plain-language explanations of sanitizer refuse codes, written for journalists. Never includes content. */
const PLAIN: Record<string, string> = {
  "secret:pem_private_key": "That looks like a private key, so I won’t send it to the model.",
  "secret:hex_key_64+": "That contains a long hex string that could be a secret key, so I won’t send it to the model.",
  "secret:ed25519_secret": "That looks like a wallet secret key, so I won’t send it to the model.",
  "secret:api_key_sk": "That looks like an API key (starts with “sk-”), so I won’t send it to the model.",
  "secret:api_key_assignment": "That looks like an API key or password setting, so I won’t send it to the model.",
  "secret:base64_blob": "That contains a long encoded blob that could hide a secret or file, so I won’t send it to the model.",
  "secret:bip39_like_12+_word_run": "That looks like a recovery phrase (a long run of random words), so I won’t send it to the model.",
  "secret:key_material_in_context": "That looks like key material (a private key or seed phrase), so I won’t send it to the model.",
  "address_present_mode_reject": "That contains an account or wallet address, and this mode doesn’t allow sending addresses.",
  "non_string_input": "I can only take plain text questions.",
};
export function explainOne(code: string): string {
  if (PLAIN[code]) return PLAIN[code];
  if (code.startsWith("internal_error:")) return "Something went wrong while checking your question, so I stopped to be safe. Nothing was sent.";
  if (code.startsWith("bad_mode:")) return "The privacy check was misconfigured, so I stopped to be safe. Nothing was sent.";
  return "Your question tripped a privacy check, so I didn’t send it to the model.";
}
export function explainRefuse(reasons: string[]): string {
  const lines = [...new Set(reasons.map(explainOne))];
  if (!lines.length) lines.push(explainOne("unknown"));
  return [...lines, "Remove that part and ask again — nothing was sent."].join("\n");
}
