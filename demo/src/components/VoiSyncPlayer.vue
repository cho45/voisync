<template>
  <div class="voisync-player">
    <canvas 
      ref="canvasRef" 
      :width="canvasWidth" 
      :height="canvasHeight"
      class="player-canvas"
    />
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { createAudioQuery, synthesize } from '@/api/voicevox';
import { LipSyncGenerator, LayersRenderer, AnimationController } from '@voisync/index';
import type { LayersData, MouthLayerMapping } from '@voisync/types';
import { audioBufferToWav, arrayBufferToUint8Array } from '@/utils/audio';
import { exportVideo, downloadVideo } from '@/utils/ffmpeg';

interface Props {
  text: string;
  speakerId: number;
  speedScale: number;
  layersData: LayersData | null;
  imageCache: Map<string, HTMLImageElement | ImageBitmap> | null;
  baseLayers: string[];
  mouthMapping: MouthLayerMapping;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  playing: [];
  stopped: [];
  error: [error: string];
  loading: [isLoading: boolean];
  exportProgress: [progress: number, message: string];
}>();

const canvasRef = ref<HTMLCanvasElement>();
const error = ref<string>('');
const isPlaying = ref(false);

// キャンバスサイズをlayersDataから取得
const canvasWidth = computed(() => props.layersData?.document.width || 1082);
const canvasHeight = computed(() => props.layersData?.document.height || 1650);

let animationController: AnimationController | null = null;
let audioContext: AudioContext | null = null;


