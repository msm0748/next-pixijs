import { Rectangle } from '@/store/canvasStore';

// 사각형 좌표를 정규화하는 함수
export const normalizeRect = (rect: Rectangle) => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  return { x, y, width, height };
};

// 점이 사각형 내부에 있는지 확인
export const isPointInRect = (
  point: { x: number; y: number },
  rect: Rectangle
): boolean => {
  const normalized = normalizeRect(rect);

  return (
    point.x >= normalized.x &&
    point.x <= normalized.x + normalized.width &&
    point.y >= normalized.y &&
    point.y <= normalized.y + normalized.height
  );
};

// 여러 사각형 중에서 점을 포함하는 사각형 찾기 (가장 위에 있는 것)
export const findRectAtPosition = (
  point: { x: number; y: number },
  rectangles: Rectangle[]
): Rectangle | null => {
  // 역순으로 검사 (나중에 그린 것이 위에 있음)
  for (let i = rectangles.length - 1; i >= 0; i--) {
    if (isPointInRect(point, rectangles[i])) {
      return rectangles[i];
    }
  }
  return null;
};
