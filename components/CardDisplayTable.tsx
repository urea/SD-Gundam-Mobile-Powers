
import React, { useState } from 'react';
import { Card } from '../types'; // Assuming Card is the base type
import { getCardBaseId } from '../utils/cardIdentity';

// Define DisplayCard to include properties used for display/sorting
export interface DisplayCard extends Card { // Exported for use in DeckEditorPage
  displayTerrain: string;
  pointsNum: number;
  sourceSet?: string;
}

export type SortableCardKey = keyof Pick<DisplayCard, 'cardNumber' | 'cardName' | 'type' | 'factionAffiliation' | 'displayTerrain' | 'pointsNum' | 'sourceSet' | 'tags'>;


interface CardDisplayTableProps {
  cards: DisplayCard[];
  onSortRequest: (key: SortableCardKey) => void;
  sortConfig: { key: SortableCardKey; direction: 'ascending' | 'descending' } | null;
  renderActions?: (card: DisplayCard) => React.ReactNode; // For custom actions/operations, now in the first column
  onCardImageClick?: (card: DisplayCard) => void; // New prop for image click
  showSourceSet?: boolean;
  compactRows?: boolean;
}

const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.5); /* slate-200/50 */
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(163, 177, 198, 0.8); /* slate-400/80 */
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.8); /* slate-500/80 */
  }
