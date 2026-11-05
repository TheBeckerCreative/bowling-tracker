const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
function boot(seed){let els={},store={'bowling-tracker-v2':JSON.stringify(seed||{date:'2026-10-28',startLane:5,shots:[]})};let el=id=>els[id]??=( {value:'',showModal(){this.open=true},close(){this.open=false},dataset:{},classList:{contains:()=>false,toggle(){}},querySelector:()=>({getBoundingClientRect:()=>({left:0,width:360})}),querySelectorAll:()=>[],click(){this.onclick?.()}});let ctx=vm.createContext({document:{getElementById:el,querySelectorAll:()=>[],createElement:()=>el('download')},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v},Date,Set,Blob,URL,setTimeout,alert:()=>{},confirm:()=>true,prompt:()=>null,window:{scrollTo(){}}});vm.runInContext(source,ctx);return {run:x=>vm.runInContext(x,ctx),store,el}}
let t=boot();const run=t.run;
run("$('lane').value='5';save('clear')");assert.equal(run('next(1).f'),2);assert.equal(run('next(1).lane'),6);
run("left=new Set([7,10]);save()");assert.equal(run('next(1).ball'),2);assert.deepEqual([...run('left')],[7,10]);run("save('missed')");assert.equal(run('state.shots.at(-1).knocked'),0);
run("$('undo').click()");assert.equal(run('next(1).ball'),2);assert.deepEqual([...run('left')],[7,10]);run("$('redo').click()");assert.equal(run('next(1).f'),3);
assert.equal(run('next(2).lane'),6);assert.equal(run('next(3).lane'),5);
for(const [rolls,expected,max] of [[Array(12).fill(10),300,300],[Array(20).fill(0),0,0],[Array(21).fill(5),150,150],[[9,0],9,279],[[9],0,290],[[10],0,300],[[10,7,3,10,9,0,10,10,8,2,9,1,10,10,10,10],215,215]]){let b=boot();b.run(`state.shots=${JSON.stringify(rolls.map(knocked=>({game:1,knocked,left:[]})))}`);assert.equal(b.run('score(1)'),expected,JSON.stringify(rolls));assert.equal(b.run('maxScore(1)'),max);}
let g=boot();for(let i=0;i<12;i++)g.run("save('clear')");assert.equal(g.run('score(1)'),300);assert.equal(g.run('activeGame'),2);assert.equal(g.run('view'),'bowl');
let h=boot();h.run("left=new Set([7]);save();save('spare')");assert.equal(h.run('state.shots[1].knocked'),1);assert.equal(h.run('next(1).f'),2);
let old={date:'2026-10-28',startLane:5,shots:[{game:1,frame:1,ball:1,lane:5,left:[7],knocked:9,feet:20,target:10}]};let migrated=boot(old);assert.deepEqual(JSON.parse(migrated.store['bowling-tracker-v3-backup']),old);migrated.run("$('newSession').click();$('archiveSet').click()");assert.equal(migrated.run('state.archives[0].shots.length'),1);assert.equal(migrated.run('state.shots.length'),0);
console.log('PASS: scoring, max score, standing-pin spares, missed all, undo/restore, game progression, lane rotation, legacy snapshot and archive preservation');

// Tenth-frame rack resets: X, 7, / and 9, /, X.
for(let sequence of [['strike','seven','spare'],['nine','spare','strike']]){let b=boot();for(let f=1;f<=9;f++){b.run("save('missed');save('missed')")};for(let step of sequence){b.run(step==='strike'?"save('clear')":step==='spare'?"save('spare')":step==='seven'?"left=new Set([7,8,9]);save()":"left=new Set([10]);save()")};assert.equal(b.run('score(1)'),20);assert.equal(b.run('activeGame'),2)}
let series=boot();for(let i=0;i<36;i++)series.run("save('clear')");assert.equal(series.run('view'),'summary');assert.equal(series.run('score(3)'),300);
let override=boot();override.run("$('lane').value='6';$('lane').onchange();reaction='High';render()");assert.equal(+override.el('lane').value,6);
for(let [pins,split] of [[[7,10],true],[[3,10],true],[[2,7],true],[[2,4,5],false],[[7],false],[[1,7,10],false]]){assert.equal(override.run(`isSplit({left:${JSON.stringify(pins)}})`),split)}
console.log('PASS: tenth-frame rack resets, end-of-series summary, lane override retention and split detection');

