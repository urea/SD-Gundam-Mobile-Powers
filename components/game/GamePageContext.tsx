import React from 'react';
import { Card } from '../../types';

export interface GamePageContextValue {
  handleImageError: (key: string) => void;
  imageLoadErrors: Record<string, boolean>;
  setSelectedCard: (card: Card | null) => void;
}

export const GamePageContext = React.createContext<GamePageContextValue>({
  handleImageError: () => {},
  imageLoadErrors: {},
  setSelectedCard: () => {},
});

export const useGamePageContext = () => React.useContext(GamePageContext);
