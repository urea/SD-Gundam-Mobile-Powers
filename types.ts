
import React from 'react';

export interface RuleSectionContent {
  title: string;
  japaneseTitle: string;
  content: React.ReactNode;
}

export interface Card {
  cardNumber: string;
  cardName: string;
  cardNameOmm: string;
  type: 'M' | 'C' | string; // M for Mobile Suit/Mecha, C for Character/Command/Item
  points: string; // Numeric string for M-cards, empty for C-cards
  textAbility: string; // For M-Cards: Flavor_Ability. For C-Cards: Flavor_Ability (tagline).
  terrainTypeMCards: string; // Terrain suitability for M-cards
  battlefieldTerrain: string; // Terrain applicability for C-cards or general
  factionAffiliation: string;
  tags: string; // Previously otherNotes, represents space-separated tags.
  effect?: string; // Effect text, primarily for C-Cards.
  gameVar: string; // Stores the 'Var' column from the TSV data (e.g., St1, Ki1)
  imageUrl?: string; // Optional: URL or path to the card image
  fieldOrder?: number; // Preserves the original squad order in mixed field displays.
  isDestroyed?: boolean; // Keeps a destroyed card visible on the battlefield until combat cleanup.
}

export interface Combo {
  name: string;
  points: number;
}

// New types for Game Play
export type GamePhase =
  | 'SETUP'
  | 'FORMATION_PLAYER_DRAW'
  | 'FORMATION_PLAYER_PLACE'
  | 'FORMATION_CPU_DRAW'
  | 'FORMATION_CPU_PLACE'
  | 'FORMATION_CHECK_FULL'
  | 'DEPLOYMENT_PLAYER_TERRAIN'
  | 'DEPLOYMENT_CPU_TERRAIN' // If player couldn't make anyone deploy
  | 'DEPLOYMENT_MOVE_CARDS'
  | 'DEPLOYMENT_CHECK_UNILATERAL'
  | 'DEPLOYMENT_HANDLE_TAPPED'
  | 'COMBAT_CALCULATE_INITIAL_POINTS'
  | 'COUNTER_SUPPORT_PLAYER_DRAW'
  | 'COUNTER_SUPPORT_PLAYER_PLAY_C'
  | 'COUNTER_SUPPORT_CPU_DRAW'
  | 'COUNTER_SUPPORT_CPU_PLAY_C'
  | 'COMBAT_RESOLUTION'
  | 'END_TURN_CLEANUP'
  | 'GAME_OVER';

export type PlayerType = 'PLAYER' | 'CPU';

export interface PlayerState {
  deck: Card[];
  hand: Card[];
  squad: Card[];
  battlefield: Card[];
  defeatPile: Card[]; // For敗戦ポイント
  discardPile: Card[];
  defeatPoints: number;
  combatPoints: number;
  // appliedCombos: Combo[]; // Optional: if we need to store active combos beyond logging
}

export interface LogEntry {
  message: string;
  source: 'PLAYER' | 'CPU' | 'SYSTEM';
  timestamp: number;
}

export interface CombatCardSummary {
  cardNumber: string;
  name: string;
  sourceCard: Card;
  imageUrl?: string;
  basePoints: number;
  tagBonus: number;
  tagDetails: string[];
  total: number;
  terrain: string;
}

export interface CombatSideSummary {
  cards: CombatCardSummary[];
  baseTotal: number;
  tagTotal: number;
  comboTotal: number;
  supportDelta: number;
  finalTotal: number;
  combos: Combo[];
  tagLogs: string[];
}

export interface PlayedCCardSummary {
  owner: PlayerType;
  cardNumber: string;
  name: string;
  imageUrl?: string;
  effect: string;
  sourceCard: Card;
}

export interface BattleSummary {
  player: CombatSideSummary;
  cpu: CombatSideSummary;
  cCardLogs: string[];
  tagLogs: string[];
  playedCCards: PlayedCCardSummary[];
}

export interface GameState {
  phase: GamePhase;
  activePlayer: PlayerType; // Who's turn it is to make a primary action
  turnOrder: [PlayerType, PlayerType]; // e.g. [PLAYER, CPU] if player is first
  player: PlayerState;
  cpu: PlayerState;
  currentTerrainCard: Card | null;
  battlefieldTerrainAttribute: string | null; // e.g., "宇", "陸", "海", "空" from the terrain card
  gameLog: LogEntry[];
  winner: PlayerType | null;
  isPlayerTurnInteractive: boolean; // Controls when player can interact vs waiting for CPU or animations
  isCPUMoving: boolean; // To show CPU thinking/acting indicator
  counterSupportTurnOrder: PlayerType[] | null;
  currentCounterSupportActorIndex: number;
}

export interface CPUAction {
  action: 'PLAY_M_CARD' | 'DISCARD_TO_DEFEAT' | 'PLAY_C_CARD' | 'SELECT_TERRAIN' | 'NO_ACTION' | 'DISCARD_FROM_HAND'; // Added DISCARD_FROM_HAND
  cardId?: string; // card.cardNumber of the card to play or discard
  targetCardId?: string; // For C-Cards that target
  reasoning?: string; // Optional: CPU decision explanation
}

// For Deck Editor Local Storage
export interface SavedDeck {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  cardCount: number; 
}
