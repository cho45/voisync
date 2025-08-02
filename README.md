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