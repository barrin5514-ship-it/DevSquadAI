// Conditional free access: these are documented candidates, never activation decisions.
export const expansion = Object.freeze({
 gemini:{name:'Google Gemini',model:'gemini-3.8-flash',context:1048576,maxOutput:65536,plan:'google_free',roles:['coding','debugging','testing','planning'],source:'https://ai.google.dev/gemini-api/docs/pricing',publicFree:true},
 mistral:{name:'Mistral AI',model:'codestral-2508',context:128000,maxOutput:4096,plan:'mistral_free',roles:['coding','debugging','testing','planning'],source:'https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key',publicFree:true},
 nvidia:{name:'NVIDIA NIM',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',context:262144,maxOutput:4096,plan:'nvidia_developer_trial',roles:['debugging','coding','testing','planning'],source:'https://docs.api.nvidia.com/nim/docs/faq',publicFree:true},
 cloudflare:{name:'Cloudflare Workers AI',model:'@cf/qwen/qwen2.5-coder-32b-instruct',context:32768,maxOutput:4096,plan:'cloudflare_workers_free',roles:['coding','debugging','testing','planning'],source:'https://developers.cloudflare.com/workers-ai/platform/pricing/',publicFree:true}
});
export const expansionKeys=Object.keys(expansion);
