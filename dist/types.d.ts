import type { components } from './types/voicevox';
export type VoiceVoxSynthesisData = components['schemas']['AudioQuery'];
export type AccentPhrase = components['schemas']['AccentPhrase'];
export type Mora = components['schemas']['Mora'];
export type MouthShape = 'a' | 'i' | 'u' | 'e' | 'o' | 'n' | 'closed';
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
export interface LipSyncFrame {
    time: number;
    duration: number;
    mouth: MouthShape;
}
export interface MouthLayerMapping {
    'a': string;
    'i': string;
    'u': string;
    'e': string;
    'o': string;
    'n': string;
    'closed': string;
}
export interface RenderOptions {
    layerPaths: string[];
    mouthShapes?: Array<{
        shape: MouthShape;
        alpha: number;
    }>;
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
export interface AnimationOptions {
    fps?: number;
    audioBuffer?: AudioBuffer;
    audioContext?: AudioContext;
    onFrame?: (frame: number, time: number) => void;
}
export interface ExportedFrame {
    time: number;
    duration: number;
    blob: Blob;
}
export interface ExportOptions {
    fps?: number;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
}
export interface CharacterConfig {
    id: string;
    name: string;
    layersPath: string;
    baseLayers: string[];
    mouthMapping: MouthLayerMapping;
}
//# sourceMappingURL=types.d.ts.map