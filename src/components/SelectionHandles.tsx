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

      // 상/하/좌/우 변을 굵게 그리기 (클릭 가능한 영역 표시)
      graphics.setStrokeStyle({
        color: 0x007bff,
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

// 점과 선분 사이의 거리를 계산하는 함수
const distanceToLineSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length))
  );
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
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
  const edgeTolerance = 6 / scale; // 변 클릭 허용 거리

  // 대각선 핸들 체크 (점 방식)
  const cornerHandles = [
    { x: normalized.x, y: normalized.y, type: 'nw' as const },
    {
      x: normalized.x + normalized.width,
      y: normalized.y,
      type: 'ne' as const,
    },
    {
      x: normalized.x + normalized.width,
      y: normalized.y + normalized.height,
      type: 'se' as const,
    },
    {
      x: normalized.x,
      y: normalized.y + normalized.height,
      type: 'sw' as const,
    },
  ];

  // 대각선 핸들 우선 체크
  for (const handle of cornerHandles) {
    const dx = worldPos.x - handle.x;
    const dy = worldPos.y - handle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance) {
      return handle.type;
    }
  }

  // 상/하/좌/우 변 체크 (선 방식)
  const edges = [
    {
      x1: normalized.x,
      y1: normalized.y,
      x2: normalized.x + normalized.width,
      y2: normalized.y,
      type: 'n' as const,
    }, // 위쪽 변
    {
      x1: normalized.x + normalized.width,
      y1: normalized.y,
      x2: normalized.x + normalized.width,
      y2: normalized.y + normalized.height,
      type: 'e' as const,
    }, // 오른쪽 변
    {
      x1: normalized.x,
      y1: normalized.y + normalized.height,
      x2: normalized.x + normalized.width,
      y2: normalized.y + normalized.height,
      type: 's' as const,
    }, // 아래쪽 변
    {
      x1: normalized.x,
      y1: normalized.y,
      x2: normalized.x,
      y2: normalized.y + normalized.height,
      type: 'w' as const,
    }, // 왼쪽 변
  ];

  // 변 클릭 체크
  for (const edge of edges) {
    const distance = distanceToLineSegment(
      worldPos.x,
      worldPos.y,
      edge.x1,
      edge.y1,
      edge.x2,
      edge.y2
    );

    if (distance <= edgeTolerance) {
      return edge.type;
    }
  }

  return null;
};
