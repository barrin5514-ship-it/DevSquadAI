import {StringDecoder} from 'node:string_decoder';

const finishReasons=new Set(['stop','length','tool_calls','function_call','content_filter','insufficient_system_resource']);

// Keep only visible answer text in memory. Diagnostics contain fixed labels and flags.
export function deepseekStream(onProgress=()=>{}){
 let pending='',text='',usage=null,finish=null,model=null,done=false,bytes=0,last=0,failedCheck=null;
 const decoder=new StringDecoder('utf8');
 const fail=(check,message)=>{failedCheck=check;const error=Error(message);error.code=check;throw error;};
 const ANSWER_LIMIT=512000,RAW_LIMIT=2000000;
 let answerBytes=0,rawBytes=0;
 return {
  metadata(){return {failedCheck,completionObserved:done,finishReason:finishReasons.has(finish)?finish:finish===null?null:'unrecognized',usageReported:usage!==null,visibleAnswerBytes:answerBytes,rawStreamBytes:rawBytes,limits:{answer:ANSWER_LIMIT,raw:RAW_LIMIT}};},
  observedUsage(expectedModel){
   if(model!==expectedModel||!usage)return null;
   const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
   const observed={input:count(usage.prompt_tokens),output:count(usage.completion_tokens),total:count(usage.total_tokens)};
   return Object.values(observed).some(n=>n!==null)?observed:null;
  },
  write(value){
   rawBytes+=value.length;if(rawBytes>RAW_LIMIT)fail('body_limit','Raw stream exceeded its bounded safety limit');
   pending+=decoder.write(value);const lines=pending.split('\n');pending=lines.pop();
   for(const line of lines){
    if(!line.startsWith('data:'))continue;
    const raw=line.slice(5).trim();if(raw==='[DONE]'){done=true;continue;}if(!raw)continue;
    let data;try{data=JSON.parse(raw);}catch(error){failedCheck='event_json';throw error;}
    if(data.error)fail('stream_error','Provider stream error');
    if(data.model)model=data.model;if(data.usage)usage=data.usage;
    const choice=data.choices?.[0];if(choice?.delta?.tool_calls)fail('unexpected_tools','Unexpected tool activity');
    if(typeof choice?.delta?.content==='string'){
     answerBytes+=Buffer.byteLength(choice.delta.content,'utf8');if(answerBytes>ANSWER_LIMIT)fail('answer_limit','Visible answer exceeded its bounded response limit');
     text+=choice.delta.content;
    }
    if(choice?.finish_reason)finish=choice.finish_reason;
    if(text.length-last>=128){last=text.length;onProgress({progress:'Received '+text.length+' visible-answer characters; waiting for the complete response.',receivedCharacters:text.length});}
   }
  },
  end(){
   if(!done||!finish)fail(!done?'missing_done':'missing_finish_reason','Stream ended without confirmed completion');
   return {model,usage,choices:[{finish_reason:finish,message:{content:text}}]};
  }
 };
}
