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

interface Props {
  text: string;
  speakerId: number;
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
    const result = await renderer.render(canvasRef.value, {
      layerPaths: props.baseLayers,
      mouthShape: 'closed'
    });

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

// 公開メソッド
defineExpose({
  play,
  stop,
  isPlaying
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
