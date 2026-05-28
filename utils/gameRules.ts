import { Card, Combo, GamePhase, GameState, LogEntry, PlayerState, PlayerType } from '../types';
import { getCardInstanceId, isSameCardInstance } from './cardIdentity';

export const initialPlayerState = (): PlayerState => ({
  deck: [],
  hand: [],
  squad: [],
  battlefield: [],
  defeatPile: [],
  discardPile: [],
  defeatPoints: 0,
  combatPoints: 0,
});

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const drawCards = (deck: Card[], count: number): { newDeck: Card[]; drawnCards: Card[] } => {
  const drawnCards = deck.slice(0, count);
  const newDeck = deck.slice(count);
  return { newDeck, drawnCards };
};

export const canDeploy = (mCard: Card, terrainAttribute: string | null): boolean => {
  if (mCard.type !== 'M' || !mCard.terrainTypeMCards || !terrainAttribute) return false;
  for (const unitTerrain of mCard.terrainTypeMCards) {
    if (terrainAttribute.includes(unitTerrain)) return true;
  }
  return false;
};

export const isCCardTerrainPlayable = (card: Card, terrainAttribute: string | null): boolean => {
  if (card.type !== 'C' || !card.battlefieldTerrain || !terrainAttribute) return false;
  if (card.battlefieldTerrain.includes('宇陸海空')) return true;
  return Array.from(card.battlefieldTerrain).some(terrain => terrainAttribute.includes(terrain));
};

export const canPlayCCard = (
  card: Card,
  actorState: PlayerState,
  _currentGameState: GameState,
): boolean => {
  if (card.type !== 'C') return false;
  const activeMCount = actorState.battlefield.filter(isActiveMCard).length;
  if (card.cardNumber.startsWith('C-012')) return activeMCount >= 2;
  const hasBattlefieldM = activeMCount > 0;
  const canPlayWithoutOwnM = card.cardNumber.startsWith('C-011');
  return hasBattlefieldM || canPlayWithoutOwnM;
};

export type CCardTargetMode = 'OWN_M' | 'OPPONENT_M' | 'OPPONENT_SEA_M' | 'OPPONENT_LAND_M' | null;

interface CCardEffectResult {
  player: PlayerState;
  cpu: PlayerState;
  logMessages: LogEntry[];
}

const getDisplayName = (card: Card): string => card.cardNameOmm || card.cardName;

const isActiveMCard = (card: Card): boolean => card.type === 'M' && !card.isDestroyed;

const hasFactionMark = (card: Card, factionMark: string): boolean => card.factionAffiliation === factionMark;

const clearBattlefieldEntryState = (card: Card): Card => {
  const nextCard = { ...card };
  delete nextCard.isDestroyed;
  delete nextCard.isTapped;
  delete nextCard.isPendingDiscard;
  delete nextCard.isPendingDefeat;
  return nextCard;
};

const getBattlefieldPower = (battlefield: Card[], ownerName: string): number => {
  const mCards = battlefield.filter(isActiveMCard);
  const baseTotal = mCards.reduce((total, card) => total + (parseInt(card.points, 10) || 0), 0);
  const selectedCombo = checkCombos(mCards, ownerName).achievedCombos[0];
  return baseTotal + (selectedCombo?.points || 0);
};

const chooseHighestPointMCard = (cards: Card[]): Card | undefined => {
  return [...cards]
    .filter(card => card.type === 'M')
    .sort((a, b) => {
      const pointDiff = (parseInt(b.points, 10) || 0) - (parseInt(a.points, 10) || 0);
      return pointDiff !== 0 ? pointDiff : a.cardNumber.localeCompare(b.cardNumber);
    })[0];
};

const chooseLowestPointMCard = (cards: Card[]): Card | undefined => {
  return [...cards]
    .filter(card => card.type === 'M')
    .sort((a, b) => {
      const pointDiff = (parseInt(a.points, 10) || 0) - (parseInt(b.points, 10) || 0);
      return pointDiff !== 0 ? pointDiff : a.cardNumber.localeCompare(b.cardNumber);
    })[0];
};

