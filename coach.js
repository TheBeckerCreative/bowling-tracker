/* Shared, deterministic shot analysis. No network or storage access. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BowlingCoach=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(+v)?+v:null;
const clean=s=>{let t=number(s.target),a=number(s.actual);return t!==null&&a!==null&&Math.abs(a-t)<=1&&!/pull|push/i.test(s.execution||'')};
function buildContext(state,current){
 const fields=['game','frame','ball','lane','ballName','feet','target','actual','reaction','execution','speedTag','speed','left'];
 const shot=s=>Object.fromEntries(fields.map(k=>[k,s[k]??null]));
 const first=state.shots.filter(s=>+s.ball===1),recent=[];
 // A ball change starts a new comparison window, even when it happened on the other lane.
 for(let i=first.length-1;i>=0;i--){if(first[i].ballName!==current.ballName)break;recent.unshift(first[i]);}
 const laneShots=recent.filter(s=>+s.lane===+current.lane),anchor=laneShots.at(-1),comparable=[];
 for(let i=laneShots.length-1;i>=0;i--){let s=laneShots[i];if(s.feet!==anchor.feet||s.target!==anchor.target)break;comparable.unshift(s);}
 return {version:1,current:{game:+current.game,lane:+current.lane,frame:+current.frame||null,ballName:String(current.ballName||''),feet:number(current.feet),target:number(current.target)},summary:{recordedShots:state.shots.length,firstBalls:first.length},recentLaneShots:laneShots.slice(-6).map(shot),comparableShots:comparable.slice(-6).map(shot),otherLaneRecent:recent.filter(s=>+s.lane!==+current.lane).slice(-4).map(shot)};
}
function analyze(context){
 const a=context.comparableShots||[],r=context.recentLaneShots||[],c=context.current;
 const evidence=a.map(s=>`G${s.game} F${s.frame}: ${s.feet}/${s.target}/${s.actual??'—'} · ${s.reaction||'reaction unrecorded'}${s.speedTag?' · '+s.speedTag:''}${s.speed?' · '+s.speed+' mph':''}`);
 const result=(kind,title,observation,action,question,confidence='Low',move=null)=>({kind,title,observation,action,question,confidence,move,evidence,lane:c.lane,ballName:c.ballName,comparisonCount:a.length});
 if(!r.length)return result('insufficient','Build a lane read',`No first-ball shots with ${c.ballName} are available on lane ${c.lane} since the latest ball change.`,`Record two or three first balls on this lane, including actual arrow hit and reaction. Keep your comfortable starting line.`,'What are you seeing: high, light, or a targeting problem?');
 if(!a.length||+c.feet!==+a.at(-1).feet||+c.target!==+a.at(-1).target)return result('changed','Give the new line a chance','Your current feet or target differs from the last recorded line.','Try one normal-tempo shot on this line and log its actual arrow hit and reaction before changing again.','Did you intentionally change your line?');
 const latest=a.slice(-3),accurate=latest.filter(clean),misses=latest.filter(s=>!clean(s)&&number(s.actual)!==null&&number(s.target)!==null&&Math.abs(+s.actual-+s.target)>1);
 if(latest.filter(s=>number(s.actual)===null||number(s.target)===null).length>=2)return result('insufficient','Record the arrow hit','The recent shots are missing target or actual-hit measurements.','Record where the next shot crosses the arrows. That will help separate an execution miss from a changing lane.','Did the ball cross your intended target?');
 if(misses.length>=2||latest.filter(s=>/pull|push/i.test(s.execution||'')).length>=2)return result('execution','Settle the target first','At least two recent shots missed the intended target or were tagged Pulled/Pushed.','Keep your line for the next shot. Use one target and your comfortable tempo, then evaluate the reaction on an accurately targeted shot.','Were you rushing the approach?','Moderate');
 const speeds=latest.map(s=>s.speedTag||(/^(Slow|Fast)$/.test(s.execution||'')?s.execution:''));
 if(speeds.includes('Slow')||speeds.includes('Fast'))return result('speed','Check tempo before moving','A recent shot was tagged Slow or Fast, which makes lane-transition advice less certain.','Repeat your normal tempo and record the next arrow hit and reaction before changing feet or target.','Did the next normal-speed shot react the same way?','Moderate');
 if(accurate.length>=2){let last=latest.slice(-2);if(last.every(clean)){
 let speedKnown=last.every(s=>s.speedTag==='Normal')||(last.every(s=>number(s.speed)!==null)&&Math.abs(+last[0].speed-+last[1].speed)<=0.5);
 if(last.every(s=>s.reaction==='High')){
  if(!speedKnown)return result('check','Repeated high hits; check speed','The last two shots on this line were accurately targeted and tagged High. Speed consistency is unconfirmed.','Keep your usual tempo for one more shot and tag Normal, Slow, or Fast. A lane change is possible, but speed or release may also explain the high hits.','Was the ball hooking earlier, or was the shot slower?','Moderate');
  const feet=number(c.feet);let move=feet!==null&&feet<=38?{feet:feet+1,target:+c.target}:null;
  return result('adjust','Test a small move left','The last two accurately targeted shots on this line were High with consistent recorded speed. This may indicate changing reaction; it does not prove oil transition.',move?`Move your feet physically LEFT one board: ${feet} → ${move.feet}. Keep your target at ${c.target}, ball, and normal tempo. Evaluate the next accurately targeted shot.`:'Keep the line comfortable; ask for help choosing a new line before moving farther left.','Did the next shot finish closer to the pocket?','Moderate',move);
 }
 if(last.every(s=>s.reaction==='Light'||s.reaction==='No recovery'))return result('light','Repeated light or weak recovery','The last two accurately targeted shots were Light or No recovery. These tags alone cannot tell whether the ball skidded too far or lost energy early.','Hold off on an automatic move. Watch when the ball starts hooking on the next normal-tempo shot.','Does it skid past the breakpoint, or hook early and then roll weakly?','Moderate');
 if(last.every(s=>s.reaction==='Flush'))return result('hold','Keep the working line','Your last two accurately targeted shots were tagged Flush. A standing corner pin alone is not enough reason to move.','Stay with this line and normal tempo. Focus on repeating the shot.','', 'Moderate');
 }}
 return result('observe','One repeatable shot first',`There is not yet a consistent pattern among ${a.length} comparable first balls on this lane.`,`Keep the next shot simple: same comfortable line and normal tempo. Record actual arrow hit and reaction.`,'What is the main issue you want help with?');
}
return {buildContext,analyze};
});
