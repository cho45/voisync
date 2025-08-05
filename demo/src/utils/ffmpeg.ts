import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

/**
 * FFmpeg.wasmのインスタンスを取得（シングルトン）
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();
  
  // ログ出力を有効化
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });
  
  // ブラウザの環境に応じて適切なバージョンを読み込む
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
  console.log('Loading FFmpeg from:', baseURL);
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  console.log('FFmpeg loaded successfully');
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export interface VideoExportOptions {
  frames: Blob[];
  audioData: Uint8Array;
  fps?: number;
  audioBitrate?: string;
  onProgress?: (progress: number) => void;
}

/**
 * フレーム画像と音声データからMP4動画を生成
 */
export async function exportVideo(options: VideoExportOptions): Promise<Blob> {
  const {
    frames,
    audioData,
    fps = 60,
    audioBitrate = '128k',
    onProgress
  } = options;

  const ffmpeg = await getFFmpeg();

  try {
    // プログレスイベントの設定
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }

    // 音声ファイルを書き込む
    console.log('[FFmpeg Debug] Writing audio.wav, size:', audioData.length);
    await ffmpeg.writeFile('audio.wav', audioData);
    
    // 音声ファイルのサイズを確認
    try {
      const audioCheck = await ffmpeg.readFile('audio.wav');
      console.log('[FFmpeg Debug] audio.wav written successfully, size:', audioCheck.length);
    } catch (e) {
      console.error('[FFmpeg Debug] Failed to read audio.wav:', e);
    }

    // フレーム画像を書き込む
    console.log('[FFmpeg Debug] Writing', frames.length, 'frames...');
    for (let i = 0; i < frames.length; i++) {
      const frameNumber = i.toString().padStart(6, '0');
      const frameData = await frames[i].arrayBuffer();
      const frameUint8 = new Uint8Array(frameData);
      console.log(`[FFmpeg Debug] Writing frame${frameNumber}.png, size:`, frameUint8.length);
      await ffmpeg.writeFile(`frame${frameNumber}.png`, frameUint8);
      
      // フレーム書き込みのプログレス（0-0.3の範囲）
      if (onProgress) {
        onProgress(0.3 * (i + 1) / frames.length);
      }
    }
    
    // 最初のフレームを確認
    try {
      const frame0 = await ffmpeg.readFile('frame000000.png');
      console.log('[FFmpeg Debug] frame000000.png written successfully, size:', frame0.length);
    } catch (e) {
      console.error('[FFmpeg Debug] Failed to read frame000000.png:', e);
    }
    

    // FFmpegコマンドを実行してMP4を生成
    console.log('[FFmpeg Debug] Executing FFmpeg command...');
    const command = [
      '-framerate', fps.toString(),
      '-i', 'frame%06d.png',
      '-i', 'audio.wav',
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',  // 幅と高さを2の倍数にパディング
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', audioBitrate,
      '-shortest',
      '-y',
      'output.mp4'
    ];
    console.log('[FFmpeg Debug] Command:', 'ffmpeg', command.join(' '));
    
    try {
      await ffmpeg.exec(command);
      console.log('[FFmpeg Debug] FFmpeg execution completed');
    } catch (ffmpegError) {
      console.error('[FFmpeg Debug] FFmpeg execution failed:', ffmpegError);
      throw new Error(`FFmpeg execution failed: ${ffmpegError}`);
    }

    // 出力ファイルを読み込む
    console.log('[FFmpeg Debug] Reading output.mp4...');
    const data = await ffmpeg.readFile('output.mp4');
    
    // dataがUint8Arrayかどうか確認
    if (!(data instanceof Uint8Array)) {
      throw new Error('FFmpeg output is not in expected format');
    }
    
    console.log('[FFmpeg Debug] output.mp4 size:', data.length, 'bytes');
    
    if (data.length === 0) {
      throw new Error('FFmpeg produced an empty output file');
    }
    
    // Uint8ArrayのバッファをBlobに渡す（型キャスト）
    const videoBlob = new Blob([data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer], { type: 'video/mp4' });
    console.log('[FFmpeg Debug] Created video blob, size:', videoBlob.size);

    // クリーンアップ
    await cleanupFFmpegFiles(ffmpeg, frames.length);

    return videoBlob;
  } catch (error) {
    // エラー時もクリーンアップを試みる
    try {
      await cleanupFFmpegFiles(ffmpeg, frames.length);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    throw error;
  } finally {
    // プログレスイベントのリスナーを削除
    if (onProgress) {
      ffmpeg.off('progress', () => {});
    }
  }
}

/**
 * FFmpegのファイルシステムをクリーンアップ
 */
async function cleanupFFmpegFiles(ffmpeg: FFmpeg, frameCount: number): Promise<void> {
  // フレームファイルを削除
  for (let i = 0; i < frameCount; i++) {
    try {
      await ffmpeg.deleteFile(`frame${i.toString().padStart(6, '0')}.png`);
    } catch (error) {
      // ファイルが存在しない場合のエラーは無視
    }
  }
  
  // 音声ファイルと出力ファイルを削除
  try {
    await ffmpeg.deleteFile('audio.wav');
  } catch (error) {
    // ファイルが存在しない場合のエラーは無視
  }
  
  try {
    await ffmpeg.deleteFile('output.mp4');
  } catch (error) {
    // ファイルが存在しない場合のエラーは無視
  }
}

/**
 * 動画ファイルをダウンロード
 */
export function downloadVideo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // しばらくしてからURLを解放
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