export const getCCardTargetMode = (card: Card | null | undefined): CCardTargetMode => {
  if (!card || card.type !== 'C') return null;
  if (card.cardNumber.startsWith('C-006')) return 'OPPONENT_M';
  if (card.cardNumber.startsWith('C-012')) return 'OWN_M';
  if (card.cardNumber.startsWith('C-015')) return 'OPPONENT_SEA_M';
  if (card.cardNumber.startsWith('C-016')) return 'OPPONENT_LAND_M';
  return null;
};

export const getCCardTargetCandidates = (
  card: Card,
  currentGameState: GameState,
  byPlayerType: PlayerType,
): Card[] => {
  const mode = getCCardTargetMode(card);
  const actor = byPlayerType === 'PLAYER' ? currentGameState.player : currentGameState.cpu;
  const opponent = byPlayerType === 'PLAYER' ? currentGameState.cpu : currentGameState.player;
  const ownM = actor.battlefield.filter(isActiveMCard);
  const opponentM = opponent.battlefield.filter(isActiveMCard);

  switch (mode) {
    case 'OWN_M':
      if (card.cardNumber.startsWith('C-012') && ownM.length < 2) return [];
      return ownM;
    case 'OPPONENT_M':
      return opponentM;
    case 'OPPONENT_SEA_M':
      return opponentM.filter(fieldCard => fieldCard.terrainTypeMCards.includes('海'));
    case 'OPPONENT_LAND_M':
      return opponentM.filter(fieldCard => fieldCard.terrainTypeMCards.includes('陸'));
    default:
      return [];
  }
};

const maxFieldOrder = (playerState: PlayerState): number => {
  const orders = [...playerState.squad, ...playerState.battlefield]
    .map(card => card.fieldOrder)
    .filter((order): order is number => typeof order === 'number');
  return orders.length > 0 ? Math.max(...orders) : -1;
};

const setBattlefieldWithPowerDelta = (
  playerState: PlayerState,
  nextBattlefield: Card[],
  ownerName: string,
): PlayerState => {
  const before = getBattlefieldPower(playerState.battlefield, ownerName);
  const after = getBattlefieldPower(nextBattlefield, ownerName);
  return {
    ...playerState,
    battlefield: nextBattlefield,
    combatPoints: Math.max(0, playerState.combatPoints + after - before),
  };
};

