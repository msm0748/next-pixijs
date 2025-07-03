import { Application, Graphics, Container, Sprite, Texture } from 'pixi.js';
import { Rectangle, Polygon } from '../store/canvasStore';
import { normalizeRect } from './rectUtils';

// 색상을 16진수로 변환하는 함수
const colorToHex = (color?: string) => {
  if (!color) return 0x000000;
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  return 0x000000;
};

// 사각형들을 그리는 함수
const drawRectangles = (graphics: Graphics, rectangles: Rectangle[]) => {
  rectangles.forEach((rect) => {
    const normalized = normalizeRect(rect);
    const hexColor = colorToHex(rect.color);

    // 테두리 그리기
    graphics.setStrokeStyle({
      color: hexColor,
      width: 2,
    });
    graphics.rect(
      normalized.x,
      normalized.y,
      normalized.width,
      normalized.height
    );
    graphics.stroke();
  });
};

// 폴리곤들을 그리는 함수
const drawPolygons = (graphics: Graphics, polygons: Polygon[]) => {
  polygons.forEach((polygon) => {
    if (polygon.points.length < 2) return;

    const hexColor = colorToHex(polygon.color);

    // 폴리곤이 완성된 경우
    if (polygon.isComplete && polygon.points.length >= 3) {
      // 채우기
      graphics.setFillStyle({
        color: hexColor,
        alpha: 0.1,
      });
      graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (let i = 1; i < polygon.points.length; i++) {
        graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      graphics.closePath();
      graphics.fill();
    }

    // 테두리 그리기
    graphics.setStrokeStyle({
      color: hexColor,
      width: 2,
    });
    graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
    for (let i = 1; i < polygon.points.length; i++) {
      graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
    }
    if (polygon.isComplete) {
      graphics.closePath();
    }
    graphics.stroke();
  });
};

// 모든 요소들의 바운딩 박스를 계산하는 함수
const calculateBounds = (rectangles: Rectangle[], polygons: Polygon[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // 사각형들의 바운딩 박스
  rectangles.forEach((rect) => {
    const normalized = normalizeRect(rect);
    minX = Math.min(minX, normalized.x);
    minY = Math.min(minY, normalized.y);
    maxX = Math.max(maxX, normalized.x + normalized.width);
    maxY = Math.max(maxY, normalized.y + normalized.height);
  });

  // 폴리곤들의 바운딩 박스
  polygons.forEach((polygon) => {
    polygon.points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  // 요소가 없으면 기본값 반환
  if (minX === Infinity) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  // 여백 추가 (20픽셀)
  const padding = 20;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
};

// 라벨 이미지를 다운로드하는 함수
export const downloadLabels = async (
  rectangles: Rectangle[],
  polygons: Polygon[],
  filename: string = 'labels'
) => {
  try {
    // 요소가 없으면 다운로드하지 않음
    if (rectangles.length === 0 && polygons.length === 0) {
      alert('다운로드할 라벨이 없습니다.');
      return;
    }

    // 바운딩 박스 계산
    const bounds = calculateBounds(rectangles, polygons);

    // 임시 PIXI 애플리케이션 생성
    const app = new Application();
    await app.init({
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height),
      backgroundColor: 0xffffff, // 흰색 배경
      antialias: true,
    });

    // 컨테이너 생성
    const container = new Container();
    container.x = -bounds.x;
    container.y = -bounds.y;
    app.stage.addChild(container);

    // 그래픽스 객체 생성
    const graphics = new Graphics();
    container.addChild(graphics);

    // 사각형과 폴리곤 그리기
    drawRectangles(graphics, rectangles);
    drawPolygons(graphics, polygons);

    // 렌더링하고 이미지로 변환
    app.renderer.render(app.stage);
    const canvas = app.canvas as HTMLCanvasElement;

    // 이미지 다운로드
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // 정리
    app.destroy(true);
  } catch (error) {
    console.error('라벨 다운로드 중 오류 발생:', error);
    alert('라벨 다운로드 중 오류가 발생했습니다.');
  }
};

// 이미지와 라벨을 함께 다운로드하는 함수
export const downloadImageWithLabels = async (
  rectangles: Rectangle[],
  polygons: Polygon[],
  backgroundTexture: Texture,
  canvasSize: { width: number; height: number },
  position: { x: number; y: number },
  scale: number,
  filename: string = 'image_with_labels'
) => {
  try {
    // 임시 PIXI 애플리케이션 생성
    const app = new Application();
    await app.init({
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: 0x000000,
      antialias: true,
    });

    // 배경 이미지 스프라이트 생성
    const backgroundSprite = new Sprite(backgroundTexture);
    backgroundSprite.anchor.set(0.5);
    backgroundSprite.x = canvasSize.width / 2;
    backgroundSprite.y = canvasSize.height / 2;

    // 메인 컨테이너 생성 (변환 적용)
    const mainContainer = new Container();
    mainContainer.x = position.x;
    mainContainer.y = position.y;
    mainContainer.scale.set(scale);

    // 배경 이미지를 변환된 컨테이너에 추가
    mainContainer.addChild(backgroundSprite);

    // 라벨을 그릴 그래픽스 객체 생성
    const graphics = new Graphics();
    mainContainer.addChild(graphics);

    // 사각형과 폴리곤 그리기
    drawRectangles(graphics, rectangles);
    drawPolygons(graphics, polygons);

    // 메인 컨테이너를 앱에 추가
    app.stage.addChild(mainContainer);

    // 렌더링하고 이미지로 변환
    app.renderer.render(app.stage);
    const canvas = app.canvas as HTMLCanvasElement;

    // 이미지 다운로드
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // 정리
    app.destroy(true);
  } catch (error) {
    console.error('이미지+라벨 다운로드 중 오류 발생:', error);
    alert('이미지+라벨 다운로드 중 오류가 발생했습니다.');
  }
};

// API 전송을 위한 함수
export const sendApiData = async (
  rectangles: Rectangle[],
  polygons: Polygon[],
  sessionId?: string
) => {
  try {
    const apiData = {
      rectangles: rectangles.map((rect) => ({
        id: rect.id,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        label: rect.label,
        color: rect.color,
      })),
      polygons: polygons.map((polygon) => ({
        id: polygon.id,
        points: polygon.points,
        isComplete: polygon.isComplete,
        label: polygon.label,
        color: polygon.color,
      })),
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    console.log('API로 전송할 데이터:', apiData);

    // 실제 API 엔드포인트로 데이터 전송
    const response = await fetch('/api/save-labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API 오류: ${response.status} - ${errorData.error || 'Unknown error'}`
      );
    }

    const result = await response.json();
    console.log('API 응답:', result);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('API 전송 중 오류 발생:', error);
  }
};

// 절대 좌표로 변환하여 서버에 전송하는 함수
export const sendAbsoluteCoordinatesData = async (
  convertedData: ReturnType<
    typeof import('../store/canvasStore').canvasActions.convertToAbsoluteCoordinates
  >,
  sessionId?: string
) => {
  try {
    const apiData = {
      rectangles: convertedData.rectangles,
      polygons: convertedData.polygons,
      originalImageSize: convertedData.originalImageSize,
      metadata: convertedData.metadata,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    console.log('절대 좌표 API로 전송할 데이터:', apiData);

    // 실제 API 엔드포인트로 데이터 전송
    const response = await fetch('/api/save-labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API 오류: ${response.status} - ${errorData.error || 'Unknown error'}`
      );
    }

    const result = await response.json();
    console.log('절대 좌표 API 응답:', result);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('절대 좌표 API 전송 중 오류 발생:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
};

// JSON 파일로 절대 좌표 데이터 다운로드하는 함수
export const downloadAbsoluteCoordinatesJson = (
  convertedData: ReturnType<
    typeof import('../store/canvasStore').canvasActions.convertToAbsoluteCoordinates
  >,
  filename: string = 'absolute_coordinates'
) => {
  try {
    const jsonData = {
      ...convertedData,
      exportedAt: new Date().toISOString(),
      format: 'absolute_coordinates',
      description: '이미지 원본 크기 기준 절대 좌표계 라벨 데이터',
    };

    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${filename}.json`;
    link.click();

    // 메모리 정리
    URL.revokeObjectURL(link.href);

    console.log('절대 좌표 JSON 파일 다운로드 완료:', filename);
  } catch (error) {
    console.error('절대 좌표 JSON 다운로드 중 오류 발생:', error);
    alert('절대 좌표 JSON 다운로드 중 오류가 발생했습니다.');
  }
};
