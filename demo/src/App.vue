<template>
  <div class="app">
    <header class="header">
      <h1>VoiSync Demo</h1>
      <p>VOICEVOX リップシンクアニメーション</p>
    </header>

    <main class="main">
      <div class="controls">
        <div class="form-group">
          <label for="text-input">喋らせたいテキスト</label>
          <textarea
            id="text-input"
            v-model="text"
            placeholder="こんにちは、ずんだもんなのだ"
            rows="3"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="character-select">キャラクター</label>
          <select
            id="character-select"
            v-model="selectedCharacterId"
            :disabled="isLoading"
          >
            <option v-for="char in characterList" :key="char.id" :value="char.id">
              {{ char.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="speaker-select">スピーカー</label>
          <select
            id="speaker-select"
            v-model="selectedSpeakerId"
            :disabled="isLoading || speakers.length === 0"
          >
            <option v-if="speakers.length === 0" disabled>
              スピーカーを読み込み中...
            </option>
            <template v-for="speaker in speakers" :key="speaker.speaker_uuid">
              <optgroup :label="speaker.name">
                <option
                  v-for="style in speaker.styles"
                  :key="style.id"
                  :value="style.id"
                >
                  {{ speaker.name }} ({{ style.name }})
                </option>
              </optgroup>
            </template>
          </select>
        </div>

        <div class="form-group">
          <label for="speed-scale">話速: {{ speedScale }}</label>
          <input
            id="speed-scale"
            type="range"
            v-model.number="speedScale"
            min="0.5"
            max="2.0"
            step="0.1"
            :disabled="isLoading"
            class="speed-scale-slider"
          />
          <div class="speed-scale-labels">
            <span style="position: absolute; left: 0;">0.5</span>
            <span style="position: absolute; left: 33.33%;">1.0</span>
            <span style="position: absolute; right: 0;">2.0</span>
          </div>
        </div>

        <div class="button-group">
          <button
            @click="handlePlay"
            :disabled="!canPlay || isLoading || isGenerating || isExporting"
            class="play-button"
          >
            {{ isGenerating ? '生成中...' : (playerRef?.isPlaying ? '停止' : '再生') }}
          </button>
          <button
            @click="handleExport"
            :disabled="!canPlay || isLoading || isGenerating || isExporting || playerRef?.isPlaying"
            class="export-button"
          >
            {{ isExporting ? 'エクスポート中...' : '動画をエクスポート' }}
          </button>
          <div v-if="isGenerating" class="loading-bar">
            <div class="loading-bar-progress"></div>
          </div>
          <div v-if="isExporting" class="export-progress">
            <div class="export-progress-bar">
              <div 
                class="export-progress-fill" 
                :style="{ width: `${exportProgress * 100}%` }"
              ></div>
            </div>
            <div class="export-progress-text">{{ exportMessage }}</div>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="advanced-section">
          <button
            @click="showAdvanced = !showAdvanced"
            class="advanced-toggle"
          >
            {{ showAdvanced ? '▼' : '▶' }} Advanced設定
          </button>
          
          <div v-if="showAdvanced" class="advanced-content">
            <div class="form-group">
              <label for="base-layers">基本レイヤー（1行1レイヤー）</label>
              <textarea
                id="base-layers"
                v-model="baseLayersText"
                rows="10"
                class="mono-textarea"
              />
            </div>

            <div class="form-group">
              <label>口形状マッピング</label>
              <div class="mouth-mapping">
                <div v-for="shape in ['a', 'i', 'u', 'e', 'o', 'n', 'closed'] as const" :key="shape" class="mapping-row">
                  <label :for="`mouth-${shape}`" class="mapping-label">{{ shape }}:</label>
                  <input
                    :id="`mouth-${shape}`"
                    v-model="editableMouthMapping[shape]"
                    type="text"
                    class="mapping-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="player-container">
        <div v-if="isInitializing" class="loading">
          リソースを読み込み中...
        </div>
        <VoiSyncPlayer
          v-else
          ref="playerRef"
          :text="text"
          :speaker-id="selectedSpeakerId"
          :speed-scale="speedScale"
          :layers-data="layersData"
          :image-cache="imageCache"
          :base-layers="showAdvanced ? editableBaseLayers : baseLayers"
          :mouth-mapping="showAdvanced ? editableMouthMapping : mouthMapping"
          @playing="handlePlaying"
          @stopped="handleStopped"
          @error="handleError"
          @loading="handleLoading"
          @export-progress="handleExportProgress"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import VoiSyncPlayer from '@/components/VoiSyncPlayer.vue';
import { getSpeakers, type Speaker } from '@/api/voicevox';
import { loadImages } from '@voisync/index';
import type { LayersData, MouthLayerMapping, CharacterConfig } from '@voisync/types';
import { characters, defaultCharacterId, getCharacterList, getCharacterConfig } from '@/characters';

// UI状態
const text = ref('こんにちは、ずんだもんなのだ');
const selectedSpeakerId = ref(1);
const speedScale = ref(1.0);
const speakers = ref<Speaker[]>([]);
const isLoading = ref(false);
const isInitializing = ref(true);
const errorMessage = ref('');
const isGenerating = ref(false);
const showAdvanced = ref(false);
const isExporting = ref(false);
const exportProgress = ref(0);
const exportMessage = ref('');

// キャラクター選択
const selectedCharacterId = ref(defaultCharacterId);
const characterList = getCharacterList();
const selectedCharacter = computed(() => getCharacterConfig(selectedCharacterId.value));

// プレイヤー参照
const playerRef = ref<InstanceType<typeof VoiSyncPlayer>>();

// リソース
const layersData = ref<LayersData | null>(null);
const imageCache = ref<Map<string, HTMLImageElement | ImageBitmap> | null>(null);

// 選択されたキャラクターの設定を使用
const baseLayers = computed(() => selectedCharacter.value?.baseLayers || []);
const mouthMapping = computed(() => selectedCharacter.value?.mouthMapping || {} as MouthLayerMapping);

// Advanced設定用（編集可能なコピー）
const editableBaseLayers = ref<string[]>([]);
const editableMouthMapping = ref<MouthLayerMapping>({} as MouthLayerMapping);

// キャラクター変更時に編集用設定を更新
watch(selectedCharacter, (char) => {
  if (char) {
    editableBaseLayers.value = [...char.baseLayers];
    editableMouthMapping.value = { ...char.mouthMapping };
  }
}, { immediate: true });

// テキストエディタ用の値
const baseLayersText = computed({
  get: () => editableBaseLayers.value.join('\n'),
  set: (value: string) => {
    editableBaseLayers.value = value.split('\n').filter(line => line.trim());
    // 編集時にエラーメッセージをクリア
    errorMessage.value = '';
  }
});

const canPlay = computed(() => {
  return !isInitializing.value && 
         !isLoading.value && 
         text.value.trim() !== '' && 
         speakers.value.length > 0;
});

// スピーカー一覧を取得
const loadSpeakers = async () => {
  try {
    speakers.value = await getSpeakers();
    // デフォルトスピーカーを設定（ずんだもん）
    const zundamon = speakers.value.find(s => s.name.includes('ずんだもん'));
    if (zundamon && zundamon.styles.length > 0) {
      selectedSpeakerId.value = zundamon.styles[0].id;
    }
  } catch (err) {
    errorMessage.value = `スピーカー一覧の取得に失敗しました。
    1. VOICEVOXが起動していることを確認してください。
    2. http://localhost:50021/setting にアクセスし、"その他" タブの "CORS許可オリジン" に現在のページのオリジン（${window.location.origin}）を追加してください。`;
    console.error('Failed to load speakers:', err);
  }
};

// 必要なレイヤー名を収集する関数
const getRequiredLayers = () => {
  const requiredLayers = new Set<string>();
  
  // 必要なレイヤー名を収集
  const currentBaseLayers = showAdvanced.value ? editableBaseLayers.value : baseLayers.value;
  const currentMouthMapping = showAdvanced.value ? editableMouthMapping.value : mouthMapping.value;
  
  currentBaseLayers.forEach(layer => {
    requiredLayers.add(layer);
  });
  
  // mouthMappingから収集
  Object.values(currentMouthMapping).forEach(layer => {
    requiredLayers.add(layer);
  });
  
  return requiredLayers;
};

// 追加で必要な画像を読み込む関数
const loadAdditionalImages = async () => {
  if (!layersData.value || !imageCache.value) return;
  
  const character = selectedCharacter.value;
  if (!character) return;
  
  const requiredLayers = getRequiredLayers();
  const baseUrl = character.layersPath.replace(/layers\.json$/, '');
  const newImagePaths: string[] = [];
  const filePathToLayerPath = new Map<string, string>();
  
  // 既に読み込まれていない画像のみを抽出
  layersData.value.layers.forEach(layer => {
    if (requiredLayers.has(layer.layerPath) && !imageCache.value!.has(layer.filePath)) {
      const fullPath = baseUrl + layer.filePath;
      newImagePaths.push(fullPath);
      filePathToLayerPath.set(fullPath, layer.filePath);
    }
  });
  
  if (newImagePaths.length === 0) return;
  
  console.log(`Loading ${newImagePaths.length} additional images`);
  
  try {
    // 新しい画像を読み込み
    const loadedImages = await loadImages(newImagePaths);
    console.log('Loaded additional images:', loadedImages.size, 'files');
    
    // キャッシュに追加
    loadedImages.forEach((image, fullPath) => {
      const filePath = filePathToLayerPath.get(fullPath);
      if (filePath && imageCache.value) {
        imageCache.value.set(filePath, image);
      }
    });
    
    console.log('Image cache size:', imageCache.value.size);
  } catch (err) {
    errorMessage.value = '追加画像の読み込みに失敗しました';
    console.error('Failed to load additional images:', err);
  }
};

// レイヤーデータとイメージを読み込み
const loadResources = async () => {
  try {
    const character = selectedCharacter.value;
    if (!character) {
      throw new Error('キャラクターが選択されていません');
    }
    
    // layers.jsonを読み込み
    const response = await fetch(character.layersPath);
    if (!response.ok) {
      throw new Error(`Failed to load layers.json: ${response.statusText}`);
    }
    layersData.value = await response.json();

    // 必要なレイヤー名を収集
    const requiredLayers = getRequiredLayers();
    
    // 必要なレイヤーの画像パスのみを抽出
    const baseUrl = character.layersPath.replace(/layers\.json$/, '');
    const imagePaths: string[] = [];
    const filePathToLayerPath = new Map<string, string>();
    
    layersData.value!.layers.forEach(layer => {
      if (requiredLayers.has(layer.layerPath)) {
        const fullPath = baseUrl + layer.filePath;
        imagePaths.push(fullPath);
        filePathToLayerPath.set(fullPath, layer.filePath);
      }
    });
    
    console.log(`Loading ${imagePaths.length} images (out of ${layersData.value!.layers.length} total layers)`);

    // 必要な画像のみを読み込み
    const loadedImages = await loadImages(imagePaths);
    console.log('Loaded images:', loadedImages.size, 'files');
    
    // layer.filePathをキーとして再マッピング
    imageCache.value = new Map();
    loadedImages.forEach((image, fullPath) => {
      const filePath = filePathToLayerPath.get(fullPath);
      if (filePath && imageCache.value) {
        imageCache.value.set(filePath, image);
      }
    });
    
    console.log('Image cache size:', imageCache.value.size);
    console.log('Required layers:', requiredLayers.size, 'layers');
  } catch (err) {
    errorMessage.value = 'リソースの読み込みに失敗しました';
    console.error('Failed to load resources:', err);
  }
};

// 再生/停止ハンドラー
const handlePlay = () => {
  if (playerRef.value?.isPlaying) {
    playerRef.value.stop();
  } else {
    playerRef.value?.play();
  }
};

// イベントハンドラー
const handlePlaying = () => {
  errorMessage.value = '';
};

const handleStopped = () => {
  // 停止時の処理
};

const handleError = (error: string) => {
  errorMessage.value = error;
};

const handleLoading = (loading: boolean) => {
  isGenerating.value = loading;
};

// エクスポートハンドラー
const handleExport = async () => {
  if (!playerRef.value) return;
  
  isExporting.value = true;
  errorMessage.value = '';
  
  try {
    await playerRef.value.exportVideo();
  } catch (error) {
    console.error('Export error:', error);
  } finally {
    isExporting.value = false;
    exportProgress.value = 0;
    exportMessage.value = '';
  }
};

// エクスポート進捗ハンドラー
const handleExportProgress = (progress: number, message: string) => {
  exportProgress.value = progress;
  exportMessage.value = message;
};

// baseLayers と mouthMapping の変更を監視
watch([baseLayers, mouthMapping, editableBaseLayers, editableMouthMapping, () => showAdvanced.value], () => {
  if (!isInitializing.value) {
    loadAdditionalImages();
  }
}, { deep: true });

// キャラクター変更時にリソース再読み込み
watch(selectedCharacterId, async () => {
  if (!isInitializing.value) {
    isInitializing.value = true;
    imageCache.value = null;  // キャッシュをクリア
    await loadResources();
    isInitializing.value = false;
  }
});

// 初期化
onMounted(async () => {
  isInitializing.value = true;
  await Promise.all([
    loadSpeakers(),
    loadResources()
  ]);
  isInitializing.value = false;
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  border-bottom: 1px solid #ddd;
  padding: 20px;
  text-align: center;
}

.header h1 {
  margin: 0;
  font-size: 28px;
  color: #333;
}

.header p {
  margin: 5px 0 0;
  color: #666;
}

.main {
  flex: 1;
  display: flex;
  gap: 30px;
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.controls {
  flex: 0 0 400px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
}

.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4CAF50;
}

.form-group textarea:disabled,
.form-group select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.button-group {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.play-button,
.export-button {
  width: 100%;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.play-button {
  background-color: #4CAF50;
}

.play-button:hover:not(:disabled) {
  background-color: #45a049;
}

.export-button {
  background-color: #2196F3;
}

.export-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.play-button:disabled,
.export-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 10px;
  padding: 10px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
  font-size: 14px;
}

.player-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading {
  font-size: 18px;
  color: #666;
}

@media (max-width: 900px) {
  .main {
    flex-direction: column;
  }

  .controls {
    flex: none;
    width: 100%;
  }
}

.loading-bar {
  margin-top: 10px;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.loading-bar-progress {
  height: 100%;
  background-color: #4CAF50;
  animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
  0% {
    width: 0;
    margin-left: 0;
  }
  50% {
    width: 60%;
    margin-left: 0;
  }
  100% {
    width: 60%;
    margin-left: 100%;
  }
}

.export-progress {
  margin-top: 10px;
}

.export-progress-bar {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.export-progress-fill {
  height: 100%;
  background-color: #2196F3;
  transition: width 0.3s ease;
}

.export-progress-text {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.advanced-section {
  margin-top: 30px;
  border-top: 1px solid #e0e0e0;
  padding-top: 20px;
}

.advanced-toggle {
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 5px 0;
  transition: color 0.2s;
}

.advanced-toggle:hover {
  color: #333;
}

.advanced-content {
  margin-top: 20px;
}

.mono-textarea {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.mouth-mapping {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mapping-label {
  width: 60px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.mapping-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.mapping-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.speed-scale-slider {
  width: 100%;
  margin: 10px 0;
}

.speed-scale-labels {
  position: relative;
  height: 20px;
  font-size: 12px;
  color: #666;
  margin-top: -5px;
}
</style>
