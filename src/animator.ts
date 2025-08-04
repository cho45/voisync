import type { LipSyncFrame, MouthShape } from './types';
import type { LayersRenderer } from './layer';

export interface AnimationOptions {
  fps?: number;         // デフォルト: 60
  transitionDuration?: number;  // 口形状遷移時間（ミリ秒）デフォルト: 80
  audioContext?: AudioContext;
  audioBuffer?: AudioBuffer;
  onFrame?: (frameIndex: number, time: number) => void;
  onEnd?: () => void;
}

export interface ExportedFrame {
  time: number;         // フレームの時刻（秒単位）
  duration: number;     // フレームの表示時間（秒単位）
  blob: Blob;          // canvas.toBlobの結果
}

export interface ExportOptions {
  fps?: number;         // デフォルト: 60
  format?: 'png' | 'jpeg' | 'webp';  // デフォルト: 'png'
  quality?: number;     // 0.0 - 1.0 (jpegとwebpのみ)
  width?: number;       // 出力幅（デフォルト: 元のサイズ）
  height?: number;      // 出力高さ（デフォルト: 元のサイズ）
  cropX?: number;       // クロップ開始X座標（デフォルト: 0）
  cropY?: number;       // クロップ開始Y座標（デフォルト: 0）
  cropWidth?: number;   // クロップ幅（デフォルト: 元の幅）
  cropHeight?: number;  // クロップ高さ（デフォルト: 元の高さ）
  onProgress?: (current: number, total: number) => void;
}

interface MouthTransition {
  fromMouth: MouthShape;     // 前の口形状
  toMouth: MouthShape;       // 次の口形状
  startTime: number;         // 遷移開始時刻
  duration: number;          // 遷移時間（秒）
}

export class AnimationController {
  private frames: LipSyncFrame[];
  private renderer: LayersRenderer;
  private animationId: number | null = null;
  
  // 音声同期
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private audioStartTime: number = 0;
  private animationStartTime: number = 0;
  
  // 再生状態
  private isPlaying: boolean = false;
  private currentFrameIndex: number = -1;
  
  // 口形状遷移状態
  private currentTransition: MouthTransition | null = null;
  private lastMouthShape: MouthShape | null = null;

  constructor(frames: LipSyncFrame[], renderer: LayersRenderer) {
    if (frames.length === 0) {
      throw new Error('Frames array cannot be empty');
    }
    
    this.frames = frames;
    this.renderer = renderer;
  }

