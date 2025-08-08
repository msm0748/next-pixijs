'use client';

import { ColorMatrixFilter } from 'pixi.js';
import { useMemo } from 'react';

interface ImageFilterProps {
  brightness: number;
  contrast: number;
  children: React.ReactNode;
}

export const ImageFilter = ({
  brightness,
  contrast,
  children,
}: ImageFilterProps) => {
  const colorMatrixFilter = useMemo(() => {
    const filter = new ColorMatrixFilter();
    if (brightness !== 0) {
      const brightnessValue = 1 + brightness / 100;
      filter.brightness(brightnessValue, false);
    }
    if (contrast !== 0) {
      const contrastValue = 1 + (contrast / 100) * 0.5;
      filter.contrast(contrastValue, true);
    }
    return filter;
  }, [brightness, contrast]);
  const shouldApplyFilter = brightness !== 0 || contrast !== 0;
  if (!shouldApplyFilter) {
    return <>{children}</>;
  }
  return (
    <pixiContainer filters={[colorMatrixFilter]}>{children}</pixiContainer>
  );
};
