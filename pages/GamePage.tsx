
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, GameState, PlayerState, GamePhase, PlayerType, CPUAction, Combo, LogEntry } from '../types';
import { parseMobilePowersTsvData, tsvData as allCardsTsvData } from '../components/RulePage';
import * as aiService from '../services/aiService';
import { createFullCardInstancePool, generateCompressedDeckCode, parseCompressedDeckCode } from '../utils/deckCodeUtils';
import { cpuDeckPresets } from '../data/cpuDecks'; // Import CPU presets to find by code if needed, though MainMenu should resolve ID to code.


interface GamePageProps {
  onExit: () => void;
  initialDeckCode?: string; // For player
  initialCpuDeckCode?: string; // For CPU
}

const initialPlayerState = (): PlayerState => ({
  deck: [],
  hand: [],
  squad: [],
  battlefield: [],
  defeatPile: [], // For敗戦ポイント
  discardPile: [],
  defeatPoints: 0,
  combatPoints: 0,
});

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const drawCards = (deck: Card[], count: number): { newDeck: Card[], drawnCards: Card[] } => {
  const drawnCards = deck.slice(0, count);
  const newDeck = deck.slice(count);
  return { newDeck, drawnCards };
};

const canDeploy = (mCard: Card, terrainAttribute: string | null): boolean => {
    if (mCard.type !== 'M' || !mCard.terrainTypeMCards || !terrainAttribute) return false;
    for (const unitTerrain of mCard.terrainTypeMCards) {
        if (terrainAttribute.includes(unitTerrain)) return true;
    }
    return false;
};

const applyCCardEffect = (playedCard: Card, targetPlayerState: PlayerState, currentGameState: GameState, byPlayerType: PlayerType): { newPlayerState: PlayerState, logMessage: string} => {
    let newPlayerState = { ...targetPlayerState };
    const effectTextToLog = playedCard.effect || playedCard.textAbility || '効果テキストなし';
    let isImplementedEffect = false;
    let effectSpecificLogPart = "";

    // Check for implemented effects
    if (playedCard.cardNumber.startsWith('C-001') && byPlayerType === 'PLAYER') { // Amuro Ray
        newPlayerState.combatPoints += 2; // Simplified effect
        effectSpecificLogPart = ` 効果: ${effectTextToLog} (仮実装: ポイント+2)`;
        isImplementedEffect = true;
    } else if (playedCard.cardNumber.startsWith('C-005') && byPlayerType === 'CPU') { // Anavel Gato
        newPlayerState.combatPoints += 2; // Simplified effect
        effectSpecificLogPart = ` 効果: ${effectTextToLog} (仮実装: ポイント+2)`;
        isImplementedEffect = true;
    }
    // Add other implemented C-card effects here as else if blocks

    const cardDisplayName = playedCard.cardNameOmm || playedCard.cardName;
    const cardNameForLog = isImplementedEffect ? cardDisplayName : `${cardDisplayName}（未実装）`;

    let logMessage = `${byPlayerType === 'PLAYER' ? 'プレイヤー' : 'CPU'}が ${cardNameForLog} を使用。`;

    if (isImplementedEffect) {
        logMessage += effectSpecificLogPart;
    } else {
        // This is the "not implemented" case for other cards
        logMessage += ` 効果: ${effectTextToLog} (詳細な効果処理は未実装)。`;
    }

    return { newPlayerState, logMessage };
};

const isPlayerInteractivePhase = (phase: GamePhase | undefined): boolean => {
  if (!phase) return false;
  return phase === 'FORMATION_PLAYER_DRAW' ||
         phase === 'FORMATION_PLAYER_PLACE' ||
         phase === 'COUNTER_SUPPORT_PLAYER_DRAW' ||
         phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C';
};

const getPhaseInstruction = (
  phase: GamePhase, 
  playerHand: Card[], 
  playerSquad: Card[],
  isVisualizingUnilateral: boolean,
  unilateralWinner: PlayerType | null
  ): string => {
  if (isVisualizingUnilateral) {
    if (unilateralWinner === 'PLAYER') return "一方的出撃！プレイヤーの勝利！";
    if (unilateralWinner === 'CPU') return "一方的出撃！CPUの勝利！";
  }
  switch (phase) {
    case 'FORMATION_PLAYER_DRAW':
      return "編成: カードをドロー中...";
    case 'FORMATION_PLAYER_PLACE':
      const canPlaceMCard = playerHand.some(c => c.type === 'M');
      const squadFull = playerSquad.length >= 3;
      if (squadFull) return "編成: 完了。CPUの番を待機中...";
      if (canPlaceMCard) {
        return "編成: 手札のMカード1枚を小隊に配置";
      } else {
        return "編成: Mカードなし。手札の1枚を捨て札へ";
      }
    case 'COUNTER_SUPPORT_PLAYER_DRAW':
      return "カウンター/支援: カードをドロー中...";
    case 'COUNTER_SUPPORT_PLAYER_PLAY_C':
      return "カウンター/支援: Cカード使用 または 手札1枚を破棄";

    case 'SETUP': return "ゲームセットアップ中...";
    case 'FORMATION_CPU_DRAW': return "CPU: 編成ドロー中...";
    case 'FORMATION_CPU_PLACE': return "CPU: 編成配置中...";
    case 'FORMATION_CHECK_FULL': return "編成: 両者配置完了。出陣フェイズへ移行中...";
    case 'DEPLOYMENT_PLAYER_TERRAIN': return "出陣: 地形カードを決定中...";
    case 'DEPLOYMENT_CPU_TERRAIN': return "CPU: 地形カードを決定中...";
    case 'DEPLOYMENT_MOVE_CARDS': return "出陣: ユニットを戦場へ移動中...";
    case 'DEPLOYMENT_CHECK_UNILATERAL': return "出陣: 一方的戦闘確認中...";
    case 'DEPLOYMENT_HANDLE_TAPPED': return "出陣: 待機MS処理中..."; 
    case 'COMBAT_CALCULATE_INITIAL_POINTS': return "戦闘: ポイント計算中...";
    case 'COUNTER_SUPPORT_CPU_DRAW': return "CPU: C/Sドロー中...";
    case 'COUNTER_SUPPORT_CPU_PLAY_C': return "CPU: C/Sカード使用中...";
    case 'COMBAT_RESOLUTION': return "戦闘: 結果を解決中...";
    case 'END_TURN_CLEANUP': return "ターン終了処理中...";
    case 'GAME_OVER': return "ゲーム終了";
    default:
      return phase;
  }
};

const calculateTagBonus = (card: Card, friendlyBattlefield: Card[]): number => {
    if (card.type !== 'M' || !card.tags) return 0;
    const cardTags = card.tags.split(' ').filter(Boolean);
    if (cardTags.length === 0) return 0;

    let bonus = 0;
    friendlyBattlefield.forEach(otherCard => {
        if (otherCard.cardNumber === card.cardNumber && otherCard.type === card.type) return; // Don't compare with self
        if (otherCard.type === 'M' && otherCard.tags) {
            const otherCardTags = otherCard.tags.split(' ').filter(Boolean);
            cardTags.forEach(ct => {
                if (otherCardTags.includes(ct)) {
                    bonus++;
                }
            });
        }
    });
    return bonus;
};

// --- COMBO LOGIC START ---
const getBaseCardNumber = (cardNumber: string): string => {
  const parts = cardNumber.split('-');
  if (parts.length >= 2) { 
    return `${parts[0]}-${parts[1]}`;
  }
  return cardNumber;
};

const isKiraCard = (card: Card): boolean => {
  return card.tags.includes("キラ");
};

const checkCombos = (battlefieldCards: Card[], playerName: string): { achievedCombos: Combo[], logMessages: LogEntry[] } => {
  const achievedCombos: Combo[] = [];
  const logMessages: LogEntry[] = [];
  const mCards = battlefieldCards.filter(c => c.type === 'M');

  if (mCards.length < 3) return { achievedCombos, logMessages };

  const groupByBaseNumber = (cards: Card[]): Record<string, Card[]> => {
    return cards.reduce((acc, card) => {
      const baseNum = getBaseCardNumber(card.cardNumber);
      if (!acc[baseNum]) acc[baseNum] = [];
      acc[baseNum].push(card);
      return acc;
    }, {} as Record<string, Card[]>);
  };

  if (mCards.filter(c => c.tags.includes("大将軍")).length >= 3) {
    const combo = { name: "大将軍コンボ", points: 8 };
    achievedCombos.push(combo);
  }
  if (mCards.filter(c => c.tags.includes("闇の支配者")).length >= 3) {
    const combo = { name: "闇コンボ", points: 8 };
    achievedCombos.push(combo);
  }
  if (mCards.filter(isKiraCard).length >= 3) {
    const combo = { name: "キラコンボ", points: 5 };
    achievedCombos.push(combo);
  }

  const systemTagCounts: Record<string, number> = {};
  mCards.forEach(card => {
    card.tags.split(' ')
      .filter(tag => tag.endsWith("系"))
      .forEach(systemTag => {
        systemTagCounts[systemTag] = (systemTagCounts[systemTag] || 0) + 1;
      });
  });
  if (Object.values(systemTagCounts).some(count => count >= 3)) {
    const combo = { name: "機体系コンボ", points: 5 };
    achievedCombos.push(combo);
  }

  const pilotTagCounts: Record<string, number> = {};
  mCards.forEach(card => {
    card.tags.split(' ')
      .filter(tag => tag.endsWith("専用機"))
      .forEach(pilotTag => {
        pilotTagCounts[pilotTag] = (pilotTagCounts[pilotTag] || 0) + 1;
      });
  });
  if (Object.values(pilotTagCounts).some(count => count >= 3)) {
    const combo = { name: "パイロットコンボ", points: 5 };
    achievedCombos.push(combo);
  }
  
  const groupsByBaseNum = groupByBaseNumber(mCards);
  Object.values(groupsByBaseNum).forEach(group => {
    if (group.length === 3) {
      if (group.every(isKiraCard)) {
        achievedCombos.push({ name: "トリプルキラコンボ", points: 10 });
      } else if (group.every(c => c.tags.includes("ガンダム系"))) {
        achievedCombos.push({ name: "トリプルGコンボ", points: 8 });
      } else {
        achievedCombos.push({ name: "トリプルコンボ", points: 7 });
      }
    }
  });

  const uniqueComboMap = new Map<string, Combo>();
  achievedCombos.forEach(combo => {
    if (!uniqueComboMap.has(combo.name) || (uniqueComboMap.get(combo.name)!.points < combo.points)) {
        uniqueComboMap.set(combo.name, combo);
    }
  });
  
  const finalCombos = Array.from(uniqueComboMap.values());
  finalCombos.forEach(combo => {
    logMessages.push({
        message: `${playerName}「${combo.name}」成立！ (+${combo.points}P)`,
        source: playerName === 'プレイヤー' ? 'PLAYER' : 'CPU',
        timestamp: Date.now()
    });
  });

  return { achievedCombos: finalCombos, logMessages };
};
// --- COMBO LOGIC END ---


