'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import { Polygon } from '@/store/canvasStore';

interface PolygonSelectionHandlesProps {
  selectedPolygon: Polygon | null;
  scale: number;
}

export const PolygonSelectionHandles = ({
  selectedPolygon,
  scale,
}: PolygonSelectionHandlesProps) => {
  const drawHandles = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      if (!selectedPolygon) return;

      const handleSize = 8 / scale; // 스케일에 관계없이 일정한 크기
      const halfHandle = handleSize / 2;

      // 선택된 폴리곤 테두리 (하이라이트)
      graphics.setStrokeStyle({
        color: 0x007bff,
        width: 3 / scale,
      });

      if (selectedPolygon.points.length > 1) {
        graphics.moveTo(
          selectedPolygon.points[0].x,
          selectedPolygon.points[0].y
        );
        for (let i = 1; i < selectedPolygon.points.length; i++) {
          graphics.lineTo(
            selectedPolygon.points[i].x,
            selectedPolygon.points[i].y
          );
        }
        if (selectedPolygon.isComplete) {
          graphics.closePath();
        }
        graphics.stroke();
      }

      // 각 점에 핸들 그리기
      selectedPolygon.points.forEach((point) => {
        // 핸들 배경 (흰색)
        graphics.setFillStyle({
          color: 0xffffff,
          alpha: 1,
        });
        graphics.circle(point.x, point.y, halfHandle);
        graphics.fill();

        // 핸들 테두리 (파란색)
        graphics.setStrokeStyle({
          color: 0x007bff,
          width: 2 / scale,
        });
        graphics.circle(point.x, point.y, halfHandle);
        graphics.stroke();
      });
    },
    [selectedPolygon, scale]
  );

  return <pixiGraphics draw={drawHandles} />;
};

// 점 핸들 히트 테스트 유틸리티 함수
export const getPointHandleAtPosition = (
  worldPos: { x: number; y: number },
  polygon: Polygon,
  scale: number
): number | null => {
  const handleSize = 8 / scale;
  const tolerance = handleSize;

  for (let i = 0; i < polygon.points.length; i++) {
    const point = polygon.points[i];
    const dx = worldPos.x - point.x;
    const dy = worldPos.y - point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance) {
      return i;
    }
  }

  return null;
};

// 선분 위의 점인지 확인하는 유틸리티 함수
export const getPointOnEdge = (
  worldPos: { x: number; y: number },
  polygon: Polygon,
  scale: number
): { edgeIndex: number; position: { x: number; y: number } } | null => {
  const tolerance = 5 / scale; // 선분과의 허용 거리

  for (let i = 0; i < polygon.points.length; i++) {
    const currentPoint = polygon.points[i];
    const nextPoint = polygon.points[(i + 1) % polygon.points.length];

    // 완성되지 않은 폴리곤의 마지막 선분은 제외
    if (!polygon.isComplete && i === polygon.points.length - 1) {
      continue;
    }

    // 선분과 점 사이의 거리 계산
    const A = worldPos.x - currentPoint.x;
    const B = worldPos.y - currentPoint.y;
    const C = nextPoint.x - currentPoint.x;
    const D = nextPoint.y - currentPoint.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) continue; // 점이 같은 경우

    const param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = currentPoint.x;
      yy = currentPoint.y;
    } else if (param > 1) {
      xx = nextPoint.x;
      yy = nextPoint.y;
    } else {
      xx = currentPoint.x + param * C;
      yy = currentPoint.y + param * D;
    }

    const dx = worldPos.x - xx;
    const dy = worldPos.y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance && param >= 0 && param <= 1) {
      return {
        edgeIndex: i,
        position: worldPos,
      };
    }
  }

  return null;
};
