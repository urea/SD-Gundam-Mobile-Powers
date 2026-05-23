
import { Card, GameState, CPUAction } from '../types';

// Helper function to simulate thinking time (UX only)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function (similar to GamePage's canDeploy)
const canDeployToTerrain = (mCard: Card, terrainAttribute: string | null): boolean => {
    if (mCard.type !== 'M' || !mCard.terrainTypeMCards || !terrainAttribute) return false;
    // Terrain attribute can be like "宇空" or "宇". Card terrain can be "宇陸".
    // Card can deploy if ANY of its terrain types are present in the battlefieldTerrainAttribute.
    for (const unitTerrainChar of mCard.terrainTypeMCards) { // e.g., "宇", "陸"
        if (terrainAttribute.includes(unitTerrainChar)) {
            return true;
        }
    }
    return false;
};

// --- Rule-Based Logic Functions ---

export const getCPUFormationAction = async (gameState: GameState): Promise<CPUAction> => {
  await delay(800); // Small delay for UX

  const cpuState = gameState.cpu;
  let reasoning = "";

  // Priority 1: Play an M-card if squad is not full
  if (cpuState.squad.length < 3) {
    const mCardsInHand = cpuState.hand.filter(c => c.type === 'M');
    if (mCardsInHand.length > 0) {
      // Sort M-cards by points (descending), then by card number (ascending) for tie-breaking
      mCardsInHand.sort((a, b) => {
        const pointsA = parseInt(a.points) || 0;
        const pointsB = parseInt(b.points) || 0;
        if (pointsB !== pointsA) {
          return pointsB - pointsA;
        }
        return a.cardNumber.localeCompare(b.cardNumber);
      });
      const cardToPlay = mCardsInHand[0];
      reasoning = `Rule-based: Play highest point M-card (${cardToPlay.cardNameOmm || cardToPlay.cardName}) to squad.`;
      return { action: 'PLAY_M_CARD', cardId: cardToPlay.cardNumber, reasoning };
    }
  }

  // Priority 2: Discard a card if M-card cannot be placed and hand is not empty
  if (cpuState.hand.length > 0) {
    let cardToDiscard: Card | undefined;
    // Prefer discarding C-cards
    const cCardsInHand = cpuState.hand.filter(c => c.type === 'C');
    if (cCardsInHand.length > 0) {
      // Simple: discard the first C-card found
      cardToDiscard = cCardsInHand.sort((a,b) => a.cardNumber.localeCompare(b.cardNumber))[0];
      reasoning = `Rule-based: Discard C-card (${cardToDiscard.cardNameOmm || cardToDiscard.cardName}) as no M-card can be played or squad is full.`;
    } else {
      // If no C-cards, discard the lowest point M-card
      const mCardsInHand = cpuState.hand.filter(c => c.type === 'M');
        if (mCardsInHand.length > 0) {
            mCardsInHand.sort((a, b) => {
                const pointsA = parseInt(a.points) || 0;
                const pointsB = parseInt(b.points) || 0;
                if (pointsA !== pointsB) {
                return pointsA - pointsB;
                }
                return a.cardNumber.localeCompare(b.cardNumber);
            });
            cardToDiscard = mCardsInHand[0];
            reasoning = `Rule-based: Discard lowest point M-card (${cardToDiscard.cardNameOmm || cardToDiscard.cardName}) as no C-cards to discard.`;
        }
    }

    if (cardToDiscard) {
      return { action: 'DISCARD_TO_DEFEAT', cardId: cardToDiscard.cardNumber, reasoning };
    } else if (cpuState.hand.length > 0) { // Should only happen if hand has only M-cards and all are high value (or only one M card left)
        cardToDiscard = cpuState.hand.sort((a,b) => a.cardNumber.localeCompare(b.cardNumber))[0];
        reasoning = `Rule-based: Discarding first available card (${cardToDiscard.cardNameOmm || cardToDiscard.cardName}) as a last resort.`;
        return { action: 'DISCARD_TO_DEFEAT', cardId: cardToDiscard.cardNumber, reasoning };
    }
  }

  // Fallback: No action possible (e.g., hand empty - should ideally not happen in this phase)
  reasoning = 'Rule-based: Hand empty or no valid discard action.';
  return { action: 'NO_ACTION', reasoning };
};

