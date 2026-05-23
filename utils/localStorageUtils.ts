
import { SavedDeck } from '../types';

const SAVED_DECKS_STORAGE_KEY = 'mobilePowersUserDecks';

const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const getSavedDecks = (): SavedDeck[] => {
  try {
    const decksJson = localStorage.getItem(SAVED_DECKS_STORAGE_KEY);
    if (decksJson) {
      const parsedDecks = JSON.parse(decksJson) as SavedDeck[];
      // Sort by updatedAt descending (newest first)
      return parsedDecks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  } catch (error) {
    console.error("Error reading saved decks from local storage:", error);
  }
  return [];
};

export const saveDeck = (deckData: { name: string; code: string; cardCount: number; id?: string }): SavedDeck | null => {
  try {
    const decks = getSavedDecks();
    const now = new Date().toISOString();
    let deckToSave: SavedDeck;

    if (deckData.id) { // Update existing deck
      const existingDeckIndex = decks.findIndex(d => d.id === deckData.id);
      if (existingDeckIndex > -1) {
        deckToSave = {
          ...decks[existingDeckIndex],
          name: deckData.name,
          code: deckData.code,
          cardCount: deckData.cardCount,
          updatedAt: now,
        };
        decks[existingDeckIndex] = deckToSave;
      } else {
        // ID provided but not found, treat as new (or could error)
        console.warn(`Deck with ID ${deckData.id} not found for update, saving as new.`);
        deckToSave = {
          id: generateUniqueId(),
          name: deckData.name,
          code: deckData.code,
          cardCount: deckData.cardCount,
          createdAt: now,
          updatedAt: now,
        };
        decks.push(deckToSave);
      }
    } else { // Save new deck
      deckToSave = {
        id: generateUniqueId(),
        name: deckData.name,
        code: deckData.code,
        cardCount: deckData.cardCount,
        createdAt: now,
        updatedAt: now,
      };
      decks.push(deckToSave);
    }

    localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(decks));
    return deckToSave;
  } catch (error) {
    console.error("Error saving deck to local storage:", error);
    return null;
  }
};

export const deleteDeck = (deckId: string): boolean => {
  try {
    let decks = getSavedDecks();
    const initialLength = decks.length;
    decks = decks.filter(deck => deck.id !== deckId);
    if (decks.length < initialLength) {
      localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(decks));
      return true;
    }
    return false; // Deck not found
  } catch (error) {
    console.error("Error deleting deck from local storage:", error);
    return false;
  }
};