const play = async () => {
  if (!props.text || !props.layersData || !props.imageCache) {
    error.value = 'テキストまたはリソースが準備できていません';
    return;
  }

  if (isPlaying.value) {
    stop();
  }

  try {
    error.value = '';
    emit('loading', true);

    // AudioContextの初期化（ユーザー操作時のみ可能）
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // VOICEVOX APIでクエリ作成
    const audioQuery = await createAudioQuery(props.text, props.speakerId);
    
    // speedScaleを設定
    audioQuery.speedScale = props.speedScale;

    // 音声合成
    const audioData = await synthesize(audioQuery, props.speakerId);
    
    emit('loading', false);
    isPlaying.value = true;
    emit('playing');

    // 音声データをデコード
    const audioBuffer = await audioContext.decodeAudioData(audioData);

    // リップシンクフレーム生成
    const lipSyncGenerator = new LipSyncGenerator();
    const frames = lipSyncGenerator.generateFrames(audioQuery);

    // レンダラー作成
    const renderer = new LayersRenderer(
      props.layersData,
      props.imageCache,
      props.mouthMapping
    );

    // アニメーションコントローラー作成
    animationController = new AnimationController(frames, renderer);

    // キャンバスに描画開始
    if (canvasRef.value) {
      animationController.play(canvasRef.value, props.baseLayers, {
        audioContext,
        audioBuffer,
        onEnd: () => {
          isPlaying.value = false;
          emit('stopped');
        }
      });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '再生中にエラーが発生しました';
    emit('loading', false);
    emit('error', error.value);
    isPlaying.value = false;
  }
};

const stop = () => {
  if (animationController) {
    animationController.stop();
    animationController = null;
  }
  isPlaying.value = false;
  emit('stopped');
};

// 初期描画
const drawInitialFrame = async () => {
  console.log('drawInitialFrame called', {
    hasCanvas: !!canvasRef.value,
    hasLayersData: !!props.layersData,
    hasImageCache: !!props.imageCache,
    imageCacheSize: props.imageCache?.size
  });
  
  if (!canvasRef.value || !props.layersData || !props.imageCache) {
    return;
  }

  try {
    // レンダラー作成
    const renderer = new LayersRenderer(
      props.layersData,
      props.imageCache,
      props.mouthMapping
    );

    console.log('Rendering with baseLayers:', props.baseLayers);

    // 初期状態（口を閉じた状態）で描画
    const result = await renderer.renderWithMouthShapes(canvasRef.value, props.baseLayers, [{
      shape: 'closed',
      alpha: 1.0
    }]);

    console.log('Initial render result:', result);

    if (!result.success && result.errors.length > 0) {
      console.error('Initial render errors:', result.errors);
    }
  } catch (err) {
    console.error('Failed to draw initial frame:', err);
  }
};

// コンポーネントがマウントされたら初期描画
onMounted(() => {
  drawInitialFrame();
});

// プロップスの変更を監視
watch([() => props.layersData, () => props.imageCache, () => props.baseLayers], () => {
  if (props.layersData && props.imageCache && !isPlaying.value) {
    drawInitialFrame();
  }
}, { deep: true });

// コンポーネントのクリーンアップ
onUnmounted(() => {
  stop();
  if (audioContext) {
    audioContext.close();
  }
});

// 動画エクスポート
const exportVideoFile = async () => {
  if (!props.text || !props.layersData || !props.imageCache) {
    error.value = 'テキストまたはリソースが準備できていません';
    emit('error', error.value);
    return;
  }

  try {
    error.value = '';
    emit('exportProgress', 0, 'エクスポート準備中...');

    // VOICEVOX APIでクエリ作成
    emit('exportProgress', 0.05, '音声合成クエリを作成中...');
    const audioQuery = await createAudioQuery(props.text, props.speakerId);
    
    // speedScaleを設定
    audioQuery.speedScale = props.speedScale;

    // 音声合成
    emit('exportProgress', 0.1, '音声を合成中...');
    const audioData = await synthesize(audioQuery, props.speakerId);

    // AudioContextを使用して音声データをデコード
    const tempAudioContext = new AudioContext();
    const audioBuffer = await tempAudioContext.decodeAudioData(audioData.slice(0));
    tempAudioContext.close();

    // 音声データをWAVに変換
    emit('exportProgress', 0.15, '音声データを処理中...');
    const wavBuffer = audioBufferToWav(audioBuffer);
    const wavData = arrayBufferToUint8Array(wavBuffer);

    // リップシンクフレーム生成
    emit('exportProgress', 0.2, 'リップシンクデータを生成中...');
    const lipSyncGenerator = new LipSyncGenerator();
    const frames = lipSyncGenerator.generateFrames(audioQuery);

    // フレームを生成
    emit('exportProgress', 0.25, 'フレームを生成中...');
    
    const renderer = new LayersRenderer(
      props.layersData,
      props.imageCache,
      props.mouthMapping
    );
    
    const controller = new AnimationController(frames, renderer);
    
    // キャンバスのサイズを取得してクロップ領域を計算
    const canvasSize = renderer.getCanvasSize();
    const cropHeight = Math.floor(canvasSize.height * 0.5); // 上半分をクロップ
    
    const exportedFrames = await controller.exportFrames(props.baseLayers, {
      fps: 60,
      format: 'png',
      width: 720,
      height: 720,
      cropX: 0,
      cropY: 0,
      cropWidth: canvasSize.width,
      cropHeight: cropHeight,
      onProgress: (current, total) => {
        const frameProgress = 0.25 + (0.45 * current / total);
        emit('exportProgress', frameProgress, `フレーム生成中 (${current}/${total})...`);
      }
    });

    // Blobの配列を作成
    const frameBlobs = exportedFrames.map(frame => frame.blob);

    // FFmpegで動画生成
    emit('exportProgress', 0.7, 'MP4を生成中...');
    const videoBlob = await exportVideo({
      frames: frameBlobs,
      audioData: wavData,
      fps: 60,
      onProgress: (progress) => {
        const ffmpegProgress = 0.7 + (0.3 * progress);
        emit('exportProgress', ffmpegProgress, 'MP4を生成中...');
      }
    });

    // ダウンロード
    emit('exportProgress', 1.0, '完了！');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadVideo(videoBlob, `voisync-${timestamp}.mp4`);

  } catch (err) {
    error.value = err instanceof Error ? err.message : '動画エクスポート中にエラーが発生しました';
    emit('error', error.value);
  }
};

// 公開メソッド
defineExpose({
  play,
  stop,
  isPlaying,
  exportVideo: exportVideoFile
});
</script>

<style scoped>
.voisync-player {
  position: relative;
  display: inline-block;
}

.player-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.error-message {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
}
</style>
