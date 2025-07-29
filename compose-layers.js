import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

// 合成するレイヤーパスのリスト（ハードコード）
const layerPaths = [
  '!枝豆/*枝豆通常',
  '!眉/*普通眉',
  '!目/*目セット/!黒目/*カメラ目線',
  '!目/*目セット/*普通白目',
  '!顔色/*ほっぺ',
  '!口/*むふ',
  '*服装1/!右腕/*基本',
  '*服装1/!左腕/*基本',
  '*服装1/*いつもの服',
  '尻尾的なアレ'
];

// PSDのディレクトリパス
const psdExpandedDir = 'assets/ずんだもん立ち絵素材2.3/ずんだもん立ち絵素材2.3.psd.expanded';

async function main() {
  try {
    // layers.json を読み込む
    const layersJsonPath = path.join(psdExpandedDir, 'layers.json');
    const layersData = JSON.parse(await fs.readFile(layersJsonPath, 'utf-8'));
    
    const { document: doc, layers } = layersData;
    
    // キャンバスを作成（PSDと同じサイズ）
    const canvas = createCanvas(doc.width, doc.height);
    const ctx = canvas.getContext('2d');
    
    // 背景を透明にする
    ctx.clearRect(0, 0, doc.width, doc.height);
    
    console.log(`Canvas size: ${doc.width}x${doc.height}`);
    console.log(`Composing ${layerPaths.length} layers...\n`);
    
    // 指定されたレイヤーパスに対応するレイヤーを検索
    const targetLayers = [];
    for (const targetPath of layerPaths) {
      const layerIndex = layers.findIndex(l => l.layerPath === targetPath);
      if (layerIndex === -1) {
        console.log(`Warning: Layer not found: ${targetPath}`);
        continue;
      }
      targetLayers.push({ layer: layers[layerIndex], index: layerIndex });
    }
    
    // layers.json での出現順（インデックスが大きい順 = 背面から）でソート
    targetLayers.sort((a, b) => b.index - a.index);
    
    // ソートされた順序で合成
    for (const { layer } of targetLayers) {
      // 画像ファイルのパスを構築
      const imagePath = path.join(psdExpandedDir, layer.filePath);
      
      try {
        // 画像を読み込む
        const image = await loadImage(imagePath);
        
        // opacity が定義されている場合は適用
        if (layer.opacity !== undefined && layer.opacity !== 1) {
          ctx.globalAlpha = layer.opacity;
        } else {
          ctx.globalAlpha = 1;
        }
        
        // 画像を描画
        ctx.drawImage(image, layer.bounds.left, layer.bounds.top);
        
        console.log(`Composed: ${layer.name} (${layer.layerPath})`);
      } catch (err) {
        console.error(`Error loading image for layer ${layer.name}: ${err.message}`);
      }
    }
    
    // 結果をPNGとして保存
    const outputPath = 'output.png';
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
    
    console.log(`\nComposition complete!`);
    console.log(`Output saved to: ${outputPath}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
