import type { VoiceVoxSynthesisData, LipSyncFrame } from './types';
export declare class LipSyncGenerator {
    /**
     * VoiceVoxの音声合成データからリップシンクフレームを生成
     */
    generateFrames(voiceVoxData: VoiceVoxSynthesisData): LipSyncFrame[];
    /**
     * 単一のモーラから口形状フレームを生成
     * 閉鎖音の場合は複数フレームを生成する
     */
    private generateMoraFrames;
    /**
     * 子音の種類を判定
     */
    private getConsonantType;
    /**
     * モーラから母音の口形状を取得
     */
    private getVowelShape;
    /**
     * モーラの総時間を計算
     */
    private calculateMoraDuration;
}
//# sourceMappingURL=lipsync.d.ts.map