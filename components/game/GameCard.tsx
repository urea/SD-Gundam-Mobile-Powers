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
  const isMCard = card.type === 'M';
  const hasError = imageLoadErrors[uniqueKey];
  const showImage = !isFaceDown && card.imageUrl && !hasError;
  const isKira = !isFaceDown && isKiraCard(card);
  const isDestroyed = !isFaceDown && !!card.isDestroyed;
  const isTapped = !isFaceDown && !!card.isTapped;
  const showTextOverlay = !isFaceDown && (!showImage || location === 'hand' || location === 'deck' || location === 'discardPile');

  const cardSizeSpecificClasses = 'game-card-size';

  let bgColor = 'bg-slate-200';
  let textColor = 'text-slate-800';

  if (showImage) {
    bgColor = 'bg-transparent';
  } else if (isMCard) {
    bgColor =
      card.factionAffiliation === '地球連邦'
        ? 'bg-sky-200'
        : card.factionAffiliation === 'ジオン'
          ? 'bg-red-200'
          : 'bg-slate-300';
    textColor =
      card.factionAffiliation === '地球連邦'
        ? 'text-sky-800'
        : card.factionAffiliation === 'ジオン'
          ? 'text-red-800'
          : 'text-slate-800';
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

  const effectiveOnClick = isFaceDown || isDestroyed ? undefined : onClick ? () => onClick(card) : () => contextSetSelectedCard(card);
  const canDrag = !!isDraggable && !isDisabled && !isFaceDown && !isDestroyed;
  const isEffectivelyDisabled = !!isDisabled || !!isFaceDown;

  return (
    <button
      onClick={effectiveOnClick}
      disabled={isEffectivelyDisabled}
      draggable={canDrag}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onDragStart={canDrag ? (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', getCardInstanceId(card));
        onDragStart?.(card, event);
      } : undefined}
      onPointerDown={canDrag ? (event) => {
        if (event.pointerType !== 'mouse') {
          onPointerDragStart?.(card, event);
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
                  ${isTapped ? 'game-card-tapped' : ''}
                  ${isDestroyed ? 'cursor-help' : isEffectivelyDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                  ${isKira ? 'kira-border-animated' : ''}`}
      title={cardTitle}
      aria-label={isFaceDown ? `${location}の伏せられたMカード` : `${location}のカード ${card.cardNameOmm || card.cardName} ${isSelected ? '選択中' : ''} ${isTapped ? '待機中' : ''} ${isKira ? 'キラカード' : ''}`}
      aria-pressed={!isFaceDown && isSelected}
    >
      {isFaceDown ? (
        <img
          src="/assets/card-back.png"
          alt=""
          className="w-full h-full object-cover bg-blue-900"
          loading="lazy"
        />
      ) : showImage ? (
        <img
          src={card.imageUrl}
          alt={card.cardName}
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
      {isTapped && !isDestroyed && (
        <span className="game-card-tapped-badge" aria-hidden="true">待機</span>
      )}
    </button>
  );
};
