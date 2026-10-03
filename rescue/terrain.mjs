// Shared geometry keeps the visible openings and the collision surfaces identical.
export function terrainPieces(level, placed = {}) {
  return level.terrain.flatMap((surface, index) => {
    let pieces = [{ ...surface, terrainIndex: index }];
    for (const hole of level.slots.filter(s => s.type === 'dig' && s.terrain === index && placed[s.id])) {
      pieces = pieces.flatMap(piece => {
        if (hole.x2 <= piece.x1 || hole.x1 >= piece.x2) return [piece];
        const parts = [];
        if (hole.x1 > piece.x1) parts.push({ ...piece, x2: hole.x1 });
        if (hole.x2 < piece.x2) parts.push({ ...piece, x1: hole.x2 });
        return parts;
      });
    }
    return pieces;
  });
}

export function stairSteps(slot) {
  const count = Math.ceil(Math.abs(slot.y2 - slot.y1) / 12);
  return Array.from({ length: count }, (_, index) => ({
    x1: slot.x1 + (slot.x2 - slot.x1) * index / count,
    x2: slot.x1 + (slot.x2 - slot.x1) * (index + 1) / count,
    y: slot.y1 + (slot.y2 - slot.y1) * (index + 1) / count,
    stair: true,
  }));
}

export function walkableSurfaces(level, placed) {
  return [...terrainPieces(level, placed), ...level.slots.filter(s => placed[s.id]).flatMap(slot => {
    if (slot.type === 'bridge') return [{ x1: slot.x1, x2: slot.x2, y: slot.y }];
    if (slot.type === 'stairs') return stairSteps(slot);
    return [];
  })];
}
