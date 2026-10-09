// First-play tutorial: four hands-on steps. Text is keyboard-worded; game.js rewrites it for touch or gamepad.
export const TUTORIAL=[
 {id:'move',title:'駕駛小艇',text:'用 WASD 駕駛小艇。船有慣性：先轉向再加速，放開會慢慢滑行。往前開一小段試試。',focus:'#joystick',done:(s,t)=>t.moved>=8},
 {id:'salvage',title:'打撈物資',text:'開向附近的漂流物，按 E 打撈；直接駛過也會自動拋繩。纜繩拉回來時可以繼續開船。',focus:'#interact-btn',done:s=>s.salvaged>=1},
 {id:'board',title:'登上木筏',text:'回到木筏旁邊，按 Q 登上避難所，就能在木筏上走動。',focus:'#dock-btn',done:s=>s.player.mode==='foot'},
 {id:'build',title:'擴建地基',text:'按 B 打開建造，選「浮動地基」，點綠色格子放一格。',focus:'[data-panel="build"]',done:s=>s.expanded>=1}
];
export function startTutorialState(s){s.tutorial={step:0,moved:0,done:false};return s.tutorial;}
// Advances past every step whose goal is already met. Returns the indexes completed by this call.
export function advanceTutorial(s){const t=s.tutorial;if(!t||t.done)return[];const finished=[];while(t.step<TUTORIAL.length&&TUTORIAL[t.step].done(s,t)){finished.push(t.step);t.step++;}if(t.step>=TUTORIAL.length)t.done=true;return finished;}
export const tutorialActive=s=>!!s.tutorial&&!s.tutorial.done;
