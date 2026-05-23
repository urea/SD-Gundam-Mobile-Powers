
import React, { useState, useEffect } from 'react';
import type { Page } from '../App';
import { GameSetupModal, RANDOM_PRESET_INTERNAL_ID } from '../components/GameSetupModal'; // Ensuring relative path and import special ID
import { cpuDeckPresets, PredefinedDeck } from '../data/cpuDecks';
import { parseMobilePowersTsvData, tsvData as allCardsTsvData } from '../components/RulePage';
import { Card } from '../types';
import { createFullCardInstancePool } from '../utils/deckCodeUtils';


interface MainMenuProps {
  onNavigate: (page: Page, options?: { deckCode?: string; cpuDeckCode?: string }) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
  const [isGameSetupModalOpen, setIsGameSetupModalOpen] = useState(false);

  const buttonStyle = "w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transform transition-all duration-150 hover:scale-105 text-xl text-center focus:outline-none focus:ring-4 focus:ring-sky-400 focus:ring-opacity-50";
  
  const handleOpenGameSetupModal = () => {
    setIsGameSetupModalOpen(true);
  };

  const handleGameSetupSubmit = (
    playerDeckChoice: { code: string } | { presetId: string },
    cpuDeckChoice: { code: string } | { presetId: string }
  ) => {
    let playerDeckCodeForGame: string | undefined = undefined;
    let cpuDeckCodeForGame: string | undefined = undefined;

    // Determine Player's Deck Code
    if ('code' in playerDeckChoice) {
      playerDeckCodeForGame = playerDeckChoice.code;
    } else { // presetId
      if (playerDeckChoice.presetId === RANDOM_PRESET_INTERNAL_ID) {
        if (cpuDeckPresets.length > 0) {
          const randomIndex = Math.floor(Math.random() * cpuDeckPresets.length);
          playerDeckCodeForGame = cpuDeckPresets[randomIndex].code;
          console.log(`Player chose random preset, selected: ${cpuDeckPresets[randomIndex].name}`);
        } else {
          console.warn("Player chose random preset, but no presets available. Defaulting to full random.");
          playerDeckCodeForGame = undefined; // GamePage will handle full random generation
        }
      } else {
        const selectedPreset = cpuDeckPresets.find(p => p.id === playerDeckChoice.presetId);
        if (selectedPreset) {
          playerDeckCodeForGame = selectedPreset.code;
        } else {
          console.warn(`MainMenu: Player preset ID "${playerDeckChoice.presetId}" not found. Player will use full random deck.`);
          playerDeckCodeForGame = undefined; // GamePage will handle full random generation
        }
      }
    }

    // Determine CPU's Deck Code
    if ('code' in cpuDeckChoice) {
      cpuDeckCodeForGame = cpuDeckChoice.code;
    } else { // presetId
      if (cpuDeckChoice.presetId === RANDOM_PRESET_INTERNAL_ID) {
        if (cpuDeckPresets.length > 0) {
          const randomIndex = Math.floor(Math.random() * cpuDeckPresets.length);
          cpuDeckCodeForGame = cpuDeckPresets[randomIndex].code;
          console.log(`CPU chose random preset, selected: ${cpuDeckPresets[randomIndex].name}`);
        } else {
          console.warn("CPU chose random preset, but no presets available. Defaulting to full random.");
          cpuDeckCodeForGame = undefined; // GamePage will handle full random generation
        }
      } else {
        const selectedPreset = cpuDeckPresets.find(p => p.id === cpuDeckChoice.presetId);
        if (selectedPreset) {
          cpuDeckCodeForGame = selectedPreset.code;
        } else {
          console.warn(`MainMenu: CPU preset ID "${cpuDeckChoice.presetId}" not found. CPU will use full random deck.`);
          cpuDeckCodeForGame = undefined; // GamePage will handle full random generation
        }
      }
    }
    
    setIsGameSetupModalOpen(false);
    onNavigate('GAME', {
      deckCode: playerDeckCodeForGame, // undefined means GamePage generates full random
      cpuDeckCode: cpuDeckCodeForGame  // undefined means GamePage generates full random
    });
  };


  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 sm:p-8">
        <header className="mb-10 sm:mb-12 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-sky-700 tracking-tight">
            モビルパワーズ
          </h1>
          <p className="text-lg sm:text-xl text-sky-600 mt-2">Mobile Powers App</p>
        </header>

        <main className="w-full max-w-md sm:max-w-lg">
          <div className="grid grid-cols-1 gap-5 sm:gap-6">
            <button
              onClick={() => onNavigate('RULEBOOK')}
              className={buttonStyle}
              aria-label="ルールブックを開く"
            >
              ルールブック
            </button>
            <button
              onClick={handleOpenGameSetupModal} 
              className={buttonStyle}
              aria-label="CPUと対戦を開始する"
            >
              CPU対戦
            </button>

            <button
              onClick={() => onNavigate('CARD_VIEWER')}
              className={buttonStyle}
              aria-label="カードビューワを開く"
            >
              カードビューワ
            </button>
            <button
              onClick={() => onNavigate('DECK_EDITOR')}
              className={buttonStyle}
              aria-label="デッキ編成を開く"
              title="デッキ編成"
            >
              デッキ編成
            </button>
          </div>
        </main>

        <footer className="mt-12 sm:mt-20 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Fan-made Mobile Powers Utility.</p>
        </footer>
      </div>
      {isGameSetupModalOpen && (
        <GameSetupModal
          isOpen={isGameSetupModalOpen}
          onClose={() => setIsGameSetupModalOpen(false)}
          onSubmit={handleGameSetupSubmit}
          cpuDeckPresets={cpuDeckPresets}
        />
      )}
    </>
  );
};
