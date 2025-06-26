'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import { Rectangle } from '@/store/canvasStore';

interface SelectionHandlesProps {
  selectedRect: Rectangle | null;
  scale: number;
}

// 사각형 좌표를 정규화하는 함수
const normalizeRect = (rect: Rectangle) => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  return { x, y, width, height };
};

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

      // 핸들 위치 계산
      const handles = [
        {
          x: normalized.x - halfHandle,
          y: normalized.y - halfHandle,
          type: 'nw',
        }, // 왼쪽 위
        {
          x: normalized.x + normalized.width / 2 - halfHandle,
          y: normalized.y - halfHandle,
          type: 'n',
        }, // 위
        {
          x: normalized.x + normalized.width - halfHandle,
          y: normalized.y - halfHandle,
          type: 'ne',
        }, // 오른쪽 위
        {
          x: normalized.x + normalized.width - halfHandle,
          y: normalized.y + normalized.height / 2 - halfHandle,
          type: 'e',
        }, // 오른쪽
        {
          x: normalized.x + normalized.width - halfHandle,
          y: normalized.y + normalized.height - halfHandle,
          type: 'se',
        }, // 오른쪽 아래
        {
          x: normalized.x + normalized.width / 2 - halfHandle,
          y: normalized.y + normalized.height - halfHandle,
          type: 's',
        }, // 아래
        {
          x: normalized.x - halfHandle,
          y: normalized.y + normalized.height - halfHandle,
          type: 'sw',
        }, // 왼쪽 아래
        {
          x: normalized.x - halfHandle,
          y: normalized.y + normalized.height / 2 - halfHandle,
          type: 'w',
        }, // 왼쪽
      ];

      // 선택된 사각형 테두리 (하이라이트)
      graphics.setStrokeStyle({
        color: 0x007bff,
        width: 2 / scale,
      });
      graphics.rect(
        normalized.x,
        normalized.y,
        normalized.width,
        normalized.height
      );
      graphics.stroke();

      // 핸들 그리기
      handles.forEach((handle) => {
        // 핸들 배경 (흰색)
        graphics.setFillStyle({
          color: 0xffffff,
          alpha: 1,
        });
        graphics.circle(
          handle.x + halfHandle,
          handle.y + halfHandle,
          halfHandle
        );
        graphics.fill();

        // 핸들 테두리 (파란색)
        graphics.setStrokeStyle({
          color: 0x007bff,
          width: 1 / scale,
        });
        graphics.circle(
          handle.x + halfHandle,
          handle.y + halfHandle,
          halfHandle
        );
        graphics.stroke();
      });
    },
    [selectedRect, scale]
  );

  return <pixiGraphics draw={drawHandles} />;
};

// 핸들 히트 테스트 유틸리티 함수
export const getHandleAtPosition = (
  worldPos: { x: number; y: number },
  rect: Rectangle,
  scale: number
): 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' | null => {
  const normalized = normalizeRect(rect);
  const handleSize = 8 / scale;
  const tolerance = handleSize;

  const handles = [
    { x: normalized.x, y: normalized.y, type: 'nw' as const },
    {
      x: normalized.x + normalized.width / 2,
      y: normalized.y,
      type: 'n' as const,
    },
    {
      x: normalized.x + normalized.width,
      y: normalized.y,
      type: 'ne' as const,
    },
    {
      x: normalized.x + normalized.width,
      y: normalized.y + normalized.height / 2,
      type: 'e' as const,
    },
    {
      x: normalized.x + normalized.width,
      y: normalized.y + normalized.height,
      type: 'se' as const,
    },
    {
      x: normalized.x + normalized.width / 2,
      y: normalized.y + normalized.height,
      type: 's' as const,
    },
    {
      x: normalized.x,
      y: normalized.y + normalized.height,
      type: 'sw' as const,
    },
    {
      x: normalized.x,
      y: normalized.y + normalized.height / 2,
      type: 'w' as const,
    },
  ];

  for (const handle of handles) {
    const dx = worldPos.x - handle.x;
    const dy = worldPos.y - handle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance) {
      return handle.type;
    }
  }

  return null;
};