export const getCPUTerrainSelectionAction = async (gameState: GameState): Promise<CPUAction> => {
  await delay(800); // Small delay for UX

  const cpuState = gameState.cpu;
  const playerState = gameState.player;
  let bestCard: Card | null = null;
  let maxScore = -Infinity;
  let reasoning = "Rule-based: ";

  if (cpuState.hand.length === 0) {
    reasoning += "No cards in hand to select terrain.";
    return { action: 'NO_ACTION', reasoning }; // Should not happen if draw phase is correct
  }

  for (const potentialTerrainCard of cpuState.hand) {
    const testTerrainAttribute = potentialTerrainCard.battlefieldTerrain;
    if (!testTerrainAttribute) continue; // Card cannot be a terrain card

    let cpuDeployableUnits = 0;
    let cpuDeployablePower = 0;
    cpuState.squad.filter(c => c.type === 'M').forEach(mCard => {
      if (canDeployToTerrain(mCard, testTerrainAttribute)) {
        cpuDeployableUnits++;
        cpuDeployablePower += parseInt(mCard.points) || 0;
      }
    });

    let playerDeployableUnits = 0;
    let playerDeployablePower = 0;
    playerState.squad.filter(c => c.type === 'M').forEach(mCard => {
      if (canDeployToTerrain(mCard, testTerrainAttribute)) {
        playerDeployableUnits++;
        playerDeployablePower += parseInt(mCard.points) || 0;
      }
    });

    // Score: Maximize own deployable units and power, minimize opponent's.
    // Weight units more, as number of units affects defeat points.
    const score = (cpuDeployableUnits * 3) + (cpuDeployablePower) - (playerDeployableUnits * 2) - (playerDeployablePower * 0.5);

    if (score > maxScore) {
      maxScore = score;
      bestCard = potentialTerrainCard;
    } else if (score === maxScore && bestCard) {
      if (cpuDeployableUnits > cpuState.squad.filter(c => c.type === 'M' && canDeployToTerrain(c, bestCard.battlefieldTerrain)).length) {
        bestCard = potentialTerrainCard;
      }
    }
  }

  if (bestCard) {
    reasoning += `Selected ${bestCard.cardNameOmm || bestCard.cardName} (Score: ${maxScore.toFixed(1)}) to optimize deployment.`;
    return { action: 'SELECT_TERRAIN', cardId: bestCard.cardNumber, reasoning };
  } else {
    // Fallback: if no card could be evaluated (e.g. all cards have no battlefieldTerrain), pick first card.
    const fallbackCard = cpuState.hand[0];
    reasoning += "No suitable terrain card found based on heuristics, picking first available card.";
    return { action: 'SELECT_TERRAIN', cardId: fallbackCard.cardNumber, reasoning };
  }
};

