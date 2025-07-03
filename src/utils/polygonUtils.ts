import { Polygon, Rectangle } from '../store/canvasStore';
import { normalizeRect } from './rectUtils';

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

// 점과 선분 사이의 거리를 계산하는 함수
const distanceToLineSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length))
  );
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
};

// 핸들 히트 테스트 유틸리티 함수
export const getHandleAtPosition = (
  worldPos: { x: number; y: number },
  rect: Rectangle,
  scale: number
): 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' | null => {
  const normalized = normalizeRect(rect);
  const handleSize = 8 / scale;
  const tolerance = handleSize;
  const edgeTolerance = 6 / scale; // 변 클릭 허용 거리

  // 대각선 핸들 체크 (점 방식)
  const cornerHandles = [
    { x: normalized.x, y: normalized.y, type: 'nw' as const },
    {
      x: normalized.x + normalized.width,
      y: normalized.y,
      type: 'ne' as const,
    },
    {
      x: normalized.x + normalized.width,
      y: normalized.y + normalized.height,
      type: 'se' as const,
    },
    {
      x: normalized.x,
      y: normalized.y + normalized.height,
      type: 'sw' as const,
    },
  ];

  // 대각선 핸들 우선 체크
  for (const handle of cornerHandles) {
    const dx = worldPos.x - handle.x;
    const dy = worldPos.y - handle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance) {
      return handle.type;
    }
  }

  // 상/하/좌/우 변 체크 (선 방식)
  const edges = [
    {
      x1: normalized.x,
      y1: normalized.y,
      x2: normalized.x + normalized.width,
      y2: normalized.y,
      type: 'n' as const,
    }, // 위쪽 변
    {
      x1: normalized.x + normalized.width,
      y1: normalized.y,
      x2: normalized.x + normalized.width,
      y2: normalized.y + normalized.height,
      type: 'e' as const,
    }, // 오른쪽 변
    {
      x1: normalized.x,
      y1: normalized.y + normalized.height,
      x2: normalized.x + normalized.width,
      y2: normalized.y + normalized.height,
      type: 's' as const,
    }, // 아래쪽 변
    {
      x1: normalized.x,
      y1: normalized.y,
      x2: normalized.x,
      y2: normalized.y + normalized.height,
      type: 'w' as const,
    }, // 왼쪽 변
  ];

  // 변 클릭 체크
  for (const edge of edges) {
    const distance = distanceToLineSegment(
      worldPos.x,
      worldPos.y,
      edge.x1,
      edge.y1,
      edge.x2,
      edge.y2
    );

    if (distance <= edgeTolerance) {
      return edge.type;
    }
  }

  return null;
};

// 점 핸들 히트 테스트 유틸리티 함수
export const getPointHandleAtPosition = (
  worldPos: { x: number; y: number },
  polygon: Polygon,
  scale: number
): number | null => {
  const handleSize = 8 / scale;
  const tolerance = handleSize;

  for (let i = 0; i < polygon.points.length; i++) {
    const point = polygon.points[i];
    const dx = worldPos.x - point.x;
    const dy = worldPos.y - point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance) {
      return i;
    }
  }

  return null;
};

// 선분 위의 점인지 확인하는 유틸리티 함수
export const getPointOnEdge = (
  worldPos: { x: number; y: number },
  polygon: Polygon,
  scale: number
): { edgeIndex: number; position: { x: number; y: number } } | null => {
  const tolerance = 5 / scale; // 선분과의 허용 거리

  for (let i = 0; i < polygon.points.length; i++) {
    const currentPoint = polygon.points[i];
    const nextPoint = polygon.points[(i + 1) % polygon.points.length];

    // 완성되지 않은 폴리곤의 마지막 선분은 제외
    if (!polygon.isComplete && i === polygon.points.length - 1) {
      continue;
    }

    // 선분과 점 사이의 거리 계산
    const A = worldPos.x - currentPoint.x;
    const B = worldPos.y - currentPoint.y;
    const C = nextPoint.x - currentPoint.x;
    const D = nextPoint.y - currentPoint.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) continue; // 점이 같은 경우

    const param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = currentPoint.x;
      yy = currentPoint.y;
    } else if (param > 1) {
      xx = nextPoint.x;
      yy = nextPoint.y;
    } else {
      xx = currentPoint.x + param * C;
      yy = currentPoint.y + param * D;
    }

    const dx = worldPos.x - xx;
    const dy = worldPos.y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance && param >= 0 && param <= 1) {
      return {
        edgeIndex: i,
        position: worldPos,
      };
    }
  }

  return null;
};
