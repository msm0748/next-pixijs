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
