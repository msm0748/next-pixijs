'use client';

import { Application, extend } from '@pixi/react';
import { Container, Sprite, Graphics, Assets, Texture } from 'pixi.js';
import { useState, useRef, PointerEvent, useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { canvasStore, canvasActions, Rectangle } from '../store/canvasStore';
import { RectangleRenderer } from './RectangleRenderer';
import { SelectionHandles, getHandleAtPosition } from './SelectionHandles';
import { findRectAtPosition } from '../utils/rectUtils';

extend({
  Container,
  Sprite,
  Graphics,
});

const App = observer(() => {
  const [texture, setTexture] = useState<Texture | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 텍스처 로드
  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await Assets.load('/test.jpg');
        setTexture(loadedTexture);
      } catch (error) {
        console.error('텍스처 로드 실패:', error);
      }
    };
    loadTexture();
  }, []);

  // 휠 이벤트 핸들러
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault(); // 기본 스크롤 동작 방지
    console.log(
      '휠 이벤트 발생:',
      e.deltaY,
      'Cmd:',
      e.metaKey,
      'Ctrl:',
      e.ctrlKey
    ); // 디버깅용

    const currentScale = canvasStore.scale.get();
    const currentPosition = canvasStore.position.get();

    // Cmd(Mac) 또는 Ctrl(Windows/Linux) 키가 눌렸을 때만 확대/축소
    if (e.metaKey || e.ctrlKey) {
      console.log('확대/축소 모드'); // 디버깅용
      const scaleFactor = 1.1;
      const calculatedScale =
        e.deltaY < 0 ? currentScale * scaleFactor : currentScale / scaleFactor;

      // 스케일 범위 제한을 먼저 적용
      const newScale = Math.max(0.1, Math.min(5, calculatedScale));

      // 실제로 변경될 스케일이 현재와 같다면 위치 계산하지 않음
      if (newScale === currentScale) {
        return;
      }

      // 마우스 위치를 중심으로 확대/축소
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPosition = {
        x: mouseX - (mouseX - currentPosition.x) * (newScale / currentScale),
        y: mouseY - (mouseY - currentPosition.y) * (newScale / currentScale),
      };

      canvasActions.setScale(newScale);
      canvasActions.setPosition(newPosition);
    } else {
      console.log('이동 모드'); // 디버깅용
      // 일반 휠: 이미지를 위/아래/좌/우로 이동
      const scrollSpeed = 50; // 스크롤 속도 조절
      const newPosition = {
        x:
          currentPosition.x -
          (e.deltaX > 0 ? scrollSpeed : e.deltaX < 0 ? -scrollSpeed : 0), // 좌우 이동
        y:
          currentPosition.y -
          (e.deltaY > 0 ? scrollSpeed : e.deltaY < 0 ? -scrollSpeed : 0), // 위아래 이동
      };
      canvasActions.setPosition(newPosition);
    }
  };

  // 휠 이벤트 리스너 등록 (passive: false로 설정)
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      console.log('휠 이벤트 리스너 등록됨'); // 디버깅용
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        console.log('휠 이벤트 리스너 제거됨'); // 디버깅용
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [texture]); // texture가 로드된 후에 이벤트 등록

  // 월드 좌표로 변환하는 함수
  const screenToWorld = (screenX: number, screenY: number) => {
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
      // 패닝 모드
      canvasActions.startDrag(
        { x: e.clientX, y: e.clientY },
        { x: currentPosition.x, y: currentPosition.y }
      );
    } else if (currentMode === 'draw') {
      // 그리기 모드
      const newRect: Rectangle = {
        id: `rect-${Date.now()}`,
        x: worldPos.x,
        y: worldPos.y,
        width: 0,
        height: 0,
        color: '#ff0000',
      };
      canvasActions.startDrawing(newRect);
    } else if (currentMode === 'select') {
      // 선택 모드
      const selectedId = canvasStore.selectedRectId.get();
      const rectangles = canvasStore.rectangles.get();
      const currentScale = canvasStore.scale.get();

      // 현재 선택된 사각형이 있으면 핸들 체크
      if (selectedId) {
        const selectedRect = rectangles.find((r) => r.id === selectedId);
        if (selectedRect) {
          const handle = getHandleAtPosition(
            worldPos,
            selectedRect,
            currentScale
          );
          if (handle) {
            // 핸들 클릭 - 리사이즈 시작
            canvasActions.startResize(handle, selectedRect);
            return;
          }
        }
      }

      // 핸들이 아니면 사각형 선택 체크
      const clickedRect = findRectAtPosition(worldPos, rectangles);
      if (clickedRect) {
        canvasActions.selectRectangle(clickedRect.id);
      } else {
        canvasActions.selectRectangle(null);
      }
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const currentMode = canvasStore.mode.get();
    const currentIsDragging = canvasStore.isDragging.get();
    const currentIsDrawing = canvasStore.isDrawing.get();
    const currentDrawingRect = canvasStore.drawingRect.get();
    const currentIsResizing = canvasStore.isResizing.get();
    const worldPos = screenToWorld(e.clientX, e.clientY);

    if (currentMode === 'pan' && currentIsDragging) {
      // 패닝
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
      // 사각형 그리기
      const updatedRect: Rectangle = {
        ...currentDrawingRect,
        width: worldPos.x - currentDrawingRect.x,
        height: worldPos.y - currentDrawingRect.y,
      };
      canvasActions.updateDrawing(updatedRect);
    } else if (currentMode === 'select' && currentIsResizing) {
      // 사각형 리사이즈
      canvasActions.updateResize(worldPos);
    }
  };

  const handlePointerUp = () => {
    const currentMode = canvasStore.mode.get();
    const currentIsDrawing = canvasStore.isDrawing.get();
    const currentIsResizing = canvasStore.isResizing.get();

    if (currentMode === 'pan') {
      canvasActions.endDrag();
    } else if (currentMode === 'draw' && currentIsDrawing) {
      canvasActions.finishDrawing();
    } else if (currentMode === 'select' && currentIsResizing) {
      canvasActions.endResize();
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        canvasActions.setMode('pan');
      } else if (e.key === 'd' || e.key === 'D') {
        canvasActions.setMode('draw');
      } else if (e.key === 's' || e.key === 'S') {
        canvasActions.setMode('select');
      } else if (e.key === 'Escape') {
        canvasActions.setMode('pan');
        const currentIsDrawing = canvasStore.isDrawing.get();
        if (currentIsDrawing) {
          canvasActions.finishDrawing();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = canvasStore.selectedRectId.get();
        if (selectedId) {
          canvasActions.removeRectangle(selectedId);
        } else {
          canvasActions.clearRectangles();
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
    const resizeHandle = canvasStore.resizeHandle.get();

    if (currentIsResizing && resizeHandle) {
      // 리사이즈 커서
      const cursorMap = {
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

    if (currentMode === 'draw') return 'crosshair';
    if (currentMode === 'select') return 'pointer';
    if (currentIsDragging) return 'grabbing';
    return 'grab';
  };

  // 현재 상태 값들 가져오기
  const position = canvasStore.position.get();
  const scale = canvasStore.scale.get();
  const mode = canvasStore.mode.get();
  const rectangles = canvasStore.rectangles.get();
  const drawingRect = canvasStore.drawingRect.get();
  const selectedRectId = canvasStore.selectedRectId.get();
  const selectedRect = selectedRectId
    ? rectangles.find((r) => r.id === selectedRectId) || null
    : null;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* 툴바 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.8)',
          padding: '10px',
          borderRadius: '5px',
          display: 'flex',
          gap: '10px',
        }}
      >
        <button
          onClick={() => canvasActions.setMode('pan')}
          style={{
            background: mode === 'pan' ? '#007bff' : '#333',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          패닝 (P)
        </button>
        <button
          onClick={() => canvasActions.setMode('draw')}
          style={{
            background: mode === 'draw' ? '#007bff' : '#333',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          그리기 (D)
        </button>
        <button
          onClick={() => canvasActions.setMode('select')}
          style={{
            background: mode === 'select' ? '#007bff' : '#333',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          선택 (S)
        </button>
        <button
          onClick={() => {
            const selectedId = canvasStore.selectedRectId.get();
            if (selectedId) {
              canvasActions.removeRectangle(selectedId);
            } else {
              canvasActions.clearRectangles();
            }
          }}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          {selectedRectId ? '선택 삭제' : '모두 삭제'} (Del)
        </button>
        <div style={{ color: 'white', alignSelf: 'center' }}>
          사각형: {rectangles.length}개{selectedRectId && ' | 선택됨: 1개'}
        </div>
      </div>

      {/* 캔버스 */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          cursor: getCursor(),
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          touchAction: 'none', // 터치 기본 동작 방지
        }}
      >
        <Application
          width={typeof window !== 'undefined' ? window.innerWidth : 800}
          height={typeof window !== 'undefined' ? window.innerHeight : 600}
          backgroundAlpha={0}
        >
          <pixiContainer x={position.x} y={position.y} scale={scale}>
            <pixiSprite
              texture={texture}
              anchor={0.5}
              x={typeof window !== 'undefined' ? window.innerWidth / 2 : 400}
              y={typeof window !== 'undefined' ? window.innerHeight / 2 : 300}
            />
            <RectangleRenderer
              rectangles={rectangles}
              drawingRect={drawingRect}
            />
            <SelectionHandles selectedRect={selectedRect} scale={scale} />
          </pixiContainer>
        </Application>
      </div>
    </div>
  );
});

export default App;
