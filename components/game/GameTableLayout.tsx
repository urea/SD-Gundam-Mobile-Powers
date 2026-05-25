import React from 'react';
import { BattleSummary, Card, CombatSideSummary, GamePhase, LogEntry, PlayerState, PlayerType } from '../../types';
import { isKiraCard } from '../../utils/gameRules';
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
  imageLoadErrors: Record<string, boolean>;
  isCPUMoving: boolean;
  isCpuWinnerVisualizing: boolean;
  isPlayerTurnInteractive: boolean;
  isPlayerWinnerVisualizing: boolean;
  isVisualizingCombat: boolean;
  isVisualizingUnilateralDeployment: boolean;
  onImageError: (key: string) => void;
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
  phaseInstructionBaseTextClass: string;
  phaseInstructionContainerClass: string;
  phaseInstructionStatusTextClass: string;
  phaseInstructionText: string;
  player: PlayerState;
  playerCCardTargetableNumbers?: Set<string>;
  selectedCard: Card | null;
  unilateralDeploymentWinner: PlayerType | null;
  winner: PlayerType | null;
}

interface FieldLaneProps {
  canDropToSquad?: boolean;
  draggedCard?: Card | null;
  isCPU?: boolean;
  isCardDisabled: boolean;
  laneAttentionKey?: string;
  onDropToSquad?: () => void;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
  onSelectCard: (card: Card) => void;
  onTargetCard?: (card: Card) => void;
  playerState: PlayerState;
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
        <div className="game-battle-summary-card" key={card.cardNumber}>
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

const BattleCalculationSummary: React.FC<{
  battleSummary: BattleSummary | null | undefined;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
}> = ({ battleSummary, onPreviewEnd, onPreviewStart }) => {
  if (!battleSummary) return null;
  const calculationLogs = [...battleSummary.tagLogs, ...battleSummary.cCardLogs].slice(0, 6);

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
          <p>タグ/C/S補正なし</p>
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
                key={`${owner}-${card.cardNumber}`}
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
          key={`${owner}-${card.cardNumber}`}
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
  playerPoints: number;
  cpuPoints: number;
  onPreviewEnd: () => void;
  onPreviewStart: (card: Card) => void;
  onConfirm: () => void;
  terrainAttribute: string | null;
}> = ({
  battleSummary,
  combatResultVisual,
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
          <span>戦闘結果</span>
          <strong>{resultText}</strong>
          <button className="game-battle-confirm-button" type="button" onClick={onConfirm}>
            戦闘を確定
          </button>
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
  canDropToSquad,
  draggedCard,
  isCPU = false,
  isCardDisabled,
  laneAttentionKey,
  onDropToSquad,
  onPreviewEnd,
  onPreviewStart,
  onSelectCard,
  onTargetCard,
  playerState,
  selectedCard,
  targetableCardNumbers,
}) => {
  const owner = isCPU ? 'CPU' : 'PLAYER';
  const frontLabel = isCPU ? 'CPU 最前線' : '自軍 最前線';
  const squadLabel = isCPU ? 'CPU 小隊' : '自軍 小隊';
  const toneClass = isCPU ? 'game-lane-cpu' : 'game-lane-player';
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
    <section className={`game-field-lane ${toneClass}`} aria-label={`${owner} field lane`}>
      <div
        className={`game-lane-surface game-lane-attention ${squadDropClass}`}
        data-game-drop={!isCPU ? 'squad' : undefined}
        key={laneAttentionKey}
        onDragOver={handleDragOverToSquad}
        onDrop={handleDropToSquad}
      >
        <span className="game-lane-badge game-lane-badge-squad">{squadLabel}</span>
        <span className="game-lane-badge game-lane-badge-front">{frontLabel}</span>
        <div className="game-lane-cards" aria-label={`${owner} cards`}>
          {orderedFieldCards.map(({ card, idx, location }) => {
            const isTargetable = targetableCardNumbers?.has(card.cardNumber) ?? false;
            return (
              <div
                className={`game-field-card game-field-card-${location} ${isTargetable ? 'game-field-card-targetable' : ''}`}
                key={`${owner.toLowerCase()}-${location}-${card.cardNumber}-${idx}`}
              >
                <GameCard
                  card={card}
                  isPlayerCard={!isCPU}
                  isDisabled={isCardDisabled}
                  isSelected={selectedCard?.cardNumber === card.cardNumber && selectedCard?.type === card.type}
                  isTargetable={isTargetable}
                  location={location}
                  onClick={isTargetable ? onTargetCard : onSelectCard}
                  onPreviewEnd={onPreviewEnd}
                  onPreviewStart={onPreviewStart}
                  uniqueKey={`${owner.toLowerCase()}-${location}-${card.cardNumber}-${idx}`}
                />
              </div>
            );
          })}
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
  imageLoadErrors,
  isCPUMoving,
  isCpuWinnerVisualizing,
  isPlayerTurnInteractive,
  isPlayerWinnerVisualizing,
  isVisualizingCombat,
  isVisualizingUnilateralDeployment,
  onImageError,
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
  phaseInstructionBaseTextClass,
  phaseInstructionContainerClass,
  phaseInstructionStatusTextClass,
  phaseInstructionText,
  player,
  playerCCardTargetableNumbers,
  selectedCard,
  unilateralDeploymentWinner,
  winner,
}) => {
  const [draggedCard, setDraggedCard] = React.useState<Card | null>(null);
  const [previewCard, setPreviewCard] = React.useState<Card | null>(null);
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
  const selectedImageKey = selectedCard ? `table-selected-${selectedCard.cardNumber}` : '';
  const canOpenSelectedImage = !!selectedCard?.imageUrl && !imageLoadErrors[selectedImageKey];
  const isSelectingCCardTarget = !!pendingTargetCCard && !!cCardTargetInstruction;
  const playerLaneAttentionKey = [
    player.squad.map(card => card.cardNumber).join(','),
    player.battlefield.map(card => card.cardNumber).join(','),
  ].join('|');
  const cpuLaneAttentionKey = [
    cpu.squad.map(card => card.cardNumber).join(','),
    cpu.battlefield.map(card => card.cardNumber).join(','),
  ].join('|');
  const hasRecentCombo = gameLog.slice(-4).some(logEntry => logEntry.message.includes('成立'));
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
          <span>敗北P {cpu.defeatPoints}</span>
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

      <FieldLane
        isCPU
        isCardDisabled={cpuFieldDisabled}
        laneAttentionKey={cpuLaneAttentionKey}
        onPreviewEnd={() => setPreviewCard(null)}
        onPreviewStart={setPreviewCard}
        onSelectCard={onSelectCard}
        onTargetCard={onTargetCard}
        playerState={cpu}
        selectedCard={selectedCard}
        targetableCardNumbers={isSelectingCCardTarget ? cpuCCardTargetableNumbers : undefined}
      />

      <section className={`game-center-strip ${hasRecentCombo ? 'game-combo-pulse' : ''}`} aria-label="中央戦場">
        <div
          className={`game-phase-banner game-attention-flash ${phaseInstructionContainerClass} ${phaseInstructionBaseTextClass}`}
          key={`phase-${phase}-${phaseInstructionText}`}
        >
          {phaseInstructionText}
          {isCPUMoving && isCpuPhase && (
            <span className={`ml-1 italic animate-pulse ${phaseInstructionStatusTextClass}`}>(CPU思考中...)</span>
          )}
          {(isVisualizingCombat || isVisualizingUnilateralDeployment) && (
            <span className={`ml-1 italic animate-pulse ${phaseInstructionStatusTextClass}`}>(演出表示中...)</span>
          )}
          {cCardTargetInstruction && (
            <span className="game-target-note">{cCardTargetInstruction}</span>
          )}
        </div>

        <div className={`game-score-node game-attention-flash ${playerScoreClass}`} key={`player-score-${player.combatPoints}`}>
          <span className="game-score-label">PLAYER</span>
          <span className="game-score-value">{player.combatPoints}</span>
        </div>

        <div
          className="game-terrain-node game-attention-flash"
          key={`terrain-${currentTerrainCard?.cardNumber || 'none'}-${battlefieldTerrainAttribute || 'none'}`}
        >
          {isVisualizingUnilateralDeployment && unilateralDeploymentWinner ? (
            <span className={`game-unilateral-text ${unilateralDeploymentWinner === 'PLAYER' ? 'text-sky-500' : 'text-red-500'}`}>
              一方的な戦闘
            </span>
          ) : currentTerrainCard ? (
            <>
              <span className="game-terrain-name" title={currentTerrainCard.cardNameOmm || currentTerrainCard.cardName}>
                {currentTerrainCard.cardNameOmm || currentTerrainCard.cardName}
              </span>
              <span className="game-terrain-attr">属性 {battlefieldTerrainAttribute || 'なし'}</span>
            </>
          ) : (
            <span className="game-terrain-empty">地形未定</span>
          )}
        </div>

        <div className={`game-score-node game-attention-flash ${cpuScoreClass}`} key={`cpu-score-${cpu.combatPoints}`}>
          <span className="game-score-label">CPU</span>
          <span className="game-score-value">{cpu.combatPoints}</span>
        </div>

        <div className="game-log-node" role="log" aria-live="polite">
          {gameLog.slice(-2).map((logEntry, index) => (
            <p key={`${logEntry.timestamp}-${index}`}>
              {logEntry.source !== 'SYSTEM' ? `[${logEntry.source === 'PLAYER' ? 'プレイヤー' : 'CPU'}] ` : ''}
              {logEntry.message}
            </p>
          ))}
        </div>

        <div className="game-selected-node">
          {selectedCard ? (
            <>
              <button
                className="game-selected-thumb"
                disabled={!canOpenSelectedImage}
                onClick={() => selectedCard && canOpenSelectedImage && onOpenLargeCard(selectedCard)}
                aria-label={`${selectedCard.cardName} の画像を拡大表示する`}
              >
                {selectedCard.imageUrl && !imageLoadErrors[selectedImageKey] ? (
                  <img
                    alt={selectedCard.cardName}
                    src={selectedCard.imageUrl}
                    onError={() => onImageError(selectedImageKey)}
                  />
                ) : (
                  <span>{selectedCard.type}</span>
                )}
              </button>
              <div className="game-selected-copy">
                <strong>{selectedCard.cardNameOmm || selectedCard.cardName}</strong>
                <span>
                  {selectedCard.type === 'M'
                    ? `P ${selectedCard.points} / ${selectedCard.terrainTypeMCards || '-'}`
                    : selectedCard.effect || selectedCard.textAbility || '-'}
                </span>
              </div>
            </>
          ) : (
            <span>未選択</span>
          )}
        </div>
      </section>

      <FieldLane
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
        selectedCard={selectedCard}
        targetableCardNumbers={isSelectingCCardTarget ? playerCCardTargetableNumbers : undefined}
      />

      <section className="game-player-dock" aria-label="プレイヤー手札と操作">
        <div className="game-player-command-panel">
          <div className="game-player-zones">
            <div className="game-player-zone-row game-player-zone-summary">
              <span className="game-strip-title">PLAYER</span>
              <span>敗北P {player.defeatPoints}</span>
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
                  aria-label="選択したカードを手札から捨て札へ送る（編成時）"
                  className="game-action-button game-action-discard"
                  disabled={
                    !selectedCard ||
                    !isPlayerTurnInteractive ||
                    (player.squad.length < 3 && player.hand.some((card) => card.type === 'M'))
                  }
                  onClick={() => onPlayerAction('DISCARD_TO_DEFEAT_PILE', selectedCard!)}
                >
                  捨てる
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
          {player.hand.map((card, idx) => (
            <GameCard
              card={card}
              isDisabled={!isPlayerTurnInteractive || isVisualizingCombat || isVisualizingUnilateralDeployment || !!winner}
              isPlayerCard
              isSelected={selectedCard?.cardNumber === card.cardNumber && selectedCard?.type === card.type}
              isDraggable={canDragHandCard}
              key={`player-hand-${card.cardNumber}-${idx}`}
              location="hand"
              onClick={onSelectCard}
              onDragEnd={() => setDraggedCard(null)}
              onDragStart={setDraggedCard}
              onPointerDragStart={setDraggedCard}
              onPreviewEnd={() => setPreviewCard(null)}
              onPreviewStart={setPreviewCard}
              uniqueKey={`player-hand-${card.cardNumber}-${idx}`}
            />
          ))}
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
      {isVisualizingCombat && (
        <BattleAnimation
          battleSummary={battleSummary}
          combatResultVisual={combatResultVisual}
          cpuPoints={cpu.combatPoints}
          onConfirm={onConfirmCombatResolution}
          onPreviewEnd={() => setPreviewCard(null)}
          onPreviewStart={setPreviewCard}
          playerPoints={player.combatPoints}
          terrainAttribute={battlefieldTerrainAttribute}
        />
      )}
    </main>
  );
};
