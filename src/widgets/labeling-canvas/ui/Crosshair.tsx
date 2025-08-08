'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';

interface CrosshairProps {
  mousePosition: { x: number; y: number } | null;
  scale: number;
  position: { x: number; y: number };
  canvasSize: { width: number; height: number };
  visible: boolean;
}

export const Crosshair = ({
  mousePosition,
  scale,
  position,
  canvasSize,
  visible,
}: CrosshairProps) => {
  const drawCrosshair = useCallback(
    (graphics: Graphics) => {
      graphics.clear();
      if (!mousePosition || !visible) return;
      const { x, y } = mousePosition;
      const strokeWidth = 1 / scale;
      const screenLeft = -position.x / scale;
      const screenRight = (canvasSize.width - position.x) / scale;
      const screenTop = -position.y / scale;
      const screenBottom = (canvasSize.height - position.y) / scale;
      const dashLength = 10 / scale;
      const gapLength = 5 / scale;
      graphics.setStrokeStyle({
        color: 0xff0000,
        width: strokeWidth,
        alpha: 0.6,
      });
      const verticalDistance = screenBottom - screenTop;
      const verticalDashes = Math.floor(
        verticalDistance / (dashLength + gapLength)
      );
      for (let i = 0; i <= verticalDashes; i++) {
        const startY = screenTop + i * (dashLength + gapLength);
        const endY = Math.min(startY + dashLength, screenBottom);
        if (startY < screenBottom) {
          graphics.moveTo(x, startY);
          graphics.lineTo(x, endY);
          graphics.stroke();
        }
      }
      const horizontalDistance = screenRight - screenLeft;
      const horizontalDashes = Math.floor(
        horizontalDistance / (dashLength + gapLength)
      );
      for (let i = 0; i <= horizontalDashes; i++) {
        const startX = screenLeft + i * (dashLength + gapLength);
        const endX = Math.min(startX + dashLength, screenRight);
        if (startX < screenRight) {
          graphics.moveTo(startX, y);
          graphics.lineTo(endX, y);
          graphics.stroke();
        }
      }
      graphics.setFillStyle({ color: 0xff0000, alpha: 0.8 });
      graphics.circle(x, y, 3 / scale);
      graphics.fill();
    },
    [mousePosition, scale, position, canvasSize, visible]
  );

  return <pixiGraphics draw={drawCrosshair} />;
};