export const applyCCardEffect = (
  playedCard: Card,
  currentGameState: GameState,
  byPlayerType: PlayerType,
  targetCard?: Card,
): CCardEffectResult => {
  const actorName = byPlayerType === 'PLAYER' ? 'プレイヤー' : 'CPU';
  const opponentName = byPlayerType === 'PLAYER' ? 'CPU' : 'プレイヤー';
  const actorOwnerName = byPlayerType === 'PLAYER' ? 'プレイヤー' : 'CPU';
  const opponentOwnerName = byPlayerType === 'PLAYER' ? 'CPU' : 'プレイヤー';
  let player = { ...currentGameState.player };
  let cpu = { ...currentGameState.cpu };
  const logMessages: LogEntry[] = [{
    message: `${actorName}が ${getDisplayName(playedCard)} を使用。`,
    source: byPlayerType,
    timestamp: Date.now(),
  }];

  const getActor = () => (byPlayerType === 'PLAYER' ? player : cpu);
  const getOpponent = () => (byPlayerType === 'PLAYER' ? cpu : player);
  const setActor = (nextState: PlayerState) => {
    if (byPlayerType === 'PLAYER') player = nextState;
    else cpu = nextState;
  };
  const setOpponent = (nextState: PlayerState) => {
    if (byPlayerType === 'PLAYER') cpu = nextState;
    else player = nextState;
  };
  const addActorPoints = (points: number, reason: string) => {
    const actor = getActor();
    setActor({ ...actor, combatPoints: Math.max(0, actor.combatPoints + points) });
    logMessages.push({ message: `${reason} ${points >= 0 ? '+' : ''}${points}P。`, source: byPlayerType, timestamp: Date.now() });
  };
  const reduceOpponentPoints = (points: number, reason: string) => {
    const opponent = getOpponent();
    const actual = Math.min(points, opponent.combatPoints);
    setOpponent({ ...opponent, combatPoints: Math.max(0, opponent.combatPoints - points) });
    logMessages.push({ message: `${reason} ${opponentName} -${actual}P。`, source: byPlayerType, timestamp: Date.now() });
  };
  const destroyOpponentCard = (target: Card | undefined, reason: string) => {
    if (!target) {
      logMessages.push({ message: `${reason} 破壊できる対象がありません。`, source: byPlayerType, timestamp: Date.now() });
      return;
    }
    const opponent = getOpponent();
    const nextBattlefield = opponent.battlefield.map(card =>
      isSameCardInstance(card, target) ? { ...card, isDestroyed: true } : card,
    );
    const nextOpponent = setBattlefieldWithPowerDelta(
      opponent,
      nextBattlefield,
      opponentOwnerName,
    );
    setOpponent(nextOpponent);
    logMessages.push({ message: `${reason} ${opponentName}の ${getDisplayName(target)} を破壊。戦闘終了まで戦場に残します。`, source: byPlayerType, timestamp: Date.now() });
  };
  const revealActorDeckTop = (): Card | undefined => {
    const actor = getActor();
    const [revealed, ...nextDeck] = actor.deck;
    if (!revealed) {
      logMessages.push({ message: `${actorName}の山札が空で、めくれませんでした。`, source: byPlayerType, timestamp: Date.now() });
      return undefined;
    }
    setActor({ ...actor, deck: nextDeck });
    logMessages.push({ message: `${actorName}の山札から ${getDisplayName(revealed)} をめくりました。`, source: byPlayerType, timestamp: Date.now() });
    return revealed;
  };
  const discardRevealedActorCard = (revealed: Card | undefined) => {
    if (!revealed) return;
    const actor = getActor();
    setActor({ ...actor, discardPile: [...actor.discardPile, revealed] });
  };
  const deployRevealedActorMCard = (revealed: Card | undefined) => {
    if (!revealed || revealed.type !== 'M') {
      discardRevealedActorCard(revealed);
      if (revealed) {
        logMessages.push({ message: `${getDisplayName(revealed)} はMカードではないため捨て札へ。`, source: byPlayerType, timestamp: Date.now() });
      }
      return;
    }
    if (!canDeploy(revealed, currentGameState.battlefieldTerrainAttribute)) {
      discardRevealedActorCard(revealed);
      logMessages.push({ message: `${getDisplayName(revealed)} は戦場属性と合わないため捨て札へ。`, source: byPlayerType, timestamp: Date.now() });
      return;
    }
    const actor = getActor();
    const cardForBattlefield = { ...revealed, fieldOrder: maxFieldOrder(actor) + 1 };
    const nextActor = setBattlefieldWithPowerDelta(
      { ...actor, deck: actor.deck },
      [...actor.battlefield, cardForBattlefield],
      actorOwnerName,
    );
    setActor(nextActor);
    logMessages.push({ message: `${getDisplayName(revealed)} を最前線へ追加。`, source: byPlayerType, timestamp: Date.now() });
  };
  const moveActorCardToSquad = (target: Card | undefined) => {
    if (!target) {
      logMessages.push({ message: '小隊へ戻せる自軍Mカードがありません。', source: byPlayerType, timestamp: Date.now() });
      return;
    }
    const actor = getActor();
    const nextBattlefield = actor.battlefield.filter(card => !isSameCardInstance(card, target));
    const squadCard = { ...target, isDestroyed: undefined, isTapped: undefined };
    const nextActor = setBattlefieldWithPowerDelta(
      { ...actor, squad: [...actor.squad, squadCard] },
      nextBattlefield,
      actorOwnerName,
    );
    setActor(nextActor);
    logMessages.push({ message: `${getDisplayName(target)} を最前線から小隊へ戻しました。`, source: byPlayerType, timestamp: Date.now() });
  };
  const zeroOpponentNonNTPower = () => {
    const opponent = getOpponent();
    const eligible = opponent.battlefield.filter(card => isActiveMCard(card) && !card.tags.includes('NT専用機'));
    if (eligible.length === 0) {
      logMessages.push({ message: '相手最前線にNT専用機以外のMカードがないため効果なし。', source: byPlayerType, timestamp: Date.now() });
      return;
    }
    const eligibleIds = new Set(eligible.map(getCardInstanceId));
    const nextBattlefield = opponent.battlefield.map(card =>
      eligibleIds.has(getCardInstanceId(card)) ? { ...card, points: '0' } : card,
    );
    setOpponent(setBattlefieldWithPowerDelta(opponent, nextBattlefield, opponentOwnerName));
    logMessages.push({ message: `相手最前線のNT専用機以外 ${eligible.length}枚のポイントを0にしました。`, source: byPlayerType, timestamp: Date.now() });
  };
  const deployWaitingUnitsForAddedTerrain = (terrainToAdd: string) => {
    const actor = getActor();
    const effectiveTerrain = `${currentGameState.battlefieldTerrainAttribute || ''}${terrainToAdd}`;
    const movingCards = actor.squad
      .filter(card => card.type === 'M' && canDeploy(card, effectiveTerrain))
      .map(clearBattlefieldEntryState);
    if (movingCards.length === 0) {
      logMessages.push({ message: `${actorName}側に${terrainToAdd}を追加しましたが、新たに出撃できる待機MSはありません。`, source: byPlayerType, timestamp: Date.now() });
      return;
    }
    const movingIds = new Set(movingCards.map(getCardInstanceId));
    const nextSquad = actor.squad.filter(card => !movingIds.has(getCardInstanceId(card)));
    const nextActor = setBattlefieldWithPowerDelta(
      { ...actor, squad: nextSquad },
      [...actor.battlefield, ...movingCards],
      actorOwnerName,
    );
    setActor(nextActor);
    logMessages.push({ message: `${actorName}側の戦場に${terrainToAdd}を追加。${movingCards.map(getDisplayName).join('、')} が追加出撃。`, source: byPlayerType, timestamp: Date.now() });
  };

  const ownM = getActor().battlefield.filter(isActiveMCard);
  const opponentM = getOpponent().battlefield.filter(isActiveMCard);
  const explicitTargets = getCCardTargetCandidates(playedCard, currentGameState, byPlayerType);
  const selectedTarget = targetCard && explicitTargets.some(candidate => isSameCardInstance(candidate, targetCard))
    ? targetCard
    : undefined;

  if (playedCard.cardNumber.startsWith('C-001')) {
    const count = ownM.filter(card => card.tags.includes('ガンダム系')).length;
    addActorPoints(count * 3, `自軍ガンダム系 ${count}枚に各+3`);
  } else if (playedCard.cardNumber.startsWith('C-002')) {
    const count = ownM.filter(card => card.factionAffiliation === '地球連邦').length;
    addActorPoints(count * 2, `自軍地球連邦 ${count}枚に各+2`);
  } else if (playedCard.cardNumber.startsWith('C-003')) {
    const matched = ownM.some(card => card.tags.includes('戦艦系'));
    addActorPoints(matched ? 5 : 0, matched ? '自軍戦艦系がいるため合計' : '自軍戦艦系がいないため効果なし');
  } else if (playedCard.cardNumber.startsWith('C-004')) {
    const count = ownM.filter(card => card.factionAffiliation === '地球連邦').length;
    addActorPoints(count >= 2 ? 5 : 0, count >= 2 ? '自軍地球連邦が2枚以上のため合計' : '自軍地球連邦が2枚未満のため効果なし');
  } else if (playedCard.cardNumber.startsWith('C-005')) {
    const count = ownM.filter(card => hasFactionMark(card, '赤ジオン')).length;
    addActorPoints(count * 2, `自軍赤ジオン ${count}枚に各+2`);
  } else if (playedCard.cardNumber.startsWith('C-006')) {
    const revealed = revealActorDeckTop();
    if (revealed && revealed.type === 'M' && canDeploy(revealed, currentGameState.battlefieldTerrainAttribute)) {
      destroyOpponentCard(selectedTarget || chooseHighestPointMCard(opponentM), `${getDisplayName(revealed)} が戦場属性と一致。`);
    } else if (revealed) {
      logMessages.push({ message: `${getDisplayName(revealed)} は戦場属性と合わず、破壊効果は不発。`, source: byPlayerType, timestamp: Date.now() });
    }
    discardRevealedActorCard(revealed);
  } else if (playedCard.cardNumber.startsWith('C-007')) {
    const matched = ownM.some(card => card.tags.includes('シャア専用機'));
    addActorPoints(matched ? 5 : 0, matched ? '自軍にシャア専用機がいるため合計' : '自軍にシャア専用機がいないため効果なし');
  } else if (playedCard.cardNumber.startsWith('C-008')) {
    const hasLand = currentGameState.battlefieldTerrainAttribute?.includes('陸') ?? false;
    addActorPoints(hasLand ? 5 : 0, hasLand ? '戦場に陸があるため合計' : '戦場に陸がないため効果なし');
  } else if (playedCard.cardNumber.startsWith('C-009')) {
    const revealed = revealActorDeckTop();
    if (revealed && hasFactionMark(revealed, '緑ジオン')) {
      const count = ownM.filter(card => hasFactionMark(card, '緑ジオン')).length;
      addActorPoints(count * 2, `${getDisplayName(revealed)} は緑ジオンマーク。自軍緑ジオン ${count}枚に各+2`);
    } else if (revealed) {
      logMessages.push({ message: `${getDisplayName(revealed)} は緑ジオンマークではないため効果なし。`, source: byPlayerType, timestamp: Date.now() });
    }
    discardRevealedActorCard(revealed);
  } else if (playedCard.cardNumber.startsWith('C-010')) {
    const actor = getActor();
    const opponent = getOpponent();
    setActor({ ...actor, battlefield: opponent.battlefield, combatPoints: opponent.combatPoints });
    setOpponent({ ...opponent, battlefield: actor.battlefield, combatPoints: actor.combatPoints });
    logMessages.push({ message: '自分と相手の最前線カードとポイントを入れ換えました。', source: byPlayerType, timestamp: Date.now() });
  } else if (playedCard.cardNumber.startsWith('C-011')) {
    destroyOpponentCard(chooseLowestPointMCard(opponentM), '相手最前線のポイントが一番低いカードを対象。');
  } else if (playedCard.cardNumber.startsWith('C-012')) {
    if (ownM.length < 2) {
      logMessages.push({ message: '自軍の最前線Mカードが2枚未満のため、チョバムアーマーは効果なし。', source: byPlayerType, timestamp: Date.now() });
    } else {
      const target = selectedTarget || chooseHighestPointMCard(ownM);
      moveActorCardToSquad(target);
    }
  } else if (playedCard.cardNumber.startsWith('C-013')) {
    zeroOpponentNonNTPower();
  } else if (playedCard.cardNumber.startsWith('C-014')) {
    deployRevealedActorMCard(revealActorDeckTop());
  } else if (playedCard.cardNumber.startsWith('C-015')) {
    destroyOpponentCard(selectedTarget || chooseHighestPointMCard(opponentM.filter(card => card.terrainTypeMCards.includes('海'))), '海属性を持つ相手最前線カードを対象。');
  } else if (playedCard.cardNumber.startsWith('C-016')) {
    destroyOpponentCard(selectedTarget || chooseHighestPointMCard(opponentM.filter(card => card.terrainTypeMCards.includes('陸'))), '陸属性を持つ相手最前線カードを対象。');
  } else if (playedCard.cardNumber.startsWith('C-017')) {
    deployWaitingUnitsForAddedTerrain('空');
  } else if (playedCard.cardNumber.startsWith('C-018')) {
    deployWaitingUnitsForAddedTerrain('宇');
  } else if (playedCard.cardNumber.startsWith('C-019')) {
    deployWaitingUnitsForAddedTerrain('陸');
  } else if (playedCard.cardNumber.startsWith('C-020')) {
    deployWaitingUnitsForAddedTerrain('空');
  } else {
    logMessages.push({ message: `${getDisplayName(playedCard)} の効果は未定義です。`, source: byPlayerType, timestamp: Date.now() });
  }

  return { player, cpu, logMessages };
};

