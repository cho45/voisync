import PSD from 'psd';
import fs from 'fs/promises';
import path from 'path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node expand-psd.js <psd-file>');
  process.exit(1);
}

const outputDir = file + '.expanded';
const layersInfo = [];

// メイン処理
async function main() {
  try {
    const psd = await PSD.open(file);
    
    // 出力ディレクトリが存在する場合は削除
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (err) {
      // ディレクトリが存在しない場合は無視
    }
    
    await fs.mkdir(outputDir, { recursive: true });
    
    const nodes = psd.tree().descendants();
    const imageNodes = nodes.filter(node => !node.isGroup() && !node.isEmpty());
    
    console.log(`Found ${imageNodes.length} image layers to export\n`);
    
    let processed = 0;
    for (const node of imageNodes) {
      processed++;
      const layerPath = node.path();
      const pathParts = layerPath.split('/').filter(p => p && p !== 'Root');
      
      // ファイルシステム用にサニタイズ
      const sanitizedParts = pathParts.map(part => part.replace(/[<>:"/\\|?*]/g, '_'));
      const filename = sanitizedParts.pop() + '.png';
      const relativePath = sanitizedParts.length > 0 ? path.join(...sanitizedParts, filename) : filename;
      const fullPath = path.join(outputDir, relativePath);
      
      // ディレクトリ作成
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // PNG保存
      await node.saveAsPng(fullPath);
      
      // レイヤー情報を記録
      layersInfo.push({
        name: node.name,
        layerPath: layerPath,
        filePath: relativePath,
        visible: node.visible(),
        opacity: node.opacity,
        bounds: {
          left: node.left,
          top: node.top,
          width: node.width,
          height: node.height
        }
      });
      
      console.log(`[${processed}/${imageNodes.length}] Exported: ${relativePath}`);
    }
    
    // layers.json を出力（PSD全体のサイズ情報を含める）
    const output = {
      document: {
        width: psd.tree().width,
        height: psd.tree().height
      },
      layers: layersInfo
    };
    
    await fs.writeFile(
      path.join(outputDir, 'layers.json'),
      JSON.stringify(output, null, 2)
    );
    
    console.log(`\nExport completed!`);
    console.log(`Output directory: ${outputDir}`);
    console.log(`Total layers exported: ${layersInfo.length}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();