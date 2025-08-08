import { canvasStore, canvasActions } from '@entities/canvas';
import {
  sendAbsoluteCoordinatesData,
  downloadAbsoluteCoordinatesJson,
  downloadImageAndLabelsFixedSize,
} from '@shared/api/labels';

export default function Tools() {
  const mode = canvasStore.mode.get();
  const scale = canvasStore.scale.get();
  const imageSize = canvasStore.imageSize.get();
  const rectangles = canvasStore.rectangles.get();
  const polygons = canvasStore.polygons.get();
  const selectedRectId = canvasStore.selectedRectId.get();
  const selectedPolygonId = canvasStore.selectedPolygonId.get();
  const showBackgroundOverlay = canvasStore.showBackgroundOverlay.get();
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '5px',
        display: 'flex',
        gap: '10px',
      }}
    >
      <button
        onClick={() => {
          canvasActions.setMode('pan');
          canvasActions.setCrosshairVisible(false);
        }}
        style={{
          background: mode === 'pan' ? '#007bff' : '#333',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        패닝 (P)
      </button>
      <button
        onClick={() => {
          canvasActions.setMode('draw');
          canvasActions.setCrosshairVisible(true);
        }}
        style={{
          background: mode === 'draw' ? '#007bff' : '#333',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        그리기 (D)
      </button>
      <div style={{ color: 'white' }}>
        {(
          ((imageSize.width * scale) /
            canvasStore.originalImageSize.get().width) *
          100
        ).toFixed(1)}
        %
      </div>
      <button
        onClick={() => {
          canvasActions.setMode('polygon');
          canvasActions.setCrosshairVisible(true);
        }}
        style={{
          background: mode === 'polygon' ? '#007bff' : '#333',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        폴리곤 (G)
      </button>
      <button
        onClick={() => {
          canvasActions.setMode('select');
          canvasActions.setCrosshairVisible(false);
        }}
        style={{
          background: mode === 'select' ? '#007bff' : '#333',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        선택 (S)
      </button>
      <button
        onClick={() => {
          const rId = canvasStore.selectedRectId.get();
          const pId = canvasStore.selectedPolygonId.get();
          if (rId) {
            canvasActions.removeRectangle(rId);
          } else if (pId) {
            canvasActions.removePolygon(pId);
          } else {
            canvasActions.clearAll();
          }
        }}
        style={{
          background: '#dc3545',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        {selectedRectId || selectedPolygonId ? '선택 삭제' : '모두 삭제'} (Del)
      </button>
      <button
        onClick={() => {
          const currentDate = new Date();
          const timestamp = currentDate
            .toISOString()
            .replace(/[:.]/g, '-')
            .split('T')[0];
          const currentImageSize = canvasStore.imageSize.get();
          downloadImageAndLabelsFixedSize(
            rectangles,
            polygons,
            '/test.jpg',
            currentImageSize,
            400,
            `labels_${timestamp}`
          );
        }}
        style={{
          background: '#28a745',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        이미지+라벨 다운로드 (400x400)
      </button>
      <button
        onClick={() => {
          canvasActions.setBackgroundOverlay(!showBackgroundOverlay);
        }}
        style={{
          background: showBackgroundOverlay ? '#ffc107' : '#6c757d',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        {showBackgroundOverlay ? '배경 어둡게 끄기' : '배경 어둡게 켜기'}
      </button>
      <button
        onClick={() => {
          canvasActions.setViewportScale(1.0);
          canvasActions.setPosition({ x: 0, y: 0 });
        }}
        style={{
          background: '#17a2b8',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        뷰 초기화
      </button>
      <button
        onClick={() => {
          const convertedData = canvasActions.convertToAbsoluteCoordinates();
          const sessionId = Date.now().toString();
          sendAbsoluteCoordinatesData(convertedData, sessionId)
            .then((result) => {
              if (result?.success) {
                alert('절대 좌표 데이터가 서버에 성공적으로 전송되었습니다.');
              } else {
                alert(`서버 전송 실패: ${result?.error || '알 수 없는 오류'}`);
              }
            })
            .catch((error) => {
              console.error('절대 좌표 전송 오류:', error);
              alert('절대 좌표 전송 중 오류가 발생했습니다.');
            });
        }}
        style={{
          background: '#6f42c1',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        절대좌표 서버전송
      </button>
      <button
        onClick={() => {
          const convertedData = canvasActions.convertToAbsoluteCoordinates();
          const currentDate = new Date();
          const timestamp = currentDate
            .toISOString()
            .replace(/[:.]/g, '-')
            .split('T')[0];
          downloadAbsoluteCoordinatesJson(
            convertedData,
            `absolute_coordinates_${timestamp}`
          );
        }}
        style={{
          background: '#e83e8c',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        절대좌표 JSON 다운로드
      </button>
      <div style={{ color: 'white', alignSelf: 'center' }}>
        사각형: {rectangles.length}개 | 폴리곤: {polygons.length}개
        {selectedRectId && ' | 사각형 선택됨'}
        {selectedPolygonId &&
          ' | 폴리곤 선택됨 (클릭: 점 삭제, 드래그: 점 이동)'}
      </div>
    </div>
  );
}
