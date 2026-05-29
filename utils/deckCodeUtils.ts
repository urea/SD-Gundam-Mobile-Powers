
import { Card } from '../types';
import { getCardBaseId, getCardInstanceId } from './cardIdentity';

const DECK_CODE_V2_PREFIX = 'v2|';
const DECK_CODE_PART_SEPARATOR = '_';
const DECK_CODE_COUNT_SEPARATOR = ':';
const MIN_DECK_SIZE = 55;
const MAX_DECK_SIZE = 100;
const MAX_CARD_COPIES = 3;

/**
 * Creates a pool of card instances. For Mobile Powers, each unique base card
 * (e.g., M-001 or M-046-2) is typically considered to have 3 copies available for deck building.
 * This function generates these instances, each with a unique instanceId (e.g., "M-001#1", "M-001#2").
 * Deck codes refer to base-card identities, not display card numbers.
 * @param baseCards - An array of base cards (typically from parsing the main TSV data).
 * @returns An array of card instances, with each base card appearing 3 times with unique IDs.
 */
export const createFullCardInstancePool = (baseCards: Card[]): Card[] => {
  const pool: Card[] = [];
  const gamePlayableBaseCards = baseCards.filter(card => card.type === 'M' || card.type === 'C');

  gamePlayableBaseCards.forEach(baseCard => {
    const baseId = getCardBaseId(baseCard);
    for (let i = 0; i < 3; i++) {
      pool.push({
        ...baseCard,
        instanceId: `${baseId}#${i + 1}`,
      });
    }
  });
  return pool;
};

export const createLegacyShortIdToBaseCardMap = (baseCards: Card[]): Map<number, string> => {
  const legacyBaseIds = Array.from(new Set(baseCards
    .filter(card => card.type === 'M' || card.type === 'C')
    .map(getCardBaseId)
  )).sort((a, b) => a.localeCompare(b));

  return new Map(legacyBaseIds.map((baseId, index) => [index, baseId]));
};

/**
 * Generates a stable deck code string from an array of cards.
 * Uses Card.uniqueKey/cardNumber directly so new cards do not shift old deck codes.
 * Format: v2|baseId1:count1_baseId2_baseId3:count3 (count of 1 is omitted)
 * @param deck - An array of Card objects with instanceId values.
 * @returns A compressed deck code string.
 */
export const generateCompressedDeckCode = (deck: Card[]): string => {
  if (deck.length === 0) return '';

  const baseCardCounts: Map<string, number> = new Map();
  deck.forEach(cardInstance => {
    const baseNum = getCardBaseId(cardInstance);
    baseCardCounts.set(baseNum, (baseCardCounts.get(baseNum) || 0) + 1);
  });

  const sortedBaseCardNumbers = Array.from(baseCardCounts.keys()).sort((a, b) => a.localeCompare(b));

  const body = sortedBaseCardNumbers.map(baseNum => {
    const count = baseCardCounts.get(baseNum) || 0;
    return count > 1 ? `${baseNum}${DECK_CODE_COUNT_SEPARATOR}${count}` : baseNum;
  }).filter(Boolean).join(DECK_CODE_PART_SEPARATOR);

  return `${DECK_CODE_V2_PREFIX}${body}`;
};

