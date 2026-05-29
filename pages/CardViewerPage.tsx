
import React, { useState, useEffect } from 'react';
import { CardDisplayTable, type DisplayCard, type SortableCardKey } from '../components/CardDisplayTable';
import { compareSourceSets, loadFullCardCatalog, STARTER_VER_1_SOURCE_SET, type CatalogCard } from '../data/cardCatalog';

interface CardViewerPageProps {
  onExit: () => void;
}

type CardTypeFilter = 'ALL' | 'M' | 'C';

const VIEWER_DISPLAY_LIMIT = 100;
const ALL_SOURCE_SET_FILTER = 'ALL';
const DEFAULT_SOURCE_SET_FILTER = STARTER_VER_1_SOURCE_SET;

const FilterInput: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-slate-600 mb-1">{label}</label>
    {children}
  </div>
);

const isKiraCard = (card: DisplayCard): boolean => {
  return card.tags.includes("キラ");
};

export const CardViewerPage: React.FC<CardViewerPageProps> = ({ onExit }) => {
  const [allCards, setAllCards] = useState<CatalogCard[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogLoadError, setCatalogLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadFullCardCatalog()
      .then(cards => {
        if (isMounted) {
          setAllCards(cards);
        }
      })
      .catch(error => {
        console.error('Failed to load card catalog', error);
        if (isMounted) {
          setCatalogLoadError('追加カードカタログの読み込みに失敗しました。');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCatalogLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter states
  const [filterName, setFilterName] = useState('');
  const [draftFilterName, setDraftFilterName] = useState('');
  const [filterType, setFilterType] = useState<CardTypeFilter>('ALL');
  const [draftFilterType, setDraftFilterType] = useState<CardTypeFilter>('ALL');
  const [uniqueFactions, setUniqueFactions] = useState<string[]>(['ALL']);
  const [filterFaction, setFilterFaction] = useState('ALL');
  const [draftFilterFaction, setDraftFilterFaction] = useState('ALL');
  const [filterTerrain, setFilterTerrain] = useState('');
  const [draftFilterTerrain, setDraftFilterTerrain] = useState('');
  const [filterPoints, setFilterPoints] = useState('');
  const [draftFilterPoints, setDraftFilterPoints] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [draftFilterTags, setDraftFilterTags] = useState('');
  const [filterSourceSet, setFilterSourceSet] = useState(DEFAULT_SOURCE_SET_FILTER);
  const [draftFilterSourceSet, setDraftFilterSourceSet] = useState(DEFAULT_SOURCE_SET_FILTER);

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: SortableCardKey; direction: 'ascending' | 'descending' } | null>({ key: 'cardNumber', direction: 'ascending' });

  // Modal state
  const [isLargeCardModalOpen, setIsLargeCardModalOpen] = useState(false);
  const [cardForLargeModal, setCardForLargeModal] = useState<DisplayCard | null>(null);

  useEffect(() => {
    if (allCards.length > 0) {
      const factions = new Set<string>();
      allCards.forEach(card => {
        if (card.factionAffiliation) {
          card.factionAffiliation.split(',').map(f => f.trim()).filter(Boolean).forEach(f => factions.add(f));
        }
      });
      setUniqueFactions(['ALL', ...Array.from(factions).sort()]);
    }
  }, [allCards]);

  const terrainOptions = React.useMemo(() => {
    const terrainOrder = ['宇', '空', '陸', '海'];
    return terrainOrder.filter(terrain => allCards.some(card => card.displayTerrain.includes(terrain)));
  }, [allCards]);

  const sourceSetOptions = React.useMemo(() => {
    const sourceSets = new Set<string>();
    sourceSets.add(DEFAULT_SOURCE_SET_FILTER);
    allCards.forEach(card => {
      if (card.sourceSet) sourceSets.add(card.sourceSet);
    });
    return [ALL_SOURCE_SET_FILTER, ...Array.from(sourceSets).sort(compareSourceSets)];
  }, [allCards]);

  const tagOptions = React.useMemo(() => {
    const tags = new Set<string>();
    allCards.forEach(card => {
      card.tags.split(/\s+/).map(tag => tag.trim()).filter(Boolean).forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [allCards]);

  const openLargeCardModal = (card: DisplayCard) => {
    if (card.imageUrl) {
      setCardForLargeModal(card);
      setIsLargeCardModalOpen(true);
    }
  };

  const closeLargeCardModal = () => {
    setIsLargeCardModalOpen(false);
    setCardForLargeModal(null);
  };

  const filteredAndSortedCards = React.useMemo(() => {
    let filtered = [...allCards];

    // Apply filters
    if (filterName) {
      const nameLower = filterName.toLowerCase();
      filtered = filtered.filter(card =>
        card.cardName.toLowerCase().includes(nameLower) ||
        card.cardNameOmm.toLowerCase().includes(nameLower)
      );
    }
    if (filterType !== 'ALL') {
      filtered = filtered.filter(card => card.type === filterType);
    }
    if (filterFaction !== 'ALL') {
      filtered = filtered.filter(card => card.factionAffiliation.includes(filterFaction));
    }
    if (filterTerrain) {
      filtered = filtered.filter(card => card.displayTerrain.includes(filterTerrain));
    }
    if (filterSourceSet !== ALL_SOURCE_SET_FILTER) {
      filtered = filtered.filter(card => card.sourceSet === filterSourceSet);
    }
    if (filterPoints) {
      filtered = filtered.filter(card => {
        if (card.type !== 'M' || card.pointsNum < 0) return false;
        const point = card.pointsNum;

        if (filterPoints.includes('-')) {
          const [minStr, maxStr] = filterPoints.split('-');
          const min = parseInt(minStr.trim());
          const max = parseInt(maxStr.trim());
          let match = true;
          if (!isNaN(min)) match = match && point >= min;
          if (!isNaN(max)) match = match && point <= max;
          return match && (isNaN(min) || isNaN(max) ? !isNaN(min) || !isNaN(max) : true); // ensure at least one bound is valid if range
        } else {
          const targetPoint = parseInt(filterPoints.trim());
          return !isNaN(targetPoint) && point === targetPoint;
        }
      });
    }
    if (filterTags) {
      filtered = filtered.filter(card => card.tags.split(/\s+/).includes(filterTags));
    }

    // Apply sort
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortConfig.key === 'pointsNum') {
          valA = a.pointsNum;
          valB = b.pointsNum;
        } else if (sortConfig.key === 'displayTerrain') {
          valA = a.displayTerrain;
          valB = b.displayTerrain;
        } else if (sortConfig.key === 'tags') {
          valA = a.tags;
          valB = b.tags;
        }
         else {
          valA = a[sortConfig.key as keyof Omit<DisplayCard, 'pointsNum' | 'displayTerrain' | 'tags'>] as string | number;
          valB = b[sortConfig.key as keyof Omit<DisplayCard, 'pointsNum' | 'displayTerrain' | 'tags'>] as string | number;
        }
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            valA = valA.toLowerCase(); // case-insensitive for strings
            valB = valB.toLowerCase();
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        // If values are equal, maintain original order for stability or sort by card number
        if (a.cardNumber < b.cardNumber) return -1;
        if (a.cardNumber > b.cardNumber) return 1;
        return 0;
      });
    }
    return filtered;
  }, [allCards, filterName, filterType, filterFaction, filterTerrain, filterSourceSet, filterPoints, filterTags, sortConfig]);

  const visibleCards = React.useMemo(() => {
    return filteredAndSortedCards.slice(0, VIEWER_DISPLAY_LIMIT);
  }, [filteredAndSortedCards]);

  const isDisplayLimited = filteredAndSortedCards.length > VIEWER_DISPLAY_LIMIT;

  const requestSort = (key: SortableCardKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const clearFilters = () => {
    setFilterName('');
    setDraftFilterName('');
    setFilterType('ALL');
    setDraftFilterType('ALL');
    setFilterFaction('ALL');
    setDraftFilterFaction('ALL');
    setFilterTerrain('');
    setDraftFilterTerrain('');
    setFilterSourceSet(DEFAULT_SOURCE_SET_FILTER);
    setDraftFilterSourceSet(DEFAULT_SOURCE_SET_FILTER);
    setFilterPoints('');
    setDraftFilterPoints('');
    setFilterTags('');
    setDraftFilterTags('');
  };

  const applyFilters = () => {
    setFilterName(draftFilterName.trim());
    setFilterType(draftFilterType);
    setFilterFaction(draftFilterFaction);
    setFilterTerrain(draftFilterTerrain);
    setFilterSourceSet(draftFilterSourceSet);
    setFilterPoints(draftFilterPoints.trim());
    setFilterTags(draftFilterTags);
  };
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center p-4 sm:p-8">
      <header className="w-full max-w-7xl mb-8 text-center"> {/* Increased max-w for card viewer */}
        <h1 className="text-4xl sm:text-5xl font-bold text-sky-600">カードビューワ</h1>
        <button
          onClick={onExit}
          className="mt-6 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out"
          aria-label="メインメニューへ戻る"
        >
          メインメニューへ
        </button>
      </header>
      <main className="w-full max-w-7xl bg-white shadow-2xl rounded-lg p-6 sm:p-10"> {/* Increased max-w */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 shadow">
          <h3 className="text-lg font-semibold text-sky-700 mb-3">絞り込み</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 items-end">
            <FilterInput label="カード名">
              <input
                type="text"
                placeholder="例: ガンダム"
                className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm"
                value={draftFilterName}
                onChange={e => setDraftFilterName(e.target.value)}
              />
            </FilterInput>
            <FilterInput label="種別">
              <select
                className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
                value={draftFilterType}
                onChange={e => setDraftFilterType(e.target.value as CardTypeFilter)}
              >
                <option value="ALL">すべて</option>
                <option value="M">M (メカニック)</option>
                <option value="C">C (カウンター)</option>
              </select>
            </FilterInput>
            <FilterInput label="所属">
              <select
                className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
                value={draftFilterFaction}
                onChange={e => setDraftFilterFaction(e.target.value)}
              >
                {uniqueFactions.map(faction => (
                  <option key={faction} value={faction}>{faction === 'ALL' ? 'すべての所属' : faction}</option>
                ))}
              </select>
            </FilterInput>
            <FilterInput label="地形">
              <select
                className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
                value={draftFilterTerrain}
                onChange={e => setDraftFilterTerrain(e.target.value)}
              >
                <option value="">すべての地形</option>
                {terrainOptions.map(terrain => (
                  <option key={terrain} value={terrain}>{terrain}</option>
                ))}
              </select>
            </FilterInput>
            <FilterInput label="収録">
              <select
                className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
                value={draftFilterSourceSet}
                onChange={e => setDraftFilterSourceSet(e.target.value)}
              >
                {sourceSetOptions.map(sourceSet => (
                  <option key={sourceSet} value={sourceSet}>{sourceSet === ALL_SOURCE_SET_FILTER ? 'すべての収録' : sourceSet}</option>
                ))}
              </select>
            </FilterInput>
            <FilterInput label="ポイント(P)">
              <input
                type="text"
                placeholder="例: 8 または 7-9"
                className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm"
                value={draftFilterPoints}
                onChange={e => setDraftFilterPoints(e.target.value)}
              />
            </FilterInput>
            <FilterInput label="タグ">
              <select
                className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
                value={draftFilterTags}
                onChange={e => setDraftFilterTags(e.target.value)}
              >
                <option value="">すべてのタグ</option>
                {tagOptions.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </FilterInput>
            <button
              type="button"
              onClick={applyFilters}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors text-sm h-10"
              aria-label="絞り込み条件で検索"
            >
              検索
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors text-sm h-10"
              aria-label="絞り込みをクリア"
            >
              クリア
            </button>
          </div>
        </div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-600">
          <div>
            表示件数: <span className="font-semibold tabular-nums text-slate-800">{visibleCards.length}</span>
            {' / '}
            絞り込み結果: <span className="font-semibold tabular-nums text-slate-800">{filteredAndSortedCards.length}</span>
            {' / '}
            全件: <span className="font-semibold tabular-nums text-slate-800">{allCards.length}</span>
          </div>
          {isDisplayLimited && (
            <div className="font-medium text-amber-700">
              100件まで表示しています。絞り込み条件を追加してください。
            </div>
          )}
          {isCatalogLoading && (
            <div className="font-medium text-sky-700">
              追加カードカタログを読み込み中です。
            </div>
          )}
          {catalogLoadError && (
            <div className="font-medium text-red-700">
              {catalogLoadError}
            </div>
          )}
        </div>
        <CardDisplayTable 
          cards={visibleCards}
          onSortRequest={requestSort} 
          sortConfig={sortConfig}
          onCardImageClick={openLargeCardModal} 
          showSourceSet
        />
      </main>
      <footer className="w-full max-w-7xl mt-12 text-center text-slate-500 text-sm"> {/* Increased max-w */}
        <p>&copy; {new Date().getFullYear()} Mobile Powers App.</p>
      </footer>

      {isLargeCardModalOpen && cardForLargeModal && cardForLargeModal.imageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 transition-opacity duration-300 ease-in-out"
          onClick={closeLargeCardModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="largeCardViewerModalTitle"
        >
          <div
            className={`relative max-w-full max-h-full flex items-center justify-center ${isKiraCard(cardForLargeModal) ? 'kira-border-animated rounded-lg' : ''}`}
            onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking on image itself
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
            <h2 id="largeCardViewerModalTitle" className="sr-only">
              {`${cardForLargeModal.cardName} の拡大表示`}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
};
