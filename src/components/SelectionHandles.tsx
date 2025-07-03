'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import { Rectangle } from '@/store/canvasStore';
import { normalizeRect } from '@/utils/rectUtils';

interface SelectionHandlesProps {
  selectedRect: Rectangle | null;
  scale: number;
}

export const SelectionHandles = ({
  selectedRect,
  scale,
}: SelectionHandlesProps) => {
  const drawHandles = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      if (!selectedRect) return;

      const normalized = normalizeRect(selectedRect);
      const handleSize = 8 / scale; // 스케일에 관계없이 일정한 크기
      const halfHandle = handleSize / 2;
      const edgeThickness = 4 / scale; // 변의 두께

      // 선택된 사각형 테두리 (하이라이트)
      graphics.setStrokeStyle({
        color: 'yellow',
        width: 2 / scale,
      });
      graphics.rect(
        normalized.x,
        normalized.y,
        normalized.width,
        normalized.height
      );
      graphics.stroke();

      // 상/하/좌/우 변을 굵게 그리기 (클릭 가능한 영역 표시)
      graphics.setStrokeStyle({
        color: 'yellow',
        width: edgeThickness,
        alpha: 0.7,
      });

      // 위쪽 변
      graphics.moveTo(normalized.x, normalized.y);
      graphics.lineTo(normalized.x + normalized.width, normalized.y);
      graphics.stroke();

      // 아래쪽 변
      graphics.moveTo(normalized.x, normalized.y + normalized.height);
      graphics.lineTo(
        normalized.x + normalized.width,
        normalized.y + normalized.height
      );
      graphics.stroke();

      // 왼쪽 변
      graphics.moveTo(normalized.x, normalized.y);
      graphics.lineTo(normalized.x, normalized.y + normalized.height);
      graphics.stroke();

      // 오른쪽 변
      graphics.moveTo(normalized.x + normalized.width, normalized.y);
      graphics.lineTo(
        normalized.x + normalized.width,
        normalized.y + normalized.height
      );
      graphics.stroke();

      // 대각선 핸들만 점으로 그리기 (nw, ne, sw, se)
      const cornerHandles = [
        {
          x: normalized.x,
          y: normalized.y,
          type: 'nw',
        }, // 왼쪽 위
        {
          x: normalized.x + normalized.width,
          y: normalized.y,
          type: 'ne',
        }, // 오른쪽 위
        {
          x: normalized.x + normalized.width,
          y: normalized.y + normalized.height,
          type: 'se',
        }, // 오른쪽 아래
        {
          x: normalized.x,
          y: normalized.y + normalized.height,
          type: 'sw',
        }, // 왼쪽 아래
      ];

      // 대각선 핸들 그리기
      cornerHandles.forEach((handle) => {
        // 핸들 배경 (흰색)
        graphics.setFillStyle({
          color: 0xffffff,
          alpha: 1,
        });
        graphics.circle(handle.x, handle.y, halfHandle);
        graphics.fill();

        // 핸들 테두리 (파란색)
        graphics.setStrokeStyle({
          color: 0x007bff,
          width: 1 / scale,
        });
        graphics.circle(handle.x, handle.y, halfHandle);
        graphics.stroke();
      });
    },
    [selectedRect, scale]
  );

  return <pixiGraphics draw={drawHandles} />;
};
