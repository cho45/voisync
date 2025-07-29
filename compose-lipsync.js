import fs from 'fs';

// 母音と口の形のマッピング（既存のPSDレイヤーを使用）
const vowelMapping = {
  'a': '!口/*んあー',   // 「あ」に近い形
  'i': '!口/*んへー',   // 「い」に近い形  
  'u': '!口/*ゆ',      // 「う」の形
  'e': '!口/*んへー',   // 「え」に近い形
  'o': '!口/*お',      // 「お」の形
  'n': '!口/*んー',    // 「ん」の形
  'closed': '!口/*むふ', // 閉じた口
};

// moraから適切な口の形を選択
function getMouthShape(mora) {
  if (!mora.vowel) return vowelMapping.closed;
  
  // 母音の長さで開き具合を調整
  const vowelLength = mora.vowel_length;
  if (vowelLength < 0.05) return vowelMapping.closed; // 短すぎる場合は閉じた口
  
  return vowelMapping[mora.vowel] || vowelMapping.closed;
}

// 時間軸に沿って口パクフレームを生成
function generateLipSyncFrames(accentPhrases, prePhonemeLength, postPhonemeLength) {
  const frames = [];
  let currentTime = 0;
  
  // 開始時の無音部分
  if (prePhonemeLength > 0) {
    frames.push({
      time: currentTime,
      duration: prePhonemeLength,
      mouthShape: vowelMapping.closed
    });
    currentTime += prePhonemeLength;
  }
  
  // 各モーラの処理
  for (const phrase of accentPhrases) {
    for (const mora of phrase.moras) {
      // 子音部分（ある場合）
      if (mora.consonant_length && mora.consonant_length > 0) {
        frames.push({
          time: currentTime,
          duration: mora.consonant_length,
          mouthShape: vowelMapping.closed // 子音時は閉じた口
        });
        currentTime += mora.consonant_length;
      }
      
      // 母音部分
      if (mora.vowel_length > 0) {
        frames.push({
          time: currentTime,
          duration: mora.vowel_length,
          mouthShape: getMouthShape(mora)
        });
        currentTime += mora.vowel_length;
      }
    }
    
    // フレーズ間のポーズ
    if (phrase.pause_mora) {
      const pauseDuration = phrase.pause_mora.vowel_length || 0;
      if (pauseDuration > 0) {
        frames.push({
          time: currentTime,
          duration: pauseDuration,
          mouthShape: vowelMapping.closed
        });
        currentTime += pauseDuration;
      }
    }
  }
  
  // 終了時の無音部分
  if (postPhonemeLength > 0) {
    frames.push({
      time: currentTime,
      duration: postPhonemeLength,
      mouthShape: vowelMapping.closed
    });
    currentTime += postPhonemeLength;
  }
  
  return frames;
}

// メイン処理
async function main() {
  try {
    // 標準入力からJSONを読み込む
    const input = fs.readFileSync(0, 'utf-8');
    const data = JSON.parse(input);
    
    // フレームを生成
    const frames = generateLipSyncFrames(
      data.accent_phrases,
      data.prePhonemeLength || 0,
      data.postPhonemeLength || 0
    );
    
    // 結果を出力
    const output = {
      totalDuration: frames.length > 0 ? frames[frames.length - 1].time + frames[frames.length - 1].duration : 0,
      frameCount: frames.length,
      frames: frames
    };
    
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
