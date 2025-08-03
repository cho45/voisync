# VoiSync

VOICEVOXの音声合成データを使用してリアルタイムでリップシンクアニメーションを生成するTypeScriptライブラリ。

## 📦 インストール

TBD

## 🚀 クイックスタート

```typescript
import { LipSyncGenerator, LayersRenderer, AnimationController, loadImages } from 'voisync';

// 1. VOICEVOXで音声合成データを取得
const voiceVoxData = await fetch('http://localhost:50021/audio_query?text=こんにちは&speaker=1', {
  method: 'POST'
}).then(res => res.json());

// 2. リップシンクフレームを生成
const generator = new LipSyncGenerator();
const frames = generator.generateFrames(voiceVoxData);

// 3. レイヤー画像を読み込み
const layersData = await fetch('./layers.json').then(res => res.json());
const imagePaths = /* layers.jsonから画像パスを抽出 */;
const imageCache = await loadImages(imagePaths);

// 4. レンダラーを初期化
const mouthMapping = {
  'a': '!口/_お',
  'i': '!口/_んへー',
  'u': '!口/_ゆ',
  'e': '!口/_んへー',
  'o': '!口/_お',
  'n': '!口/_んー',
  'closed': '!口/_むー'
};
const renderer = new LayersRenderer(layersData, imageCache, mouthMapping);

// 5. アニメーション再生
const animator = new AnimationController(frames, renderer);
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const baseLayers = ['体', '顔', '目']; // 基本レイヤー

animator.play(canvas, baseLayers, {
  audioBuffer: audioBuffer, // Web Audio APIでデコード済みの音声
  audioContext: audioContext,
  onEnd: () => console.log('Animation finished')
});
```

## 📖 APIリファレンス

### LipSyncGenerator

VOICEVOXの音声合成データから口形状のタイムラインを生成します。

```typescript
const generator = new LipSyncGenerator();
```

#### メソッド

##### `generateFrames(voiceVoxData: VoiceVoxSynthesisData): LipSyncFrame[]`

VOICEVOXの音声合成データからリップシンクフレームを生成します。

**パラメータ:**
- `voiceVoxData`: VOICEVOXのAudioQueryレスポンス

**戻り値:**
- `LipSyncFrame[]`: 時系列の口形状データ

**例:**
```typescript
const frames = generator.generateFrames(audioQuery);
console.log(frames);
// [
//   { time: 0, duration: 0.1, mouth: 'closed' },
//   { time: 0.1, duration: 0.05, mouth: 'a' },
//   { time: 0.15, duration: 0.08, mouth: 'i' },
//   ...
// ]
```

### LayersRenderer

レイヤー画像をCanvas上で合成し、口形状に応じて動的に切り替えます。

```typescript
const renderer = new LayersRenderer(layersData, imageCache, mouthMapping);
```

#### コンストラクタ

**パラメータ:**
- `layersData`: layers.json の内容（PSDから展開されたレイヤー情報）
- `imageCache`: 画像ファイルのキャッシュ（Map<string, HTMLImageElement | ImageBitmap>）
- `mouthMapping`: 口形状とレイヤーパスの対応表

#### メソッド

##### `renderWithMouthShapes(canvas: HTMLCanvasElement, layerPaths: string[], mouthShapes: Array<{shape: MouthShape, alpha: number}>): Promise<RenderResult>`

指定された口形状でレイヤーを描画します。

**例:**
```typescript
// 単一の口形状
await renderer.renderWithMouthShapes(canvas, baseLayers, [
  { shape: 'a', alpha: 1.0 }
]);

// 口形状のブレンド（遷移中）
await renderer.renderWithMouthShapes(canvas, baseLayers, [
  { shape: 'a', alpha: 0.7 },
  { shape: 'i', alpha: 0.3 }
]);
```

### AnimationController

リップシンクアニメーションの再生制御を行います。

```typescript
const animator = new AnimationController(frames, renderer);
```

#### メソッド

