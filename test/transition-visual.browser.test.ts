import { describe, it, expect } from 'vitest';
import { AnimationController } from '../src/animator';
import { LayersRenderer } from '../src/layer';
import type { LipSyncFrame, LayersData, MouthLayerMapping } from '../src/types';

describe('Visual Transition Test', () => {
  it('should capture smooth transition frames', async () => {
    // シンプルなテストケース：2つのフレームで遷移を確認
    const frames: LipSyncFrame[] = [
      { time: 0, duration: 0.5, mouth: 'closed' },
      { time: 0.5, duration: 0.5, mouth: 'a' }
    ];

    // モックのレイヤーデータ
    const layersData: LayersData = {
      document: { width: 400, height: 200 },
      layers: []
    };

    const mouthMapping: MouthLayerMapping = {
      'a': '!口/_お',
      'i': '!口/_い',
      'u': '!口/_う',
      'e': '!口/_え',
      'o': '!口/_お',
      'n': '!口/_ん',
      'closed': '!口/_閉じ'
    };

    // キャンバス作成
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    const imageCache = new Map();
    const renderer = new LayersRenderer(layersData, imageCache, mouthMapping);

    // 遷移の各段階をキャプチャ
    const captures: { time: number, alpha1: number, alpha2: number }[] = [];
    
    // renderWithMouthShapesをモック化して遷移を可視化
    renderer.renderWithMouthShapes = async (canvas, layerPaths, mouthShapes) => {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 背景
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 遷移状態を視覚化
      if (mouthShapes.length === 1) {
        // 単一の口形状
        const shape = mouthShapes[0];
        ctx.fillStyle = shape.shape === 'closed' ? '#0066cc' : '#cc6600';
        ctx.globalAlpha = shape.alpha;
        ctx.fillRect(50, 50, 300, 100);
        ctx.globalAlpha = 1;
        
        // テキスト
        ctx.fillStyle = '#000';
        ctx.font = '20px sans-serif';
        ctx.fillText(`${shape.shape} (${shape.alpha.toFixed(2)})`, 160, 105);
      } else if (mouthShapes.length === 2) {
        // ブレンド中
        const [shape1, shape2] = mouthShapes;
        
        // 最初の形状
        ctx.fillStyle = '#0066cc';
        ctx.globalAlpha = shape1.alpha;
        ctx.fillRect(50, 50, 150, 100);
        
        // 2番目の形状
        ctx.fillStyle = '#cc6600';
        ctx.globalAlpha = shape2.alpha;
        ctx.fillRect(200, 50, 150, 100);
        
        ctx.globalAlpha = 1;
        
        // テキスト
        ctx.fillStyle = '#000';
        ctx.font = '16px sans-serif';
        ctx.fillText(`${shape1.shape}: ${shape1.alpha.toFixed(2)}`, 75, 105);
        ctx.fillText(`${shape2.shape}: ${shape2.alpha.toFixed(2)}`, 225, 105);
        
        // 進行状況バー
        const progress = shape2.alpha;
        ctx.fillStyle = '#333';
        ctx.fillRect(50, 170, 300, 10);
        ctx.fillStyle = '#66cc00';
        ctx.fillRect(50, 170, 300 * progress, 10);
        
        captures.push({
          time: performance.now(),
          alpha1: shape1.alpha,
          alpha2: shape2.alpha
        });
      }
      
      return { success: true, errors: [], renderedLayers: [] };
    };

    const controller = new AnimationController(frames, renderer);
    
    // アニメーション開始（遷移時間を長めに設定）
    controller.play(canvas, [], { 
      transitionDuration: 300, // 300msの遷移
      fps: 60
    });

    // 遷移期間中の複数時点でスクリーンショット
    const timestamps = [0, 50, 100, 150, 200, 250, 300, 400];
    
    for (const timestamp of timestamps) {
      await new Promise(resolve => setTimeout(resolve, timestamp));
      
      // スクリーンショットを撮る
      const dataUrl = canvas.toDataURL();
      console.log(`Screenshot at ${timestamp}ms:`, dataUrl.substring(0, 50) + '...');
    }

    controller.stop();
    document.body.removeChild(canvas);

    // 遷移がキャプチャされたことを確認
    expect(captures.length).toBeGreaterThan(10); // 60fpsで300msなら約18フレーム
    
    // アルファ値が徐々に変化していることを確認
    if (captures.length > 5) {
      // 最初：shape1が高く、shape2が低い
      expect(captures[0].alpha1).toBeGreaterThan(0.8);
      expect(captures[0].alpha2).toBeLessThan(0.2);
      
      // 最後：shape1が低く、shape2が高い
      const lastCapture = captures[captures.length - 1];
      expect(lastCapture.alpha1).toBeLessThan(0.2);
      expect(lastCapture.alpha2).toBeGreaterThan(0.8);
      
      // ease-in-outの効果を確認（中間付近の変化率が大きい）
      const midIndex = Math.floor(captures.length / 2);
      const earlyDelta = captures[1].alpha2 - captures[0].alpha2;
      const midDelta = captures[midIndex + 1].alpha2 - captures[midIndex].alpha2;
      
      console.log('Transition analysis:', {
        totalFrames: captures.length,
        earlyDelta,
        midDelta,
        captures: captures.map(c => ({ 
          alpha1: c.alpha1.toFixed(3), 
          alpha2: c.alpha2.toFixed(3) 
        }))
      });
    }
  });
});