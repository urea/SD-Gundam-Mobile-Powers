import type { Card } from '../types';

export const STARTER_VER_1_SOURCE_SET = 'スターター Ver.1';

const SOURCE_SET_BY_GAME_VAR: Record<string, string> = {
  St1: STARTER_VER_1_SOURCE_SET,
};

let carddas20CardsPromise: Promise<Card[]> | null = null;

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

export const isPlayableCard = (card: Card): boolean => card.type === 'M' || card.type === 'C';

export const loadCarddas20Cards = async (): Promise<Card[]> => {
  carddas20CardsPromise ??= import('./carddas20Cards').then(module => module.carddas20Cards);
  return carddas20CardsPromise;
};

export const loadCardsByPredicate = async (
  predicate: (card: Card) => boolean,
): Promise<Card[]> => {
  const cards = await loadCarddas20Cards();
  return cards.filter(predicate);
};

export const loadCatalogCardsByPredicate = async (
  predicate: (card: Card) => boolean,
): Promise<CatalogCard[]> => {
  const cards = await loadCardsByPredicate(predicate);
  return cards.map(toCatalogCard);
};

export const loadCarddas20CatalogCards = async (): Promise<CatalogCard[]> => {
  const carddas20Cards = await loadCarddas20Cards();
  return carddas20Cards.map(toCatalogCard);
};

export const loadFullCardCatalog = async (): Promise<CatalogCard[]> => {
  return loadCarddas20CatalogCards();
};
