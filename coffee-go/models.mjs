import * as THREE from "../chess/vendor/three/three.module.js";
import { SPECIES } from "./data.mjs";
export { THREE };
function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...options });
}
function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ellipsoid(parent, mat, x, y, z, sx, sy, sz) {
  const m = mesh(parent, new THREE.SphereGeometry(1, 24, 16), mat, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function curve(parent, points, radius, mat) {
  return mesh(
    parent,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      24,
      radius,
      8,
      false,
    ),
    mat,
  );
}
function ear(parent, mat, inner, x, y, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  g.rotation.z = x > 0 ? -0.16 : 0.16;
  parent.add(g);
  const shape = new THREE.Shape();
  shape.moveTo(-0.19, 0);
  shape.lineTo(0, 0.44);
  shape.lineTo(0.19, 0);
  shape.closePath();
  mesh(
    g,
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    }),
    mat,
  );
  const inset = mesh(g, new THREE.ShapeGeometry(shape), inner, 0, 0.035, 0.16);
  inset.scale.set(0.62, 0.7, 1);
  return g;
}
function whiskers(parent, x, y, z) {
  const mat = new THREE.LineBasicMaterial({
    color: 0xa9afa6,
    transparent: true,
    opacity: 0.68,
  });
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const points = [
        new THREE.Vector3(side * x, y, z),
        new THREE.Vector3(side * (x + 0.22), y + 0.03 * (i - 1), z + 0.02),
        new THREE.Vector3(side * (x + 0.48), y + 0.085 * (i - 1), z - 0.04),
      ];
      parent.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat),
      );
    }
}
export function createPetModel(speciesId) {
  const d = SPECIES[speciesId] || SPECIES.coffee;
  if (speciesId === "dragon") return dragon(d);
  if (speciesId === "popcorn") return popcorn(d);
  const root = new THREE.Group();
  const coat = material(d.color),
    light = material(d.light),
    dark = material(0x161c21),
    pink = material(0x947475),
    isDog = speciesId === "latte";
  const body = ellipsoid(root, coat, 0, 0.84, -0.22, 0.38, 0.49, 0.78);
  ellipsoid(root, coat, 0, 1.02, 0.33, 0.32, 0.43, 0.36);
  ellipsoid(root, coat, 0, 0.8, -0.74, 0.37, 0.43, 0.35);
  const legs = [];
  for (const side of [-1, 1])
    for (const front of [false, true]) {
      const g = new THREE.Group();
      g.position.set(side * 0.27, 0.78, front ? 0.4 : -0.72);
      root.add(g);
      ellipsoid(g, coat, 0, -0.23, 0, 0.12, 0.31, 0.14);
      const lower = ellipsoid(
        g,
        coat,
        0,
        -0.52,
        front ? 0.01 : 0.07,
        0.088,
        0.23,
        0.1,
      );
      ellipsoid(
        g,
        speciesId === "oreo" || isDog ? light : coat,
        0,
        -0.68,
        0.08,
        0.14,
        0.09,
        0.22,
      );
      legs.push(g);
    }
  if (speciesId === "oreo") {
    ellipsoid(root, light, 0, 0.99, 0.48, 0.27, 0.35, 0.12);
    ellipsoid(root, light, 0, 0.57, -0.1, 0.28, 0.16, 0.59);
  }
  const head = new THREE.Group();
  head.position.set(0, 1.34, 0.62);
  root.add(head);
  ellipsoid(head, coat, 0, 0, 0, 0.325, 0.31, 0.3);
  ellipsoid(head, coat, 0, -0.13, 0.12, 0.25, 0.18, 0.23);
  const muzzle = isDog ? 0.26 : 0.17;
  ellipsoid(
    head,
    isDog || speciesId === "oreo" ? light : coat,
    -0.075,
    -0.11,
    0.27,
    0.095,
    0.078,
    muzzle * 0.85,
  );
  ellipsoid(
    head,
    isDog || speciesId === "oreo" ? light : coat,
    0.075,
    -0.11,
    0.27,
    0.095,
    0.078,
    muzzle * 0.85,
  );
  const nose = mesh(
    head,
    new THREE.ConeGeometry(0.045, 0.045, 3),
    dark,
    0,
    -0.065,
    isDog ? 0.51 : 0.43,
  );
  nose.rotation.z = Math.PI;
  nose.rotation.x = Math.PI / 2;
  curve(
    head,
    [
      [0, -0.1, 0.41],
      [0, -0.19, 0.4],
      [-0.08, -0.21, 0.38],
    ],
    0.009,
    dark,
  );
  curve(
    head,
    [
      [0, -0.19, 0.4],
      [0.08, -0.21, 0.38],
    ],
    0.009,
    dark,
  );
  for (const side of [-1, 1]) {
    const socket = ellipsoid(
      head,
      dark,
      side * 0.165,
      0.055,
      0.257,
      0.085,
      0.045,
      0.029,
    );
    socket.rotation.z = side * 0.12;
    const eye = ellipsoid(
      head,
      material(d.eye, { roughness: 0.25 }),
      side * 0.165,
      0.055,
      0.284,
      0.055,
      0.032,
      0.01,
    );
    eye.rotation.z = side * 0.12;
    ellipsoid(
      head,
      dark,
      side * 0.165,
      0.055,
      0.296,
      isDog ? 0.022 : 0.009,
      0.026,
      0.008,
    );
    ellipsoid(
      head,
      material(0xffffff, { roughness: 0.1 }),
      side * 0.151,
      0.072,
      0.303,
      0.011,
      0.009,
      0.006,
    );
    ear(
      head,
      coat,
      pink,
      side * (isDog ? 0.24 : 0.215),
      0.19,
      -0.065,
      isDog ? 1.02 : 0.72,
    );
  }
  if (speciesId === "oreo") {
    ellipsoid(head, light, 0, -0.06, 0.29, 0.08, 0.19, 0.055);
    ellipsoid(head, dark, 0, -0.07, 0.43, 0.045, 0.03, 0.02);
  }
  if (!isDog) whiskers(head, 0.15, -0.13, 0.36);
  const tailPoints = isDog
    ? [
        [0, 0.88, -1],
        [0.12, 1.12, -1.2],
        [0.2, 1.5, -1.02],
        [0.12, 1.57, -0.72],
      ]
    : [
        [0, 0.81, -0.95],
        [0.17, 1.08, -1.27],
        [0.36, 1.55, -1.33],
        [0.5, 1.7, -1.11],
        [0.55, 1.62, -0.96],
      ];
  const tail = curve(root, tailPoints, isDog ? 0.12 : 0.065, coat);
  if (["mocha", "autumn", "espresso"].includes(speciesId)) {
    const stripe = material(speciesId === "espresso" ? 0x201b18 : 0x68472d);
    for (let i = 0; i < 5; i++) {
      const z = -0.76 + i * 0.23;
      for (const side of [-1, 1])
        curve(
          root,
          [
            [side * 0.08, 1.28, z],
            [side * 0.28, 1.21, z + 0.04],
            [side * 0.37, 1.02, z + 0.1],
          ],
          0.025,
          stripe,
        );
    }
    for (let i = -1; i <= 1; i++)
      curve(
        head,
        [
          [i * 0.085, 0.27, 0.12],
          [i * 0.09, 0.18, 0.23],
          [i * 0.08, 0.12, 0.26],
        ],
        0.017,
        stripe,
      );
  }
  if (isDog) {
    for (let i = 0; i < 42; i++) {
      const a = i * 2.399;
      const y = 0.65 + (i % 7) * 0.09;
      const x = Math.sin(a) * 0.3,
        z = 0.29 + Math.cos(a) * 0.2;
      const tuft = mesh(
        root,
        new THREE.ConeGeometry(0.075, 0.3, 5),
        i % 3 ? light : coat,
        x,
        y,
        z,
      );
      tuft.rotation.z = Math.sin(a) * 0.35;
      tuft.rotation.x = 0.45;
    }
    for (let side of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const tuft = mesh(
          head,
          new THREE.ConeGeometry(0.065, 0.24, 5),
          light,
          side * (0.24 + i * 0.02),
          -0.07 - i * 0.035,
          -0.05,
        );
        tuft.rotation.z = side * 0.7;
      }
  }
  root.userData = { head, tail, legs, body, speciesId };
  return root;
}
function dragon(d) {
  const root = new THREE.Group(),
    coat = material(d.color, { metalness: 0.16, roughness: 0.54 }),
    armor = material(0x183b41, { metalness: 0.28 }),
    belly = material(d.light),
    horn = material(0xd6bd88),
    dark = material(0x182025);
  const body = ellipsoid(root, coat, 0, 0.91, -0.12, 0.42, 0.61, 0.72);
  ellipsoid(root, belly, 0, 0.8, 0.38, 0.29, 0.48, 0.12);
  const head = new THREE.Group();
  head.position.set(0, 1.6, 0.42);
  root.add(head);
  ellipsoid(head, coat, 0, 0, 0, 0.29, 0.3, 0.38);
  ellipsoid(head, coat, 0, -0.1, 0.36, 0.23, 0.13, 0.34);
  ellipsoid(head, belly, 0, -0.19, 0.36, 0.19, 0.055, 0.28);
  for (const side of [-1, 1]) {
    ellipsoid(
      head,
      material(d.eye, { emissive: 0xff6900, emissiveIntensity: 0.7 }),
      side * 0.235,
      0.065,
      0.2,
      0.055,
      0.045,
      0.07,
    );
    ellipsoid(head, dark, side * 0.245, 0.067, 0.26, 0.013, 0.035, 0.013);
    const h = mesh(
      head,
      new THREE.ConeGeometry(0.09, 0.49, 8),
      horn,
      side * 0.22,
      0.32,
      -0.18,
    );
    h.rotation.z = side * -0.3;
    h.rotation.x = -0.5;
    for (let i = 0; i < 3; i++) {
      const spike = mesh(
        head,
        new THREE.ConeGeometry(0.055, 0.16, 5),
        horn,
        side * 0.26,
        -0.12 + i * 0.1,
        -0.22,
      );
      spike.rotation.z = side * 1.1;
    }
  }
  const legs = [];
  for (const side of [-1, 1])
    for (const front of [false, true]) {
      const g = new THREE.Group();
      g.position.set(side * 0.35, 0.68, front ? 0.35 : -0.6);
      root.add(g);
      ellipsoid(g, coat, 0, -0.2, 0, 0.16, 0.31, 0.2);
      ellipsoid(g, coat, side * 0.06, -0.48, 0.1, 0.12, 0.22, 0.14);
      ellipsoid(g, armor, side * 0.08, -0.61, 0.23, 0.17, 0.08, 0.26);
      for (let j = -1; j <= 1; j++) {
        const claw = mesh(
          g,
          new THREE.ConeGeometry(0.035, 0.17, 5),
          horn,
          side * 0.08 + j * 0.09,
          -0.62,
          0.43,
        );
        claw.rotation.x = Math.PI / 2;
      }
      legs.push(g);
    }
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.25, 1.25, -0.3);
    root.add(wing);
    const vertices = new Float32Array([
      0,
      0,
      0,
      side * 0.7,
      1.15,
      -0.3,
      side * 1.75,
      0.64,
      -0.65,
      0,
      0,
      0,
      side * 1.75,
      0.64,
      -0.65,
      side * 1.45,
      0.1,
      -0.73,
      0,
      0,
      0,
      side * 1.45,
      0.1,
      -0.73,
      side * 1.04,
      -0.12,
      -0.5,
      0,
      0,
      0,
      side * 1.04,
      -0.12,
      -0.5,
      side * 0.58,
      -0.25,
      -0.22,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    mesh(
      wing,
      geometry,
      material(0x416d70, { side: THREE.DoubleSide, roughness: 0.6 }),
    );
    for (const end of [
      [side * 0.7, 1.15, -0.3],
      [side * 1.75, 0.64, -0.65],
      [side * 1.45, 0.1, -0.73],
      [side * 1.04, -0.12, -0.5],
    ])
      curve(wing, [[0, 0, 0], [side * 0.4, 0.35, -0.2], end], 0.027, armor);
    wings.push(wing);
  }
  const tail = curve(
    root,
    [
      [0, 0.78, -0.62],
      [0.2, 0.5, -1.05],
      [0.7, 0.22, -1.45],
      [1.1, 0.3, -1.6],
      [1.3, 0.48, -1.42],
    ],
    0.12,
    coat,
  );
  for (let i = 0; i < 8; i++) {
    const z = 0.15 - i * 0.17;
    const spike = mesh(
      root,
      new THREE.ConeGeometry(0.09, 0.24, 5),
      horn,
      0,
      1.53 - i * 0.06,
      z,
    );
    spike.rotation.x = -0.4;
  }
  root.userData = { head, tail, legs, body, wings, speciesId: "dragon" };
  return root;
}
function popcorn(d) {
  const root = new THREE.Group(),
    cream = material(d.light),
    gold = material(d.color),
    caramel = material(0x956323);
  let body = new THREE.Group();
  root.add(body);
  for (let i = 0; i < 75; i++) {
    const a = i * 2.399963,
      y = 1 - (2 * (i + 0.5)) / 75,
      r = Math.sqrt(1 - y * y);
    const g = new THREE.Group();
    g.position.set(
      Math.cos(a) * r * 0.66,
      y * 0.66 + 0.94,
      Math.sin(a) * r * 0.66,
    );
    g.rotation.set(a, y * 3, a / 2);
    body.add(g);
    ellipsoid(g, i % 7 === 0 ? gold : cream, 0, 0, 0, 0.16, 0.17, 0.13);
    for (let j = 0; j < 3; j++) {
      const t = j * 2.1;
      ellipsoid(
        g,
        j === 0 && i % 4 === 0 ? gold : cream,
        Math.cos(t) * 0.13,
        0.06,
        Math.sin(t) * 0.13,
        0.12,
        0.14,
        0.12,
      );
    }
    ellipsoid(g, caramel, 0, -0.08, 0.03, 0.06, 0.05, 0.055);
  }
  for (const side of [-1, 1]) {
    ellipsoid(root, caramel, side * 0.22, 0.14, 0.12, 0.19, 0.1, 0.25);
    ellipsoid(
      root,
      material(0x34251f, { roughness: 0.25 }),
      side * 0.21,
      1.05,
      0.65,
      0.045,
      0.065,
      0.02,
    );
  }
  root.userData = { body, legs: [], speciesId: "popcorn" };
  return root;
}
export function animatePet(root, time, action = 0) {
  const u = root.userData;
  if (u.body) {
    u.baseBodyY ??= u.body.scale.y;
    u.body.scale.y = u.baseBodyY * (1 + Math.sin(time * 2) * 0.012);
  }
  if (u.head) {
    u.head.rotation.y = Math.sin(time * 0.7) * 0.08;
    u.head.rotation.x = Math.sin(time * 1.4) * 0.025;
  }
  if (u.tail) u.tail.rotation.z = Math.sin(time * 1.1) * 0.04;
  u.wings?.forEach(
    (w, i) => (w.rotation.z = Math.sin(time * 1.8) * 0.09 * (i ? 1 : -1)),
  );
  u.legs?.forEach(
    (leg, i) => (leg.rotation.x = action ? Math.sin(time * 15 + i) * 0.2 : 0),
  );
}
export function disposeGroup(root) {
  const materials = new Set(),
    geometries = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material)
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        materials.add(m),
      );
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) m.dispose();
}
