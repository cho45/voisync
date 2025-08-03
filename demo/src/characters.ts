import type { CharacterConfig } from '@voisync/types';

// キャラクター設定のレジストリ
export const characters: Record<string, CharacterConfig> = {
  zundamon: {
    id: 'zundamon',
    name: 'ずんだもん',
    layersPath: '/ずんだもん立ち絵素材2.3/ずんだもん立ち絵素材2.3.psd.expanded/layers.json',
    baseLayers: [
      '!枝豆/*枝豆通常',
      '!眉/*普通眉',
      '!目/*目セット/!黒目/*カメラ目線',
      '!目/*目セット/*普通白目',
      '!顔色/*ほっぺ',
      '!口/*むふ',
      '*服装1/!右腕/*腰',
      '*服装1/!左腕/*腰',
      '*服装1/*いつもの服',
      '尻尾的なアレ'
    ],
    mouthMapping: {
      'a': '!口/*んあー',   // 「あ」に近い形
      'i': '!口/*んへー',   // 「い」に近い形  
      'u': '!口/*お',      // 「う」の形
      'e': '!口/*んへー',   // 「え」に近い形
      'o': '!口/*お',      // 「お」の形
      'n': '!口/*んー',    // 「ん」の形
      'closed': '!口/*むふ', // 閉じた口
    }
  },
  shikokumetan: {
    id: 'shikokumetan',
    name: '四国めたん',
    layersPath: '/四国めたん立ち絵素材2.1/四国めたん立ち絵素材2.1.psd.expanded/layers.json',
    baseLayers: [
      "!前髪もみあげ",
      "頭部アクセサリ/ヘッドドレス",
      "頭部アクセサリ/髪留めフリル",
      "!眉/*太眉ごきげん",
      "!目/*目セット/!黒目/*カメラ目線",
      "!目/*目セット/*普通白目",
      "!口/*ほほえみ",
      "!顔色/*普通2",
      "*白ロリ服/!左腕/*抱える",
      "*白ロリ服/!右腕/*手をかざす",
      "*白ロリ服/!体",
      "ツインドリル左",
      "ツインドリル右",
    ],
    mouthMapping: {
      'a': '!口/*わあー',   // 「あ」に近い形
      'i': '!口/*いー',   // 「い」に近い形  
      'u': '!口/*お',      // 「う」の形
      'e': '!口/*うえー',   // 「え」に近い形
      'o': '!口/*お',      // 「お」の形
      'n': '!口/*ほほえみ',    // 「ん」の形
      'closed': '!口/*ほほえみ', // 閉じた口
    }
  },
  // 他のキャラクターはここに追加
  // example: {
  //   id: 'example',
  //   name: 'サンプルキャラ',
  //   layersPath: '/example/layers.json',
  //   baseLayers: [...],
  //   mouthMapping: {...}
  // }
};

// デフォルトキャラクターID
export const defaultCharacterId = 'zundamon';

// キャラクター一覧を取得
export function getCharacterList() {
  return Object.values(characters).map(char => ({
    id: char.id,
    name: char.name
  }));
}

// 特定のキャラクター設定を取得
export function getCharacterConfig(id: string): CharacterConfig | undefined {
  return characters[id];
}
