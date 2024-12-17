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
    let dragStartPos: PIXI.Point | null = null;

    app.view.addEventListener('mousedown', onMouseDown);
    app.view.addEventListener('mousemove', onMouseMove);
    app.view.addEventListener('mouseup', onMouseUp);
    app.view.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', onKeyDown);

    function isPointInPolygon(
      point: PIXI.Point,
      polygon: PIXI.Point[]
    ): boolean {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x,
          yi = polygon[i].y;
        const xj = polygon[j].x,
          yj = polygon[j].y;

        const intersect =
          yi > point.y !== yj > point.y &&
          point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }

    // 점과 선분 사이의 거리를 계산하는 함수
    function distanceToLineSegment(
      point: PIXI.Point,
      start: PIXI.Point,
      end: PIXI.Point
    ): number {
      const A = point.x - start.x;
      const B = point.y - start.y;
      const C = end.x - start.x;
      const D = end.y - start.y;

      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;

      if (len_sq !== 0) {
        param = dot / len_sq;
      }

      let xx, yy;

      if (param < 0) {
        xx = start.x;
        yy = start.y;
      } else if (param > 1) {
        xx = end.x;
        yy = end.y;
      } else {
        xx = start.x + param * C;
        yy = start.y + param * D;
      }

      const dx = point.x - xx;
      const dy = point.y - yy;

      return Math.sqrt(dx * dx + dy * dy);
    }

    // 폴리곤의 가장 가까운 선분을 찾는 함수
    function findNearestEdge(point: PIXI.Point): [number, number] {
      const threshold = 10;
      let minDistance = Infinity;
      let nearestPolygon = -1;
      let nearestEdge = -1;

      polygons.forEach((polygon, polygonIndex) => {
        for (let i = 0; i < polygon.length; i++) {
          const start = polygon[i];
          const end = polygon[(i + 1) % polygon.length];
          const distance = distanceToLineSegment(point, start, end);

          if (distance < threshold && distance < minDistance) {
            minDistance = distance;
            nearestPolygon = polygonIndex;
            nearestEdge = i;
          }
        }
      });

      return [nearestPolygon, nearestEdge];
    }

    function findPolygonByPoint(point: PIXI.Point): number {
      for (let i = polygons.length - 1; i >= 0; i--) {
        if (isPointInPolygon(point, polygons[i])) {
          return i;
        }
      }
      return -1;
    }

    function onMouseDown(e: MouseEvent) {
      const point = new PIXI.Point(e.offsetX, e.offsetY);

      if (e.button === 2) {
        currentPoints = [];
        isDrawing = false;
        drawAll();
        return;
      }

      if (e.button === 0) {
        if (!isDrawing) {
          // 먼저 점 선택 확인
          const [polygonIndex, pointIndex] = findNearestPoint(point);
          if (polygonIndex !== -1 && pointIndex !== -1) {
            selectedPolygonIndex = polygonIndex;
            selectedPointIndex = pointIndex;
            isDragging = true;
            return;
          }

          // 선분 위의 점 확인
          const [edgePolygonIndex, edgeIndex] = findNearestEdge(point);
          if (edgePolygonIndex !== -1 && edgeIndex !== -1) {
            // 선분에 새로운 점 추가
            const polygon = polygons[edgePolygonIndex];
            const newPoints = [...polygon];
            newPoints.splice(edgeIndex + 1, 0, point);
            polygons[edgePolygonIndex] = newPoints;

            // 새로 추가된 점을 선택 상태로
            selectedPolygonIndex = edgePolygonIndex;
            selectedPointIndex = edgeIndex + 1;
            isDragging = true;
            return;
          }

          // 폴리곤 내부 선택 확인
          const selectedPolygon = findPolygonByPoint(point);
          if (selectedPolygon !== -1) {
            selectedPolygonIndex = selectedPolygon;
            selectedPointIndex = -1;
            isDragging = true;
            dragStartPos = new PIXI.Point(e.offsetX, e.offsetY);
            return;
          }
        }

        isDrawing = true;

        if (currentPoints.length >= 3) {
          const firstPoint = currentPoints[0];
          const dx = firstPoint.x - point.x;
          const dy = firstPoint.y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 20) {
            polygons.push([...currentPoints]);
            currentPoints = [];
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

      if (isDragging && selectedPolygonIndex !== -1) {
        if (selectedPointIndex !== -1) {
          // 단일 점 이동
          polygons[selectedPolygonIndex][selectedPointIndex].x = point.x;
          polygons[selectedPolygonIndex][selectedPointIndex].y = point.y;
        } else if (dragStartPos) {
          // 전체 폴리곤 이동
          const dx = point.x - dragStartPos.x;
          const dy = point.y - dragStartPos.y;

          polygons[selectedPolygonIndex] = polygons[selectedPolygonIndex].map(
            (p) => new PIXI.Point(p.x + dx, p.y + dy)
          );

          dragStartPos = point;
        }
        drawAll();
        return;
      }

      // 마우스가 선분 위에 있을 때 시각적 피드백
      if (!isDrawing && !isDragging) {
        const [edgePolygonIndex, edgeIndex] = findNearestEdge(point);
        drawAll();
        if (edgePolygonIndex !== -1 && edgeIndex !== -1) {
          const polygon = polygons[edgePolygonIndex];
          const start = polygon[edgeIndex];
          const end = polygon[(edgeIndex + 1) % polygon.length];
          graphics.lineStyle(3, 0xff0000);
          graphics.moveTo(start.x, start.y);
          graphics.lineTo(end.x, end.y);
        }
      }

      if (isDrawing && currentPoints.length >= 3) {
        const firstPoint = currentPoints[0];
        const dx = firstPoint.x - point.x;
        const dy = firstPoint.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        drawAll();

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
      dragStartPos = null;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' && selectedPolygonIndex !== -1) {
        polygons.splice(selectedPolygonIndex, 1);
        selectedPolygonIndex = -1;
        selectedPointIndex = -1;
        drawAll();
      } else if (e.key === 'Escape') {
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

        polygon.forEach((point, pointIndex) => {
          const isSelected =
            index === selectedPolygonIndex && pointIndex === selectedPointIndex;
          graphics.beginFill(isSelected ? 0xff0000 : 0x000000);
          graphics.drawCircle(point.x, point.y, isSelected ? 6 : 4);
          graphics.endFill();
        });
      });

      if (currentPoints.length > 0) {
        graphics.lineStyle(2, 0x000000);
        graphics.moveTo(currentPoints[0].x, currentPoints[0].y);

        for (let i = 1; i < currentPoints.length; i++) {
          graphics.lineTo(currentPoints[i].x, currentPoints[i].y);
        }

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
