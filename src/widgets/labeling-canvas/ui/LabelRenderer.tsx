'use client';

import type {
  CanvasRectangle as Rectangle,
  CanvasPolygon as Polygon,
} from '@entities/canvas';

interface LabelRendererProps {
  rectangles: Rectangle[];
  polygons: Polygon[];
  scale: number;
}

export const LabelRenderer = ({
  rectangles,
  polygons,
  scale,
}: LabelRendererProps) => {
  // Rectangle 라벨들을 렌더링
  const renderRectangleLabels = () => {
    return rectangles
      .filter((rect) => rect.label)
      .map((rect) => {
        const fontSize = Math.max(12, 16 / scale);
        // 사각형의 실제 좌상단 모서리 위치 계산
        const leftX = rect.width >= 0 ? rect.x : rect.x + rect.width;
        const topY = rect.height >= 0 ? rect.y : rect.y + rect.height;
        const x = leftX;
        const y = topY - fontSize - 4; // 라벨을 좌상단 위쪽에 위치

        return (
          <pixiText
            key={`rect-label-${rect.id}`}
            text={rect.label!}
            x={x}
            y={y}
            style={{
              fontSize,
              fill: '#ffffff',
              stroke: '#000000',
              fontFamily: 'Noto Sans KR, Arial, sans-serif',
              fontWeight: 'bold',
            }}
            resolution={2}
          />
        );
      });
  };

  // Polygon 라벨들을 렌더링
  const renderPolygonLabels = () => {
    return polygons
      .filter((polygon) => polygon.label && polygon.points.length > 0)
      .map((polygon) => {
        const fontSize = Math.max(12, 16 / scale);
        // 폴리곤의 좌상단 모서리를 찾아 라벨 위치 결정
        const minX = Math.min(...polygon.points.map((p) => p.x));
        const minY = Math.min(...polygon.points.map((p) => p.y));
        const x = minX;
        const y = minY - fontSize - 4; // 라벨을 좌상단 위쪽에 위치

        return (
          <pixiText
            key={`polygon-label-${polygon.id}`}
            text={polygon.label!}
            x={x}
            y={y}
            style={{
              fontSize,
              fill: '#ffffff',
              stroke: '#000000',
              fontFamily: 'Noto Sans KR, Arial, sans-serif',
              fontWeight: 'bold',
            }}
            resolution={2}
          />
        );
      });
  };

  return (
    <pixiContainer>
      {renderRectangleLabels()}
      {renderPolygonLabels()}
    </pixiContainer>
  );
};