##### `play(canvas: HTMLCanvasElement, baseLayers: string[], options?: AnimationOptions): void`

アニメーションを再生します。

**パラメータ:**
- `canvas`: 描画先のキャンバス要素
- `baseLayers`: 基本レイヤーのパス配列
- `options`: アニメーションオプション
  - `fps`: フレームレート（デフォルト: 60）
  - `transitionDuration`: 口形状の遷移時間（ミリ秒、デフォルト: 80）
  - `audioContext`: WebAudio APIのコンテキスト
  - `audioBuffer`: デコード済みの音声データ
  - `onFrame`: フレーム更新時のコールバック
  - `onEnd`: アニメーション終了時のコールバック

##### `stop(): void`

アニメーションを停止します。

##### `exportFrames(baseLayers: string[], options?: ExportOptions): Promise<ExportedFrame[]>`

全フレームを画像として出力します（動画生成用）。

### 型定義の生成

VoiceVox APIの型定義を生成するには以下のコマンドを実行：

```bash
npm run generate:types
```

これにより、`src/types/voicevox.d.ts`にVoiceVox APIの型定義が生成されます。

## 🎨 使用例

### 基本的な使い方

```typescript
import { LipSyncGenerator, LayersRenderer, AnimationController, loadImages } from 'voisync';

// VOICEVOXと連携して音声合成
async function createVoiceSyncAnimation() {
  // 1. テキストから音声合成クエリを作成
  const text = 'こんにちは、ずんだもんなのだ';
  const speakerId = 3; // ずんだもん（ノーマル）
  
  const audioQuery = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, {
    method: 'POST'
  }).then(res => res.json());

  // 2. 音声を合成
  const audioData = await fetch(`http://localhost:50021/synthesis?speaker=${speakerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioQuery)
  }).then(res => res.arrayBuffer());

  // 3. リップシンクフレームを生成
  const generator = new LipSyncGenerator();
  const frames = generator.generateFrames(audioQuery);

  // 4. キャラクター素材を準備
  const layersData = await fetch('./assets/ずんだもん立ち絵素材2.3.psd.expanded/layers.json')
    .then(res => res.json());
  
  // 必要な画像パスを抽出
  const renderer = new LayersRenderer(layersData, new Map(), mouthMapping);
  const imagePaths = renderer.getRequiredImagePaths([
    '体/体',
    '頭/頭',
    '!目/目セット/*通常',
    '!口/_お'
  ]);
  
  // 画像を読み込み
  const imageCache = await loadImages(imagePaths);
  
  // 5. レンダラーを再初期化（画像キャッシュ付き）
  const finalRenderer = new LayersRenderer(layersData, imageCache, mouthMapping);
  
  // 6. アニメーションを再生
  const canvas = document.getElementById('character-canvas') as HTMLCanvasElement;
  const { width, height } = finalRenderer.getCanvasSize();
  canvas.width = width;
  canvas.height = height;
  
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  
  const animator = new AnimationController(frames, finalRenderer);
  animator.play(canvas, [
    '体/体',
    '頭/頭',
    '!目/目セット/*通常'
  ], {
    audioBuffer,
    audioContext,
    transitionDuration: 80,
    onEnd: () => console.log('再生完了')
  });
}

// 口形状マッピングの定義
const mouthMapping = {
  'a': '!口/_お',
  'i': '!口/_んへー',
  'u': '!口/_ゆ',
  'e': '!口/_んへー',
  'o': '!口/_お',
  'n': '!口/_んー',
  'closed': '!口/_むー'
};
```

### 動画エクスポート

```typescript
// フレームごとの画像を出力
const exportedFrames = await animator.exportFrames(baseLayers, {
  fps: 30,
  format: 'png',
  onProgress: (current, total) => {
    const progress = (current / total * 100).toFixed(1);
    console.log(`エクスポート中: ${progress}%`);
  }
});

// 各フレームを保存（Node.js環境）
import { writeFile } from 'fs/promises';