// Save, discard, and cancel must leave existing history and equipment intact.
for(const choice of ['archiveSet','discardSet','cancelNewSet']){let b=boot({...old,archives:[{date:'2026-10-21',shots:[],official:{1:180}}],arsenal:['Crux Prime','Hustle'],official:{1:171},activeGame:2});b.run("$('newSession').click()");assert.equal(b.el('newSetDialog').open,true);assert.equal(b.run('state.shots.length'),1);b.run(`$('${choice}').click()`);assert.equal(b.el('newSetDialog').open,false);assert.equal(b.run('state.archives.length'),choice==='archiveSet'?2:1);assert.equal(b.run('state.shots.length'),choice==='cancelNewSet'?1:0);assert.equal(b.run('activeGame'),choice==='cancelNewSet'?2:1);assert.equal(b.run('state.archives[0].official[1]'),180);assert.equal(b.run('state.arsenal[1]'),'Hustle');if(choice==='archiveSet')assert.equal(b.run('state.archives[1].official[1]'),171);if(choice!=='cancelNewSet'){let stored=JSON.parse(b.store['bowling-tracker-v2']);assert.equal(stored.shots.length,0);assert.equal(stored.archives.length,choice==='archiveSet'?2:1)}}
console.log('PASS: new-set save/discard/cancel, retained history and equipment, persisted choices');
// Independent direction/speed, per-marker controls and configurable lane pairs.
let v=boot(old);assert.equal(v.run('state.shots[0].lane'),5);
v.run("execution='On target';speedTag='Slow';$('speed').value='14.2';save('spare')");
assert.equal(v.run('state.shots.at(-1).execution'),'On target');assert.equal(v.run('state.shots.at(-1).speedTag'),'Slow');assert.equal(v.run('state.shots.at(-1).speed'),14.2);assert.equal(v.run('speedTag'),'');
v.run("vizMode='target';board={feet:20,target:13,actual:14};$('boardPlus').click()");assert.equal(v.run('board.target'),14);assert.equal(v.run('board.feet'),20);assert.equal(v.run('board.actual'),14);
v.run("vizMode='actual';board.actual=1;$('boardMinus').click()");assert.equal(v.run('board.actual'),1);v.run("board.actual=39;$('boardPlus').click()");assert.equal(v.run('board.actual'),39);
v.run("$('pairFirst').value='3';$('pairSecond').value='4';$('applyPair').click()");assert.equal(v.run('next(1).lane'),4);assert.equal(v.run('next(2).lane'),4);assert.equal(v.run('next(3).lane'),3);assert.equal(v.run('state.shots[0].lane'),5);assert.ok(v.el('analytics').innerHTML.includes('Lane 5'));
v.run("$('newSession').click();$('archiveSet').click()");assert.equal(v.run('state.archives.at(-1).lanePair[0]'),3);assert.equal(v.run('next(1).lane'),3);assert.equal(v.run('next(2).lane'),4);
v.run("$('pairFirst').value='4';$('pairSecond').value='4';$('applyPair').click()");assert.equal(v.run('state.lanePair[0]'),3);assert.ok(v.el('pairMessage').textContent.includes('different'));
let remap=boot({...old,gameStarts:{1:6}});remap.run("$('pairFirst').value='11';$('pairSecond').value='12';$('applyPair').click()");assert.equal(remap.run('state.gameStarts[1]'),12);assert.equal(remap.run('next(1).lane'),12);
for(const [rolls,expected] of [[[9,1,10,9,1,9,1,9,0,9,1,9,1,10,10,6,2],178],[[10,10,9,1,9,1,6,2,10,9,1,10,9,0,10,7,3],180],[[9,1,10,10,10,7,0,10,10,10,9,1,6,0],202]]){let b=boot();b.run(`state.shots=${JSON.stringify(rolls.map(knocked=>({game:1,knocked,left:[]})))}`);assert.equal(b.run('score(1)'),expected)}
console.log('PASS: independent direction/speed, marker boundaries, lane-pair rotation and archives, legacy lane retention, and all three verified league scores');