const reconstructDeckFromBaseCounts = (
  baseCounts: Array<{ baseCardNumber: string; count: number }>,
  fullCardInstancePool: Card[]
): Card[] | null => {
  const deck: Card[] = [];
  const usedInstancesCount: Map<string, number> = new Map();

  for (const { baseCardNumber, count } of baseCounts) {
    for (let i = 0; i < count; i++) {
      const currentInstanceSuffix = (usedInstancesCount.get(baseCardNumber) || 0) + 1;
      if (currentInstanceSuffix > MAX_CARD_COPIES) {
        console.error(`Deck code parsing error: Attempting to add more than ${MAX_CARD_COPIES} copies of ${baseCardNumber}. Requested count ${count}.`);
        return null;
      }

      const instanceCardNumber = `${baseCardNumber}#${currentInstanceSuffix}`;
      const cardInstance = fullCardInstancePool.find(c => getCardInstanceId(c) === instanceCardNumber);

      if (!cardInstance) {
        console.error(`Deck code parsing error: Instance "${instanceCardNumber}" for base card ${baseCardNumber} not found in pool.`);
        return null;
      }
      deck.push(cardInstance);
      usedInstancesCount.set(baseCardNumber, currentInstanceSuffix);
    }
  }

  if (deck.length < MIN_DECK_SIZE || deck.length > MAX_DECK_SIZE) {
    console.error(`Deck code validation error: Reconstructed deck has ${deck.length} cards, expected between ${MIN_DECK_SIZE} and ${MAX_DECK_SIZE}.`);
    return null;
  }

  return deck;
};

const parseV2DeckCode = (code: string, fullCardInstancePool: Card[]): Card[] | null => {
  const body = code.slice(DECK_CODE_V2_PREFIX.length);
  if (!body.trim()) {
    console.error("Deck code parsing error: Code body is empty.");
    return null;
  }

  const baseCounts = body.split(DECK_CODE_PART_SEPARATOR).map(part => {
    const [baseCardNumber, countStr] = part.split(DECK_CODE_COUNT_SEPARATOR);
    const count = countStr ? parseInt(countStr, 10) : 1;
    return { baseCardNumber, count, part };
  });

  if (baseCounts.some(({ baseCardNumber, count }) => !baseCardNumber || isNaN(count) || count <= 0)) {
    console.error(`Deck code parsing error: Invalid v2 code "${code}".`);
    return null;
  }

  return reconstructDeckFromBaseCounts(baseCounts, fullCardInstancePool);
};

const parseLegacyNumericDeckCode = (
  code: string,
  shortIdToBaseCardMap: Map<number, string>,
  fullCardInstancePool: Card[]
): Card[] | null => {
  const baseCounts = code.split(DECK_CODE_PART_SEPARATOR).map(part => {
    const [shortIdStr, countStr] = part.split(DECK_CODE_COUNT_SEPARATOR);
    const shortId = parseInt(shortIdStr, 10);
    const count = countStr ? parseInt(countStr, 10) : 1;
    const baseCardNumber = shortIdToBaseCardMap.get(shortId);

    if (isNaN(shortId) || isNaN(count) || count <= 0 || !baseCardNumber) {
      console.error(`Deck code parsing error: Invalid legacy part "${part}" in code "${code}".`);
      return null;
    }

    return { baseCardNumber, count };
  });

  if (baseCounts.some(part => part === null)) {
    return null;
  }

  return reconstructDeckFromBaseCounts(
    baseCounts as Array<{ baseCardNumber: string; count: number }>,
    fullCardInstancePool
  );
};

/**
 * Parses a deck code string and reconstructs the deck.
 * v2 codes use stable card identities, while legacy codes use the old short numeric ID map.
 * @param code - The deck code string (e.g., "v2|M-001:2_C-001" or legacy "0:2_1_57:3").
 * @param shortIdToBaseCardMap - Legacy map from short ID to the old sorted base-card identity.
 * @param fullCardInstancePool - Array of all possible card instances (e.g., instanceId "M-001#1", "M-001#2", ...).
 * @returns An array of Card objects for the deck, or null if parsing fails.
 */
export const parseCompressedDeckCode = (
  code: string,
  shortIdToBaseCardMap: Map<number, string>,
  fullCardInstancePool: Card[]
): Card[] | null => {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    console.error("Deck code parsing error: Code is empty.");
    return null;
  }

  if (trimmedCode.startsWith(DECK_CODE_V2_PREFIX)) {
    return parseV2DeckCode(trimmedCode, fullCardInstancePool);
  }

  return parseLegacyNumericDeckCode(trimmedCode, shortIdToBaseCardMap, fullCardInstancePool);
};
