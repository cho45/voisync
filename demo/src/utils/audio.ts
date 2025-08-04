/**
 * AudioBufferをWAVファイルのArrayBufferに変換する
 * @param audioBuffer 変換するAudioBuffer
 * @returns WAVファイルのArrayBuffer
 */
export function audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const fileSize = 44 + dataSize; // WAVヘッダー + データ
  
  // ArrayBufferを作成
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // WAVヘッダーを書き込む関数
  let offset = 0;
  
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  };
  
  const writeUint32 = (value: number) => {
    view.setUint32(offset, value, true);
    offset += 4;
  };
  
  const writeUint16 = (value: number) => {
    view.setUint16(offset, value, true);
    offset += 2;
  };
  
  // RIFFヘッダー
  writeString('RIFF');
  writeUint32(fileSize - 8); // ファイルサイズ - 8
  writeString('WAVE');
  
  // fmtチャンク
  writeString('fmt ');
  writeUint32(16); // fmtチャンクサイズ（PCMの場合は16）
  writeUint16(1); // フォーマット（1 = PCM）
  writeUint16(numberOfChannels); // チャンネル数
  writeUint32(sampleRate); // サンプルレート
  writeUint32(byteRate); // バイトレート
  writeUint16(blockAlign); // ブロックアライン
  writeUint16(16); // ビット深度
  
  // dataチャンク
  writeString('data');
  writeUint32(dataSize);
  
  // 音声データを書き込む
  const channelData: Float32Array[] = [];
  for (let channel = 0; channel < numberOfChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel));
  }
  
  // インターリーブされたPCMデータを書き込む
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      // Float32 (-1.0 ~ 1.0) を Int16 (-32768 ~ 32767) に変換
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16Sample, true);
      offset += 2;
    }
  }
  
  return buffer;
}

/**
 * ArrayBufferをUint8Arrayに変換する
 * @param buffer ArrayBuffer
 * @returns Uint8Array
 */
export function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}