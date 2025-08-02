import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayersRenderer } from '../src/layer';
import type { LayersData, MouthLayerMapping } from '../src/types';

// モックデータ
const mockLayersData: LayersData = {
  document: {
    width: 1920,
    height: 1080
  },
  layers: [
    {
      name: '口_閉じ',
      layerPath: '!口/*むふ',
      filePath: 'assets/mouth_closed.png',
      visible: true,
      opacity: 1,
      bounds: { left: 50, top: 50, width: 30, height: 20 }
    },
    {
      name: '口_あ',
      layerPath: '!口/*あ',
      filePath: 'assets/mouth_a.png',
      visible: true,
      opacity: 1,
      bounds: { left: 50, top: 50, width: 30, height: 20 }
    },
    {
      name: '目',
      layerPath: '!目/*普通目',
      filePath: 'assets/eye.png',
      visible: true,
      opacity: 0.8,
      bounds: { left: 40, top: 30, width: 40, height: 30 }
    },
    {
      name: '枝豆通常',
      layerPath: '!枝豆/*枝豆通常',
      filePath: 'assets/edamame.png',
      visible: true,
      opacity: 1,
      bounds: { left: 0, top: 0, width: 100, height: 100 }
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

describe('LayersRenderer', () => {
  let imageCache: Map<string, HTMLImageElement>;
  let renderer: LayersRenderer;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    // モックの画像キャッシュ
    imageCache = new Map();
    
    // モックのHTMLImageElement
    const createMockImage = (src: string) => {
      const img = { src } as HTMLImageElement;
      return img;
    };
    
    // キャッシュに画像を追加
    imageCache.set('assets/edamame.png', createMockImage('assets/edamame.png'));
    imageCache.set('assets/mouth_closed.png', createMockImage('assets/mouth_closed.png'));
    imageCache.set('assets/mouth_a.png', createMockImage('assets/mouth_a.png'));
    imageCache.set('assets/eye.png', createMockImage('assets/eye.png'));

    renderer = new LayersRenderer(mockLayersData, imageCache, mockMouthMapping);

    // モックのCanvas
    ctx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      globalAlpha: 1
    } as any;

    canvas = {
      width: 1920,
      height: 1080,
      getContext: vi.fn().mockReturnValue(ctx)
    } as any;
  });

  it('should create renderer instance', () => {
    expect(renderer).toBeDefined();
    expect(renderer.getCanvasSize()).toEqual({ width: 1920, height: 1080 });
  });

  it('should render layers with default mouth shape', async () => {
    const result = await renderer.renderWithMouthShapes(canvas, 
      ['!枝豆/*枝豆通常', '!口/*むふ', '!目/*普通目'],
      [{
        shape: 'closed',
        alpha: 1.0
      }]
    );

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    // renderedLayersは実際の描画順序で記録される（背面から前面へ）
    expect(result.renderedLayers).toEqual(['!枝豆/*枝豆通常', '!目/*普通目', '!口/*むふ']);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    expect(ctx.drawImage).toHaveBeenCalledTimes(3);
  });

  it('should render layers in correct order (back to front)', async () => {
    const result = await renderer.renderWithMouthShapes(canvas,
      ['!枝豆/*枝豆通常', '!目/*普通目', '!口/*むふ'],
      [{
        shape: 'closed',
        alpha: 1.0
      }]
    );

    expect(result.success).toBe(true);
    const drawCalls = (ctx.drawImage as any).mock.calls;
    
    // 描画順序の検証（PSD形式: 配列の最後が背面、最初が前面）
    // layers配列: [口_閉じ(0), 口_あ(1), 目(2), 枝豆通常(3)]
    // 描画順序: 枝豆通常 → 目 → 口_閉じ（逆順）
    expect(drawCalls[0][0]).toBe(imageCache.get('assets/edamame.png'));      // index: 3
    expect(drawCalls[1][0]).toBe(imageCache.get('assets/eye.png'));          // index: 2
    expect(drawCalls[2][0]).toBe(imageCache.get('assets/mouth_closed.png')); // index: 0
  });

  it('should replace mouth layer based on mouth shape', async () => {
    const result = await renderer.renderWithMouthShapes(canvas,
      ['!枝豆/*枝豆通常', '!口/*むふ', '!目/*普通目'],
      [{
        shape: 'a',
        alpha: 1.0
      }]
    );

    expect(result.success).toBe(true);
    
    // drawImageの呼び出しを確認
    const drawCalls = (ctx.drawImage as any).mock.calls;
    
    // 口パーツが'a'の画像に置き換わっているか確認
    expect(drawCalls.some((call: any[]) => 
      call[0] === imageCache.get('assets/mouth_a.png')
    )).toBe(true);
    
    // 閉じた口の画像は描画されていないか確認
    expect(drawCalls.some((call: any[]) => 
      call[0] === imageCache.get('assets/mouth_closed.png')
    )).toBe(false);
  });

  it('should apply opacity correctly', async () => {
    const result = await renderer.render(canvas, [
      { layerPath: '!目/*普通目', alpha: 1.0 }
    ]);

    expect(result.success).toBe(true);
    
    // globalAlphaが変更されているか確認
    expect(ctx.globalAlpha).toBe(1); // 最終的に復元される
  });

  it('should return render result with error information', async () => {
    const result = await renderer.render(canvas, [
      { layerPath: '!存在しないレイヤー', alpha: 1.0 },
      { layerPath: '!枝豆/*枝豆通常', alpha: 1.0 }
    ]);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      type: 'LAYER_NOT_FOUND',
      details: 'Layer not found: !存在しないレイヤー',
      layerPath: '!存在しないレイヤー'
    });
    expect(result.renderedLayers).toEqual(['!枝豆/*枝豆通常']);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it('should handle missing images in cache gracefully', async () => {
    // キャッシュから画像を削除
    imageCache.delete('assets/edamame.png');

    const result = await renderer.render(canvas, [
      { layerPath: '!枝豆/*枝豆通常', alpha: 1.0 },
      { layerPath: '!目/*普通目', alpha: 1.0 }
    ]);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      type: 'IMAGE_NOT_CACHED',
      details: 'Image not found in cache: assets/edamame.png',
      layerPath: '!枝豆/*枝豆通常'
    });
    expect(result.renderedLayers).toEqual(['!目/*普通目']);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1); // 目のレイヤーのみ描画
  });

  it('should blend two mouth shapes when multiple mouthShapes are provided', async () => {
    const result = await renderer.renderWithMouthShapes(canvas,
      ['!目/*普通目', '!口/*むふ'],
      [
        {
          shape: 'closed',
          alpha: 0.5
        },
        {
          shape: 'a',
          alpha: 0.5
        }
      ]
    );

    expect(result.success).toBe(true);
    expect(ctx.drawImage).toHaveBeenCalledTimes(3); // 目×1、口(closed)×1、口(a)×1
    
    // アルファ値の確認
    expect(ctx.globalAlpha).toBe(1); // 最終的に復元される
  });

  it('should apply different alpha values for blended mouth shapes', async () => {
    // globalAlpha の呼び出し履歴を確認
    const alphaHistory: number[] = [];
    Object.defineProperty(ctx, 'globalAlpha', {
      get: () => 1,
      set: (value: number) => { alphaHistory.push(value); }
    });
    
    const result = await renderer.renderWithMouthShapes(canvas,
      ['!口/*むふ'],
      [
        {
          shape: 'closed',
          alpha: 0.7
        },
        {
          shape: 'a',
          alpha: 0.3
        }
      ]
    );

    expect(result.success).toBe(true);
    
    // 0.7（元の口）と0.3（ブレンド口）が設定されるはず
    expect(alphaHistory).toContain(0.7);
    expect(alphaHistory).toContain(0.3);
  });

  it('should handle invalid mouth shape', async () => {
    const result = await renderer.renderWithMouthShapes(canvas,
      ['!口/*むふ'],
      [{
        shape: 'invalid' as any,
        alpha: 1.0
      }]
    );

    // 無効な口形状は無視されるが、エラーにはならない
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    // 口レイヤーは描画されない
    expect(result.renderedLayers).not.toContain('!口/*むふ');
  });

  it('should throw error when canvas context is not available', async () => {
    const badCanvas = {
      getContext: vi.fn().mockReturnValue(null)
    } as any;

    await expect(renderer.render(badCanvas, [
      { layerPath: '!枝豆/*枝豆通常', alpha: 1.0 }
    ])).rejects.toThrow('Failed to get 2D context from canvas');
  });

  it('should get required image paths including all mouth shapes', () => {
    const requiredPaths = renderer.getRequiredImagePaths(['!枝豆/*枝豆通常', '!口/*むふ']);
    
    // 基本のレイヤー画像パス
    expect(requiredPaths).toContain('assets/edamame.png');
    expect(requiredPaths).toContain('assets/mouth_closed.png');
    
    // すべての口形状の画像パスが含まれているべき
    expect(requiredPaths).toContain('assets/mouth_a.png');
    
    // 重複がないこと
    const uniquePaths = new Set(requiredPaths);
    expect(uniquePaths.size).toBe(requiredPaths.length);
  });
});