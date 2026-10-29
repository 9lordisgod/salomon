/** M4 G2: there is NO execute/sign/settle/broadcast/simulate path. Every entry point throws NotImplemented. */
import { NotImplemented } from "./types.js";
export function executeIntent(..._a: unknown[]): never { throw new NotImplemented("execute_intents"); }
export function signDraft(..._a: unknown[]): never { throw new NotImplemented("sign"); }
export function broadcast(..._a: unknown[]): never { throw new NotImplemented("broadcast"); }
export function simulateIntents(..._a: unknown[]): never { throw new NotImplemented("simulate_intents (forbidden until G3)"); }
export function requestMpcSignature(..._a: unknown[]): never { throw new NotImplemented("mpc_sign"); }
