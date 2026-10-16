import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES } from "../data.mjs";
import { createPetModel, disposeGroup, THREE } from "../models.mjs";
function palette(model) {
  const colors = [];
  model.traverse((o) => {
    if (o.material?.color) colors.push(o.material.color.getHex());
  });
  return colors;
}
function shape(model) {
  const parts = [];
  model.traverse((o) => {
    if (o.isMesh)
      parts.push([o.geometry.type, o.position.toArray(), o.scale.toArray()]);
  });
  return JSON.stringify(parts);
}
test("every species has a finite 3D model and a visibly different shiny palette", () => {
  for (const id of Object.keys(SPECIES)) {
    const plain = createPetModel(id),
      shiny = createPetModel(id, true);
    const box = new THREE.Box3().setFromObject(plain),
      size = box.getSize(new THREE.Vector3());
    assert.ok(
      size.toArray().every((v) => Number.isFinite(v) && v > 0),
      id,
    );
    assert.notDeepEqual(palette(plain), palette(shiny), id + " shiny palette");
    disposeGroup(plain);
    disposeGroup(shiny);
  }
});
test("rabbit, fox, bear, otter, wolf, bird and crystal dragon have distinct silhouettes", () => {
  const ids = [
    "coffee",
    "pudding",
    "cookie",
    "brownSugar",
    "mint",
    "icewolf",
    "phoenix",
    "crystaldragon",
  ];
  const shapes = ids.map((id) => {
    const model = createPetModel(id),
      result = shape(model);
    disposeGroup(model);
    return result;
  });
  assert.equal(new Set(shapes).size, ids.length);
});
