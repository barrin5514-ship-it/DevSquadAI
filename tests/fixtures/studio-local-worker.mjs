// Trusted deterministic fixture. This is not DeepSeek, Codex or Claude.
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const packet=JSON.parse(raw),phase=packet.phase;
console.log(JSON.stringify({type:'local_progress',message:'LOCAL WORKER SIMULATION: '+phase+' process received the packet.'}));
const code='export function add(a,b){if(!Number.isFinite(a)||!Number.isFinite(b))throw new TypeError("Use finite numbers");return a+b;}';
const tests='import {test} from "node:test";import assert from "node:assert/strict";import {add} from "../src/add.mjs";test("integers",()=>assert.equal(add(2,3),5));test("decimal tolerance",()=>assert.ok(Math.abs(add(.1,.2)-.3)<1e-12));for(const value of ["1",null,undefined,NaN,Infinity,-Infinity])test("reject invalid "+String(value),()=>assert.throws(()=>add(value,1),TypeError));';
const result=phase==='builder'?{report:'LOCAL WORKER SIMULATION: supplied add source; no AI called.',files:[{path:'src/add.mjs',content:code}],review:null}:phase==='tester'?{report:'LOCAL WORKER SIMULATION: supplied eight independent test cases. The app must execute them.',files:[{path:'test/add.test.mjs',content:tests}],review:null}:{report:'LOCAL WORKER SIMULATION: reviewed supplied test evidence; did not execute tests.',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Local fixture review, not AI evidence.',findings:[]}};
await new Promise(resolve=>setTimeout(resolve,100));
console.log(JSON.stringify({type:'local_result',result}));
