'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import {
  LIGHT_BG_ALPHA,
  SOLID_BG_ALPHA,
  type CanvasRectangle as Rectangle,
} from '@entities/canvas';
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

        // 사각형 배경색상 채우기
        graphics.setFillStyle({ color: hexColor, alpha: LIGHT_BG_ALPHA });
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
        const hexColor = colorToHex(drawingRect.color);
        if (normalized.width > 2 && normalized.height > 2) {
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
          graphics.setFillStyle({ color: hexColor, alpha: SOLID_BG_ALPHA });
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
