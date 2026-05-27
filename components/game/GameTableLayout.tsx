import React from 'react';
import { BattleSummary, Card, CombatSideSummary, GamePhase, LogEntry, PlayedCCardSummary, PlayerState, PlayerType } from '../../types';
import { isKiraCard } from '../../utils/gameRules';
import { getCardInstanceId, isSameCardInstance } from '../../utils/cardIdentity';
import { GameCard } from './GameCard';

interface GameTableLayoutProps {
  battlefieldTerrainAttribute: string | null;
  battleSummary?: BattleSummary | null;
  canPlayerPlaySelectedCCard: boolean | null;
  combatResultVisual: PlayerType | 'DRAW' | null;
  cpu: PlayerState;
  cCardTargetInstruction?: string | null;
  cpuCCardTargetableNumbers?: Set<string>;
  currentTerrainCard: Card | null;
  gameLog: LogEntry[];
  isCPUMoving: boolean;
  isCpuWinnerVisualizing: boolean;
  isPlayerTurnInteractive: boolean;
  isPlayerWinnerVisualizing: boolean;
  isVisualizingCombat: boolean;
  isVisualizingUnilateralDeployment: boolean;
  onConfirmCombatResolution: () => void;
  onOpenDiscardPile: (owner: PlayerType) => void;
  onOpenLargeCard: (card: Card) => void;
  onOpenPlayerDeck: () => void;
  onPlayerAction: (actionType: string, cardToActOn?: Card, targetCard?: Card) => void;
  onSelectCard: (card: Card) => void;
  onCancelCCardTargeting?: () => void;
  onTargetCard?: (card: Card) => void;
  pendingTargetCCard?: Card | null;
  phase: GamePhase;
  phaseInstructionText: string;
  player: PlayerState;
  playerCCardTargetableNumbers?: Set<string>;
  playedCCards: PlayedCCardSummary[];
  selectedCard: Card | null;
  unilateralDeploymentWinner: PlayerType | null;
  winner: PlayerType | null;
}

interface FieldLaneProps {
  activeCCard?: PlayedCCardSummary;
  battleVisualResult?: PlayerType | 'DRAW' | null;
  battlefieldTerrainAttribute?: string | null;
  canDropToSquad?: boolean;
  draggedCard?: Card | null;
  isBattleVisualActive?: boolean;
  isCPU?: boolean;
  isCardDisabled: boolean;
  laneAttentionKey?: string;
  onDropToSquad?: () => void;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
  laneCardsRef?: React.Ref<HTMLDivElement>;
  onSelectCard: (card: Card) => void;
  onTargetCard?: (card: Card) => void;
  playerState: PlayerState;
  scoreClass: string;
  selectedCard: Card | null;
  targetableCardNumbers?: Set<string>;
}

const getScoreClass = (
  isVisualizingWinner: boolean,
  combatResultVisual: PlayerType | 'DRAW' | null,
  unilateralDeploymentWinner: PlayerType | null,
  isVisualizingUnilateralDeployment: boolean,
  owner: PlayerType,
) => {
  if (!isVisualizingWinner) {
    return owner === 'PLAYER' ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-700';
  }

  if (combatResultVisual === owner || (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === owner)) {
    return owner === 'PLAYER' ? 'blinking-winner-player' : 'blinking-winner-cpu';
  }

  return 'blinking-winner-draw';
};

const HiddenHand: React.FC<{ count: number }> = ({ count }) => (
  <div className="game-hidden-hand" aria-label={`CPU手札 ${count}枚`}>
    {Array.from({ length: Math.min(count, 7) }).map((_, index) => (
      <span key={index} className="game-card-back" />
    ))}
    <span className="game-hand-count">x{count}</span>
  </div>
);

const terrainLayerDefs = [
  { key: '宇', label: '宇', className: 'game-battle-layer-space' },
  { key: '空', label: '空', className: 'game-battle-layer-sky' },
  { key: '陸', label: '陸', className: 'game-battle-layer-land' },
  { key: '海', label: '海', className: 'game-battle-layer-sea' },
];

const getActiveBattleLayers = (terrainAttribute: string | null) => {
  if (!terrainAttribute) return terrainLayerDefs;
  const terrainChars = new Set(Array.from(terrainAttribute));
  const matched = terrainLayerDefs.filter(layer => terrainChars.has(layer.key));
  return matched.length > 0 ? matched : terrainLayerDefs;
};

const getLaneTerrainTone = (terrainAttribute: string | null | undefined): 'space' | 'sky' | 'land' | 'sea' | null => {
  if (!terrainAttribute) return null;
  if (terrainAttribute.includes('宇')) return 'space';
  if (terrainAttribute.includes('空')) return 'sky';
  if (terrainAttribute.includes('海')) return 'sea';
  if (terrainAttribute.includes('陸')) return 'land';
  return null;
};

const battleBeamVariants = Array.from({ length: 10 }, (_, index) => `game-battle-beam-chaos-${index + 1}`);

const formatSignedPoints = (points: number): string => {
  if (points > 0) return `+${points}`;
  return `${points}`;
};

const getFormulaParts = (summary: CombatSideSummary): string[] => {
  const parts = [`基礎 ${summary.baseTotal}`];
  if (summary.tagTotal !== 0) parts.push(`タグ ${formatSignedPoints(summary.tagTotal)}`);
  if (summary.comboTotal !== 0) parts.push(`コンボ +${summary.comboTotal}`);
  if (summary.supportDelta !== 0) parts.push(`C/S ${formatSignedPoints(summary.supportDelta)}`);
  parts.push(`= ${summary.finalTotal}`);
  return parts;
};

const getCardDisplayName = (card: Card): string => card.cardNameOmm || card.cardName;

const findRecentCombatStartIndex = (gameLog: LogEntry[]): number => {
  for (let index = gameLog.length - 1; index >= 0; index--) {
    if (gameLog[index].message.includes('攻撃ポイント計算後')) {
      return index;
    }
  }
  return Math.max(0, gameLog.length - 18);
};

