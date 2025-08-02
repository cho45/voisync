import { describe, it, expect } from 'vitest';
import { LipSyncGenerator } from '../src/lipsync';
import type { VoiceVoxSynthesisData, Mora, AccentPhrase } from '../src/types';

// テストデータ作成用ヘルパー関数
function createMora(options: {
  text: string;
  consonant?: string | null;
  consonant_length?: number | null;
  vowel: string;
  vowel_length: number;
  pitch?: number;
}): Mora {
  return {
    text: options.text,
    consonant: options.consonant || undefined,
    consonant_length: options.consonant_length || undefined,
    vowel: options.vowel,
    vowel_length: options.vowel_length,
    pitch: options.pitch || 5.0
  };
}

function createAccentPhrase(
  moras: Mora[],
  options: {
    accent?: number;
    pause_mora?: Mora;
    is_interrogative?: boolean;
  } = {}
): AccentPhrase {
  return {
    moras,
    accent: options.accent || 1,
    pause_mora: options.pause_mora,
    is_interrogative: options.is_interrogative || false
  };
}

function createVoiceVoxData(
  accent_phrases: AccentPhrase[],
  options: {
    prePhonemeLength?: number;
    postPhonemeLength?: number;
  } = {}
): VoiceVoxSynthesisData {
  return {
    accent_phrases,
    speedScale: 1.0,
    pitchScale: 0.0,
    intonationScale: 1.0,
    volumeScale: 1.0,
    prePhonemeLength: options.prePhonemeLength || 0,
    postPhonemeLength: options.postPhonemeLength || 0,
    outputSamplingRate: 24000,
    outputStereo: false,
    pauseLength: null,
    pauseLengthScale: 1.0,
    kana: ''
  };
}