export const getCPUCounterSupportAction = async (gameState: GameState): Promise<CPUAction> => {
  await delay(800); // Small delay for UX

  const cpuState = gameState.cpu;
  const playerState = gameState.player;
  const currentTerrain = gameState.battlefieldTerrainAttribute;
  let reasoning = "Rule-based: ";

  const playableCCards = cpuState.hand.filter(card => {
    if (card.type !== 'C') return false;
    // Generally requires M-Cards on field unless C-011 or effect override
    if (cpuState.battlefield.filter(c => c.type === 'M').length === 0) {
        if (card.cardNumber !== 'C-011' && !card.effect?.includes("Mカードがいなくても")) return false; 
    }

    if (!card.battlefieldTerrain || !currentTerrain) return false;
    if (card.battlefieldTerrain.includes("宇陸海空")) return true;

    let terrainMatch = false;
    for (const cTerrain of card.battlefieldTerrain) {
        if (currentTerrain.includes(cTerrain)) {
            terrainMatch = true;
            break;
        }
    }
    return terrainMatch;
  });

  // Heuristic: Try to play a "good" C-card
  const gatoCard = playableCCards.find(c => c.cardNumber.startsWith('C-005'));
  if (gatoCard && (cpuState.combatPoints <= playerState.combatPoints + 5)) {
    reasoning += `Play ${gatoCard.cardNameOmm || gatoCard.cardName} to boost points.`;
    return { action: 'PLAY_C_CARD', cardId: gatoCard.cardNumber, reasoning };
  }

  const minovskyCard = playableCCards.find(c => c.cardNumber.startsWith('C-011'));
  if (minovskyCard && playerState.battlefield.filter(c => c.type === 'M').length > 0 && (cpuState.combatPoints <= playerState.combatPoints + 5)) {
     reasoning += `Play ${minovskyCard.cardNameOmm || minovskyCard.cardName} to potentially reduce opponent's points.`;
    return { action: 'PLAY_C_CARD', cardId: minovskyCard.cardNumber, reasoning };
  }
  
  const chobhamCard = playableCCards.find(c => c.cardNumber.startsWith('C-012'));
  if (chobhamCard && cpuState.battlefield.filter(c => c.type === 'M').length > 0 && (cpuState.combatPoints <= playerState.combatPoints + 3)){
    reasoning += `Play ${chobhamCard.cardNameOmm || chobhamCard.cardName} to boost an M-card's points.`;
    return { action: 'PLAY_C_CARD', cardId: chobhamCard.cardNumber, reasoning };
  }


  // If no "good" C-card play, consider discarding if hand is large or to cycle.
  if (cpuState.hand.length > 4) {
    let cardToDiscard: Card | undefined;
    // Prefer discarding C-cards that are not playable now
    const unplayableCCards = cpuState.hand.filter(c => c.type === 'C' && !playableCCards.find(pc => pc.cardNumber === c.cardNumber));
    if (unplayableCCards.length > 0) {
      cardToDiscard = unplayableCCards.sort((a,b) => a.cardNumber.localeCompare(b.cardNumber))[0]; 
      reasoning += `Discard unplayable C-card (${cardToDiscard.cardNameOmm || cardToDiscard.cardName}) due to hand size.`;
    } else if (playableCCards.length < cpuState.hand.filter(c => c.type === 'C').length) {
        // Discard other C cards
        const otherCCards = cpuState.hand.filter(c => c.type === 'C' && !playableCCards.find(pc => pc.cardNumber === c.cardNumber));
        if(otherCCards.length > 0) cardToDiscard = otherCCards.sort((a,b) => a.cardNumber.localeCompare(b.cardNumber))[0];
        else cardToDiscard = playableCCards.sort((a,b) => a.cardNumber.localeCompare(b.cardNumber))[0]; 
        if(cardToDiscard) reasoning += `Discard C-card (${cardToDiscard.cardNameOmm || cardToDiscard.cardName}) due to hand size/strategy.`;

    } else if (cpuState.hand.filter(c => c.type === 'M').length > 0) {
      const mCardsInHand = cpuState.hand.filter(c => c.type === 'M').sort((a, b) => {
        const pointsA = parseInt(a.points) || 0;
        const pointsB = parseInt(b.points) || 0;
        if (pointsA !== pointsB) return pointsA - pointsB;
        return a.cardNumber.localeCompare(b.cardNumber);
      });
      cardToDiscard = mCardsInHand[0];
      reasoning += `Discard lowest point M-card (${cardToDiscard.cardNameOmm || cardToDiscard.cardName}) due to hand size.`;
    }

    if (cardToDiscard) {
      return { action: 'DISCARD_FROM_HAND', cardId: cardToDiscard.cardNumber, reasoning };
    }
  }

  reasoning += "No beneficial C-card play or need to discard.";
  return { action: 'NO_ACTION', reasoning };
};
