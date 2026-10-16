import { THREE, createPetModel, animatePet, disposeGroup } from "./models.mjs";
import { SPECIES } from "./data.mjs";
const thumbs = new Map();
export function getPortraits() {
  if (thumbs.size) return thumbs;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(200, 200);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(2.4, 1.8, 4);
    camera.lookAt(0, 0.9, 0);
    scene.add(new THREE.HemisphereLight(0xf5fbff, 0x677f72, 3));
    const sun = new THREE.DirectionalLight(0xfff2da, 4);
    sun.position.set(3, 6, 4);
    scene.add(sun);
    for (const id of Object.keys(SPECIES)) {
      const pet = createPetModel(id);
      if (id === "dragon") pet.scale.setScalar(0.58);
      scene.add(pet);
      renderer.render(scene, camera);
      thumbs.set(id, renderer.domElement.toDataURL());
      scene.remove(pet);
      disposeGroup(pet);
    }
    renderer.dispose();
    renderer.forceContextLoss();
  } catch {
    renderer?.dispose();
  }
  return thumbs;
}
export function createScene(
  host,
  { onError = () => {}, reducedMotion = false } = {},
) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    onError(
      "3D 화면을 시작할 수 없어요. WebGL을 지원하는 브라우저에서 다시 열어 주세요.",
    );
    return {
      setEncounter() {},
      setBattle() {},
      play() {},
      resize() {},
      setVisible() {},
      destroy() {},
    };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", "입체 캐릭터와 전장");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb1d7e5);
  scene.fog = new THREE.Fog(0xb1d7e5, 14, 46);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  const hemisphere = new THREE.HemisphereLight(0xe7f5ff, 0x58704b, 2.8);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffefd5, 3.1);
  sun.position.set(-5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -9,
    right: 9,
    top: 9,
    bottom: -9,
    far: 30,
  });
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const stage = new THREE.Group(),
    actors = new THREE.Group(),
    fx = new THREE.Group();
  scene.add(stage, actors, fx);
  let pet = null,
    friend = null,
    mode = "capture",
    visible = true,
    raf = 0,
    lastEvent = 0,
    eventType = "",
    battleActive = -1,
    particles = [];
  const mat = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const add = (geometry, material, x = 0, y = 0, z = 0, parent = stage) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  function environment(arena) {
    disposeGroup(stage);
    stage.clear();
    scene.background = new THREE.Color(arena ? 0x233f5c : 0xb1d7e5);
    scene.fog.color.copy(scene.background);
    hemisphere.intensity = arena ? 2.5 : 2.8;
    if (arena) {
      add(
        new THREE.CylinderGeometry(7, 7.3, 0.2, 64),
        mat(0xa1aeb1),
        0,
        -0.13,
        0,
      );
      const disk = add(
        new THREE.CircleGeometry(5.9, 64),
        mat(0x687c84),
        0,
        -0.015,
        0,
      );
      disk.rotation.x = -Math.PI / 2;
      for (const radius of [2.7, 5.1, 6.5]) {
        const ring = add(
          new THREE.TorusGeometry(radius, 0.055, 8, 96),
          mat(0xd8dfd0, { emissive: 0x66968a, emissiveIntensity: 0.2 }),
          0,
          0.015,
          0,
        );
        ring.rotation.x = Math.PI / 2;
      }
      for (let i = 0; i < 18; i++) {
        const a = (i * Math.PI) / 9;
        add(
          new THREE.BoxGeometry(0.6, 2.8, 0.8),
          mat(0x46677b),
          Math.sin(a) * 8,
          1.3,
          Math.cos(a) * 8,
        );
        add(
          new THREE.BoxGeometry(0.1, 2, 0.1),
          mat(0x83ddde, { emissive: 0x53b8bd, emissiveIntensity: 2 }),
          Math.sin(a) * 7.65,
          1.3,
          Math.cos(a) * 7.65,
        );
      }
    } else {
      add(
        new THREE.CylinderGeometry(38, 38, 0.25, 64),
        mat(0x7d9d5d),
        0,
        -0.17,
        0,
      );
      const clearing = add(
        new THREE.CircleGeometry(3.1, 64),
        mat(0xa3ac78),
        0,
        -0.025,
        0,
      );
      clearing.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 38; i++) {
        const a = i * 2.399,
          dist = 6 + (i % 5) * 2.5,
          x = Math.sin(a) * dist,
          z = Math.cos(a) * dist - 4;
        if (z > 1 && Math.abs(x) < 5) continue;
        add(
          new THREE.CylinderGeometry(0.12, 0.22, 3.8, 9),
          mat(0x685b42),
          x,
          1.7,
          z,
        );
        const crown = add(
          new THREE.IcosahedronGeometry(1.7 + (i % 3) * 0.3, 2),
          mat(i % 2 ? 0x547d4b : 0x416f51),
          x,
          4,
          z,
        );
        crown.scale.y = 1.2;
      }
      const grassmat = mat(0x547b44, { side: THREE.DoubleSide });
      for (let i = 0; i < 220; i++) {
        const a = i * 2.399,
          dist = 2.6 + (i % 21) * 0.35;
        const x = Math.sin(a) * dist,
          z = Math.cos(a) * dist;
        const g = add(
          new THREE.ConeGeometry(0.06, 0.22 + (i % 4) * 0.06, 3),
          grassmat,
          x,
          0.12,
          z,
        );
        g.rotation.z = Math.sin(i) * 0.25;
      }
      for (let i = 0; i < 8; i++) {
        const rock = add(
          new THREE.DodecahedronGeometry(0.24 + (i % 3) * 0.1, 1),
          mat(0x929887),
          Math.sin(i * 2.1) * 4,
          0.1,
          Math.cos(i * 2.1) * 4,
        );
        rock.scale.y = 0.6;
      }
    }
  }
  function resetActors() {
    for (const o of [...actors.children]) {
      actors.remove(o);
      disposeGroup(o);
    }
    pet = null;
    friend = null;
    battleActive = -1;
  }
  function resize() {
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.65 ? 45 : 39;
    camera.updateProjectionMatrix();
  }
  function setEncounter(p) {
    resetActors();
    if (mode !== "capture") {
      mode = "capture";
      environment(false);
    }
    pet = createPetModel(p.speciesId);
    pet.rotation.y = -0.12;
    if (p.speciesId === "dragon") pet.scale.setScalar(0.72);
    actors.add(pet);
    camera.position.set(2.25, 2.15, 6.9);
    camera.lookAt(0, 0.9, 0);
    resize();
  }
  function setBattle(b) {
    if (mode !== "battle") {
      mode = "battle";
      environment(true);
      resetActors();
    }
    if (!pet) {
      pet = createPetModel(b.raid.speciesId);
      pet.position.set(0, 0, -2.1);
      pet.scale.setScalar(b.raid.speciesId === "dragon" ? 1 : 1.4);
      actors.add(pet);
    }
    if (b.active !== battleActive) {
      if (friend) {
        actors.remove(friend);
        disposeGroup(friend);
      }
      friend = createPetModel(b.roster[b.active].pet.speciesId);
      friend.position.set(-1, 0, 2.1);
      friend.rotation.y = Math.PI;
      friend.scale.setScalar(0.85);
      actors.add(friend);
      battleActive = b.active;
    }
    camera.position.set(2.7, 3.2, 7.6);
    camera.lookAt(0, 0.9, -0.2);
    resize();
  }
  function play(event) {
    eventType = typeof event === "string" ? event : event.kind;
    lastEvent = performance.now();
    if (["attack", "charged", "caught", "won"].includes(eventType)) {
      for (let i = 0; i < 22; i++) {
        const m = add(
          new THREE.SphereGeometry(
            eventType === "charged" ? 0.06 : 0.035,
            6,
            4,
          ),
          mat(eventType === "caught" ? 0xffd269 : 0xb5efff, {
            emissive: 0x8aada8,
            emissiveIntensity: 1,
          }),
          0,
          1,
          mode === "battle" ? -1.5 : 0,
          fx,
        );
        particles.push({
          m,
          v: new THREE.Vector3(
            Math.sin(i * 2.4) * 2,
            1 + (i % 4) * 0.3,
            Math.cos(i * 2.4) * 2,
          ),
          life: 0.7,
        });
      }
    }
  }
  function frame(time) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = reducedMotion ? 0 : time / 1000,
      age = (time - lastEvent) / 1000;
    if (pet) {
      animatePet(pet, t, mode === "battle");
      if (mode === "capture") {
        const scale = pet.userData.speciesId === "dragon" ? 0.72 : 1;
        pet.scale.setScalar(
          eventType === "caught" && age < 1
            ? scale * Math.max(0, 1 - age)
            : scale,
        );
        pet.position.y =
          eventType === "escaped" && age < 0.5 ? Math.sin(age * 6.28) * 0.2 : 0;
      }
    }
    if (friend) {
      animatePet(friend, t, age < 0.4 && eventType === "attack");
      friend.position.z =
        2.1 -
        (age < 0.3 && ["attack", "charged"].includes(eventType)
          ? Math.sin((age / 0.3) * Math.PI) * 0.7
          : 0);
      friend.position.x =
        -1 +
        (eventType === "dodge" && age < 0.5
          ? Math.sin((age / 0.5) * Math.PI) * 0.8
          : 0);
    }
    for (const p of particles) {
      p.life -= 0.016;
      p.m.position.addScaledVector(p.v, 0.016);
      p.m.scale.setScalar(Math.max(0.01, p.life));
    }
    const old = particles.filter((p) => p.life <= 0);
    old.forEach((p) => {
      fx.remove(p.m);
      disposeGroup(p.m);
    });
    particles = particles.filter((p) => p.life > 0);
    renderer.render(scene, camera);
  }
  environment(false);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  raf = requestAnimationFrame(frame);
  const lost = (e) => {
    e.preventDefault();
    onError("3D 화면 연결이 끊겼어요. 화면을 새로고침해 주세요.");
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  return {
    setEncounter,
    setBattle,
    play,
    resize,
    setVisible: (v) => {
      visible = v;
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeGroup(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
