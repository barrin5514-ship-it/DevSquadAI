// This validates a disposable capability answer, not a project approval or a
// worker-registration receipt. Behavior tests must still run independently.
export function capabilityReview(text) {
 let value;try{value=JSON.parse(text);}catch{throw Error('Capability response is not JSON');}
 if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!=='code,edgeCase,explanation,improvement,tests' ||
    !['code','edgeCase','explanation','improvement'].every(k=>typeof value[k]==='string'&&value[k].trim()) ||
    !Array.isArray(value.tests)||value.tests.length!==2||!value.tests.every(t=>typeof t==='string'&&t.trim())||value.tests[0]===value.tests[1])
  throw Error('Incomplete capability-review structure');
 return value;
}
export function roleCapabilityStatus(evidence={}) {
 const blocked={builder:'BLOCKED',tester:'BLOCKED',reviewer:'BLOCKED'};
 if(!evidence.probe?.complete||!evidence.probe.structuredValid||!evidence.probe.behaviorVerified)return blocked;
 // One generic coding answer does not qualify every production role.
 return {
  builder:evidence.contracts?.builder&&evidence.artifactsVerified?'VERIFIED':'NOT VERIFIED',
  tester:evidence.contracts?.tester&&evidence.independentRunnerVerified?'VERIFIED':'PARTIALLY VERIFIED',
  reviewer:evidence.contracts?.reviewer&&evidence.bindingVerified&&evidence.independenceVerified?'VERIFIED':'NOT VERIFIED'
 };
}

// The existing adapter accepts TWO strings, not a prompt object. Check the
// diagnostic caller before it can spend an authorized provider request.
export async function requestCapabilityReview(adapter,prompt) {
 if(typeof prompt?.system!=='string'||!prompt.system.trim()||typeof prompt?.user!=='string'||!prompt.user.trim())
  throw Error('Capability prompt requires separate nonempty system and user strings');
 const result=await adapter.generate(prompt.system,prompt.user);
 return {...result,review:capabilityReview(result.text)};
}
