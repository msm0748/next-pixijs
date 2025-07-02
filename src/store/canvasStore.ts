import { observable } from '@legendapp/state';

// 사각형 좌표를 정규화하는 함수
const normalizeRect = (rect: Rectangle) => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  return { x, y, width, height };
};

export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
}

export interface Polygon {
  id: string;
  points: { x: number; y: number }[];
  isComplete: boolean;
  label?: string;
  color?: string;
}

export interface CanvasState {
  // 뷰포트 상태
  position: { x: number; y: number };
  scale: number;

  // 드래그 상태
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  positionStart: { x: number; y: number } | null;

  // 그리기 상태
  isDrawing: boolean;
  drawingRect: Rectangle | null;
  rectangles: Rectangle[];

  // 폴리곤 상태
  isDrawingPolygon: boolean;
  currentPolygon: Polygon | null;
  polygons: Polygon[];
  hoveredPointIndex: number | null; // 첫번째 점 호버 효과용
  currentMousePosition: { x: number; y: number } | null; // 실시간 미리보기용

  // 선택 상태
  selectedRectId: string | null;
  selectedPolygonId: string | null;
  isResizing: boolean;
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' | null;
  resizeStartRect: Rectangle | null;

  // 이동 상태
  isMoving: boolean;
  moveStartPos: { x: number; y: number } | null;
  moveStartRect: Rectangle | null;
  moveStartPolygon: Polygon | null;

  // 모드
  mode: 'pan' | 'draw' | 'polygon' | 'select'; // 폴리곤 모드 추가
}

export const canvasStore = observable<CanvasState>({
  // 뷰포트 상태
  position: { x: 0, y: 0 },
  scale: 1,

  // 드래그 상태
  isDragging: false,
  dragStart: null,
  positionStart: null,

  // 그리기 상태
  isDrawing: false,
  drawingRect: null,
  rectangles: [],

  // 폴리곤 상태
  isDrawingPolygon: false,
  currentPolygon: null,
  polygons: [],
  hoveredPointIndex: null,
  currentMousePosition: null,

  // 선택 상태
  selectedRectId: null,
  selectedPolygonId: null,
  isResizing: false,
  resizeHandle: null,
  resizeStartRect: null,

  // 이동 상태
  isMoving: false,
  moveStartPos: null,
  moveStartRect: null,
  moveStartPolygon: null,

  // 모드
  mode: 'pan',
});

