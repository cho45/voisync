import type { LayersData, MouthShape, MouthLayerMapping, RenderResult } from './types';
interface LayerWithAlpha {
    layerPath: string;
    alpha: number;
}
export declare class LayersRenderer {
    private imageCache;
    private layersData;
    private mouthMapping;
    constructor(layersData: LayersData, imageCache: Map<string, HTMLImageElement | ImageBitmap>, mouthMapping: MouthLayerMapping);
    /**
     * 口形状を指定してレイヤーを描画（AnimationControllerから呼ばれる）
     */
    renderWithMouthShapes(canvas: HTMLCanvasElement, layerPaths: string[], mouthShapes: Array<{
        shape: MouthShape;
        alpha: number;
    }>): Promise<RenderResult>;
    /**
     * 指定されたレイヤーをcanvasに描画
     */
    render(canvas: HTMLCanvasElement, layers: LayerWithAlpha[]): Promise<RenderResult>;
    /**
     * 必要な画像のファイルパスを取得
     */
    getRequiredImagePaths(layerPaths: string[]): string[];
    /**
     * レイヤーパスを展開し、口レイヤーを複数の口形状に置換
     */
    private expandLayersWithMouthShapes;
    /**
     * キャンバスのサイズを取得
     */
    getCanvasSize(): {
        width: number;
        height: number;
    };
}
export {};
//# sourceMappingURL=layer.d.ts.map