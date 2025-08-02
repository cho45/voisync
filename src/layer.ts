import type { LayersData, MouthShape, MouthLayerMapping, RenderResult, RenderError } from './types';

// 内部用：レイヤーとアルファ値の組み合わせ
interface LayerWithAlpha {
  layerPath: string;
  alpha: number;
}

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
   * 口形状を指定してレイヤーを描画（AnimationControllerから呼ばれる）
   */
  async renderWithMouthShapes(
    canvas: HTMLCanvasElement, 
    layerPaths: string[], 
    mouthShapes: Array<{shape: MouthShape, alpha: number}>
  ): Promise<RenderResult> {
    // 口レイヤーを展開
    const expandedLayers = this.expandLayersWithMouthShapes(layerPaths, mouthShapes);
    
    // デバッグ：複数の口形状がある場合はログ出力
    if (mouthShapes.length > 1) {
      console.log('Multiple mouth shapes:', mouthShapes);
      console.log('Expanded layers:', expandedLayers.filter(l => l.layerPath.includes('!口/')));
    }
    
    // 展開したレイヤーでrenderを呼び出す
    return this.render(canvas, expandedLayers);
  }

  /**
   * 指定されたレイヤーをcanvasに描画
   */
  async render(canvas: HTMLCanvasElement, layers: LayerWithAlpha[]): Promise<RenderResult> {
    const errors: RenderError[] = [];
    const renderedLayers: string[] = [];
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 指定されたレイヤーパスに対応するレイヤーを検索
    type LayerType = LayersData['layers'][0];
    const targetLayers: Array<{ layer: LayerType; index: number; layerPath: string; alpha: number }> = [];
    
    for (const layerInfo of layers) {
      const layerIndex = this.layersData.layers.findIndex(l => l.layerPath === layerInfo.layerPath);
      
      if (layerIndex === -1) {
        errors.push({
          type: 'LAYER_NOT_FOUND',
          details: `Layer not found: ${layerInfo.layerPath}`,
          layerPath: layerInfo.layerPath
        });
        continue;
      }
      targetLayers.push({ 
        layer: this.layersData.layers[layerIndex], 
        index: layerIndex,
        layerPath: layerInfo.layerPath,
        alpha: layerInfo.alpha
      });
    }

    // layers.json での出現順を逆順でソート（PSD形式: 配列の最後が背面、最初が前面）
    // インデックスが大きい順（配列の後ろから前へ）= 背面から前面へ描画
    targetLayers.sort((a, b) => b.index - a.index);

    // レイヤーの描画
    for (const { layer, layerPath, alpha } of targetLayers) {
      // キャッシュから画像を取得
      const image = this.imageCache.get(layer.filePath);
      if (!image) {
        errors.push({
          type: 'IMAGE_NOT_CACHED',
          details: `Image not found in cache: ${layer.filePath}`,
          layerPath: layerPath
        });
        continue;
      }

      // レイヤーのopacityと指定されたalphaを両方適用
      const prevAlpha = ctx.globalAlpha;
      const layerOpacity = layer.opacity ?? 1.0;
      const finalAlpha = layerOpacity * alpha;
      ctx.globalAlpha = finalAlpha;
      
      // デバッグ：口レイヤーのアルファ値を出力
      if (layerPath.includes('!口/') && alpha < 1.0) {
        console.log(`Drawing mouth layer: ${layerPath}, alpha: ${alpha}, final: ${finalAlpha}`);
      }

      // 画像を描画
      try {
        ctx.drawImage(image, layer.bounds.left, layer.bounds.top);
        renderedLayers.push(layerPath);
      } catch (error) {
        errors.push({
          type: 'CANVAS_ERROR',
          details: `Failed to draw image: ${error}`,
          layerPath: layerPath
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
   * レイヤーパスを展開し、口レイヤーを複数の口形状に置換
   */
  private expandLayersWithMouthShapes(layerPaths: string[], mouthShapes: Array<{shape: MouthShape, alpha: number}>): LayerWithAlpha[] {
    const expandedLayers: LayerWithAlpha[] = [];
    
    for (const path of layerPaths) {
      if (path.includes('!口/')) {
        // 口レイヤーは複数の口形状に展開
        for (const mouthShape of mouthShapes) {
          const replacedPath = this.mouthMapping[mouthShape.shape];
          if (replacedPath) {
            expandedLayers.push({
              layerPath: replacedPath,
              alpha: mouthShape.alpha
            });
          }
        }
      } else {
        // 通常のレイヤーはそのまま追加
        expandedLayers.push({
          layerPath: path,
          alpha: 1.0
        });
      }
    }
    
    return expandedLayers;
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