  /**
   * ease-in-out関数（3次関数）
   * @param t 0から1の値
   * @returns イージング後の値（0から1）
   */
  private easeInOut(t: number): number {
    return t < 0.5 
      ? 2 * t * t 
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * アニメーションを再生
   */
  play(canvas: HTMLCanvasElement, baseLayers: string[], options?: AnimationOptions): void {
    if (this.isPlaying) {
      console.warn('Animation is already playing');
      return;
    }

    this.isPlaying = true;
    this.currentFrameIndex = -1;
    this.currentTransition = null;
    this.lastMouthShape = null;
    
    // 音声を開始
    if (options?.audioContext && options?.audioBuffer) {
      this.audioContext = options.audioContext;
      const audioBuffer = options.audioBuffer;
      
      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = audioBuffer;
      this.audioSource.connect(this.audioContext.destination);
      
      // 終了時のコールバック
      this.audioSource.onended = () => {
        if (this.isPlaying) {
          this.stop();
          options?.onEnd?.();
        }
      };
      
      this.audioStartTime = this.audioContext.currentTime;
      this.audioSource.start(0);
    }
    
    this.animationStartTime = performance.now();
    this.animate(canvas, baseLayers, options);
  }

  /**
   * アニメーションループ
   */
  private animate(canvas: HTMLCanvasElement, baseLayers: string[], options?: AnimationOptions): void {
    const render = () => {
      if (!this.isPlaying) {
        return;
      }

      let currentTime: number;
      
      // 音声同期がある場合は音声時間を基準にする
      if (this.audioContext && this.audioSource) {
        currentTime = this.audioContext.currentTime - this.audioStartTime;
      } else {
        // 音声がない場合はperformance.nowを使用
        currentTime = (performance.now() - this.animationStartTime) / 1000;
      }

      // 現在の時刻に対応するフレームを見つける
      const frameIndex = this.findFrameIndexAtTime(currentTime);
      
      // フレームが変わった場合の処理
      if (frameIndex !== -1 && frameIndex !== this.currentFrameIndex) {
        this.currentFrameIndex = frameIndex;
        const frame = this.frames[frameIndex];
        const transitionDuration = (options?.transitionDuration ?? 80) / 1000; // ミリ秒を秒に変換（デフォルト150ms）
        
        // 口形状が変わった場合、遷移を開始
        if (this.lastMouthShape && this.lastMouthShape !== frame.mouth) {
          this.currentTransition = {
            fromMouth: this.lastMouthShape,
            toMouth: frame.mouth,
            startTime: currentTime,
            duration: Math.min(transitionDuration, frame.duration * 0.5) // フレーム時間の半分を上限とする
          };
        }
        this.lastMouthShape = frame.mouth;

        if (options?.onFrame) {
          options.onFrame(frameIndex, currentTime);
        }
      }

      // レンダリング処理（毎フレーム実行）
      if (this.currentTransition) {
        // 遷移中の場合
        const elapsed = currentTime - this.currentTransition.startTime;
        const progress = Math.min(elapsed / this.currentTransition.duration, 1);
        const easedProgress = this.easeInOut(progress);

        if (progress >= 1) {
          // 遷移完了
          this.renderer.renderWithMouthShapes(canvas, baseLayers, [{
            shape: this.currentTransition.toMouth,
            alpha: 1.0
          }]).catch(error => {
            console.error('Render error:', error);
          });
          this.currentTransition = null;
        } else {
          // 遷移中：2つの口形状をブレンド
          console.log(`Transition: ${this.currentTransition.fromMouth} -> ${this.currentTransition.toMouth}, progress: ${progress.toFixed(2)}, eased: ${easedProgress.toFixed(2)}`);
          this.renderer.renderWithMouthShapes(canvas, baseLayers, [
            {
              shape: this.currentTransition.fromMouth,
              alpha: 1 - easedProgress
            },
            {
              shape: this.currentTransition.toMouth,
              alpha: easedProgress
            }
          ]).catch(error => {
            console.error('Render error:', error);
          });
        }
      } else if (frameIndex !== -1) {
        // 通常のレンダリング（遷移中でない場合）
        const currentFrame = this.frames[frameIndex];
        if (currentFrame) {
          this.renderer.renderWithMouthShapes(canvas, baseLayers, [{
            shape: currentFrame.mouth,
            alpha: 1.0
          }]).catch(error => {
            console.error('Render error:', error);
          });
        }
      }

      // アニメーションの終了チェック
      const totalDuration = this.getTotalDuration();
      if (currentTime < totalDuration) {
        this.animationId = requestAnimationFrame(render);
      } else if (!this.audioContext || !this.audioSource) {
        // 音声がない場合は手動で終了
        this.stop();
        options?.onEnd?.();
      }
    };

    render();
  }

  /**
   * アニメーションを停止
   */
  stop(): void {
    this.isPlaying = false;
    this.currentFrameIndex = -1;
    this.currentTransition = null;
    this.lastMouthShape = null;
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.audioSource) {
      try {
        this.audioSource.stop();
        this.audioSource.disconnect();
      } catch (e) {
        // 既に停止している場合のエラーを無視
      }
      this.audioSource = null;
    }
  }

