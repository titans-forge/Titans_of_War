import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

// Current production component/wrapper with controlled hooks and no DOM or
// Phaser draw. Browser QA owns actual React effects, layout and native pixels.
const hooksSource = `
let slots=[], cursor=0, pending=[], refs=[];
export function reset(){slots=[];cursor=0;pending=[];refs=[];}
export function begin(){cursor=0;refs=[];}
export function useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];}
export function useRef(value){const ref=useState(()=>({current:value}))[0];refs.push(ref);return ref;}
export function references(){return refs;}
export function useReducer(reducer,arg,init){const[value,set]=useState(()=>init?init(arg):arg);return[value,action=>set(previous=>reducer(previous,action))];}
export function useMemo(fn){return fn();}
export function useCallback(fn){return fn;}
export function useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((value,j)=>!Object.is(value,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
export function flush(){const tasks=pending;pending=[];tasks.forEach(task=>task());}
export function dispose(){slots.forEach(slot=>slot?.cleanup?.());reset();}
export function forwardRef(fn){return fn;}
export function useImperativeHandle(ref,fn){useEffect(()=>{ref.current=fn();return()=>{ref.current=null;};});}
`;

export const findNodes = (tree, predicate) => {
  if (Array.isArray(tree)) return tree.flatMap(child => findNodes(child, predicate));
  if (!tree?.props) return [];
  return [...(predicate(tree) ? [tree] : []), ...findNodes(tree.props.children, predicate)];
};

export async function createDisplayHarness(root, { wrapper = false } = {}) {
  const cacheDir = mkdtempSync(join(tmpdir(), 'civil-display-'));
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: { getItem: () => '1' }, location: { search: '' },
    matchMedia: () => ({ matches: false }) };
  const vite = await createServer({ root, configLoader: 'native', cacheDir,
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom', logLevel: 'silent', plugins: [{ name: 'battle-display-current-source', enforce: 'pre',
      resolveId(id) {
        if (id === 'virtual:display-hooks') return '\0display-hooks';
        if (id === 'phaser' || id === 'virtual:display-phaser') return '\0display-phaser';
        if (!wrapper && id.endsWith('/battle/CivilWarBattlefield.jsx')) return '\0display-field';
      },
      load(id) {
        if (id === '\0display-hooks') return hooksSource;
        if (id === '\0display-field') return 'export function CivilWarBattlefield(){return null;}';
        if (id === '\0display-phaser') return 'export const games=[]; export default {Scene:class{},CANVAS:1,Scale:{RESIZE:1},Game:class{constructor(config){this.config=config;games.push(this);}destroy(){this.destroyed=true;}}};';
      },
      transform(code, id) {
        if (id.endsWith('/src/components/CivilWarBattleEncounter.jsx') || id.endsWith('/src/battle/CivilWarBattlefield.jsx')) {
          return code.replace("from 'react';", "from 'virtual:display-hooks';")
            .replace("from 'phaser';", "from 'virtual:display-phaser';");
        }
      },
    }],
  });
  try {
    const hooks = await vite.ssrLoadModule('virtual:display-hooks');
    const module = await vite.ssrLoadModule(wrapper ? '/src/battle/CivilWarBattlefield.jsx' : '/src/components/CivilWarBattleEncounter.jsx');
    const phaser = wrapper ? await vite.ssrLoadModule('virtual:display-phaser') : null;
    return { hooks, module, games: phaser?.games, async close() {
      hooks.dispose(); await vite.close(); rmSync(cacheDir, { recursive: true, force: true });
      if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    } };
  } catch (error) {
    await vite.close(); rmSync(cacheDir, { recursive: true, force: true });
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    throw error;
  }
}
