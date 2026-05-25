
import React, { useEffect, useState } from 'react';
import { RulePage } from './components/RulePage';
import { GamePage } from './pages/GamePage';
import { MainMenu } from './pages/MainMenu';
import { DeckEditorPage } from './pages/DeckEditorPage';
import { CardViewerPage } from './pages/CardViewerPage';

export type Page = 'MAIN_MENU' | 'RULEBOOK' | 'GAME' | 'DECK_EDITOR' | 'CARD_VIEWER';

const pageToHash: Record<Page, string> = {
  MAIN_MENU: '',
  RULEBOOK: '#/rulebook',
  GAME: '#/game',
  DECK_EDITOR: '#/deck-editor',
  CARD_VIEWER: '#/card-viewer',
};

const pageFromHash = (hash: string): Page => {
  switch (hash) {
    case '#/rulebook':
      return 'RULEBOOK';
    case '#/game':
      return 'GAME';
    case '#/deck-editor':
      return 'DECK_EDITOR';
    case '#/card-viewer':
      return 'CARD_VIEWER';
    default:
      return 'MAIN_MENU';
  }
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(() => pageFromHash(window.location.hash));
  const [playerDeckCodeForGame, setPlayerDeckCodeForGame] = useState<string | undefined>(undefined);
  const [cpuDeckCodeForGame, setCpuDeckCodeForGame] = useState<string | undefined>(undefined);

  const navigateTo = (page: Page, options?: { deckCode?: string; cpuDeckCode?: string }) => {
    if (page === 'GAME') {
      setPlayerDeckCodeForGame(options?.deckCode?.trim() || undefined);
      setCpuDeckCodeForGame(options?.cpuDeckCode?.trim() || undefined);
    } else {
      // Clear deck codes when navigating away from game setup or game
      setPlayerDeckCodeForGame(undefined);
      setCpuDeckCodeForGame(undefined);
    }
    setCurrentPage(page);

    const nextHash = pageToHash[page];
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({ page }, '', nextUrl);
    }
  };

  useEffect(() => {
    const syncPageFromLocation = () => {
      const page = pageFromHash(window.location.hash);
      if (page !== 'GAME') {
        setPlayerDeckCodeForGame(undefined);
        setCpuDeckCodeForGame(undefined);
      }
      setCurrentPage(page);
    };

    window.addEventListener('hashchange', syncPageFromLocation);
    window.addEventListener('popstate', syncPageFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncPageFromLocation);
      window.removeEventListener('popstate', syncPageFromLocation);
    };
  }, []);

  if (currentPage === 'MAIN_MENU') {
    return <MainMenu onNavigate={navigateTo} />;
  }

  if (currentPage === 'GAME') {
    return <GamePage 
             onExit={() => navigateTo('MAIN_MENU')} 
             initialDeckCode={playerDeckCodeForGame} 
             initialCpuDeckCode={cpuDeckCodeForGame} 
           />;
  }

  if (currentPage === 'RULEBOOK') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center p-4 sm:p-8">
        <header className="w-full max-w-4xl mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-sky-600">モビルパワーズ ルールブック</h1>
          <p className="text-slate-500 mt-2">Mobile Powers Rule Book</p>
          <p className="text-xs text-slate-400 mt-1">
            Based on rules from:
            <a
              href="http://card.g1.xrea.com/t2/tbc03gmp.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-500 hover:text-sky-700 underline"
            >
              card.g1.xrea.com
            </a>
          </p>
          <button
            onClick={() => navigateTo('MAIN_MENU')}
            className="mt-6 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out"
            aria-label="メインメニューへ戻る"
          >
            メインメニューへ
          </button>
        </header>
        <main className="w-full max-w-4xl bg-white shadow-2xl rounded-lg p-6 sm:p-10">
          <RulePage />
        </main>
        <footer className="w-full max-w-4xl mt-12 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Mobile Powers App. This is a fan-made utility.</p>
        </footer>
      </div>
    );
  }

  if (currentPage === 'DECK_EDITOR') {
    return <DeckEditorPage onExit={() => navigateTo('MAIN_MENU')} />;
  }

  if (currentPage === 'CARD_VIEWER') {
    return <CardViewerPage onExit={() => navigateTo('MAIN_MENU')} />;
  }

  // Fallback to MainMenu
  return <MainMenu onNavigate={navigateTo} />;
};

export default App;