  /**
   * 全フレームを画像として出力
   */
  async exportFrames(baseLayers: string[], options?: ExportOptions): Promise<ExportedFrame[]> {
    const fps = options?.fps ?? 60;
    const format = options?.format ?? 'png';
    const quality = options?.quality ?? 1.0;
    
    const totalDuration = this.getTotalDuration();
    const frameInterval = 1 / fps;
    const exportedFrames: ExportedFrame[] = [];
    
    // レンダリング用のcanvasを作成
    const renderCanvas = document.createElement('canvas');
    const originalSize = this.renderer.getCanvasSize();
    renderCanvas.width = originalSize.width;
    renderCanvas.height = originalSize.height;
    
    // クロップとリサイズのパラメータを設定
    const cropX = options?.cropX ?? 0;
    const cropY = options?.cropY ?? 0;
    const cropWidth = options?.cropWidth ?? originalSize.width;
    const cropHeight = options?.cropHeight ?? originalSize.height;
    const outputWidth = options?.width ?? cropWidth;
    const outputHeight = options?.height ?? cropHeight;
    
    // エクスポート用のcanvasを作成
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outputWidth;
    exportCanvas.height = outputHeight;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (!exportCtx) {
      throw new Error('Failed to get 2D context for export canvas');
    }
    
    let processedCount = 0;
    const totalFrames = Math.ceil(totalDuration * fps);
    
    for (let time = 0; time < totalDuration; time += frameInterval) {
      const frameIndex = this.findFrameIndexAtTime(time);
      
      if (frameIndex !== -1) {
        const frame = this.frames[frameIndex];
        
        // フレームをレンダリング
        const result = await this.renderer.renderWithMouthShapes(renderCanvas, baseLayers, [{
          shape: frame.mouth,
          alpha: 1.0
        }]);
        
        if (!result.success) {
          console.error('Export frame render errors:', result.errors);
          continue;
        }
        
        // クロップとリサイズを適用（アスペクト比を維持）
        exportCtx.clearRect(0, 0, outputWidth, outputHeight);
        
        // アスペクト比を計算
        const sourceAspect = cropWidth / cropHeight;
        const targetAspect = outputWidth / outputHeight;
        
        let drawWidth = outputWidth;
        let drawHeight = outputHeight;
        let drawX = 0;
        let drawY = 0;
        
        if (sourceAspect > targetAspect) {
          // ソースが横長の場合：幅に合わせる
          drawHeight = outputWidth / sourceAspect;
          drawY = (outputHeight - drawHeight) / 2;
        } else {
          // ソースが縦長の場合：高さに合わせる
          drawWidth = outputHeight * sourceAspect;
          drawX = (outputWidth - drawWidth) / 2;
        }
        
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, outputWidth, outputHeight);
        
        exportCtx.drawImage(
          renderCanvas,
          cropX, cropY, cropWidth, cropHeight,  // ソース領域
          drawX, drawY, drawWidth, drawHeight    // 描画先領域（アスペクト比維持）
        );
        
        // Blobに変換
        const blob = await new Promise<Blob>((resolve, reject) => {
          exportCanvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, `image/${format}`, quality);
        });
        
        exportedFrames.push({
          time,
          duration: frameInterval,
          blob
        });
      }
      
      processedCount++;
      if (options?.onProgress) {
        options.onProgress(processedCount, totalFrames);
      }
    }
    
    return exportedFrames;
  }

  /**
   * リソースの解放
   */
  dispose(): void {
    this.stop();
    this.frames = [];
    this.audioContext = null;
  }

  /**
   * 指定時刻のフレームインデックスを取得
   */
  private findFrameIndexAtTime(time: number): number {
    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];
      if (time >= frame.time && time < frame.time + frame.duration) {
        return i;
      }
    }
    return -1;
  }

  /**
   * アニメーションの総時間を取得
   */
  private getTotalDuration(): number {
    if (this.frames.length === 0) {
      return 0;
    }
    
    const lastFrame = this.frames[this.frames.length - 1];
    return lastFrame.time + lastFrame.duration;
  }
}
