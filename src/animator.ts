import type { LipSyncFrame } from './types';
import type { LayersRenderer } from './layer';

export interface AnimationOptions {
  fps?: number;         // デフォルト: 60
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
  onProgress?: (current: number, total: number) => void;
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

  constructor(frames: LipSyncFrame[], renderer: LayersRenderer) {
    if (frames.length === 0) {
      throw new Error('Frames array cannot be empty');
    }
    
    this.frames = frames;
    this.renderer = renderer;
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
      
      // フレームが変わった場合のみレンダリング
      if (frameIndex !== -1 && frameIndex !== this.currentFrameIndex) {
        this.currentFrameIndex = frameIndex;
        const frame = this.frames[frameIndex];
        
        // レンダリング
        this.renderer.render(canvas, {
          layerPaths: baseLayers,
          mouthShape: frame.mouth
        }).then(result => {
          if (!result.success) {
            console.error('Render errors:', result.errors);
          }
        }).catch(error => {
          console.error('Render error:', error);
        });

        if (options?.onFrame) {
          options.onFrame(frameIndex, currentTime);
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
    
    // 一時的なcanvasを作成
    const canvas = document.createElement('canvas');
    const size = this.renderer.getCanvasSize();
    canvas.width = size.width;
    canvas.height = size.height;
    
    let processedCount = 0;
    const totalFrames = Math.ceil(totalDuration * fps);
    
    for (let time = 0; time < totalDuration; time += frameInterval) {
      const frameIndex = this.findFrameIndexAtTime(time);
      
      if (frameIndex !== -1) {
        const frame = this.frames[frameIndex];
        
        // フレームをレンダリング
        const result = await this.renderer.render(canvas, {
          layerPaths: baseLayers,
          mouthShape: frame.mouth
        });
        
        if (!result.success) {
          console.error('Export frame render errors:', result.errors);
          continue;
        }
        
        // Blobに変換
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
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