`;

const SortIndicator: React.FC<{ direction?: 'ascending' | 'descending' }> = ({ direction }) => {
  if (!direction) return <span className="opacity-30 ml-1">↕</span>; // Neutral indicator
  return direction === 'ascending' ? <span className="ml-1 text-sky-600">▲</span> : <span className="ml-1 text-sky-600">▼</span>;
};

const TableHeader: React.FC<{
  title: string;
  sortKey?: SortableCardKey; // Optional for non-sortable columns
  onSortRequest?: (key: SortableCardKey) => void;
  currentSortConfig?: { key: SortableCardKey; direction: 'ascending' | 'descending' } | null;
  className?: string;
}> = ({ title, sortKey, onSortRequest, currentSortConfig, className = '' }) => {
  const isSortingThisColumn = sortKey && currentSortConfig?.key === sortKey;
  const isSortable = sortKey && onSortRequest;

  return (
    <th
      scope="col"
      className={`px-3 py-3.5 text-left text-sm font-semibold text-sky-700 ${isSortable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''} ${className}`}
      onClick={isSortable ? () => onSortRequest(sortKey!) : undefined}
      aria-sort={isSortable && isSortingThisColumn ? (currentSortConfig?.direction === 'ascending' ? 'ascending' : 'descending') : (isSortable ? 'none' : undefined)}
    >
      {title}
      {isSortable && (isSortingThisColumn ? <SortIndicator direction={currentSortConfig?.direction} /> : <SortIndicator />)}
    </th>
  );
};

const CompactInfoItem: React.FC<{label: string, children: React.ReactNode, className?: string, scrollable?: boolean}> = ({label, children, className = '', scrollable = false}) => (
  <div className={`min-w-0 rounded border border-slate-200 bg-slate-50/80 p-2 ${className}`}>
    <div className="mb-1 text-[10px] font-semibold text-slate-500">{label}</div>
    <div className={`break-words text-xs leading-relaxed text-slate-700 ${scrollable ? 'max-h-24 overflow-y-auto custom-scrollbar pr-1' : ''}`}>
      {children}
    </div>
  </div>
);

const isKiraCard = (card: Card): boolean => {
  return card.tags.includes("キラ");
};


export const CardDisplayTable: React.FC<CardDisplayTableProps> = ({ cards, onSortRequest, sortConfig, renderActions, onCardImageClick, showSourceSet = false, compactRows = false }) => {
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});

  const SortChip: React.FC<{label: string, sortKey: SortableCardKey}> = ({label, sortKey}) => {
    const isActive = sortConfig?.key === sortKey;
    return (
      <button
        type="button"
        onClick={() => onSortRequest(sortKey)}
        className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium transition-colors ${
          isActive
            ? 'border-sky-300 bg-sky-50 text-sky-700'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
        }`}
      >
        {label}
        <SortIndicator direction={isActive ? sortConfig?.direction : undefined} />
      </button>
    );
  };

  if (!cards) { 
    return <p className="text-slate-500 italic">カードデータが読み込み中です...</p>;
  }
  if (cards.length === 0) {
    return <p className="text-slate-500 italic text-center py-8">表示するカードがありません。絞り込み条件を確認してください。</p>;
  }


  return (
    <div className="overflow-x-auto bg-white shadow-xl rounded-lg ring-1 ring-slate-200">
      <style dangerouslySetInnerHTML={{ __html: customScrollbarStyles }} />
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50 sticky top-0 z-10">
          {compactRows ? (
            <tr>
              {renderActions && <TableHeader title="操作" className="w-24 text-center" />}
              <TableHeader title="画像" className="w-28" />
              <th scope="col" className="px-3 py-2 text-left text-sm font-semibold text-sky-700">
                <div className="flex flex-col gap-1.5">
                  <span>カード情報</span>
                  <div className="flex flex-wrap gap-1.5">
                    <SortChip label="No." sortKey="cardNumber" />
                    <SortChip label="カード名" sortKey="cardName" />
                    <SortChip label="種別" sortKey="type" />
                    <SortChip label="P" sortKey="pointsNum" />
                    <SortChip label="所属" sortKey="factionAffiliation" />
                    {showSourceSet && <SortChip label="収録" sortKey="sourceSet" />}
                    <SortChip label="地形" sortKey="displayTerrain" />
                    <SortChip label="タグ" sortKey="tags" />
                  </div>
                </div>
              </th>
            </tr>
          ) : (
            <tr>
              {renderActions && <TableHeader title="操作" className="w-28 text-center" />}
              <TableHeader title="画像" className="w-28" /> {/* Adjusted width for new card preview */}
              <TableHeader title="No." sortKey="cardNumber" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="w-20" />
              <TableHeader title="カード名" sortKey="cardName" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[200px] sm:w-[15%]" />
              <TableHeader title="種別" sortKey="type" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="w-16" />
              <TableHeader title="P" sortKey="pointsNum" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="w-16" />
              <TableHeader title="所属" sortKey="factionAffiliation" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[120px] sm:w-[15%]" />
              {showSourceSet && (
                <TableHeader title="収録" sortKey="sourceSet" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[180px] sm:w-[16%]" />
              )}
              <TableHeader title="地形" sortKey="displayTerrain" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[100px] sm:w-[10%]" />
              <TableHeader title="テキスト" className="min-w-[320px] sm:w-[35%]" />
              <TableHeader title="タグ" sortKey="tags" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[280px] sm:w-[25%]" />
            </tr>
          )}
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {cards.map((card, index) => {
            const baseId = getCardBaseId(card);
            const imageErrorKey = `${baseId}-${card.cardName}-${index}`;
            const imgSrc = card.imageUrl;
            const handleImageError = () => {
              setImageLoadErrors(prev => ({ ...prev, [imageErrorKey]: true }));
            };
            const hasError = imageLoadErrors[imageErrorKey];
            const isKira = isKiraCard(card);

            let displayText = card.textAbility; 
            if (card.type === 'C' && card.effect) {
              displayText = card.effect; 
            }

            const imageButton = (
              <button
                onClick={() => onCardImageClick && card.imageUrl && !hasError && onCardImageClick(card)}
                disabled={!card.imageUrl || hasError || !onCardImageClick}
                className={`w-24 h-auto p-0.5 rounded-md shadow-md relative transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400
                            ${card.imageUrl && !hasError ? 'bg-slate-50 cursor-pointer' : 'bg-slate-200 cursor-default'}
                            ${isKira ? 'kira-preview-border' : ''}`}
                aria-label={`カード ${card.cardName} の画像を拡大表示 ${isKira ? '(キラカード)' : ''}`}
              >
                {imgSrc && !hasError ? (
                  <img
                    src={imgSrc}
                    alt={card.cardName}
                    className="w-full h-auto object-contain rounded"
                    onError={handleImageError}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-slate-100 rounded text-xs text-slate-400">
                    画像なし
                  </div>
                )}
              </button>
            );

            if (compactRows) {
              return (
                <tr key={`${baseId}-${card.cardNameOmm}-${index}`} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                  {renderActions && (
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-slate-500 align-middle text-center">
                      {renderActions(card)}
                    </td>
                  )}
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-slate-500 align-middle">
                    {imageButton}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="min-h-[136px] flex flex-col gap-2">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold text-slate-700 tabular-nums">{card.cardNumber}</span>
                        {baseId !== card.cardNumber && (
                          <span className="text-[11px] text-slate-400">{baseId}</span>
                        )}
                        <span className="text-sm font-semibold text-slate-900">
                          {card.cardName}
                          {isKira && <span className="ml-1 text-xs font-bold" style={{background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>キラ</span>}
                        </span>
                        {card.cardNameOmm && card.cardNameOmm !== card.cardName && (
                          <span className="text-xs text-slate-500">({card.cardNameOmm})</span>
                        )}
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{card.type}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">P {card.type === 'M' ? card.points : '-'}</span>
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-12">
                        <CompactInfoItem label="所属" className="md:col-span-2">{card.factionAffiliation}</CompactInfoItem>
                        {showSourceSet && (
                          <CompactInfoItem label="収録" className="md:col-span-2">{card.sourceSet || '-'}</CompactInfoItem>
                        )}
                        <CompactInfoItem label="地形" className={showSourceSet ? 'md:col-span-1' : 'md:col-span-2'}>{card.displayTerrain}</CompactInfoItem>
                        <CompactInfoItem label="テキスト" className={showSourceSet ? 'md:col-span-4' : 'md:col-span-5'} scrollable>{displayText || '-'}</CompactInfoItem>
                        <CompactInfoItem label="タグ" className="md:col-span-3" scrollable>{card.tags || '-'}</CompactInfoItem>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }


            return (
              <tr key={`${baseId}-${card.cardNameOmm}-${index}`} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                {renderActions && (
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-slate-500 align-middle text-center">
                    {renderActions(card)}
                  </td>
                )}
                <td className="px-2 py-2 whitespace-nowrap text-sm text-slate-500 align-middle">
                  {imageButton}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 tabular-nums align-top">
                  <div>{card.cardNumber}</div>
                  {baseId !== card.cardNumber && (
                    <div className="text-[11px] text-slate-400">{baseId}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-slate-800 font-medium align-top">
                  <div className="break-words">{card.cardName} {isKira && <span className="text-xs font-bold" style={{background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>キラ</span>}</div>
                  {card.cardNameOmm && card.cardNameOmm !== card.cardName && (
                    <div className="text-xs text-slate-500 break-words">({card.cardNameOmm})</div>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 text-center align-top">{card.type}</td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 text-center tabular-nums align-top">
                  {card.type === 'M' ? card.points : '-'}
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 align-top">
                  <div className="max-w-xs break-words">{card.factionAffiliation}</div>
                </td>
                {showSourceSet && (
                  <td className="px-3 py-3 text-sm text-slate-600 align-top">
                    <div className="max-w-xs break-words">{card.sourceSet || '-'}</div>
                  </td>
                )}
                <td className="px-3 py-3 text-sm text-slate-600 align-top">
                  <div className="max-w-xs break-words">{card.displayTerrain}</div>
                </td>
                <td className="px-3 py-3 text-sm text-slate-700 align-top">
                  <div className="max-h-32 overflow-y-auto p-1 rounded bg-slate-100/70 custom-scrollbar break-words text-xs leading-relaxed">
                    {displayText || '-'}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-slate-500 align-top">
                  <div className="max-h-32 overflow-y-auto p-1 rounded bg-slate-100/70 custom-scrollbar break-words text-xs leading-relaxed">
                    {card.tags || '-'}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
