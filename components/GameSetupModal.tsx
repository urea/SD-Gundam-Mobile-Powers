import React, { useState, useEffect } from 'react';
import type { PredefinedDeck } from '../data/cpuDecks';

export const RANDOM_PRESET_INTERNAL_ID = "___RANDOM_FROM_PREDEFINED_LIST___"; // Export for MainMenu

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    playerDeckChoice: { code: string } | { presetId: string },
    cpuDeckChoice: { code: string } | { presetId: string }
  ) => void;
  cpuDeckPresets: PredefinedDeck[];
}

export const GameSetupModal: React.FC<GameSetupModalProps> = ({ isOpen, onClose, onSubmit, cpuDeckPresets }) => {
  const hasPresets = cpuDeckPresets.length > 0;

  const [playerDeckOption, setPlayerDeckOption] = useState<'CODE' | 'PRESET'>(hasPresets ? 'PRESET' : 'CODE');
  const [playerDeckCode, setPlayerDeckCode] = useState('');
  const [selectedPlayerPresetId, setSelectedPlayerPresetId] = useState<string>(RANDOM_PRESET_INTERNAL_ID);

  const [cpuDeckOption, setCpuDeckOption] = useState<'CODE' | 'PRESET'>(hasPresets ? 'PRESET' : 'CODE');
  const [cpuDeckCode, setCpuDeckCode] = useState('');
  const [selectedCpuPresetId, setSelectedCpuPresetId] = useState<string>(RANDOM_PRESET_INTERNAL_ID);


  useEffect(() => {
    if (hasPresets) {
      if (![RANDOM_PRESET_INTERNAL_ID, ...cpuDeckPresets.map(p => p.id)].includes(selectedPlayerPresetId)) {
        setSelectedPlayerPresetId(RANDOM_PRESET_INTERNAL_ID);
      }
      if (![RANDOM_PRESET_INTERNAL_ID, ...cpuDeckPresets.map(p => p.id)].includes(selectedCpuPresetId)) {
        setSelectedCpuPresetId(RANDOM_PRESET_INTERNAL_ID);
      }
    } else {
        setSelectedPlayerPresetId(RANDOM_PRESET_INTERNAL_ID); // Will be disabled if no presets
        setSelectedCpuPresetId(RANDOM_PRESET_INTERNAL_ID); // Will be disabled if no presets
        // If no presets, ensure options are set to 'CODE' if they were 'PRESET'
        if (playerDeckOption === 'PRESET') setPlayerDeckOption('CODE');
        if (cpuDeckOption === 'PRESET') setCpuDeckOption('CODE');
    }
  }, [cpuDeckPresets, selectedPlayerPresetId, selectedCpuPresetId, playerDeckOption, cpuDeckOption, hasPresets]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalPlayerDeckChoice: { code: string } | { presetId: string };
    if (playerDeckOption === 'CODE') {
      finalPlayerDeckChoice = { code: playerDeckCode };
    } else { // PRESET
      finalPlayerDeckChoice = { presetId: selectedPlayerPresetId };
    }

    let finalCpuDeckChoice: { code: string } | { presetId: string };
    if (cpuDeckOption === 'CODE') {
      finalCpuDeckChoice = { code: cpuDeckCode };
    } else { // PRESET
      finalCpuDeckChoice = { presetId: selectedCpuPresetId };
    }
    onSubmit(finalPlayerDeckChoice, finalCpuDeckChoice);
  };

  const isValidDeckCode = (code: string): boolean => {
    return code.trim() !== '';
  };
  
  const isSubmitDisabled = 
    (playerDeckOption === 'CODE' && !isValidDeckCode(playerDeckCode)) ||
    (cpuDeckOption === 'CODE' && !isValidDeckCode(cpuDeckCode));

  return (
    <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out" role="dialog" aria-modal="true" aria-labelledby="gameSetupModalTitle">
      <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-lg transform transition-all duration-300 ease-in-out">
        <form onSubmit={handleSubmit}>
          <h2 id="gameSetupModalTitle" className="text-2xl sm:text-3xl font-bold text-sky-700 mb-6 text-center">ゲーム設定</h2>

          {/* Player Deck Setup */}
          <fieldset className="mb-6">
            <legend className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">プレイヤーデッキ</legend>
            <div className="space-y-3">
              <div>
                <input
                  type="radio"
                  id="playerPresetDeck"
                  name="playerDeckOption"
                  value="PRESET"
                  checked={playerDeckOption === 'PRESET'}
                  onChange={() => setPlayerDeckOption('PRESET')}
                  className="mr-2 h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                  disabled={!hasPresets}
                />
                <label htmlFor="playerPresetDeck" className={`text-slate-700 ${!hasPresets ? 'text-slate-400' : ''}`}>構築済みデッキ選択</label>
                {playerDeckOption === 'PRESET' && (
                  <select
                    value={selectedPlayerPresetId}
                    onChange={(e) => setSelectedPlayerPresetId(e.target.value)}
                    className="mt-2 w-full p-2.5 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
                    aria-label="プレイヤーの構築済みデッキ選択"
                    disabled={!hasPresets}
                  >
                    <option value={RANDOM_PRESET_INTERNAL_ID}>構築済みデッキからランダム選択</option>
                    {cpuDeckPresets.map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <input
                  type="radio"
                  id="playerDeckCode"
                  name="playerDeckOption"
                  value="CODE"
                  checked={playerDeckOption === 'CODE'}
                  onChange={() => setPlayerDeckOption('CODE')}
                  className="mr-2 h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                />
                <label htmlFor="playerDeckCode" className="text-slate-700">デッキコードを使用</label>
                {playerDeckOption === 'CODE' && (
                  <textarea
                    value={playerDeckCode}
                    onChange={(e) => setPlayerDeckCode(e.target.value)}
                    placeholder="デッキコードを入力..."
                    rows={3}
                    className="mt-2 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm custom-scrollbar"
                    aria-label="プレイヤーのデッキコード入力"
                  />
                )}
              </div>
            </div>
          </fieldset>

          {/* CPU Deck Setup */}
          <fieldset className="mb-8">
            <legend className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">CPUデッキ</legend>
            <div className="space-y-3">
               <div>
                <input
                  type="radio"
                  id="cpuPresetDeck"
                  name="cpuDeckOption"
                  value="PRESET"
                  checked={cpuDeckOption === 'PRESET'}
                  onChange={() => setCpuDeckOption('PRESET')}
                  className="mr-2 h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                  disabled={!hasPresets}
                />
                <label htmlFor="cpuPresetDeck" className={`text-slate-700 ${!hasPresets ? 'text-slate-400' : ''}`}>構築済みデッキ選択</label>
                {cpuDeckOption === 'PRESET' && (
                  <select
                    value={selectedCpuPresetId}
                    onChange={(e) => setSelectedCpuPresetId(e.target.value)}
                    className="mt-2 w-full p-2.5 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
                    aria-label="CPUの構築済みデッキ選択"
                    disabled={!hasPresets}
                  >
                    <option value={RANDOM_PRESET_INTERNAL_ID}>構築済みデッキからランダム選択</option>
                    {cpuDeckPresets.map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <input
                  type="radio"
                  id="cpuDeckCode"
                  name="cpuDeckOption"
                  value="CODE"
                  checked={cpuDeckOption === 'CODE'}
                  onChange={() => setCpuDeckOption('CODE')}
                  className="mr-2 h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                />
                <label htmlFor="cpuDeckCode" className="text-slate-700">デッキコードを使用</label>
                {cpuDeckOption === 'CODE' && (
                  <textarea
                    value={cpuDeckCode}
                    onChange={(e) => setCpuDeckCode(e.target.value)}
                    placeholder="CPUのデッキコードを入力..."
                    rows={3}
                    className="mt-2 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm custom-scrollbar"
                    aria-label="CPUのデッキコード入力"
                  />
                )}
              </div>
            </div>
          </fieldset>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 shadow-sm transition-colors"
              aria-label="キャンセルして閉じる"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={`w-full sm:w-auto py-2.5 px-5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-md transition-colors ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isSubmitDisabled}
              aria-label="設定を決定してゲーム開始"
            >
              ゲーム開始
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};