const customScrollbarAndAnimationStyles = `
  .custom-scrollbar-xs::-webkit-scrollbar {
    width: 4px; /* Thinner scrollbar */
    height: 4px;
  }
  .custom-scrollbar-xs::-webkit-scrollbar-track {
    background: rgba(203, 213, 225, 0.5); /* slate-300/50 */
    border-radius: 2px;
  }
  .custom-scrollbar-xs::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.7); /* slate-400/70 */
    border-radius: 2px;
  }
  .custom-scrollbar-xs::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.7); /* slate-500/70 */
  }

  @keyframes blink-bg-player {
    0%, 100% { background-color: #7DD3FC; transform: scale(1.12); color: #0C4A6E; box-shadow: 0 0 15px #38BDF8; }
    50% { background-color: #0EA5E9; transform: scale(1); color: white; box-shadow: 0 0 5px #38BDF8;}
  }
  .blinking-winner-player {
    animation: blink-bg-player 0.7s infinite ease-in-out;
  }

  @keyframes blink-bg-cpu {
    0%, 100% { background-color: #FCA5A5; transform: scale(1.12); color: #7F1D1D; box-shadow: 0 0 15px #F87171; }
    50% { background-color: #EF4444; transform: scale(1); color: white; box-shadow: 0 0 5px #F87171; }
  }
  .blinking-winner-cpu {
    animation: blink-bg-cpu 0.7s infinite ease-in-out;
  }

  @keyframes blink-bg-draw {
    0%, 100% { background-color: #FEF08A; transform: scale(1.12); color: #713F12; box-shadow: 0 0 15px #FACC15; }
    50% { background-color: #FACC15; transform: scale(1); color: #422006; box-shadow: 0 0 5px #FACC15; }
  }
  .blinking-winner-draw {
    animation: blink-bg-draw 0.7s infinite ease-in-out;
  }
`;

interface GameCardProps {
  card: Card;
  isPlayerCard: boolean;
  location: 'hand' | 'squad' | 'battlefield' | 'discardPile' | 'deck';
  onClick?: (card: Card) => void;
  isSelected?: boolean;
  isDisabled?: boolean;
  uniqueKey: string;
}

