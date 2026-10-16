import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreferences, DEFAULT_PREFERENCES } from '../src/lib/preferences.ts';
import { buildOpenRouterMessages } from '../src/utils/promptAssembler.ts';
const chat = { id: 'chat', messages: Array.from({length:20},(_,i)=>({senderId:'user',content:`Message ${i}`})), pluginIds:[] };
const params = { chat, characters: [], persona: null, lorebooks: [], plugins: [] };
test('import clamps numbers and rejects unexpected values and keys', () => {
 const p=normalizePreferences({fontSize:999,contextMessages:0,theme:'evil',accent:'url(javascript:)',cloudSync:'false',apiKey:'secret'});
 assert.equal(p.fontSize,24);assert.equal(p.contextMessages,5);assert.equal(p.theme,'colorpop');assert.equal(p.accent,DEFAULT_PREFERENCES.accent);assert.equal(p.cloudSync,true);assert.equal(p.apiKey,undefined);
});
test('context limit includes most recent messages in order', () => {
 const out=buildOpenRouterMessages({...params,preferences:normalizePreferences({contextMessages:5})});
 assert.equal(out.length,6);assert.equal(out[1].content,'Message 15');assert.equal(out[5].content,'Message 19');
});
test('memory includes only shared or active-chat notes and honors off',()=>{
 const notes=[{title:'Here',content:'current',chatId:'chat'},{title:'Other',content:'private elsewhere',chatId:'other'},{title:'World',content:'global'}];
 const enabled=buildOpenRouterMessages({...params,preferences:normalizePreferences({}),storyMemories:notes})[0].content;
 assert.match(enabled,/Here: current/);assert.match(enabled,/World: global/);assert.doesNotMatch(enabled,/private elsewhere/);
 const disabled=buildOpenRouterMessages({...params,preferences:normalizePreferences({memoryEnabled:false}),storyMemories:notes})[0].content;
 assert.doesNotMatch(disabled,/SAVED STORY NOTES/);
});
test('narrator and NPC settings reach the actual system prompt',()=>{
 const system=buildOpenRouterMessages({...params,preferences:normalizePreferences({narratorEnabled:false,npcAutonomy:false})})[0].content;
 assert.match(system,/omit standalone narrator/);assert.match(system,/Do not introduce new NPC actions/);
});
