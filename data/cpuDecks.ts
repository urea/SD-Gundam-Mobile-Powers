import { Card } from '../types'; // Assuming Card type might be needed, though not directly for codes.

export interface PredefinedDeck {
  id: string; // Unique ID for the deck
  name: string;
  description: string;
  code: string; // Compressed deck code
}

export const cpuDeckPresets: PredefinedDeck[] = [
  {
    id: 'cpu_deck_eff_first',
    name: '#地球連邦 #スターター１ #ファースト',
    description: '初代ガンダムシリーズの地球連邦軍を中心としたデッキです。',
    code: '0:3_2:3_19:3_28:3_31:3_34:3_35:3_40:3_49:3_56:3_58:3_60:3_61:3_62:2_64:2_65:2_66:2_67:2_72:2_74:2_76:2',
  },
  {
    id: 'cpu_deck_zeon_first',
    name: '#ジオン #スターター１ #ファースト',
    description: '初代ガンダムシリーズのジオン公国軍を中心としたデッキです。',
    code: '6:2_7:2_9:2_24:3_25:3_26:3_27:3_28:3_30:3_31:2_37:2_38:2_39:2_42:2_45:2_47:2_49:2_51:2_52:2_56:3_69:3_70_71_72_76:2',
  },
  {
    id: 'cpu_deck_standard_001',
    name: '標準CPUデッキ',
    description: 'バランスの取れた標準的なCPUデッキです。',
    code: '0:2_1:2_2:2_3:2_4:2_5_6_7_8_9_10_11_12_13_14_15_16_17_18_19_20_21_22_23_24_25_26_27_28_29_30_31_32_33_34_35_36_37_38_39_40_41_42_43_44_45_46_47_48_49',
  },
  {
    id: 'cpu_deck_gundam_theme_001',
    name: 'ガンダム中心テーマデッキ',
    description: 'ガンダムタイプのMSを多く採用したテーマデッキです。',
    code: '0:3_1:3_2:3_10:3_16:3_17:3_21:3_31:3_40:3_42:3_43:3_44:3_46:3_48:3_58:2_59:2_60_61_62_63_64_65_66_67_68',
  },
];