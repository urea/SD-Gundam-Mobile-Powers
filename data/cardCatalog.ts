import type { Card } from '../types';
import { parseMobilePowersTsvData } from './cardTsvParser';
import { starterVer1TsvData } from './starterVer1Cards';

export const STARTER_VER_1_SOURCE_SET = 'スターター Ver.1';

const SOURCE_SET_BY_GAME_VAR: Record<string, string> = {
  St1: STARTER_VER_1_SOURCE_SET,
};

export interface CatalogCard extends Card {
  displayTerrain: string;
  pointsNum: number;
  sourceSet: string;
}

export const getCardSourceSet = (card: Card): string => {
  if (card.sourceSet) return card.sourceSet;
  const gameVar = card.gameVar.trim();
  if (!gameVar) return '未分類';
  return SOURCE_SET_BY_GAME_VAR[gameVar] || gameVar;
};

export const toCatalogCard = (card: Card): CatalogCard => ({
  ...card,
  displayTerrain: card.type === 'M' ? card.terrainTypeMCards : card.battlefieldTerrain,
  pointsNum: card.type === 'M' && card.points ? parseInt(card.points) : -1,
  sourceSet: getCardSourceSet(card),
});

export const getStarterVer1CatalogCards = (): CatalogCard[] => {
  return parseMobilePowersTsvData(starterVer1TsvData).map(toCatalogCard);
};

export const loadCarddas20CatalogCards = async (): Promise<CatalogCard[]> => {
  const module = await import('./carddas20ViewerCards');
  return module.carddas20ViewerCards.map(toCatalogCard);
};

export const loadFullCardCatalog = async (): Promise<CatalogCard[]> => {
  const starterCards = getStarterVer1CatalogCards();
  const carddas20Cards = await loadCarddas20CatalogCards();
  return [...starterCards, ...carddas20Cards];
};
