# VoiceVox リップシンク描画ライブラリ実装計画

## 概要
VoiceVoxのAPIから取得した音声合成データ（mora情報）を使用して、キャラクター画像のリップシンクアニメーションをcanvasに描画するTypeScriptライブラリを作成する。

## スコープ
### 対象範囲
- VoiceVoxのAPIデータ（JSON）のパース
- リップシンクフレーム生成
- レイヤー合成によるcanvas描画
- WebAudioとの同期再生

### 対象外
- PSDファイルからの画像生成（既にexpand-psd.jsで実装済み）
- 音声ファイルの生成（VoiceVox APIで生成済みと想定）

## アーキテクチャ

### 主要コンポーネント

1. **LipSyncGenerator**
   - VoiceVoxのmora（音素情報）を抽象的な口形状（MouthShape）にマッピング
   - 子音と母音の組み合わせを考慮（例：「ま」は閉じ→「あ」、「さ」は半開き→「あ」）
   - 1つのmoraから必要に応じて複数のフレームを生成（閉鎖音では閉じる→開くの2フレーム）
   - タイミング情報の管理
   - 入力: VoiceVoxのAPIレスポンスデータ
   - 出力: 時系列の口形状データ（LipSyncFrame配列）

2. **LayersRenderer**
   - レイヤー合成とcanvas描画（口の置換含む）
   - MouthShapeと実際のレイヤーパスのマッピング管理
   - レイヤーパスの配列と口形状を受け取って、canvasに描画
   - 画像キャッシュ管理も担当

3. **AnimationController**
   - タイミング制御とアニメーション管理
   - リアルタイム再生（requestAnimationFrame）
   - 音声との同期再生
   - 全フレーム画像の一括生成（将来的なffmpeg連携用）
   - 再生/停止/シーク制御

### API設計

```typescript
// 口形状の型定義
type MouthShape = 'a' | 'i' | 'u' | 'e' | 'o' | 'n' | 'closed';

// レイヤー情報の型定義
interface LayersData {
  document: {
    width: number;
    height: number;
  };
  layers: Array<{
    name: string;
    layerPath: string;
    filePath: string;
    visible: boolean;
    opacity: number;
    bounds: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;
}

// LipSyncGenerator
interface LipSyncFrame {
  time: number;      // 開始時刻（秒単位）
  duration: number;  // 継続時間（秒単位）
  mouth: MouthShape; // 口形状識別子
}

class LipSyncGenerator {
  generateFrames(voiceVoxData: VoiceVoxSynthesisData): LipSyncFrame[];
}

// LayersRenderer
interface MouthLayerMapping {
  'a': string;      // 例: '!口/*あ'
  'i': string;      // 例: '!口/*い'
  'u': string;      // 例: '!口/*う'
  'e': string;      // 例: '!口/*え'
  'o': string;      // 例: '!口/*お'
  'n': string;      // 例: '!口/*ん'
  'closed': string; // 例: '!口/*閉じ'
}

interface RenderOptions {
  layerPaths: string[];
  mouthShape: MouthShape;
}

class LayersRenderer {
  constructor(
    layersData: LayersData, 
    imageCache: Map<string, HTMLImageElement>,
    mouthMapping: MouthLayerMapping
  );
  render(canvas: HTMLCanvasElement, options: RenderOptions): void;
  preloadImages(layerPaths: string[]): Promise<void>;
}

// AnimationController
interface AnimationOptions {
  fps?: number;         // デフォルト: 60
  audioBuffer?: AudioBuffer;
  onFrame?: (frame: number, time: number) => void;
}

interface ExportedFrame {
  time: number;         // フレームの時刻（秒単位）
  duration: number;     // フレームの表示時間（秒単位）
  blob: Blob;          // canvas.toBlobの結果
}

interface ExportOptions {
  fps?: number;         // デフォルト: 60
  format?: 'png' | 'jpeg' | 'webp';  // デフォルト: 'png'
  quality?: number;     // 0.0 - 1.0 (jpegとwebpのみ)
}

class AnimationController {
  constructor(frames: LipSyncFrame[], renderer: LayersRenderer);
  play(canvas: HTMLCanvasElement, baseLayers: string[], options?: AnimationOptions): void;
  pause(): void;
  stop(): void;
  exportFrames(baseLayers: string[], options?: ExportOptions): Promise<ExportedFrame[]>;
  dispose(): void;
}
```

## 実装手順

1. **TypeScriptプロジェクトのセットアップ**
   - tsconfig.json作成
   - ビルド設定（ESM対応）
   - テストフレームワーク（Vitest）のセットアップ
   - OpenAPI Generator の導入

2. **VoiceVoxデータ型定義とテスト**
   - VoiceVox APIのopenapi.jsonからクライアントコード生成
   - 生成された型定義の検証
   - 型定義のテスト作成

3. **LipSyncGeneratorの実装とテスト**
   - 既存のcompose-lipsync.jsをTypeScriptに移植
   - generateFrames メソッドの実装
   - 各母音パターンのテスト
   - エッジケースのテスト（無音部分、連続音など）

4. **LayersRendererの実装とテスト**
   - 既存のcompose-layers.jsをTypeScriptに移植
   - 口パーツ置換機能の実装
   - レンダリングのテスト（スナップショットテスト）
   - パフォーマンステスト

5. **AnimationControllerの実装とテスト**
   - タイミング制御の実装
   - 再生制御メソッドの実装
   - exportFrames機能の実装
   - タイミング精度のテスト
   - メモリリークのテスト

6. **統合テストとドキュメント作成**
   - E2Eテストの作成
   - APIドキュメントの作成
   - 使用例とデモの作成

## ファイル構成
```
src/
├── generated/      # OpenAPIから生成されたコード
│   └── voicevox/   # VoiceVox APIクライアントと型定義
├── types.ts        # 追加の型定義とインターフェース
├── lipsync.ts      # リップシンクフレーム生成
├── layer.ts        # レイヤー合成とCanvas描画
├── animator.ts     # アニメーション制御
└── index.ts        # メインエクスポート

test/
├── lipsync.test.js           # LipSyncGeneratorのNode.jsテスト
├── layer.test.js             # LayersRendererのNode.jsテスト
├── layer.browser.test.js     # LayersRendererのブラウザテスト（Canvas描画）
├── animator.test.js          # AnimationControllerのNode.jsテスト
├── animator.browser.test.js  # AnimationControllerのブラウザテスト（実際の再生）
└── fixtures/                 # テスト用データ
    └── voicevox-response.json

demo/
└── index.html      # デモページ
```
