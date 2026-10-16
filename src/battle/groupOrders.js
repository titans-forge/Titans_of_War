import { landmarkField, landmarkDestinationError } from './historicalLandmarks.js';
import { gettysburgClearance } from './gettysburgMechanics.js';
const ORDERS = ['move', 'hold', 'advance', 'assault', 'fallback', 'rally', 'withdraw'];
const available = (u, order) => u?.active && u.side === 'confederate' && u.strength > 0 && !['broken', 'surrendered'].includes(u.status) && (order === 'rally' || u.status !== 'routing') && (order !== 'assault' || u.type === 'infantry');

export function previewGroupOrder(snapshot, request, world) {
  const fail = error => ({ error });
  if (!snapshot || snapshot.resolving || snapshot.training?.complete || snapshot.outcome !== 'undecided') return fail('The battle is not accepting orders.');
  if (!snapshot.gettysburg && !snapshot.fieldBattle) return fail('Group orders require the updated field mechanics.');
  const ids = request?.ids;
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 8 || new Set(ids).size !== ids.length) return fail('Choose two to eight different formations.');
  if (!ORDERS.includes(request.order)) return fail('Choose a supported group order.');
  const units = ids.map(id => snapshot.formations.find(u => u.id === id));
  const unavailable = units.findIndex(u => !available(u, request.order));
  if (unavailable >= 0) return fail(`${units[unavailable]?.name || 'A selected formation'} cannot receive ${request.order}. Remove it or choose another order.`);
  const sectors = (snapshot.gettysburg || snapshot.fieldBattle).sectors;
  if (request.order === 'assault' && !sectors.some(s => s.id === request.sectorId)) return fail('Choose an assault sector.');
  let sorted = [...units].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  let points = [];
  if (request.order === 'move') {
    if (!Number.isFinite(request.point?.x) || !Number.isFinite(request.point?.y)) return fail('Enter a finite destination for the group center.');
    if (!['line', 'preserve'].includes(request.layout)) return fail('Choose a line or preserve the current spacing.');
    const angle = request.lineAngle ?? 0;
    if(request.layout==='line' && !Number.isFinite(angle)) return fail('Choose a finite line direction.');
    const dx = Math.cos(angle), dy = Math.sin(angle);
    if(request.layout==='line') sorted = [...units].sort((a,b)=>(a.x-b.x)*dx+(a.y-b.y)*dy || a.id.localeCompare(b.id));
    const center = units.reduce((p, u) => ({x:p.x+u.x/units.length,y:p.y+u.y/units.length}),{x:0,y:0});
    const spacing = Math.max(160, ...units.map(u => Math.hypot(u.footprint?.width || 124, u.footprint?.depth || 72) + 32));
    points = sorted.map((u, i) => ({ id:u.id, name:u.name, x:Math.round(request.point.x + (request.layout === 'line' ? (i-(units.length-1)/2)*spacing*dx : u.x-center.x)), y:Math.round(request.point.y + (request.layout === 'line' ? (i-(units.length-1)/2)*spacing*dy : u.y-center.y)) }));
    if (points.some(p => p.x < 70 || p.x > world.width-70 || p.y < 45 || p.y > world.height-35)) return fail('The whole group must fit inside the field. Move its center inward or use fewer formations.');
    for (let i = 0; i < points.length; i++) {
      const error = landmarkDestinationError(landmarkField(snapshot), sorted[i], points[i]);
      if (error) return fail(`${sorted[i].name}: ${error}`);
    }
    for (let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) {
      const a={...sorted[i],...points[i]},b={...sorted[j],...points[j]};
      if(Math.hypot(a.x-b.x,a.y-b.y)<gettysburgClearance(a,b)) return fail('These destinations overlap. Use the spaced line or choose different formations.');
    }
  }
  const warnings = [];
  if (points.some(p => snapshot.formations.some(u => !ids.includes(u.id) && u.active && u.strength > 0 && !['broken','surrendered'].includes(u.status) && Math.hypot(p.x-u.x,p.y-u.y) < 100))) warnings.push('A destination is occupied or close to another formation. Movement may stop short.');
  if (request.order === 'withdraw') warnings.push('Withdraw permanently removes formations once they reach a safe exit.');
  if (request.order === 'rally') warnings.push('Each formation still needs safety, organized support, and its own recovery interval.');
  return { request: structuredClone(request), order:request.order, ids:[...ids], points, warnings, names:units.map(u=>u.name), sectorName:sectors.find(s=>s.id===request.sectorId)?.name || null };
}

export function confirmGroupOrder(engine, plan) {
  if (!plan?.request || plan.error) return { error:'Preview a valid group order first.' };
  const fresh = previewGroupOrder(engine.snapshot(), plan.request, engine.world);
  if (fresh.error) return fresh;
  if (JSON.stringify(fresh.points) !== JSON.stringify(plan.points) || JSON.stringify(fresh.warnings) !== JSON.stringify(plan.warnings)) return { error:'The formation positions changed. Preview the order again.' };
  // Preflight the entire set before issuing any order. No simulation step can
  // run between these synchronous calls; all retain normal courier delays.
  for (const id of fresh.ids) {
    if (fresh.order === 'move') { const point=fresh.points.find(p=>p.id===id);engine.move(id,{x:point.x,y:point.y}); }
    else engine.order(id, fresh.order, fresh.order === 'assault' ? {sectorId:fresh.request.sectorId} : null);
  }
  return { accepted:fresh.ids.length, message:`${fresh.order} sent to ${fresh.ids.length} formations. Couriers arrive separately; check each receipt.` };
}
