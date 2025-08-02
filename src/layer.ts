import type { LayersData, MouthShape, MouthLayerMapping, RenderOptions, RenderResult, RenderError } from './types';

export class LayersRenderer {
  private imageCache: Map<string, HTMLImageElement | ImageBitmap>;
  private layersData: LayersData;
  private mouthMapping: MouthLayerMapping;
  
  constructor(
    layersData: LayersData, 
    imageCache: Map<string, HTMLImageElement | ImageBitmap>,
    mouthMapping: MouthLayerMapping
  ) {
    this.layersData = layersData;
    this.imageCache = imageCache;
    this.mouthMapping = mouthMapping;
  }

  /**
   * 指定されたレイヤーをcanvasに描画
   */
  async render(canvas: HTMLCanvasElement, options: RenderOptions): Promise<RenderResult> {
    const errors: RenderError[] = [];
    const renderedLayers: string[] = [];
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 口パーツを置換したレイヤーパスのリストを作成
    let layerPaths: string[];
    try {
      layerPaths = this.replaceMouthLayer(options.layerPaths, options.mouthShape);
    } catch (error) {
      // 無効な口形状の場合
      options.layerPaths.forEach(path => {
        if (path.includes('!口/')) {
          errors.push({
            type: 'INVALID_MOUTH_SHAPE',
            details: `Invalid mouth shape: ${options.mouthShape}`,
            layerPath: path
          });
        }
      });
      return { success: false, errors, renderedLayers };
    }

    // 指定されたレイヤーパスに対応するレイヤーを検索
    type LayerType = LayersData['layers'][0];
    const targetLayers: Array<{ layer: LayerType; index: number; originalPath: string }> = [];
    
    for (let i = 0; i < layerPaths.length; i++) {
      const targetPath = layerPaths[i];
      const originalPath = options.layerPaths[i];
      const layerIndex = this.layersData.layers.findIndex(l => l.layerPath === targetPath);
      
      if (layerIndex === -1) {
        errors.push({
          type: 'LAYER_NOT_FOUND',
          details: `Layer not found: ${originalPath}`,
          layerPath: originalPath
        });
        continue;
      }
      targetLayers.push({ 
        layer: this.layersData.layers[layerIndex], 
        index: layerIndex,
        originalPath 
      });
    }

    // layers.json での出現順を逆順でソート（PSD形式: 配列の最後が背面、最初が前面）
    // インデックスが大きい順（配列の後ろから前へ）= 背面から前面へ描画
    targetLayers.sort((a, b) => b.index - a.index);

    // ソートされた順序で合成
    for (const { layer, originalPath } of targetLayers) {
      // キャッシュから画像を取得
      const image = this.imageCache.get(layer.filePath);
      if (!image) {
        errors.push({
          type: 'IMAGE_NOT_CACHED',
          details: `Image not found in cache: ${layer.filePath}`,
          layerPath: originalPath
        });
        continue;
      }

      // opacity が定義されている場合は適用
      const prevAlpha = ctx.globalAlpha;
      if (layer.opacity !== undefined && layer.opacity !== 1) {
        ctx.globalAlpha = layer.opacity;
      }

      // 画像を描画
      try {
        ctx.drawImage(image, layer.bounds.left, layer.bounds.top);
        renderedLayers.push(originalPath);
      } catch (error) {
        errors.push({
          type: 'CANVAS_ERROR',
          details: `Failed to draw image: ${error}`,
          layerPath: originalPath
        });
      }

      // アルファ値を復元
      ctx.globalAlpha = prevAlpha;
    }

    return {
      success: errors.length === 0,
      errors,
      renderedLayers
    };
  }

  /**
   * 必要な画像のファイルパスを取得
   */
  getRequiredImagePaths(layerPaths: string[]): string[] {
    const imagePaths = new Set<string>();

    // すべての口形状のレイヤーも含める
    const allLayerPaths = new Set(layerPaths);
    Object.values(this.mouthMapping).forEach(path => {
      allLayerPaths.add(path);
    });

    for (const targetPath of allLayerPaths) {
      const layer = this.layersData.layers.find(l => l.layerPath === targetPath);
      if (layer) {
        imagePaths.add(layer.filePath);
      }
    }

    return Array.from(imagePaths);
  }

  /**
   * 口パーツを置換したレイヤーパスのリストを返す
   */
  private replaceMouthLayer(layerPaths: string[], mouthShape: MouthShape): string[] {
    return layerPaths.map(path => {
      // 口パーツのパスかどうかを判定（"!口/"を含むかどうか）
      if (path.includes('!口/')) {
        const replacement = this.mouthMapping[mouthShape];
        if (!replacement) {
          throw new Error(`Invalid mouth shape: ${mouthShape}`);
        }
        return replacement;
      }
      return path;
    });
  }


  /**
   * キャンバスのサイズを取得
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.layersData.document.width,
      height: this.layersData.document.height
    };
  }
}