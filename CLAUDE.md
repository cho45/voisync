# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

VoiSync (ボイシンク) は、VOICEVOX APIの音声合成データを使用してリップシンクアニメーションを生成するTypeScriptライブラリです。音素情報（mora）から口の形状を判定し、複数のレイヤー画像を合成してキャラクターアニメーションを実現します。

## コマンド一覧

### ビルド
```bash
npm run build
```

### テスト実行
```bash
# 全てのテストを実行
npm test

# Node.js環境のテストのみ実行
npm run test:run

# ブラウザ環境のテストを実行（Canvas描画テストなど）
npm run test:browser

# ブラウザ環境のテストを一度だけ実行
npm run test:browser:run

# 特定のテストファイルを実行
npx vitest run test/lipsync.test.ts

# 特定のテストケースを実行（例：LipSyncGeneratorのテスト）
npx vitest run -t "LipSyncGenerator"
```

### 型定義生成
```bash
# VOICEVOX APIの型定義を生成
npm run generate:types
```

## アーキテクチャ概要

### 主要コンポーネント

1. **LipSyncGenerator** (`src/lipsync.ts`)
   - VOICEVOXの音素データ（mora）を口形状（MouthShape）に変換
   - 日本語の音韻体系に基づく子音分類により、適切な口の動きを生成
   - 閉鎖音では「閉じる→開く」の2フレームを生成するなど、自然な口の動きを実現

2. **LayersRenderer** (`src/layer.ts`)
   - PSDから展開されたレイヤー画像をCanvas上で合成
   - 口形状に応じてレイヤーを動的に切り替え
   - 画像キャッシュ管理により高速な描画を実現

3. **AnimationController** (`src/animator.ts`)
   - リップシンクアニメーションの再生制御
   - WebAudio APIとの同期による音声同期再生
   - フレーム単位でのエクスポート機能（動画生成用）

### データフロー

```
VOICEVOX API Response
    ↓
LipSyncGenerator.generateFrames()
    ↓
LipSyncFrame[] (時系列の口形状データ)
    ↓
AnimationController + LayersRenderer
    ↓
Canvas描画 / フレームエクスポート
```

### 型定義

- `MouthShape`: 'a' | 'i' | 'u' | 'e' | 'o' | 'n' | 'closed'
- `LipSyncFrame`: 時刻、継続時間、口形状を持つフレームデータ
- `LayersData`: PSDから展開されたレイヤー情報（layers.json）

## 既存スクリプトとの関係

本プロジェクトは以下の既存JavaScriptスクリプトをTypeScriptライブラリ化したものです：

- `expand-psd.js`: PSDファイルを個別の画像レイヤーに展開
- `compose-layers.js`: レイヤー合成処理 → `LayersRenderer`として実装
- `compose-lipsync.js`: リップシンク生成処理 → `LipSyncGenerator`として実装

## アセット構成

### ずんだもんキャラクター素材
- `assets/ずんだもん立ち絵素材2.3/`: PSDファイルと展開済みレイヤー画像
- 口形状レイヤー（`!口/`ディレクトリ）:
  - `_お.png`: 「あ」音用
  - `_ゆ.png`: 「う」音用
  - `_んー.png`: 「ん」音用
  - など、各音素に対応した口画像

### 口形状マッピング例
```typescript
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

## テスト構成

- **Node.js環境テスト**: ロジックのユニットテスト
- **ブラウザ環境テスト**: Canvas描画を含む統合テスト（Playwright使用）
- スナップショットテスト: `test/__screenshots__/` に保存される描画結果の検証