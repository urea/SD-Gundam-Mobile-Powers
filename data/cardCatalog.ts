import type { Card } from '../types';
import { STARTER_VER_1_SOURCE_SET, carddas20Cards } from './carddas20Cards';

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
  return carddas20Cards
    .filter(card => getCardSourceSet(card) === STARTER_VER_1_SOURCE_SET)
    .map(toCatalogCard);
};

export const loadCarddas20CatalogCards = async (): Promise<CatalogCard[]> => {
  return carddas20Cards.map(toCatalogCard);
};

export const loadFullCardCatalog = async (): Promise<CatalogCard[]> => {
  return loadCarddas20CatalogCards();
};