const createFieldPlayedCCardSummaries = (
  player: PlayerState,
  cpu: PlayerState,
  gameLog: LogEntry[],
): PlayedCCardSummary[] => {
  const startIndex = findRecentCombatStartIndex(gameLog);
  const played: PlayedCCardSummary[] = [];

  gameLog.slice(startIndex).forEach(logEntry => {
    const match = logEntry.message.match(/^(プレイヤー|CPU)が (.+) を使用。$/);
    if (!match) return;

    const owner: PlayerType = match[1] === 'プレイヤー' ? 'PLAYER' : 'CPU';
    const usedName = match[2];
    const discardPile = owner === 'PLAYER' ? player.discardPile : cpu.discardPile;
    const card = [...discardPile]
      .reverse()
      .find(discardedCard => discardedCard.type === 'C' && getCardDisplayName(discardedCard) === usedName);

    if (!card) return;

    played.push({
      owner,
      cardNumber: card.cardNumber,
      name: getCardDisplayName(card),
      imageUrl: card.imageUrl,
      effect: card.effect || card.textAbility || '',
      sourceCard: card,
    });
  });

  return played;
};

const BattleSummarySide: React.FC<{
  label: string;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
  summary: CombatSideSummary;
  tone: 'player' | 'cpu';
}> = ({ label, onPreviewEnd, onPreviewStart, summary, tone }) => (
  <section className={`game-battle-summary-side game-battle-summary-${tone}`} aria-label={`${label} 戦闘計算`}>
    <div className="game-battle-summary-title">
      <span>{label}</span>
      <strong>{summary.finalTotal}P</strong>
    </div>
    <div className="game-battle-summary-cards">
      {summary.cards.slice(0, 3).map(card => (
        <div className="game-battle-summary-card" key={getCardInstanceId(card.sourceCard)}>
          <button
            className="game-battle-card-name"
            type="button"
            title={card.name}
            onBlur={onPreviewEnd}
            onFocus={() => onPreviewStart(card.sourceCard)}
            onMouseEnter={() => onPreviewStart(card.sourceCard)}
            onMouseLeave={onPreviewEnd}
          >
            {card.name}
          </button>
          <span className="game-battle-card-points">
            {card.basePoints}{card.tagBonus !== 0 ? `+${card.tagBonus}` : ''}
          </span>
        </div>
      ))}
      {summary.cards.length === 0 && <span className="game-battle-summary-empty">有効Mなし</span>}
    </div>
    {summary.combos.length > 0 && (
      <div className="game-battle-combo-line">
        {summary.combos.map(combo => `${combo.name} +${combo.points}`).join(' / ')}
      </div>
    )}
    <div className="game-battle-formula">
      {getFormulaParts(summary).map((part, index) => (
        <React.Fragment key={`${label}-${part}`}>
          {index > 0 && <span className="game-battle-formula-operator">{part.startsWith('=') ? '' : '+'}</span>}
          <span>{part}</span>
        </React.Fragment>
      ))}
    </div>
  </section>
);

