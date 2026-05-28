import type { Card } from '../types';

export const parseMobilePowersTsvData = (tsv: string): Card[] => {
  if (!tsv.trim()) {
    return [];
  }
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map(h => h.trim());
  const cards: Card[] = [];

  const getHeaderIndex = (headerName: string): number => {
    const index = headers.indexOf(headerName);
    if (index === -1) console.warn(`TSV Parser: Header "${headerName}" not found.`);
    return index;
  };

  const h_uniqueKey = getHeaderIndex('Unique_Key');
  const h_cardNumber = getHeaderIndex('Card_Number');
  const h_cardName = getHeaderIndex('Card_Name');
  const h_cardNameOmm = getHeaderIndex('Card_Name_Omm');
  const h_type = getHeaderIndex('Type');
  const h_points = getHeaderIndex('Points');
  const h_flavorAbility = getHeaderIndex('Flavor_Ability');
  const h_terrainTypeMCards = getHeaderIndex('Terrain_Type_M_cards');
  const h_battlefieldTerrain = getHeaderIndex('Battlefield_Terrain');
  const h_factionAffiliation = getHeaderIndex('Faction_Affiliation');
  const h_tags = getHeaderIndex('Other_Notes');
  const h_effect = getHeaderIndex('Effect');
  const h_gameVar = getHeaderIndex('Var');
  const h_imgURL = getHeaderIndex('imgURL');

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim());
    if (values.length < headers.length) {
      console.warn(`Skipping malformed line ${i + 1}: expected ${headers.length} values, got ${values.length}. Line: ${lines[i]}`);
      continue;
    }

    const cardNumber = values[h_cardNumber] || '';
    const rawUniqueKey = h_uniqueKey !== -1 ? values[h_uniqueKey] : '';
    const uniqueKey = rawUniqueKey && /^[A-Z]+-\d{2,4}(?:-\d+)?$/.test(rawUniqueKey)
      ? rawUniqueKey
      : cardNumber;

    const card: Card = {
      uniqueKey,
      cardNumber,
      cardName: values[h_cardName] || '',
      cardNameOmm: values[h_cardNameOmm] || '',
      type: values[h_type] || '',
      points: values[h_points] || '',
      textAbility: values[h_flavorAbility] || '',
      terrainTypeMCards: values[h_terrainTypeMCards] || '',
      battlefieldTerrain: values[h_battlefieldTerrain] || '',
      factionAffiliation: values[h_factionAffiliation] || '',
      tags: (h_tags !== -1 && values[h_tags]) ? values[h_tags] : '',
      effect: (h_effect !== -1 && values[h_effect] && values[h_effect].trim() !== '') ? values[h_effect].trim() : undefined,
      gameVar: (h_gameVar !== -1 && values[h_gameVar]) ? values[h_gameVar] : '',
      imageUrl: (h_imgURL !== -1 && values[h_imgURL] && values[h_imgURL].trim() !== '') ? values[h_imgURL].trim() : undefined,
    };
    cards.push(card);
  }
  return cards;
};
