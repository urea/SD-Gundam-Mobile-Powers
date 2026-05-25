
import { Card } from '../types';
import { getCardBaseId, getCardInstanceId } from './cardIdentity';

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

/**
 * Generates a compressed deck code string from an array of cards.
 * Uses short numeric IDs for base-card identities and counts for multiples.
 * Format: shortId1:count1_shortId2_shortId3:count3 (count of 1 is omitted)
 * @param deck - An array of Card objects with instanceId values.
 * @param baseCardToShortIdMap - Map from base card identity (e.g., "M-001") to short ID (e.g., 0).
 * @returns A compressed deck code string.
 */
export const generateCompressedDeckCode = (deck: Card[], baseCardToShortIdMap: Map<string, number>): string => {
  if (deck.length === 0) return '';

  const baseCardCounts: Map<string, number> = new Map();
  deck.forEach(cardInstance => {
    const baseNum = getCardBaseId(cardInstance);
    baseCardCounts.set(baseNum, (baseCardCounts.get(baseNum) || 0) + 1);
  });

  // Sort by short ID for consistent code generation
  const sortedBaseCardNumbers = Array.from(baseCardCounts.keys()).sort((a, b) => {
    const shortIdA = baseCardToShortIdMap.get(a);
    const shortIdB = baseCardToShortIdMap.get(b);
    if (shortIdA === undefined || shortIdB === undefined) return 0; // Should not happen
    return shortIdA - shortIdB;
  });

  return sortedBaseCardNumbers.map(baseNum => {
    const shortId = baseCardToShortIdMap.get(baseNum);
    if (shortId === undefined) {
      console.error(`Error generating deck code: No short ID for base card ${baseNum}`);
      return ''; // Should not happen with a complete map
    }
    const count = baseCardCounts.get(baseNum) || 0;
    return count > 1 ? `${shortId}:${count}` : `${shortId}`;
  }).filter(Boolean).join('_');
};

/**
 * Parses a compressed deck code string and reconstructs the deck.
 * @param code - The compressed deck code string (e.g., "0:2_1_57:3").
 * @param shortIdToBaseCardMap - Map from short ID (e.g., 0) to base card identity (e.g., "M-001").
 * @param fullCardInstancePool - Array of all possible card instances (e.g., instanceId "M-001#1", "M-001#2", ...).
 * @returns An array of Card objects for the deck, or null if parsing fails.
 */
export const parseCompressedDeckCode = (
  code: string,
  shortIdToBaseCardMap: Map<number, string>,
  fullCardInstancePool: Card[]
): Card[] | null => {
  if (!code.trim()) {
    console.error("Deck code parsing error: Code is empty.");
    return null;
  }

  const parts = code.split('_');
  const deck: Card[] = [];
  const usedInstancesCount: Map<string, number> = new Map(); // Tracks how many instances of a base card are used

  for (const part of parts) {
    const [shortIdStr, countStr] = part.split(':');
    const shortId = parseInt(shortIdStr, 10);
    const count = countStr ? parseInt(countStr, 10) : 1;

    if (isNaN(shortId) || isNaN(count) || count <= 0) {
      console.error(`Deck code parsing error: Invalid part "${part}" in code "${code}".`);
      return null;
    }

    const baseCardNumber = shortIdToBaseCardMap.get(shortId);
    if (!baseCardNumber) {
      console.error(`Deck code parsing error: No base card found for short ID ${shortId}.`);
      return null;
    }

    for (let i = 0; i < count; i++) {
      const currentInstanceSuffix = (usedInstancesCount.get(baseCardNumber) || 0) + 1;
      if (currentInstanceSuffix > 3) { // Assuming max 3 copies of any card
          console.error(`Deck code parsing error: Attempting to add more than 3 copies of ${baseCardNumber}. Short ID ${shortId}, requested count ${count}.`);
          return null;
      }
      
      const instanceCardNumber = `${baseCardNumber}#${currentInstanceSuffix}`;
      const cardInstance = fullCardInstancePool.find(c => getCardInstanceId(c) === instanceCardNumber);

      if (!cardInstance) {
        console.error(`Deck code parsing error: Instance "${instanceCardNumber}" for base card ${baseCardNumber} (short ID ${shortId}) not found in pool.`);
        return null;
      }
      deck.push(cardInstance);
      usedInstancesCount.set(baseCardNumber, currentInstanceSuffix);
    }
  }

  if (deck.length < 55 || deck.length > 100) {
    console.error(`Deck code validation error: Reconstructed deck has ${deck.length} cards, expected between 55 and 100.`);
    return null;
  }

  return deck;
};
