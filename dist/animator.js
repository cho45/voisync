export class AnimationController {
    frames;
    renderer;
    animationId = null;
    // 音声同期
    audioContext = null;
    audioSource = null;
    audioStartTime = 0;
    animationStartTime = 0;
    // 再生状態
    isPlaying = false;
    currentFrameIndex = -1;
    constructor(frames, renderer) {
        if (frames.length === 0) {
            throw new Error('Frames array cannot be empty');
        }
        this.frames = frames;
        this.renderer = renderer;
    }
    /**
     * アニメーションを再生
     */
    play(canvas, baseLayers, options) {
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
    animate(canvas, baseLayers, options) {
        const render = () => {
            if (!this.isPlaying) {
                return;
            }
            let currentTime;
            // 音声同期がある場合は音声時間を基準にする
            if (this.audioContext && this.audioSource) {
                currentTime = this.audioContext.currentTime - this.audioStartTime;
            }
            else {
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
            }
            else if (!this.audioContext || !this.audioSource) {
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
    stop() {
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
            }
            catch (e) {
                // 既に停止している場合のエラーを無視
            }
            this.audioSource = null;
        }
    }
    /**
     * 全フレームを画像として出力
     */
    async exportFrames(baseLayers, options) {
        const fps = options?.fps ?? 60;
        const format = options?.format ?? 'png';
        const quality = options?.quality ?? 1.0;
        const totalDuration = this.getTotalDuration();
        const frameInterval = 1 / fps;
        const exportedFrames = [];
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
                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        }
                        else {
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
    dispose() {
        this.stop();
        this.frames = [];
        this.audioContext = null;
    }
    /**
     * 指定時刻のフレームインデックスを取得
     */
    findFrameIndexAtTime(time) {
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
    getTotalDuration() {
        if (this.frames.length === 0) {
            return 0;
        }
        const lastFrame = this.frames[this.frames.length - 1];
        return lastFrame.time + lastFrame.duration;
    }
}
//# sourceMappingURL=animator.js.map