import type { components } from './types/voicevox';

// VoiceVox API型定義のエイリアス
export type VoiceVoxSynthesisData = components['schemas']['AudioQuery'];
export type AccentPhrase = components['schemas']['AccentPhrase'];
export type Mora = components['schemas']['Mora'];

// 口形状の型定義
export type MouthShape = 'a' | 'i' | 'u' | 'e' | 'o' | 'n' | 'closed';

// レイヤー情報の型定義
export interface LayersData {
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

// リップシンクフレームの型定義
export interface LipSyncFrame {
  time: number;      // 開始時刻（秒単位）
  duration: number;  // 継続時間（秒単位）
  mouth: MouthShape; // 口形状識別子
}

// 口形状とレイヤーパスのマッピング
export interface MouthLayerMapping {
  'a': string;      // 例: '!口/*あ'
  'i': string;      // 例: '!口/*い'
  'u': string;      // 例: '!口/*う'
  'e': string;      // 例: '!口/*え'
  'o': string;      // 例: '!口/*お'
  'n': string;      // 例: '!口/*ん'
  'closed': string; // 例: '!口/*閉じ'
}

// レンダリングオプション
export interface RenderOptions {
  layerPaths: string[];
  mouthShape: MouthShape;
}

export interface RenderError {
  type: 'LAYER_NOT_FOUND' | 'IMAGE_NOT_CACHED' | 'INVALID_MOUTH_SHAPE' | 'CANVAS_ERROR';
  details: string;
  layerPath?: string;
}

export interface RenderResult {
  success: boolean;
  errors: RenderError[];
  renderedLayers: string[];
}

// アニメーションオプション
export interface AnimationOptions {
  fps?: number;         // デフォルト: 60
  audioBuffer?: AudioBuffer;
  audioContext?: AudioContext;
  onFrame?: (frame: number, time: number) => void;
}

// エクスポートされたフレーム
export interface ExportedFrame {
  time: number;         // フレームの時刻（秒単位）
  duration: number;     // フレームの表示時間（秒単位）
  blob: Blob;          // canvas.toBlobの結果
}

// エクスポートオプション
export interface ExportOptions {
  fps?: number;         // デフォルト: 60
  format?: 'png' | 'jpeg' | 'webp';  // デフォルト: 'png'
  quality?: number;     // 0.0 - 1.0 (jpegとwebpのみ)
}