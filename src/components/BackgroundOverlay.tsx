'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import { Rectangle, Polygon } from '../store/canvasStore';

interface BackgroundOverlayProps {
  rectangles: Rectangle[];
  polygons: Polygon[];
  canvasSize: { width: number; height: number };
  scale: number;
  position: { x: number; y: number };
  enabled: boolean;
}

// 사각형 좌표를 정규화하는 함수
const normalizeRect = (rect: Rectangle) => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);
  return { x, y, width, height };
};

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

      // 전체 캔버스 영역을 월드 좌표로 변환
      const worldBounds = {
        x: -position.x / scale - 2000, // 여유분 추가
        y: -position.y / scale - 2000,
        width: canvasSize.width / scale + 4000,
        height: canvasSize.height / scale + 4000,
      };

      // 모든 라벨링된 영역들을 수집
      const labeledAreas: Array<
        { type: 'rect'; data: Rectangle } | { type: 'polygon'; data: Polygon }
      > = [
        ...rectangles.map((rect) => ({ type: 'rect' as const, data: rect })),
        ...polygons
          .filter((p) => p.isComplete && p.points.length >= 3)
          .map((polygon) => ({ type: 'polygon' as const, data: polygon })),
      ];

      // 라벨링된 영역이 없으면 전체를 어둡게
      if (labeledAreas.length === 0) {
        graphics.setFillStyle({
          color: 0x000000,
          alpha: 0.5,
        });
        graphics.rect(
          worldBounds.x,
          worldBounds.y,
          worldBounds.width,
          worldBounds.height
        );
        graphics.fill();
        return;
      }

      // 복잡한 영역 분할 대신 간단한 오버레이 방식 사용
      // 1. 전체 배경을 어둡게
      graphics.setFillStyle({
        color: 0x000000,
        alpha: 0.3, // 투명도를 낮춰서 겹침 효과 최소화
      });
      graphics.rect(
        worldBounds.x,
        worldBounds.y,
        worldBounds.width,
        worldBounds.height
      );
      graphics.fill();

      // 2. 라벨링된 영역들에 밝은 오버레이를 추가하여 원래 밝기에 가깝게 복원
      labeledAreas.forEach((area) => {
        graphics.setFillStyle({
          color: 0xffffff,
          alpha: 0.3, // 어두운 부분을 상쇄할 정도의 밝기
        });

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
