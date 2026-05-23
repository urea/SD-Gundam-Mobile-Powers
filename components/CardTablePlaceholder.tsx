
import React from 'react';

export const CardTablePlaceholder: React.FC = () => {
  return (
    <div className="p-4 border-2 border-dashed border-slate-600 rounded-md bg-slate-800 text-center">
      <p className="text-slate-400 font-semibold">カードの種類と使い方 (Card Types and How to Use Them)</p>
      <p className="mt-2 text-sm text-slate-500">
        This section should contain the detailed table of card types and their usage, as found on the original rule website.
        <br />
        Please refer to <a href="http://card.g1.xrea.com/t2/tbc03gmp.html#カードの種類と使い方" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-300 underline">the original source</a> for the table structure and content.
        <br />
        It involves multiple columns like カード名 (Card Name), 色 (Color), パワー (Power), 効果 (Effect), etc.
      </p>
      <div className="mt-4 p-3 bg-yellow-900/30 text-yellow-300 border border-yellow-700 rounded-md text-xs">
        <strong>Developer Note:</strong> Replicating this complex table requires careful HTML-to-React translation or a dedicated table component. For this placeholder, a simplified representation or a direct link is suggested.
      </div>
    </div>
  );
};