// 액션들
export const canvasActions = {
  // 뷰포트 관련
  setPosition: (position: { x: number; y: number }) => {
    canvasStore.position.set(position);
  },

  setScale: (scale: number) => {
    canvasStore.scale.set(scale);
  },

  // 드래그 관련
  startDrag: (
    clientPos: { x: number; y: number },
    currentPos: { x: number; y: number }
  ) => {
    canvasStore.isDragging.set(true);
    canvasStore.dragStart.set(clientPos);
    canvasStore.positionStart.set(currentPos);
  },

  endDrag: () => {
    canvasStore.isDragging.set(false);
    canvasStore.dragStart.set(null);
    canvasStore.positionStart.set(null);
  },

  // 그리기 관련
  setMode: (mode: 'pan' | 'draw' | 'polygon' | 'select') => {
    canvasStore.mode.set(mode);
    // 모드 변경 시 선택 해제 및 진행 중인 작업 취소
    if (mode !== 'select') {
      canvasStore.selectedRectId.set(null);
      canvasStore.selectedPolygonId.set(null);
    }
    if (mode !== 'polygon') {
      canvasStore.isDrawingPolygon.set(false);
      canvasStore.currentPolygon.set(null);
      canvasStore.hoveredPointIndex.set(null);
      canvasStore.currentMousePosition.set(null);
    }
    if (mode !== 'draw') {
      canvasStore.isDrawing.set(false);
      canvasStore.drawingRect.set(null);
    }
  },

  startDrawing: (rect: Rectangle) => {
    canvasStore.isDrawing.set(true);
    canvasStore.drawingRect.set(rect);
  },

  updateDrawing: (rect: Rectangle) => {
    canvasStore.drawingRect.set(rect);
  },

  finishDrawing: () => {
    const drawingRect = canvasStore.drawingRect.get();
    if (
      drawingRect &&
      Math.abs(drawingRect.width) > 5 &&
      Math.abs(drawingRect.height) > 5
    ) {
      // 최소 크기 이상일 때만 추가
      canvasStore.rectangles.push(drawingRect);
    }
    canvasStore.isDrawing.set(false);
    canvasStore.drawingRect.set(null);
  },

  // 폴리곤 관련
  startPolygon: (point: { x: number; y: number }) => {
    const newPolygon: Polygon = {
      id: Date.now().toString(),
      points: [point],
      isComplete: false,
      color: '#ff0000',
    };
    canvasStore.isDrawingPolygon.set(true);
    canvasStore.currentPolygon.set(newPolygon);
    canvasStore.currentMousePosition.set(point); // 초기 마우스 위치 설정
  },

  addPolygonPoint: (point: { x: number; y: number }) => {
    const currentPolygon = canvasStore.currentPolygon.get();
    if (!currentPolygon) return;

    // 첫 번째 점과의 거리 체크 (완성 조건)
    const firstPoint = currentPolygon.points[0];
    const distance = Math.sqrt(
      Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
    );

    // 거리가 10픽셀 이내면 폴리곤 완성
    if (distance <= 10 && currentPolygon.points.length >= 3) {
      const completedPolygon = {
        ...currentPolygon,
        isComplete: true,
      };
      canvasStore.polygons.push(completedPolygon);
      canvasStore.isDrawingPolygon.set(false);
      canvasStore.currentPolygon.set(null);
      canvasStore.hoveredPointIndex.set(null);
      canvasStore.currentMousePosition.set(null);
    } else {
      // 새 점 추가
      const updatedPolygon = {
        ...currentPolygon,
        points: [...currentPolygon.points, point],
      };
      canvasStore.currentPolygon.set(updatedPolygon);
    }
  },

  updatePolygonHover: (mousePos: { x: number; y: number }) => {
    const currentPolygon = canvasStore.currentPolygon.get();

    // 현재 마우스 위치 업데이트 (폴리곤 그리는 중일 때만)
    if (canvasStore.isDrawingPolygon.get()) {
      canvasStore.currentMousePosition.set(mousePos);
    }

    if (!currentPolygon || currentPolygon.points.length < 3) {
      canvasStore.hoveredPointIndex.set(null);
      return;
    }

    // 첫 번째 점과의 거리 체크
    const firstPoint = currentPolygon.points[0];
    const distance = Math.sqrt(
      Math.pow(mousePos.x - firstPoint.x, 2) +
        Math.pow(mousePos.y - firstPoint.y, 2)
    );

    if (distance <= 10) {
      canvasStore.hoveredPointIndex.set(0); // 첫 번째 점 호버
    } else {
      canvasStore.hoveredPointIndex.set(null);
    }
  },

  cancelPolygon: () => {
    canvasStore.isDrawingPolygon.set(false);
    canvasStore.currentPolygon.set(null);
    canvasStore.hoveredPointIndex.set(null);
    canvasStore.currentMousePosition.set(null);
  },

  // 선택 관련
  selectRectangle: (id: string | null) => {
    canvasStore.selectedRectId.set(id);
    canvasStore.selectedPolygonId.set(null); // 다른 도형 선택 해제
  },

  selectPolygon: (id: string | null) => {
    canvasStore.selectedPolygonId.set(id);
    canvasStore.selectedRectId.set(null); // 다른 도형 선택 해제
  },

  startResize: (
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w',
    rect: Rectangle
  ) => {
    canvasStore.isResizing.set(true);
    canvasStore.resizeHandle.set(handle);
    // 음수 크기 사각형을 정규화하여 저장
    const normalized = normalizeRect(rect);
    canvasStore.resizeStartRect.set({
      id: rect.id,
      x: normalized.x,
      y: normalized.y,
      width: normalized.width,
      height: normalized.height,
      color: rect.color,
      label: rect.label,
    });
  },

  updateResize: (worldPos: { x: number; y: number }) => {
    const handle = canvasStore.resizeHandle.get();
    const startRect = canvasStore.resizeStartRect.get();
    const selectedId = canvasStore.selectedRectId.get();

    if (!handle || !startRect || !selectedId) return;

    const rectangles = canvasStore.rectangles.get();
    const rectIndex = rectangles.findIndex((r) => r.id === selectedId);
    if (rectIndex === -1) return;

    // startRect는 이미 정규화된 상태 (양수 width/height)
    const newRect = { ...startRect };

    // 핸들에 따른 리사이즈 로직 (정규화된 좌표 기준)
    switch (handle) {
      case 'nw': // 왼쪽 위
        newRect.width = startRect.x + startRect.width - worldPos.x;
        newRect.height = startRect.y + startRect.height - worldPos.y;
        newRect.x = worldPos.x;
        newRect.y = worldPos.y;
        break;
      case 'ne': // 오른쪽 위
        newRect.width = worldPos.x - startRect.x;
        newRect.height = startRect.y + startRect.height - worldPos.y;
        newRect.y = worldPos.y;
        break;
      case 'sw': // 왼쪽 아래
        newRect.width = startRect.x + startRect.width - worldPos.x;
        newRect.height = worldPos.y - startRect.y;
        newRect.x = worldPos.x;
        break;
      case 'se': // 오른쪽 아래
        newRect.width = worldPos.x - startRect.x;
        newRect.height = worldPos.y - startRect.y;
        break;
      case 'n': // 위
        newRect.height = startRect.y + startRect.height - worldPos.y;
        newRect.y = worldPos.y;
        break;
      case 's': // 아래
        newRect.height = worldPos.y - startRect.y;
        break;
      case 'w': // 왼쪽
        newRect.width = startRect.x + startRect.width - worldPos.x;
        newRect.x = worldPos.x;
        break;
      case 'e': // 오른쪽
        newRect.width = worldPos.x - startRect.x;
        break;
    }

    // 최소 크기 제한 (절댓값으로 체크)
    if (Math.abs(newRect.width) < 10) return;
    if (Math.abs(newRect.height) < 10) return;

    const updatedRectangles = [...rectangles];
    updatedRectangles[rectIndex] = newRect;
    canvasStore.rectangles.set(updatedRectangles);
  },

  endResize: () => {
    canvasStore.isResizing.set(false);
    canvasStore.resizeHandle.set(null);
    canvasStore.resizeStartRect.set(null);
  },

  // 이동 관련
  startMove: (
    worldPos: { x: number; y: number },
    rect?: Rectangle,
    polygon?: Polygon
  ) => {
    canvasStore.isMoving.set(true);
    canvasStore.moveStartPos.set(worldPos);
    if (rect) {
      canvasStore.moveStartRect.set({ ...rect });
      canvasStore.moveStartPolygon.set(null);
    }
    if (polygon) {
      canvasStore.moveStartPolygon.set({ ...polygon });
      canvasStore.moveStartRect.set(null);
    }
  },

  updateMove: (worldPos: { x: number; y: number }) => {
    const startPos = canvasStore.moveStartPos.get();
    const startRect = canvasStore.moveStartRect.get();
    const startPolygon = canvasStore.moveStartPolygon.get();
    const selectedRectId = canvasStore.selectedRectId.get();
    const selectedPolygonId = canvasStore.selectedPolygonId.get();

    if (!startPos) return;

    // 이동량 계산
    const deltaX = worldPos.x - startPos.x;
    const deltaY = worldPos.y - startPos.y;

    // 사각형 이동
    if (startRect && selectedRectId) {
      const rectangles = canvasStore.rectangles.get();
      const rectIndex = rectangles.findIndex((r) => r.id === selectedRectId);
      if (rectIndex === -1) return;

      const newRect = {
        ...startRect,
        x: startRect.x + deltaX,
        y: startRect.y + deltaY,
      };

      const updatedRectangles = [...rectangles];
      updatedRectangles[rectIndex] = newRect;
      canvasStore.rectangles.set(updatedRectangles);
    }

    // 폴리곤 이동
    if (startPolygon && selectedPolygonId) {
      const polygons = canvasStore.polygons.get();
      const polygonIndex = polygons.findIndex(
        (p) => p.id === selectedPolygonId
      );
      if (polygonIndex === -1) return;

      const newPolygon = {
        ...startPolygon,
        points: startPolygon.points.map((point) => ({
          x: point.x + deltaX,
          y: point.y + deltaY,
        })),
      };

      const updatedPolygons = [...polygons];
      updatedPolygons[polygonIndex] = newPolygon;
      canvasStore.polygons.set(updatedPolygons);
    }
  },

  endMove: () => {
    canvasStore.isMoving.set(false);
    canvasStore.moveStartPos.set(null);
    canvasStore.moveStartRect.set(null);
    canvasStore.moveStartPolygon.set(null);
  },

  removeRectangle: (id: string) => {
    const rectangles = canvasStore.rectangles.get();
    canvasStore.rectangles.set(rectangles.filter((rect) => rect.id !== id));
    // 삭제된 사각형이 선택되어 있었다면 선택 해제
    if (canvasStore.selectedRectId.get() === id) {
      canvasStore.selectedRectId.set(null);
    }
  },

  removePolygon: (id: string) => {
    const polygons = canvasStore.polygons.get();
    canvasStore.polygons.set(polygons.filter((polygon) => polygon.id !== id));
    // 삭제된 폴리곤이 선택되어 있었다면 선택 해제
    if (canvasStore.selectedPolygonId.get() === id) {
      canvasStore.selectedPolygonId.set(null);
    }
  },

  clearRectangles: () => {
    canvasStore.rectangles.set([]);
    canvasStore.selectedRectId.set(null);
  },

  clearPolygons: () => {
    canvasStore.polygons.set([]);
    canvasStore.selectedPolygonId.set(null);
    canvasStore.isDrawingPolygon.set(false);
    canvasStore.currentPolygon.set(null);
    canvasStore.hoveredPointIndex.set(null);
    canvasStore.currentMousePosition.set(null);
  },

  clearAll: () => {
    canvasStore.rectangles.set([]);
    canvasStore.polygons.set([]);
    canvasStore.selectedRectId.set(null);
    canvasStore.selectedPolygonId.set(null);
    canvasStore.isDrawingPolygon.set(false);
    canvasStore.currentPolygon.set(null);
    canvasStore.hoveredPointIndex.set(null);
    canvasStore.currentMousePosition.set(null);
  },
};
