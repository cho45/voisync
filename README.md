# VoiSync

VoiceVoxの音声合成データを使用してリップシンクアニメーションを行うTypeScriptライブラリ。

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 型定義の生成

VoiceVox APIの型定義を生成するには以下のコマンドを実行：

```bash
npm run generate:types
```

これにより、`src/types/voicevox.d.ts`にVoiceVox APIの型定義が生成されます。

## プロジェクト構成

- `src/types/voicevox.d.ts` - VoiceVox APIの型定義（自動生成）
- `src/lipsync.ts` - リップシンクフレーム生成
- `src/layer.ts` - レイヤー合成とCanvas描画
- `src/animator.ts` - アニメーション制御
- `test/` - テストファイル
- `demo/` - デモページ

## expand-psd.js の使い方

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

## 開発

### ビルド

```bash
npm run build
```

### テスト

```bash
npm test
```

## デモ

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

## ライセンス

MIT