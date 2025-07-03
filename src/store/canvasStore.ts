import { normalizeRect } from '@/utils/rectUtils';
import { observable } from '@legendapp/state';

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

  // 폴리곤 편집 상태
  isEditingPolygon: boolean;
  editingPointIndex: number | null;
  editStartPoint: { x: number; y: number } | null;

  // 크로스헤어 상태
  globalMousePosition: { x: number; y: number } | null;
  screenMousePosition: { x: number; y: number } | null; // 스크린 좌표
  showCrosshair: boolean;

  // 배경 오버레이 상태
  showBackgroundOverlay: boolean;

  // 이미지 조정 상태
  brightness: number; // -100 ~ 100
  contrast: number; // -100 ~ 100

  // 이미지 크기 및 위치 상태
  imageSize: { width: number; height: number }; // 실제 이미지 크기 (캔버스의 75%)
  imagePosition: { x: number; y: number }; // 이미지의 중앙 위치
  canvasSize: { width: number; height: number }; // 캔버스 크기
  originalImageSize: { width: number; height: number }; // 원본 이미지 크기 (비율 유지용)
  scale: number; // 뷰포트 스케일 (기존 scale과 동일)

  // 모드
  mode: 'pan' | 'draw' | 'polygon' | 'select'; // 폴리곤 모드 추가
}

// 폴리곤 2000개 미리 생성

const dummyPolygons = Array.from({ length: 2000 }, (_, i) => ({
  id: `${i + 1}`,
  points: [
    { x: 100 + (i % 100) * 10, y: 100 + Math.floor(i / 100) * 10 },
    { x: 200 + (i % 100) * 10, y: 100 + Math.floor(i / 100) * 10 },
    { x: 200 + (i % 100) * 10, y: 200 + Math.floor(i / 100) * 10 },
  ],
  isComplete: true,
}));

export const canvasStore = observable<CanvasState>({
  // 뷰포트 상태
  position: { x: 0, y: 0 },

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
  polygons: dummyPolygons,
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

  // 폴리곤 편집 상태
  isEditingPolygon: false,
  editingPointIndex: null,
  editStartPoint: null,

  // 크로스헤어 상태
  globalMousePosition: null,
  screenMousePosition: null,
  showCrosshair: false,

  // 배경 오버레이 상태
  showBackgroundOverlay: false,

  // 이미지 조정 상태
  brightness: 0, // -100 ~ 100
  contrast: 0, // -100 ~ 100

  // 이미지 크기 및 위치 상태
  imageSize: { width: 1440, height: 810 }, // 실제 이미지 크기 (캔버스의 75%)
  imagePosition: { x: 960, y: 540 }, // 이미지 중앙 위치 (캔버스 중앙)
  canvasSize: { width: 1920, height: 1080 }, // 기본 캔버스 크기
  originalImageSize: { width: 1920, height: 1080 }, // 원본 이미지 크기
  scale: 1.0, // 뷰포트 스케일

  // 모드
  mode: 'pan',
});

