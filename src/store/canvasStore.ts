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

  // 모드
  mode: 'pan' | 'draw'; // 패닝 모드 또는 그리기 모드
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
  setMode: (mode: 'pan' | 'draw') => {
    canvasStore.mode.set(mode);
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

  removeRectangle: (id: string) => {
    const rectangles = canvasStore.rectangles.get();
    canvasStore.rectangles.set(rectangles.filter((rect) => rect.id !== id));
  },

  clearRectangles: () => {
    canvasStore.rectangles.set([]);
  },
};
