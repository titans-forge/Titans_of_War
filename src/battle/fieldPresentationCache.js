// Presentation only: commands replace the cached snapshot; advancing frames rebuild it.
// Camera and inspection changes still refresh sprites while the simulation is paused.
export class FieldPresentationCache {
  snapshot(engine, advancing) {
    if (advancing || !this.current) this.current = engine.snapshot({presentation:true});
    return this.current;
  }
  replace(snapshot) { this.current = snapshot; }
  needsFormationPass(snapshot, zoom, inspection) {
    const changed=this.rendered!==snapshot || this.zoom!==zoom || this.inspection!==inspection;
    this.rendered=snapshot;this.zoom=zoom;this.inspection=inspection;
    return changed;
  }
}
