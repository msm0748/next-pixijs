'use client';

import { Rectangle } from '@/store/canvasStore';
import { Graphics } from 'pixi.js';
import { useCallback } from 'react';

interface RectangleRendererProps {
  rectangles: Rectangle[];
  drawingRect: Rectangle | null;
}

// 색상 문자열을 hex 숫자로 변환하는 함수
const colorToHex = (color: string | undefined): number => {
  if (!color) return 0xff0000;
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  return parseInt(color, 16);
};

export const RectangleRenderer = ({
  rectangles,
  drawingRect,
}: RectangleRendererProps) => {
  const drawRectangles = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      // 완성된 사각형들 그리기
      rectangles.forEach((rect) => {
        const hexColor = colorToHex(rect.color);

        graphics.setStrokeStyle({
          color: hexColor,
          width: 2 / window.devicePixelRatio, // 스케일에 관계없이 일정한 두께
        });
        graphics.rect(rect.x, rect.y, rect.width, rect.height);
        graphics.stroke();

        // 반투명 채우기
        graphics.setFillStyle({
          color: hexColor,
          alpha: 0.1,
        });
        graphics.rect(rect.x, rect.y, rect.width, rect.height);
        graphics.fill();
      });

      // 현재 그리고 있는 사각형
      if (drawingRect) {
        graphics.setStrokeStyle({
          color: 0x00ff00, // 그리는 중일 때는 초록색
          width: 2 / window.devicePixelRatio,
        });
        graphics.rect(
          drawingRect.x,
          drawingRect.y,
          drawingRect.width,
          drawingRect.height
        );
        graphics.stroke();

        graphics.setFillStyle({
          color: 0x00ff00,
          alpha: 0.1,
        });
        graphics.rect(
          drawingRect.x,
          drawingRect.y,
          drawingRect.width,
          drawingRect.height
        );
        graphics.fill();
      }
    },
    [rectangles, drawingRect]
  );

  return <pixiGraphics draw={drawRectangles} />;
};
