import {ProviderAdapter} from '../providers/adapter.js';
// Only the two official read-only endpoints are used. No generation permission is implied.
export async function checkDeepSeek(settings,fetchImpl,timeout=15000){
 const result={checkedAt:new Date().toISOString(),httpStatus:null,balanceStatus:null,modelIds:[],balance:null};
 if(!settings.key)return {...result,error:'missing_key'};
 const adapter=new ProviderAdapter({...settings,model:settings.model||'deepseek-flash',free:true,disabledReason:null},{fetchImpl,timeout,tokenLimit:1});
 try{const data=await adapter.request(settings.base+'/models');result.httpStatus=200;result.modelIds=['deepseek-flash','deepseek-v4-pro'].filter(id=>data?.data?.some(m=>m.id===id));}catch(e){result.httpStatus=e.httpStatus||null;result.error=e.code||'connection_failed';}
 try{const data=await adapter.request(settings.base+'/user/balance');result.balanceStatus=200;const usd=data?.balance_infos?.find(b=>b.currency==='USD'),amount=typeof usd?.total_balance==='string'&&usd.total_balance.trim()?Number(usd.total_balance):NaN;if(Number.isFinite(amount)&&amount>=0&&amount<=1e12)result.balance={available_usd:amount,checked_at:result.checkedAt,usable:data.is_available===true};}catch(e){result.balanceStatus=e.httpStatus||null;}
 return result;
}
