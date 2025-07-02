'use client';

import { ColorMatrixFilter } from 'pixi.js';
import { useMemo } from 'react';

interface ImageFilterProps {
  brightness: number; // -100 ~ 100
  contrast: number; // -100 ~ 100
  children: React.ReactNode;
}

export const ImageFilter = ({
  brightness,
  contrast,
  children,
}: ImageFilterProps) => {
  const colorMatrixFilter = useMemo(() => {
    const filter = new ColorMatrixFilter();

    // 공식 문서에 따른 올바른 사용법
    // brightness 메서드: -1 ~ 1 범위, multiply=false는 덮어쓰기
    if (brightness !== 0) {
      const brightnessValue = 1 + brightness / 100; // -100~100을 -1~1로 변환
      filter.brightness(brightnessValue, false);
    }

    // contrast 메서드: 배수 값, multiply=true는 기존 값에 곱하기
    if (contrast !== 0) {
      const contrastValue = 1 + (contrast / 100) * 0.5; // 0.5 ~ 1.5 범위
      filter.contrast(contrastValue, true);
    }

    return filter;
  }, [brightness, contrast]);

  // brightness나 contrast가 0이 아닐 때만 필터 적용
  const shouldApplyFilter = brightness !== 0 || contrast !== 0;

  if (!shouldApplyFilter) {
    return <>{children}</>;
  }

  return (
    <pixiContainer filters={[colorMatrixFilter]}>{children}</pixiContainer>
  );
};
