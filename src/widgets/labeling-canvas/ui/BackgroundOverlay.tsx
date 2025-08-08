'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import type {
  CanvasRectangle as Rectangle,
  CanvasPolygon as Polygon,
} from '@entities/canvas';
import { normalizeRect } from '@shared/lib/rect';

interface BackgroundOverlayProps {
  rectangles: Rectangle[];
  polygons: Polygon[];
  canvasSize: { width: number; height: number };
  scale: number;
  position: { x: number; y: number };
  enabled: boolean;
}

export const BackgroundOverlay = ({
  rectangles,
  polygons,
  canvasSize,
  scale,
  position,
  enabled,
}: BackgroundOverlayProps) => {
  const drawOverlay = useCallback(
    (graphics: Graphics) => {
      graphics.clear();
      if (!enabled) return;
      const worldBounds = {
        x: -position.x / scale - 2000,
        y: -position.y / scale - 2000,
        width: canvasSize.width / scale + 4000,
        height: canvasSize.height / scale + 4000,
      };
      const labeledAreas: Array<
        { type: 'rect'; data: Rectangle } | { type: 'polygon'; data: Polygon }
      > = [
        ...rectangles.map((rect) => ({ type: 'rect' as const, data: rect })),
        ...polygons
          .filter((p) => p.isComplete && p.points.length >= 3)
          .map((polygon) => ({ type: 'polygon' as const, data: polygon })),
      ];
      if (labeledAreas.length === 0) {
        graphics.setFillStyle({ color: 0x000000, alpha: 0.5 });
        graphics.rect(
          worldBounds.x,
          worldBounds.y,
          worldBounds.width,
          worldBounds.height
        );
        graphics.fill();
        return;
      }
      graphics.setFillStyle({ color: 0x000000, alpha: 0.8 });
      graphics.rect(
        worldBounds.x,
        worldBounds.y,
        worldBounds.width,
        worldBounds.height
      );
      graphics.fill();
      labeledAreas.forEach((area) => {
        graphics.setFillStyle({ color: 0xffffff, alpha: 0.3 });
        if (area.type === 'rect') {
          const normalized = normalizeRect(area.data);
          graphics.rect(
            normalized.x,
            normalized.y,
            normalized.width,
            normalized.height
          );
          graphics.fill();
        } else if (area.type === 'polygon') {
          const points = area.data.points;
          graphics.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
          }
          graphics.closePath();
          graphics.fill();
        }
      });
    },
    [rectangles, polygons, canvasSize, scale, position, enabled]
  );

  return <pixiGraphics draw={drawOverlay} />;
};
