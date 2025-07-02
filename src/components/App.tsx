'use client';

import { Application, extend } from '@pixi/react';
import { Container, Sprite, Graphics, Assets, Texture } from 'pixi.js';
import { useState, useRef, PointerEvent, useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { usePathname } from 'next/navigation';
import {
  canvasStore,
  canvasActions,
  Rectangle,
  Polygon,
} from '../store/canvasStore';
import { RectangleRenderer } from './RectangleRenderer';
import { PolygonRenderer } from './PolygonRenderer';
import { SelectionHandles, getHandleAtPosition } from './SelectionHandles';
import {
  PolygonSelectionHandles,
  getPointHandleAtPosition,
  getPointOnEdge,
} from './PolygonSelectionHandles';
import { Crosshair } from './Crosshair';
import { BackgroundOverlay } from './BackgroundOverlay';
import { ImageFilter } from './ImageFilter';
import { ImageAdjustmentPanel } from './ImageAdjustmentPanel';
import { findRectAtPosition } from '../utils/rectUtils';
import { findPolygonAtPosition } from '../utils/polygonUtils';
import {
  downloadLabels,
  downloadImageWithLabels,
  sendApiData,
  sendAbsoluteCoordinatesData,
  downloadAbsoluteCoordinatesJson,
} from '../utils/downloadUtils';

extend({
  Container,
  Sprite,
  Graphics,
});

const App = observer(() => {
  const [texture, setTexture] = useState<Texture | null>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  console.log('리렌더링');
  // 텍스처 로드
  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await Assets.load('/test.png');
        setTexture(loadedTexture);

        // 이미지 로드 후 레이아웃 초기화
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

  // 윈도우 리사이즈 시 레이아웃 업데이트
  useEffect(() => {
    const handleResize = () => {
      if (texture) {
        const newCanvasSize = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        // 캔버스 크기 상태 업데이트
        setCanvasSize(newCanvasSize);

        // 리사이즈 전 이미지 크기 저장
        const oldImageSize = canvasStore.imageSize.get();

        // 캔버스 크기 업데이트 (이미지를 75% 크기로 중앙 재배치)
        canvasActions.setCanvasSize(newCanvasSize);

        // 리사이즈 후 이미지 크기 가져오기
        const newImageSize = canvasStore.imageSize.get();

        // 이미지 크기 변화 비율 계산
        const scaleX = newImageSize.width / oldImageSize.width;
        const scaleY = newImageSize.height / oldImageSize.height;

        // 기존 라벨들 좌표 변환 (이미지 중심 기준 좌표계에서 크기만 변환)
        const currentRectangles = canvasStore.rectangles.get();
        const currentPolygons = canvasStore.polygons.get();

        // 사각형 좌표 변환 (이미지 중심 기준이므로 위치 변화는 없고 크기만 변환)
        const updatedRectangles = currentRectangles.map((rect) => ({
          ...rect,
          x: rect.x * scaleX,
          y: rect.y * scaleY,
          width: rect.width * scaleX,
          height: rect.height * scaleY,
        }));

        // 폴리곤 좌표 변환 (이미지 중심 기준이므로 위치 변화는 없고 크기만 변환)
        const updatedPolygons = currentPolygons.map((polygon) => ({
          ...polygon,
          points: polygon.points.map((point) => ({
            x: point.x * scaleX,
            y: point.y * scaleY,
          })),
        }));

        // 변환된 라벨들을 스토어에 반영
        canvasStore.rectangles.set(updatedRectangles);
        canvasStore.polygons.set(updatedPolygons);

        // 뷰 초기화 (뷰포트 스케일 1.0, 위치 (0, 0)으로 리셋)
        canvasActions.setViewportScale(1.0);
        canvasActions.setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [texture]);

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

      canvasActions.setViewportScale(newScale);
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

  // 월드 좌표로 변환하는 함수 (이미지 좌표계 기준)
  const screenToWorld = (screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const currentPosition = canvasStore.position.get();
    const currentScale = canvasStore.scale.get();
    const imagePosition = canvasStore.imagePosition.get();

    const localX = screenX - rect.left;
    const localY = screenY - rect.top;

    // 뷰포트 좌표를 이미지 중심 기준 좌표로 변환
    const worldX = (localX - currentPosition.x) / currentScale;
    const worldY = (localY - currentPosition.y) / currentScale;

    // 이미지 중심을 원점으로 하는 좌표계로 변환
    return {
      x: worldX - imagePosition.x,
      y: worldY - imagePosition.y,
    };
  };

  // 전역 월드 좌표로 변환하는 함수 (Crosshair용)
  const screenToGlobalWorld = (screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const currentPosition = canvasStore.position.get();
    const currentScale = canvasStore.scale.get();

    const localX = screenX - rect.left;
    const localY = screenY - rect.top;

    // 뷰포트 좌표를 전역 월드 좌표로 변환
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
      // 폴리곤 모드
      const isDrawing = canvasStore.isDrawingPolygon.get();

      if (!isDrawing) {
        // 새 폴리곤 시작
        const clampedPos = canvasActions.clampToImageBounds(
          worldPos.x,
          worldPos.y
        );
        canvasActions.startPolygon(clampedPos);
      } else {
        // 점 추가
        const clampedPos = canvasActions.clampToImageBounds(
          worldPos.x,
          worldPos.y
        );
        canvasActions.addPolygonPoint(clampedPos);
      }
    } else if (currentMode === 'select') {
      // 선택 모드
      const selectedRectId = canvasStore.selectedRectId.get();
      const selectedPolygonId = canvasStore.selectedPolygonId.get();
      const rectangles = canvasStore.rectangles.get();
      const polygons = canvasStore.polygons.get();
      const currentScale = canvasStore.scale.get();

      // 현재 선택된 사각형이 있으면 핸들 체크
      if (selectedRectId) {
        const selectedRect = rectangles.find((r) => r.id === selectedRectId);
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

      // 현재 선택된 폴리곤이 있으면 핸들 체크
      if (selectedPolygonId) {
        const selectedPolygon = polygons.find(
          (p) => p.id === selectedPolygonId
        );
        if (selectedPolygon) {
          // 점 핸들 체크
          const pointIndex = getPointHandleAtPosition(
            worldPos,
            selectedPolygon,
            currentScale
          );
          if (pointIndex !== null) {
            // 점 편집 시작 (마우스업에서 움직임이 없으면 삭제로 처리)
            canvasActions.startEditPolygonPoint(
              pointIndex,
              selectedPolygon.points[pointIndex]
            );
            return;
          }

          // 선분 위 클릭 체크 (새 점 추가)
          const pointOnEdge = getPointOnEdge(
            worldPos,
            selectedPolygon,
            currentScale
          );
          if (pointOnEdge) {
            // 선분 위에 새 점 추가하고 바로 편집 모드로
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

      // 사각형 클릭 체크 (선택된 사각형이든 다른 사각형이든)
      const clickedRect = findRectAtPosition(worldPos, rectangles);
      if (clickedRect) {
        // 사각형 선택과 동시에 이동 시작
        canvasActions.selectRectangle(clickedRect.id);
        canvasActions.startMove(worldPos, clickedRect);
        return;
      }

      // 폴리곤 클릭 체크
      const clickedPolygon = findPolygonAtPosition(worldPos, polygons);
      if (clickedPolygon) {
        // 폴리곤 선택과 동시에 이동 시작
        canvasActions.selectPolygon(clickedPolygon.id);
        canvasActions.startMove(worldPos, undefined, clickedPolygon);
        return;
      }

      // 빈 공간 클릭 - 선택 해제
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

    // 크로스헤어 위치 업데이트 (전역 좌표계 사용)
    const globalWorldPos = screenToGlobalWorld(e.clientX, e.clientY);
    canvasActions.updateGlobalMousePosition(globalWorldPos, {
      x: e.clientX,
      y: e.clientY,
    });

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
      // 사각형 그리기 (그리는 동안에는 경계 제한하지 않음)
      const updatedRect: Rectangle = {
        ...currentDrawingRect,
        width: worldPos.x - currentDrawingRect.x,
        height: worldPos.y - currentDrawingRect.y,
      };
      canvasActions.updateDrawing(updatedRect);
    } else if (currentMode === 'polygon') {
      // 폴리곤 호버 효과 업데이트
      const clampedPos = canvasActions.clampToImageBounds(
        worldPos.x,
        worldPos.y
      );
      canvasActions.updatePolygonHover(clampedPos);
    } else if (currentMode === 'select' && currentIsResizing) {
      // 사각형 리사이즈
      canvasActions.updateResize(worldPos);
    } else if (currentMode === 'select' && currentIsMoving) {
      // 사각형/폴리곤 이동
      canvasActions.updateMove(worldPos);
    } else if (currentMode === 'select' && canvasStore.isEditingPolygon.get()) {
      // 폴리곤 점 편집
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
      // 폴리곤 점 편집 종료 시 움직임이 없었으면 삭제
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

          // 움직임이 5픽셀 이하면 삭제로 간주
          if (deltaX < 5 && deltaY < 5 && selectedPolygon.points.length > 3) {
            canvasActions.removePolygonPoint(editingPointIndex);
          }
        }
      }

      canvasActions.endEditPolygonPoint();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // 기본 컨텍스트 메뉴 방지
  };

  // 페이지 벗어날 때 API 호출
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

      // sendBeacon을 사용해서 페이지가 닫혀도 데이터 전송 보장
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(apiData)], {
          type: 'application/json',
        });
        const sent = navigator.sendBeacon('/api/save-labels', blob);
        console.log('sendBeacon 전송 결과:', sent);
        return sent;
      } else {
        // sendBeacon이 지원되지 않으면 일반 fetch 사용
        sendApiData(rectangles, polygons, sessionId);
        return true;
      }
    };

    const handleBeforeUnload = () => {
      // 라벨이 있을 때만 API 호출
      const currentRectangles = canvasStore.rectangles.get();
      const currentPolygons = canvasStore.polygons.get();

      if (currentRectangles.length > 0 || currentPolygons.length > 0) {
        // sendBeacon으로 확실하게 데이터 전송
        const sent = saveDataWithBeacon(currentRectangles, currentPolygons);

        if (sent) {
          console.log('페이지 종료 시 라벨 데이터 자동 저장됨');
        }

        // 사용자에게 알림 (확인 메시지는 제거하여 자동 저장)
        // e.preventDefault();
        // e.returnValue = '작업한 라벨 데이터가 저장됩니다.';
      }
    };

    const handleVisibilityChange = () => {
      // 페이지가 숨겨질 때도 API 호출
      if (document.visibilityState === 'hidden') {
        const currentRectangles = canvasStore.rectangles.get();
        const currentPolygons = canvasStore.polygons.get();

        if (currentRectangles.length > 0 || currentPolygons.length > 0) {
          saveDataWithBeacon(currentRectangles, currentPolygons);
          console.log('페이지 숨김 시 라벨 데이터 자동 저장됨');
        }
      }
    };

    // 주기적 자동 저장 (5분마다)
    const autoSaveInterval = setInterval(() => {
      const currentRectangles = canvasStore.rectangles.get();
      const currentPolygons = canvasStore.polygons.get();

      if (currentRectangles.length > 0 || currentPolygons.length > 0) {
        sendApiData(currentRectangles, currentPolygons, sessionId)
          .then(() => {
            console.log('자동 저장 완료 (5분 간격)');
          })
          .catch((error) => {
            console.error('자동 저장 실패:', error);
          });
      }
    }, 5 * 60 * 1000); // 5분

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('벗어나냐');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(autoSaveInterval);
    };
  }, []);

  // Next.js 라우팅으로 페이지 이동 시 데이터 저장
  useEffect(() => {
    const saveOnPageChange = () => {
      const currentRectangles = canvasStore.rectangles.get();
      const currentPolygons = canvasStore.polygons.get();

      if (currentRectangles.length > 0 || currentPolygons.length > 0) {
        const sessionId = Date.now().toString();
        console.log('Next.js 라우팅 감지 - 데이터 저장 중...');
        sendApiData(currentRectangles, currentPolygons, sessionId)
          .then(() => {
            console.log('페이지 이동 시 라벨 데이터 자동 저장됨');
          })
          .catch((error) => {
            console.error('페이지 이동 시 저장 실패:', error);
          });
      }
    };

    // 컴포넌트가 언마운트될 때 (다른 페이지로 이동 시) 저장
    return () => {
      console.log('컴포넌트 언마운트 감지');
      saveOnPageChange();
    };
  }, [pathname]); // pathname이 변경될 때마다 실행

  // 키보드 단축키
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

    if (currentIsMoving) return 'move';
    if (currentMode === 'draw') return 'crosshair';
    if (currentMode === 'polygon') return 'crosshair';
    if (currentIsDragging) return 'grabbing';

    // 선택 모드에서 호버 상태 체크
    if (currentMode === 'select' && screenMousePosition) {
      const worldPos = screenToWorld(
        screenMousePosition.x,
        screenMousePosition.y
      );
      const selectedRectId = canvasStore.selectedRectId.get();
      const rectangles = canvasStore.rectangles.get();
      const polygons = canvasStore.polygons.get();
      const currentScale = canvasStore.scale.get();

      // 선택된 사각형이 있으면 핸들/변 호버 체크
      if (selectedRectId) {
        const selectedRect = rectangles.find((r) => r.id === selectedRectId);
        if (selectedRect) {
          const handle = getHandleAtPosition(
            worldPos,
            selectedRect,
            currentScale
          );
          if (handle) {
            // 핸들 호버 시 리사이즈 커서
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
            return cursorMap[handle];
          }
        }
      }

      // 사각형 위에 호버 시 이동 커서
      const hoveredRect = findRectAtPosition(worldPos, rectangles);
      if (hoveredRect) {
        return 'move';
      }

      // 폴리곤 위에 호버 시 이동 커서
      const hoveredPolygon = findPolygonAtPosition(worldPos, polygons);
      if (hoveredPolygon) {
        return 'move';
      }

      return 'pointer';
    }

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

  // 폴리곤 관련 상태들
  const polygons = canvasStore.polygons.get();
  const currentPolygon = canvasStore.currentPolygon.get();
  const hoveredPointIndex = canvasStore.hoveredPointIndex.get();
  const currentMousePosition = canvasStore.currentMousePosition.get();
  const selectedPolygonId = canvasStore.selectedPolygonId.get();
  const selectedPolygon = selectedPolygonId
    ? polygons.find((p) => p.id === selectedPolygonId) || null
    : null;

  // 크로스헤어 관련 상태들
  const globalMousePosition = canvasStore.globalMousePosition.get();
  const showCrosshair = canvasStore.showCrosshair.get();

  // 배경 오버레이 관련 상태
  const showBackgroundOverlay = canvasStore.showBackgroundOverlay.get();

  // 이미지 조정 관련 상태
  const brightness = canvasStore.brightness.get();
  const contrast = canvasStore.contrast.get();

  // 이미지 크기 및 위치 상태
  const imageSize = canvasStore.imageSize.get();
  const imagePosition = canvasStore.imagePosition.get();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* 이미지 조정 패널 */}
      <ImageAdjustmentPanel />

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
          onClick={() => {
            canvasActions.setMode('pan');
            canvasActions.setCrosshairVisible(false);
          }}
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
          onClick={() => {
            canvasActions.setMode('draw');
            canvasActions.setCrosshairVisible(true);
          }}
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
          onClick={() => {
            canvasActions.setMode('polygon');
            canvasActions.setCrosshairVisible(true);
          }}
          style={{
            background: mode === 'polygon' ? '#007bff' : '#333',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          폴리곤 (G)
        </button>
        <button
          onClick={() => {
            canvasActions.setMode('select');
            canvasActions.setCrosshairVisible(false);
          }}
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
            const selectedRectId = canvasStore.selectedRectId.get();
            const selectedPolygonId = canvasStore.selectedPolygonId.get();

            if (selectedRectId) {
              canvasActions.removeRectangle(selectedRectId);
            } else if (selectedPolygonId) {
              canvasActions.removePolygon(selectedPolygonId);
            } else {
              canvasActions.clearAll();
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
          {selectedRectId || selectedPolygonId ? '선택 삭제' : '모두 삭제'}{' '}
          (Del)
        </button>
        <button
          onClick={() => {
            const currentDate = new Date();
            const timestamp = currentDate
              .toISOString()
              .replace(/[:.]/g, '-')
              .split('T')[0];
            downloadLabels(rectangles, polygons, `labels_${timestamp}`);
          }}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          라벨 다운로드
        </button>
        <button
          onClick={() => {
            if (!texture) {
              alert('배경 이미지가 로드되지 않았습니다.');
              return;
            }
            const currentDate = new Date();
            const timestamp = currentDate
              .toISOString()
              .replace(/[:.]/g, '-')
              .split('T')[0];
            downloadImageWithLabels(
              rectangles,
              polygons,
              texture,
              canvasSize,
              position,
              scale,
              `image_with_labels_${timestamp}`
            );
          }}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          이미지+라벨 다운로드
        </button>
        <button
          onClick={() => {
            canvasActions.setBackgroundOverlay(!showBackgroundOverlay);
          }}
          style={{
            background: showBackgroundOverlay ? '#ffc107' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          {showBackgroundOverlay ? '배경 어둡게 끄기' : '배경 어둡게 켜기'}
        </button>
        <button
          onClick={() => {
            // 뷰포트 스케일을 1.0으로 리셋
            canvasActions.setViewportScale(1.0);
            // 뷰포트 위치를 (0, 0)으로 리셋
            canvasActions.setPosition({ x: 0, y: 0 });
          }}
          style={{
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          뷰 초기화
        </button>
        <button
          onClick={() => {
            // 절대 좌표로 변환하여 서버에 전송
            const convertedData = canvasActions.convertToAbsoluteCoordinates();
            const sessionId = Date.now().toString();
            sendAbsoluteCoordinatesData(convertedData, sessionId)
              .then((result) => {
                if (result?.success) {
                  alert('절대 좌표 데이터가 서버에 성공적으로 전송되었습니다.');
                } else {
                  alert(
                    `서버 전송 실패: ${result?.error || '알 수 없는 오류'}`
                  );
                }
              })
              .catch((error) => {
                console.error('절대 좌표 전송 오류:', error);
                alert('절대 좌표 전송 중 오류가 발생했습니다.');
              });
          }}
          style={{
            background: '#6f42c1',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          절대좌표 서버전송
        </button>
        <button
          onClick={() => {
            // 절대 좌표로 변환하여 JSON 다운로드
            const convertedData = canvasActions.convertToAbsoluteCoordinates();
            const currentDate = new Date();
            const timestamp = currentDate
              .toISOString()
              .replace(/[:.]/g, '-')
              .split('T')[0];
            downloadAbsoluteCoordinatesJson(
              convertedData,
              `absolute_coordinates_${timestamp}`
            );
          }}
          style={{
            background: '#e83e8c',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          절대좌표 JSON 다운로드
        </button>
        <div style={{ color: 'white', alignSelf: 'center' }}>
          사각형: {rectangles.length}개 | 폴리곤: {polygons.length}개
          {selectedRectId && ' | 사각형 선택됨'}
          {selectedPolygonId &&
            ' | 폴리곤 선택됨 (클릭: 점 삭제, 드래그: 점 이동)'}
        </div>
      </div>

      {/* 캔버스 */}
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
          touchAction: 'none', // 터치 기본 동작 방지
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
              enabled={showBackgroundOverlay}
            />
            {/* 라벨들을 이미지 중심 기준으로 렌더링 */}
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
