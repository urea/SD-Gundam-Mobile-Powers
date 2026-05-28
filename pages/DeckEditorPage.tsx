
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Card, SavedDeck } from '../types';
import { STARTER_VER_1_SOURCE_SET, gamePlayableStarterVer1Cards } from '../data/carddas20Cards';
import { CardDisplayTable, type DisplayCard, type SortableCardKey } from '../components/CardDisplayTable';
import { createFullCardInstancePool, generateCompressedDeckCode, parseCompressedDeckCode } from '../utils/deckCodeUtils';
import { compareCardsByIdentity, getCardBaseId, getCardInstanceId, isSameCardInstance } from '../utils/cardIdentity';
import { getSavedDecks, saveDeck, deleteDeck } from '../utils/localStorageUtils';
import { cpuDeckPresets, PredefinedDeck } from '../data/cpuDecks'; // Import predefined decks

interface DeckEditorPageProps {
  onExit: () => void;
}

const MIN_DECK_SIZE = 55;
const MAX_DECK_SIZE = 100;
const DEFAULT_SOURCE_SET = STARTER_VER_1_SOURCE_SET;

type CardTypeFilter = 'ALL' | 'M' | 'C';

const FilterInput: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-slate-600 mb-1">{label}</label>
    {children}
  </div>
);

const isKiraCard = (card: Card): boolean => {
  return card.tags.includes("キラ");
};


