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
