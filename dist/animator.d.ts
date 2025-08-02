import type { LipSyncFrame } from './types';
import type { LayersRenderer } from './layer';
export interface AnimationOptions {
    fps?: number;
    transitionDuration?: number;
    audioContext?: AudioContext;
    audioBuffer?: AudioBuffer;
    onFrame?: (frameIndex: number, time: number) => void;
    onEnd?: () => void;
}
export interface ExportedFrame {
    time: number;
    duration: number;
    blob: Blob;
}
export interface ExportOptions {
    fps?: number;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    onProgress?: (current: number, total: number) => void;
}
export declare class AnimationController {
    private frames;
    private renderer;
    private animationId;
    private audioContext;
    private audioSource;
    private audioStartTime;
    private animationStartTime;
    private isPlaying;
    private currentFrameIndex;
    private currentTransition;
    private lastMouthShape;
    constructor(frames: LipSyncFrame[], renderer: LayersRenderer);
    /**
     * ease-in-out関数（3次関数）
     * @param t 0から1の値
     * @returns イージング後の値（0から1）
     */
    private easeInOut;
    /**
     * アニメーションを再生
     */
    play(canvas: HTMLCanvasElement, baseLayers: string[], options?: AnimationOptions): void;
    /**
     * アニメーションループ
     */
    private animate;
    /**
     * アニメーションを停止
     */
    stop(): void;
    /**
     * 全フレームを画像として出力
     */
    exportFrames(baseLayers: string[], options?: ExportOptions): Promise<ExportedFrame[]>;
    /**
     * リソースの解放
     */
    dispose(): void;
    /**
     * 指定時刻のフレームインデックスを取得
     */
    private findFrameIndexAtTime;
    /**
     * アニメーションの総時間を取得
     */
    private getTotalDuration;
}
//# sourceMappingURL=animator.d.ts.map