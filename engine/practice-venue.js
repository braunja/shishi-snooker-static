import { loadNativePreview } from './native-venue/loader.js';

// Loading can be detached, so a replacement is ready before the current room is removed.
export async function loadPracticeVenue({renderer, tableRoot, floor, attach=true, independentTable=false}) {
  const root = await loadNativePreview({renderer, base:'./resources/venues/crucible-v12-042/', includeTableBody:!independentTable});
  const hidden=new Map(),replaced=new Set(root.userData.replacedTableBodyNames);
  const prepared=floor.userData.venuePruning,prunedNames=prepared?.replacedGameNames;
  const prebound=Array.isArray(prunedNames)&&prunedNames.length===replaced.size&&prunedNames.every(name=>replaced.has(name));
  const rigging=new Map();
  root.traverse(node=>{if(node.userData.nativeLightmap==='irradiance-rigging.exr'||node.userData.light_cell)rigging.set(node,node.visible);});
  const report={version:'v12-042-compact',ready:false,replacedMeshes:0,runtimeLights:0,includesFloor:true,middlePocketReturnRotation:Math.PI,riggingGroups:rigging.size,riggingHidden:false};
  let disposed=false,active=false,restoreLogo=null,originalFloorVisible;
  function deactivate(){
    if(!active)return;active=false;restoreLogo?.();restoreLogo=null;
    for(const [mesh,visible]of hidden)mesh.visible=visible;hidden.clear();floor.visible=originalFloorVisible;
    delete tableRoot.userData.nativeVenue;delete tableRoot.userData.venueLabel;
    if(!independentTable){tableRoot.userData.middlePocketReturnRotation=0;delete tableRoot.userData.middlePocketReturnPivotX;}
    report.ready=false;
  }
  function activate(){
    if(disposed)throw Error('Venue disposed');if(active)return;
    originalFloorVisible=floor.visible;active=true;
    try{
      if(!independentTable){
        tableRoot.traverse(mesh=>{if(mesh.isMesh&&replaced.has(mesh.name)){hidden.set(mesh,mesh.visible);mesh.visible=false;}});
        if(!hidden.size&&!prebound)throw Error('Native venue table replacement did not bind');
        restoreLogo=root.userData.configureGameTable(tableRoot);
        tableRoot.userData.middlePocketReturnRotation=root.userData.middlePocketReturnRotation;
        tableRoot.userData.middlePocketReturnPivotX=root.userData.middlePocketReturnPivotX;
      }
      floor.visible=false;
      tableRoot.userData.nativeVenue=true;tableRoot.userData.venueLabel='原克鲁斯堡';
      Object.assign(report,{ready:true,replacedMeshes:independentTable?0:hidden.size+(prebound?prepared.removedTableMeshes:0),tableLogo:root.userData.tableLogoAudit?.()});window.practiceVenueReport=report;
    }catch(e){deactivate();throw e;}
  }
  const venue={root,report,activate,deactivate,render(camera,scene,{hideRigging=false}={}){
    if(hideRigging!==report.riggingHidden){for(const[node,visible]of rigging)node.visible=visible&&!hideRigging;report.riggingHidden=hideRigging;}
    root.userData.render(camera,scene);
  },dispose(){if(disposed)return;deactivate();disposed=true;root.userData.dispose();}};
  try{if(attach)activate();return venue;}catch(e){venue.dispose();throw e;}
}
