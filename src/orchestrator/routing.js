export const categories=['planning','coding','debugging','testing','review'];
export function selectModels(team,category='coding',exclude=[]){
 return team.models().filter(m=>!m.evaluationScoped&&m.available&&m.classification==='free'&&m.roles.includes(category)&&!exclude.includes(m.key)).map(m=>{
  const health=team.db.prepare('SELECT * FROM team_model_health WHERE model_key=?').get(m.key);
  const cooldown=team.db.prepare('SELECT cooldown_until FROM team_provider_limits WHERE provider_id=?').get(m.provider);
  return {...m,retryAt:Math.max(health?.retry_at||0,cooldown?.cooldown_until||0),score:(m.roles[0]===category?10:0)+(m.key==='groq'?5:0)-(health?.failures||0)};
 }).filter(m=>m.retryAt<=Date.now()).sort((a,b)=>b.score-a.score);
}
