import type { LayersData, MouthLayerMapping, RenderOptions, RenderResult } from './types';
export declare class LayersRenderer {
    private imageCache;
    private layersData;
    private mouthMapping;
    constructor(layersData: LayersData, imageCache: Map<string, HTMLImageElement | ImageBitmap>, mouthMapping: MouthLayerMapping);
    /**
     * 指定されたレイヤーをcanvasに描画
     */
    render(canvas: HTMLCanvasElement, options: RenderOptions): Promise<RenderResult>;
    /**
     * 必要な画像のファイルパスを取得
     */
    getRequiredImagePaths(layerPaths: string[]): string[];
    /**
     * 口パーツを置換したレイヤーパスのリストを返す
     */
    private replaceMouthLayer;
    /**
     * キャンバスのサイズを取得
     */
    getCanvasSize(): {
        width: number;
        height: number;
    };
}
//# sourceMappingURL=layer.d.ts.map