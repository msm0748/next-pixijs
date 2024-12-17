'use client';

import { useEffect } from 'react';
import * as PIXI from 'pixi.js';

export default function PolygonPage() {
  useEffect(() => {
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0xf0f0f0,
    });

    document.body.appendChild(app.view as HTMLCanvasElement);

    const graphics = new PIXI.Graphics();
    app.stage.addChild(graphics);

    let currentPoints: PIXI.Point[] = [];
    let polygons: PIXI.Point[][] = [];
    let selectedPolygonIndex = -1;
    let selectedPointIndex = -1;
    let isDrawing = false;
    let isDragging = false;

    // 마우스 이벤트 리스너 추가
    app.view.addEventListener('mousedown', onMouseDown);
    app.view.addEventListener('mousemove', onMouseMove);
    app.view.addEventListener('mouseup', onMouseUp);
    app.view.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', onKeyDown);

    function onMouseDown(e: MouseEvent) {
      const point = new PIXI.Point(e.offsetX, e.offsetY);

      // 우클릭: 그리기 취소
      if (e.button === 2) {
        currentPoints = [];
        isDrawing = false;
        drawAll();
        return;
      }

      // 좌클릭
      if (e.button === 0) {
        // 점 선택 모드
        if (!isDrawing) {
          const [polygonIndex, pointIndex] = findNearestPoint(point);
          if (polygonIndex !== -1 && pointIndex !== -1) {
            selectedPolygonIndex = polygonIndex;
            selectedPointIndex = pointIndex;
            isDragging = true;
            return;
          }
        }

        // 그리기 모드
        isDrawing = true;

        // 첫 점과 가까운지 체크 (폴리곤 완성 조건)
        if (currentPoints.length >= 3) {
          const firstPoint = currentPoints[0];
          const dx = firstPoint.x - point.x;
          const dy = firstPoint.y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 20) {
            // 20픽셀 이내로 가까워지면
            polygons.push([...currentPoints]); // 현재 폴리곤 완성
            currentPoints = []; // 새로운 폴리곤 시작
            isDrawing = false;
            drawAll();
            return;
          }
        }

        currentPoints.push(point);
        drawAll();
      }
    }

    function onMouseMove(e: MouseEvent) {
      const point = new PIXI.Point(e.offsetX, e.offsetY);

      // 점 드래그
      if (
        isDragging &&
        selectedPolygonIndex !== -1 &&
        selectedPointIndex !== -1
      ) {
        polygons[selectedPolygonIndex][selectedPointIndex].x = point.x;
        polygons[selectedPolygonIndex][selectedPointIndex].y = point.y;
        drawAll();
        return;
      }

      // 그리기 중일 때 첫 점과의 거리 표시
      if (isDrawing && currentPoints.length >= 3) {
        const firstPoint = currentPoints[0];
        const dx = firstPoint.x - point.x;
        const dy = firstPoint.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        drawAll();

        // 첫 점과 현재 마우스 위치가 가까우면 연결선 표시
        if (distance < 20) {
          graphics.lineStyle(2, 0x00ff00);
          graphics.moveTo(
            currentPoints[currentPoints.length - 1].x,
            currentPoints[currentPoints.length - 1].y
          );
          graphics.lineTo(firstPoint.x, firstPoint.y);
        }
      }
    }

    function onMouseUp() {
      isDragging = false;
    }

    function onKeyDown(e: KeyboardEvent) {
      // Delete 키: 선택된 폴리곤 삭제
      if (e.key === 'Delete' && selectedPolygonIndex !== -1) {
        polygons.splice(selectedPolygonIndex, 1);
        selectedPolygonIndex = -1;
        selectedPointIndex = -1;
        drawAll();
      }
      // Escape 키: 현재 그리기 취소
      else if (e.key === 'Escape') {
        currentPoints = [];
        isDrawing = false;
        drawAll();
      }
    }

    function findNearestPoint(point: PIXI.Point): [number, number] {
      const threshold = 10;
      for (let i = 0; i < polygons.length; i++) {
        for (let j = 0; j < polygons[i].length; j++) {
          const dx = polygons[i][j].x - point.x;
          const dy = polygons[i][j].y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < threshold) {
            return [i, j];
          }
        }
      }
      return [-1, -1];
    }

    function drawAll() {
      graphics.clear();

      // 완성된 폴리곤들 그리기
      polygons.forEach((polygon, index) => {
        graphics.lineStyle(2, 0x000000);
        graphics.beginFill(
          index === selectedPolygonIndex ? 0x00ff00 : 0x66ccff,
          0.3
        );
        graphics.moveTo(polygon[0].x, polygon[0].y);

        for (let i = 1; i < polygon.length; i++) {
          graphics.lineTo(polygon[i].x, polygon[i].y);
        }
        graphics.lineTo(polygon[0].x, polygon[0].y);
        graphics.endFill();

        // 각 점 그리기
        polygon.forEach((point, pointIndex) => {
          const isSelected =
            index === selectedPolygonIndex && pointIndex === selectedPointIndex;
          graphics.beginFill(isSelected ? 0xff0000 : 0x000000);
          graphics.drawCircle(point.x, point.y, isSelected ? 6 : 4);
          graphics.endFill();
        });
      });

      // 현재 그리고 있는 폴리곤 그리기
      if (currentPoints.length > 0) {
        graphics.lineStyle(2, 0x000000);
        graphics.moveTo(currentPoints[0].x, currentPoints[0].y);

        for (let i = 1; i < currentPoints.length; i++) {
          graphics.lineTo(currentPoints[i].x, currentPoints[i].y);
        }

        // 각 점 그리기
        currentPoints.forEach((point, index) => {
          const isFirstPoint = index === 0 && currentPoints.length >= 3;
          graphics.beginFill(isFirstPoint ? 0x00ff00 : 0x000000);
          graphics.drawCircle(point.x, point.y, isFirstPoint ? 6 : 4);
          graphics.endFill();
        });
      }
    }

    return () => {
      app.view.removeEventListener('mousedown', onMouseDown);
      app.view.removeEventListener('mousemove', onMouseMove);
      app.view.removeEventListener('mouseup', onMouseUp);
      app.view.removeEventListener('contextmenu', (e) => e.preventDefault());
      document.removeEventListener('keydown', onKeyDown);
      app.destroy(true);
    };
  }, []);

  return <div id="canvas-container"></div>;
}
