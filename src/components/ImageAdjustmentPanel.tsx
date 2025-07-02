'use client';

import { useState } from 'react';
import { canvasStore, canvasActions } from '../store/canvasStore';
import { observer } from '@legendapp/state/react';

export const ImageAdjustmentPanel = observer(() => {
  const [isVisible, setIsVisible] = useState(false);
  const brightness = canvasStore.brightness.get();
  const contrast = canvasStore.contrast.get();

  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        left: 10,
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white',
        minWidth: '250px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
          width: '100%',
          marginBottom: isVisible ? '10px' : '0',
        }}
      >
        {isVisible ? '이미지 조정 숨기기' : '이미지 조정 패널'}
      </button>

      {isVisible && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* 밝기 조절 */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
              }}
            >
              밝기: {brightness}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={brightness}
              onChange={(e) =>
                canvasActions.setBrightness(Number(e.target.value))
              }
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#ddd',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* 대비 조절 */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
              }}
            >
              대비: {contrast}
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={contrast}
              onChange={(e) =>
                canvasActions.setContrast(Number(e.target.value))
              }
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#ddd',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* 리셋 버튼 */}
          <button
            onClick={() => canvasActions.resetImageAdjustments()}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
});
