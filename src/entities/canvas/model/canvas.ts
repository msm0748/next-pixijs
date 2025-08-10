import { normalizeRect } from '@shared/lib/rect';
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
  position: { x: number; y: number };
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  positionStart: { x: number; y: number } | null;
  isDrawing: boolean;
  drawingRect: Rectangle | null;
  rectangles: Rectangle[];
  isDrawingPolygon: boolean;
  currentPolygon: Polygon | null;
  polygons: Polygon[];
  hoveredPointIndex: number | null;
  currentMousePosition: { x: number; y: number } | null;
  selectedRectId: string | null;
  selectedPolygonId: string | null;
  isResizing: boolean;
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' | null;
  resizeStartRect: Rectangle | null;
  isMoving: boolean;
  moveStartPos: { x: number; y: number } | null;
  moveStartRect: Rectangle | null;
  moveStartPolygon: Polygon | null;
  isEditingPolygon: boolean;
  editingPointIndex: number | null;
  editStartPoint: { x: number; y: number } | null;
  globalMousePosition: { x: number; y: number } | null;
  screenMousePosition: { x: number; y: number } | null;
  showCrosshair: boolean;
  showBackgroundOverlay: boolean;
  brightness: number;
  contrast: number;
  imageSize: { width: number; height: number };
  imagePosition: { x: number; y: number };
  canvasSize: { width: number; height: number };
  originalImageSize: { width: number; height: number };
  scale: number;
  mode: 'pan' | 'draw' | 'polygon' | 'select';
  // History stacks for undo/redo
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  // Skip the very next history push (used to coalesce chained actions)
  historySkipNext: boolean;
}

// const dummyPolygons = Array.from({ length: 2000 }, (_, i) => ({
//   id: `${i + 1}`,
//   points: [
//     { x: 100 + (i % 100) * 10, y: 100 + Math.floor(i / 100) * 10 },
//     { x: 200 + (i % 100) * 10, y: 100 + Math.floor(i / 100) * 10 },
//     { x: 200 + (i % 100) * 10, y: 200 + Math.floor(i / 100) * 10 },
//   ],
//   isComplete: true,
// }));

export const canvasStore = observable<CanvasState>({
  position: { x: 0, y: 0 },
  isDragging: false,
  dragStart: null,
  positionStart: null,
  isDrawing: false,
  drawingRect: null,
  rectangles: [],
  isDrawingPolygon: false,
  currentPolygon: null,
  polygons: [],
  hoveredPointIndex: null,
  currentMousePosition: null,
  selectedRectId: null,
  selectedPolygonId: null,
  isResizing: false,
  resizeHandle: null,
  resizeStartRect: null,
  isMoving: false,
  moveStartPos: null,
  moveStartRect: null,
  moveStartPolygon: null,
  isEditingPolygon: false,
  editingPointIndex: null,
  editStartPoint: null,
  globalMousePosition: null,
  screenMousePosition: null,
  showCrosshair: false,
  showBackgroundOverlay: false,
  brightness: 0,
  contrast: 0,
  imageSize: { width: 1440, height: 810 },
  imagePosition: { x: 960, y: 540 },
  canvasSize: { width: 1920, height: 1080 },
  originalImageSize: { width: 1920, height: 1080 },
  scale: 1.0,
  mode: 'pan',
  historyPast: [],
  historyFuture: [],
  historySkipNext: false,
});

interface HistorySnapshot {
  rectangles: Rectangle[];
  polygons: Polygon[];
  isDrawingPolygon: boolean;
  currentPolygon: Polygon | null;
}

const cloneRectangles = (rects: Rectangle[]): Rectangle[] =>
  rects.map((r) => ({ ...r }));

const clonePolygons = (polys: Polygon[]): Polygon[] =>
  polys.map((p) => ({
    ...p,
    points: p.points.map((pt) => ({ ...pt })),
  }));

const clonePolygon = (poly: Polygon | null): Polygon | null =>
  poly
    ? {
        ...poly,
        points: poly.points.map((pt) => ({ ...pt })),
      }
    : null;

const takeSnapshot = (): HistorySnapshot => {
  const rectangles = canvasStore.rectangles.get();
  const polygons = canvasStore.polygons.get();
  const isDrawingPolygon = canvasStore.isDrawingPolygon.get();
  const currentPolygon = canvasStore.currentPolygon.get();
  return {
    rectangles: cloneRectangles(rectangles),
    polygons: clonePolygons(polygons),
    isDrawingPolygon,
    currentPolygon: clonePolygon(currentPolygon),
  };
};