// 액션들
export const canvasActions = {
  // 뷰포트 관련
  setPosition: (position: { x: number; y: number }) => {
    canvasStore.position.set(position);
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
      // 최소 크기 이상일 때만 추가하고 경계 제한 적용
      const clampedRect =
        canvasActions.clampRectangleToImageBounds(drawingRect);
      canvasStore.rectangles.push(clampedRect);
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
      // 폴리곤 완성 시 경계 제한 적용
      const clampedPolygon =
        canvasActions.clampPolygonToImageBounds(completedPolygon);
      canvasStore.polygons.push(clampedPolygon);
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

    // 현재 마우스 위치 업데이트 (폴리곤 그리는 중일 때만) - 경계 제한 없이 자유롭게
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

    // 이미지 경계 내로 제한
    const clampedRect = canvasActions.clampRectangleToImageBounds(newRect);

    const updatedRectangles = [...rectangles];
    updatedRectangles[rectIndex] = clampedRect;
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

      // 이동 시에는 위치만 제한 (크기 유지)
      const clampedRect =
        canvasActions.clampRectanglePositionToImageBounds(newRect);

      const updatedRectangles = [...rectangles];
      updatedRectangles[rectIndex] = clampedRect;
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

      // 이동 시에는 전체 이동량만 제한 (크기 유지)
      const clampedPolygon =
        canvasActions.clampPolygonPositionToImageBounds(newPolygon);

      const updatedPolygons = [...polygons];
      updatedPolygons[polygonIndex] = clampedPolygon;
      canvasStore.polygons.set(updatedPolygons);
    }
  },

  endMove: () => {
    canvasStore.isMoving.set(false);
    canvasStore.moveStartPos.set(null);
    canvasStore.moveStartRect.set(null);
    canvasStore.moveStartPolygon.set(null);
  },

  // 폴리곤 편집 관련
  startEditPolygonPoint: (
    pointIndex: number,
    point: { x: number; y: number }
  ) => {
    canvasStore.isEditingPolygon.set(true);
    canvasStore.editingPointIndex.set(pointIndex);
    canvasStore.editStartPoint.set(point);
  },

  updateEditPolygonPoint: (worldPos: { x: number; y: number }) => {
    const pointIndex = canvasStore.editingPointIndex.get();
    const selectedPolygonId = canvasStore.selectedPolygonId.get();

    if (pointIndex === null || !selectedPolygonId) return;

    const polygons = canvasStore.polygons.get();
    const polygonIndex = polygons.findIndex((p) => p.id === selectedPolygonId);
    if (polygonIndex === -1) return;

    const updatedPolygons = [...polygons];
    const updatedPoints = [...updatedPolygons[polygonIndex].points];
    updatedPoints[pointIndex] = worldPos;

    const updatedPolygon = {
      ...updatedPolygons[polygonIndex],
      points: updatedPoints,
    };

    // 이미지 경계 내로 제한
    const clampedPolygon =
      canvasActions.clampPolygonToImageBounds(updatedPolygon);
    updatedPolygons[polygonIndex] = clampedPolygon;

    canvasStore.polygons.set(updatedPolygons);
  },

  endEditPolygonPoint: () => {
    canvasStore.isEditingPolygon.set(false);
    canvasStore.editingPointIndex.set(null);
    canvasStore.editStartPoint.set(null);
  },

  addPolygonPointAtEdge: (
    edgeIndex: number,
    position: { x: number; y: number }
  ) => {
    const selectedPolygonId = canvasStore.selectedPolygonId.get();
    if (!selectedPolygonId) return;

    const polygons = canvasStore.polygons.get();
    const polygonIndex = polygons.findIndex((p) => p.id === selectedPolygonId);
    if (polygonIndex === -1) return;

    const updatedPolygons = [...polygons];
    const updatedPoints = [...updatedPolygons[polygonIndex].points];

    // edgeIndex 다음 위치에 새 점 삽입
    updatedPoints.splice(edgeIndex + 1, 0, position);

    const updatedPolygon = {
      ...updatedPolygons[polygonIndex],
      points: updatedPoints,
    };

    // 이미지 경계 내로 제한
    const clampedPolygon =
      canvasActions.clampPolygonToImageBounds(updatedPolygon);
    updatedPolygons[polygonIndex] = clampedPolygon;

    canvasStore.polygons.set(updatedPolygons);
  },

  removePolygonPoint: (pointIndex: number) => {
    const selectedPolygonId = canvasStore.selectedPolygonId.get();
    if (!selectedPolygonId) return;

    const polygons = canvasStore.polygons.get();
    const polygonIndex = polygons.findIndex((p) => p.id === selectedPolygonId);
    if (polygonIndex === -1) return;

    const polygon = polygons[polygonIndex];

    // 최소 3개 점은 유지
    if (polygon.points.length <= 3) return;

    const updatedPolygons = [...polygons];
    const updatedPoints = [...polygon.points];
    updatedPoints.splice(pointIndex, 1);

    updatedPolygons[polygonIndex] = {
      ...updatedPolygons[polygonIndex],
      points: updatedPoints,
    };

    canvasStore.polygons.set(updatedPolygons);
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

  // 크로스헤어 관련
  updateGlobalMousePosition: (
    worldPos: { x: number; y: number } | null,
    screenPos?: { x: number; y: number } | null
  ) => {
    canvasStore.globalMousePosition.set(worldPos);
    if (screenPos !== undefined) {
      canvasStore.screenMousePosition.set(screenPos);
    }
  },

  setCrosshairVisible: (visible: boolean) => {
    canvasStore.showCrosshair.set(visible);
  },

  // 배경 오버레이 관련
  setBackgroundOverlay: (enabled: boolean) => {
    canvasStore.showBackgroundOverlay.set(enabled);
  },

  // 이미지 조정 관련
  setBrightness: (value: number) => {
    canvasStore.brightness.set(Math.max(-100, Math.min(100, value)));
  },

  setContrast: (value: number) => {
    canvasStore.contrast.set(Math.max(-100, Math.min(100, value)));
  },

  resetImageAdjustments: () => {
    canvasStore.brightness.set(0);
    canvasStore.contrast.set(0);
  },

  // 이미지 크기 및 위치 관련
  setCanvasSize: (size: { width: number; height: number }) => {
    canvasStore.canvasSize.set(size);

    // 원본 이미지 비율을 유지하면서 캔버스의 75%에 맞추기
    const originalImageSize = canvasStore.originalImageSize.get();
    const targetCanvasSize = {
      width: size.width * 0.75,
      height: size.height * 0.75,
    };

    // 원본 이미지 비율 유지하면서 75% 영역에 맞는 크기 계산
    const scaleX = targetCanvasSize.width / originalImageSize.width;
    const scaleY = targetCanvasSize.height / originalImageSize.height;
    const scale = Math.min(scaleX, scaleY); // 비율 유지를 위해 더 작은 스케일 사용

    const imageSize = {
      width: originalImageSize.width * scale,
      height: originalImageSize.height * scale,
    };

    const centerX = size.width / 2;
    const centerY = size.height / 2;

    canvasStore.imageSize.set(imageSize);
    canvasStore.imagePosition.set({ x: centerX, y: centerY });
  },

  setImageSize: (size: { width: number; height: number }) => {
    canvasStore.imageSize.set(size);
  },

  setImagePosition: (position: { x: number; y: number }) => {
    canvasStore.imagePosition.set(position);
  },

  centerImageInCanvas: () => {
    const canvasSize = canvasStore.canvasSize.get();
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    canvasStore.imagePosition.set({ x: centerX, y: centerY });
  },

  initializeImageLayout: (
    canvasSize: { width: number; height: number },
    originalImageSize?: { width: number; height: number }
  ) => {
    // 캔버스 크기 설정
    canvasStore.canvasSize.set(canvasSize);

    // 원본 이미지 크기 설정 (제공된 경우)
    if (originalImageSize) {
      canvasStore.originalImageSize.set(originalImageSize);
    }

    const currentOriginalImageSize = canvasStore.originalImageSize.get();
    const targetCanvasSize = {
      width: canvasSize.width * 0.75,
      height: canvasSize.height * 0.75,
    };

    // 원본 이미지 비율 유지하면서 75% 영역에 맞는 크기 계산
    const scaleX = targetCanvasSize.width / currentOriginalImageSize.width;
    const scaleY = targetCanvasSize.height / currentOriginalImageSize.height;
    const scale = Math.min(scaleX, scaleY); // 비율 유지를 위해 더 작은 스케일 사용

    const imageSize = {
      width: currentOriginalImageSize.width * scale,
      height: currentOriginalImageSize.height * scale,
    };
    canvasStore.imageSize.set(imageSize);

    // 이미지를 캔버스 중앙에 배치
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    canvasStore.imagePosition.set({ x: centerX, y: centerY });
  },

  // 현재 이미지의 실제 렌더링 크기 계산 (이미지 크기 * 뷰포트 스케일)
  getCurrentImageSize: () => {
    const imageSize = canvasStore.imageSize.get();
    const scale = canvasStore.scale.get();
    return {
      width: imageSize.width * scale,
      height: imageSize.height * scale,
    };
  },

  // 뷰포트 스케일 관련
  setViewportScale: (scale: number) => {
    canvasStore.scale.set(Math.max(0.1, Math.min(5.0, scale)));
  },

  // 이미지 경계 내로 좌표를 제한하는 함수
  clampToImageBounds: (x: number, y: number) => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;

    return {
      x: Math.max(-halfWidth, Math.min(halfWidth, x)),
      y: Math.max(-halfHeight, Math.min(halfHeight, y)),
    };
  },

  // 사각형을 이미지 경계 내로 제한하는 함수
  clampRectangleToImageBounds: (rect: Rectangle): Rectangle => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;

    // 사각형의 실제 경계 계산 (음수 크기 고려)
    const left = rect.width >= 0 ? rect.x : rect.x + rect.width;
    const right = rect.width >= 0 ? rect.x + rect.width : rect.x;
    const top = rect.height >= 0 ? rect.y : rect.y + rect.height;
    const bottom = rect.height >= 0 ? rect.y + rect.height : rect.y;

    // 이미지 경계 내로 제한
    const clampedLeft = Math.max(-halfWidth, Math.min(halfWidth, left));
    const clampedRight = Math.max(-halfWidth, Math.min(halfWidth, right));
    const clampedTop = Math.max(-halfHeight, Math.min(halfHeight, top));
    const clampedBottom = Math.max(-halfHeight, Math.min(halfHeight, bottom));

    // 제한된 좌표로 사각형 재구성
    return {
      ...rect,
      x: clampedLeft,
      y: clampedTop,
      width: clampedRight - clampedLeft,
      height: clampedBottom - clampedTop,
    };
  },

  // 폴리곤을 이미지 경계 내로 제한하는 함수
  clampPolygonToImageBounds: (polygon: Polygon): Polygon => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;

    return {
      ...polygon,
      points: polygon.points.map((point) => ({
        x: Math.max(-halfWidth, Math.min(halfWidth, point.x)),
        y: Math.max(-halfHeight, Math.min(halfHeight, point.y)),
      })),
    };
  },

  // 사각형 이동 시 위치만 제한하는 함수 (크기 유지)
  clampRectanglePositionToImageBounds: (rect: Rectangle): Rectangle => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;

    // 사각형의 실제 경계 계산 (음수 크기 고려)
    const rectLeft = rect.width >= 0 ? rect.x : rect.x + rect.width;
    const rectRight = rect.width >= 0 ? rect.x + rect.width : rect.x;
    const rectTop = rect.height >= 0 ? rect.y : rect.y + rect.height;
    const rectBottom = rect.height >= 0 ? rect.y + rect.height : rect.y;

    const rectWidth = Math.abs(rect.width);
    const rectHeight = Math.abs(rect.height);

    // 사각형이 이미지보다 큰 경우 중앙에 배치
    if (rectWidth > imageSize.width || rectHeight > imageSize.height) {
      return {
        ...rect,
        x: rect.width >= 0 ? -rectWidth / 2 : rectWidth / 2,
        y: rect.height >= 0 ? -rectHeight / 2 : rectHeight / 2,
      };
    }

    // 사각형 위치 제한 (크기 유지)
    let newX = rect.x;
    let newY = rect.y;

    // 왼쪽 경계 체크
    if (rectLeft < -halfWidth) {
      newX = rect.width >= 0 ? -halfWidth : -halfWidth - rect.width;
    }
    // 오른쪽 경계 체크
    else if (rectRight > halfWidth) {
      newX = rect.width >= 0 ? halfWidth - rect.width : halfWidth;
    }

    // 위쪽 경계 체크
    if (rectTop < -halfHeight) {
      newY = rect.height >= 0 ? -halfHeight : -halfHeight - rect.height;
    }
    // 아래쪽 경계 체크
    else if (rectBottom > halfHeight) {
      newY = rect.height >= 0 ? halfHeight - rect.height : halfHeight;
    }

    return {
      ...rect,
      x: newX,
      y: newY,
    };
  },

  // 폴리곤 이동 시 전체 이동량 제한하는 함수
  clampPolygonPositionToImageBounds: (polygon: Polygon): Polygon => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;

    // 폴리곤의 경계 박스 계산
    const xs = polygon.points.map((p) => p.x);
    const ys = polygon.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // 폴리곤이 이미지보다 큰 경우 개별 점 제한
    if (maxX - minX > imageSize.width || maxY - minY > imageSize.height) {
      return {
        ...polygon,
        points: polygon.points.map((point) => ({
          x: Math.max(-halfWidth, Math.min(halfWidth, point.x)),
          y: Math.max(-halfHeight, Math.min(halfHeight, point.y)),
        })),
      };
    }

    // 폴리곤 전체 이동 제한
    let deltaX = 0;
    let deltaY = 0;

    if (minX < -halfWidth) {
      deltaX = -halfWidth - minX;
    } else if (maxX > halfWidth) {
      deltaX = halfWidth - maxX;
    }

    if (minY < -halfHeight) {
      deltaY = -halfHeight - minY;
    } else if (maxY > halfHeight) {
      deltaY = halfHeight - maxY;
    }

    return {
      ...polygon,
      points: polygon.points.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      })),
    };
  },

  // 이미지 중심 기준 좌표를 원본 이미지 절대 좌표로 변환
  convertToAbsoluteCoordinates: () => {
    const imageSize = canvasStore.imageSize.get();
    const originalImageSize = canvasStore.originalImageSize.get();
    const rectangles = canvasStore.rectangles.get();
    const polygons = canvasStore.polygons.get();

    // 스케일 비율 계산 (현재 이미지 크기 대비 원본 이미지 크기)
    const scaleX = originalImageSize.width / imageSize.width;
    const scaleY = originalImageSize.height / imageSize.height;

    // 사각형들을 절대 좌표로 변환
    const absoluteRectangles = rectangles.map((rect) => {
      // 이미지 중심 기준 좌표 (rect.x, rect.y)를 원본 이미지 좌상단 기준으로 변환
      const absoluteX = (rect.x + imageSize.width / 2) * scaleX;
      const absoluteY = (rect.y + imageSize.height / 2) * scaleY;
      const absoluteWidth = rect.width * scaleX;
      const absoluteHeight = rect.height * scaleY;

      return {
        id: rect.id,
        x: Math.round(absoluteX),
        y: Math.round(absoluteY),
        width: Math.round(absoluteWidth),
        height: Math.round(absoluteHeight),
        label: rect.label,
        color: rect.color,
      };
    });

    // 폴리곤들을 절대 좌표로 변환
    const absolutePolygons = polygons.map((polygon) => ({
      id: polygon.id,
      points: polygon.points.map((point) => {
        // 이미지 중심 기준 좌표를 원본 이미지 좌상단 기준으로 변환
        const absoluteX = (point.x + imageSize.width / 2) * scaleX;
        const absoluteY = (point.y + imageSize.height / 2) * scaleY;

        return {
          x: Math.round(absoluteX),
          y: Math.round(absoluteY),
        };
      }),
      isComplete: polygon.isComplete,
      label: polygon.label,
      color: polygon.color,
    }));

    return {
      rectangles: absoluteRectangles,
      polygons: absolutePolygons,
      originalImageSize,
      metadata: {
        convertedAt: new Date().toISOString(),
        imageSize: imageSize,
        originalImageSize: originalImageSize,
        scaleX,
        scaleY,
      },
    };
  },

  // 단일 사각형을 절대 좌표로 변환
  convertRectangleToAbsolute: (rect: Rectangle) => {
    const imageSize = canvasStore.imageSize.get();
    const originalImageSize = canvasStore.originalImageSize.get();

    const scaleX = originalImageSize.width / imageSize.width;
    const scaleY = originalImageSize.height / imageSize.height;

    const absoluteX = (rect.x + imageSize.width / 2) * scaleX;
    const absoluteY = (rect.y + imageSize.height / 2) * scaleY;
    const absoluteWidth = rect.width * scaleX;
    const absoluteHeight = rect.height * scaleY;

    return {
      id: rect.id,
      x: Math.round(absoluteX),
      y: Math.round(absoluteY),
      width: Math.round(absoluteWidth),
      height: Math.round(absoluteHeight),
      label: rect.label,
      color: rect.color,
    };
  },

  // 단일 폴리곤을 절대 좌표로 변환
  convertPolygonToAbsolute: (polygon: Polygon) => {
    const imageSize = canvasStore.imageSize.get();
    const originalImageSize = canvasStore.originalImageSize.get();

    const scaleX = originalImageSize.width / imageSize.width;
    const scaleY = originalImageSize.height / imageSize.height;

    return {
      id: polygon.id,
      points: polygon.points.map((point) => {
        const absoluteX = (point.x + imageSize.width / 2) * scaleX;
        const absoluteY = (point.y + imageSize.height / 2) * scaleY;

        return {
          x: Math.round(absoluteX),
          y: Math.round(absoluteY),
        };
      }),
      isComplete: polygon.isComplete,
      label: polygon.label,
      color: polygon.color,
    };
  },

  // 절대 좌표를 이미지 중심 기준 좌표로 변환 (서버에서 받은 데이터 복원용)
  convertFromAbsoluteCoordinates: (
    absoluteRectangles: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      label?: string;
      color?: string;
    }>,
    absolutePolygons: Array<{
      id: string;
      points: Array<{ x: number; y: number }>;
      isComplete?: boolean;
      label?: string;
      color?: string;
    }>,
    serverOriginalImageSize: { width: number; height: number }
  ) => {
    const imageSize = canvasStore.imageSize.get();

    // 서버의 원본 이미지 크기와 현재 원본 이미지 크기가 다를 수 있으므로 비율 계산
    const scaleX = imageSize.width / serverOriginalImageSize.width;
    const scaleY = imageSize.height / serverOriginalImageSize.height;

    // 사각형들을 이미지 중심 기준 좌표로 변환
    const rectangles = absoluteRectangles.map((rect) => {
      const relativeX = rect.x * scaleX - imageSize.width / 2;
      const relativeY = rect.y * scaleY - imageSize.height / 2;
      const relativeWidth = rect.width * scaleX;
      const relativeHeight = rect.height * scaleY;

      return {
        id: rect.id,
        x: relativeX,
        y: relativeY,
        width: relativeWidth,
        height: relativeHeight,
        label: rect.label,
        color: rect.color || '#ff0000',
      };
    });

    // 폴리곤들을 이미지 중심 기준 좌표로 변환
    const polygons = absolutePolygons.map((polygon) => ({
      id: polygon.id,
      points: polygon.points.map((point) => {
        const relativeX = point.x * scaleX - imageSize.width / 2;
        const relativeY = point.y * scaleY - imageSize.height / 2;

        return {
          x: relativeX,
          y: relativeY,
        };
      }),
      isComplete: polygon.isComplete ?? true,
      label: polygon.label,
      color: polygon.color || '#00ff00',
    }));

    return {
      rectangles,
      polygons,
    };
  },
};
