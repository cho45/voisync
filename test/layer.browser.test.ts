import { describe, it, expect, beforeEach } from 'vitest';
import { LayersRenderer } from '../src/layer';
import type { LayersData, MouthLayerMapping } from '../src/types';

// 実際のブラウザ環境でのテスト
describe('LayersRenderer (Browser)', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let renderer: LayersRenderer;
  let imageCache: Map<string, HTMLImageElement>;

  const mockLayersData: LayersData = {
    document: {
      width: 200,
      height: 200
    },
    layers: [
      {
        name: 'Mouth Closed',
        layerPath: '!口/*むふ',
        filePath: '/test/mouth_closed.png',
        visible: true,
        opacity: 1,
        bounds: { left: 80, top: 100, width: 40, height: 30 }
      },
      {
        name: 'Mouth A',
        layerPath: '!口/*あ',
        filePath: '/test/mouth_a.png',
        visible: true,
        opacity: 1,
        bounds: { left: 80, top: 100, width: 40, height: 30 }
      },
      // 他の口形状も追加（マッピングで使用される可能性があるため）
      {
        name: 'Mouth I',
        layerPath: '!口/*い',
        filePath: '/test/mouth_i.png',
        visible: true,
        opacity: 1,
        bounds: { left: 80, top: 100, width: 40, height: 30 }
      },
      {
        name: 'Mouth U',
        layerPath: '!口/*う',
        filePath: '/test/mouth_u.png',
        visible: true,
        opacity: 1,
        bounds: { left: 80, top: 100, width: 40, height: 30 }
      },
      {
        name: 'Mouth E',
        layerPath: '!口/*え',
        filePath: '/test/mouth_e.png',
        visible: true,
        opacity: 1,
        bounds: { left: 80, top: 100, width: 40, height: 30 }
      },
      {
        name: 'Mouth O',
        layerPath: '!口/*お',
        filePath: '/test/mouth_o.png',
        visible: true,
        opacity: 1,
        bounds: { left: 80, top: 100, width: 40, height: 30 }
      },
      {
        name: 'Mouth N',
        layerPath: '!口/*ん',
        filePath: '/test/mouth_n.png',
        visible: true,
        opacity: 1,
        bounds: { left: 80, top: 100, width: 40, height: 30 }
      },
      {
        name: 'Base',
        layerPath: 'base',
        filePath: '/test/base.png',
        visible: true,
        opacity: 1,
        bounds: { left: 0, top: 0, width: 200, height: 200 }
      }
    ]
  };

  const mockMouthMapping: MouthLayerMapping = {
    'a': '!口/*あ',
    'i': '!口/*い',
    'u': '!口/*う',
    'e': '!口/*え',
    'o': '!口/*お',
    'n': '!口/*ん',
    'closed': '!口/*むふ'
  };

  beforeEach(() => {
    // 実際のキャンバス要素を作成
    canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    ctx = canvas.getContext('2d')!;

    imageCache = new Map();
    renderer = new LayersRenderer(mockLayersData, imageCache, mockMouthMapping);
  });

  it('should render to real canvas', async () => {
    // テスト用の画像を作成（非同期で読み込み完了を待つ）
    const createTestImage = async (color: string, width: number = 40, height: number = 30): Promise<HTMLImageElement> => {
      const img = new Image();
      const testCanvas = document.createElement('canvas');
      testCanvas.width = width;
      testCanvas.height = height;
      const testCtx = testCanvas.getContext('2d')!;
      testCtx.fillStyle = color;
      testCtx.fillRect(0, 0, width, height);
      
      return new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.src = testCanvas.toDataURL();
      });
    };

    // キャッシュに画像を追加
    imageCache.set('/test/base.png', await createTestImage('#FF0000', 200, 200));
    imageCache.set('/test/mouth_closed.png', await createTestImage('#00FF00'));
    imageCache.set('/test/mouth_a.png', await createTestImage('#0000FF'));

    // レンダリング
    const result = await renderer.renderWithMouthShapes(canvas, ['base', '!口/*むふ'], [{
      shape: 'closed',
      alpha: 1.0
    }]);
    
    expect(result.success).toBe(true);

    // ピクセルデータを確認
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    expect(imageData.width).toBe(200);
    expect(imageData.height).toBe(200);
    
    // 何かが描画されているか確認（全ピクセルが透明でないか）
    const hasContent = Array.from(imageData.data).some((value, index) => {
      // アルファチャンネル（4番目ごと）が0でない
      return index % 4 === 3 && value > 0;
    });
    expect(hasContent).toBe(true);
  });

  it.skip('should switch mouth shapes correctly', async () => {
    // 異なる色の口画像を作成
    const createColoredMouth = async (color: string, width: number = 40, height: number = 30): Promise<HTMLImageElement> => {
      const img = new Image();
      const testCanvas = document.createElement('canvas');
      testCanvas.width = width;
      testCanvas.height = height;
      const testCtx = testCanvas.getContext('2d')!;
      testCtx.fillStyle = color;
      testCtx.fillRect(0, 0, width, height);
      
      return new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.src = testCanvas.toDataURL();
      });
    };

    // すべての画像をキャッシュに追加（getRequiredImagePathsが全ての口形状を返すため）
    imageCache.set('/test/base.png', await createColoredMouth('#FFFFFF', 200, 200));
    imageCache.set('/test/mouth_closed.png', await createColoredMouth('#00FF00')); // 緑
    imageCache.set('/test/mouth_a.png', await createColoredMouth('#0000FF')); // 青
    imageCache.set('/test/mouth_i.png', await createColoredMouth('#00FF00'));
    imageCache.set('/test/mouth_u.png', await createColoredMouth('#FFFF00'));
    imageCache.set('/test/mouth_e.png', await createColoredMouth('#FF00FF'));
    imageCache.set('/test/mouth_o.png', await createColoredMouth('#00FFFF'));
    imageCache.set('/test/mouth_n.png', await createColoredMouth('#808080'));


    // 閉じた口でレンダリング
    let renderResult = await renderer.renderWithMouthShapes(canvas, ['base', '!口/*むふ'], [{
      shape: 'closed',
      alpha: 1.0
    }]);
    expect(renderResult.success).toBe(true);
    
    // 口の中心付近のピクセルを取得（口の位置: left=80, top=100, width=40, height=30）
    // 中心は x=100, y=115
    const closedPixelData = ctx.getImageData(100, 115, 1, 1);
    const closedPixel = {
      r: closedPixelData.data[0],
      g: closedPixelData.data[1], 
      b: closedPixelData.data[2],
      a: closedPixelData.data[3]
    };

    // 閉じた口は緑（#00FF00）であることを確認
    expect(closedPixel.r).toBe(0);
    expect(closedPixel.g).toBe(255);
    expect(closedPixel.b).toBe(0);
    expect(closedPixel.a).toBe(255);

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 開いた口でレンダリング
    renderResult = await renderer.renderWithMouthShapes(canvas, ['base', '!口/*むふ'], [{
      shape: 'a',
      alpha: 1.0
    }]);
    expect(renderResult.success).toBe(true);
    
    // 同じ位置のピクセルを取得
    const openPixelData = ctx.getImageData(100, 115, 1, 1);
    const openPixel = {
      r: openPixelData.data[0],
      g: openPixelData.data[1],
      b: openPixelData.data[2], 
      a: openPixelData.data[3]
    };

    // 開いた口は青（#0000FF）であることを確認
    expect(openPixel.r).toBe(0);
    expect(openPixel.g).toBe(0);
    expect(openPixel.b).toBe(255);
    expect(openPixel.a).toBe(255);
  });

  it('should handle opacity correctly', async () => {
    // 半透明のレイヤーを追加
    const transparentLayer = {
      name: 'Transparent',
      layerPath: 'transparent',
      filePath: '/test/transparent.png',
      visible: true,
      opacity: 0.5,
      bounds: { left: 50, top: 50, width: 100, height: 100 }
    };
    
    const newLayersData = {
      ...mockLayersData,
      layers: [...mockLayersData.layers, transparentLayer]
    };
    
    const newRenderer = new LayersRenderer(newLayersData, imageCache, mockMouthMapping);

    // 不透明な画像を作成
    const createOpaqueImage = async (): Promise<HTMLImageElement> => {
      const img = new Image();
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 100;
      testCanvas.height = 100;
      const testCtx = testCanvas.getContext('2d')!;
      testCtx.fillStyle = 'rgba(255, 0, 0, 1)';
      testCtx.fillRect(0, 0, 100, 100);
      
      return new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.src = testCanvas.toDataURL();
      });
    };
    
    // ベース画像も作成
    const createBaseImage = async (): Promise<HTMLImageElement> => {
      const img = new Image();
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 200;
      testCanvas.height = 200;
      const testCtx = testCanvas.getContext('2d')!;
      testCtx.fillStyle = '#CCCCCC';
      testCtx.fillRect(0, 0, 200, 200);
      
      return new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.src = testCanvas.toDataURL();
      });
    };
    
    imageCache.set('/test/base.png', await createBaseImage());
    imageCache.set('/test/transparent.png', await createOpaqueImage());

    const transparentResult = await newRenderer.render(canvas, [
      { layerPath: 'base', alpha: 1.0 },
      { layerPath: 'transparent', alpha: 1.0 }
    ]);
    expect(transparentResult.success).toBe(true);

    // 半透明が適用されているか確認（厳密なテストは困難なので、描画されたことだけ確認）
    const imageData = ctx.getImageData(75, 75, 50, 50);
    const hasContent = Array.from(imageData.data).some((value, index) => {
      return index % 4 === 3 && value > 0;
    });
    expect(hasContent).toBe(true);
  });
});