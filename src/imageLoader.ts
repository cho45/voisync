/**
 * 画像ローダーユーティリティ
 * Node.jsとブラウザ両環境で動作する画像読み込み機能を提供
 */

export async function loadImage(filePath: string): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof window !== 'undefined') {
    // ブラウザ環境
    return loadImageBrowser(filePath);
  } else {
    // Node.js環境
    return loadImageNode(filePath);
  }
}

async function loadImageBrowser(filePath: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = filePath;
  
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${filePath}`));
  });
}

async function loadImageNode(filePath: string): Promise<any> {
  try {
    // 動的インポートを使用
    const { loadImage: canvasLoadImage } = await import('canvas');
    const { promises: fs } = await import('node:fs');
    const path = await import('node:path');
    
    // 画像パスを解決（相対パスの場合）
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(process.cwd(), filePath);
    
    // ファイルの存在確認
    await fs.access(resolvedPath);
    
    return await canvasLoadImage(resolvedPath);
  } catch (error) {
    throw new Error(`Failed to load image: ${filePath} - ${error}`);
  }
}

/**
 * 複数の画像を並行して読み込む
 */
export async function loadImages(filePaths: string[]): Promise<Map<string, HTMLImageElement | ImageBitmap>> {
  const imageCache = new Map<string, HTMLImageElement | ImageBitmap>();
  
  const loadPromises = filePaths.map(async (filePath) => {
    try {
      const image = await loadImage(filePath);
      imageCache.set(filePath, image);
    } catch (error) {
      console.error(`Failed to load image: ${filePath}`, error);
      // エラーが発生しても他の画像の読み込みは続ける
    }
  });

  await Promise.all(loadPromises);
  
  return imageCache;
}