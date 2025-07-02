import { Polygon } from '../store/canvasStore';

// 점이 폴리곤 내부에 있는지 확인하는 함수 (Ray casting algorithm)
export const isPointInPolygon = (
  point: { x: number; y: number },
  polygon: Polygon
): boolean => {
  if (polygon.points.length < 3) return false;

  let inside = false;
  const { x, y } = point;

  for (
    let i = 0, j = polygon.points.length - 1;
    i < polygon.points.length;
    j = i++
  ) {
    const xi = polygon.points[i].x;
    const yi = polygon.points[i].y;
    const xj = polygon.points[j].x;
    const yj = polygon.points[j].y;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

// 주어진 위치에 있는 폴리곤을 찾는 함수
export const findPolygonAtPosition = (
  worldPos: { x: number; y: number },
  polygons: Polygon[]
): Polygon | null => {
  // 역순으로 검사하여 위에 있는 폴리곤을 우선 선택
  for (let i = polygons.length - 1; i >= 0; i--) {
    const polygon = polygons[i];
    if (polygon.isComplete && isPointInPolygon(worldPos, polygon)) {
      return polygon;
    }
  }
  return null;
};
