'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import type { CanvasRectangle as Rectangle } from '@entities/canvas';
import { colorToHex } from '@shared/lib/color';
import { normalizeRect } from '@shared/lib/rect';

interface RectangleRendererProps {
  rectangles: Rectangle[];
  drawingRect: Rectangle | null;
}

export const RectangleRenderer = ({
  rectangles,
  drawingRect,
}: RectangleRendererProps) => {
  const drawRectangles = useCallback(
    (graphics: Graphics) => {
      graphics.clear();
      rectangles.forEach((rect) => {
        const hexColor = colorToHex(rect.color);
        const normalized = normalizeRect(rect);
        graphics.setStrokeStyle({
          color: hexColor,
          width: 2 / window.devicePixelRatio,
        });
        graphics.rect(
          normalized.x,
          normalized.y,
          normalized.width,
          normalized.height
        );
        graphics.stroke();
        graphics.setFillStyle({ color: hexColor, alpha: 0.1 });
        graphics.rect(
          normalized.x,
          normalized.y,
          normalized.width,
          normalized.height
        );
        graphics.fill();
      });
      if (drawingRect) {
        const normalized = normalizeRect(drawingRect);
        if (normalized.width > 2 && normalized.height > 2) {
          graphics.setStrokeStyle({
            color: 0x00ff00,
            width: 2 / window.devicePixelRatio,
          });
          graphics.rect(
            normalized.x,
            normalized.y,
            normalized.width,
            normalized.height
          );
          graphics.stroke();
          graphics.setFillStyle({ color: 0x00ff00, alpha: 0.1 });
          graphics.rect(
            normalized.x,
            normalized.y,
            normalized.width,
            normalized.height
          );
          graphics.fill();
        }
      }
    },
    [rectangles, drawingRect]
  );

  return <pixiGraphics draw={drawRectangles} />;
};
