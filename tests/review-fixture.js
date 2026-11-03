// Explicit mocked paid consent for workflow tests only; never uses a real key or fetch.
export const report=(decision='approved')=>({decision,findings:'Mock independent review findings',requiredCorrections:decision==='rejected'?'Handle invalid inputs and add edge tests':'',correctness:'Inspected arithmetic and edge conditions',security:'Inspected unsafe operations',requirements:'Compared requirements and draft',testCoverage:'Inspected supplied external evidence',integration:'Inspected module interface'});
export async function mockReview(team,id,decision='approved'){
 Object.assign(team.paid.settings,{key:'review-mock-key',model:'deepseek-flash',inputPrice:1,outputPrice:2});
 Object.assign(team.paid.policy,{enabled:true,requestLimit:1,dailyLimit:10,totalLimit:100,pricesVerifiedUntil:new Date(Date.now()+3600000).toISOString()});team.liveOptIn=true;
 const request=team.packet(id,{reviewer:'DeepSeek',proposedChanges:'Review current draft and evidence'}),original=team.fetch;
 team.fetch=async url=>new Response(JSON.stringify(url.endsWith('/user/balance')?{is_available:true,balance_infos:[{currency:'USD',total_balance:'100'}]}:{choices:[{message:{content:JSON.stringify(report(decision))},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:30,total_tokens:50}}));
 try{const q=team.paid.quote(id,1024,request.id);return await team.paid.execute(id,{quoteId:q.quoteId,approvedBy:'owner',confirmPaid:true,maximumUSD:q.reservedUSD},'review');}finally{team.fetch=original;}
}
