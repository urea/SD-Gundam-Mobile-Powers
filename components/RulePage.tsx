
import React from 'react';
import { RuleSection } from './RuleSection';

const ListItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <li className={`ml-4 list-disc list-outside text-slate-700 ${className}`}>{children}</li>
);

const SubHeading: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = '', id }) => (
  <h4 id={id} className={`text-xl font-semibold text-sky-600 mt-6 mb-3 scroll-mt-20 ${className}`}>{children}</h4>
);

const Paragraph: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-slate-700 leading-relaxed ${className}`}>{children}</p>
);

const Strong: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <strong className={`font-semibold text-orange-600 ${className}`}>{children}</strong>
);

const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`overflow-x-auto my-4 ${className}`}>
    <table className="min-w-full border border-slate-300 divide-y divide-slate-300">{children}</table>
  </div>
);
const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th scope="col" className={`px-4 py-2 text-left text-sm font-semibold text-sky-700 bg-slate-100 ${className}`}>{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-4 py-2 text-sm text-slate-700 border-t border-slate-300 ${className}`}>{children}</td>
);

const Callout: React.FC<{ title: string; children: React.ReactNode; tone?: 'blue' | 'amber' | 'red' }> = ({
  title,
  children,
  tone = 'blue',
}) => {
  const styles = {
    blue: 'border-sky-200 bg-sky-50 text-sky-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-rose-200 bg-rose-50 text-rose-900',
  };

  return (
    <aside className={`rounded-lg border p-4 ${styles[tone]}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </aside>
  );
};

const FieldChip: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 shadow-sm ${className}`}>
    {children}
  </span>
);

const PhaseCard: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">{number}</span>
      <h4 className="text-lg font-semibold text-slate-800">{title}</h4>
    </div>
    <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
  </article>
);

const CardFigure: React.FC<{
  src: string;
  title: string;
  caption: string;
}> = ({ src, title, caption }) => (
  <figure className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
    <img src={src} alt={title} className="mx-auto aspect-[5/7] w-full max-w-[132px] rounded-md object-contain shadow" loading="lazy" />
    <figcaption className="mt-2 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{caption}</p>
    </figcaption>
  </figure>
);


