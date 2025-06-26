'use client';

import { Application, extend } from '@pixi/react';
import { Container, Sprite, Assets, Texture } from 'pixi.js';
import { useState, useRef, PointerEvent, useEffect } from 'react';

extend({
  Container,
  Sprite,
});

const App = () => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [texture, setTexture] = useState<Texture | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const positionStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 텍스처 로드
  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await Assets.load('/test.jpg');
        setTexture(loadedTexture);
      } catch (error) {
        console.error('텍스처 로드 실패:', error);
      }
    };
    loadTexture();
  }, []);

  // 휠 이벤트 리스너 등록 (passive: false로 설정)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // 기본 스크롤 동작 방지

      // Cmd(Mac) 또는 Ctrl(Windows/Linux) 키가 눌렸을 때만 확대/축소
      if (e.metaKey || e.ctrlKey) {
        const scaleFactor = 1.1;
        const calculatedScale =
          e.deltaY < 0 ? scale * scaleFactor : scale / scaleFactor;

        // 스케일 범위 제한을 먼저 적용
        const newScale = Math.max(0.1, Math.min(5, calculatedScale));

        // 실제로 변경될 스케일이 현재와 같다면 위치 계산하지 않음
        if (newScale === scale) {
          return;
        }

        // 마우스 위치를 중심으로 확대/축소
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newPosition = {
          x: mouseX - (mouseX - position.x) * (newScale / scale),
          y: mouseY - (mouseY - position.y) * (newScale / scale),
        };

        setScale(newScale);
        setPosition(newPosition);
      } else {
        // 일반 휠: 이미지를 위/아래/좌/우로 이동
        const scrollSpeed = 50; // 스크롤 속도 조절
        const newPosition = {
          x:
            position.x -
            (e.deltaX > 0 ? scrollSpeed : e.deltaX < 0 ? -scrollSpeed : 0), // 좌우 이동
          y:
            position.y -
            (e.deltaY > 0 ? scrollSpeed : e.deltaY < 0 ? -scrollSpeed : 0), // 위아래 이동
        };
        setPosition(newPosition);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [scale, position]);

  const handlePointerDown = (e: PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (isDragging && dragStartRef.current && positionStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: positionStartRef.current.x + dx,
        y: positionStartRef.current.y + dy,
      });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    positionStartRef.current = null;
  };

  if (!texture) {
    return <div>이미지 로딩 중...</div>;
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        width: '100dvw',
        height: '100dvh',
        overflow: 'hidden',
        touchAction: 'none', // 터치 기본 동작 방지
      }}
    >
      <Application
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        backgroundAlpha={0}
      >
        <pixiContainer x={position.x} y={position.y} scale={scale}>
          <pixiSprite
            texture={texture}
            anchor={0.5}
            x={typeof window !== 'undefined' ? window.innerWidth / 2 : 400}
            y={typeof window !== 'undefined' ? window.innerHeight / 2 : 300}
          />
        </pixiContainer>
      </Application>
    </div>
  );
};

export default App;