const FieldCounterCards: React.FC<{
  playedCCards: PlayedCCardSummary[];
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
}> = ({ playedCCards, onPreviewEnd, onPreviewStart }) => {
  const renderSide = (owner: PlayerType, label: string) => {
    const cards = playedCCards.filter(card => card.owner === owner);

    return (
      <section className={`game-counter-side ${owner === 'PLAYER' ? 'game-counter-side-player' : 'game-counter-side-cpu'}`}>
        <div className="game-counter-title">
          <span>{label}</span>
          <span>使用C</span>
        </div>
        <div className="game-counter-list">
          {cards.length > 0 ? (
            cards.map((card, index) => (
              <button
                aria-label={`${label}が使用したCカード ${card.name} の画像を表示`}
                className="game-counter-card"
                key={`${owner}-${getCardInstanceId(card.sourceCard)}-${index}`}
                title={card.effect ? `${card.name}: ${card.effect}` : card.name}
                type="button"
                onBlur={onPreviewEnd}
                onFocus={() => onPreviewStart(card.sourceCard)}
                onMouseEnter={() => onPreviewStart(card.sourceCard)}
                onMouseLeave={onPreviewEnd}
              >
                {card.imageUrl ? (
                  <img alt="" src={card.imageUrl} />
                ) : (
                  <span className="game-counter-fallback">C</span>
                )}
                <span className="game-counter-copy">
                  <strong>{card.name}</strong>
                  <span>{card.effect || '-'}</span>
                </span>
              </button>
            ))
          ) : (
            <span className="game-counter-empty">未使用</span>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="game-counter-node" aria-label="戦場の使用Cカード">
      {renderSide('PLAYER', 'PLAYER')}
      {renderSide('CPU', 'CPU')}
    </div>
  );
};

const BattleCalculationSummary: React.FC<{
  battleSummary: BattleSummary | null | undefined;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
}> = ({ battleSummary, onPreviewEnd, onPreviewStart }) => {
  if (!battleSummary) return null;
  const calculationLogs = battleSummary.cCardLogs.slice(0, 6);

  return (
    <div className="game-battle-summary" aria-label="戦闘計算サマリ">
      <BattleSummarySide
        label="PLAYER"
        onPreviewEnd={onPreviewEnd}
        onPreviewStart={onPreviewStart}
        summary={battleSummary.player}
        tone="player"
      />
      <section className="game-battle-events" aria-label="戦闘計算ログ">
        <span className="game-battle-events-title">計算ログ</span>
        {calculationLogs.length > 0 ? (
          calculationLogs.map((message, index) => (
            <p key={`${message}-${index}`}>{message}</p>
          ))
        ) : (
          <p>C/S補正なし</p>
        )}
      </section>
      <BattleSummarySide
        label="CPU"
        onPreviewEnd={onPreviewEnd}
        onPreviewStart={onPreviewStart}
        summary={battleSummary.cpu}
        tone="cpu"
      />
    </div>
  );
};

const CenterBattleSummary: React.FC<{
  battleSummary: BattleSummary | null | undefined;
  combatResultVisual: PlayerType | 'DRAW' | null;
  cpuPoints: number;
  onConfirm?: () => void;
  playerPoints: number;
}> = ({ battleSummary, combatResultVisual, cpuPoints, onConfirm, playerPoints }) => {
  if (!battleSummary || !combatResultVisual) return null;

  const resultLabel =
    combatResultVisual === 'PLAYER'
      ? 'PLAYER勝利'
      : combatResultVisual === 'CPU'
        ? 'CPU勝利'
        : '引き分け';
  const resultTone =
    combatResultVisual === 'PLAYER'
      ? 'player'
      : combatResultVisual === 'CPU'
        ? 'cpu'
        : 'draw';

  return (
    <section className={`game-center-battle-summary game-center-battle-summary-${resultTone}`} aria-label="戦闘計算">
      <div className="game-center-battle-head">
        <strong>{resultLabel}</strong>
        <span>PLAYER {playerPoints} / CPU {cpuPoints}</span>
        {onConfirm && (
          <button className="game-center-confirm-button" type="button" onClick={onConfirm}>
            戦闘を確定
          </button>
        )}
      </div>
      <div className="game-center-battle-formulas">
        <span>
          <strong>PLAYER</strong>
          {getFormulaParts(battleSummary.player).join(' ')}
        </span>
        <span>
          <strong>CPU</strong>
          {getFormulaParts(battleSummary.cpu).join(' ')}
        </span>
      </div>
    </section>
  );
};

const BattleCounterCards: React.FC<{
  battleSummary: BattleSummary | null | undefined;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
}> = ({ battleSummary, onPreviewEnd, onPreviewStart }) => {
  if (!battleSummary) return null;

  const renderSide = (owner: PlayerType, label: string) => {
    const cards = battleSummary.playedCCards.filter(card => card.owner === owner);

    return (
      <section className={`game-battle-counter-side ${owner === 'PLAYER' ? 'game-battle-counter-player' : 'game-battle-counter-cpu'}`}>
        <div className="game-battle-counter-title">
          <span>{label}</span>
          <span>使用Cカード</span>
        </div>
        <div className="game-battle-counter-list">
          {cards.length > 0 ? (
            cards.map(card => (
              <button
                aria-label={`${label}が使用したCカード ${card.name} の画像を表示`}
                className="game-battle-counter-card"
                key={`${owner}-${getCardInstanceId(card.sourceCard)}`}
                title={card.effect ? `${card.name}: ${card.effect}` : card.name}
                type="button"
                onBlur={onPreviewEnd}
                onFocus={() => onPreviewStart(card.sourceCard)}
                onMouseEnter={() => onPreviewStart(card.sourceCard)}
                onMouseLeave={onPreviewEnd}
              >
                {card.imageUrl ? (
                  <img alt="" src={card.imageUrl} />
                ) : (
                  <span className="game-battle-counter-fallback">C</span>
                )}
                <span className="game-battle-counter-copy">
                  <strong>{card.name}</strong>
                  <span>{card.effect || '-'}</span>
                </span>
              </button>
            ))
          ) : (
            <span className="game-battle-counter-empty">C使用なし</span>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="game-battle-counter-cards" aria-label="使用Cカード">
      {renderSide('PLAYER', 'PLAYER')}
      {renderSide('CPU', 'CPU')}
    </div>
  );
};

const BattleMiniCards: React.FC<{
  battleSummary: BattleSummary | null | undefined;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
}> = ({ battleSummary, onPreviewEnd, onPreviewStart }) => {
  if (!battleSummary) return null;

  const renderCards = (cards: CombatSideSummary['cards'], owner: PlayerType) => (
    cards.slice(0, 3).map(card => {
      const isKira = isKiraCard(card.sourceCard);

      return (
        <button
          aria-label={`${owner === 'PLAYER' ? 'PLAYER' : 'CPU'} ${card.name} のカード画像を表示${isKira ? ' キラカード' : ''}`}
          className={`game-battle-mini-card ${isKira ? 'kira-border-animated' : ''}`}
          key={`${owner}-${getCardInstanceId(card.sourceCard)}`}
          title={card.name}
          type="button"
          onBlur={onPreviewEnd}
          onFocus={() => onPreviewStart(card.sourceCard)}
          onMouseEnter={() => onPreviewStart(card.sourceCard)}
          onMouseLeave={onPreviewEnd}
        >
          {card.imageUrl ? (
            <img alt="" src={card.imageUrl} />
          ) : (
            <span className="game-battle-mini-fallback">M</span>
          )}
        </button>
      );
    })
  );

  return (
    <div className="game-battle-card-strip" aria-label="戦闘参加カード">
      <div className="game-battle-card-strip-side game-battle-card-strip-player">
        {renderCards(battleSummary.player.cards, 'PLAYER')}
      </div>
      <div className="game-battle-card-strip-side game-battle-card-strip-cpu">
        {renderCards(battleSummary.cpu.cards, 'CPU')}
      </div>
    </div>
  );
};

const BattleAnimation: React.FC<{
  battleSummary?: BattleSummary | null;
  combatResultVisual: PlayerType | 'DRAW' | null;
  headerTitle?: string;
  playerPoints: number;
  cpuPoints: number;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
  onConfirm?: () => void;
  terrainAttribute: string | null;
}> = ({
  battleSummary,
  combatResultVisual,
  headerTitle = '戦闘結果',
  playerPoints,
  cpuPoints,
  onPreviewEnd,
  onPreviewStart,
  onConfirm,
  terrainAttribute,
}) => {
  const layers = getActiveBattleLayers(terrainAttribute);
  const playerWon = combatResultVisual === 'PLAYER';
  const cpuWon = combatResultVisual === 'CPU';
  const isDraw = combatResultVisual === 'DRAW';
  const resultText =
    playerWon
      ? 'PLAYER WIN'
      : cpuWon
        ? 'CPU WIN'
        : 'DRAW';
  const resultSummary = playerWon ? 'PLAYER 勝利' : cpuWon ? 'CPU 勝利' : '引き分け';
  const resultToneClass = playerWon ? 'game-battle-result-player' : cpuWon ? 'game-battle-result-cpu' : 'game-battle-result-draw';

  return (
    <aside className="game-battle-animation" aria-label="戦闘演出">
      <div className="game-battle-panel">
        <div className={`game-battle-header ${resultToneClass}`}>
          <span>{headerTitle}</span>
          <strong>{resultText}</strong>
          {onConfirm ? (
            <button className="game-battle-confirm-button" type="button" onClick={onConfirm}>
              戦闘を確定
            </button>
          ) : (
            <span className="game-battle-auto-note">自動確定中</span>
          )}
        </div>
        <div className="game-battle-scoreboard" aria-label={`戦闘ポイント ${resultSummary}`}>
          <div className={`game-battle-score-card game-battle-score-player ${playerWon ? 'game-battle-score-winner' : cpuWon ? 'game-battle-score-loser' : ''}`}>
            <span>PLAYER</span>
            <strong>{playerPoints}</strong>
            <em>{playerWon ? 'WIN' : cpuWon ? 'LOSE' : 'DRAW'}</em>
          </div>
          <div className={`game-battle-result-badge ${resultToneClass}`}>{resultSummary}</div>
          <div className={`game-battle-score-card game-battle-score-cpu ${cpuWon ? 'game-battle-score-winner' : playerWon ? 'game-battle-score-loser' : ''}`}>
            <span>CPU</span>
            <strong>{cpuPoints}</strong>
            <em>{cpuWon ? 'WIN' : playerWon ? 'LOSE' : 'DRAW'}</em>
          </div>
        </div>
        <BattleCounterCards
          battleSummary={battleSummary}
          onPreviewEnd={onPreviewEnd}
          onPreviewStart={onPreviewStart}
        />
        <BattleCalculationSummary
          battleSummary={battleSummary}
          onPreviewEnd={onPreviewEnd}
          onPreviewStart={onPreviewStart}
        />
        <div className="game-battle-layer-stack">
          <BattleMiniCards
            battleSummary={battleSummary}
            onPreviewEnd={onPreviewEnd}
            onPreviewStart={onPreviewStart}
          />
          {layers.map((layer) => (
            <div className={`game-battle-layer ${layer.className}`} key={layer.key}>
              <span className="game-battle-layer-label">{layer.label}</span>
              <span className="game-battle-unit game-battle-unit-player" />
              <span className="game-battle-unit game-battle-unit-cpu" />
              {battleBeamVariants.map(beamClass => (
                <span className={`game-battle-beam game-battle-beam-chaos ${beamClass}`} key={`${layer.key}-${beamClass}`} />
              ))}
              {playerWon && <span className="game-battle-burst game-battle-burst-cpu" />}
              {cpuWon && <span className="game-battle-burst game-battle-burst-player" />}
              {isDraw && <span className="game-battle-clash" />}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

const getTouchDropTarget = (event: React.PointerEvent<HTMLElement>): 'squad' | 'discard' | null => {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const dropNode = target?.closest<HTMLElement>('[data-game-drop]');
  const dropTarget = dropNode?.dataset.gameDrop;
  return dropTarget === 'squad' || dropTarget === 'discard' ? dropTarget : null;
};

const FieldLane: React.FC<FieldLaneProps> = ({
  activeCCard,
  battleVisualResult,
  battlefieldTerrainAttribute,
  canDropToSquad,
  draggedCard,
  isBattleVisualActive = false,
  isCPU = false,
  isCardDisabled,
  laneAttentionKey,
  onDropToSquad,
  onPreviewEnd,
  onPreviewStart,
  laneCardsRef,
  onSelectCard,
  onTargetCard,
  playerState,
  scoreClass,
  selectedCard,
  targetableCardNumbers,
}) => {
  const owner = isCPU ? 'CPU' : 'PLAYER';
  const frontLabel = isCPU ? 'CPU 最前線' : '自軍 最前線';
  const squadLabel = isCPU ? 'CPU 小隊' : '自軍 小隊';
  const toneClass = isCPU ? 'game-lane-cpu' : 'game-lane-player';
  const battleVisualClass = isBattleVisualActive
    ? `game-lane-battle-active game-lane-battle-${battleVisualResult === 'DRAW' ? 'draw' : battleVisualResult?.toLowerCase() || 'neutral'}`
    : '';
  const terrainTone = getLaneTerrainTone(battlefieldTerrainAttribute);
  const terrainClass = terrainTone ? `game-lane-terrain-${terrainTone}` : '';
  const squadDropClass = canDropToSquad && !isCPU ? 'game-drop-ready' : '';
  const orderedFieldCards = [
    ...playerState.squad.map((card, idx) => ({
      card,
      idx,
      location: 'squad' as const,
      order: card.fieldOrder ?? idx,
    })),
    ...playerState.battlefield.map((card, idx) => ({
      card,
      idx,
      location: 'battlefield' as const,
      order: card.fieldOrder ?? playerState.squad.length + idx,
    })),
  ].sort((a, b) => a.order - b.order);
  const primaryFieldCards = orderedFieldCards.slice(0, 3);
  const extraFieldCard = orderedFieldCards[3];
  const hiddenExtraCount = Math.max(0, orderedFieldCards.length - 4);

  const renderFieldCard = (
    slotCard: typeof orderedFieldCards[number],
    slotIndex: number,
    isStacked = false,
  ) => {
    const { card, idx, location } = slotCard;
    const isTargetable = targetableCardNumbers?.has(getCardInstanceId(card)) ?? false;
    const isFaceDown = isCPU && location === 'squad';
    const isDestroyed = !!card.isDestroyed;

    return (
      <div
        className={`game-field-card game-field-card-${location} ${isStacked ? 'game-field-card-stacked' : ''} ${isTargetable && !isFaceDown && !isDestroyed ? 'game-field-card-targetable' : ''}`}
        key={`${owner.toLowerCase()}-${location}-${getCardInstanceId(card)}-${idx}-${slotIndex}`}
      >
        <GameCard
          card={card}
          isPlayerCard={!isCPU}
          isDisabled={isCardDisabled}
          isFaceDown={isFaceDown}
          isSelected={!isFaceDown && !isDestroyed && isSameCardInstance(selectedCard, card) && selectedCard?.type === card.type}
          isTargetable={!isFaceDown && !isDestroyed && isTargetable}
          location={location}
          onClick={isFaceDown || isDestroyed ? undefined : isTargetable ? onTargetCard : onSelectCard}
          onPreviewEnd={onPreviewEnd}
          onPreviewStart={onPreviewStart}
          uniqueKey={`${owner.toLowerCase()}-${location}-${getCardInstanceId(card)}-${idx}-${slotIndex}`}
        />
      </div>
    );
  };

  const renderCCard = (cardSummary: PlayedCCardSummary, compact = false) => (
    <div className={`game-field-card game-field-card-counter ${compact ? 'game-field-card-counter-compact' : ''}`}>
      <GameCard
        card={cardSummary.sourceCard}
        isPlayerCard={!isCPU}
        isDisabled={isCardDisabled}
        isSelected={isSameCardInstance(selectedCard, cardSummary.sourceCard)}
        location="battlefield"
        onClick={onSelectCard}
        onPreviewEnd={onPreviewEnd}
        onPreviewStart={onPreviewStart}
        uniqueKey={`${owner.toLowerCase()}-counter-${getCardInstanceId(cardSummary.sourceCard)}`}
      />
      <span className="game-cs-slot-label" aria-hidden="true">C/S</span>
    </div>
  );

  const handleDragOverToSquad = (event: React.DragEvent<HTMLElement>) => {
    if (!canDropToSquad || !draggedCard) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDropToSquad = (event: React.DragEvent<HTMLElement>) => {
    if (!canDropToSquad || !draggedCard) {
      return;
    }
    event.preventDefault();
    onDropToSquad?.();
  };

  return (
    <section className={`game-field-lane ${toneClass} ${terrainClass} ${battleVisualClass}`} aria-label={`${owner} field lane`}>
      <div
        className={`game-lane-surface game-lane-attention ${squadDropClass}`}
        data-game-drop={!isCPU ? 'squad' : undefined}
        key={laneAttentionKey}
        onDragOver={handleDragOverToSquad}
        onDrop={handleDropToSquad}
      >
        <span className="game-lane-badge game-lane-badge-squad">{squadLabel}</span>
        <span className="game-lane-badge game-lane-badge-front">{frontLabel}</span>
        <div className={`game-lane-score game-lane-score-${owner.toLowerCase()} ${scoreClass}`} aria-label={`${owner} 戦闘ポイント ${playerState.combatPoints}`}>
          <span>{owner}</span>
          <strong>{playerState.combatPoints}</strong>
        </div>
        <div className="game-lane-cards" aria-label={`${owner} cards`} ref={laneCardsRef}>
          {[0, 1, 2].map(slotIndex => (
            <div
              className={`game-field-slot ${primaryFieldCards[slotIndex] ? 'game-field-slot-filled' : 'game-field-slot-empty'}`}
              key={`${owner.toLowerCase()}-field-slot-${slotIndex}`}
            >
              {primaryFieldCards[slotIndex] && renderFieldCard(primaryFieldCards[slotIndex], slotIndex)}
            </div>
          ))}
          <div
            className={`game-field-slot game-field-slot-cs ${extraFieldCard || activeCCard ? 'game-field-slot-filled' : 'game-field-slot-empty'}`}
            key={`${owner.toLowerCase()}-field-slot-cs`}
          >
            {extraFieldCard && renderFieldCard(extraFieldCard, 3, !!activeCCard)}
            {activeCCard && renderCCard(activeCCard, !!extraFieldCard)}
            {!activeCCard && !extraFieldCard && <span className="game-field-slot-empty-label">C/S</span>}
            {hiddenExtraCount > 0 && <span className="game-field-overflow-count">+{hiddenExtraCount}</span>}
          </div>
        </div>
      </div>
    </section>
  );
};

export const GameTableLayout: React.FC<GameTableLayoutProps> = ({
  battlefieldTerrainAttribute,
  battleSummary,
  canPlayerPlaySelectedCCard,
  combatResultVisual,
  cpu,
  cCardTargetInstruction,
  cpuCCardTargetableNumbers,
  currentTerrainCard,
  gameLog,
  isCPUMoving,
  isCpuWinnerVisualizing,
  isPlayerTurnInteractive,
  isPlayerWinnerVisualizing,
  isVisualizingCombat,
  isVisualizingUnilateralDeployment,
  onConfirmCombatResolution,
  onOpenDiscardPile,
  onOpenLargeCard,
  onOpenPlayerDeck,
  onPlayerAction,
  onSelectCard,
  onCancelCCardTargeting,
  onTargetCard,
  pendingTargetCCard,
  phase,
  phaseInstructionText,
  player,
  playerCCardTargetableNumbers,
  playedCCards,
  selectedCard,
  unilateralDeploymentWinner,
  winner,
}) => {
  const [draggedCard, setDraggedCard] = React.useState<Card | null>(null);
  const [previewCard, setPreviewCard] = React.useState<Card | null>(null);
  const battlefieldAreaRef = React.useRef<HTMLElement | null>(null);
  const cpuLaneCardsRef = React.useRef<HTMLDivElement | null>(null);
  const logNodeRef = React.useRef<HTMLDivElement | null>(null);
  const [battlefieldLogPanelStyle, setBattlefieldLogPanelStyle] = React.useState<React.CSSProperties>({});
  const playerFieldDisabled =
    isVisualizingCombat ||
    isVisualizingUnilateralDeployment ||
    !!winner ||
    (!isPlayerTurnInteractive && phase !== 'COUNTER_SUPPORT_PLAYER_PLAY_C');
  const cpuFieldDisabled = isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner;
  const playerScoreClass = getScoreClass(
    isPlayerWinnerVisualizing,
    combatResultVisual,
    unilateralDeploymentWinner,
    isVisualizingUnilateralDeployment,
    'PLAYER',
  );
  const cpuScoreClass = getScoreClass(
    isCpuWinnerVisualizing,
    combatResultVisual,
    unilateralDeploymentWinner,
    isVisualizingUnilateralDeployment,
    'CPU',
  );
  const isCpuPhase =
    phase === 'FORMATION_CPU_PLACE' ||
    phase === 'COUNTER_SUPPORT_CPU_PLAY_C' ||
    phase === 'DEPLOYMENT_CPU_TERRAIN';
  const centerStatusText = winner
    ? 'ゲーム終了'
    : isVisualizingCombat
      ? '結果確認'
      : isVisualizingUnilateralDeployment
        ? '一方的戦闘'
        : cCardTargetInstruction
          ? '対象選択'
          : isCPUMoving && isCpuPhase
            ? 'CPU処理中'
            : phase.startsWith('FORMATION')
              ? '編成中'
              : phase.startsWith('COUNTER_SUPPORT')
                ? 'C/S選択中'
                : phase.startsWith('DEPLOYMENT')
                  ? '出陣処理'
                  : phase.startsWith('COMBAT')
                    ? '戦闘計算'
                    : '進行中';
  const centerStatusTone = winner
    ? 'neutral'
    : isVisualizingCombat || isVisualizingUnilateralDeployment || phase.startsWith('COMBAT')
      ? 'battle'
      : cCardTargetInstruction || phase.startsWith('COUNTER_SUPPORT')
        ? 'counter'
        : isCPUMoving && isCpuPhase
          ? 'cpu'
          : isPlayerTurnInteractive
            ? 'player'
            : 'neutral';
  const centerStatusDetail = cCardTargetInstruction || phaseInstructionText;
  const isSelectingCCardTarget = !!pendingTargetCCard && !!cCardTargetInstruction;
  const playerLaneAttentionKey = [
    player.squad.map(getCardInstanceId).join(','),
    player.battlefield.map(getCardInstanceId).join(','),
  ].join('|');
  const cpuLaneAttentionKey = [
    cpu.squad.map(getCardInstanceId).join(','),
    cpu.battlefield.map(getCardInstanceId).join(','),
  ].join('|');
  const hasRecentCombo = gameLog.slice(-4).some(logEntry => logEntry.message.includes('成立'));
  const getBattlefieldBaseTotal = (cards: Card[]) =>
    cards
      .filter(card => card.type === 'M' && !card.isDestroyed)
      .reduce((total, card) => total + (parseInt(card.points, 10) || 0), 0);
  const shouldShowFieldCounterCards = phase.startsWith('COUNTER_SUPPORT') || phase.startsWith('COMBAT');
  const fieldPlayedCCards = shouldShowFieldCounterCards
    ? playedCCards
    : [];
  const getActiveCCard = (owner: PlayerType) =>
    [...fieldPlayedCCards].reverse().find(card => card.owner === owner);
  const playerActiveCCard = getActiveCCard('PLAYER');
  const cpuActiveCCard = getActiveCCard('CPU');
  const gameStageClass = phase.startsWith('FORMATION')
    ? 'game-stage-formation'
    : phase.startsWith('DEPLOYMENT')
      ? 'game-stage-deployment'
      : phase.startsWith('COMBAT') || phase.startsWith('COUNTER_SUPPORT')
        ? 'game-stage-battle'
        : 'game-stage-neutral';
  const canDragHandCard =
    isPlayerTurnInteractive &&
    !isVisualizingCombat &&
    !isVisualizingUnilateralDeployment &&
    !winner;
  const canDropDraggedToSquad =
    !!draggedCard &&
    draggedCard.type === 'M' &&
    phase === 'FORMATION_PLAYER_PLACE' &&
    player.squad.length < 3 &&
    isPlayerTurnInteractive;
  const canDropDraggedToDiscard =
    !!draggedCard &&
    isPlayerTurnInteractive &&
    (
      phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C' ||
      (phase === 'FORMATION_PLAYER_PLACE' && !(player.squad.length < 3 && player.hand.some((card) => card.type === 'M')))
    );
  const dropDraggedToSquad = () => {
    if (!draggedCard || !canDropDraggedToSquad) {
      return;
    }
    onPlayerAction('PLAY_M_CARD_TO_SQUAD', draggedCard);
    setDraggedCard(null);
  };
  const dropDraggedToDiscard = () => {
    if (!draggedCard || !canDropDraggedToDiscard) {
      return;
    }
    onPlayerAction(phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C' ? 'DISCARD_FROM_HAND_CS' : 'DISCARD_TO_DEFEAT_PILE', draggedCard);
    setDraggedCard(null);
  };
  const handleTouchDragEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (!draggedCard || event.pointerType === 'mouse') {
      return;
    }
    const dropTarget = getTouchDropTarget(event);
    if (dropTarget === 'squad' && canDropDraggedToSquad) {
      event.preventDefault();
      dropDraggedToSquad();
      return;
    }
    if (dropTarget === 'discard' && canDropDraggedToDiscard) {
      event.preventDefault();
      dropDraggedToDiscard();
      return;
    }
    setDraggedCard(null);
  };
  const updateBattlefieldOverlayMetrics = React.useCallback(() => {
    const battlefieldArea = battlefieldAreaRef.current;
    const laneCards = cpuLaneCardsRef.current;
    const firstSlot = laneCards?.querySelector<HTMLElement>('.game-field-slot');
    if (!battlefieldArea || !firstSlot) {
      setBattlefieldLogPanelStyle(prev => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const areaRect = battlefieldArea.getBoundingClientRect();
    const firstSlotRect = firstSlot.getBoundingClientRect();
    const left = Math.max(8, Math.round(Math.min(24, areaRect.width * 0.012)));
    const rightGap = Math.max(8, Math.round(Math.min(18, areaRect.width * 0.008)));
    const width = Math.max(0, Math.floor(firstSlotRect.left - areaRect.left - left - rightGap));
    const nextStyle: React.CSSProperties = {
      left: `${left}px`,
      width: `${width}px`,
    };

    setBattlefieldLogPanelStyle(prev => (
      prev.left === nextStyle.left && prev.width === nextStyle.width ? prev : nextStyle
    ));
  }, []);

  React.useLayoutEffect(() => {
    updateBattlefieldOverlayMetrics();

    const battlefieldArea = battlefieldAreaRef.current;
    const laneCards = cpuLaneCardsRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateBattlefieldOverlayMetrics)
      : null;
    if (battlefieldArea && resizeObserver) resizeObserver.observe(battlefieldArea);
    if (laneCards && resizeObserver) resizeObserver.observe(laneCards);
    window.addEventListener('resize', updateBattlefieldOverlayMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateBattlefieldOverlayMetrics);
    };
  }, [updateBattlefieldOverlayMetrics]);

  React.useLayoutEffect(() => {
    const logNode = logNodeRef.current;
    if (!logNode) {
      return;
    }
    logNode.scrollTop = logNode.scrollHeight;
  }, [gameLog.length]);

  return (
    <main
      aria-label="対戦盤面"
      className={`game-table-layout ${gameStageClass} ${draggedCard ? 'game-touch-dragging' : ''}`}
      onPointerCancel={() => setDraggedCard(null)}
      onPointerMove={(event) => {
        if (draggedCard && event.pointerType !== 'mouse') {
          event.preventDefault();
        }
      }}
      onPointerUp={handleTouchDragEnd}
    >
      <section className="game-opponent-strip" aria-label="CPU情報">
        <div className="game-opponent-identity">
          <span className="game-strip-title">CPU</span>
          <span className="game-defeat-points game-defeat-points-cpu">敗北P {cpu.defeatPoints}</span>
        </div>
        <HiddenHand count={cpu.hand.length} />
        <div className="game-zone-buttons">
          <span className="game-deck-count"><span className="game-deck-stack" aria-hidden="true" />山 {cpu.deck.length}</span>
          <button
            aria-label="CPUの捨て札を見る"
            className="game-zone-button game-zone-button-cpu"
            disabled={cpu.discardPile.length === 0 || !!winner}
            onClick={() => onOpenDiscardPile('CPU')}
          >
            捨 {cpu.discardPile.length}
          </button>
        </div>
      </section>

      <section
        className={`game-battlefield-area ${hasRecentCombo ? 'game-combo-pulse' : ''}`}
        aria-label="戦場"
        ref={battlefieldAreaRef}
      >
        <FieldLane
          activeCCard={cpuActiveCCard}
          battleVisualResult={combatResultVisual}
          battlefieldTerrainAttribute={battlefieldTerrainAttribute}
          isBattleVisualActive={isVisualizingCombat}
          isCPU
          isCardDisabled={cpuFieldDisabled}
          laneAttentionKey={cpuLaneAttentionKey}
          laneCardsRef={cpuLaneCardsRef}
          onPreviewEnd={() => setPreviewCard(null)}
          onPreviewStart={setPreviewCard}
          onSelectCard={onSelectCard}
          onTargetCard={onTargetCard}
          playerState={cpu}
          scoreClass={cpuScoreClass}
          selectedCard={selectedCard}
          targetableCardNumbers={isSelectingCCardTarget ? cpuCCardTargetableNumbers : undefined}
        />

        <div className={`game-battlefield-overlay ${battleSummary ? 'game-battlefield-overlay-with-battle' : ''}`}>
          <div
            className={`game-battlefield-log-panel ${battleSummary ? 'game-battlefield-log-panel-battle' : ''}`}
            style={battlefieldLogPanelStyle}
          >
            <div className={`game-center-status-row game-center-status-${centerStatusTone}`} title={centerStatusDetail}>
              <strong>{centerStatusText}</strong>
              <span>{centerStatusDetail}</span>
            </div>
            <CenterBattleSummary
              battleSummary={battleSummary}
              combatResultVisual={isVisualizingCombat ? combatResultVisual : unilateralDeploymentWinner}
              cpuPoints={isVisualizingCombat ? cpu.combatPoints : getBattlefieldBaseTotal(cpu.battlefield)}
              onConfirm={isVisualizingCombat ? onConfirmCombatResolution : undefined}
              playerPoints={isVisualizingCombat ? player.combatPoints : getBattlefieldBaseTotal(player.battlefield)}
            />
            <div className="game-log-node custom-scrollbar-xs" role="log" aria-live="polite" ref={logNodeRef}>
              {gameLog.map((logEntry, index) => (
                <p key={`${logEntry.timestamp}-${index}`}>
                  {logEntry.source !== 'SYSTEM' ? `[${logEntry.source === 'PLAYER' ? 'プレイヤー' : 'CPU'}] ` : ''}
                  {logEntry.message}
                </p>
              ))}
            </div>
          </div>

          <div
            className="game-battlefield-terrain-node game-attention-flash"
            key={`terrain-${currentTerrainCard ? getCardInstanceId(currentTerrainCard) : 'none'}-${battlefieldTerrainAttribute || 'none'}`}
          >
            {isVisualizingUnilateralDeployment && unilateralDeploymentWinner ? (
              <span className={`game-unilateral-text ${unilateralDeploymentWinner === 'PLAYER' ? 'text-sky-500' : 'text-red-500'}`}>
                一方的な戦闘
              </span>
            ) : currentTerrainCard ? (
              <div className="game-terrain-content">
                <button
                  aria-label={`${currentTerrainCard.cardName} の画像を確認する`}
                  className="game-terrain-card-thumb"
                  disabled={!currentTerrainCard.imageUrl}
                  onBlur={() => setPreviewCard(null)}
                  onClick={() => currentTerrainCard.imageUrl && onOpenLargeCard(currentTerrainCard)}
                  onFocus={() => setPreviewCard(currentTerrainCard)}
                  onMouseEnter={() => setPreviewCard(currentTerrainCard)}
                  onMouseLeave={() => setPreviewCard(null)}
                  type="button"
                >
                  {currentTerrainCard.imageUrl ? (
                    <img alt="" src={currentTerrainCard.imageUrl} />
                  ) : (
                    <span>{currentTerrainCard.type}</span>
                  )}
                </button>
                <span className="game-terrain-copy">
                  <span className="game-terrain-name" title={currentTerrainCard.cardNameOmm || currentTerrainCard.cardName}>
                    {currentTerrainCard.cardNameOmm || currentTerrainCard.cardName}
                  </span>
                  <span className="game-terrain-attr">属性 {battlefieldTerrainAttribute || 'なし'}</span>
                </span>
              </div>
            ) : (
              <span className="game-terrain-empty">地形未定</span>
            )}
          </div>
        </div>

        <FieldLane
          activeCCard={playerActiveCCard}
          battleVisualResult={combatResultVisual}
          battlefieldTerrainAttribute={battlefieldTerrainAttribute}
          isBattleVisualActive={isVisualizingCombat}
          isCardDisabled={playerFieldDisabled}
          canDropToSquad={canDropDraggedToSquad}
          draggedCard={draggedCard}
          onDropToSquad={dropDraggedToSquad}
          laneAttentionKey={playerLaneAttentionKey}
          onPreviewEnd={() => setPreviewCard(null)}
          onPreviewStart={setPreviewCard}
          onSelectCard={onSelectCard}
          onTargetCard={onTargetCard}
          playerState={player}
          scoreClass={playerScoreClass}
          selectedCard={selectedCard}
          targetableCardNumbers={isSelectingCCardTarget ? playerCCardTargetableNumbers : undefined}
        />
      </section>

      <section className="game-player-dock" aria-label="プレイヤー手札と操作">
        <div className="game-player-command-panel">
          <div className="game-player-zones">
            <div className="game-player-zone-row game-player-zone-summary">
              <span className="game-strip-title">PLAYER</span>
              <span className="game-defeat-points game-defeat-points-player">敗北P {player.defeatPoints}</span>
            </div>
            <div className="game-player-zone-row game-player-zone-links">
              <button
                aria-label="プレイヤーの山札を見る"
                className="game-zone-button game-zone-button-player"
                disabled={player.deck.length === 0 || !!winner}
                onClick={onOpenPlayerDeck}
              >
                <span className="game-deck-stack" aria-hidden="true" />山{player.deck.length}
              </button>
              <button
                aria-label="プレイヤーの捨て札を見る"
                className={`game-zone-button game-zone-button-player ${canDropDraggedToDiscard ? 'game-drop-ready' : ''}`}
                data-game-drop="discard"
                disabled={(!canDropDraggedToDiscard && player.discardPile.length === 0) || !!winner}
                onDragOver={(event) => {
                  if (canDropDraggedToDiscard) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  if (canDropDraggedToDiscard) {
                    event.preventDefault();
                    dropDraggedToDiscard();
                  }
                }}
                onClick={() => onOpenDiscardPile('PLAYER')}
              >
                捨{player.discardPile.length}
              </button>
            </div>
          </div>

          <div className="game-hand-actions">
            {phase === 'FORMATION_PLAYER_PLACE' && (
              <>
                <button
                  aria-label="選択したMカードを小隊に配置する"
                  className="game-action-button game-action-primary"
                  disabled={!selectedCard || selectedCard.type !== 'M' || player.squad.length >= 3 || !isPlayerTurnInteractive}
                  onClick={() => onPlayerAction('PLAY_M_CARD_TO_SQUAD', selectedCard!)}
                >
                  小隊へ
                </button>
                <button
                  aria-label="選択したカードを手札から敗戦フィールドへ送る（編成時Mカード配置不可）"
                  className="game-action-button game-action-discard"
                  disabled={
                    !selectedCard ||
                    !isPlayerTurnInteractive ||
                    (player.squad.length < 3 && player.hand.some((card) => card.type === 'M'))
                  }
                  onClick={() => onPlayerAction('DISCARD_TO_DEFEAT_PILE', selectedCard!)}
                >
                  敗戦へ
                </button>
              </>
            )}
            {phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C' && (
              <>
                <button
                  aria-label="選択したCカードを使用する"
                  className="game-action-button game-action-primary"
                  disabled={!selectedCard || !canPlayerPlaySelectedCCard || !isPlayerTurnInteractive}
                  onClick={() => onPlayerAction('PLAY_C_CARD', selectedCard!)}
                >
                  C使用
                </button>
                <button
                  aria-label="選択したカードを手札から捨てる"
                  className="game-action-button game-action-discard"
                  disabled={!selectedCard || !isPlayerTurnInteractive}
                  onClick={() => onPlayerAction('DISCARD_FROM_HAND_CS', selectedCard!)}
                >
                  捨てる
                </button>
                {pendingTargetCCard && (
                  <button
                    aria-label="Cカードの対象選択をキャンセル"
                    className="game-action-button game-action-cancel"
                    onClick={onCancelCCardTargeting}
                  >
                    取消
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="game-hand-scroll custom-scrollbar-xs">
          {Array.from({ length: 8 }).map((_, idx) => {
            const card = player.hand[idx];
            return (
              <div
                className={`game-hand-slot ${card ? 'game-hand-slot-filled' : 'game-hand-slot-empty'}`}
                key={card ? `player-hand-slot-${getCardInstanceId(card)}-${idx}` : `player-hand-slot-empty-${idx}`}
              >
                {card && (
                  <GameCard
                    card={card}
                    isDisabled={!isPlayerTurnInteractive || isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner}
                    isPlayerCard
                    isSelected={isSameCardInstance(selectedCard, card) && selectedCard?.type === card.type}
                    isDraggable={canDragHandCard}
                    location="hand"
                    onClick={onSelectCard}
                    onDragEnd={() => setDraggedCard(null)}
                    onDragStart={setDraggedCard}
                    onPointerDragStart={setDraggedCard}
                    onPreviewEnd={() => setPreviewCard(null)}
                    onPreviewStart={setPreviewCard}
                    uniqueKey={`player-hand-${getCardInstanceId(card)}-${idx}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {previewCard && (
        <aside className="game-card-hover-preview" aria-hidden="true">
          {previewCard.imageUrl ? (
            <img alt="" src={previewCard.imageUrl} />
          ) : (
            <div className="game-card-hover-fallback">{previewCard.type}</div>
          )}
          <div className="game-card-hover-copy">
            <strong>{previewCard.cardNameOmm || previewCard.cardName}</strong>
            <span>
              {previewCard.type === 'M'
                ? `P ${previewCard.points} / ${previewCard.terrainTypeMCards || '-'}`
                : previewCard.effect || previewCard.textAbility || '-'}
            </span>
          </div>
        </aside>
      )}
      {isVisualizingUnilateralDeployment && (
        <BattleAnimation
          battleSummary={battleSummary}
          combatResultVisual={unilateralDeploymentWinner}
          cpuPoints={getBattlefieldBaseTotal(cpu.battlefield)}
          headerTitle="一方的戦闘"
          onPreviewEnd={() => setPreviewCard(null)}
          onPreviewStart={setPreviewCard}
          playerPoints={getBattlefieldBaseTotal(player.battlefield)}
          terrainAttribute={battlefieldTerrainAttribute}
        />
      )}
    </main>
  );
};
