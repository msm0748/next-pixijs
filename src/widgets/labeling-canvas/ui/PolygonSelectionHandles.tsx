'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import {
  SOLID_BG_ALPHA,
  type CanvasPolygon as Polygon,
} from '@entities/canvas';
import { colorToHex } from '@shared/lib/color';

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
      const handleSize = 8 / scale;
      const halfHandle = handleSize / 2;

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
      // 폴리곤 배경색상 채우기
      graphics.setFillStyle({
        color: colorToHex(selectedPolygon.color),
        alpha: SOLID_BG_ALPHA,
      });
      graphics.fill();
      selectedPolygon.points.forEach((point) => {
        // 1. 하얀색으로 채워진 원 그리기
        graphics.setFillStyle({ color: 0xffffff, alpha: 1 });
        graphics.circle(point.x, point.y, halfHandle);
        graphics.fill();

        // 2. 폴리곤 색상으로 외곽선 그리기
        graphics.setStrokeStyle({
          color: colorToHex(selectedPolygon.color),
          width: 1 / scale,
        });
        graphics.circle(point.x, point.y, halfHandle);
        graphics.stroke();
      });
    },
    [selectedPolygon, scale]
  );

  return <pixiGraphics draw={drawHandles} />;
};
