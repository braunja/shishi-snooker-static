import * as THREE from 'three';

const labels = {
  'middle-top': 'X+Y0',
  'middle-bottom': 'X-Y0',
  'corner-top-right': 'X+Y-',
  'corner-bottom-right': 'X-Y-',
  'corner-bottom-left': 'X-Y+',
  'corner-top-left': 'X+Y+',
};

function worldTriangles(root) {
  const triangles = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const {attributes, index} = mesh.geometry;
    const vertex = i => new THREE.Vector3()
      .fromBufferAttribute(attributes.position, index ? index.getX(i) : i)
      .applyMatrix4(mesh.matrixWorld);
    for (let i = 0; i < (index?.count ?? attributes.position.count); i += 3) {
      triangles.push(new THREE.Triangle(vertex(i), vertex(i + 1), vertex(i + 2)));
    }
  });
  return triangles;
}

function rodSections(triangles, x) {
  const points = [];
  for (const {a, b, c} of triangles) {
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      if ((from.x <= x) !== (to.x <= x)) {
        points.push(from.clone().lerp(to, (x - from.x) / (to.x - from.x)));
      }
    }
  }
  points.sort((a,b) => a.z - b.z);
  const sections = [];
  let lastZ = -Infinity;
  for (const point of points) {
    if (point.z - lastZ > .01) sections.push(new THREE.Box3());
    sections.at(-1).expandByPoint(point);
    lastZ = point.z;
  }
  if (sections.length !== 3) return null;
  return sections.map(box => ({
    center: box.getCenter(new THREE.Vector3()),
    radius: (box.max.z - box.min.z) / 2,
  }));
}

// Rebuilt rails have three separate steel rods, with a straight downhill
// section along world X and a keeper at the far end. Use the exported meshes
// in game coordinates so the return needs no V1 offsets or mirror rules.
export function measureRebuiltReturns(tableRoot, radius) {
  const parts = new Map();
  tableRoot?.traverse(node => {
    const name = node.userData.name || node.name;
    if (/^(回球轨|回球轨支架|袋口黄铜环) · X[+-]Y[+0-]$/.test(name)) parts.set(name, node);
  });
  if (!Object.values(labels).some(label => parts.has('回球轨 · ' + label))) return null;

  const routes = new Map();
  const closest = new THREE.Vector3();
  for (const [id, label] of Object.entries(labels)) {
    const rail = parts.get('回球轨 · ' + label);
    const keeper = parts.get('回球轨支架 · ' + label);
    const ring = parts.get('袋口黄铜环 · ' + label);
    if (!rail || !keeper || !ring) throw new Error('V2 集球器部件缺失：' + label);
    const railBounds = new THREE.Box3().setFromObject(rail);
    const ringBounds = new THREE.Box3().setFromObject(ring);
    const mouth = ringBounds.getCenter(new THREE.Vector3());
    const tailX = Math.abs(railBounds.min.x - mouth.x) > Math.abs(railBounds.max.x - mouth.x)
      ? railBounds.min.x : railBounds.max.x;
    const railTriangles = worldTriangles(rail);
    const keeperTriangles = worldTriangles(keeper);
    const x0 = THREE.MathUtils.lerp(mouth.x, tailX, .18);
    const x1 = THREE.MathUtils.lerp(mouth.x, tailX, .65);
    const rods0 = rodSections(railTriangles, x0);
    const rods1 = rodSections(railTriangles, x1);
    if (!rods0 || !rods1) throw new Error('V2 集球器滑轨截面不完整：' + label);

    const z = rods0[1].center.z;
    const slopes = rods0.map(({center}, i) => (rods1[i].center.y - center.y) / (x1 - x0));
    const centerAt = x => new THREE.Vector3(x, Math.max(...rods0.map((rod,i) => {
      const dz = z - rod.center.z;
      const reach = radius + rod.radius;
      if (Math.abs(dz) >= reach) return -Infinity;
      const slope = slopes[i];
      return rod.center.y + (x - x0) * slope + Math.sqrt((reach ** 2 - dz ** 2) * (1 + slope ** 2));
    })), z);

    const start = centerAt(x0);
    const touchesKeeper = x => {
      const center = centerAt(x);
      return keeperTriangles.some(triangle =>
        triangle.closestPointToPoint(center, closest).distanceToSquared(center) <= radius ** 2);
    };
    let clearX = x0;
    let stoppedByKeeper = false;
    // Search in rolling order so the ball cannot skip a thin keeper.
    for (let step = 1; step <= 128; step++) {
      let hitX = THREE.MathUtils.lerp(x0, tailX, step / 128);
      if (!touchesKeeper(hitX)) {
        clearX = hitX;
        continue;
      }
      for (let iteration = 0; iteration < 16; iteration++) {
        const middle = (clearX + hitX) / 2;
        if (touchesKeeper(middle)) hitX = middle;
        else clearX = middle;
      }
      stoppedByKeeper = true;
      break;
    }
    if (!stoppedByKeeper) throw new Error('V2 集球器滑轨缺少有效的末端挡件：' + label);
    const end = centerAt(clearX);
    const net = mouth.clone().setY(ringBounds.max.y);
    const bend = net.clone().lerp(start, .26).setY(THREE.MathUtils.lerp(net.y, start.y, .62));
    if (!(net.y > bend.y && bend.y > start.y && start.y > end.y && start.distanceTo(end) > radius * 2)) {
      throw new Error('V2 集球器没有连续的下坡轨迹：' + label);
    }
    routes.set(id, {net, bend, start, end});
  }
  return routes;
}