const GameCard: React.FC<GameCardProps> = ({ card, isPlayerCard, location, onClick, isSelected, isDisabled, uniqueKey }) => {
  const { handleImageError, imageLoadErrors, setSelectedCard: contextSetSelectedCard } = useGamePageContext();
  const isMCard = card.type === 'M';
  const hasError = imageLoadErrors[uniqueKey];
  const showImage = card.imageUrl && !hasError;
  const isKira = isKiraCard(card);

  const cardSizeSpecificClasses = "w-full aspect-[5/7] sm:w-20 sm:aspect-auto sm:h-28";

  let bgColor = 'bg-slate-200';
  let textColor = 'text-slate-800';

  if (showImage) {
    bgColor = 'bg-transparent';
  } else if (isMCard) {
    bgColor = card.factionAffiliation === '地球連邦' ? 'bg-sky-200' : card.factionAffiliation === 'ジオン' ? 'bg-red-200' : 'bg-slate-300';
    textColor = card.factionAffiliation === '地球連邦' ? 'text-sky-800' : card.factionAffiliation === 'ジオン' ? 'text-red-800' : 'text-slate-800';
  } else { // C-Card
    bgColor = 'bg-yellow-200';
    textColor = 'text-yellow-800';
  }

  const cardTitle = `${card.cardNameOmm || card.cardName} (${card.type}${isMCard ? ` P:${card.points}` : ''})
Flavor: ${card.textAbility}
${card.type === 'C' && card.effect ? `Effect: ${card.effect}\n` : ''}Tags: ${card.tags || '-'}
Var: ${card.gameVar || '-'}`;


  const effectiveOnClick = onClick ? () => onClick(card) : () => contextSetSelectedCard(card);

  return (
    <button
      onClick={effectiveOnClick}
      disabled={isDisabled}
      key={uniqueKey}
      className={`${cardSizeSpecificClasses} rounded overflow-hidden shadow-md relative transition-all duration-150 ease-in-out transform hover:scale-105
                  ${bgColor}
                  ${isSelected ? (isPlayerCard ? 'ring-4 ring-sky-400 shadow-xl' : 'ring-4 ring-red-400 shadow-xl') : 'ring-1 ring-slate-400'}
                  ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                  ${isKira ? 'kira-border-animated' : ''}`}
      title={cardTitle}
      aria-label={`${location}のカード ${card.cardNameOmm || card.cardName} ${isSelected ? '選択中' : ''} ${isKira ? 'キラカード' : ''}`}
      aria-pressed={isSelected}
    >
      {showImage ? (
        <img
          src={card.imageUrl}
          alt={card.cardName}
          className="w-full h-full object-cover"
          onError={() => handleImageError(uniqueKey)}
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center p-1 ${textColor} text-xs`}>
          <span className={`font-bold text-base`}>{card.type}</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-black/70 backdrop-blur-sm">
        <p
          className={`text-white font-semibold truncate leading-tight`}
          style={{fontSize: '0.6rem'}}
        >
          {card.cardNameOmm || card.cardName}
        </p>
        {isMCard &&
          <p
            className={`text-yellow-300 leading-tight`}
            style={{fontSize: '0.55rem'}}
          >
            P: {card.points} | 地: {card.terrainTypeMCards}
          </p>
        }
        {!isMCard &&
          <p
            className={`text-amber-300 leading-tight`}
            style={{fontSize: '0.55rem'}}
          >
            効果地形: {card.battlefieldTerrain}
          </p>
        }
      </div>
    </button>
  );
};

const GamePageContext = React.createContext<{
  handleImageError: (key: string) => void;
  imageLoadErrors: Record<string, boolean>;
  setSelectedCard: (card: Card | null) => void;
}>({
  handleImageError: () => {},
  imageLoadErrors: {},
  setSelectedCard: () => {},
});

const useGamePageContext = () => React.useContext(GamePageContext);


export const GamePage: React.FC<GamePageProps> = ({ onExit, initialDeckCode, initialCpuDeckCode }) => {
  const [allBaseCards, setAllBaseCards] = useState<Card[]>([]);
  const [fullInstancePool, setFullInstancePool] = useState<Card[]>([]);
  const [baseCardToShortIdMap, setBaseCardToShortIdMap] = useState<Map<string, number>>(new Map());
  const [shortIdToBaseCardMap, setShortIdToBaseCardMap] = useState<Map<number, string>>(new Map());

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardLocal, setSelectedCardLocal] = useState<Card | null>(null);
  
  const [combatResultVisual, setCombatResultVisual] = useState<PlayerType | 'DRAW' | null>(null);
  const [isVisualizingCombat, setIsVisualizingCombat] = useState(false);
  
  const [isVisualizingUnilateralDeployment, setIsVisualizingUnilateralDeployment] = useState(false);
  const [unilateralDeploymentWinner, setUnilateralDeploymentWinner] = useState<PlayerType | null>(null);

  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});

  const [isDiscardPileModalOpen, setIsDiscardPileModalOpen] = useState(false);
  const [discardPileOwnerName, setDiscardPileOwnerName] = useState<string | null>(null);
  const [cardsInModal, setCardsInModal] = useState<Card[]>([]);

  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  
  const [isLargeCardModalOpen, setIsLargeCardModalOpen] = useState(false);
  const [cardForLargeModal, setCardForLargeModal] = useState<Card | null>(null);


  const handleImageError = (cardKey: string) => {
    setImageLoadErrors(prev => ({ ...prev, [cardKey]: true }));
  };

  const setSelectedCard = (card: Card | null) => {
    setSelectedCardLocal(card);
  };

  const openLargeCardModal = (card: Card) => {
    if (card.imageUrl) {
      setCardForLargeModal(card);
      setIsLargeCardModalOpen(true);
    }
  };

  const closeLargeCardModal = () => {
    setIsLargeCardModalOpen(false);
  };

  const openDiscardPileModal = (owner: PlayerType) => {
    if (!gameState) return;
    if (owner === 'PLAYER') {
      setCardsInModal(gameState.player.discardPile);
      setDiscardPileOwnerName('プレイヤー');
    } else {
      setCardsInModal(gameState.cpu.discardPile);
      setDiscardPileOwnerName('CPU');
    }
    setIsDiscardPileModalOpen(true);
  };

  const closeDiscardPileModal = () => {
    setIsDiscardPileModalOpen(false);
    setCardsInModal([]);
    setDiscardPileOwnerName(null);
  };

  const openPlayerDeckModal = () => {
    if (!gameState) return;
    setIsDeckModalOpen(true);
  };

  const closeDeckModal = () => {
    setIsDeckModalOpen(false);
  };

  const addLogEntry = useCallback((message: string, source: LogEntry['source'] = 'SYSTEM') => {
    setGameState(prev => {
      if (!prev) return prev;
      const newEntry: LogEntry = { message, source, timestamp: Date.now() };
      return { ...prev, gameLog: [...prev.gameLog, newEntry] };
    });
  }, []);


  useEffect(() => {
    const parsedBase = parseMobilePowersTsvData(allCardsTsvData);
    setAllBaseCards(parsedBase);

    if (parsedBase.length > 0) {
        const instancePool = createFullCardInstancePool(parsedBase);
        setFullInstancePool(instancePool);

        const gamePlayableBaseCards = parsedBase.filter(c => c.type === 'M' || c.type === 'C');
        const sortedBaseCardNumbers = Array.from(new Set(gamePlayableBaseCards.map(c => c.cardNumber))).sort();
        
        const bToS = new Map<string, number>();
        const sToB = new Map<number, string>();
        sortedBaseCardNumbers.forEach((num, idx) => {
            bToS.set(num, idx);
            sToB.set(idx, num);
        });
        setBaseCardToShortIdMap(bToS);
        setShortIdToBaseCardMap(sToB);
    }
  }, []);

  const initializeGame = useCallback((playerDeckCodeToUse?: string, cpuDeckCodeToUse?: string) => {
    if (allBaseCards.length === 0 || fullInstancePool.length === 0 || baseCardToShortIdMap.size === 0) {
        console.warn("Base cards, instance pool, or ID maps not loaded yet. Cannot initialize game.");
        addLogEntry("エラー: ゲーム初期化に必要なデータが不足しています。", "SYSTEM");
        return;
    }

    let playerDeckBase: Card[];
    let cpuDeckBase: Card[];
    const gameLogMessages: LogEntry[] = [{ message: 'ゲーム開始！', source: 'SYSTEM', timestamp: Date.now() }];

    // Player Deck Setup
    if (playerDeckCodeToUse && playerDeckCodeToUse.trim() !== '') {
        const parsedPlayerDeck = parseCompressedDeckCode(playerDeckCodeToUse.trim(), shortIdToBaseCardMap, fullInstancePool);
        if (parsedPlayerDeck) {
            playerDeckBase = parsedPlayerDeck; 
            gameLogMessages.push({ message: "提供されたデッキコードからプレイヤーのデッキを構築しました。", source: 'SYSTEM', timestamp: Date.now() });
        } else {
            gameLogMessages.push({ message: "プレイヤーのデッキコードが無効です。ランダムデッキで開始します。", source: 'SYSTEM', timestamp: Date.now() });
            playerDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
        }
    } else {
        gameLogMessages.push({ message: "ランダムデッキでプレイヤーのデッキを構築しました。", source: 'SYSTEM', timestamp: Date.now() });
        playerDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
    }
    playerDeckBase = shuffleDeck(playerDeckBase);
    const { newDeck: playerDeckAfterDraw, drawnCards: playerInitialHand } = drawCards(playerDeckBase, 7);

    // CPU Deck Setup
    if (cpuDeckCodeToUse && cpuDeckCodeToUse.trim() !== '') {
        const parsedCpuDeck = parseCompressedDeckCode(cpuDeckCodeToUse.trim(), shortIdToBaseCardMap, fullInstancePool);
        if (parsedCpuDeck) {
            cpuDeckBase = parsedCpuDeck;
            const presetName = cpuDeckPresets.find(p => p.code === cpuDeckCodeToUse)?.name;
            gameLogMessages.push({ message: presetName ? `CPUは「${presetName}」デッキを使用します。` : "CPUは提供されたデッキコードを使用します。", source: 'SYSTEM', timestamp: Date.now() });
        } else {
            gameLogMessages.push({ message: "CPUのデッキコードが無効です。ランダムデッキで開始します。", source: 'SYSTEM', timestamp: Date.now() });
            cpuDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
        }
    } else {
        gameLogMessages.push({ message: "ランダムデッキでCPUのデッキを構築しました。", source: 'SYSTEM', timestamp: Date.now() });
        cpuDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
    }
    cpuDeckBase = shuffleDeck(cpuDeckBase);
    const { newDeck: cpuDeckAfterDraw, drawnCards: cpuInitialHand } = drawCards(cpuDeckBase, 7);


    setGameState({
      phase: 'FORMATION_PLAYER_DRAW',
      activePlayer: 'PLAYER', 
      turnOrder: ['PLAYER', 'CPU'], 
      player: { ...initialPlayerState(), deck: playerDeckAfterDraw, hand: playerInitialHand },
      cpu: { ...initialPlayerState(), deck: cpuDeckAfterDraw, hand: cpuInitialHand },
      currentTerrainCard: null,
      battlefieldTerrainAttribute: null,
      counterSupportTurnOrder: null,
      currentCounterSupportActorIndex: 0,
      gameLog: gameLogMessages,
      winner: null,
      isPlayerTurnInteractive: true, 
      isCPUMoving: false,
    });
    setSelectedCardLocal(null);
    setCombatResultVisual(null);
    setIsVisualizingCombat(false);
    setIsVisualizingUnilateralDeployment(false);
    setUnilateralDeploymentWinner(null);
    setImageLoadErrors({});
  }, [allBaseCards, fullInstancePool, baseCardToShortIdMap, shortIdToBaseCardMap, addLogEntry]);

  useEffect(() => {
    if (allBaseCards.length > 0 && fullInstancePool.length > 0 && baseCardToShortIdMap.size > 0 && !gameState) {
        initializeGame(initialDeckCode, initialCpuDeckCode);
    }
  }, [allBaseCards, fullInstancePool, baseCardToShortIdMap, initialDeckCode, initialCpuDeckCode, initializeGame, gameState]);

  const goToNextCounterSupportStepOrCombatResolution = (currentGameState: GameState): Partial<GameState> => {
    if (!currentGameState.counterSupportTurnOrder) {
        const newLogEntry: LogEntry = { message: "エラー: C/S順序不明、戦闘解決へ。", source: 'SYSTEM', timestamp: Date.now() };
        return { phase: 'COMBAT_RESOLUTION', isPlayerTurnInteractive: false, gameLog: [...currentGameState.gameLog, newLogEntry] };
    }

    const newIndex = currentGameState.currentCounterSupportActorIndex + 1;
    if (newIndex < currentGameState.counterSupportTurnOrder.length) {
        const nextActor = currentGameState.counterSupportTurnOrder[newIndex];
        const nextPhase = nextActor === 'PLAYER' ? 'COUNTER_SUPPORT_PLAYER_DRAW' : 'COUNTER_SUPPORT_CPU_DRAW';
        const newLogEntry: LogEntry = { message: `${nextActor === 'PLAYER' ? 'プレイヤー' : 'CPU'}のカウンター／支援ドローフェイズへ。`, source: 'SYSTEM', timestamp: Date.now()};
        return {
            phase: nextPhase,
            currentCounterSupportActorIndex: newIndex,
            isPlayerTurnInteractive: nextActor === 'PLAYER',
            gameLog: [...currentGameState.gameLog, newLogEntry]
        };
    } else {
        const newLogEntry: LogEntry = { message: "両者のカウンター／支援終了。戦闘解決へ。", source: 'SYSTEM', timestamp: Date.now()};
        return {
            phase: 'COMBAT_RESOLUTION',
            isPlayerTurnInteractive: false,
            gameLog: [...currentGameState.gameLog, newLogEntry]
        };
    }
  };


  const handlePlayerAction = async (actionType: string, cardToActOn?: Card) => {
    if (!gameState || !gameState.isPlayerTurnInteractive || gameState.winner || !cardToActOn) return;

    const card = cardToActOn;

    setGameState(prev => {
        if (!prev) return null;
        let newPlayerState = { ...prev.player };
        let newLog = [...prev.gameLog];
        let nextPhasePartial: Partial<GameState> = {};

        if (prev.phase === 'FORMATION_PLAYER_PLACE') {
            if (actionType === 'PLAY_M_CARD_TO_SQUAD' && card.type === 'M' && newPlayerState.squad.length < 3) {
                newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber); 
                newPlayerState.squad = [...newPlayerState.squad, card];
                newLog.push({message: `プレイヤーが ${card.cardName} を小隊に配置。`, source: 'PLAYER', timestamp: Date.now()});
            } else if (actionType === 'DISCARD_TO_DEFEAT_PILE') {
                newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber);
                newPlayerState.discardPile = [...newPlayerState.discardPile, card];
                newLog.push({message: `プレイヤーが ${card.cardName} を手札から捨て札へ (編成時Mカード配置不可のため)。`, source: 'PLAYER', timestamp: Date.now()});
            } else {
                newLog.push({message: `プレイヤーの行動 ${actionType} は現在実行できません。`, source: 'SYSTEM', timestamp: Date.now()});
                return prev;
            }

            const playerNowDone = newPlayerState.squad.length >= 3 || (!newPlayerState.hand.some(c => c.type === 'M') && newPlayerState.squad.length <3 );
            const cpuAlreadyDone = prev.cpu.squad.length >= 3 || (!prev.cpu.hand.some(c => c.type === 'M') && prev.cpu.squad.length < 3);


            if (playerNowDone && cpuAlreadyDone) {
                nextPhasePartial = { phase: 'FORMATION_CHECK_FULL', isPlayerTurnInteractive: false };
            } else if (playerNowDone && !cpuAlreadyDone) {
                 nextPhasePartial = { phase: 'FORMATION_CPU_DRAW', isPlayerTurnInteractive: false };
            } else {
                 nextPhasePartial = { phase: 'FORMATION_CPU_DRAW', isPlayerTurnInteractive: false };
            }


        } else if (prev.phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C') {
            if (actionType === 'PLAY_C_CARD' && card.type === 'C') {
                if (newPlayerState.battlefield.filter(m => m.type === 'M').length === 0 && !(card.effect && card.effect.includes("戦場にMカードがいなくても使用可能")) && !card.cardNumber.startsWith('C-011') ) { // C-011 Minovsky check
                    newLog.push({message: `Cカードを出すには戦場にMカードが必要です。(${card.cardName})`, source: 'SYSTEM', timestamp: Date.now()});
                } else {
                    newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber);
                    newPlayerState.discardPile = [...newPlayerState.discardPile, card];

                    const effectResult = applyCCardEffect(card, newPlayerState, prev, 'PLAYER');
                    newPlayerState = effectResult.newPlayerState;
                    newLog.push({message: effectResult.logMessage, source: 'PLAYER', timestamp: Date.now()});

                    nextPhasePartial = goToNextCounterSupportStepOrCombatResolution(prev);
                }
            } else if (actionType === 'DISCARD_FROM_HAND_CS') {
                newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber);
                newPlayerState.discardPile = [...newPlayerState.discardPile, card];
                newLog.push({message: `プレイヤーが手札から ${card.cardName} を捨てました。`, source: 'PLAYER', timestamp: Date.now()});
                nextPhasePartial = goToNextCounterSupportStepOrCombatResolution(prev);
            } else {
                 newLog.push({message: `プレイヤーの行動 ${actionType} は現在実行できません。`, source: 'SYSTEM', timestamp: Date.now()});
                 return prev;
            }
        } else {
            return prev;
        }

        setSelectedCardLocal(null);
        return { ...prev, player: newPlayerState, gameLog: newLog, ...nextPhasePartial };
    });
  };

  const processCPUAction = useCallback((aiDecisionInput: CPUAction | null) => {
    setGameState(prev => {
      if (!prev) return prev;

      const aiDecision = aiDecisionInput || { action: 'NO_ACTION', reasoning: 'AI service failed or returned null decision' };

      let newLog: LogEntry[] = [...prev.gameLog, {message: `CPU: ${aiDecision.action} ${aiDecision.cardId || ''} (${aiDecision.reasoning || '理由なし'})`, source: 'SYSTEM', timestamp: Date.now()}];
      let newCpuState = { ...prev.cpu };
      let nextPhasePartial: Partial<GameState> = {};
      let actionTakenSuccessfully = false;

      if (prev.phase === 'FORMATION_CPU_PLACE') {
        if (aiDecision.action === 'PLAY_M_CARD' && aiDecision.cardId) {
          const cardToPlay = newCpuState.hand.find(c => c.cardNumber === aiDecision.cardId);
          if (cardToPlay && cardToPlay.type === 'M' && newCpuState.squad.length < 3) {
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToPlay.cardNumber);
            newCpuState.squad = [...newCpuState.squad, cardToPlay];
            newLog = [...newLog, {message: `CPUが ${cardToPlay.cardName} を小隊に配置。`, source: 'CPU', timestamp: Date.now()}];
            actionTakenSuccessfully = true;
          } else {
            newLog = [...newLog, {message: `CPU AI提案 (${aiDecision.cardId} 配置)は無効でした。`, source: 'SYSTEM', timestamp: Date.now()}];
          }
        } else if (aiDecision.action === 'DISCARD_TO_DEFEAT' && aiDecision.cardId) {
          const cardToDiscard = newCpuState.hand.find(c => c.cardNumber === aiDecision.cardId);
          if (cardToDiscard) {
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscard.cardNumber);
            newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscard]; 
            newLog = [...newLog, {message: `CPUが ${cardToDiscard.cardName} を手札から捨て札へ (編成時Mカード配置不可のため)。`, source: 'CPU', timestamp: Date.now()}];
            actionTakenSuccessfully = true;
          } else {
            newLog = [...newLog, {message: `CPU AI提案 (${aiDecision.cardId} 捨て札へ)は手札にないため無効でした。`, source: 'SYSTEM', timestamp: Date.now()}];
          }
        }

        if (!actionTakenSuccessfully) {
          newLog = [...newLog, {message: `CPU AIの行動が無効/未指定/NO_ACTIONのため、フォールバック処理を実行します。`, source: 'SYSTEM', timestamp: Date.now()}];
          const availableMCardsInHand = newCpuState.hand.filter(c => c.type === 'M');
          if (newCpuState.squad.length < 3 && availableMCardsInHand.length > 0) {
            const cardToPlay = availableMCardsInHand.sort((a,b) => parseInt(b.points) - parseInt(a.points))[0];
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToPlay.cardNumber);
            newCpuState.squad = [...newCpuState.squad, cardToPlay];
            newLog = [...newLog, {message: `CPUフォールバック: ${cardToPlay.cardName} を小隊に配置。`, source: 'CPU', timestamp: Date.now()}];
          } else if (newCpuState.hand.length > 0) {
            const cardToDiscard = newCpuState.hand[Math.floor(Math.random() * newCpuState.hand.length)];
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscard.cardNumber);
            newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscard]; 
            newLog = [...newLog, {message: `CPUフォールバック: ${cardToDiscard.cardName} を手札から捨て札へ (編成時Mカード配置不可のため)。`, source: 'CPU', timestamp: Date.now()}];
          } else {
            newLog = [...newLog, {message: `CPUフォールバック: 手札が空で行動できません。`, source: 'CPU', timestamp: Date.now()}];
          }
        }

        const playerFormationDone = prev.player.squad.length >= 3 || (!prev.player.hand.some(c => c.type === 'M') && prev.player.squad.length < 3);
        const cpuFormationDone = newCpuState.squad.length >= 3 || (!newCpuState.hand.some(c => c.type === 'M') && newCpuState.squad.length < 3);


        if (playerFormationDone && cpuFormationDone) {
            nextPhasePartial = { phase: 'FORMATION_CHECK_FULL', isPlayerTurnInteractive: false };
        } else if (cpuFormationDone && !playerFormationDone) {
             nextPhasePartial = { phase: 'FORMATION_PLAYER_DRAW', isPlayerTurnInteractive: true };
        } else {
             nextPhasePartial = { phase: 'FORMATION_PLAYER_DRAW', isPlayerTurnInteractive: true };
        }

      } else if (prev.phase === 'COUNTER_SUPPORT_CPU_PLAY_C') {
        const cardId = aiDecision.cardId;
        const cardToAct = cardId ? newCpuState.hand.find(c => c.cardNumber === cardId) : null;

        if (aiDecision.action === 'PLAY_C_CARD' && cardToAct && cardToAct.type === 'C') {
            if (newCpuState.battlefield.filter(m => m.type === 'M').length === 0 && !(cardToAct.effect && cardToAct.effect.includes("戦場にMカードがいなくても使用可能")) && !cardToAct.cardNumber.startsWith('C-011') ) { 
                newLog.push({message: `CPUはCカード(${cardToAct.cardName})を出そうとしましたが、戦場にMカードがいません。フォールバック。`, source: 'CPU', timestamp: Date.now()});
                const cardToDiscardFallback = cardToAct || (newCpuState.hand.length > 0 ? newCpuState.hand[0] : null);
                if (cardToDiscardFallback) {
                    newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscardFallback.cardNumber);
                    newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscardFallback];
                    newLog.push({message: `CPUフォールバック: ${cardToDiscardFallback.cardName} を捨てました。`, source: 'CPU', timestamp: Date.now()});
                }
            } else {
                newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToAct.cardNumber);
                newCpuState.discardPile = [...newCpuState.discardPile, cardToAct];
                const effectResult = applyCCardEffect(cardToAct, newCpuState, prev, 'CPU');
                newCpuState = effectResult.newPlayerState;
                newLog.push({message: effectResult.logMessage, source: 'CPU', timestamp: Date.now()});
            }
        } else if (aiDecision.action === 'DISCARD_FROM_HAND' && cardToAct) {
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToAct.cardNumber);
            newCpuState.discardPile = [...newCpuState.discardPile, cardToAct];
            newLog.push({message: `CPUが手札から ${cardToAct.cardName} を捨てました。`, source: 'CPU', timestamp: Date.now()});
        } else { 
            newLog.push({message: `CPUはCカードを使用しないか、無効な行動でした。`, source: 'CPU', timestamp: Date.now()});
            if (aiDecision.action !== 'NO_ACTION' && newCpuState.hand.length > 0) {
                newLog.push({message: `フォールバック: 手札から1枚捨てます。`, source: 'CPU', timestamp: Date.now()});
                const cardToDiscard = newCpuState.hand[Math.floor(Math.random() * newCpuState.hand.length)];
                newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscard.cardNumber);
                newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscard];
                newLog.push({message: `CPUフォールバック: ${cardToDiscard.cardName} を捨てました。`, source: 'CPU', timestamp: Date.now()});
            } else if (aiDecision.action !== 'NO_ACTION' && newCpuState.hand.length === 0) {
                 newLog.push({message: `CPUフォールバック: 手札が空で捨てられません。`, source: 'CPU', timestamp: Date.now()});
            }
        }
        nextPhasePartial = goToNextCounterSupportStepOrCombatResolution(prev);
      } else if (prev.phase === 'DEPLOYMENT_CPU_TERRAIN') {
           // Terrain logic is handled directly in useEffect for DEPLOYMENT_CPU_TERRAIN as per original implementation
           // But if we wanted to use AI, we'd use getCPUTerrainSelectionAction here.
           // Leaving as is to respect the existing structure where terrain is drawn from deck.
      } else {
        newLog.push({message: `Error: processCPUAction called for unexpected phase ${prev.phase}.`, source: 'SYSTEM', timestamp: Date.now()});
        nextPhasePartial = { phase: prev.phase, isPlayerTurnInteractive: prev.isPlayerTurnInteractive };
      }

      if (nextPhasePartial.phase === undefined) {
        newLog.push({message: `Critical Error: nextPhasePartial.phase is undefined at end of processCPUAction for ${prev.phase}. Defaulting to current phase.`, source: 'SYSTEM', timestamp: Date.now()});
        nextPhasePartial.phase = prev.phase;
      }
      if (nextPhasePartial.isPlayerTurnInteractive === undefined) {
        newLog.push({message: `Critical Error: nextPhasePartial.isPlayerTurnInteractive is undefined for ${nextPhasePartial.phase}. Recalculating.`, source: 'SYSTEM', timestamp: Date.now()});
        nextPhasePartial.isPlayerTurnInteractive = isPlayerInteractivePhase(nextPhasePartial.phase);
      }

      return {
        ...prev,
        cpu: newCpuState,
        gameLog: newLog,
        isCPUMoving: false,
        ...nextPhasePartial
      };
    });
  }, [addLogEntry]); 

  useEffect(() => {
    if (!gameState || gameState.winner) return;

    const currentPhase = gameState.phase;
    if (gameState.isCPUMoving &&
        (currentPhase === 'FORMATION_CPU_PLACE' || currentPhase === 'COUNTER_SUPPORT_CPU_PLAY_C' || currentPhase === 'DEPLOYMENT_CPU_TERRAIN')) {
        return;
    }

    if (isVisualizingCombat || isVisualizingUnilateralDeployment) {
        return;
    }

    if (!gameState.isPlayerTurnInteractive && !gameState.isCPUMoving) {
        switch (currentPhase) {
            case 'FORMATION_CPU_DRAW':
                setGameState(prev => {
                    if(!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.cpu.deck, 1);
                    if (drawnCards.length === 0) {
                      addLogEntry('CPUのデッキが尽きた！プレイヤーの勝利！', 'SYSTEM');
                      return {...prev, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('CPUが編成フェイズでカードを1枚引きました。', 'CPU');
                    return {...prev, cpu: {...prev.cpu, deck: newDeck, hand: [...prev.cpu.hand, ...drawnCards]}, phase: 'FORMATION_CPU_PLACE', isPlayerTurnInteractive: false};
                });
                break;
            case 'FORMATION_CPU_PLACE':
                setGameState(prev => prev ? ({ ...prev, isCPUMoving: true }) : null);
                aiService.getCPUFormationAction(gameState).then(processCPUAction);
                break;
            case 'FORMATION_CHECK_FULL':
                setGameState(prev => {
                    if (!prev) return null;
                    const nextTerrainSelector = prev.turnOrder[0]; 
                    addLogEntry(`編成完了。${nextTerrainSelector === 'PLAYER' ? 'プレイヤー' : 'CPU'} が地形カードを決定します。`, 'SYSTEM');
                    return {
                        ...prev,
                        phase: nextTerrainSelector === 'PLAYER' ? 'DEPLOYMENT_PLAYER_TERRAIN' : 'DEPLOYMENT_CPU_TERRAIN',
                        activePlayer: nextTerrainSelector,
                        isPlayerTurnInteractive: false, 
                    };
                });
                break;
            case 'DEPLOYMENT_PLAYER_TERRAIN':
                setGameState(prev => {
                    if (!prev) return null;
                    const { newDeck: playerDeckAfterDraw, drawnCards: terrainCardsDrawn } = drawCards(prev.player.deck, 1);
                    if (terrainCardsDrawn.length === 0) {
                        addLogEntry('プレイヤーのデッキが尽き、地形を引けませんでした。CPUの勝利！', 'SYSTEM');
                        return { ...prev, phase: 'GAME_OVER', winner: 'CPU', isPlayerTurnInteractive: false };
                    }
                    const terrainCard = terrainCardsDrawn[0];
                    const terrainAttribute = terrainCard.battlefieldTerrain || "";
                    addLogEntry(`プレイヤーが地形カードとして ${terrainCard.cardName} (属性: ${terrainAttribute}) を引きました。`, 'PLAYER');
                    return { ...prev, player: { ...prev.player, deck: playerDeckAfterDraw, discardPile: [...prev.player.discardPile, terrainCard] }, currentTerrainCard: terrainCard, battlefieldTerrainAttribute: terrainAttribute, phase: 'DEPLOYMENT_MOVE_CARDS', isPlayerTurnInteractive: false };
                });
                break;
             case 'DEPLOYMENT_CPU_TERRAIN':
                // Note: Rules say draw from deck, so we don't use AI decision here to keep consistent with rules.
                setGameState(prev => prev ? ({ ...prev, isCPUMoving: true }) : null);
                setGameState(prev => {
                     if (!prev) return null;
                     const { newDeck: cpuDeckAfterDraw, drawnCards: terrainCardsDrawn } = drawCards(prev.cpu.deck, 1);
                     if (terrainCardsDrawn.length === 0) {
                        addLogEntry('CPUのデッキが尽き、地形を引けませんでした。プレイヤーの勝利！', 'SYSTEM');
                        return { ...prev, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false };
                     }
                     const terrainCard = terrainCardsDrawn[0];
                     const terrainAttribute = terrainCard.battlefieldTerrain || ""; 
                     addLogEntry(`CPUが地形カードとして ${terrainCard.cardName} (属性: ${terrainAttribute}) を引きました。`, 'CPU');
                     return { ...prev, cpu: { ...prev.cpu, deck: cpuDeckAfterDraw, discardPile: [...prev.cpu.discardPile, terrainCard] }, currentTerrainCard: terrainCard, battlefieldTerrainAttribute: terrainAttribute, phase: 'DEPLOYMENT_MOVE_CARDS', isPlayerTurnInteractive: false, isCPUMoving: false };
                });
                break;
            case 'DEPLOYMENT_MOVE_CARDS':
                setGameState(prev => {
                    if (!prev || !prev.battlefieldTerrainAttribute) return prev;
                    let newPlayerSquad = [...prev.player.squad];
                    let newPlayerBattlefield = [...prev.player.battlefield];
                    let newCpuSquad = [...prev.cpu.squad];
                    let newCpuBattlefield = [...prev.cpu.battlefield];
                    const terrain = prev.battlefieldTerrainAttribute;
                    let tempLogEntries: LogEntry[] = [];

                    newPlayerSquad = newPlayerSquad.filter(card => {
                        if (canDeploy(card, terrain)) { newPlayerBattlefield.push(card); tempLogEntries.push({message: `プレイヤーの ${card.cardNameOmm || card.cardName} が戦場へ。`, source: 'PLAYER', timestamp: Date.now()}); return false; } return true;
                    });
                    newCpuSquad = newCpuSquad.filter(card => {
                        if (canDeploy(card, terrain)) { newCpuBattlefield.push(card); tempLogEntries.push({message: `CPUの ${card.cardNameOmm || card.cardName} が戦場へ。`, source: 'CPU', timestamp: Date.now()}); return false; } return true;
                    });
                    return { ...prev, player: { ...prev.player, squad: newPlayerSquad, battlefield: newPlayerBattlefield }, cpu: { ...prev.cpu, squad: newCpuSquad, battlefield: newCpuBattlefield }, phase: 'DEPLOYMENT_CHECK_UNILATERAL', gameLog: [...prev.gameLog, ...tempLogEntries], isPlayerTurnInteractive: false };
                });
                break;
            case 'DEPLOYMENT_CHECK_UNILATERAL':
                setGameState(prev => {
                    if (!prev) return null;
                    let newPlayerState = { ...prev.player };
                    let newCpuState = { ...prev.cpu };
                    let tempLogEntries: LogEntry[] = [];
                    let gameShouldEnd = false;
                    let winnerOnEnd: PlayerType | null = null;
                    let visualizeUnilateral: PlayerType | null = null;

                    const playerCanDeploy = newPlayerState.battlefield.length > 0;
                    const cpuCanDeploy = newCpuState.battlefield.length > 0;

                    if (playerCanDeploy && !cpuCanDeploy) {
                        tempLogEntries.push({message: "一方的出撃！プレイヤーのみ出撃。CPUは小隊の残存Mカード分の敗北ポイントを受けます。演出表示中...", source: 'SYSTEM', timestamp: Date.now()});
                        visualizeUnilateral = 'PLAYER';
                        const cpuSquadMCards = newCpuState.squad.filter(c => c.type === 'M');
                        if (cpuSquadMCards.length > 0) {
                            newCpuState.defeatPile = [...newCpuState.defeatPile, ...cpuSquadMCards];
                            const defeatPointsReceived = cpuSquadMCards.length;
                            newCpuState.defeatPoints += defeatPointsReceived;
                            newCpuState.squad = newCpuState.squad.filter(c => c.type !== 'M');
                            tempLogEntries.push({message: `CPUは敗北ポイント ${defeatPointsReceived}点 を獲得。合計: ${newCpuState.defeatPoints}点 (演出後確定)`, source: 'CPU', timestamp: Date.now()});
                            if (newCpuState.defeatPoints >= 10) {
                                gameShouldEnd = true; winnerOnEnd = 'PLAYER';
                            }
                        }
                    } else if (!playerCanDeploy && cpuCanDeploy) {
                        tempLogEntries.push({message: "一方的出撃！CPUのみ出撃。プレイヤーは小隊の残存Mカード分の敗北ポイントを受けます。演出表示中...", source: 'SYSTEM', timestamp: Date.now()});
                        visualizeUnilateral = 'CPU';
                        const playerSquadMCards = newPlayerState.squad.filter(c => c.type === 'M');
                         if (playerSquadMCards.length > 0) {
                            newPlayerState.defeatPile = [...newPlayerState.defeatPile, ...playerSquadMCards];
                            const defeatPointsReceived = playerSquadMCards.length;
                            newPlayerState.defeatPoints += defeatPointsReceived;
                            newPlayerState.squad = newPlayerState.squad.filter(c => c.type !== 'M'); 
                            tempLogEntries.push({message: `プレイヤーは敗北ポイント ${defeatPointsReceived}点 を獲得。合計: ${newPlayerState.defeatPoints}点 (演出後確定)`, source: 'PLAYER', timestamp: Date.now()});
                            if (newPlayerState.defeatPoints >= 10) {
                                gameShouldEnd = true; winnerOnEnd = 'CPU';
                            }
                        }
                    } else if (!playerCanDeploy && !cpuCanDeploy) {
                        addLogEntry("両者ともユニットを出撃できませんでした。戦闘は発生せず、ターン終了処理へ。", "SYSTEM");
                        return { ...prev, phase: 'END_TURN_CLEANUP', isPlayerTurnInteractive: false };
                    } else {
                        addLogEntry("両者ユニット出撃。戦闘計算へ。", "SYSTEM");
                        return { ...prev, phase: 'COMBAT_CALCULATE_INITIAL_POINTS', isPlayerTurnInteractive: false };
                    }
                    
                    if (visualizeUnilateral) {
                        setIsVisualizingUnilateralDeployment(true);
                        setUnilateralDeploymentWinner(visualizeUnilateral);
                        
                        setTimeout(() => {
                            setGameState(currentGs => {
                                if (!currentGs) return null;
                                let finalLog = [...currentGs.gameLog];
                                if (finalLog[finalLog.length -1].message.includes("演出表示中...")) finalLog.pop(); 
                                if (finalLog[finalLog.length -1].message.includes("(演出後確定)")) {
                                    finalLog[finalLog.length -1].message = finalLog[finalLog.length-1].message.replace(" (演出後確定)", "");
                                }

                                if (gameShouldEnd) {
                                    finalLog.push({message: winnerOnEnd === 'PLAYER' ? "CPUの敗北ポイントが10に達しました！プレイヤーの勝利！" : "プレイヤーの敗北ポイントが10に達しました！CPUの勝利！", source: 'SYSTEM', timestamp: Date.now()});
                                    return { ...currentGs, player: newPlayerState, cpu: newCpuState, phase: 'GAME_OVER', winner: winnerOnEnd, gameLog: finalLog, isPlayerTurnInteractive: false, isCPUMoving: false };
                                } else {
                                    finalLog.push({message: "一方的出撃処理完了。ターン終了処理へ。", source: 'SYSTEM', timestamp: Date.now()});
                                    return { ...currentGs, player: newPlayerState, cpu: newCpuState, phase: 'END_TURN_CLEANUP', gameLog: finalLog, isPlayerTurnInteractive: false, isCPUMoving: false };
                                }
                            });
                            setIsVisualizingUnilateralDeployment(false);
                            setUnilateralDeploymentWinner(null);
                        }, 2000);
                        return { ...prev, player: newPlayerState, cpu: newCpuState, gameLog: [...prev.gameLog, ...tempLogEntries], isPlayerTurnInteractive: false }; 
                    }
                    return { ...prev, gameLog: [...prev.gameLog, ...tempLogEntries] };
                });
                break;
            case 'COMBAT_CALCULATE_INITIAL_POINTS':
                setGameState(prev => {
                    if (!prev) return prev;
                    let playerCombatPoints = 0;
                    let cpuCombatPoints = 0;
                    let tempLogEntries: LogEntry[] = [];

                    prev.player.battlefield.filter(c => c.type === 'M').forEach(card => {
                        const baseP = parseInt(card.points) || 0;
                        const tagB = calculateTagBonus(card, prev.player.battlefield);
                        playerCombatPoints += (baseP + tagB);
                        if (tagB > 0) tempLogEntries.push({message: `プレイヤーの ${card.cardNameOmm || card.cardName} がタグボーナス +${tagB}P を獲得。`, source: 'PLAYER', timestamp: Date.now()});
                    });

                    prev.cpu.battlefield.filter(c => c.type === 'M').forEach(card => {
                        const baseP = parseInt(card.points) || 0;
                        const tagB = calculateTagBonus(card, prev.cpu.battlefield);
                        cpuCombatPoints += (baseP + tagB);
                        if (tagB > 0) tempLogEntries.push({message: `CPUの ${card.cardNameOmm || card.cardName} がタグボーナス +${tagB}P を獲得。`, source: 'CPU', timestamp: Date.now()});
                    });
                    
                    tempLogEntries.push({message: `タグボーナス計算後: プレイヤー ${playerCombatPoints}P, CPU ${cpuCombatPoints}P`, source: 'SYSTEM', timestamp: Date.now()});

                    const playerCombosResult = checkCombos(prev.player.battlefield.filter(c => c.type === 'M'), "プレイヤー");
                    playerCombosResult.achievedCombos.forEach(combo => playerCombatPoints += combo.points);
                    tempLogEntries = [...tempLogEntries, ...playerCombosResult.logMessages];

                    const cpuCombosResult = checkCombos(prev.cpu.battlefield.filter(c => c.type === 'M'), "CPU");
                    cpuCombosResult.achievedCombos.forEach(combo => cpuCombatPoints += combo.points);
                    tempLogEntries = [...tempLogEntries, ...cpuCombosResult.logMessages];
                    
                    if (playerCombosResult.achievedCombos.length > 0 || cpuCombosResult.achievedCombos.length > 0) {
                       tempLogEntries.push({message: `コンボ適用後: プレイヤー ${playerCombatPoints}P, CPU ${cpuCombatPoints}P`, source: 'SYSTEM', timestamp: Date.now()});
                    }


                    let csOrder: PlayerType[];
                    if (playerCombatPoints < cpuCombatPoints) { csOrder = ['PLAYER', 'CPU']; tempLogEntries.push({message:'プレイヤーがポイントが低いのでカウンター／支援を先に行います。', source: 'SYSTEM', timestamp: Date.now()}); }
                    else if (cpuCombatPoints < playerCombatPoints) { csOrder = ['CPU', 'PLAYER']; tempLogEntries.push({message: 'CPUがポイントが低いのでカウンター／支援を先に行います。', source: 'SYSTEM', timestamp: Date.now()}); }
                    else { csOrder = prev.activePlayer === 'PLAYER' ? ['CPU', 'PLAYER'] : ['PLAYER', 'CPU']; tempLogEntries.push({message: `戦闘ポイントが同じため、${csOrder[0] === 'PLAYER' ? 'プレイヤー' : 'CPU'}がカウンター／支援を先に行います。`, source: 'SYSTEM', timestamp: Date.now()});}
                    
                    const firstActor = csOrder[0];
                    return { 
                        ...prev, 
                        player: { ...prev.player, combatPoints: playerCombatPoints }, 
                        cpu: { ...prev.cpu, combatPoints: cpuCombatPoints }, 
                        counterSupportTurnOrder: csOrder, 
                        currentCounterSupportActorIndex: 0, 
                        phase: firstActor === 'PLAYER' ? 'COUNTER_SUPPORT_PLAYER_DRAW' : 'COUNTER_SUPPORT_CPU_DRAW', 
                        isPlayerTurnInteractive: firstActor === 'PLAYER', 
                        gameLog: [...prev.gameLog, ...tempLogEntries] 
                    };
                });
                break;
            case 'COUNTER_SUPPORT_CPU_DRAW':
                 setGameState(prev => {
                    if(!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.cpu.deck, 1);
                    if (drawnCards.length === 0) {
                        addLogEntry('CPUのデッキが尽きた！プレイヤーの勝利！', 'SYSTEM');
                        return {...prev, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('CPUがカウンター／支援フェイズでカードを1枚引きました。', 'CPU');
                    return {...prev, cpu: {...prev.cpu, deck: newDeck, hand: [...prev.cpu.hand, ...drawnCards]}, phase: 'COUNTER_SUPPORT_CPU_PLAY_C', isPlayerTurnInteractive: false};
                 });
                break;
            case 'COUNTER_SUPPORT_CPU_PLAY_C':
                setGameState(prev => prev ? ({ ...prev, isCPUMoving: true }) : null);
                aiService.getCPUCounterSupportAction(gameState).then(processCPUAction);
                break;
            case 'COMBAT_RESOLUTION':
                {
                    const playerPoints = gameState.player.combatPoints;
                    const cpuPoints = gameState.cpu.combatPoints;
                    let winnerForVisual: PlayerType | 'DRAW' | null = null;
                    if (playerPoints > cpuPoints) winnerForVisual = 'PLAYER';
                    else if (cpuPoints > playerPoints) winnerForVisual = 'CPU';
                    else winnerForVisual = 'DRAW';

                    setCombatResultVisual(winnerForVisual);
                    setIsVisualizingCombat(true);
                    addLogEntry(`戦闘力比較... プレイヤー: ${playerPoints} vs CPU: ${cpuPoints}. 結果表示中...`, 'SYSTEM');

                    setTimeout(() => {
                        setCombatResultVisual(null);
                        setGameState(currentGs => {
                            if (!currentGs) return null;
                            let newPlayerState = { ...currentGs.player };
                            let newCpuState = { ...currentGs.cpu };
                            let tempLogEntries: LogEntry[] = [];
                            let gameShouldEnd = false;
                            let winnerOnEnd: PlayerType | null = null;

                            const lastLog = currentGs.gameLog[currentGs.gameLog.length - 1];
                            let currentLog = [...currentGs.gameLog];
                            if (lastLog && lastLog.message.includes("結果表示中...")) {
                                currentLog.pop(); 
                            }
                            tempLogEntries.push({message: `戦闘解決確定: プレイヤー ${newPlayerState.combatPoints} vs CPU ${newCpuState.combatPoints}`, source: 'SYSTEM', timestamp: Date.now()});

                            const playerMOnBattlefield = newPlayerState.battlefield.filter(c => c.type === 'M');
                            const cpuMOnBattlefield = newCpuState.battlefield.filter(c => c.type === 'M');

                            if (newPlayerState.combatPoints > newCpuState.combatPoints) {
                                tempLogEntries.push({message: "プレイヤーの勝利！戦闘ポイントで上回りました。", source: 'SYSTEM', timestamp: Date.now()});
                                if (playerMOnBattlefield.length > 0) {
                                    tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
                                    newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerMOnBattlefield];
                                }
                                if (cpuMOnBattlefield.length > 0) {
                                    tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) はCPUの敗北フィールドへ。`, source: 'CPU', timestamp: Date.now()});
                                    newCpuState.defeatPile = [...newCpuState.defeatPile, ...cpuMOnBattlefield];
                                    const defeatedCpuCardCount = cpuMOnBattlefield.length;
                                    newCpuState.defeatPoints += defeatedCpuCardCount;
                                    tempLogEntries.push({message: `CPUは敗北ポイントを ${defeatedCpuCardCount}点獲得。合計: ${newCpuState.defeatPoints}点。`, source: 'CPU', timestamp: Date.now()});
                                    if (newCpuState.defeatPoints >= 10) {
                                        tempLogEntries.push({message: "CPUの敗北ポイントが10に達しました！ プレイヤーの勝利！", source: 'SYSTEM', timestamp: Date.now()});
                                        gameShouldEnd = true;
                                        winnerOnEnd = 'PLAYER';
                                    }
                                }
                            } else if (newCpuState.combatPoints > newPlayerState.combatPoints) {
                                tempLogEntries.push({message: "CPUの勝利！戦闘ポイントで上回りました。", source: 'SYSTEM', timestamp: Date.now()});
                                if (playerMOnBattlefield.length > 0) {
                                    tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) はプレイヤーの敗北フィールドへ。`, source: 'PLAYER', timestamp: Date.now()});
                                    newPlayerState.defeatPile = [...newPlayerState.defeatPile, ...playerMOnBattlefield];
                                    const defeatedCardCount = playerMOnBattlefield.length;
                                    newPlayerState.defeatPoints += defeatedCardCount;
                                    tempLogEntries.push({message: `プレイヤーは敗北ポイントを ${defeatedCardCount}点獲得。合計: ${newPlayerState.defeatPoints}点。`, source: 'PLAYER', timestamp: Date.now()});
                                    if (newPlayerState.defeatPoints >= 10) {
                                        tempLogEntries.push({message: "プレイヤーの敗北ポイントが10に達しました！ CPUの勝利！", source: 'SYSTEM', timestamp: Date.now()});
                                        gameShouldEnd = true;
                                        winnerOnEnd = 'CPU';
                                    }
                                }
                                if (cpuMOnBattlefield.length > 0) {
                                    tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
                                    newCpuState.discardPile = [...newCpuState.discardPile, ...cpuMOnBattlefield];
                                }
                            } else {
                                tempLogEntries.push({message: "引き分け！戦闘ポイントが同じです。", source: 'SYSTEM', timestamp: Date.now()});
                                if (playerMOnBattlefield.length > 0) {
                                    tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
                                    newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerMOnBattlefield];
                                }
                                if (cpuMOnBattlefield.length > 0) {
                                    tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
                                    newCpuState.discardPile = [...newCpuState.discardPile, ...cpuMOnBattlefield];
                                }
                            }

                            newPlayerState.battlefield = [];
                            newCpuState.battlefield = [];

                            if (gameShouldEnd) {
                                return {
                                    ...currentGs, player: newPlayerState, cpu: newCpuState, phase: 'GAME_OVER',
                                    winner: winnerOnEnd, isPlayerTurnInteractive: false, gameLog: [...currentLog, ...tempLogEntries], isCPUMoving: false,
                                };
                            } else {
                                tempLogEntries.push({message: '戦闘解決完了。終了フェイズへ。', source: 'SYSTEM', timestamp: Date.now()});
                                return {
                                    ...currentGs, player: newPlayerState, cpu: newCpuState, phase: 'END_TURN_CLEANUP',
                                    gameLog: [...currentLog, ...tempLogEntries], isPlayerTurnInteractive: false, isCPUMoving: false,
                                };
                            }
                        });
                        setIsVisualizingCombat(false);
                    }, 2000);
                }
                break;
            case 'END_TURN_CLEANUP':
                 setGameState(prev => {
                    if (!prev) return prev;

                    let newPlayerState = { ...prev.player };
                    let newCpuState = { ...prev.cpu };
                    let tempLogEntries: LogEntry[] = [];

                    if (newPlayerState.squad.length > 0) {
                        const playerSquadMCards = newPlayerState.squad.filter(c => c.type === 'M');
                        if (playerSquadMCards.length > 0) {
                            tempLogEntries.push({message: `プレイヤーの待機MS (${playerSquadMCards.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
                            newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerSquadMCards];
                            newPlayerState.squad = newPlayerState.squad.filter(c => c.type !== 'M'); 
                        }
                    }
                    if (newCpuState.squad.length > 0) {
                        const cpuSquadMCards = newCpuState.squad.filter(c => c.type === 'M');
                         if (cpuSquadMCards.length > 0) {
                            tempLogEntries.push({message: `CPUの待機MS (${cpuSquadMCards.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
                            newCpuState.discardPile = [...newCpuState.discardPile, ...cpuSquadMCards];
                            newCpuState.squad = newCpuState.squad.filter(c => c.type !== 'M'); 
                        }
                    }
                    if (newPlayerState.battlefield.length > 0) {
                        newPlayerState.discardPile = [...newPlayerState.discardPile, ...newPlayerState.battlefield];
                        newPlayerState.battlefield = [];
                    }
                    if (newCpuState.battlefield.length > 0) {
                        newCpuState.discardPile = [...newCpuState.discardPile, ...newCpuState.battlefield];
                        newCpuState.battlefield = [];
                    }
                    
                    tempLogEntries.push({message: `ターン終了。次のターンは ${prev.turnOrder[0] === 'PLAYER' ? 'CPU' : 'プレイヤー'} が地形選択の先手です。編成フェイズへ。`, source: 'SYSTEM', timestamp: Date.now()});


                    const nextActivePlayer = prev.activePlayer === 'PLAYER' ? 'CPU' : 'PLAYER';
                    return {
                        ...prev,
                        activePlayer: nextActivePlayer, 
                        turnOrder: prev.activePlayer === prev.turnOrder[0] ? [prev.turnOrder[1], prev.turnOrder[0]] : [prev.turnOrder[0], prev.turnOrder[1]], 
                        phase: 'FORMATION_PLAYER_DRAW', 
                        isPlayerTurnInteractive: true, 
                        player: {...newPlayerState, combatPoints: 0},
                        cpu: {...newCpuState, combatPoints: 0},
                        currentTerrainCard: null,
                        battlefieldTerrainAttribute: null,
                        counterSupportTurnOrder: null,
                        currentCounterSupportActorIndex: 0,
                        gameLog: [...prev.gameLog, ...tempLogEntries] as LogEntry[]
                    };
                 });
                break;
        }
    } else if (gameState.isPlayerTurnInteractive) { 
        switch (currentPhase) {
            case 'FORMATION_PLAYER_DRAW':
                setGameState(prev => {
                    if (!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.player.deck, 1);
                    if (drawnCards.length === 0) {
                        addLogEntry('プレイヤーのデッキが尽きた！CPUの勝利！', 'SYSTEM');
                        return {...prev, phase: 'GAME_OVER', winner: 'CPU', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('プレイヤーが編成フェイズでカードを1枚引きました。', 'PLAYER');
                    return {...prev, player: {...prev.player, deck: newDeck, hand: [...prev.player.hand, ...drawnCards]}, phase: 'FORMATION_PLAYER_PLACE'};
                });
                break;
            case 'COUNTER_SUPPORT_PLAYER_DRAW':
                setGameState(prev => {
                    if (!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.player.deck, 1);
                     if (drawnCards.length === 0) {
                        addLogEntry('プレイヤーのデッキが尽きた！CPUの勝利！', 'SYSTEM');
                        return {...prev, phase: 'GAME_OVER', winner: 'CPU', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('プレイヤーがカウンター／支援フェイズでカードを1枚引きました。', 'PLAYER');
                    return {...prev, player: {...prev.player, deck: newDeck, hand: [...prev.player.hand, ...drawnCards]}, phase: 'COUNTER_SUPPORT_PLAYER_PLAY_C'};
                });
                break;
        }
    }

  }, [gameState, processCPUAction, isVisualizingCombat, isVisualizingUnilateralDeployment, addLogEntry]); 


  if (!gameState) {
    return <div className="p-8 text-center text-slate-600">ゲームを初期化中...</div>;
  }

  const { player, cpu, phase, gameLog, winner, currentTerrainCard, battlefieldTerrainAttribute, isCPUMoving, isPlayerTurnInteractive } = gameState;
  const phaseInstructionText = getPhaseInstruction(phase, player.hand, player.squad, isVisualizingUnilateralDeployment, unilateralDeploymentWinner);
  const canPlayerPlaySelectedCCard = selectedCardLocal && selectedCardLocal.type === 'C' && (player.battlefield.filter(c => c.type === 'M').length > 0 || (selectedCardLocal.effect && selectedCardLocal.effect.includes("戦場にMカードがいなくても使用可能")) || selectedCardLocal.cardNumber.startsWith('C-011'));


  let phaseInstructionContainerClass = 'bg-slate-100';
  let phaseInstructionBaseTextClass = 'text-slate-700';
  let phaseInstructionStatusTextClass = 'text-slate-500';

  if (isVisualizingCombat || isVisualizingUnilateralDeployment) {
    phaseInstructionContainerClass = 'bg-purple-100';
    phaseInstructionBaseTextClass = 'text-purple-700';
    phaseInstructionStatusTextClass = 'text-purple-700';
  } else if (isPlayerTurnInteractive) {
    phaseInstructionContainerClass = 'bg-sky-100';
    phaseInstructionBaseTextClass = 'text-sky-700';
  } else if (
    phase === 'FORMATION_CPU_DRAW' ||
    phase === 'FORMATION_CPU_PLACE' ||
    phase === 'DEPLOYMENT_CPU_TERRAIN' ||
    phase === 'COUNTER_SUPPORT_CPU_DRAW' ||
    phase === 'COUNTER_SUPPORT_CPU_PLAY_C'
  ) {
    phaseInstructionContainerClass = 'bg-red-100';
    phaseInstructionBaseTextClass = 'text-red-700';
    phaseInstructionStatusTextClass = 'text-red-700';
  }


  return (
    <GamePageContext.Provider value={{ handleImageError, imageLoadErrors, setSelectedCard }}>
      <div className="min-h-screen bg-slate-100 text-slate-800 p-1.5 sm:p-2 flex flex-col">
        <style dangerouslySetInnerHTML={{ __html: customScrollbarAndAnimationStyles }} />
        <header className="mb-1 flex justify-between items-center"> 
          <h1 className="text-lg sm:text-xl font-bold text-sky-600 flex items-center gap-2">
            モビルパワーズ - CPU対戦 
          </h1> 
          <button onClick={onExit} className="bg-red-500 hover:bg-red-600 text-white py-1 px-2.5 text-xs rounded shadow"> 
            ゲーム終了
          </button>
        </header>

        {winner && (
          <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="gameOverHeading">
            <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full">
              <h2 id="gameOverHeading" className="text-5xl font-bold mb-4 text-yellow-500">ゲーム終了！</h2>
              <p className="text-3xl text-slate-700 mb-8">{winner === 'PLAYER' ? 'プレイヤーの勝利！' : 'CPUの勝利！'}</p>
              <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <button onClick={() => initializeGame(initialDeckCode, initialCpuDeckCode)} className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded text-xl shadow transition-colors">再戦</button>
                  <button onClick={onExit} className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded text-xl shadow transition-colors">メインメニューへ</button>
              </div>
            </div>
          </div>
        )}

        {isLargeCardModalOpen && cardForLargeModal && cardForLargeModal.imageUrl && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 transition-opacity duration-300 ease-in-out"
            onClick={closeLargeCardModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="largeCardModalTitle"
          >
            <div
              className={`relative max-w-full max-h-full flex items-center justify-center ${isKiraCard(cardForLargeModal) ? 'kira-border-animated rounded-lg' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={cardForLargeModal.imageUrl}
                alt={`Large view of ${cardForLargeModal.cardName}`}
                className="block max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={closeLargeCardModal}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                aria-label="閉じる"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 sm:w-8 sm:h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 id="largeCardModalTitle" className="sr-only">
                {`${cardForLargeModal.cardName} の拡大表示`}
              </h2>
            </div>
          </div>
        )}

        {isDiscardPileModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" role="dialog" aria-modal="true" aria-labelledby="discardModalHeading">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 id="discardModalHeading" className="text-xl font-semibold text-sky-700">
                  {discardPileOwnerName}の捨て札 ({cardsInModal.length}枚)
                </h2>
                <button
                  onClick={closeDiscardPileModal}
                  className="text-slate-500 hover:text-slate-700 text-3xl leading-none"
                  aria-label="閉じる"
                >
                  &times;
                </button>
              </div>
              {cardsInModal.length > 0 ? (
                <div className="flex-grow overflow-y-auto custom-scrollbar-xs pr-2">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {cardsInModal.map((card, idx) => (
                      <GameCard
                        key={`modal-discard-${card.cardNumber}-${idx}`}
                        card={card}
                        isPlayerCard={discardPileOwnerName === 'プレイヤー'}
                        location="discardPile"
                        onClick={() => setSelectedCardLocal(card)}
                        isSelected={selectedCardLocal?.cardNumber === card.cardNumber && selectedCardLocal?.type === card.type}
                        isDisabled={false}
                        uniqueKey={`modal-discard-${card.cardNumber}-${idx}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">捨て札はありません。</p>
              )}
            </div>
          </div>
        )}

        {isDeckModalOpen && gameState && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" role="dialog" aria-modal="true" aria-labelledby="deckModalHeading">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 id="deckModalHeading" className="text-xl font-semibold text-sky-700">
                  プレイヤーの山札 ({gameState.player.deck.length}枚)
                </h2>
                <button
                  onClick={closeDeckModal}
                  className="text-slate-500 hover:text-slate-700 text-3xl leading-none"
                  aria-label="閉じる"
                >
                  &times;
                </button>
              </div>
              {gameState.player.deck.length > 0 ? (
                <div className="flex-grow overflow-y-auto custom-scrollbar-xs pr-2">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {gameState.player.deck.map((card, idx) => (
                      <GameCard
                        key={`modal-deck-${card.cardNumber}-${idx}`}
                        card={card}
                        isPlayerCard={true}
                        location="deck"
                        onClick={() => setSelectedCardLocal(card)}
                        isSelected={selectedCardLocal?.cardNumber === card.cardNumber && selectedCardLocal?.type === card.type}
                        isDisabled={false}
                        uniqueKey={`modal-deck-${card.cardNumber}-${idx}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">山札はありません。</p>
              )}
            </div>
          </div>
        )}

        {/* Main game area grid */}
        <div className="grid grid-cols-2 gap-1 items-stretch">

          {/* Battlefield Common Info Area */}
          <div className="w-full bg-white pt-1 px-1 pb-0 sm:pt-1.5 sm:px-1.5 sm:pb-0 rounded-lg shadow-lg space-y-1 col-span-2 self-start">
              <p className={`text-center text-xs mb-0.5 p-0.5 rounded shadow-sm ${phaseInstructionContainerClass} ${phaseInstructionBaseTextClass}`}>
                {phaseInstructionText}
                {isCPUMoving && (phase === 'FORMATION_CPU_PLACE' || phase === 'COUNTER_SUPPORT_CPU_PLAY_C' || phase === 'DEPLOYMENT_CPU_TERRAIN')
                  ? <span className={`ml-1 italic animate-pulse ${phaseInstructionStatusTextClass}`}>(CPU思考中...)</span>
                  : ''}
                {(isVisualizingCombat || isVisualizingUnilateralDeployment) && <span className={`ml-1 italic animate-pulse ${phaseInstructionStatusTextClass}`}>(演出表示中...)</span>}
              </p>

              <div className="flex justify-between items-start text-xs my-0.5 px-0.5 border-b border-t border-slate-200 py-0.5">
                <div className="text-left w-1/2 pr-0.5">
                  <p className="font-semibold text-sky-700 mb-0 leading-tight">プレイヤー: 敗北P: {player.defeatPoints}</p>
                  <p className="text-slate-600 leading-tight">
                    <button
                      onClick={openPlayerDeckModal}
                      className="underline hover:text-sky-500 disabled:text-slate-400 disabled:no-underline"
                      disabled={player.deck.length === 0 || !!winner}
                      aria-label="プレイヤーの山札を見る"
                    >
                      山: {player.deck.length}
                    </button>
                    {' '} | {' '}
                    <button
                      onClick={() => openDiscardPileModal('PLAYER')}
                      className="underline hover:text-sky-500 disabled:text-slate-400 disabled:no-underline"
                      disabled={player.discardPile.length === 0 || !!winner}
                      aria-label="プレイヤーの捨て札を見る"
                    >
                      捨: {player.discardPile.length}
                    </button>
                     {' '} | 手札: {player.hand.length}
                  </p>
                </div>
                <div className="text-right w-1/2 pl-0.5">
                  <p className="font-semibold text-red-600 mb-0 leading-tight">CPU: 敗北P: {cpu.defeatPoints}</p>
                  <p className="text-slate-600 leading-tight">
                    山: {cpu.deck.length} |{' '}
                    <button
                      onClick={() => openDiscardPileModal('CPU')}
                      className="underline hover:text-red-500 disabled:text-slate-400 disabled:no-underline"
                      disabled={cpu.discardPile.length === 0 || !!winner}
                      aria-label="CPUの捨て札を見る"
                    >
                      捨: {cpu.discardPile.length}
                    </button>
                     {' '} | 手札: {cpu.hand.length}
                  </p>
                </div>
              </div>
             
              <div className="mt-0.5 mb-0.5 p-1 sm:p-1.5 bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 rounded-lg border border-slate-400 shadow-xl flex justify-between items-center text-center" aria-label="戦場情報">
                 <div className={`w-1/5 flex-shrink-0 p-0.5 rounded-md transition-all duration-300 ${
                    ((combatResultVisual === 'PLAYER' || combatResultVisual === 'DRAW') && isVisualizingCombat) || (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'PLAYER')
                    ? (combatResultVisual === 'PLAYER' || (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'PLAYER') ? 'blinking-winner-player' : 'blinking-winner-draw')
                    : 'bg-sky-100'
                }`}>
                  <span
                    className={`text-2xl sm:text-3xl font-bold tracking-tight block text-center ${
                      !(((combatResultVisual === 'PLAYER' || combatResultVisual === 'DRAW') && isVisualizingCombat) || (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'PLAYER')) ? 'text-sky-600' : ''
                    }`}
                    aria-label={`プレイヤーの戦闘ポイント ${player.combatPoints}`}
                  >
                    {player.combatPoints}
                  </span>
                </div>

                <div className="flex-grow px-0.5 sm:px-1 min-w-0 border-l border-r border-slate-300 mx-0.5 flex items-center justify-center">
                  {isVisualizingUnilateralDeployment && unilateralDeploymentWinner ? (
                    <p
                      className={`text-3xl sm:text-4xl font-extrabold text-center animate-pulse ${
                        unilateralDeploymentWinner === 'PLAYER' ? 'text-sky-500' : 'text-red-500'
                      }`}
                      aria-live="assertive"
                    >
                      一方的な戦闘！！
                    </p>
                  ) : currentTerrainCard ? (
                    <div className="text-center">
                      <p
                        className="text-[9px] sm:text-[10px] text-slate-700 font-semibold truncate"
                        title={currentTerrainCard.cardNameOmm || currentTerrainCard.cardName}
                      >
                        地形: {currentTerrainCard.cardNameOmm || currentTerrainCard.cardName}
                      </p>
                      <p className="text-[8px] sm:text-[9px] text-orange-600 font-medium" style={{ letterSpacing: '0.05em' }}>
                        属性: {battlefieldTerrainAttribute || "なし"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[9px] sm:text-[10px] text-slate-400 italic text-center">地形未定</p>
                  )}
                </div>

                <div className={`w-1/5 flex-shrink-0 p-0.5 rounded-md transition-all duration-300 ${
                     ((combatResultVisual === 'CPU' || combatResultVisual === 'DRAW') && isVisualizingCombat) || (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'CPU')
                    ? (combatResultVisual === 'CPU' || (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'CPU') ? 'blinking-winner-cpu' : 'blinking-winner-draw')
                    : 'bg-red-100'
                }`}>
                  <span
                    className={`text-2xl sm:text-3xl font-bold tracking-tight block text-center ${
                       !(((combatResultVisual === 'CPU' || combatResultVisual === 'DRAW') && isVisualizingCombat) || (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'CPU')) ? 'text-red-600' : ''
                    }`}
                    aria-label={`CPUの戦闘ポイント ${cpu.combatPoints}`}
                  >
                    {cpu.combatPoints}
                  </span>
                </div>
              </div>

              <div className="mt-1 bg-slate-50 p-1 sm:p-1.5 rounded-lg shadow-inner max-h-[3.5rem] sm:max-h-20 overflow-y-auto border border-slate-200 custom-scrollbar-xs" role="log" aria-live="polite">
                <h3 className="text-xs font-semibold text-sky-700 mb-0 sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 pb-0 border-b border-slate-200">ゲームログ</h3>
                <ul className="text-[10px] sm:text-xs">
                  {gameLog.slice().reverse().map((logEntry, index) => {
                    let textColor = 'text-slate-700';
                    let prefix = '';
                    if (logEntry.source === 'PLAYER') {
                      textColor = 'text-sky-600 font-medium';
                      prefix = '[プレイヤー] ';
                    } else if (logEntry.source === 'CPU') {
                      textColor = 'text-red-600 font-medium';
                      prefix = '[CPU] ';
                    }
                    return (
                      <li key={`${logEntry.timestamp}-${index}`} className={`px-0.5 py-px leading-normal hover:bg-slate-100 rounded-sm break-words ${textColor}`}>
                        {prefix}{logEntry.message}
                      </li>
                    );
                  })}
                </ul>
              </div>
          </div>

          {/* Player Area */}
          <div className="w-full bg-white pb-1 px-1 pt-0 sm:pb-1.5 sm:px-1.5 sm:pt-0 rounded-lg shadow-lg flex flex-col">
            <div className="mb-1">
              <div className="mt-0.5 h-[130px] bg-sky-50 p-0.5 sm:p-1.5 rounded border border-sky-200 items-start relative grid grid-cols-3 gap-0.5 sm:flex sm:flex-wrap sm:gap-1.5 sm:justify-start" aria-label="Player Battlefield Area">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-extrabold text-sky-500 opacity-10 pointer-events-none select-none z-0 whitespace-nowrap" aria-hidden="true">
                  最前線フィールド
                </span>
                {player.battlefield.map((card, idx) => <GameCard card={card} isPlayerCard={true} location="battlefield" onClick={setSelectedCardLocal} isSelected={selectedCardLocal?.cardNumber === card.cardNumber} isDisabled={isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner || !gameState.isPlayerTurnInteractive && (gameState.phase !== 'COUNTER_SUPPORT_PLAYER_PLAY_C')} uniqueKey={`player-bf-${card.cardNumber}-${idx}`} key={`player-bf-${card.cardNumber}-${idx}`} />)}
              </div>
              <div className="mt-0.5 h-[130px] bg-slate-100 p-0.5 sm:p-1.5 rounded border border-slate-200 items-start relative grid grid-cols-3 gap-0.5 sm:flex sm:flex-wrap sm:gap-1.5 sm:justify-start" aria-label="Player Squad Area">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-extrabold text-sky-500 opacity-10 pointer-events-none select-none z-0 whitespace-nowrap" aria-hidden="true">
                  小隊フィールド
                </span>
                {player.squad.map((card, idx) => <GameCard card={card} isPlayerCard={true} location="squad" onClick={setSelectedCardLocal} isSelected={selectedCardLocal?.cardNumber === card.cardNumber} isDisabled={isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner || !gameState.isPlayerTurnInteractive && (gameState.phase !== 'COUNTER_SUPPORT_PLAYER_PLAY_C')} uniqueKey={`player-sq-${card.cardNumber}-${idx}`} key={`player-sq-${card.cardNumber}-${idx}`} />)}
              </div>
            </div>

            <div className="mt-0.5 flex-grow flex flex-col">
              <div className="mb-1 flex justify-center sm:justify-start items-center space-x-1 h-9">
                {(phase === 'FORMATION_PLAYER_PLACE' || phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C') && (
                  <>
                    {phase === 'FORMATION_PLAYER_PLACE' && (
                      <>
                        <button
                            onClick={() => handlePlayerAction('PLAY_M_CARD_TO_SQUAD', selectedCardLocal!)}
                            className="bg-green-500 hover:bg-green-600 text-white py-0.5 px-2 text-[10px] sm:text-xs rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedCardLocal || selectedCardLocal.type !== 'M' || player.squad.length >= 3 || !isPlayerTurnInteractive}
                            aria-label="選択したMカードを小隊に配置する"
                        >
                            小隊へ配置
                        </button>
                        <button
                            onClick={() => handlePlayerAction('DISCARD_TO_DEFEAT_PILE', selectedCardLocal!)}
                            className="bg-orange-500 hover:bg-orange-600 text-white py-0.5 px-2 text-[10px] sm:text-xs rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                                !selectedCardLocal ||
                                !isPlayerTurnInteractive ||
                                (player.squad.length < 3 && player.hand.some(c => c.type === 'M'))
                            }
                            aria-label="選択したカードを手札から捨て札へ送る（編成時）"
                        >
                            捨て札へ (編成時)
                        </button>
                      </>
                    )}
                    {phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C' && (
                      <>
                        <button
                            onClick={() => handlePlayerAction('PLAY_C_CARD', selectedCardLocal!)}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-0.5 px-2 text-[10px] sm:text-xs rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedCardLocal || !canPlayerPlaySelectedCCard || !isPlayerTurnInteractive}
                            title={!selectedCardLocal || (selectedCardLocal.type === 'C' && !canPlayerPlaySelectedCCard) ? "戦場にMカードが必要です (一部例外あり)" : "カウンターカードを使用"}
                            aria-label="選択したCカードを使用する"
                        >
                            Cカード使用
                        </button>
                        <button
                            onClick={() => handlePlayerAction('DISCARD_FROM_HAND_CS', selectedCardLocal!)}
                            className="bg-slate-400 hover:bg-slate-500 text-white py-0.5 px-2 text-[10px] sm:text-xs rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedCardLocal || !isPlayerTurnInteractive}
                            aria-label="選択したカードを手札から捨てる"
                        >
                            手札から捨てる
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="flex-grow grid grid-cols-3 gap-0.5 p-0.5 sm:flex sm:flex-wrap sm:gap-1.5 sm:justify-start mt-0.5 min-h-[236px] max-h-[236px] sm:min-h-[242px] sm:max-h-[242px] bg-slate-100 sm:p-1.5 rounded border border-slate-200 custom-scrollbar-xs overflow-y-auto">
                {player.hand.map((card, idx) => (
                  <GameCard
                    card={card}
                    isPlayerCard={true}
                    location="hand"
                    onClick={setSelectedCardLocal}
                    isSelected={selectedCardLocal?.cardNumber === card.cardNumber && selectedCardLocal?.type === card.type}
                    isDisabled={!isPlayerTurnInteractive || isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner}
                    uniqueKey={`player-hand-${card.cardNumber}-${idx}`}
                    key={`player-hand-${card.cardNumber}-${idx}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CPU Area + Selected Card Details Column */}
          <div className="w-full space-y-1 flex flex-col">
            <div className="bg-white pb-1 px-1 pt-0 sm:pb-1.5 sm:px-1.5 sm:pt-0 rounded-lg shadow-lg">
              <div className="mb-1">
                <div className="mt-0.5 h-[130px] bg-red-50 p-0.5 sm:p-1.5 rounded border border-red-200 items-start relative grid grid-cols-3 gap-0.5 sm:flex sm:flex-wrap sm:gap-1.5 sm:justify-start" aria-label="CPU Battlefield Area">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-extrabold text-red-500 opacity-10 pointer-events-none select-none z-0 whitespace-nowrap" aria-hidden="true">
                    CPU 最前線
                  </span>
                  {cpu.battlefield.map((card, idx) => (
                    <GameCard
                      card={card}
                      isPlayerCard={false}
                      location="battlefield"
                      onClick={setSelectedCardLocal}
                      isSelected={selectedCardLocal?.cardNumber === card.cardNumber && selectedCardLocal?.type === card.type}
                      isDisabled={isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner}
                      uniqueKey={`cpu-bf-${card.cardNumber}-${idx}`}
                      key={`cpu-bf-${card.cardNumber}-${idx}`}
                    />
                  ))}
                </div>
                <div className="mt-0.5 h-[130px] bg-red-50 p-0.5 sm:p-1.5 rounded border border-red-200 items-start relative grid grid-cols-3 gap-0.5 sm:flex sm:flex-wrap sm:gap-1.5 sm:justify-start" aria-label="CPU Squad Area">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-extrabold text-red-500 opacity-10 pointer-events-none select-none z-0 whitespace-nowrap" aria-hidden="true">
                    CPU 小隊
                  </span>
                  {cpu.squad.map((card, idx) => (
                    <GameCard
                      card={card}
                      isPlayerCard={false}
                      location="squad"
                      onClick={setSelectedCardLocal}
                      isSelected={selectedCardLocal?.cardNumber === card.cardNumber && selectedCardLocal?.type === card.type}
                      isDisabled={isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner}
                      uniqueKey={`cpu-sq-${card.cardNumber}-${idx}`}
                      key={`cpu-sq-${card.cardNumber}-${idx}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-1 sm:p-1.5 rounded-lg shadow-lg flex-grow flex flex-col">
              <h3 className="text-sm sm:text-base font-semibold text-sky-700 mb-0.5 border-b border-slate-200 pb-0">選択カード詳細</h3>
              <div className="flex-grow flex flex-col sm:flex-row overflow-hidden">
                {selectedCardLocal ? (
                  <>
                    <div
                      className={`flex-shrink-0 order-1 w-full sm:w-1/2 h-auto sm:h-full p-1 flex items-center justify-center rounded-md
                                  ${selectedCardLocal.imageUrl && !imageLoadErrors[`selected-${selectedCardLocal.cardNumber}`] ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                                  ${isKiraCard(selectedCardLocal) ? 'kira-border-animated' : ''}`}
                      onClick={() => selectedCardLocal.imageUrl && !imageLoadErrors[`selected-${selectedCardLocal.cardNumber}`] && openLargeCardModal(selectedCardLocal)}
                      role={selectedCardLocal.imageUrl && !imageLoadErrors[`selected-${selectedCardLocal.cardNumber}`] ? "button" : undefined}
                      aria-label={selectedCardLocal.imageUrl && !imageLoadErrors[`selected-${selectedCardLocal.cardNumber}`] ? `${selectedCardLocal.cardName} の画像を拡大表示する` : undefined}
                      tabIndex={selectedCardLocal.imageUrl && !imageLoadErrors[`selected-${selectedCardLocal.cardNumber}`] ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (selectedCardLocal.imageUrl && !imageLoadErrors[`selected-${selectedCardLocal.cardNumber}`]) {
                            openLargeCardModal(selectedCardLocal);
                          }
                        }
                      }}
                    >
                      {selectedCardLocal.imageUrl && !imageLoadErrors[`selected-${selectedCardLocal.cardNumber}`] ? (
                          <img
                              src={selectedCardLocal.imageUrl}
                              alt={selectedCardLocal.cardName}
                              className="max-w-full max-h-full sm:max-h-72 object-contain rounded shadow"
                              onError={() => handleImageError(`selected-${selectedCardLocal.cardNumber}`)}
                          />
                      ) : (
                          <div className="w-full h-full max-h-[180px] sm:max-h-72 aspect-[5/7] flex items-center justify-center bg-slate-200 rounded text-slate-500 text-xs">
                             {selectedCardLocal.imageUrl ? '画像エラー' : '画像なし'}
                          </div>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-grow order-2 h-full overflow-y-auto custom-scrollbar-xs p-1 sm:p-1.5">
                      <div className="text-slate-700 space-y-0.5">
                        <p className="font-semibold text-xs">{selectedCardLocal.cardNumber} {isKiraCard(selectedCardLocal) && <span className="text-xs font-bold" style={{background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>キラ</span>}</p>
                        <p className="font-medium text-xs">{selectedCardLocal.cardName} {selectedCardLocal.cardNameOmm && selectedCardLocal.cardNameOmm !== selectedCardLocal.cardName ? `(${selectedCardLocal.cardNameOmm})` : ''}</p>
                        <p className="text-[10px]">
                            {selectedCardLocal.type === 'M' ?
                                `種別: M | P: ${selectedCardLocal.points} | 所属: ${selectedCardLocal.factionAffiliation || '-'} | 地形: ${selectedCardLocal.terrainTypeMCards || '-'}` :
                                `種別: C | 所属: ${selectedCardLocal.factionAffiliation || '-'} | 効果地形: ${selectedCardLocal.battlefieldTerrain || '-'}`
                            }
                        </p>
                        <p className="whitespace-pre-wrap text-[10px] leading-snug"><strong className="text-sky-700">フレーバー:</strong> {selectedCardLocal.textAbility || '-'}</p>
                        {selectedCardLocal.type === 'C' && selectedCardLocal.effect && (
                            <p className="whitespace-pre-wrap text-[10px] leading-snug"><strong className="text-red-700">効果:</strong> {selectedCardLocal.effect}</p>
                        )}
                        <p className="whitespace-pre-wrap text-[10px] leading-snug text-slate-600"><strong className="text-orange-700">タグ:</strong> {selectedCardLocal.tags || '-'}</p>
                        <p className="whitespace-pre-wrap text-[10px] leading-snug text-purple-700"><strong className="text-purple-700">Var:</strong> {selectedCardLocal.gameVar || '-'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 italic text-center m-auto text-xs">カードをクリックすると詳細情報が表示されます。</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GamePageContext.Provider>
  );
};
