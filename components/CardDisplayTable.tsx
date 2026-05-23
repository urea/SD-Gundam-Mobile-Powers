
import React, { useState } from 'react';
import { Card } from '../types'; // Assuming Card is the base type

// Define DisplayCard to include properties used for display/sorting
export interface DisplayCard extends Card { // Exported for use in DeckEditorPage
  displayTerrain: string;
  pointsNum: number;
}

export type SortableCardKey = keyof Pick<DisplayCard, 'cardNumber' | 'cardName' | 'type' | 'factionAffiliation' | 'displayTerrain' | 'pointsNum' | 'tags'>;


interface CardDisplayTableProps {
  cards: DisplayCard[];
  onSortRequest: (key: SortableCardKey) => void;
  sortConfig: { key: SortableCardKey; direction: 'ascending' | 'descending' } | null;
  renderActions?: (card: DisplayCard) => React.ReactNode; // For custom actions/operations, now in the first column
  onCardImageClick?: (card: DisplayCard) => void; // New prop for image click
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

const isKiraCard = (card: Card): boolean => {
  return card.tags.includes("キラ");
};


export const CardDisplayTable: React.FC<CardDisplayTableProps> = ({ cards, onSortRequest, sortConfig, renderActions, onCardImageClick }) => {
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});

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
          <tr>
            {renderActions && <TableHeader title="操作" className="w-28 text-center" />}
            <TableHeader title="画像" className="w-28" /> {/* Adjusted width for new card preview */}
            <TableHeader title="No." sortKey="cardNumber" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="w-20" />
            <TableHeader title="カード名" sortKey="cardName" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[200px] sm:w-[15%]" />
            <TableHeader title="種別" sortKey="type" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="w-16" />
            <TableHeader title="P" sortKey="pointsNum" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="w-16" />
            <TableHeader title="所属" sortKey="factionAffiliation" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[120px] sm:w-[15%]" />
            <TableHeader title="地形" sortKey="displayTerrain" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[100px] sm:w-[10%]" />
            <TableHeader title="テキスト" className="min-w-[320px] sm:w-[35%]" />
            <TableHeader title="タグ" sortKey="tags" onSortRequest={onSortRequest} currentSortConfig={sortConfig} className="min-w-[280px] sm:w-[25%]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {cards.map((card, index) => {
            const imageErrorKey = `${card.cardNumber}-${card.cardName}-${index}`;
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


            return (
              <tr key={`${card.cardNumber}-${card.cardNameOmm}-${index}`} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                {renderActions && (
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-slate-500 align-middle text-center">
                    {renderActions(card)}
                  </td>
                )}
                <td className="px-2 py-2 whitespace-nowrap text-sm text-slate-500 align-middle">
                   <button
                    onClick={() => onCardImageClick && card.imageUrl && !hasError && onCardImageClick(card)}
                    disabled={!card.imageUrl || hasError || !onCardImageClick}
                    className={`w-24 h-auto p-0.5 rounded-md shadow-md relative transition-all duration-150 ease-in-out transform hover:scale-105 group focus:outline-none focus:ring-2 focus:ring-sky-400 
                                ${card.imageUrl && !hasError ? 'bg-slate-50 cursor-pointer' : 'bg-slate-200 cursor-default'}
                                ${isKira ? 'kira-preview-border' : ''}`}
                    aria-label={`カード ${card.cardName} の画像を拡大表示 ${isKira ? '(キラカード)' : ''}`}
                  >
                    {imgSrc && !hasError ? (
                      <img
                        src={imgSrc}
                        alt={card.cardName}
                        className="w-full h-auto object-contain rounded-t"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-slate-100 rounded-t text-xs text-slate-400 border-b border-slate-200">
                        画像なし
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-black/65 group-hover:bg-black/75 backdrop-blur-sm rounded-b">
                      <p className="text-white font-semibold truncate leading-tight" style={{ fontSize: '0.6rem' }} title={card.cardNameOmm || card.cardName}>
                        {card.cardNameOmm || card.cardName}
                      </p>
                      <p className="text-yellow-300 leading-tight" style={{ fontSize: '0.55rem' }}>
                        {card.type}{card.type === 'M' ? ` P:${card.points}` : ''} {isKira && <span className="text-xs" style={{background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold'}}>★</span>}
                      </p>
                    </div>
                  </button>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 tabular-nums align-top">{card.cardNumber}</td>
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