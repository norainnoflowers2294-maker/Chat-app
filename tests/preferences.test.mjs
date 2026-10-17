import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('roleplay defaults clamp to supported values and preserve the always-on agency rule', () => {
 const prefs=normalizePreferences({customResponseWords:5000,dialogueBalance:-10,scenePacing:'impossible',npcActivity:'high',neverSpeakForUser:false});
 assert.equal(prefs.customResponseWords,1500);
 assert.equal(prefs.dialogueBalance,0);
 assert.equal(prefs.scenePacing,'balanced');
 assert.equal(prefs.npcActivity,'high');
 const system=buildOpenRouterMessages({...params,preferences:prefs})[0].content;
 assert.match(system,/Never impersonate the user/);
});
test('custom response target and roleplay controls are assembled into the real system prompt', () => {
 const character={id:'lucious',name:'Lucious',pov:'first_person',personality:'Reserved'};
 const currentChat={...chat,replyLength:'custom',customResponseWords:320,dialogueBalance:70,scenePacing:'slow_burn',npcActivity:'high',knowledgeBoundaries:true,relationshipContinuity:true,naturalSpeech:true,reduceRepetition:true,realisticReactions:true};
 const system=buildOpenRouterMessages({...params,chat:currentChat,characters:[character],preferences:normalizePreferences({})})[0].content;
 assert.match(system,/about 320 words/);
 assert.match(system,/70% description, 30% dialogue/);
 assert.match(system,/Use slow-burn pacing/);
 assert.match(system,/Let relevant NPCs act and speak independently/);
 assert.match(system,/may only know what they witnessed/);
 assert.match(system,/Carry forward established changes in trust/);
 assert.match(system,/first person as the responding character/);
});

test('pinned story memory is preferred in prompt assembly', () => {
 const notes=[
  {id:'old',title:'Ordinary',content:'ordinary note',createdAt:'2025-01-01',chatId:'chat'},
  {id:'pin',title:'Pinned promise',content:'do not forget the promise',createdAt:'2024-01-01',chatId:'chat',pinned:true},
 ];
 const system=buildOpenRouterMessages({...params,preferences:normalizePreferences({memoryDepth:'light'}),storyMemories:notes})[0].content;
 assert.match(system,/Pinned promise: do not forget the promise/);
});
test('mobile settings keeps tabs, content scrolling, and save controls in separate regions', () => {
 const component=readFileSync(new URL('../src/components/PreferencesPanel.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/components/preferences.css',import.meta.url),'utf8');
 assert.match(component,/scrollIntoView\(\{ block: 'nearest', inline: 'nearest'/);
 assert.match(component,/aria-pressed=\{tab === i\}/);
 assert.match(css,/\.cp-preferences nav\{[^}]*overflow-x:auto/);
 assert.match(css,/\.cp-preferences main\{[^}]*overflow-y:auto/);
 assert.match(css,/\.cp-preferences footer/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});
test('story memories can be edited and pinned through persistent upsert handler', () => {
 const modal=readFileSync(new URL('../src/components/StoryNotesModal.tsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(modal,/Edit Memory Note/);
 assert.match(modal,/Pin memory/);
 assert.match(app,/existing\.some\(\(item\) => item\.id === memory\.id\)/);
});
