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

  // 선택 상태
  selectedRectId: string | null;
  isResizing: boolean;
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' | null;
  resizeStartRect: Rectangle | null;

  // 이동 상태
  isMoving: boolean;
  moveStartPos: { x: number; y: number } | null;
  moveStartRect: Rectangle | null;

  // 모드
  mode: 'pan' | 'draw' | 'select'; // 선택 모드 추가
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

  // 선택 상태
  selectedRectId: null,
  isResizing: false,
  resizeHandle: null,
  resizeStartRect: null,

  // 이동 상태
  isMoving: false,
  moveStartPos: null,
  moveStartRect: null,

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
  setMode: (mode: 'pan' | 'draw' | 'select') => {
    canvasStore.mode.set(mode);
    // 모드 변경 시 선택 해제
    if (mode !== 'select') {
      canvasStore.selectedRectId.set(null);
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

  // 선택 관련
  selectRectangle: (id: string | null) => {
    canvasStore.selectedRectId.set(id);
  },

  startResize: (
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w',
    rect: Rectangle
  ) => {
    canvasStore.isResizing.set(true);
    canvasStore.resizeHandle.set(handle);
    canvasStore.resizeStartRect.set({ ...rect });
  },

  updateResize: (worldPos: { x: number; y: number }) => {
    const handle = canvasStore.resizeHandle.get();
    const startRect = canvasStore.resizeStartRect.get();
    const selectedId = canvasStore.selectedRectId.get();

    if (!handle || !startRect || !selectedId) return;

    const rectangles = canvasStore.rectangles.get();
    const rectIndex = rectangles.findIndex((r) => r.id === selectedId);
    if (rectIndex === -1) return;

    const newRect = { ...startRect };

    // 핸들에 따른 리사이즈 로직
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

    // 최소 크기 제한
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
  startMove: (worldPos: { x: number; y: number }, rect: Rectangle) => {
    canvasStore.isMoving.set(true);
    canvasStore.moveStartPos.set(worldPos);
    canvasStore.moveStartRect.set({ ...rect });
  },

  updateMove: (worldPos: { x: number; y: number }) => {
    const startPos = canvasStore.moveStartPos.get();
    const startRect = canvasStore.moveStartRect.get();
    const selectedId = canvasStore.selectedRectId.get();

    if (!startPos || !startRect || !selectedId) return;

    const rectangles = canvasStore.rectangles.get();
    const rectIndex = rectangles.findIndex((r) => r.id === selectedId);
    if (rectIndex === -1) return;

    // 이동량 계산
    const deltaX = worldPos.x - startPos.x;
    const deltaY = worldPos.y - startPos.y;

    // 새 위치 적용
    const newRect = {
      ...startRect,
      x: startRect.x + deltaX,
      y: startRect.y + deltaY,
    };

    const updatedRectangles = [...rectangles];
    updatedRectangles[rectIndex] = newRect;
    canvasStore.rectangles.set(updatedRectangles);
  },

  endMove: () => {
    canvasStore.isMoving.set(false);
    canvasStore.moveStartPos.set(null);
    canvasStore.moveStartRect.set(null);
  },

  removeRectangle: (id: string) => {
    const rectangles = canvasStore.rectangles.get();
    canvasStore.rectangles.set(rectangles.filter((rect) => rect.id !== id));
    // 삭제된 사각형이 선택되어 있었다면 선택 해제
    if (canvasStore.selectedRectId.get() === id) {
      canvasStore.selectedRectId.set(null);
    }
  },

  clearRectangles: () => {
    canvasStore.rectangles.set([]);
    canvasStore.selectedRectId.set(null);
  },
};
