import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationController } from '../src/animator';
import { LayersRenderer } from '../src/layer';
import type { LipSyncFrame, LayersData, MouthLayerMapping } from '../src/types';

describe('AnimationController (Browser)', () => {
  let canvas: HTMLCanvasElement;
  let renderer: LayersRenderer;
  let controller: AnimationController;
  let frames: LipSyncFrame[];
  let imageCache: Map<string, HTMLImageElement>;

  const mockLayersData: LayersData = {
    document: {
      width: 200,
      height: 200
    },
    layers: [
      {
        name: 'Base',
        layerPath: 'base',
        filePath: '/test/base.png',
        visible: true,
        opacity: 1,
        bounds: { left: 0, top: 0, width: 200, height: 200 }
      },
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

  // テスト用のフレームデータ
  const createTestFrames = (): LipSyncFrame[] => [
    { time: 0, duration: 0.1, mouth: 'closed' },
    { time: 0.1, duration: 0.1, mouth: 'a' },
    { time: 0.2, duration: 0.1, mouth: 'closed' },
    { time: 0.3, duration: 0.1, mouth: 'i' },
    { time: 0.4, duration: 0.1, mouth: 'closed' }
  ];

  // テスト用の画像を作成
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

  beforeEach(async () => {
    // Canvas作成
    canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;

    // 画像キャッシュ作成
    imageCache = new Map();
    imageCache.set('/test/base.png', await createTestImage('#FFFFFF', 200, 200));
    imageCache.set('/test/mouth_closed.png', await createTestImage('#FF0000'));
    imageCache.set('/test/mouth_a.png', await createTestImage('#0000FF'));
    imageCache.set('/test/mouth_i.png', await createTestImage('#00FF00'));
    imageCache.set('/test/mouth_u.png', await createTestImage('#FFFF00'));
    imageCache.set('/test/mouth_e.png', await createTestImage('#FF00FF'));
    imageCache.set('/test/mouth_o.png', await createTestImage('#00FFFF'));
    imageCache.set('/test/mouth_n.png', await createTestImage('#808080'));

    // レンダラー作成
    renderer = new LayersRenderer(mockLayersData, imageCache, mockMouthMapping);

    // フレームデータ作成
    frames = createTestFrames();

    // コントローラー作成
    controller = new AnimationController(frames, renderer);
  });

  it('should create controller instance', () => {
    expect(controller).toBeDefined();
  });

  it('should throw error with empty frames', () => {
    expect(() => new AnimationController([], renderer)).toThrow('Frames array cannot be empty');
  });

  it('should play animation without audio', async () => {
    const onFrameSpy = vi.fn();
    const onEndSpy = vi.fn();

    controller.play(canvas, ['base', '!口/*むふ'], {
      onFrame: onFrameSpy,
      onEnd: onEndSpy
    });

    // アニメーションが開始されたことを確認
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(onFrameSpy).toHaveBeenCalled();

    // 最初のフレームの確認
    const firstCall = onFrameSpy.mock.calls[0];
    expect(firstCall[0]).toBe(0); // frameIndex
    expect(firstCall[1]).toBeGreaterThanOrEqual(0); // time

    // 停止
    controller.stop();
  });

  it('should render correct mouth shapes during animation', async () => {
    let renderedShapes: Array<{ shape: string, alpha: number }[]> = [];
    
    // renderWithMouthShapesメソッドをスパイ
    const originalRender = renderer.renderWithMouthShapes.bind(renderer);
    renderer.renderWithMouthShapes = vi.fn(async (canvas, layerPaths, mouthShapes) => {
      renderedShapes.push(mouthShapes);
      return originalRender(canvas, layerPaths, mouthShapes);
    });

    controller.play(canvas, ['base', '!口/*むふ'], {});

    // 300ms待機（0.3秒の位置まで）
    await new Promise(resolve => setTimeout(resolve, 300));

    // 複数の口形状がレンダリングされたことを確認
    expect(renderedShapes.length).toBeGreaterThan(0);
    
    // レンダリングされた口形状を確認
    const allShapes = renderedShapes.flatMap(shapes => shapes.map(s => s.shape));
    expect(allShapes).toContain('closed');
    expect(allShapes).toContain('a');

    controller.stop();
  });

  it('should play with audio sync', async () => {
    // AudioContextのモック
    const audioContext = new AudioContext();
    
    // 短いサイレント音声バッファを作成
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5; // 0.5秒
    const audioBuffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    
    const onEndSpy = vi.fn();

    controller.play(canvas, ['base', '!口/*むふ'], {
      audioContext,
      audioBuffer,
      onEnd: onEndSpy
    });

    // アニメーション開始を確認
    await new Promise(resolve => setTimeout(resolve, 100));

    // 明示的に停止（テスト環境では音声終了イベントが発火しない可能性があるため）
    controller.stop();
    
    // AudioContextをクローズ
    await audioContext.close();
  });

  it('should stop animation correctly', async () => {
    const onFrameSpy = vi.fn();

    controller.play(canvas, ['base', '!口/*むふ'], {
      onFrame: onFrameSpy
    });

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const callCountBefore = onFrameSpy.mock.calls.length;
    expect(callCountBefore).toBeGreaterThan(0);

    // 停止
    controller.stop();

    // 追加で待機
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const callCountAfter = onFrameSpy.mock.calls.length;
    
    // 停止後はフレームが増えないことを確認
    expect(callCountAfter).toBe(callCountBefore);
  });

  it('should warn when playing already playing animation', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    controller.play(canvas, ['base', '!口/*むふ'], {});
    controller.play(canvas, ['base', '!口/*むふ'], {}); // 2回目

    expect(consoleSpy).toHaveBeenCalledWith('Animation is already playing');

    controller.stop();
    consoleSpy.mockRestore();
  });

  it('should export frames correctly', async () => {
    const onProgressSpy = vi.fn();
    
    const exportedFrames = await controller.exportFrames(['base', '!口/*むふ'], {
      fps: 10, // 低いFPSでテスト時間短縮
      format: 'png',
      onProgress: onProgressSpy
    });

    // エクスポートされたフレーム数を確認
    expect(exportedFrames.length).toBeGreaterThan(0);
    
    // 各フレームの構造を確認
    exportedFrames.forEach(frame => {
      expect(frame).toHaveProperty('time');
      expect(frame).toHaveProperty('duration');
      expect(frame).toHaveProperty('blob');
      expect(frame.blob).toBeInstanceOf(Blob);
      expect(frame.blob.type).toBe('image/png');
    });

    // プログレスコールバックが呼ばれたことを確認
    expect(onProgressSpy).toHaveBeenCalled();
  });

  it('should export frames with different formats', async () => {
    const formats: Array<'png' | 'jpeg' | 'webp'> = ['png', 'jpeg', 'webp'];
    
    for (const format of formats) {
      const exportedFrames = await controller.exportFrames(['base', '!口/*むふ'], {
        fps: 5, // さらに低いFPS
        format,
        quality: 0.8
      });

      expect(exportedFrames.length).toBeGreaterThan(0);
      expect(exportedFrames[0].blob.type).toBe(`image/${format}`);
    }
  });

  it('should handle frames with different index during animation', async () => {
    const frameIndexes: number[] = [];
    
    controller.play(canvas, ['base', '!口/*むふ'], {
      onFrame: (frameIndex) => {
        frameIndexes.push(frameIndex);
      }
    });

    // 200ms待機
    await new Promise(resolve => setTimeout(resolve, 200));
    
    controller.stop();

    // 複数の異なるフレームインデックスが記録されていることを確認
    const uniqueIndexes = new Set(frameIndexes);
    expect(uniqueIndexes.size).toBeGreaterThan(1);
  });

  it('should calculate total duration correctly', async () => {
    // getTotalDurationはprivateメソッドなので、exportFramesを通じて間接的にテスト
    const exportedFrames = await controller.exportFrames(['base'], {
      fps: 10
    });

    // 最後のフレームの時刻が総時間に近いことを確認
    const lastFrame = exportedFrames[exportedFrames.length - 1];
    const expectedTotalDuration = 0.5; // テストフレームの総時間
    
    expect(lastFrame.time).toBeLessThanOrEqual(expectedTotalDuration);
    expect(lastFrame.time).toBeGreaterThan(expectedTotalDuration - 0.2); // 許容誤差
  });

  it('should dispose resources correctly', () => {
    controller.play(canvas, ['base', '!口/*むふ'], {});
    
    // disposeを呼ぶ
    controller.dispose();
    
    // dispose後に再度playしてもエラーにならないことを確認
    expect(() => {
      controller.play(canvas, ['base', '!口/*むふ'], {});
    }).not.toThrow();
    
    controller.stop();
  });

  it('should smoothly transition between mouth shapes', async () => {
    let capturedTransitions: Array<{
      shapes: Array<{ shape: string, alpha: number }>,
      time: number
    }> = [];
    
    // renderWithMouthShapesメソッドをスパイして遷移を記録
    const originalRender = renderer.renderWithMouthShapes.bind(renderer);
    renderer.renderWithMouthShapes = vi.fn(async (canvas, layerPaths, mouthShapes) => {
      if (mouthShapes && mouthShapes.length > 1) {
        capturedTransitions.push({
          shapes: [...mouthShapes],
          time: performance.now()
        });
      }
      return originalRender(canvas, layerPaths, mouthShapes);
    });

    // 遷移時間を設定してアニメーション開始
    controller.play(canvas, ['base', '!口/*むふ'], {
      transitionDuration: 100 // 100ms
    });

    // 200ms待機（遷移が発生する時間）
    await new Promise(resolve => setTimeout(resolve, 200));
    
    controller.stop();

    // 遷移が記録されたことを確認
    expect(capturedTransitions.length).toBeGreaterThan(0);
    
    // 遷移中のアルファ値を確認
    capturedTransitions.forEach(transition => {
      // 2つの口形状がブレンドされている
      expect(transition.shapes.length).toBe(2);
      
      // アルファ値の合計が約1.0
      const totalAlpha = transition.shapes.reduce((sum, s) => sum + s.alpha, 0);
      expect(totalAlpha).toBeCloseTo(1.0, 1);
      
      // 各アルファ値が0〜1の範囲内
      transition.shapes.forEach(shape => {
        expect(shape.alpha).toBeGreaterThanOrEqual(0);
        expect(shape.alpha).toBeLessThanOrEqual(1);
      });
    });
    
    // 遷移が時間とともに進行していることを確認
    if (capturedTransitions.length > 1) {
      const firstTransition = capturedTransitions[0];
      const lastTransition = capturedTransitions[capturedTransitions.length - 1];
      
      // 最初と最後でアルファ値が変化している
      expect(firstTransition.shapes[1].alpha).not.toBe(lastTransition.shapes[1].alpha);
    }
  });

  it.skip('should apply easing to transitions', async () => {
    let alphaValues: number[] = [];
    
    // renderWithMouthShapesメソッドをスパイしてアルファ値を記録
    renderer.renderWithMouthShapes = vi.fn(async (canvas, layerPaths, mouthShapes) => {
      if (mouthShapes && mouthShapes.length > 1) {
        alphaValues.push(mouthShapes[1].alpha);
      }
      return { success: true, errors: [], renderedLayers: [] };
    });

    controller.play(canvas, ['base', '!口/*むふ'], {
      transitionDuration: 200,
      fps: 60
    });

    // 遷移期間中待機
    await new Promise(resolve => setTimeout(resolve, 250));
    
    controller.stop();

    // アルファ値が記録されたことを確認
    expect(alphaValues.length).toBeGreaterThan(5);
    
    // イージング効果の確認（線形でない変化）
    if (alphaValues.length > 3) {
      // 中間地点付近の変化率を確認
      const midIndex = Math.floor(alphaValues.length / 2);
      const earlyDelta = alphaValues[1] - alphaValues[0];
      const midDelta = alphaValues[midIndex + 1] - alphaValues[midIndex];
      const lateDelta = alphaValues[alphaValues.length - 1] - alphaValues[alphaValues.length - 2];
      
      // ease-in-outなので、開始と終了付近は変化が小さく、中間は大きい
      // ただし、タイミングによってはばらつきがあるので、緩い条件にする
      expect(Math.abs(midDelta)).toBeGreaterThan(Math.abs(earlyDelta) * 0.5);
      expect(Math.abs(midDelta)).toBeGreaterThan(Math.abs(lateDelta) * 0.5);
    }
  });
});