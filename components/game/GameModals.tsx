import React from 'react';
import { Card, PlayerType } from '../../types';
import { isKiraCard } from '../../utils/gameRules';
import { GameCard } from './GameCard';

interface GameOverModalProps {
  winner: PlayerType | null;
  onRetry: () => void;
  onExit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ winner, onRetry, onExit }) => {
  if (!winner) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameOverHeading"
    >
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full">
        <h2 id="gameOverHeading" className="text-5xl font-bold mb-4 text-yellow-500">
          ゲーム終了！
        </h2>
        <p className="text-3xl text-slate-700 mb-8">{winner === 'PLAYER' ? 'プレイヤーの勝利！' : 'CPUの勝利！'}</p>
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={onRetry}
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded text-xl shadow transition-colors"
          >
            再戦
          </button>
          <button
            onClick={onExit}
            className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded text-xl shadow transition-colors"
          >
            メインメニューへ
          </button>
        </div>
      </div>
    </div>
  );
};

interface LargeCardModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LargeCardModal: React.FC<LargeCardModalProps> = ({ card, isOpen, onClose }) => {
  if (!isOpen || !card?.imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="largeCardModalTitle"
    >
      <div
        className={`relative max-w-full max-h-full flex items-center justify-center ${isKiraCard(card) ? 'kira-border-animated rounded-lg' : ''}`}
        onClick={event => event.stopPropagation()}
      >
        <img
          src={card.imageUrl}
          alt={`Large view of ${card.cardName}`}
          className="block max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
          aria-label="閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 sm:w-8 sm:h-8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 id="largeCardModalTitle" className="sr-only">
          {`${card.cardName} の拡大表示`}
        </h2>
      </div>
    </div>
  );
};

interface CardCollectionModalProps {
  cards: Card[];
  emptyMessage: string;
  isOpen: boolean;
  isPlayerCard: boolean;
  keyPrefix: string;
  location: 'discardPile' | 'deck';
  onClose: () => void;
  onSelectCard: (card: Card) => void;
  selectedCard: Card | null;
  title: string;
}

export const CardCollectionModal: React.FC<CardCollectionModalProps> = ({
  cards,
  emptyMessage,
  isOpen,
  isPlayerCard,
  keyPrefix,
  location,
  onClose,
  onSelectCard,
  selectedCard,
  title,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${keyPrefix}ModalHeading`}
    >
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 id={`${keyPrefix}ModalHeading`} className="text-xl font-semibold text-sky-700">
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-3xl leading-none" aria-label="閉じる">
            &times;
          </button>
        </div>
        {cards.length > 0 ? (
          <div className="flex-grow overflow-y-auto custom-scrollbar-xs pr-2">
            <div className="flex flex-wrap gap-3 justify-center">
              {cards.map((card, index) => (
                <GameCard
                  key={`${keyPrefix}-${card.cardNumber}-${index}`}
                  card={card}
                  isPlayerCard={isPlayerCard}
                  location={location}
                  onClick={() => onSelectCard(card)}
                  isSelected={selectedCard?.cardNumber === card.cardNumber && selectedCard?.type === card.type}
                  isDisabled={false}
                  uniqueKey={`${keyPrefix}-${card.cardNumber}-${index}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
};