export const DeckEditorPage: React.FC<DeckEditorPageProps> = ({ onExit }) => {
  const [allBaseCards, setAllBaseCards] = useState<Card[]>([]);
  const [fullCardInstancePool, setFullCardInstancePool] = useState<Card[]>([]);
  const [shortIdToBaseCardMap, setShortIdToBaseCardMap] = useState<Map<number, string>>(new Map());
  
  const [currentDeck, setCurrentDeck] = useState<Card[]>([]);
  const [currentDeckName, setCurrentDeckName] = useState('');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  
  const [deckCodeInput, setDeckCodeInput] = useState('');
  const [generatedDeckCodeOutput, setGeneratedDeckCodeOutput] = useState('');
  const [deckCodeMessage, setDeckCodeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeckCodeCopied, setIsDeckCodeCopied] = useState(false);
  const deckCodeTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [selectedPredefinedDeckId, setSelectedPredefinedDeckId] = useState<string>('');


  const [filterName, setFilterName] = useState('');
  const [draftFilterName, setDraftFilterName] = useState('');
  const [filterType, setFilterType] = useState<CardTypeFilter>('ALL');
  const [draftFilterType, setDraftFilterType] = useState<CardTypeFilter>('ALL');
  const [uniqueFactions, setUniqueFactions] = useState<string[]>(['ALL']);
  const [filterFaction, setFilterFaction] = useState('ALL');
  const [draftFilterFaction, setDraftFilterFaction] = useState('ALL');
  const [filterTerrain, setFilterTerrain] = useState('');
  const [draftFilterTerrain, setDraftFilterTerrain] = useState('');
  const [filterSourceSet, setFilterSourceSet] = useState('ALL');
  const [draftFilterSourceSet, setDraftFilterSourceSet] = useState('ALL');
  const [filterPoints, setFilterPoints] = useState('');
  const [draftFilterPoints, setDraftFilterPoints] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [draftFilterTags, setDraftFilterTags] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableCardKey; direction: 'ascending' | 'descending' } | null>({ key: 'cardNumber', direction: 'ascending' });

  // Modal state for large card view
  const [isLargeCardModalOpen, setIsLargeCardModalOpen] = useState(false);
  const [cardForLargeModal, setCardForLargeModal] = useState<DisplayCard | null>(null);


  useEffect(() => {
    const gamePlayableBaseCards = gamePlayableStarterVer1Cards.map(card => ({ ...card }));
    setAllBaseCards(gamePlayableBaseCards);

    if (gamePlayableBaseCards.length > 0) {
      const instancePool = createFullCardInstancePool(gamePlayableBaseCards);
      setFullCardInstancePool(instancePool);

      const sortedBaseCardNumbers = Array.from(new Set(gamePlayableBaseCards.map(getCardBaseId))).sort();
      const sToB = new Map<number, string>();
      sortedBaseCardNumbers.forEach((num, idx) => {
        sToB.set(idx, num);
      });
      setShortIdToBaseCardMap(sToB);

      const factions = new Set<string>();
      gamePlayableBaseCards.forEach(card => {
        if (card.factionAffiliation) {
          card.factionAffiliation.split(',').map(f => f.trim()).filter(Boolean).forEach(f => factions.add(f));
        }
      });
      setUniqueFactions(['ALL', ...Array.from(factions).sort()]);
    }
    setSavedDecks(getSavedDecks());
  }, []);

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

  const sourceSetOptions = useMemo(() => {
    const sourceSets = new Set<string>();
    allBaseCards.forEach(card => {
      sourceSets.add(card.sourceSet || DEFAULT_SOURCE_SET);
    });
    return ['ALL', ...Array.from(sourceSets).sort((a, b) => a.localeCompare(b, 'ja'))];
  }, [allBaseCards]);

  const availableCardsForDisplay: DisplayCard[] = useMemo(() => {
    let filtered = allBaseCards.map(card => ({
      ...card,
      displayTerrain: card.type === 'M' ? card.terrainTypeMCards : card.battlefieldTerrain,
      pointsNum: card.type === 'M' && card.points ? parseInt(card.points) : -1,
      sourceSet: card.sourceSet || DEFAULT_SOURCE_SET,
    }));

    if (filterName) {
      const nameLower = filterName.toLowerCase();
      filtered = filtered.filter(card => card.cardName.toLowerCase().includes(nameLower) || card.cardNameOmm.toLowerCase().includes(nameLower));
    }
    if (filterType !== 'ALL') filtered = filtered.filter(card => card.type === filterType);
    if (filterFaction !== 'ALL') filtered = filtered.filter(card => card.factionAffiliation.includes(filterFaction));
    if (filterTerrain) {
        const terrainKeywords = filterTerrain.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        if (terrainKeywords.length > 0) {
            filtered = filtered.filter(card => terrainKeywords.some(keyword => card.displayTerrain.toLowerCase().includes(keyword)));
        }
    }
    if (filterSourceSet !== 'ALL') {
      filtered = filtered.filter(card => card.sourceSet === filterSourceSet);
    }
    if (filterPoints) {
        filtered = filtered.filter(card => {
            if (card.type !== 'M' || card.pointsNum < 0) return false;
            const point = card.pointsNum;
            if (filterPoints.includes('-')) {
                const [minStr, maxStr] = filterPoints.split('-');
                const min = parseInt(minStr.trim()); const max = parseInt(maxStr.trim());
                let match = true;
                if (!isNaN(min)) match = match && point >= min;
                if (!isNaN(max)) match = match && point <= max;
                return match && (isNaN(min) || isNaN(max) ? !isNaN(min) || !isNaN(max) : true);
            } else {
                const targetPoint = parseInt(filterPoints.trim());
                return !isNaN(targetPoint) && point === targetPoint;
            }
        });
    }
    if (filterTags) {
        const tagKeywords = filterTags.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        if (tagKeywords.length > 0) {
            filtered = filtered.filter(card => tagKeywords.some(keyword => card.tags.toLowerCase().includes(keyword)));
        }
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let valA: string | number = a[sortConfig.key as keyof DisplayCard] as string | number;
        let valB: string | number = b[sortConfig.key as keyof DisplayCard] as string | number;
        if (typeof valA === 'string' && typeof valB === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        const identityDiff = compareCardsByIdentity(a, b);
        if (identityDiff !== 0) return identityDiff;
        return 0;
      });
    }
    return filtered;
  }, [allBaseCards, filterName, filterType, filterFaction, filterTerrain, filterSourceSet, filterPoints, filterTags, sortConfig]);

  const requestSort = useCallback((key: SortableCardKey) => {
    setSortConfig(prevConfig => {
      let direction: 'ascending' | 'descending' = 'ascending';
      if (prevConfig && prevConfig.key === key && prevConfig.direction === 'ascending') {
        direction = 'descending';
      }
      return { key, direction };
    });
  }, []);
  
  const clearFilters = () => {
    setFilterName('');
    setDraftFilterName('');
    setFilterType('ALL');
    setDraftFilterType('ALL');
    setFilterFaction('ALL');
    setDraftFilterFaction('ALL');
    setFilterTerrain('');
    setDraftFilterTerrain('');
    setFilterSourceSet('ALL');
    setDraftFilterSourceSet('ALL');
    setFilterPoints('');
    setDraftFilterPoints('');
    setFilterTags('');
    setDraftFilterTags('');
  };

  const applyFilters = () => {
    setFilterName(draftFilterName.trim());
    setFilterType(draftFilterType);
    setFilterFaction(draftFilterFaction);
    setFilterTerrain(draftFilterTerrain.trim());
    setFilterSourceSet(draftFilterSourceSet);
    setFilterPoints(draftFilterPoints.trim());
    setFilterTags(draftFilterTags.trim());
  };

  const handleAddToDeck = (baseCardToAdd: Card) => {
    if (currentDeck.length >= MAX_DECK_SIZE) {
      setDeckCodeMessage({ type: 'error', text: `デッキは${MAX_DECK_SIZE}枚までです。`});
      return;
    }
    const baseIdOfCardToAdd = getCardBaseId(baseCardToAdd);
    const instancesInDeck = currentDeck.filter(c => getCardBaseId(c) === baseIdOfCardToAdd);
    if (instancesInDeck.length >= 3) {
      setDeckCodeMessage({ type: 'error', text: `${baseCardToAdd.cardName} は既に3枚デッキに入っています。` });
      return;
    }
    const nextInstanceNumber = instancesInDeck.length + 1;
    const targetInstanceCardNumber = `${baseIdOfCardToAdd}#${nextInstanceNumber}`;
    const instanceToAdd = fullCardInstancePool.find(inst => getCardInstanceId(inst) === targetInstanceCardNumber);
    if (instanceToAdd) {
      setCurrentDeck(prev => [...prev, instanceToAdd].sort(compareCardsByIdentity));
      setDeckCodeMessage(null);
    } else {
      setDeckCodeMessage({ type: 'error', text: `${baseCardToAdd.cardName} のインスタンス ${targetInstanceCardNumber} がプールに見つかりません。` });
      console.error(`[DeckEditor] Instance ${targetInstanceCardNumber} not found for ${baseIdOfCardToAdd}. Pool size: ${fullCardInstancePool.length}`);
    }
  };

  const handleDecrementFromDeck = (baseCardToRemove: Card) => {
    const baseIdToRemove = getCardBaseId(baseCardToRemove);
    const instancesInDeck = currentDeck.filter(c => getCardBaseId(c) === baseIdToRemove);
    if (instancesInDeck.length === 0) {
      setDeckCodeMessage({ type: 'error', text: `${baseCardToRemove.cardName} はデッキにありません。` });
      return;
    }
    const instanceToRemove = instancesInDeck.sort((a,b) => {
        const numA = parseInt((a.instanceId || '').split('#')[1] || '0');
        const numB = parseInt((b.instanceId || '').split('#')[1] || '0');
        return numB - numA; 
    })[0];

    if (instanceToRemove) {
        setCurrentDeck(prev => prev.filter(c => !isSameCardInstance(c, instanceToRemove)));
        setDeckCodeMessage(null);
    } else {
        console.error(`[DeckEditor] Could not determine which instance of ${baseIdToRemove} to remove.`);
    }
  };

  const handleRemoveSpecificInstance = (instanceCardToRemove: Card) => {
    setCurrentDeck(prevDeck => prevDeck.filter(card => !isSameCardInstance(card, instanceCardToRemove)));
    setDeckCodeMessage({ type: 'success', text: `${instanceCardToRemove.cardNameOmm || instanceCardToRemove.cardName} (${instanceCardToRemove.cardNumber}) をデッキから削除しました。` });
  };

  const handleGenerateDeckCode = () => {
    if (currentDeck.length < MIN_DECK_SIZE || currentDeck.length > MAX_DECK_SIZE) {
      setDeckCodeMessage({ type: 'error', text: `デッキは${MIN_DECK_SIZE}枚から${MAX_DECK_SIZE}枚の範囲でなければコードを生成できません。現在 ${currentDeck.length}枚。` });
      setGeneratedDeckCodeOutput('');
      return;
    }
    const code = generateCompressedDeckCode(currentDeck);
    setGeneratedDeckCodeOutput(code);
    setDeckCodeMessage({ type: 'success', text: 'デッキコードを生成しました！' });
    setIsDeckCodeCopied(false);
  };

  const handleLoadDeckCodeInput = () => {
    if (!deckCodeInput.trim()) {
      setDeckCodeMessage({ type: 'error', text: '読み込むデッキコードを入力してください。' });
      return;
    }
    const parsedDeck = parseCompressedDeckCode(deckCodeInput.trim(), shortIdToBaseCardMap, fullCardInstancePool);
    if (parsedDeck) {
      setCurrentDeck(parsedDeck.sort(compareCardsByIdentity));
      setDeckCodeMessage({ type: 'success', text: 'デッキコードを正常に読み込みました。' });
      setDeckCodeInput('');
      setGeneratedDeckCodeOutput(deckCodeInput.trim());
      setCurrentDeckName(''); // Loaded by code, clear name
      setEditingDeckId(null); // Not editing a saved deck
    } else {
      setDeckCodeMessage({ type: 'error', text: '無効なデッキコード、または読み込みに失敗しました。' });
    }
  };

  const handleNewDeck = () => {
    setCurrentDeck([]);
    setCurrentDeckName('');
    setEditingDeckId(null);
    setGeneratedDeckCodeOutput('');
    setDeckCodeInput('');
    setDeckCodeMessage({ type: 'success', text: 'デッキをクリアしました。' });
  };

  const handleCopyDeckCode = () => {
    if (deckCodeTextareaRef.current) {
        deckCodeTextareaRef.current.select();
        try {
          document.execCommand('copy');
          setIsDeckCodeCopied(true);
          setTimeout(() => setIsDeckCodeCopied(false), 2000);
        } catch (err) {
          console.error('[DeckEditor] Failed to copy deck code using execCommand:', err);
          setDeckCodeMessage({ type: 'error', text: 'コードのコピーに失敗しました。手動でコピーしてください。'});
        }
    }
  };

  const handleSaveCurrentDeck = () => {
    if (!currentDeckName.trim()) {
      setDeckCodeMessage({ type: 'error', text: 'デッキ名を入力してください。' });
      return;
    }
    if (currentDeck.length < MIN_DECK_SIZE || currentDeck.length > MAX_DECK_SIZE) {
      setDeckCodeMessage({ type: 'error', text: `デッキは${MIN_DECK_SIZE}枚から${MAX_DECK_SIZE}枚の範囲でなければ保存できません。` });
      return;
    }
    const code = generateCompressedDeckCode(currentDeck);
    const deckToSave = {
      name: currentDeckName.trim(),
      code: code,
      cardCount: currentDeck.length,
      id: editingDeckId || undefined, // Pass ID if updating
    };
    const saved = saveDeck(deckToSave);
    if (saved) {
      setSavedDecks(getSavedDecks()); // Refresh list
      setEditingDeckId(saved.id); // Continue editing the same saved deck
      setGeneratedDeckCodeOutput(code);
      setDeckCodeMessage({ type: 'success', text: `デッキ「${saved.name}」を${deckToSave.id ? '更新' : '保存'}しました。` });
    } else {
      setDeckCodeMessage({ type: 'error', text: 'デッキの保存に失敗しました。' });
    }
  };

  const handleLoadUserDeck = (savedDeck: SavedDeck) => {
    const parsedDeck = parseCompressedDeckCode(savedDeck.code, shortIdToBaseCardMap, fullCardInstancePool);
    if (parsedDeck) {
      setCurrentDeck(parsedDeck.sort(compareCardsByIdentity));
      setCurrentDeckName(savedDeck.name);
      setEditingDeckId(savedDeck.id);
      setGeneratedDeckCodeOutput(savedDeck.code);
      setDeckCodeInput('');
      setDeckCodeMessage({ type: 'success', text: `デッキ「${savedDeck.name}」を読み込みました。` });
    } else {
      setDeckCodeMessage({ type: 'error', text: `デッキ「${savedDeck.name}」の読み込みに失敗しました。コードが不正かもしれません。`});
    }
  };

  const handleRenameUserDeck = (deckId: string) => {
    const deckToRename = savedDecks.find(d => d.id === deckId);
    if (!deckToRename) return;

    const newName = prompt(`新しいデッキ名を入力してください (現在の名前: ${deckToRename.name}):`, deckToRename.name);
    if (newName && newName.trim() !== "" && newName.trim() !== deckToRename.name) {
      const updatedDeckData = { ...deckToRename, name: newName.trim() };
      if (saveDeck(updatedDeckData)) {
        setSavedDecks(getSavedDecks());
        setDeckCodeMessage({ type: 'success', text: `デッキ名を「${newName.trim()}」に変更しました。` });
        if (editingDeckId === deckId) {
          setCurrentDeckName(newName.trim());
        }
      } else {
        setDeckCodeMessage({ type: 'error', text: 'デッキ名の変更に失敗しました。' });
      }
    }
  };

  const handleDeleteUserDeck = (deckId: string, deckName: string) => {
    if (window.confirm(`本当にデッキ「${deckName}」を削除しますか？この操作は元に戻せません。`)) {
      if (deleteDeck(deckId)) {
        setSavedDecks(getSavedDecks());
        setDeckCodeMessage({ type: 'success', text: `デッキ「${deckName}」を削除しました。` });
        if (editingDeckId === deckId) {
          handleNewDeck(); // Clear editor if deleted deck was being edited
        }
      } else {
        setDeckCodeMessage({ type: 'error', text: 'デッキの削除に失敗しました。' });
      }
    }
  };
  
  const handleLoadPredefinedDeck = () => {
    if (!selectedPredefinedDeckId) {
        setDeckCodeMessage({ type: 'error', text: '構築済みデッキを選択してください。'});
        return;
    }
    const predefinedDeck = cpuDeckPresets.find(p => p.id === selectedPredefinedDeckId);
    if (predefinedDeck) {
        const parsedDeck = parseCompressedDeckCode(predefinedDeck.code, shortIdToBaseCardMap, fullCardInstancePool);
        if (parsedDeck) {
            setCurrentDeck(parsedDeck.sort(compareCardsByIdentity));
            setCurrentDeckName(predefinedDeck.name + " (コピー)"); // Indicate it's a copy
            setEditingDeckId(null); // Not editing a user's saved deck
            setGeneratedDeckCodeOutput(predefinedDeck.code);
            setDeckCodeInput('');
            setDeckCodeMessage({ type: 'success', text: `構築済みデッキ「${predefinedDeck.name}」を読み込みました。`});
        } else {
            setDeckCodeMessage({ type: 'error', text: `構築済みデッキ「${predefinedDeck.name}」の読み込みに失敗しました。コードが不正かもしれません。`});
        }
    }
  };


  const totalCount = currentDeck.length;
  const mCardCount = currentDeck.filter(c => c.type === 'M').length;
  const cCardCount = currentDeck.filter(c => c.type === 'C').length;

  const renderDeckCardOperations = (cardFromTable: DisplayCard) => {
    const baseCardId = getCardBaseId(cardFromTable);
    const instancesInDeckCount = currentDeck.filter(c => getCardBaseId(c) === baseCardId).length;
    const deckIsAtMaxSize = totalCount >= MAX_DECK_SIZE;
    const canIncrement = instancesInDeckCount < 3 && !deckIsAtMaxSize;
    const canDecrement = instancesInDeckCount > 0;

    const buttonClass = "px-2 py-0.5 text-sm font-semibold rounded shadow transition-colors";
    const enabledClass = "bg-sky-500 hover:bg-sky-600 text-white";
    const disabledClass = "bg-slate-300 text-slate-500 cursor-not-allowed";

    let incrementTitle = "追加";
    if (!canIncrement) {
        if (deckIsAtMaxSize) {
            incrementTitle = `デッキは${MAX_DECK_SIZE}枚までです`;
        } else if (instancesInDeckCount >= 3) {
            incrementTitle = `${cardFromTable.cardName}は既に3枚あります`;
        }
    }

    return (
      <div className="flex flex-col items-center space-y-1">
        <button
          onClick={() => handleAddToDeck(cardFromTable)}
          disabled={!canIncrement}
          className={`${buttonClass} ${canIncrement ? enabledClass : disabledClass}`}
          aria-label={`${cardFromTable.cardName}をデッキに1枚追加`}
          title={incrementTitle}
        >
          ▲
        </button>
        <span className="text-xs font-medium text-slate-700 tabular-nums" aria-live="polite" aria-atomic="true">
          {instancesInDeckCount} / 3
        </span>
        <button
          onClick={() => handleDecrementFromDeck(cardFromTable)}
          disabled={!canDecrement}
          className={`${buttonClass} ${canDecrement ? enabledClass : disabledClass}`}
          aria-label={`${cardFromTable.cardName}をデッキから1枚削除`}
          title={!canDecrement ? `${cardFromTable.cardName}はデッキにありません` : "削除"}
        >
          ▼
        </button>
      </div>
    );
  };

  const SectionTitle: React.FC<{children: React.ReactNode}> = ({children}) => (
    <h2 className="text-xl font-semibold text-sky-700 mb-2 border-b pb-1.5">{children}</h2>
  );

  const ActionButton: React.FC<{onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean, title?: string}> = 
    ({onClick, children, className = "bg-sky-500 hover:bg-sky-600", disabled=false, title}) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        title={title}
        className={`py-1.5 px-3 text-white rounded shadow text-xs whitespace-nowrap ${disabled ? "bg-slate-400 hover:bg-slate-400 cursor-not-allowed" : className}`}
    >
        {children}
    </button>
  );


  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col p-2 sm:p-4">
      <header className="w-full max-w-screen-2xl mx-auto mb-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-sky-600">デッキ編成</h1>
            <button
            onClick={onExit}
            className="mt-2 sm:mt-0 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
            aria-label="メインメニューへ戻る"
            >
            メインメニューへ
            </button>
        </div>
      </header>

      <main className="w-full max-w-screen-2xl mx-auto flex-grow grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Left Column: Deck Management */}
        <div className="col-span-1 bg-white shadow-xl rounded-lg p-3 sm:p-4 flex flex-col max-h-[calc(100vh-120px)] space-y-3">
          
          <div>
            <SectionTitle>現在のデッキ</SectionTitle>
            <input
              type="text"
              placeholder="デッキ名を入力"
              value={currentDeckName}
              onChange={e => setCurrentDeckName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded shadow-sm text-sm mb-2"
              aria-label="現在のデッキ名"
            />
            <ActionButton
              onClick={handleSaveCurrentDeck}
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={!currentDeckName.trim() || currentDeck.length < MIN_DECK_SIZE || currentDeck.length > MAX_DECK_SIZE}
              title={!currentDeckName.trim() ? "デッキ名が必要です" : (currentDeck.length < MIN_DECK_SIZE || currentDeck.length > MAX_DECK_SIZE) ? `デッキは${MIN_DECK_SIZE}-${MAX_DECK_SIZE}枚にしてください` : (editingDeckId ? "現在のデッキを更新" : "新しいデッキとして保存")}
            >
              {editingDeckId ? `デッキ「${savedDecks.find(d=>d.id===editingDeckId)?.name || currentDeckName}」を更新` : "現在のデッキを保存"}
            </ActionButton>
            
            <div className={`flex justify-between items-center p-1.5 mt-2 rounded-md text-xs ${totalCount >= MIN_DECK_SIZE && totalCount <= MAX_DECK_SIZE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <span className="font-semibold">総枚数:</span>
              <span>{totalCount}枚 ({MIN_DECK_SIZE}-{MAX_DECK_SIZE}枚)</span>
            </div>
            <div className="flex justify-between p-1.5 rounded-md bg-slate-100 text-xs">
              <span>Mカード: {mCardCount}</span>
              <span>Cカード: {cCardCount}</span>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50 custom-scrollbar min-h-[150px]">
            <h3 className="text-sm font-semibold text-slate-600 mb-1.5 sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 pb-1 border-b">デッキ内容 ({currentDeck.length}枚)</h3>
            {currentDeck.length === 0 ? (
              <p className="text-slate-500 italic text-center py-3 text-xs">デッキにカードがありません。</p>
            ) : (
              <ul className="space-y-0.5">
                {currentDeck.map((card, index) => (
                  <li key={`${getCardInstanceId(card)}-${index}`} className="flex justify-between items-center p-1 bg-white rounded shadow-sm text-[11px] hover:bg-slate-100">
                    <span className="truncate" title={`${card.cardName} (${card.cardNumber})`}>
                      {card.cardNameOmm || card.cardName} <span className="text-slate-400">({card.cardNumber})</span>
                      {isKiraCard(card) && <span className="ml-1 text-xs font-bold" style={{background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>★</span>}
                    </span>
                    <button
                      onClick={() => handleRemoveSpecificInstance(card)} 
                      className="ml-1 text-red-500 hover:text-red-700 px-1 rounded text-sm"
                      aria-label={`${card.cardName} (${card.cardNumber}) をデッキから削除`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <SectionTitle>デッキ操作</SectionTitle>
             <div className="space-y-2">
                <ActionButton onClick={handleNewDeck} className="w-full bg-red-500 hover:bg-red-600">新規デッキ (クリア)</ActionButton>
                <div className="flex space-x-1">
                  <input
                    type="text"
                    placeholder="デッキコードを読込"
                    value={deckCodeInput}
                    onChange={e => setDeckCodeInput(e.target.value)}
                    className="flex-grow p-1.5 border border-slate-300 rounded shadow-sm text-xs"
                    aria-label="読み込むデッキコード"
                  />
                  <ActionButton onClick={handleLoadDeckCodeInput} className="bg-blue-500 hover:bg-blue-600">読込</ActionButton>
                </div>
                <div className="flex space-x-1">
                  <textarea
                    ref={deckCodeTextareaRef}
                    readOnly
                    value={generatedDeckCodeOutput}
                    placeholder="デッキコードがここに表示されます"
                    className="flex-grow p-1.5 border border-slate-300 rounded shadow-sm text-[10px] resize-none h-14 bg-slate-50 custom-scrollbar"
                    aria-label="生成されたデッキコード"
                  />
                  <ActionButton onClick={handleGenerateDeckCode} className="bg-emerald-500 hover:bg-emerald-600 self-start">生成</ActionButton>
                  <ActionButton 
                    onClick={handleCopyDeckCode} 
                    disabled={!generatedDeckCodeOutput}
                    className="bg-purple-500 hover:bg-purple-600 self-start"
                   >
                    {isDeckCodeCopied ? 'OK!' : 'コピー'}
                   </ActionButton>
                </div>
                 {deckCodeMessage && (
                  <p className={`text-[10px] p-1 rounded ${deckCodeMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {deckCodeMessage.text}
                  </p>
                )}
            </div>
          </div>
          
          <div className="mt-2 flex-grow flex flex-col min-h-[200px]">
            <SectionTitle>保存済みデッキ</SectionTitle>
            <div className="flex-grow overflow-y-auto border p-1.5 rounded bg-slate-50 custom-scrollbar space-y-1.5">
                {savedDecks.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-3 text-xs">保存されたデッキはありません。</p>
                ) : (
                    savedDecks.map(deck => (
                        <div key={deck.id} className="p-1.5 bg-white rounded shadow-sm border">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-sky-700 truncate pr-1" title={deck.name}>{deck.name} ({deck.cardCount}枚)</span>
                                <div className="flex space-x-1 flex-shrink-0">
                                    <ActionButton onClick={() => handleLoadUserDeck(deck)} className="bg-sky-500 hover:bg-sky-600">読込</ActionButton>
                                    <ActionButton onClick={() => handleRenameUserDeck(deck.id)} className="bg-yellow-500 hover:bg-yellow-600">名前変更</ActionButton>
                                    <ActionButton onClick={() => handleDeleteUserDeck(deck.id, deck.name)} className="bg-red-500 hover:bg-red-600">削除</ActionButton>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500">更新: {new Date(deck.updatedAt).toLocaleString('ja-JP', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}</p>
                            {/* <p className="text-[10px] text-slate-400 truncate" title={deck.code}>コード: {deck.code}</p> */}
                        </div>
                    ))
                )}
            </div>
          </div>
          
          <div className="mt-2">
            <SectionTitle>構築済みデッキ</SectionTitle>
            <div className="flex space-x-1">
                 <select 
                    value={selectedPredefinedDeckId} 
                    onChange={e => setSelectedPredefinedDeckId(e.target.value)}
                    className="flex-grow p-1.5 border border-slate-300 rounded shadow-sm text-xs bg-white"
                    aria-label="構築済みデッキを選択"
                  >
                    <option value="">選択してください...</option>
                    {cpuDeckPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ActionButton onClick={handleLoadPredefinedDeck} disabled={!selectedPredefinedDeckId} className="bg-teal-500 hover:bg-teal-600">読込</ActionButton>
            </div>
          </div>

        </div>

        {/* Right Column: Card List & Filters */}
        <div className="col-span-3 bg-white shadow-xl rounded-lg p-3 sm:p-4 flex flex-col max-h-[calc(100vh-120px)]">
          <h2 className="text-xl font-semibold text-sky-700 mb-3 border-b pb-2">利用可能なカード</h2>
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 items-end">
              <FilterInput label="カード名">
                <input type="text" placeholder="例: ガンダム" className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm" value={draftFilterName} onChange={e => setDraftFilterName(e.target.value)} />
              </FilterInput>
              <FilterInput label="種別">
                <select className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white" value={draftFilterType} onChange={e => setDraftFilterType(e.target.value as CardTypeFilter)}>
                  <option value="ALL">すべて</option> <option value="M">M</option> <option value="C">C</option>
                </select>
              </FilterInput>
              <FilterInput label="所属">
                <select className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white" value={draftFilterFaction} onChange={e => setDraftFilterFaction(e.target.value)}>
                  {uniqueFactions.map(f => <option key={f} value={f}>{f === 'ALL' ? 'すべて' : f}</option>)}
                </select>
              </FilterInput>
              <FilterInput label="地形">
                <input type="text" placeholder="例: 宇,陸" className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm" value={draftFilterTerrain} onChange={e => setDraftFilterTerrain(e.target.value)} />
              </FilterInput>
              <FilterInput label="収録">
                <select className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white" value={draftFilterSourceSet} onChange={e => setDraftFilterSourceSet(e.target.value)}>
                  {sourceSetOptions.map(sourceSet => <option key={sourceSet} value={sourceSet}>{sourceSet === 'ALL' ? 'すべての収録' : sourceSet}</option>)}
                </select>
              </FilterInput>
              <FilterInput label="ポイント(P)">
                <input type="text" placeholder="例: 8 または 7-9" className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm" value={draftFilterPoints} onChange={e => setDraftFilterPoints(e.target.value)} />
              </FilterInput>
              <FilterInput label="タグ">
                <input type="text" placeholder="例: ガンダム系" className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm" value={draftFilterTags} onChange={e => setDraftFilterTags(e.target.value)} />
              </FilterInput>
              <button type="button" onClick={applyFilters} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-3 rounded-md shadow-md transition-colors text-sm h-9 self-end">検索</button>
              <button type="button" onClick={clearFilters} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-3 rounded-md shadow-md transition-colors text-sm h-9 self-end">絞込クリア</button>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar"> 
            <CardDisplayTable 
                cards={availableCardsForDisplay} 
                onSortRequest={requestSort} 
                sortConfig={sortConfig} 
                renderActions={renderDeckCardOperations}
                onCardImageClick={openLargeCardModal}
                showSourceSet
            />
          </div>
        </div>
      </main>
      {isLargeCardModalOpen && cardForLargeModal && cardForLargeModal.imageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 transition-opacity duration-300 ease-in-out"
          onClick={closeLargeCardModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="largeDeckEditorCardModalTitle"
        >
          <div
            className={`relative max-w-full max-h-full flex items-center justify-center ${isKiraCard(cardForLargeModal) ? 'kira-border-animated rounded-lg' : ''}`}
            onClick={(e) => e.stopPropagation()}
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
            <h2 id="largeDeckEditorCardModalTitle" className="sr-only">
              {`${cardForLargeModal.cardName} の拡大表示`}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
};