const RuleContent: React.FC = () => {
  return (
    <>
      <nav className="mb-10 rounded-lg border border-sky-100 bg-sky-50 p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-sky-700 mb-3">目次 (Table of Contents)</h3>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li><a href="#source-policy" className="text-sky-700 hover:text-sky-900 hover:underline">基準と勝利条件</a></li>
          <li><a href="#card-types" className="text-sky-700 hover:text-sky-900 hover:underline">カードとフィールド</a></li>
          <li><a href="#game-flow" className="text-sky-700 hover:text-sky-900 hover:underline">ターン進行</a></li>
          <li><a href="#combat-rules" className="text-sky-700 hover:text-sky-900 hover:underline">戦闘とC/S</a></li>
          <li><a href="#combo-rules" className="text-sky-700 hover:text-sky-900 hover:underline">コンボ</a></li>
          <li><a href="#special-rules" className="text-sky-700 hover:text-sky-900 hover:underline">特殊ルール</a></li>
        </ul>
      </nav>

      <RuleSection id="source-policy" japaneseTitle="基準と勝利条件" englishTitle="Rules Source and Objective">
        <Callout title="このルールページの基準">
          <p>
            ルール整理は、TCGカタログの「SDガンダム モビルパワーズ」ルール解説を基準にしています。アプリ実装と差がある箇所でも、このページでは原典寄りのルールを優先して説明します。
          </p>
        </Callout>
        <Paragraph>
          モビルパワーズは、小隊単位でMカードを戦場へ送り、Cカードとコンボで攻撃ポイントを補正しながら相手に敗戦ポイントを押し付ける2人用カードゲームです。
        </Paragraph>
        <div className="grid gap-4 sm:grid-cols-2">
          <Callout title="勝利条件">
            <ul className="space-y-1">
              <ListItem>相手の敗戦ポイントが10になった瞬間に勝利。</ListItem>
              <ListItem>相手がデッキからカードを引けなくなった瞬間に勝利。</ListItem>
            </ul>
          </Callout>
          <Callout title="手札の基本" tone="amber">
            <p>
              開始手札は7枚。ゲーム中も手札は常に7枚を維持します。通常の手札上限チェックではなく、各行動が「引いてから出す／捨てる」形で7枚へ戻る前提です。
            </p>
          </Callout>
        </div>
        <SubHeading id="deck-setup">デッキと開始準備</SubHeading>
        <ul className="space-y-2">
          <ListItem>デッキは55枚以上。</ListItem>
          <ListItem>同一名称カードはデッキに3枚まで。</ListItem>
          <ListItem>互いにデッキをシャッフルし、それぞれ手札を7枚引く。</ListItem>
          <ListItem>先攻・後攻を決めてゲームを始める。マリガンとファーストドロー制限はありません。</ListItem>
        </ul>
      </RuleSection>

      <RuleSection id="card-types" japaneseTitle="カードとフィールド" englishTitle="Cards and Fields">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardFigure src="/assets/cards/000-M-001.jpg" title="Mカード" caption="小隊へ配備し、地形に合えば戦場へ進軍する攻撃役。" />
          <CardFigure src="/assets/cards/058-C-001.jpg" title="Cカード" caption="カウンター／支援フェイズで使う支援カード。" />
          <CardFigure src="/assets/cards/074-C-017.jpg" title="地形として使うカード" caption="カード下面の地形属性が今回の戦場になる。" />
          <CardFigure src="/assets/card-back.png" title="小隊のカード" caption="小隊フィールドに置かれ、条件を満たすと戦場へ出る。" />
        </div>

        <SubHeading id="m-cards">Mカード</SubHeading>
        <Paragraph>
          Mカードはモビルスーツ、モビルアーマー、戦艦などを表すカードです。ポイントを持ち、戦闘時の攻撃ポイントの土台になります。
        </Paragraph>
        <ul className="space-y-2">
          <ListItem><Strong>適応属性:</Strong> カード左上の「宇」「陸」「海」「空」。戦場地形と1つでも一致すると戦場へ進軍できます。</ListItem>
          <ListItem><Strong>ポイント:</Strong> 戦場にいるMカードのポイント合計が攻撃ポイントの基礎になります。</ListItem>
          <ListItem><Strong>チーム条件:</Strong> 一定の組み合わせを満たすとコンボが成立します。タグ一致だけで自動加点するルールは、この基準資料では確認できません。</ListItem>
        </ul>

        <SubHeading id="c-cards">Cカード</SubHeading>
        <Paragraph>
          Cカードはパイロット、アイテム、作戦などの支援カードです。カウンター／支援フェイズで任意に出せますが、出さない、または出せない場合は手札から任意の1枚を捨てます。
        </Paragraph>
        <ul className="space-y-2">
          <ListItem>Cカードは攻撃ポイントを増やす、相手カードを破壊する、戦場属性を追加するなどの効果を持ちます。</ListItem>
          <ListItem>一部例外を除き、戦場に自軍MカードがいないとCカードは出せません。</ListItem>
          <ListItem>使用したCカードは戦闘結果処理で捨て山へ送ります。</ListItem>
        </ul>

        <SubHeading id="fields">場の構成</SubHeading>
        <div className="flex flex-wrap gap-2">
          <FieldChip>山札</FieldChip>
          <FieldChip>手札</FieldChip>
          <FieldChip>小隊フィールド</FieldChip>
          <FieldChip>戦場フィールド</FieldChip>
          <FieldChip>敗戦フィールド</FieldChip>
          <FieldChip>捨て山</FieldChip>
        </div>
        <ul className="mt-4 space-y-2">
          <ListItem><Strong>小隊フィールド:</Strong> Mカードを配備する場所。両プレイヤーとも3枚になるまで編成します。</ListItem>
          <ListItem><Strong>戦場フィールド:</Strong> 地形に適応したMカードと使用中のCカードが置かれる場所。</ListItem>
          <ListItem><Strong>敗戦フィールド:</Strong> 敗戦ポイントを表す場所。ここに10枚目が置かれたら敗北します。</ListItem>
          <ListItem><Strong>捨て山:</Strong> 使用済みカードや、敗戦ポイントにならないカードを送る場所。敗戦フィールドとは明確に区別します。</ListItem>
        </ul>
      </RuleSection>

      <RuleSection id="game-flow" japaneseTitle="ターン進行" englishTitle="Turn Sequence">
        <div className="space-y-4">
          <PhaseCard number="1" title="編成フェイズ">
            <ul className="space-y-2">
              <ListItem>ターンプレイヤーから交互に、手札を1枚引いてからMカード1枚を小隊フィールドに出します。</ListItem>
              <ListItem>両プレイヤーの小隊フィールドが3枚になるまで繰り返します。前ターンから残っているMカードがある場合、その分だけ新しく出す枚数は少なくなります。</ListItem>
              <ListItem>手札がCカードばかりでMカードを出せない場合、手札の任意の1枚を<Strong>敗戦フィールド</Strong>へ出します。捨て山ではありません。</ListItem>
              <ListItem>この処理で敗戦フィールドに10枚目が置かれたら、その時点で敗北します。</ListItem>
            </ul>
          </PhaseCard>

          <PhaseCard number="2" title="出陣フェイズ">
            <ul className="space-y-2">
              <ListItem>ターンプレイヤーがデッキから1枚引き、そのカードを地形として戦場フィールドへ出します。</ListItem>
              <ListItem>両軍とも、小隊フィールドのMカードのうち戦場地形と1つでも適応属性が一致するカードをすべて戦場フィールドへ前進させます。</ListItem>
              <ListItem>両プレイヤーとも1枚も前進できない場合、今地形を出さなかった側が新たな地形カードを出します。どちらかのMカードが適応するまで繰り返します。</ListItem>
              <ListItem>片方だけが前進できた場合、一方的な戦闘とみなし、前進できなかった側の小隊Mカード3枚は敗戦フィールドへ送られます。</ListItem>
            </ul>
          </PhaseCard>

          <PhaseCard number="3" title="待機Mカードの処理">
            <ul className="space-y-2">
              <ListItem>両軍とも何らかのMカードを戦場へ送れた場合、今回出せなかったMカードは小隊フィールドに残ります。</ListItem>
              <ListItem>残ったMカードはタップして待機状態にします。これは「1ターンだけ残れる」ことを表します。</ListItem>
              <ListItem>前ターンからタップ済みだったMカードが今回も戦場へ出られなかった場合、そのMカードは捨て山へ送ります。</ListItem>
            </ul>
          </PhaseCard>

          <PhaseCard number="4" title="戦闘フェイズ">
            <ul className="space-y-2">
              <ListItem>片方だけが戦場にMカードを出せなかった場合を除き、戦闘は必ず発生します。</ListItem>
              <ListItem>戦場フィールドにいる自軍Mカードのポイント合計を攻撃ポイントとします。</ListItem>
              <ListItem>この後、Cカードとコンボの修正を加えて最終攻撃ポイントを算出します。</ListItem>
            </ul>
          </PhaseCard>
        </div>
      </RuleSection>

      <RuleSection id="combat-rules" japaneseTitle="戦闘とカウンター／支援" englishTitle="Combat and Counter Support">
        <SubHeading id="counter-support">カウンター／支援フェイズ</SubHeading>
        <Paragraph>
          攻撃ポイントの低い側から順に、各プレイヤーが1回ずつ行動します。
        </Paragraph>
        <ol className="list-decimal list-outside ml-5 space-y-2 text-slate-700">
          <li>カードを1枚引く。</li>
          <li>任意でCカードを1枚出す。</li>
          <li>Cカードを出さない、または出せない場合は、手札から任意の1枚を捨てる。</li>
        </ol>
        <Callout title="パスはありません" tone="red">
          <p>
            C/Sでは1枚引くため、何もせず終える選択肢はありません。Cカードを使わない場合は、手札を1枚捨てて7枚に戻します。
          </p>
        </Callout>

        <SubHeading id="combat-resolution">戦闘結果処理</SubHeading>
        <Paragraph>
          Cカードとコンボの修正を加えた最終攻撃ポイントを比較し、次のようにカードを移動します。
        </Paragraph>
        <Table>
          <thead>
            <tr><Th>結果</Th><Th>Mカード</Th><Th>Cカード</Th></tr>
          </thead>
          <tbody>
            <tr><Td>勝ち</Td><Td>自軍の戦場Mカードを捨て山へ送る。</Td><Td>自軍の使用Cカードを捨て山へ送る。</Td></tr>
            <tr><Td>負け</Td><Td>自軍の戦場Mカードをすべて敗戦フィールドへ送る。</Td><Td>自軍の使用Cカードを捨て山へ送る。</Td></tr>
            <tr><Td>引き分け</Td><Td>両軍の戦場Mカードを捨て山へ送る。</Td><Td>両軍の使用Cカードを捨て山へ送る。</Td></tr>
          </tbody>
        </Table>
        <Paragraph>
          敗戦フィールドへ送られたMカードは敗戦ポイントになります。捨て山に送られたカードは敗戦ポイントにはなりません。
        </Paragraph>
      </RuleSection>

      <RuleSection id="combo-rules" japaneseTitle="コンボ" englishTitle="Combo Rules">
        <Paragraph>
          Mカードが一定のチームを組んだとみなされるとコンボが成立します。複数のコンボ条件を同時に満たしても、攻撃ポイントに加えられるのは<Strong>成立したコンボの中から任意の1つ</Strong>です。
        </Paragraph>
        <Table>
          <thead>
            <tr><Th>コンボ名称</Th><Th>成立条件</Th><Th>加算</Th></tr>
          </thead>
          <tbody>
            <tr><Td>トリプルキラコンボ</Td><Td>同一ナンバーのキラカードが前線フィールドに3枚。</Td><Td>+10</Td></tr>
            <tr><Td>トリプルGコンボ</Td><Td>同一ナンバーのガンダム系カードが前線フィールドに3枚。</Td><Td>+8</Td></tr>
            <tr><Td>大将軍コンボ</Td><Td>大将軍カードが前線フィールドに3枚。</Td><Td>+8</Td></tr>
            <tr><Td>闇コンボ</Td><Td>闇の支配者カードが前線フィールドに3枚。</Td><Td>+8</Td></tr>
            <tr><Td>トリプルコンボ</Td><Td>同一ナンバーのカードが前線フィールドに3枚。</Td><Td>+7</Td></tr>
            <tr><Td>キラコンボ</Td><Td>キラカードが前線フィールドに3枚。</Td><Td>+5</Td></tr>
            <tr><Td>機体系コンボ</Td><Td>同一機体系カードが前線フィールドに3枚。</Td><Td>+5</Td></tr>
            <tr><Td>パイロットコンボ</Td><Td>同一パイロット専用機カードが前線フィールドに3枚。</Td><Td>+5</Td></tr>
            <tr><Td>系統コンボ</Td><Td>同一系統カードが前線フィールドに3枚。武者ガンダム限定。</Td><Td>+5</Td></tr>
          </tbody>
        </Table>
      </RuleSection>

      <RuleSection id="special-rules" japaneseTitle="特殊ルール" englishTitle="Special Rules">
        <SubHeading id="terrain">属性と地形</SubHeading>
        <ul className="space-y-2">
          <ListItem>属性は「宇宙」「陸」「海」「空」の4種類です。</ListItem>
          <ListItem>すべてのカードは本来の役割とは別に、地形カードとして使われる属性を持ちます。</ListItem>
          <ListItem>Mカードは、戦場地形とカード左上の適応属性が1つでも一致している場合のみ進軍できます。</ListItem>
        </ul>

        <SubHeading id="transform">変形・進化</SubHeading>
        <Paragraph>
          変形マークを持つMカードは、戦場フェイズからターン終了までの間に変形を宣言できます。武者ガンダムでは進化と呼ぶ場合がありますが、基本的な扱いは変形と同じです。
        </Paragraph>
        <ul className="space-y-2">
          <ListItem>変形後のMカードがデッキ内に残っている必要があります。</ListItem>
          <ListItem>変形後カードをデッキから引いて手札に加え、手札から戦場フィールドへ直接出します。</ListItem>
          <ListItem>変形前カードは捨て山へ送ります。</ListItem>
          <ListItem>変形後に新しいコンボが成立した場合、そのコンボは有効です。</ListItem>
          <ListItem>変形カードは戦場フィールドにしか配置できず、小隊フィールドには置けません。</ListItem>
        </ul>

        <SubHeading id="gasshin">合身</SubHeading>
        <Paragraph>
          合身は武者ガンダム系の追加能力です。指定された相手カードと合わせ、2体で1体のように扱います。
        </Paragraph>
        <ul className="space-y-2">
          <ListItem>Mカードが「+MM」から始まる指定を持つ場合、指定番号のカードと合わせて同時出しできます。</ListItem>
          <ListItem>合身後のポイントは、本来のポイントに後から出したカードのポイントを加えた値です。</ListItem>
          <ListItem>コンボが発生している場合、コンボボーナスはそのまま適用し、さらに合身分のポイントを追加します。</ListItem>
          <ListItem>合身は1体のMカードにつき、原則パートナー1体までです。</ListItem>
        </ul>
      </RuleSection>
    </>
  );
};

export const RulePage: React.FC = () => {
  return <RuleContent />;
};

// Helper function to safely get string value from TSV (CSV)
const getString = (value: any): string => (value !== undefined && value !== null ? String(value) : '');
