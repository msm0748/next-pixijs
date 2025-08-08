'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import type { CanvasPolygon as Polygon } from '@entities/canvas';

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
      graphics.setStrokeStyle({ color: 0x007bff, width: 3 / scale });
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
      selectedPolygon.points.forEach((point) => {
        graphics.setFillStyle({ color: 0xffffff, alpha: 1 });
        graphics.circle(point.x, point.y, halfHandle);
        graphics.fill();
        graphics.setStrokeStyle({ color: 0x007bff, width: 2 / scale });
        graphics.circle(point.x, point.y, halfHandle);
        graphics.stroke();
      });
    },
    [selectedPolygon, scale]
  );

  return <pixiGraphics draw={drawHandles} />;
};