export const isPlayerInteractivePhase = (phase: GamePhase | undefined): boolean => {
  if (!phase) return false;
  return (
    phase === 'FORMATION_PLAYER_DRAW' ||
    phase === 'FORMATION_PLAYER_PLACE' ||
    phase === 'COUNTER_SUPPORT_PLAYER_DRAW' ||
    phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C'
  );
};

export const getPhaseInstruction = (
  phase: GamePhase,
  playerHand: Card[],
  playerSquad: Card[],
): string => {
  switch (phase) {
    case 'FORMATION_PLAYER_DRAW':
      return '編成: カードをドロー中...';
    case 'FORMATION_PLAYER_PLACE': {
      const canPlaceMCard = playerHand.some(c => c.type === 'M');
      const squadFull = playerSquad.length >= 3;
      if (squadFull) return '編成: 完了。CPUの番を待機中...';
      return canPlaceMCard ? '編成: 手札のMカード1枚を小隊に配置' : '編成: Mカードなし。手札の1枚を敗戦フィールドへ';
    }
    case 'COUNTER_SUPPORT_PLAYER_DRAW':
      return 'カウンター/支援: カードをドロー中...';
    case 'COUNTER_SUPPORT_PLAYER_PLAY_C':
      return 'カウンター/支援: Cカード使用 または 手札1枚を破棄';
    case 'SETUP':
      return 'ゲームセットアップ中...';
    case 'FORMATION_CPU_DRAW':
      return 'CPU: 編成ドロー中...';
    case 'FORMATION_CPU_PLACE':
      return 'CPU: 編成配置中...';
    case 'FORMATION_CHECK_FULL':
      return '編成: 両者配置完了。出陣フェイズへ移行中...';
    case 'DEPLOYMENT_PLAYER_TERRAIN':
      return '出陣: 地形カードを決定中...';
    case 'DEPLOYMENT_CPU_TERRAIN':
      return 'CPU: 地形カードを決定中...';
    case 'DEPLOYMENT_MOVE_CARDS':
      return '出陣: ユニットを戦場へ移動中...';
    case 'DEPLOYMENT_CHECK_UNILATERAL':
      return '出陣: 一方的戦闘確認中...';
    case 'DEPLOYMENT_CONFIRM_UNILATERAL':
      return '出陣: 一方的戦闘結果を確認中...';
    case 'DEPLOYMENT_HANDLE_TAPPED':
      return '出陣: 待機MS処理中...';
    case 'COMBAT_CALCULATE_INITIAL_POINTS':
      return '戦闘: ポイント計算中...';
    case 'COUNTER_SUPPORT_CPU_DRAW':
      return 'CPU: C/Sドロー中...';
    case 'COUNTER_SUPPORT_CPU_PLAY_C':
      return 'CPU: C/Sカード使用中...';
    case 'COMBAT_RESOLUTION':
      return '戦闘: 結果を解決中...';
    case 'END_TURN_CLEANUP':
      return 'ターン終了処理中...';
    case 'GAME_OVER':
      return 'ゲーム終了';
    default:
      return phase;
  }
};

