import {
  Application,
  Graphics,
  Container,
  Sprite,
  Texture,
  Assets,
} from 'pixi.js';
import type {
  CanvasRectangle as Rectangle,
  CanvasPolygon as Polygon,
} from '@entities/canvas';
import { normalizeRect } from '@shared/lib/rect';
import { colorToHex } from '@shared/lib/color';

const drawRectangles = (graphics: Graphics, rectangles: Rectangle[]) => {
  rectangles.forEach((rect) => {
    const normalized = normalizeRect(rect);
    const hexColor = colorToHex(rect.color);
    graphics.setStrokeStyle({ color: hexColor, width: 2 });
    graphics.rect(
      normalized.x,
      normalized.y,
      normalized.width,
      normalized.height
    );
    graphics.stroke();
  });
};

const drawPolygons = (graphics: Graphics, polygons: Polygon[]) => {
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
    graphics.setStrokeStyle({ color: hexColor, width: 2 });
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

export const downloadLabels = async (
  rectangles: Rectangle[],
  polygons: Polygon[],
  filename: string = 'labels'
) => {
  try {
    if (rectangles.length === 0 && polygons.length === 0) {
      alert('다운로드할 라벨이 없습니다.');
      return;
    }
    const bounds = ((): {
      x: number;
      y: number;
      width: number;
      height: number;
    } => {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      rectangles.forEach((rect) => {
        const n = normalizeRect(rect);
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width);
        maxY = Math.max(maxY, n.y + n.height);
      });
      polygons.forEach((polygon) => {
        polygon.points.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      });
      if (minX === Infinity) return { x: 0, y: 0, width: 1, height: 1 };
      const padding = 20;
      return {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      };
    })();
    const app = new Application();
    await app.init({
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height),
      backgroundColor: 0xffffff,
      antialias: true,
    });
    const container = new Container();
    container.x = -bounds.x;
    container.y = -bounds.y;
    app.stage.addChild(container);
    const graphics = new Graphics();
    container.addChild(graphics);
    drawRectangles(graphics, rectangles);
    drawPolygons(graphics, polygons);
    app.renderer.render(app.stage);
    const canvas = app.canvas as HTMLCanvasElement;
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    app.destroy(true);
  } catch (error) {
    console.error('라벨 다운로드 중 오류 발생:', error);
    alert('라벨 다운로드 중 오류가 발생했습니다.');
  }
};

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
    const app = new Application();
    await app.init({
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: 0x000000,
      antialias: true,
    });
    const backgroundSprite = new Sprite(backgroundTexture);
    backgroundSprite.anchor.set(0.5);
    backgroundSprite.x = canvasSize.width / 2;
    backgroundSprite.y = canvasSize.height / 2;
    const mainContainer = new Container();
    mainContainer.x = position.x;
    mainContainer.y = position.y;
    mainContainer.scale.set(scale);
    mainContainer.addChild(backgroundSprite);
    const graphics = new Graphics();
    mainContainer.addChild(graphics);
    drawRectangles(graphics, rectangles);
    drawPolygons(graphics, polygons);
    app.stage.addChild(mainContainer);
    app.renderer.render(app.stage);
    const canvas = app.canvas as HTMLCanvasElement;
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    app.destroy(true);
  } catch (error) {
    console.error('이미지+라벨 다운로드 중 오류 발생:', error);
    alert('이미지+라벨 다운로드 중 오류가 발생했습니다.');
  }
};

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
    const response = await fetch('/api/save-labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API 오류: ${response.status} - ${errorData.error || 'Unknown error'}`
      );
    }
    const result = await response.json();
    return { success: true, data: result } as const;
  } catch (error) {
    console.error('API 전송 중 오류 발생:', error);
  }
};

export const sendAbsoluteCoordinatesData = async (
  convertedData: ReturnType<
    typeof import('@entities/canvas').canvasActions.convertToAbsoluteCoordinates
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
    const response = await fetch('/api/save-labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API 오류: ${response.status} - ${errorData.error || 'Unknown error'}`
      );
    }
    const result = await response.json();
    return { success: true, data: result } as const;
  } catch (error) {
    console.error('절대 좌표 API 전송 중 오류 발생:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    } as const;
  }
};

export const downloadAbsoluteCoordinatesJson = (
  convertedData: ReturnType<
    typeof import('@entities/canvas').canvasActions.convertToAbsoluteCoordinates
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
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('절대 좌표 JSON 다운로드 중 오류 발생:', error);
    alert('절대 좌표 JSON 다운로드 중 오류가 발생했습니다.');
  }
};

// 이미지와 라벨을 합쳐서 고정 해상도(기본 400x400) PNG로 다운로드
export const downloadImageAndLabelsFixedSize = async (
  rectangles: Rectangle[],
  polygons: Polygon[],
  imageUrl: string,
  currentImageSize: { width: number; height: number },
  outputSize: number = 400,
  filename: string = 'labels_with_image'
) => {
  try {
    if (!currentImageSize.width || !currentImageSize.height) {
      alert('이미지 크기 정보를 불러오지 못했습니다.');
      return;
    }
    const app = new Application();
    await app.init({
      width: outputSize,
      height: outputSize,
      backgroundColor: 0x000000,
      antialias: true,
    });
    const texture = await Assets.load(imageUrl);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.x = outputSize / 2;
    sprite.y = outputSize / 2;
    const fitScale = Math.min(
      outputSize / texture.width,
      outputSize / texture.height
    );
    sprite.scale.set(fitScale);
    app.stage.addChild(sprite);
    const labelContainer = new Container();
    labelContainer.x = outputSize / 2;
    labelContainer.y = outputSize / 2;
    const renderedImageWidth = texture.width * fitScale;
    const renderedImageHeight = texture.height * fitScale;
    const scaleX = renderedImageWidth / currentImageSize.width;
    const scaleY = renderedImageHeight / currentImageSize.height;
    labelContainer.scale.set(scaleX, scaleY);
    const graphics = new Graphics();
    labelContainer.addChild(graphics);
    drawRectangles(graphics, rectangles);
    drawPolygons(graphics, polygons);
    app.stage.addChild(labelContainer);
    app.renderer.render(app.stage);
    const canvas = app.canvas as HTMLCanvasElement;
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    app.destroy(true);
  } catch (error) {
    console.error('이미지+라벨(고정 해상도) 다운로드 중 오류 발생:', error);
    alert('이미지+라벨 다운로드 중 오류가 발생했습니다.');
  }
};
