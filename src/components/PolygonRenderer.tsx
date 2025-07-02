'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import { Polygon } from '../store/canvasStore';

interface PolygonRendererProps {
  polygons: Polygon[];
  currentPolygon: Polygon | null;
  hoveredPointIndex: number | null;
  currentMousePosition: { x: number; y: number } | null;
}

const colorToHex = (color?: string) => {
  if (!color) return 0xff0000;
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  return 0xff0000;
};

export const PolygonRenderer = ({
  polygons,
  currentPolygon,
  hoveredPointIndex,
  currentMousePosition,
}: PolygonRendererProps) => {
  const drawPolygons = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      // 완성된 폴리곤들 그리기
      polygons.forEach((polygon) => {
        if (polygon.points.length < 2) return;

        const hexColor = colorToHex(polygon.color);

        // 폴리곤이 완성된 경우
        if (polygon.isComplete && polygon.points.length >= 3) {
          // 채우기
          graphics.setFillStyle({
            color: hexColor,
            alpha: 0.1,
          });
          graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
          for (let i = 1; i < polygon.points.length; i++) {
            graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
          }
          graphics.closePath();
          graphics.fill();
        }

        // 테두리 그리기
        graphics.setStrokeStyle({
          color: hexColor,
          width: 2 / window.devicePixelRatio,
        });
        graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
        for (let i = 1; i < polygon.points.length; i++) {
          graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
        }
        if (polygon.isComplete) {
          graphics.closePath();
        }
        graphics.stroke();

        // 점들 그리기
        polygon.points.forEach((point) => {
          // 점 배경 (흰색)
          graphics.setFillStyle({
            color: 0xffffff,
            alpha: 1,
          });
          graphics.circle(point.x, point.y, 4 / window.devicePixelRatio);
          graphics.fill();

          // 점 테두리
          graphics.setStrokeStyle({
            color: hexColor,
            width: 2 / window.devicePixelRatio,
          });
          graphics.circle(point.x, point.y, 4 / window.devicePixelRatio);
          graphics.stroke();
        });
      });

      // 현재 그리고 있는 폴리곤
      if (currentPolygon && currentPolygon.points.length > 0) {
        const hexColor = 0x00ff00; // 그리는 중일 때는 초록색

        // 선 그리기
        if (currentPolygon.points.length > 1) {
          graphics.setStrokeStyle({
            color: hexColor,
            width: 2 / window.devicePixelRatio,
          });
          graphics.moveTo(
            currentPolygon.points[0].x,
            currentPolygon.points[0].y
          );
          for (let i = 1; i < currentPolygon.points.length; i++) {
            graphics.lineTo(
              currentPolygon.points[i].x,
              currentPolygon.points[i].y
            );
          }
          graphics.stroke();
        }

        // 점들 그리기
        currentPolygon.points.forEach((point, index) => {
          const isFirstPoint = index === 0;
          const isHovered = isFirstPoint && hoveredPointIndex === 0;
          const pointRadius = isHovered ? 6 : 4; // 호버 시 크기 증가

          // 점 배경
          graphics.setFillStyle({
            color: isFirstPoint ? 0xffff00 : 0xffffff, // 첫 번째 점은 노란색
            alpha: 1,
          });
          graphics.circle(
            point.x,
            point.y,
            pointRadius / window.devicePixelRatio
          );
          graphics.fill();

          // 점 테두리
          graphics.setStrokeStyle({
            color: isHovered ? 0xff0000 : hexColor, // 호버 시 빨간색
            width: (isHovered ? 3 : 2) / window.devicePixelRatio, // 호버 시 두께 증가
          });
          graphics.circle(
            point.x,
            point.y,
            pointRadius / window.devicePixelRatio
          );
          graphics.stroke();
        });

        // 마지막 점과 현재 마우스 위치를 연결하는 미리보기 선
        if (currentMousePosition && currentPolygon.points.length > 0) {
          const lastPoint =
            currentPolygon.points[currentPolygon.points.length - 1];
          graphics.setStrokeStyle({
            color: 0x00ff00,
            width: 1 / window.devicePixelRatio,
            alpha: 0.5, // 반투명으로 미리보기 표시
          });
          graphics.moveTo(lastPoint.x, lastPoint.y);
          graphics.lineTo(currentMousePosition.x, currentMousePosition.y);
          graphics.stroke();
        }

        // 첫 번째 점 완성 힌트 (3개 이상 점이 있을 때)
        if (currentPolygon.points.length >= 3) {
          const firstPoint = currentPolygon.points[0];
          graphics.setStrokeStyle({
            color: 0xffff00,
            width: 1 / window.devicePixelRatio,
          });
          graphics.circle(
            firstPoint.x,
            firstPoint.y,
            10 / window.devicePixelRatio
          );
          graphics.stroke();
        }
      }
    },
    [polygons, currentPolygon, hoveredPointIndex, currentMousePosition]
  );

  return <pixiGraphics draw={drawPolygons} />;
};