export const getBaseCardNumber = (cardNumber: string): string => {
  const parts = cardNumber.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return cardNumber;
};

export const isKiraCard = (card: Card): boolean => {
  return card.tags.includes('キラ');
};

export const checkCombos = (
  battlefieldCards: Card[],
  playerName: string
): { achievedCombos: Combo[]; logMessages: LogEntry[] } => {
  const achievedCombos: Combo[] = [];
  const logMessages: LogEntry[] = [];
  const mCards = battlefieldCards.filter(isActiveMCard);

  if (mCards.length < 3) return { achievedCombos, logMessages };

  const groupByBaseNumber = (cards: Card[]): Record<string, Card[]> => {
    return cards.reduce((acc, card) => {
      const baseNum = getBaseCardNumber(card.cardNumber);
      if (!acc[baseNum]) acc[baseNum] = [];
      acc[baseNum].push(card);
      return acc;
    }, {} as Record<string, Card[]>);
  };

  if (mCards.filter(c => c.tags.includes('大将軍')).length >= 3) {
    achievedCombos.push({ name: '大将軍コンボ', points: 8 });
  }
  if (mCards.filter(c => c.tags.includes('闇の支配者')).length >= 3) {
    achievedCombos.push({ name: '闇コンボ', points: 8 });
  }
  if (mCards.filter(isKiraCard).length >= 3) {
    achievedCombos.push({ name: 'キラコンボ', points: 5 });
  }

  const systemTagCounts: Record<string, number> = {};
  mCards.forEach(card => {
    card.tags
      .split(' ')
      .filter(tag => tag.endsWith('系'))
      .forEach(systemTag => {
        systemTagCounts[systemTag] = (systemTagCounts[systemTag] || 0) + 1;
      });
  });
  if (Object.values(systemTagCounts).some(count => count >= 3)) {
    achievedCombos.push({ name: '機体系コンボ', points: 5 });
  }

  const pilotTagCounts: Record<string, number> = {};
  mCards.forEach(card => {
    card.tags
      .split(' ')
      .filter(tag => tag.endsWith('専用機'))
      .forEach(pilotTag => {
        pilotTagCounts[pilotTag] = (pilotTagCounts[pilotTag] || 0) + 1;
      });
  });
  if (Object.values(pilotTagCounts).some(count => count >= 3)) {
    achievedCombos.push({ name: 'パイロットコンボ', points: 5 });
  }

  const groupsByBaseNum = groupByBaseNumber(mCards);
  Object.values(groupsByBaseNum).forEach(group => {
    if (group.length === 3) {
      if (group.every(isKiraCard)) {
        achievedCombos.push({ name: 'トリプルキラコンボ', points: 10 });
      } else if (group.every(c => c.tags.includes('ガンダム系'))) {
        achievedCombos.push({ name: 'トリプルGコンボ', points: 8 });
      } else {
        achievedCombos.push({ name: 'トリプルコンボ', points: 7 });
      }
    }
  });

  const uniqueComboMap = new Map<string, Combo>();
  achievedCombos.forEach(combo => {
    if (!uniqueComboMap.has(combo.name) || uniqueComboMap.get(combo.name)!.points < combo.points) {
      uniqueComboMap.set(combo.name, combo);
    }
  });

  const finalCombos = Array.from(uniqueComboMap.values())
    .sort((a, b) => {
      const pointDiff = b.points - a.points;
      return pointDiff !== 0 ? pointDiff : a.name.localeCompare(b.name, 'ja');
    })
    .slice(0, 1);
  finalCombos.forEach(combo => {
    logMessages.push({
      message: `${playerName}「${combo.name}」成立、採用！ (+${combo.points}P)`,
      source: playerName === 'プレイヤー' ? 'PLAYER' : 'CPU',
      timestamp: Date.now(),
    });
  });

  return { achievedCombos: finalCombos, logMessages };
};
