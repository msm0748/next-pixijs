'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import {
  SOLID_BG_ALPHA,
  type CanvasRectangle as Rectangle,
} from '@entities/canvas';
import { normalizeRect } from '@shared/lib/rect';
import { colorToHex } from '@shared/lib/color';

interface SelectionHandlesProps {
  selectedRect: Rectangle | null;
  scale: number;
}

export const RectangleSelectionHandles = ({
  selectedRect,
  scale,
}: SelectionHandlesProps) => {
  const drawHandles = useCallback(
    (graphics: Graphics) => {
      graphics.clear();
      if (!selectedRect) return;
      const normalized = normalizeRect(selectedRect);
      const handleSize = 8 / scale;
      const halfHandle = handleSize / 2;
      const edgeThickness = 4 / scale;
      graphics.setStrokeStyle({
        color: colorToHex(selectedRect.color),
        width: 2 / scale,
      });

      // 사각형 내부 배경 (더 진하게 보이게 alpha 높이기)
      graphics.setFillStyle({
        color: colorToHex(selectedRect.color),
        alpha: SOLID_BG_ALPHA,
      });

      graphics.rect(
        normalized.x,
        normalized.y,
        normalized.width,
        normalized.height
      );
      graphics.fill();

      graphics.stroke();
      graphics.setStrokeStyle({
        color: colorToHex(selectedRect.color),
        width: edgeThickness,
        alpha: 0.7,
      });
      graphics.moveTo(normalized.x, normalized.y);
      graphics.lineTo(normalized.x + normalized.width, normalized.y);
      graphics.stroke();
      graphics.moveTo(normalized.x, normalized.y + normalized.height);
      graphics.lineTo(
        normalized.x + normalized.width,
        normalized.y + normalized.height
      );
      graphics.stroke();
      graphics.moveTo(normalized.x, normalized.y);
      graphics.lineTo(normalized.x, normalized.y + normalized.height);
      graphics.stroke();
      graphics.moveTo(normalized.x + normalized.width, normalized.y);
      graphics.lineTo(
        normalized.x + normalized.width,
        normalized.y + normalized.height
      );
      graphics.stroke();
      const cornerHandles = [
        { x: normalized.x, y: normalized.y, type: 'nw' },
        { x: normalized.x + normalized.width, y: normalized.y, type: 'ne' },
        {
          x: normalized.x + normalized.width,
          y: normalized.y + normalized.height,
          type: 'se',
        },
        { x: normalized.x, y: normalized.y + normalized.height, type: 'sw' },
      ];

      cornerHandles.forEach((handle) => {
        // 원 배경색상
        graphics.setFillStyle({ color: 0xffffff, alpha: 1 });
        graphics.circle(handle.x, handle.y, halfHandle);
        graphics.fill();

        // 원 테두리
        graphics.setStrokeStyle({ color: 0x007bff, width: 1 / scale });
        graphics.circle(handle.x, handle.y, halfHandle);
        graphics.stroke();
      });
    },
    [selectedRect, scale]
  );

  return <pixiGraphics draw={drawHandles} />;
};
