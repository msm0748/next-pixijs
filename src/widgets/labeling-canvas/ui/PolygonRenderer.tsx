'use client';

import { Graphics } from 'pixi.js';
import { useCallback } from 'react';
import type { CanvasPolygon as Polygon } from '@entities/canvas';
import { colorToHex } from '@shared/lib/color';

interface PolygonRendererProps {
  polygons: Polygon[];
  currentPolygon: Polygon | null;
  hoveredPointIndex: number | null;
  currentMousePosition: { x: number; y: number } | null;
}

export const PolygonRenderer = ({
  polygons,
  currentPolygon,
  hoveredPointIndex,
  currentMousePosition,
}: PolygonRendererProps) => {
  const drawPolygons = useCallback(
    (graphics: Graphics) => {
      graphics.clear();
      polygons.forEach((polygon) => {
        if (polygon.points.length < 2) return;
        const hexColor = colorToHex(polygon.color);
        if (polygon.isComplete && polygon.points.length >= 3) {
          graphics.setFillStyle({ color: hexColor, alpha: 0.1 });
          graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
          for (let i = 1; i < polygon.points.length; i++) {
            graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
          }
          graphics.closePath();
          graphics.fill();
        }
        graphics.setStrokeStyle({
          color: hexColor,
          width: 2 / window.devicePixelRatio,
        });
        graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
        for (let i = 1; i < polygon.points.length; i++) {
          graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
        }
        if (polygon.isComplete) {
          graphics.closePath();
        }
        graphics.stroke();
        polygon.points.forEach((point) => {
          graphics.setFillStyle({ color: 0xffffff, alpha: 1 });
          graphics.circle(point.x, point.y, 4 / window.devicePixelRatio);
          graphics.fill();
          graphics.setStrokeStyle({
            color: hexColor,
            width: 2 / window.devicePixelRatio,
          });
          graphics.circle(point.x, point.y, 4 / window.devicePixelRatio);
          graphics.stroke();
        });
      });
      if (currentPolygon && currentPolygon.points.length > 0) {
        const hexColor = 0x00ff00;
        if (currentPolygon.points.length > 1) {
          graphics.setStrokeStyle({
            color: hexColor,
            width: 2 / window.devicePixelRatio,
          });
          graphics.moveTo(
            currentPolygon.points[0].x,
            currentPolygon.points[0].y
          );
          for (let i = 1; i < currentPolygon.points.length; i++) {
            graphics.lineTo(
              currentPolygon.points[i].x,
              currentPolygon.points[i].y
            );
          }
          graphics.stroke();
        }
        currentPolygon.points.forEach((point, index) => {
          const isFirstPoint = index === 0;
          const isHovered = isFirstPoint && hoveredPointIndex === 0;
          const pointRadius = isHovered ? 6 : 4;
          graphics.setFillStyle({
            color: isFirstPoint ? 0xffff00 : 0xffffff,
            alpha: 1,
          });
          graphics.circle(
            point.x,
            point.y,
            pointRadius / window.devicePixelRatio
          );
          graphics.fill();
          graphics.setStrokeStyle({
            color: isHovered ? 0xff0000 : hexColor,
            width: (isHovered ? 3 : 2) / window.devicePixelRatio,
          });
          graphics.circle(
            point.x,
            point.y,
            pointRadius / window.devicePixelRatio
          );
          graphics.stroke();
        });
        if (currentMousePosition && currentPolygon.points.length > 0) {
          const lastPoint =
            currentPolygon.points[currentPolygon.points.length - 1];
          graphics.setStrokeStyle({
            color: 0x00ff00,
            width: 1 / window.devicePixelRatio,
            alpha: 0.5,
          });
          graphics.moveTo(lastPoint.x, lastPoint.y);
          graphics.lineTo(currentMousePosition.x, currentMousePosition.y);
          graphics.stroke();
        }
        if (currentPolygon.points.length >= 3) {
          const firstPoint = currentPolygon.points[0];
          graphics.setStrokeStyle({
            color: 0xffff00,
            width: 1 / window.devicePixelRatio,
          });
          graphics.circle(
            firstPoint.x,
            firstPoint.y,
            10 / window.devicePixelRatio
          );
          graphics.stroke();
        }
      }
    },
    [polygons, currentPolygon, hoveredPointIndex, currentMousePosition]
  );

  return <pixiGraphics draw={drawPolygons} />;
};
