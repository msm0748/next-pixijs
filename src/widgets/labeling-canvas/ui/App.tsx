'use client';

import { Application, extend } from '@pixi/react';
import { Container, Sprite, Graphics, Assets, Texture } from 'pixi.js';
import { useState, useRef, PointerEvent, useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { usePathname } from 'next/navigation';
import {
  canvasStore,
  canvasActions,
  type CanvasRectangle as Rectangle,
  type CanvasPolygon as Polygon,
} from '@entities/canvas';
import { RectangleRenderer } from './RectangleRenderer';
import { PolygonRenderer } from './PolygonRenderer';
import { SelectionHandles } from './SelectionHandles';
import { PolygonSelectionHandles } from './PolygonSelectionHandles';
import { Crosshair } from './Crosshair';
import { BackgroundOverlay } from './BackgroundOverlay';
import { ImageFilter } from './ImageFilter';
import ImageAdjustmentPanel from '@features/image-adjustment';
import { findRectAtPosition } from '@shared/lib/rect';
import {
  findPolygonAtPosition,
  getHandleAtPosition,
  getPointHandleAtPosition,
  getPointOnEdge,
} from '@shared/lib/polygon';
import { sendApiData } from '@shared/api/labels';
import { debounce } from 'lodash';
import Tools from '@features/tools';

extend({ Container, Sprite, Graphics });

const App = observer(() => {
  const [texture, setTexture] = useState<Texture | null>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await Assets.load('/test.jpg');
        setTexture(loadedTexture);
        const canvasSize = {
          width: typeof window !== 'undefined' ? window.innerWidth : 1920,
          height: typeof window !== 'undefined' ? window.innerHeight : 1080,
        };
        const originalImageSize = {
          width: loadedTexture.width,
          height: loadedTexture.height,
        };
        canvasActions.initializeImageLayout(canvasSize, originalImageSize);
      } catch (error) {
        console.error('텍스처 로드 실패:', error);
      }
    };
    loadTexture();
  }, []);

  useEffect(() => {
    const handleResize = debounce(() => {
      if (texture) {
        const newCanvasSize = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
        setCanvasSize(newCanvasSize);
        const oldImageSize = canvasStore.imageSize.get();
        canvasActions.setCanvasSize(newCanvasSize);
        const newImageSize = canvasStore.imageSize.get();
        const scaleX = newImageSize.width / oldImageSize.width;
        const scaleY = newImageSize.height / oldImageSize.height;
        const currentRectangles = canvasStore.rectangles.get();
        const currentPolygons = canvasStore.polygons.get();
        const updatedRectangles = currentRectangles.map((rect) => ({
          ...rect,
          x: rect.x * scaleX,
          y: rect.y * scaleY,
          width: rect.width * scaleX,
          height: rect.height * scaleY,
        }));
        const updatedPolygons = currentPolygons.map((polygon) => ({
          ...polygon,
          points: polygon.points.map((point) => ({
            x: point.x * scaleX,
            y: point.y * scaleY,
          })),
        }));
        canvasStore.rectangles.set(updatedRectangles);
        canvasStore.polygons.set(updatedPolygons);
        canvasActions.setViewportScale(1.0);
        canvasActions.setPosition({ x: 0, y: 0 });
      }
    }, 300);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, [texture]);

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const currentScale = canvasStore.scale.get();
    const currentPosition = canvasStore.position.get();
    if (e.metaKey || e.ctrlKey) {
      const scaleFactor = 1.1;
      const calculatedScale =
        e.deltaY < 0 ? currentScale * scaleFactor : currentScale / scaleFactor;
      const newScale = Math.max(0.1, Math.min(5, calculatedScale));
      if (newScale === currentScale) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newPosition = {
        x: mouseX - (mouseX - currentPosition.x) * (newScale / currentScale),
        y: mouseY - (mouseY - currentPosition.y) * (newScale / currentScale),
      };
      canvasActions.setViewportScale(newScale);
      canvasActions.setPosition(newPosition);
    } else {
      const scrollSpeed = 50;
      const newPosition = {
        x:
          currentPosition.x -
          (e.deltaX > 0 ? scrollSpeed : e.deltaX < 0 ? -scrollSpeed : 0),
        y:
          currentPosition.y -
          (e.deltaY > 0 ? scrollSpeed : e.deltaY < 0 ? -scrollSpeed : 0),
      };
      canvasActions.setPosition(newPosition);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [texture]);

  const screenToWorld = (screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const currentPosition = canvasStore.position.get();
    const currentScale = canvasStore.scale.get();
    const imagePosition = canvasStore.imagePosition.get();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;
    const worldX = (localX - currentPosition.x) / currentScale;
    const worldY = (localY - currentPosition.y) / currentScale;
    return { x: worldX - imagePosition.x, y: worldY - imagePosition.y };
  };

  const screenToGlobalWorld = (screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const currentPosition = canvasStore.position.get();
    const currentScale = canvasStore.scale.get();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;
    return {
      x: (localX - currentPosition.x) / currentScale,
      y: (localY - currentPosition.y) / currentScale,
    };
  };

  const handlePointerDown = (e: PointerEvent) => {
    const currentMode = canvasStore.mode.get();
    const currentPosition = canvasStore.position.get();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    if (currentMode === 'pan') {
      canvasActions.startDrag(
        { x: e.clientX, y: e.clientY },
        { x: currentPosition.x, y: currentPosition.y }
      );
    } else if (currentMode === 'draw') {
      const clampedPos = canvasActions.clampToImageBounds(
        worldPos.x,
        worldPos.y
      );
      const newRect: Rectangle = {
        id: `rect-${Date.now()}`,
        x: clampedPos.x,
        y: clampedPos.y,
        width: 0,
        height: 0,
        color: '#ff0000',
      };
      canvasActions.startDrawing(newRect);
    } else if (currentMode === 'polygon') {
      const isDrawing = canvasStore.isDrawingPolygon.get();
      if (!isDrawing) {
        const clampedPos = canvasActions.clampToImageBounds(
          worldPos.x,
          worldPos.y
        );
        canvasActions.startPolygon(clampedPos);
      } else {
        const clampedPos = canvasActions.clampToImageBounds(
          worldPos.x,
          worldPos.y
        );
        canvasActions.addPolygonPoint(clampedPos);
      }
    } else if (currentMode === 'select') {
      const selectedRectId = canvasStore.selectedRectId.get();
      const selectedPolygonId = canvasStore.selectedPolygonId.get();
      const rectangles = canvasStore.rectangles.get();
      const polygons = canvasStore.polygons.get();
      const currentScale = canvasStore.scale.get();
      if (selectedRectId) {
        const selectedRect = rectangles.find((r) => r.id === selectedRectId);
        if (selectedRect) {
          const handle = getHandleAtPosition(
            worldPos,
            selectedRect,
            currentScale
          );
          if (handle) {
            canvasActions.startResize(handle, selectedRect);
            return;
          }
        }
      }
      if (selectedPolygonId) {
        const selectedPolygon = polygons.find(
          (p) => p.id === selectedPolygonId
        );
        if (selectedPolygon) {
          const pointIndex = getPointHandleAtPosition(
            worldPos,
            selectedPolygon,
            currentScale
          );
          if (pointIndex !== null) {
            canvasActions.startEditPolygonPoint(
              pointIndex,
              selectedPolygon.points[pointIndex]
            );
            return;
          }
          const pointOnEdge = getPointOnEdge(
            worldPos,
            selectedPolygon,
            currentScale
          );
          if (pointOnEdge) {
            canvasActions.addPolygonPointAtEdge(
              pointOnEdge.edgeIndex,
              pointOnEdge.position
            );
            canvasActions.startEditPolygonPoint(
              pointOnEdge.edgeIndex + 1,
              pointOnEdge.position
            );
            return;
          }
        }
      }
      const clickedRect = findRectAtPosition(worldPos, rectangles);
      if (clickedRect) {
        canvasActions.selectRectangle(clickedRect.id);
        canvasActions.startMove(worldPos, clickedRect);
        return;
      }
      const clickedPolygon = findPolygonAtPosition(worldPos, polygons);
      if (clickedPolygon) {
        canvasActions.selectPolygon(clickedPolygon.id);
        canvasActions.startMove(worldPos, undefined, clickedPolygon);
        return;
      }
      canvasActions.selectRectangle(null);
      canvasActions.selectPolygon(null);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const currentMode = canvasStore.mode.get();
    const currentIsDragging = canvasStore.isDragging.get();
    const currentIsDrawing = canvasStore.isDrawing.get();
    const currentDrawingRect = canvasStore.drawingRect.get();
    const currentIsResizing = canvasStore.isResizing.get();
    const currentIsMoving = canvasStore.isMoving.get();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const globalWorldPos = screenToGlobalWorld(e.clientX, e.clientY);
    canvasActions.updateGlobalMousePosition(globalWorldPos, {
      x: e.clientX,
      y: e.clientY,
    });
    if (currentMode === 'pan' && currentIsDragging) {
      const dragStart = canvasStore.dragStart.get();
      const positionStart = canvasStore.positionStart.get();
      if (dragStart && positionStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        canvasActions.setPosition({
          x: positionStart.x + dx,
          y: positionStart.y + dy,
        });
      }
    } else if (
      currentMode === 'draw' &&
      currentIsDrawing &&
      currentDrawingRect
    ) {
      const clampedPos = canvasActions.clampToImageBounds(
        worldPos.x,
        worldPos.y
      );
      const updatedRect: Rectangle = {
        ...currentDrawingRect,
        width: clampedPos.x - currentDrawingRect.x,
        height: clampedPos.y - currentDrawingRect.y,
      };
      canvasActions.updateDrawing(updatedRect);
    } else if (currentMode === 'polygon') {
      canvasActions.updatePolygonHover(worldPos);
    } else if (currentMode === 'select' && currentIsResizing) {
      canvasActions.updateResize(worldPos);
    } else if (currentMode === 'select' && currentIsMoving) {
      canvasActions.updateMove(worldPos);
    } else if (currentMode === 'select' && canvasStore.isEditingPolygon.get()) {
      const clampedPos = canvasActions.clampToImageBounds(
        worldPos.x,
        worldPos.y
      );
      canvasActions.updateEditPolygonPoint(clampedPos);
    }
  };

  const handlePointerUp = () => {
    const currentMode = canvasStore.mode.get();
    const currentIsDrawing = canvasStore.isDrawing.get();
    const currentIsResizing = canvasStore.isResizing.get();
    const currentIsMoving = canvasStore.isMoving.get();
    const currentIsEditingPolygon = canvasStore.isEditingPolygon.get();
    if (currentMode === 'pan') {
      canvasActions.endDrag();
    } else if (currentMode === 'draw' && currentIsDrawing) {
      canvasActions.finishDrawing();
    } else if (currentMode === 'select' && currentIsResizing) {
      canvasActions.endResize();
    } else if (currentMode === 'select' && currentIsMoving) {
      canvasActions.endMove();
    } else if (currentMode === 'select' && currentIsEditingPolygon) {
      const editingPointIndex = canvasStore.editingPointIndex.get();
      const editStartPoint = canvasStore.editStartPoint.get();
      const selectedPolygonId = canvasStore.selectedPolygonId.get();
      if (editingPointIndex !== null && editStartPoint && selectedPolygonId) {
        const polygons = canvasStore.polygons.get();
        const selectedPolygon = polygons.find(
          (p) => p.id === selectedPolygonId
        );
        if (selectedPolygon) {
          const currentPoint = selectedPolygon.points[editingPointIndex];
          const deltaX = Math.abs(currentPoint.x - editStartPoint.x);
          const deltaY = Math.abs(currentPoint.y - editStartPoint.y);
          if (deltaX < 5 && deltaY < 5 && selectedPolygon.points.length > 3) {
            canvasActions.removePolygonPoint(editingPointIndex);
          }
        }
      }
      canvasActions.endEditPolygonPoint();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    const sessionId = Date.now().toString();
    const saveDataWithBeacon = (
      rectangles: Rectangle[],
      polygons: Polygon[]
    ) => {
      const apiData = {
        rectangles: rectangles.map((rect) => ({
          id: rect.id,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          label: rect.label,
          color: rect.color,
        })),
        polygons: polygons.map((polygon) => ({
          id: polygon.id,
          points: polygon.points,
          isComplete: polygon.isComplete,
          label: polygon.label,
          color: polygon.color,
        })),
        sessionId,
        timestamp: new Date().toISOString(),
      };
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(apiData)], {
          type: 'application/json',
        });
        const sent = navigator.sendBeacon('/api/save-labels', blob);
        return sent;
      } else {
        sendApiData(rectangles, polygons, sessionId);
        return true;
      }
    };
    const handleBeforeUnload = () => {
      const currentRectangles = canvasStore.rectangles.get();
      const currentPolygons = canvasStore.polygons.get();
      if (currentRectangles.length > 0 || currentPolygons.length > 0) {
        saveDataWithBeacon(currentRectangles, currentPolygons);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const currentRectangles = canvasStore.rectangles.get();
        const currentPolygons = canvasStore.polygons.get();
        if (currentRectangles.length > 0 || currentPolygons.length > 0) {
          saveDataWithBeacon(currentRectangles, currentPolygons);
        }
      }
    };
    const autoSaveInterval = setInterval(() => {
      const currentRectangles = canvasStore.rectangles.get();
      const currentPolygons = canvasStore.polygons.get();
      if (currentRectangles.length > 0 || currentPolygons.length > 0) {
        const sessionId = Date.now().toString();
        sendApiData(currentRectangles, currentPolygons, sessionId).catch(
          () => {}
        );
      }
    }, 5 * 60 * 1000);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(autoSaveInterval);
    };
  }, []);

  useEffect(() => {
    const saveOnPageChange = () => {
      const currentRectangles = canvasStore.rectangles.get();
      const currentPolygons = canvasStore.polygons.get();
      if (currentRectangles.length > 0 || currentPolygons.length > 0) {
        const sessionId = Date.now().toString();
        sendApiData(currentRectangles, currentPolygons, sessionId).catch(
          () => {}
        );
      }
    };
    return () => {
      saveOnPageChange();
    };
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'p' || e.key === 'P') {
        canvasActions.setMode('pan');
        canvasActions.setCrosshairVisible(false);
      } else if (e.key === 'd' || e.key === 'D') {
        canvasActions.setMode('draw');
        canvasActions.setCrosshairVisible(true);
      } else if (e.key === 'g' || e.key === 'G') {
        canvasActions.setMode('polygon');
        canvasActions.setCrosshairVisible(true);
      } else if (e.key === 's' || e.key === 'S') {
        canvasActions.setMode('select');
        canvasActions.setCrosshairVisible(false);
      } else if (e.key === 'Escape') {
        const currentIsDrawing = canvasStore.isDrawing.get();
        const currentIsDrawingPolygon = canvasStore.isDrawingPolygon.get();
        if (currentIsDrawing) {
          canvasActions.finishDrawing();
        } else if (currentIsDrawingPolygon) {
          canvasActions.cancelPolygon();
        }
        canvasActions.setMode('pan');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedRectId = canvasStore.selectedRectId.get();
        const selectedPolygonId = canvasStore.selectedPolygonId.get();
        if (selectedRectId) {
          canvasActions.removeRectangle(selectedRectId);
        } else if (selectedPolygonId) {
          canvasActions.removePolygon(selectedPolygonId);
        } else {
          canvasActions.clearAll();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!texture) {
    return <div>이미지 로딩 중...</div>;
  }

  const getCursor = () => {
    const currentMode = canvasStore.mode.get();
    const currentIsDragging = canvasStore.isDragging.get();
    const currentIsResizing = canvasStore.isResizing.get();
    const currentIsMoving = canvasStore.isMoving.get();
    const resizeHandle = canvasStore.resizeHandle.get();
    const screenMousePosition = canvasStore.screenMousePosition.get();
    if (currentIsResizing && resizeHandle) {
      const cursorMap: Record<string, string> = {
        nw: 'nw-resize',
        ne: 'ne-resize',
        sw: 'sw-resize',
        se: 'se-resize',
        n: 'n-resize',
        s: 's-resize',
        w: 'w-resize',
        e: 'e-resize',
      };
      return cursorMap[resizeHandle];
    }
    if (currentIsMoving) return 'move';
    if (currentMode === 'draw') return 'crosshair';
    if (currentMode === 'polygon') return 'crosshair';
    if (currentIsDragging) return 'grabbing';
    if (currentMode === 'select' && screenMousePosition) {
      const worldPos = screenToWorld(
        screenMousePosition.x,
        screenMousePosition.y
      );
      const selectedRectId = canvasStore.selectedRectId.get();
      const rectangles = canvasStore.rectangles.get();
      const polygons = canvasStore.polygons.get();
      const currentScale = canvasStore.scale.get();
      if (selectedRectId) {
        const selectedRect = rectangles.find((r) => r.id === selectedRectId);
        if (selectedRect) {
          const handle = getHandleAtPosition(
            worldPos,
            selectedRect,
            currentScale
          );
          if (handle) {
            const cursorMap: Record<string, string> = {
              nw: 'nw-resize',
              ne: 'ne-resize',
              sw: 'sw-resize',
              se: 'se-resize',
              n: 'n-resize',
              s: 's-resize',
              w: 'w-resize',
              e: 'e-resize',
            };
            return cursorMap[handle];
          }
        }
      }
      const hoveredRect = findRectAtPosition(worldPos, rectangles);
      if (hoveredRect) {
        return 'move';
      }
      const hoveredPolygon = findPolygonAtPosition(worldPos, polygons);
      if (hoveredPolygon) {
        return 'move';
      }
      return 'pointer';
    }
    return 'grab';
  };

  const position = canvasStore.position.get();
  const scale = canvasStore.scale.get();
  const rectangles = canvasStore.rectangles.get();
  const drawingRect = canvasStore.drawingRect.get();
  const selectedRectId = canvasStore.selectedRectId.get();
  const selectedRect = selectedRectId
    ? rectangles.find((r) => r.id === selectedRectId) || null
    : null;
  const polygons = canvasStore.polygons.get();
  const currentPolygon = canvasStore.currentPolygon.get();
  const hoveredPointIndex = canvasStore.hoveredPointIndex.get();
  const currentMousePosition = canvasStore.currentMousePosition.get();
  const selectedPolygonId = canvasStore.selectedPolygonId.get();
  const selectedPolygon = selectedPolygonId
    ? polygons.find((p) => p.id === selectedPolygonId) || null
    : null;
  const globalMousePosition = canvasStore.globalMousePosition.get();
  const showCrosshair = canvasStore.showCrosshair.get();
  const showBackgroundOverlay = canvasStore.showBackgroundOverlay.get();
  const brightness = canvasStore.brightness.get();
  const contrast = canvasStore.contrast.get();
  const imageSize = canvasStore.imageSize.get();
  const imagePosition = canvasStore.imagePosition.get();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <ImageAdjustmentPanel />
      <Tools />
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          canvasActions.updateGlobalMousePosition(null, null);
        }}
        onContextMenu={handleContextMenu}
        style={{
          cursor: getCursor(),
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <Application
          width={typeof window !== 'undefined' ? window.innerWidth : 800}
          height={typeof window !== 'undefined' ? window.innerHeight : 600}
          backgroundAlpha={0}
          resizeTo={containerRef}
        >
          <pixiContainer x={position.x} y={position.y} scale={scale}>
            <ImageFilter brightness={brightness} contrast={contrast}>
              <pixiSprite
                texture={texture}
                anchor={0.5}
                x={imagePosition.x}
                y={imagePosition.y}
                width={imageSize.width}
                height={imageSize.height}
              />
            </ImageFilter>
            <BackgroundOverlay
              rectangles={rectangles}
              polygons={polygons}
              canvasSize={canvasSize}
              scale={scale}
              position={position}
              imagePosition={imagePosition}
              enabled={showBackgroundOverlay}
            />
            <pixiContainer x={imagePosition.x} y={imagePosition.y}>
              <RectangleRenderer
                rectangles={rectangles}
                drawingRect={drawingRect}
              />
              <PolygonRenderer
                polygons={polygons}
                currentPolygon={currentPolygon}
                hoveredPointIndex={hoveredPointIndex}
                currentMousePosition={currentMousePosition}
              />
              <SelectionHandles selectedRect={selectedRect} scale={scale} />
              <PolygonSelectionHandles
                selectedPolygon={selectedPolygon}
                scale={scale}
              />
            </pixiContainer>
            <Crosshair
              mousePosition={globalMousePosition}
              scale={scale}
              position={position}
              canvasSize={canvasSize}
              visible={showCrosshair}
            />
          </pixiContainer>
        </Application>
      </div>
    </div>
  );
});

export default App;