for (let i = 0; i < exportedFrames.length; i++) {
  const frame = exportedFrames[i];
  const buffer = await frame.blob.arrayBuffer();
  await writeFile(`output/frame_${i.toString().padStart(5, '0')}.png`, Buffer.from(buffer));
}

// ffmpegで動画化
// ffmpeg -framerate 30 -i output/frame_%05d.png -c:v libx264 -pix_fmt yuv420p output.mp4
```

## 📁 プロジェクト構成

- `src/types/voicevox.d.ts` - VoiceVox APIの型定義（自動生成）
- `src/lipsync.ts` - リップシンクフレーム生成
- `src/layer.ts` - レイヤー合成とCanvas描画
- `src/animator.ts` - アニメーション制御
- `test/` - テストファイル
- `demo/` - デモページ

## 🎨 キャラクター素材の準備

### expand-psd.js の使い方

### 概要

`expand-psd.js` は、PSDファイルから各レイヤーをPNG画像として書き出し、VoiSyncで使用可能な`layers.json`ファイルを生成するツールです。

### 目的

- PSDファイルのレイヤー構造を保持したまま、個別のPNG画像として展開
- `layers.json`を生成し、各PNG画像とレイヤー情報を紐付け
- VoiSyncのLayersRendererで動的にレイヤーを切り替えられるようにする

### 使用方法

```bash
node expand-psd.js <PSDファイルパス>
```

これにより、以下のファイルが生成されます：
- `<PSDファイル名>.psd.expanded/` - 展開されたPNG画像を含むディレクトリ
- `<PSDファイル名>.psd.expanded/layers.json` - レイヤー情報のメタデータ

### 実例：ずんだもん立ち絵素材を使用する場合

1. **素材のダウンロード**
   
   [ずんだもん立ち絵素材](https://www.pixiv.net/artworks/92641351) から`ずんだもん立ち絵素材2.3.zip`をダウンロード

2. **ZIPファイルの展開**
   ```bash
   unzip ずんだもん立ち絵素材2.3.zip -d assets/
   ```

3. **PSDファイルからレイヤーを展開**
   ```bash
   node expand-psd.js assets/ずんだもん立ち絵素材2.3/ずんだもん立ち絵素材2.3.psd
   ```

4. **生成されるファイル構造**
   ```
   assets/ずんだもん立ち絵素材2.3/ずんだもん立ち絵素材2.3.psd.expanded/
   ├── layers.json          # レイヤー情報のメタデータ
   ├── !口/                 # 口のレイヤー
   │   ├── _お.png
   │   ├── _むー.png
   │   └── ...
   ├── !目/                 # 目のレイヤー
   │   ├── _目セット/
   │   └── ...
   └── ...                  # その他のレイヤー
   ```

5. **VoiSyncでの使用**
   
   生成された`layers.json`と画像ファイルをVoiSyncのLayersRendererで読み込むことで、動的なキャラクターアニメーションが可能になります。

## 🛠 開発

### ビルド

```bash
npm run build
```

### テスト

```bash
npm test
```

## 🎮 デモ

### 前提条件

1. VOICEVOXをローカルで起動しておく（デフォルト: http://localhost:50021）
2. Node.js環境が必要

### デモの実行

```bash
# 初回のみ：依存関係のインストール
npm install
npm run demo:install

# VOICEVOXのAPIスキーマから型定義を生成
npm run generate:types

# ライブラリをビルド
npm run build

# デモサーバーを起動
npm run demo:dev
```

デモは http://localhost:5173 でアクセスできます。

## 📚 関連リンク

- [VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)
- [ずんだもん立ち絵素材（坂本アヒル様）](https://www.pixiv.net/artworks/92641351)
- [VOICEVOX API ドキュメント](https://voicevox.github.io/voicevox_engine/api/)

## 🤝 コントリビューション

プルリクエストや Issue の作成を歓迎します。大きな変更を行う場合は、まず Issue を作成して変更内容について議論してください。

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。