describe('LipSyncGenerator', () => {
  const generator = new LipSyncGenerator();

  it('should generate frames for simple vowel', () => {
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ text: 'ア', vowel: 'a', vowel_length: 0.1 })
      ])
    ], {
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1
    });

    const frames = generator.generateFrames(data);
    
    expect(frames).toHaveLength(3); // pre + vowel + post
    expect(frames[0]).toEqual({ time: 0, duration: 0.1, mouth: 'closed' }); // pre
    expect(frames[1]).toEqual({ time: 0.1, duration: 0.1, mouth: 'a' }); // vowel
    expect(frames[2]).toEqual({ time: 0.2, duration: 0.1, mouth: 'closed' }); // post
  });

  it('should generate two frames for plosive consonant', () => {
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ 
          text: 'マ', 
          consonant: 'm', 
          consonant_length: 0.05,
          vowel: 'a', 
          vowel_length: 0.1 
        })
      ])
    ]);

    const frames = generator.generateFrames(data);
    
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({ time: 0, duration: 0.05, mouth: 'closed' }); // consonant (m)
    expect(frames[1]).toEqual({ time: 0.05, duration: 0.1, mouth: 'a' }); // vowel
  });

  it('should generate frame for fricative consonant with vowel shape', () => {
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ 
          text: 'サ', 
          consonant: 's', 
          consonant_length: 0.05,
          vowel: 'a', 
          vowel_length: 0.1 
        })
      ])
    ]);

    const frames = generator.generateFrames(data);
    
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({ time: 0, duration: 0.05, mouth: 'a' }); // consonant with vowel shape
    expect(frames[1]).toEqual({ time: 0.05, duration: 0.1, mouth: 'a' }); // vowel
  });

  it('should maintain continuous timeline without gaps', () => {
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ 
          text: 'サ', 
          consonant: 's', 
          consonant_length: 0.05,
          vowel: 'a', 
          vowel_length: 0.1 
        }),
        createMora({ 
          text: 'カ', 
          consonant: 'k', 
          consonant_length: 0.03,
          vowel: 'a', 
          vowel_length: 0.1 
        })
      ])
    ]);

    const frames = generator.generateFrames(data);
    
    // フレーム間にギャップがないことを確認
    for (let i = 0; i < frames.length - 1; i++) {
      const currentFrameEnd = frames[i].time + frames[i].duration;
      const nextFrameStart = frames[i + 1].time;
      const gap = nextFrameStart - currentFrameEnd;
      
      expect(gap).toBeCloseTo(0, 6); // 6桁の精度で0に近い
    }
  });

  it('should handle short vowels as closed mouth', () => {
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ text: 'ッ', vowel: 'u', vowel_length: 0.03 }) // < 0.05
      ])
    ]);

    const frames = generator.generateFrames(data);
    
    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({ time: 0, duration: 0.03, mouth: 'closed' });
  });

  it('should handle pause mora', () => {
    const pauseMora = createMora({ text: '、', vowel: 'pau', vowel_length: 0.2, pitch: 0 });
    
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ text: 'ア', vowel: 'a', vowel_length: 0.1 })
      ], {
        pause_mora: pauseMora
      })
    ]);

    const frames = generator.generateFrames(data);
    
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({ time: 0, duration: 0.1, mouth: 'a' });
    expect(frames[1]).toEqual({ time: 0.1, duration: 0.2, mouth: 'closed' }); // pause
  });

  it('should handle affricate consonant with partial closure', () => {
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ 
          text: 'チ', 
          consonant: 'ch', 
          consonant_length: 0.08,
          vowel: 'i', 
          vowel_length: 0.1 
        })
      ])
    ]);

    const frames = generator.generateFrames(data);
    
    expect(frames).toHaveLength(3);
    expect(frames[0]).toEqual({ time: 0, duration: 0.02, mouth: 'closed' }); // partial closure (max 20ms)
    expect(frames[1]).toEqual({ time: 0.02, duration: 0.06, mouth: 'i' }); // transition
    expect(frames[2]).toEqual({ time: 0.08, duration: 0.1, mouth: 'i' }); // vowel
  });

  it('should handle real VoiceVox data', () => {
    // test/data/こんにちはなのだ.json のデータを簡略化
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({
          text: "コ",
          consonant: "k",
          consonant_length: 0.0733351930975914,
          vowel: "o",
          vowel_length: 0.12275893241167068,
          pitch: 5.779971122741699
        }),
        createMora({
          text: "ン",
          consonant: null,
          consonant_length: null,
          vowel: "N",
          vowel_length: 0.06272678822278976,
          pitch: 5.885441780090332
        })
      ], { accent: 6 })
    ], {
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1
    });

    const frames = generator.generateFrames(data);
    
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].mouth).toBe('closed'); // pre silence
    
    // 総時間の検証
    const lastFrame = frames[frames.length - 1];
    const totalDuration = lastFrame.time + lastFrame.duration;
    const expectedDuration = 0.1 + 0.0733351930975914 + 0.12275893241167068 + 0.06272678822278976 + 0.1;
    expect(totalDuration).toBeCloseTo(expectedDuration, 5);
  });

  it('should handle all Japanese consonant types correctly', () => {
    // 各子音タイプのテスト
    const testCases = [
      // 閉鎖音（両唇音）
      { consonant: 'p', expectedType: 'closed', text: 'パ' },
      { consonant: 'b', expectedType: 'closed', text: 'バ' },
      { consonant: 'm', expectedType: 'closed', text: 'マ' },
      // 破裂音
      { consonant: 'k', expectedType: 'closed', text: 'カ' },
      { consonant: 'g', expectedType: 'closed', text: 'ガ' },
      { consonant: 't', expectedType: 'closed', text: 'タ' },
      { consonant: 'd', expectedType: 'closed', text: 'ダ' },
      // 鼻音
      { consonant: 'n', expectedType: 'vowel', text: 'ナ' },
      // 流音
      { consonant: 'r', expectedType: 'vowel', text: 'ラ' },
      // 半母音
      { consonant: 'w', expectedType: 'vowel', text: 'ワ' },
      { consonant: 'y', expectedType: 'vowel', text: 'ヤ' },
      // 摩擦音
      { consonant: 's', expectedType: 'vowel', text: 'サ' },
      { consonant: 'h', expectedType: 'vowel', text: 'ハ' },
    ];

    testCases.forEach(({ consonant, expectedType, text }) => {
      const data = createVoiceVoxData([
        createAccentPhrase([
          createMora({ 
            text, 
            consonant, 
            consonant_length: 0.05,
            vowel: 'a', 
            vowel_length: 0.1 
          })
        ])
      ]);

      const frames = generator.generateFrames(data);
      const consonantFrame = frames[0];
      
      if (expectedType === 'closed') {
        expect(consonantFrame.mouth).toBe('closed');
      } else {
        expect(consonantFrame.mouth).toBe('a'); // 母音と同じ
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle zero vowel length', () => {
      const data = createVoiceVoxData([
        createAccentPhrase([
          createMora({ text: 'ッ', vowel: 'cl', vowel_length: 0 })
        ])
      ]);
      
      const frames = generator.generateFrames(data);
      expect(frames).toHaveLength(0);
    });

    it('should handle zero consonant length', () => {
      const data = createVoiceVoxData([
        createAccentPhrase([
          createMora({ 
            text: 'サ',
            consonant: 's',
            consonant_length: 0,
            vowel: 'a',
            vowel_length: 0.1
          })
        ])
      ]);
      
      const frames = generator.generateFrames(data);
      expect(frames).toHaveLength(1);
      expect(frames[0]).toEqual({ time: 0, duration: 0.1, mouth: 'a' });
    });

    it('should handle missing consonant and consonant_length', () => {
      const mora: Mora = {
        text: 'ア',
        vowel: 'a',
        vowel_length: 0.1,
        pitch: 5.0
        // consonant, consonant_length は undefined
      };
      
      const data = createVoiceVoxData([
        createAccentPhrase([mora])
      ]);
      
      const frames = generator.generateFrames(data);
      expect(frames).toHaveLength(1);
      expect(frames[0]).toEqual({ time: 0, duration: 0.1, mouth: 'a' });
    });

    it('should handle negative durations as zero', () => {
      const data = createVoiceVoxData([
        createAccentPhrase([
          createMora({ 
            text: 'サ',
            consonant: 's',
            consonant_length: -0.05, // 負の値
            vowel: 'a',
            vowel_length: -0.1 // 負の値
          })
        ])
      ]);
      
      const frames = generator.generateFrames(data);
      expect(frames).toHaveLength(0); // 負の値は0として扱われる
    });

    it('should handle extremely long consonant', () => {
      const data = createVoiceVoxData([
        createAccentPhrase([
          createMora({ 
            text: 'ッサ', 
            consonant: 's', 
            consonant_length: 2.0, // 異常に長い
            vowel: 'a', 
            vowel_length: 0.1 
          })
        ])
      ]);
      
      const frames = generator.generateFrames(data);
      expect(frames).toHaveLength(2);
      expect(frames[0].duration).toBe(2.0); // 長さはそのまま使用
      expect(frames[1].duration).toBe(0.1);
    });

    it('should handle unknown vowel type', () => {
      const data = createVoiceVoxData([
        createAccentPhrase([
          createMora({ 
            text: 'X',
            vowel: 'x', // 未知の母音
            vowel_length: 0.1
          })
        ])
      ]);
      
      const frames = generator.generateFrames(data);
      expect(frames).toHaveLength(1);
      expect(frames[0].mouth).toBe('closed'); // デフォルトはclosed
    });
  });

  it('should handle multiple accent phrases', () => {
    const data = createVoiceVoxData([
      createAccentPhrase([
        createMora({ text: 'コ', consonant: 'k', consonant_length: 0.05, vowel: 'o', vowel_length: 0.1 })
      ]),
      createAccentPhrase([
        createMora({ text: 'ン', vowel: 'N', vowel_length: 0.08 })
      ])
    ]);

    const frames = generator.generateFrames(data);
    
    expect(frames).toHaveLength(3);
    // k音はSTOP_CONSONANTSに分類され、閉じた口形状でフレームが生成される
    expect(frames[0]).toEqual({ time: 0, duration: 0.05, mouth: 'closed' }); // k音（破裂音）
    expect(frames[1]).toEqual({ time: 0.05, duration: 0.1, mouth: 'o' }); // o母音
    expect(frames[2].duration).toBe(0.08);
    expect(frames[2].mouth).toBe('n');
    expect(frames[2].time).toBeCloseTo(0.15, 10);
  });
});