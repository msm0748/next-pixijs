export type RectCoords = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const normalizeRect = (rect: RectCoords) => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);
  return { x, y, width, height };
};

export const isPointInRect = (
  point: { x: number; y: number },
  rect: RectCoords
): boolean => {
  const normalized = normalizeRect(rect);
  return (
    point.x >= normalized.x &&
    point.x <= normalized.x + normalized.width &&
    point.y >= normalized.y &&
    point.y <= normalized.y + normalized.height
  );
};

export const findRectAtPosition = <T extends RectCoords>(
  point: { x: number; y: number },
  rectangles: T[]
): T | null => {
  for (let i = rectangles.length - 1; i >= 0; i--) {
    if (isPointInRect(point, rectangles[i])) {
      return rectangles[i];
    }
  }
  return null;
};
