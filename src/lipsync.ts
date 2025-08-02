import type { VoiceVoxSynthesisData, Mora, LipSyncFrame, MouthShape } from './types';

// 子音の分類（日本語の音韻体系に基づく）

// 両唇閉鎖音（唇を完全に閉じる必要がある子音）
const PLOSIVE_CONSONANTS = ['p', 'b', 'm'];

// 破裂音（口腔内で閉鎖）
const STOP_CONSONANTS = ['k', 'g', 't', 'd'];

// 摩擦音（口は開いたままで良い子音）
const FRICATIVE_CONSONANTS = ['s', 'sh', 'h', 'f', 'z', 'j'];

// 破擦音（部分的に閉じる子音）
const AFFRICATE_CONSONANTS = ['ch', 'ts'];

// 鼻音
const NASAL_CONSONANTS = ['n'];

// 流音
const LIQUID_CONSONANTS = ['r'];

// 半母音
const GLIDE_CONSONANTS = ['w', 'y'];

export class LipSyncGenerator {
  /**
   * VoiceVoxの音声合成データからリップシンクフレームを生成
   */
  generateFrames(voiceVoxData: VoiceVoxSynthesisData): LipSyncFrame[] {
    const frames: LipSyncFrame[] = [];
    let currentTime = 0;

    // 開始時の無音部分
    if (voiceVoxData.prePhonemeLength > 0) {
      frames.push({
        time: currentTime,
        duration: voiceVoxData.prePhonemeLength,
        mouth: 'closed'
      });
      currentTime += voiceVoxData.prePhonemeLength;
    }

    // 各アクセント句の処理
    for (const phrase of voiceVoxData.accent_phrases) {
      // 各モーラの処理
      for (const mora of phrase.moras) {
        const moraFrames = this.generateMoraFrames(mora, currentTime);
        frames.push(...moraFrames);
        
        // 時間を進める
        const moraDuration = this.calculateMoraDuration(mora);
        currentTime += moraDuration;
      }

      // フレーズ間のポーズ
      if (phrase.pause_mora) {
        const pauseDuration = phrase.pause_mora.vowel_length || 0;
        if (pauseDuration > 0) {
          frames.push({
            time: currentTime,
            duration: pauseDuration,
            mouth: 'closed'
          });
          currentTime += pauseDuration;
        }
      }
    }

    // 終了時の無音部分
    if (voiceVoxData.postPhonemeLength > 0) {
      frames.push({
        time: currentTime,
        duration: voiceVoxData.postPhonemeLength,
        mouth: 'closed'
      });
    }

    return frames;
  }

  /**
   * 単一のモーラから口形状フレームを生成
   * 閉鎖音の場合は複数フレームを生成する
   */
  private generateMoraFrames(mora: Mora, startTime: number): LipSyncFrame[] {
    const frames: LipSyncFrame[] = [];
    let currentTime = startTime;

    // 値の検証と正規化
    const consonantLength = Math.max(0, mora.consonant_length || 0);
    const vowelLength = Math.max(0, mora.vowel_length || 0);

    // 子音部分の処理
    if (mora.consonant && consonantLength > 0) {
      const consonantType = this.getConsonantType(mora.consonant);
      
      if (consonantType === 'plosive' || consonantType === 'stop') {
        // 閉鎖音・破裂音：完全に閉じる
        frames.push({
          time: currentTime,
          duration: consonantLength,
          mouth: 'closed'
        });
      } else if (consonantType === 'affricate') {
        // 破擦音：部分的に閉じる（短い閉じ時間）
        const closeDuration = Math.min(consonantLength * 0.5, 0.02); // 最大20ms
        frames.push({
          time: currentTime,
          duration: closeDuration,
          mouth: 'closed'
        });
        
        // 残りの時間は母音への遷移
        if (consonantLength - closeDuration > 0) {
          const vowelShape = this.getVowelShape(mora);
          frames.push({
            time: currentTime + closeDuration,
            duration: consonantLength - closeDuration,
            mouth: vowelShape
          });
        }
      } else {
        // 摩擦音とその他の子音：母音と同じ口形状
        const vowelShape = this.getVowelShape(mora);
        frames.push({
          time: currentTime,
          duration: consonantLength,
          mouth: vowelShape
        });
      }
      
      currentTime += consonantLength;
    }

    // 母音部分の処理
    if (vowelLength > 0) {
      const vowelShape = this.getVowelShape(mora);
      
      // 短すぎる母音は口を開かない
      if (vowelLength < 0.05) {
        frames.push({
          time: currentTime,
          duration: vowelLength,
          mouth: 'closed'
        });
      } else {
        frames.push({
          time: currentTime,
          duration: vowelLength,
          mouth: vowelShape
        });
      }
    }

    return frames;
  }

  /**
   * 子音の種類を判定
   */
  private getConsonantType(consonant: string): 'plosive' | 'stop' | 'fricative' | 'affricate' | 'nasal' | 'liquid' | 'glide' | 'other' {
    if (PLOSIVE_CONSONANTS.includes(consonant)) {
      return 'plosive';
    } else if (STOP_CONSONANTS.includes(consonant)) {
      return 'stop';
    } else if (FRICATIVE_CONSONANTS.includes(consonant)) {
      return 'fricative';
    } else if (AFFRICATE_CONSONANTS.includes(consonant)) {
      return 'affricate';
    } else if (NASAL_CONSONANTS.includes(consonant)) {
      return 'nasal';
    } else if (LIQUID_CONSONANTS.includes(consonant)) {
      return 'liquid';
    } else if (GLIDE_CONSONANTS.includes(consonant)) {
      return 'glide';
    }
    return 'other';
  }

  /**
   * モーラから母音の口形状を取得
   */
  private getVowelShape(mora: Mora): MouthShape {
    if (!mora.vowel) return 'closed';
    
    // 母音マッピング
    const vowelMap: Record<string, MouthShape> = {
      'a': 'a',
      'i': 'i',
      'u': 'u',
      'e': 'e',
      'o': 'o',
      'N': 'n',  // 「ん」
    };
    
    return vowelMap[mora.vowel] || 'closed';
  }

  /**
   * モーラの総時間を計算
   */
  private calculateMoraDuration(mora: Mora): number {
    const consonantLength = mora.consonant_length || 0;
    const vowelLength = mora.vowel_length || 0;
    return consonantLength + vowelLength;
  }
}