const restoreSnapshot = (snapshot: HistorySnapshot) => {
  canvasStore.rectangles.set(cloneRectangles(snapshot.rectangles));
  canvasStore.polygons.set(clonePolygons(snapshot.polygons));
  canvasStore.isDrawingPolygon.set(snapshot.isDrawingPolygon);
  canvasStore.currentPolygon.set(clonePolygon(snapshot.currentPolygon));
  // Validate selection after restore
  const currentRectId = canvasStore.selectedRectId.get();
  const currentPolyId = canvasStore.selectedPolygonId.get();
  if (currentRectId) {
    const exists = snapshot.rectangles.some((r) => r.id === currentRectId);
    if (!exists) canvasStore.selectedRectId.set(null);
  }
  if (currentPolyId) {
    const exists = snapshot.polygons.some((p) => p.id === currentPolyId);
    if (!exists) canvasStore.selectedPolygonId.set(null);
  }
};

const pushHistorySnapshot = () => {
  // If flagged, consume the flag and skip this push to avoid double history
  if (canvasStore.historySkipNext.get()) {
    canvasStore.historySkipNext.set(false);
    return;
  }
  const past = canvasStore.historyPast.get();
  const snapshot = takeSnapshot();
  const newPast = [...past, snapshot];
  if (newPast.length > 15) newPast.shift();
  canvasStore.historyPast.set(newPast);
  // New action invalidates redo stack
  canvasStore.historyFuture.set([]);
};

