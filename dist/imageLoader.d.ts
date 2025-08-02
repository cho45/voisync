/**
 * 画像ローダーユーティリティ
 * Node.jsとブラウザ両環境で動作する画像読み込み機能を提供
 */
export declare function loadImage(filePath: string): Promise<HTMLImageElement | ImageBitmap>;
/**
 * 複数の画像を並行して読み込む
 */
export declare function loadImages(filePaths: string[]): Promise<Map<string, HTMLImageElement | ImageBitmap>>;
//# sourceMappingURL=imageLoader.d.ts.map