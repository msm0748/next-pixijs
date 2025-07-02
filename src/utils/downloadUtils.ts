import { Application, Graphics, Container } from 'pixi.js';
import { Rectangle, Polygon } from '../store/canvasStore';

// 색상을 16진수로 변환하는 함수
const colorToHex = (color?: string) => {
  if (!color) return 0x000000;
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  return 0x000000;
};

// 사각형을 정규화하는 함수
const normalizeRect = (rect: Rectangle) => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);
  return { x, y, width, height };
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