export const canvasActions = {
  setPosition: (position: { x: number; y: number }) => {
    canvasStore.position.set(position);
  },
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
  setMode: (mode: 'pan' | 'draw' | 'polygon' | 'select') => {
    canvasStore.mode.set(mode);
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
      // Record history before committing rectangle
      pushHistorySnapshot();
      const clampedRect =
        canvasActions.clampRectangleToImageBounds(drawingRect);
      canvasStore.rectangles.push(clampedRect);
    }
    canvasStore.isDrawing.set(false);
    canvasStore.drawingRect.set(null);
  },
  startPolygon: (point: { x: number; y: number }) => {
    // Record history before starting a new polygon
    pushHistorySnapshot();
    const newPolygon: Polygon = {
      id: Date.now().toString(),
      points: [point],
      isComplete: false,
      color: '#ff0000',
    };
    canvasStore.isDrawingPolygon.set(true);
    canvasStore.currentPolygon.set(newPolygon);
    canvasStore.currentMousePosition.set(point);
  },
  addPolygonPoint: (point: { x: number; y: number }) => {
    const currentPolygon = canvasStore.currentPolygon.get();
    if (!currentPolygon) return;
    const firstPoint = currentPolygon.points[0];
    const distance = Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y);
    if (distance <= 10 && currentPolygon.points.length >= 3) {
      const completedPolygon = { ...currentPolygon, isComplete: true };
      // Record history before committing polygon
      pushHistorySnapshot();
      const clampedPolygon =
        canvasActions.clampPolygonToImageBounds(completedPolygon);
      canvasStore.polygons.push(clampedPolygon);
      canvasStore.isDrawingPolygon.set(false);
      canvasStore.currentPolygon.set(null);
      canvasStore.hoveredPointIndex.set(null);
      canvasStore.currentMousePosition.set(null);
    } else {
      // Record history before adding each point to the in-progress polygon
      pushHistorySnapshot();
      const updatedPolygon = {
        ...currentPolygon,
        points: [...currentPolygon.points, point],
      };
      canvasStore.currentPolygon.set(updatedPolygon);
    }
  },
  updatePolygonHover: (mousePos: { x: number; y: number }) => {
    const currentPolygon = canvasStore.currentPolygon.get();
    if (canvasStore.isDrawingPolygon.get()) {
      canvasStore.currentMousePosition.set(mousePos);
    }
    if (!currentPolygon || currentPolygon.points.length < 3) {
      canvasStore.hoveredPointIndex.set(null);
      return;
    }
    const firstPoint = currentPolygon.points[0];
    const distance = Math.hypot(
      mousePos.x - firstPoint.x,
      mousePos.y - firstPoint.y
    );
    if (distance <= 10) {
      canvasStore.hoveredPointIndex.set(0);
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
  selectRectangle: (id: string | null) => {
    canvasStore.selectedRectId.set(id);
    canvasStore.selectedPolygonId.set(null);
  },
  selectPolygon: (id: string | null) => {
    canvasStore.selectedPolygonId.set(id);
    canvasStore.selectedRectId.set(null);
  },
  startResize: (
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w',
    rect: Rectangle
  ) => {
    // Record history at the start of a resize interaction
    pushHistorySnapshot();
    canvasStore.isResizing.set(true);
    canvasStore.resizeHandle.set(handle);
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
    const newRect = { ...startRect };
    switch (handle) {
      case 'nw':
        newRect.width = startRect.x + startRect.width - worldPos.x;
        newRect.height = startRect.y + startRect.height - worldPos.y;
        newRect.x = worldPos.x;
        newRect.y = worldPos.y;
        break;
      case 'ne':
        newRect.width = worldPos.x - startRect.x;
        newRect.height = startRect.y + startRect.height - worldPos.y;
        newRect.y = worldPos.y;
        break;
      case 'sw':
        newRect.width = startRect.x + startRect.width - worldPos.x;
        newRect.height = worldPos.y - startRect.y;
        newRect.x = worldPos.x;
        break;
      case 'se':
        newRect.width = worldPos.x - startRect.x;
        newRect.height = worldPos.y - startRect.y;
        break;
      case 'n':
        newRect.height = startRect.y + startRect.height - worldPos.y;
        newRect.y = worldPos.y;
        break;
      case 's':
        newRect.height = worldPos.y - startRect.y;
        break;
      case 'w':
        newRect.width = startRect.x + startRect.width - worldPos.x;
        newRect.x = worldPos.x;
        break;
      case 'e':
        newRect.width = worldPos.x - startRect.x;
        break;
    }
    if (Math.abs(newRect.width) < 10) return;
    if (Math.abs(newRect.height) < 10) return;
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
  startMove: (
    worldPos: { x: number; y: number },
    rect?: Rectangle,
    polygon?: Polygon
  ) => {
    // Record history at the start of a move interaction
    if (rect || polygon) {
      pushHistorySnapshot();
    }
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
    const deltaX = worldPos.x - startPos.x;
    const deltaY = worldPos.y - startPos.y;
    if (startRect && selectedRectId) {
      const rectangles = canvasStore.rectangles.get();
      const rectIndex = rectangles.findIndex((r) => r.id === selectedRectId);
      if (rectIndex === -1) return;
      const newRect = {
        ...startRect,
        x: startRect.x + deltaX,
        y: startRect.y + deltaY,
      };
      const clampedRect =
        canvasActions.clampRectanglePositionToImageBounds(newRect);
      const updatedRectangles = [...rectangles];
      updatedRectangles[rectIndex] = clampedRect;
      canvasStore.rectangles.set(updatedRectangles);
    }
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
  startEditPolygonPoint: (
    pointIndex: number,
    point: { x: number; y: number }
  ) => {
    // Record history at the start of a point edit interaction
    pushHistorySnapshot();
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
    // Record history before inserting a point
    pushHistorySnapshot();
    // Avoid immediate double history when we also start editing this new point
    canvasStore.historySkipNext.set(true);
    const polygons = canvasStore.polygons.get();
    const polygonIndex = polygons.findIndex((p) => p.id === selectedPolygonId);
    if (polygonIndex === -1) return;
    const updatedPolygons = [...polygons];
    const updatedPoints = [...updatedPolygons[polygonIndex].points];
    updatedPoints.splice(edgeIndex + 1, 0, position);
    const updatedPolygon = {
      ...updatedPolygons[polygonIndex],
      points: updatedPoints,
    };
    const clampedPolygon =
      canvasActions.clampPolygonToImageBounds(updatedPolygon);
    updatedPolygons[polygonIndex] = clampedPolygon;
    canvasStore.polygons.set(updatedPolygons);
  },
  removePolygonPoint: (pointIndex: number) => {
    const selectedPolygonId = canvasStore.selectedPolygonId.get();
    if (!selectedPolygonId) return;
    // Record history before removing a point
    pushHistorySnapshot();
    const polygons = canvasStore.polygons.get();
    const polygonIndex = polygons.findIndex((p) => p.id === selectedPolygonId);
    if (polygonIndex === -1) return;
    const polygon = polygons[polygonIndex];
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
    // Record history before removing a rectangle
    pushHistorySnapshot();
    const rectangles = canvasStore.rectangles.get();
    canvasStore.rectangles.set(rectangles.filter((rect) => rect.id !== id));
    if (canvasStore.selectedRectId.get() === id) {
      canvasStore.selectedRectId.set(null);
    }
  },
  removePolygon: (id: string) => {
    // Record history before removing a polygon
    pushHistorySnapshot();
    const polygons = canvasStore.polygons.get();
    canvasStore.polygons.set(polygons.filter((polygon) => polygon.id !== id));
    if (canvasStore.selectedPolygonId.get() === id) {
      canvasStore.selectedPolygonId.set(null);
    }
  },

  clearAll: () => {
    // Record history before clearing all shapes
    if (
      canvasStore.rectangles.get().length > 0 ||
      canvasStore.polygons.get().length > 0
    ) {
      pushHistorySnapshot();
    }
    canvasStore.rectangles.set([]);
    canvasStore.polygons.set([]);
    canvasStore.selectedRectId.set(null);
    canvasStore.selectedPolygonId.set(null);
    canvasStore.isDrawingPolygon.set(false);
    canvasStore.currentPolygon.set(null);
    canvasStore.hoveredPointIndex.set(null);
    canvasStore.currentMousePosition.set(null);
  },
  undo: () => {
    const past = canvasStore.historyPast.get();
    if (past.length === 0) return;
    const currentSnapshot = takeSnapshot();
    const previous = past[past.length - 1];
    canvasStore.historyPast.set(past.slice(0, past.length - 1));
    const future = canvasStore.historyFuture.get();
    const newFuture = [...future, currentSnapshot];
    if (newFuture.length > 15) newFuture.shift();
    canvasStore.historyFuture.set(newFuture);
    restoreSnapshot(previous);
  },
  redo: () => {
    const future = canvasStore.historyFuture.get();
    if (future.length === 0) return;
    const currentSnapshot = takeSnapshot();
    const next = future[future.length - 1];
    canvasStore.historyFuture.set(future.slice(0, future.length - 1));
    const past = canvasStore.historyPast.get();
    const newPast = [...past, currentSnapshot];
    if (newPast.length > 15) newPast.shift();
    canvasStore.historyPast.set(newPast);
    restoreSnapshot(next);
  },
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
  setBackgroundOverlay: (enabled: boolean) => {
    canvasStore.showBackgroundOverlay.set(enabled);
  },
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
  setCanvasSize: (size: { width: number; height: number }) => {
    canvasStore.canvasSize.set(size);
    const originalImageSize = canvasStore.originalImageSize.get();
    const targetCanvasSize = {
      width: size.width * 0.75,
      height: size.height * 0.75,
    };
    const scaleX = targetCanvasSize.width / originalImageSize.width;
    const scaleY = targetCanvasSize.height / originalImageSize.height;
    const scale = Math.min(scaleX, scaleY);
    const imageSize = {
      width: originalImageSize.width * scale,
      height: originalImageSize.height * scale,
    };
    const centerX = size.width / 2;
    const centerY = size.height / 2;
    canvasStore.imageSize.set(imageSize);
    canvasStore.imagePosition.set({ x: centerX, y: centerY });
  },

  initializeImageLayout: (
    canvasSize: { width: number; height: number },
    originalImageSize?: { width: number; height: number }
  ) => {
    canvasStore.canvasSize.set(canvasSize);
    if (originalImageSize) {
      canvasStore.originalImageSize.set(originalImageSize);
    }
    const currentOriginalImageSize = canvasStore.originalImageSize.get();
    const targetCanvasSize = {
      width: canvasSize.width * 0.75,
      height: canvasSize.height * 0.75,
    };
    const scaleX = targetCanvasSize.width / currentOriginalImageSize.width;
    const scaleY = targetCanvasSize.height / currentOriginalImageSize.height;
    const scale = Math.min(scaleX, scaleY);
    const imageSize = {
      width: currentOriginalImageSize.width * scale,
      height: currentOriginalImageSize.height * scale,
    };
    canvasStore.imageSize.set(imageSize);
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    canvasStore.imagePosition.set({ x: centerX, y: centerY });
  },

  setViewportScale: (scale: number) => {
    canvasStore.scale.set(Math.max(0.1, Math.min(5.0, scale)));
  },
  clampToImageBounds: (x: number, y: number) => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;
    return {
      x: Math.max(-halfWidth, Math.min(halfWidth, x)),
      y: Math.max(-halfHeight, Math.min(halfHeight, y)),
    };
  },
  clampRectangleToImageBounds: (rect: Rectangle): Rectangle => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;
    const left = rect.width >= 0 ? rect.x : rect.x + rect.width;
    const right = rect.width >= 0 ? rect.x + rect.width : rect.x;
    const top = rect.height >= 0 ? rect.y : rect.y + rect.height;
    const bottom = rect.height >= 0 ? rect.y + rect.height : rect.y;
    const clampedLeft = Math.max(-halfWidth, Math.min(halfWidth, left));
    const clampedRight = Math.max(-halfWidth, Math.min(halfWidth, right));
    const clampedTop = Math.max(-halfHeight, Math.min(halfHeight, top));
    const clampedBottom = Math.max(-halfHeight, Math.min(halfHeight, bottom));
    return {
      ...rect,
      x: clampedLeft,
      y: clampedTop,
      width: clampedRight - clampedLeft,
      height: clampedBottom - clampedTop,
    };
  },
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
  clampRectanglePositionToImageBounds: (rect: Rectangle): Rectangle => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;
    const rectLeft = rect.width >= 0 ? rect.x : rect.x + rect.width;
    const rectRight = rect.width >= 0 ? rect.x + rect.width : rect.x;
    const rectTop = rect.height >= 0 ? rect.y : rect.y + rect.height;
    const rectBottom = rect.height >= 0 ? rect.y + rect.height : rect.y;
    const rectWidth = Math.abs(rect.width);
    const rectHeight = Math.abs(rect.height);
    if (rectWidth > imageSize.width || rectHeight > imageSize.height) {
      return {
        ...rect,
        x: rect.width >= 0 ? -rectWidth / 2 : rectWidth / 2,
        y: rect.height >= 0 ? -rectHeight / 2 : rectHeight / 2,
      };
    }
    let newX = rect.x;
    let newY = rect.y;
    if (rectLeft < -halfWidth) {
      newX = rect.width >= 0 ? -halfWidth : -halfWidth - rect.width;
    } else if (rectRight > halfWidth) {
      newX = rect.width >= 0 ? halfWidth - rect.width : halfWidth;
    }
    if (rectTop < -halfHeight) {
      newY = rect.height >= 0 ? -halfHeight : -halfHeight - rect.height;
    } else if (rectBottom > halfHeight) {
      newY = rect.height >= 0 ? halfHeight - rect.height : halfHeight;
    }
    return { ...rect, x: newX, y: newY };
  },
  clampPolygonPositionToImageBounds: (polygon: Polygon): Polygon => {
    const imageSize = canvasStore.imageSize.get();
    const halfWidth = imageSize.width / 2;
    const halfHeight = imageSize.height / 2;
    const xs = polygon.points.map((p) => p.x);
    const ys = polygon.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX - minX > imageSize.width || maxY - minY > imageSize.height) {
      return {
        ...polygon,
        points: polygon.points.map((point) => ({
          x: Math.max(-halfWidth, Math.min(halfWidth, point.x)),
          y: Math.max(-halfHeight, Math.min(halfHeight, point.y)),
        })),
      };
    }
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
  convertToAbsoluteCoordinates: () => {
    const imageSize = canvasStore.imageSize.get();
    const originalImageSize = canvasStore.originalImageSize.get();
    const rectangles = canvasStore.rectangles.get();
    const polygons = canvasStore.polygons.get();
    const scaleX = originalImageSize.width / imageSize.width;
    const scaleY = originalImageSize.height / imageSize.height;
    const absoluteRectangles = rectangles.map((rect) => {
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
    const absolutePolygons = polygons.map((polygon) => ({
      id: polygon.id,
      points: polygon.points.map((point) => {
        const absoluteX = (point.x + imageSize.width / 2) * scaleX;
        const absoluteY = (point.y + imageSize.height / 2) * scaleY;
        return { x: Math.round(absoluteX), y: Math.round(absoluteY) };
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
};

export type { Rectangle as CanvasRectangle, Polygon as CanvasPolygon };
