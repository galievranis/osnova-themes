/* Each display mode owns its schemes and remembers its own selection. */
(function(scope){
 function createState(defaults,stored,legacy){
  if(stored?.version===3&&['light','dark'].every(m=>Array.isArray(stored.schemes?.[m])&&stored.schemes[m].length&&stored.schemes[m].every(t=>typeof t.name==='string'&&t.tokens&&typeof t.tokens==='object'))){
   const state=structuredClone(stored);for(const m of ['light','dark'])if(!state.schemes[m].some(t=>t.id===state.selected?.[m])){state.selected??={};state.selected[m]=state.schemes[m][0].id}state.mode=state.mode==='dark'?'dark':'light';return state;
  }
  const state={version:3,mode:'light',selected:{},schemes:{light:[],dark:[]}};
  for(const m of ['light','dark']){
   state.schemes[m]=legacy?.themes?.length?legacy.themes.map(t=>({id:t.id,name:t.name,tokens:{...defaults[m],...t[m]}})):[{id:'classic',name:'Классика',tokens:{...defaults[m]}}];
   state.selected[m]=state.schemes[m].some(t=>t.id===legacy?.id)?legacy.id:state.schemes[m][0].id;
  }
  return state;
 }
 scope.ThemeSchemes={createState};
})(globalThis);
