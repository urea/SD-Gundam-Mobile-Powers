import React from 'react';
import { Card } from '../../types';
import { isKiraCard } from '../../utils/gameRules';
import { getCardInstanceId } from '../../utils/cardIdentity';
import { useGamePageContext } from './GamePageContext';

interface GameCardProps {
  card: Card;
  isPlayerCard: boolean;
  location: 'hand' | 'squad' | 'battlefield' | 'discardPile' | 'deck';
  onClick?: (card: Card) => void;
  onDragEnd?: () => void;
  onDragStart?: (card: Card, event: React.DragEvent<HTMLButtonElement>) => void;
  onDoubleAction?: (card: Card) => void;
  onPreviewEnd?: () => void;
  onPreviewStart?: (card: Card) => void;
  onPointerDragStart?: (card: Card, event: React.PointerEvent<HTMLButtonElement>) => void;
  isSelected?: boolean;
  isTargetable?: boolean;
  isDisabled?: boolean;
  isDraggable?: boolean;
  isFaceDown?: boolean;
  uniqueKey: string;
}

export const GameCard: React.FC<GameCardProps> = ({
  card,
  isPlayerCard,
  location,
  onClick,
  onDragEnd,
  onDragStart,
  onDoubleAction,
  onPreviewEnd,
  onPreviewStart,
  onPointerDragStart,
  isSelected,
  isTargetable,
  isDisabled,
  isDraggable,
  isFaceDown,
  uniqueKey,
}) => {
  const { handleImageError, imageLoadErrors, setSelectedCard: contextSetSelectedCard } = useGamePageContext();
  const lastTapAtRef = React.useRef(0);
  const suppressNextClickRef = React.useRef(false);
  const isMCard = card.type === 'M';
  const hasError = imageLoadErrors[uniqueKey];
  const showImage = !isFaceDown && card.imageUrl && !hasError;
  const isKira = !isFaceDown && isKiraCard(card);
  const isDestroyed = !isFaceDown && !!card.isDestroyed;
  const isTapped = !!card.isTapped;
  const isPendingDiscard = !!card.isPendingDiscard;
  const isPendingDefeat = !!card.isPendingDefeat;
  const hasPendingExit = isPendingDiscard || isPendingDefeat;
  const showTextOverlay = !isFaceDown && !showImage;

  const cardSizeSpecificClasses = 'game-card-size';

  let bgColor = 'bg-slate-200';
  let textColor = 'text-slate-800';

  if (showImage) {
    bgColor = 'bg-transparent';
  } else if (isMCard) {
    if (card.factionAffiliation === '地球連邦') {
      bgColor = 'bg-sky-200';
      textColor = 'text-sky-800';
    } else if (card.factionAffiliation === '赤ジオン') {
      bgColor = 'bg-red-200';
      textColor = 'text-red-800';
    } else if (card.factionAffiliation === '緑ジオン') {
      bgColor = 'bg-emerald-200';
      textColor = 'text-emerald-800';
    } else if (card.factionAffiliation === '青ジオン') {
      bgColor = 'bg-blue-200';
      textColor = 'text-blue-800';
    } else {
      bgColor = 'bg-slate-300';
      textColor = 'text-slate-800';
    }
  } else {
    bgColor = 'bg-yellow-200';
    textColor = 'text-yellow-800';
  }

  const cardTitle = isFaceDown
    ? '伏せられたMカード'
    : `${card.cardNameOmm || card.cardName} (${card.type}${isMCard ? ` P:${card.points}` : ''})
Flavor: ${card.textAbility}
${card.type === 'C' && card.effect ? `Effect: ${card.effect}\n` : ''}Tags: ${card.tags || '-'}
Var: ${card.gameVar || '-'}`;

  const canUseCardAction = !isFaceDown && !isDestroyed && !hasPendingExit;
  const canUseDoubleAction = canUseCardAction && !isDisabled && !!onDoubleAction;
  const effectiveOnClick = canUseCardAction
    ? () => {
        if (suppressNextClickRef.current) {
          suppressNextClickRef.current = false;
          return;
        }
        if (onClick) {
          onClick(card);
          return;
        }
        contextSetSelectedCard(card);
      }
    : undefined;
  const canDrag = !!isDraggable && !isDisabled && !isFaceDown && !isDestroyed && !hasPendingExit;
  const isEffectivelyDisabled = !!isDisabled || !!isFaceDown;

  const handleDoubleAction = (
    event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>,
    suppressFollowingClick = false,
  ) => {
    if (!canUseDoubleAction) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = suppressFollowingClick;
    onDoubleAction(card);
  };

  return (
    <button
      onClick={effectiveOnClick}
      disabled={isEffectivelyDisabled}
      draggable={canDrag}
      onDoubleClick={canUseDoubleAction ? (event) => handleDoubleAction(event) : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onDragStart={canDrag ? (event) => {
        const cardId = getCardInstanceId(card);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-mobile-powers-card-id', cardId);
        event.dataTransfer.setData('text/plain', cardId);
        onDragStart?.(card, event);
      } : undefined}
      onPointerDown={canDrag ? (event) => {
        if (event.pointerType !== 'mouse') {
          onPointerDragStart?.(card, event);
        }
      } : undefined}
      onPointerUp={canUseDoubleAction ? (event) => {
        if (event.pointerType === 'mouse') {
          return;
        }
        const now = Date.now();
        const elapsed = now - lastTapAtRef.current;
        lastTapAtRef.current = now;
        if (elapsed > 0 && elapsed < 340) {
          lastTapAtRef.current = 0;
          handleDoubleAction(event, true);
        }
      } : undefined}
      onBlur={isFaceDown ? undefined : onPreviewEnd}
      onFocus={isFaceDown ? undefined : () => onPreviewStart?.(card)}
      onMouseEnter={isFaceDown ? undefined : () => onPreviewStart?.(card)}
      onMouseLeave={isFaceDown ? undefined : onPreviewEnd}
      key={uniqueKey}
      className={`${cardSizeSpecificClasses} rounded overflow-hidden shadow-md relative transition-all duration-150 ease-in-out transform hover:scale-105
                  ${bgColor}
                  ${isSelected && !isFaceDown ? (isPlayerCard ? 'ring-4 ring-sky-400 shadow-xl' : 'ring-4 ring-red-400 shadow-xl') : 'ring-1 ring-slate-400'}
                  ${isTargetable && !isFaceDown && !isDestroyed ? 'game-card-targetable' : ''}
                  ${isDestroyed ? 'game-card-destroyed' : ''}
                  ${isPendingDiscard ? 'game-card-pending-discard' : ''}
                  ${isPendingDefeat ? 'game-card-pending-defeat' : ''}
                  ${isTapped ? 'game-card-tapped' : ''}
                  ${isDestroyed || hasPendingExit ? 'cursor-help' : isEffectivelyDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                  ${isKira ? 'kira-border-animated' : ''}`}
      title={cardTitle}
      aria-label={isFaceDown ? `${location}の伏せられたMカード${isPendingDefeat ? ' 敗戦予定' : isPendingDiscard ? ' 捨て札予定' : isTapped ? ' 待機中' : ''}` : `${location}のカード ${card.cardNameOmm || card.cardName} ${isSelected ? '選択中' : ''} ${isPendingDefeat ? '敗戦予定' : isPendingDiscard ? '捨て札予定' : isTapped ? '待機中' : ''} ${isKira ? 'キラカード' : ''}`}
      aria-pressed={!isFaceDown && isSelected}
    >
      {isFaceDown ? (
        <img
          src="/assets/card-back.png"
          alt=""
          draggable={false}
          className="w-full h-full object-cover bg-blue-900"
          loading="lazy"
        />
      ) : showImage ? (
        <img
          src={card.imageUrl}
          alt={card.cardName}
          draggable={false}
          className="w-full h-full object-contain bg-slate-100"
          onError={() => handleImageError(uniqueKey)}
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center p-1 ${textColor} text-xs`}>
          <span className="font-bold text-base">{card.type}</span>
        </div>
      )}
      {showTextOverlay && (
        <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-black/70 backdrop-blur-sm">
          <p className="text-white font-semibold truncate leading-tight" style={{ fontSize: '0.6rem' }}>
            {card.cardNameOmm || card.cardName}
          </p>
          {isMCard && (
            <p className="text-yellow-300 leading-tight" style={{ fontSize: '0.55rem' }}>
              P: {card.points} | 地: {card.terrainTypeMCards}
            </p>
          )}
          {!isMCard && (
            <p className="text-amber-300 leading-tight" style={{ fontSize: '0.55rem' }}>
              効果地形: {card.battlefieldTerrain}
            </p>
          )}
        </div>
      )}
      {isDestroyed && (
        <span className="game-card-destroyed-overlay" aria-hidden="true">
          <span className="game-card-destroyed-mark">×</span>
        </span>
      )}
      {isPendingDefeat && !isDestroyed && (
        <span className="game-card-pending-badge game-card-pending-defeat-badge" aria-hidden="true">敗戦</span>
      )}
      {isPendingDiscard && !isDestroyed && !isPendingDefeat && (
        <span className="game-card-pending-badge game-card-pending-discard-badge" aria-hidden="true">捨て</span>
      )}
      {isTapped && !isDestroyed && !hasPendingExit && (
        <span className="game-card-tapped-badge" aria-hidden="true">待機</span>
      )}
    </button>
  );
};
