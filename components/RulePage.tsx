
import React from 'react';
import { RuleSection } from './RuleSection';
import { Card } from '../types';

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

export const tsvData = `Unique_Key	Card_Number	Card_Name	Card_Name_Omm	Type	Points	Flavor_Ability	Terrain_Type_M_cards	Battlefield_Terrain	Faction_Affiliation	Other_Notes	Effect	Var	imgURL
0	M-001	RX-78-2 ガンダム	ガンダム	M	9	ビームライフルは空の敵を！！ビームサーベルは地上の敵をたたききせる！！	空陸	空	地球連邦	キラ ガンダム系 アムロ専用機		St1	/assets/cards/000-M-001.jpg
1	M-002	RX-78GP02A ガンダム試作2号機	GP02A	M	9	核の恐怖再び！！GP02Aが、アトミックバズーカをかまえた！！	宇陸	海	ジオン	キラ ガンダム系		St1	/assets/cards/001-M-002.jpg
2	M-003	RX-78GP01-Fb ガンダム試作1号機フルバーニアン	GP01Fb	M	9	GP01が宇宙用に換装！すばやい動きで敵の小隊を追い詰める！！	宇陸	宇	地球連邦	キラ ガンダム系		St1	/assets/cards/002-M-003.jpg
3	M-004	AMX-002 ノイエ・ジール	ノイエ・ジール	M	9	ジオン軍の巨大MAが、オールレンジ攻撃をしかける！！	宇	陸	ジオン	ガトー専用機		St1	/assets/cards/003-M-004.jpg
4	M-005	MS-14S シャア専用ゲルググ	Sゲルググ(シャア)	M	9	シャア専用ゲルググが、宇宙から地上部隊の指揮を委託している！！	宇陸	空	ジオン	シャア専用機		St1	/assets/cards/004-M-005.jpg
5	M-006	MS-09R シャア専用リック・ドム	Rドム(シャア)	M	9	シャアが乗る赤いリック・ドムが、ビームバズーカをかまえた！！	宇	海	ジオン	シャア専用機		St1	/assets/cards/005-M-006.jpg
6	M-007	MA-08 ビグ・ザム	ビグ・ザム	M	9	圧倒的な攻撃力のMAからメガ粒子砲がはなたれた！！	宇陸	陸	ジオン			St1	/assets/cards/006-M-007.jpg
7	M-008	MS-09 ドム(トリプルドム)	ドム	M	8	トリプルドムが、ジェットストリームアタックをしかける！！	陸	宇	ジオン	黒い三連星専用機		St1	/assets/cards/007-M-008.jpg
8	M-009	MSN-02 ジオング	ジオング	M	8	ア・バオア・クーから出撃！有線式メガ粒子砲が敵をとらえた！！	宇	空	ジオン	シャア専用機 NT専用機		St1	/assets/cards/008-M-009.jpg
9	M-010	RX-78-3 G-3ガンダム	G-3ガンダム	M	8	マグネットコーティングで白兵戦に強化されたG-3は、マグネットコーティングで機動性をアップした！！	陸	海	地球連邦	ガンダム系		St1	/assets/cards/009-M-010.jpg
10	M-011	MAN-03 ブラウ・ブロ	ブラウ・ブロ	M	7	サイコミュシステムを搭載し、ニュータイプ専用機が登場する！！	宇	宇	ジオン	NT専用機		St1	/assets/cards/010-M-011.jpg
11	M-012	MSM-07S シャア専用ズゴック	Sズゴック(シャア)	M	8	水中より進入したズゴックが、鋭いクローで襲いかかる！！	海	空	ジオン	シャア専用機		St1	/assets/cards/011-M-012.jpg
12	M-013	RX-79[G] 陸戦用量産試作型ガンダム	陸戦型ガンダム	M	8	ミサイルランチャーをセット！長距離射程に有効攻撃をしかける！！	陸	陸	地球連邦	ガンダム系		St1	/assets/cards/012-M-013.jpg
13	M-014	MS-18E ケンプファー	ケンプファー	M	8	専用のショットガンをかまえ、ケンプファーが奇襲をしかける！！	宇陸	海	ジオン			St1	/assets/cards/013-M-014.jpg
14	M-015	APSARAS アプサラス	アプサラス	M	7	飛行テストでジオンの秘密兵器アプサラスに、連邦軍のMSが遭遇した！！	空	空海	ジオン			St1	/assets/cards/014-M-015.jpg
15	M-016	RX-78GP01 ガンダム試作1号機	GP01	M	7	スクランブル！GP01が地上の敵をたたき出すために出動した！！	陸	陸海	地球連邦	ガンダム系		St1	/assets/cards/015-M-016.jpg
16	M-017	RX-178 ガンダムMk-Ⅱ(ティターンズ仕様)	ガンダムMk-Ⅱ(T)	M	7	ティターンズが独自に開発したMS！黒いガンダムMk-Ⅱが大地にたつ！！	空	宇陸	地球連邦	ガンダム系		St1	/assets/cards/016-M-017.jpg
17	M-018	MS-06F ドズル・ザビ専用ザクⅡ	ドズルザク	M	7	ドズル中将がザクで出撃！戦場をわがもの顔であばれまくる！！	陸海	宇空	ジオン	ザク系 ドズル専用機		St1	/assets/cards/017-M-018.jpg
18	M-019	MS-15 ギャン	ギャン	M	7	ビームサーベルをふりかざし、マ・クベ専用の蒼いMSが舞う！！	陸	陸海	ジオン	マ・クベ専用機		St1	/assets/cards/018-M-019.jpg
19	M-020	MS-06R-2 ジョニー・ライデン専用ザクⅡ	JザクⅡR-2	M	7	真紅の稲妻のザクがゆく。“高機動型”の威力をみせつける！！	宇	宇海	ジオン	ザク系 ライデン専用機		St1	/assets/cards/019-M-020.jpg
20	M-021	RX-78GP03S ガンダム試作3号機ステイメン	GP03Sステイメン	M	7	オーキスからステイメンが分離！本当の戦いはここから始まると！！	宇	空海	地球連邦	ガンダム系		St1	/assets/cards/020-M-021.jpg
21	M-022	G FIGHTER Gファイター	Gファイター	M	7	テックラボ製の飛行メカ！ドックファイトをいどむぞ！！	空	宇陸	地球連邦			St1	/assets/cards/021-M-022.jpg
22	M-023	MS-06S シャア専用ザクⅡ	SザクⅡ(シャア)	M	6	赤い彗星のシャアが駆るMS。赤い彗星は戦場をゆるがす！！	空陸	宇陸	ジオン	ザク系 シャア専用機		St1	/assets/cards/022-M-023.jpg
23	M-024	MS-14JG ゲルググJ	ゲルググJ	M	6	専用ライフルを手に、“ゲルググ狙撃型”が敵を撃ちぬく！！	宇陸	空陸	ジオン			St1	/assets/cards/023-M-024.jpg
24	M-025	MA-06 ヴァル・ヴァロ	ヴァル・ヴァロ	M	6	月面での最終決戦！大型クローによりヴァル・ヴァロが連邦軍をねらう！！	宇	宇海	ジオン			St1	/assets/cards/024-M-025.jpg
25	M-026	MA-05 ビグロ	ビグロ	M	6	クローで敵をつかまえ、メガ粒子砲をおみまいする！！	宇	空陸	ジオン			St1	/assets/cards/025-M-026.jpg
26	M-027	YMS-16M ザメル	ザメル	M	6	長距離支援用MSザメルのミサイルランチャーが、敵小隊を直撃する！！	陸海	宇海	ジオン			St1	/assets/cards/026-M-027.jpg
27	M-028	MS-14A ゲルググ	ゲルググ	M	6	ビームなぎなたをかまえ、たくみにビームライフルを使いこなす！！	宇陸	宇空	ジオン			St1	/assets/cards/027-M-028.jpg
28	M-029	MS-14Fs ゲルググM指揮官機(シーマ専用ゲルググマリーネ)	ゲルググM(シーマ)	M	6	MRB-110ビームライフルを装備し、シーマが登場機をあばれまわる！！	宇陸	空陸	ジオン	シーマ専用機		St1	/assets/cards/028-M-029.jpg
29	M-030	MS-06F ザクⅡS型&マゼラトップ砲	ザクⅡS+マゼラ	M	6	ザクⅡS型のメガ粒子砲を発射！その強力な砲撃が敵をふきとばす！！	宇	宇空陸	ジオン	ザク系		St1	/assets/cards/029-M-030.jpg
30	M-031	RX-78NT1-FA NT専用ガンダム試作機	アレックスFA	M	6	増加装甲チョバムアーマーを装着し、完全武装で出撃する！！	宇陸	空陸海	地球連邦	ガンダム系 NT専用機		St1	/assets/cards/030-M-031.jpg
31	M-032	MS-06R 高機動型ザクⅡ(黒い三連星仕様)	高機動ザク(三連星)	M	6	黒い三連星専用のMS。ジェットストリームアタックで攻撃だ！！	宇	宇空海	ジオン			St1	/assets/cards/031-M-032.jpg
32	M-033	MAM-07 グラブロ	グラブロ	M	6	巨大MAが、水中からミサイルを発射！姿はクローで表現する！！	海	宇陸海	ジオン			St1	/assets/cards/032-M-033.jpg
33	M-034	MS-07B3 グフカスタム	グフカスタム	M	6	ガトリングガンを乱射したグフが、敵MS部隊にあらわれた！！	陸海	宇空陸	ジオン			St1	/assets/cards/033-M-034.jpg
34	M-035	MS-07H グフ飛行試験型	グフ飛行型	M	5	空からの攻撃はグフだ！グフ飛行型の高速強襲に気をつけろ！！	空陸	空陸海	ジオン			St1	/assets/cards/034-M-035.jpg
35	M-036	MS-06F2 ノイエン・ビッター専用ザクⅡ	ザクⅡ（ノイエン）	M	5	ロケットブースター噴射！一度だけなら、ザクでも空を飛べる！！	空陸	宇空海	ジオン	ザク系 ビッター専用機		St1	/assets/cards/035-M-036.jpg
36	M-037	MS-07B マ・クベ専用グフ	グフ(マ・クベ)	M	5	地上専用MSにマ・クベが搭乗！あの壺をキシリア様に届けてくれよ！！	空陸	宇陸海	ジオン	マ・クベ専用機		St1	/assets/cards/036-M-037.jpg
37	M-038	RX-77 ガンキャノン	ガンキャノン	M	5	ガンキャノン出撃！肩の低反動キャノン砲をおみまいする！！	空海	空陸海	地球連邦			St1	/assets/cards/037-M-038.jpg
38	M-039	MSM-03C ハイゴッグ(水中形態)	ハイゴッグ	M	5	ハイ・ゴッグは両腕を強行しならし、空の敵を撃ちおとせ！！	空海	宇空陸	ジオン			St1	/assets/cards/038-M-039.jpg
39	M-040	RGM-79Q ジム・クゥエル	ジムクゥエル	M	5	強化されたティターンズ仕様のジム。ティターンズの意思を示す！！	宇空陸	空陸海	地球連邦	ジム系		St1	/assets/cards/039-M-040.jpg
40	M-041	MS-09F/TROP ドム・トローペン	ドムトローペン(砂)	M	5	砂漠専用のMS。地上はもちろん、空の敵にだって負けやしない！！	空陸	宇空海	ジオン			St1	/assets/cards/040-M-041.jpg
41	M-042	RGM-79 パワード・ジム	パワードジム	M	5	大型バックパックを装備し、ジムの機動力がアップした！！	空陸海	宇陸海	地球連邦	ジム系		St1	/assets/cards/041-M-042.jpg
42	M-043	RX-75 ガンタンク	ガンタンク	M	5	強力なキャノン砲で敵を攻撃！無限キャタピラで、どこまでも進撃する！！	宇陸海	宇空陸	地球連邦			St1	/assets/cards/042-M-043.jpg
43	M-044	GRAY PHANTOM グレイファントム	グレイファントム	M	5	ペガサス級強襲揚陸艦！索敵しながら、友軍の中央を突破する！！	宇空海	空陸海	地球連邦	戦艦系		St1	/assets/cards/043-M-044.jpg
44	M-045	GRAF ZEPPELIN グラーフ・ツェッペリン	グラーフツェペリン	M	4	ムサイ級軽巡洋艦が索敵する！敵の陣形に集中砲火をかける！！	宇	宇空海	ジオン	戦艦系		St1	/assets/cards/044-M-045.jpg
45	M-046	RGC-83 ジム・キャノンⅡ	ジムキャノンⅡ	M	4	中距離支援に最適！両肩のビームキャノンが敵の侵攻を阻止する！！	宇空陸	宇陸海	地球連邦	ジム系		St1	/assets/cards/045-M-046.jpg
46	M-047	RGM-79G ジムコマンド(コロニー仕様)	ジムコマンド(コロニー)	M	4	汎用性の利点をいかし、けんせいを続けながら攻撃に出撃する！！	宇空陸	宇空陸	地球連邦	ジム系		St1	/assets/cards/046-M-047.jpg
47	M-048	RGM-79SP ジムスナイパーⅡ	ジムスナイパーⅡ	M	4	一年戦争最強のジム！長距離狙撃ライフルで、ターゲットを正確に射ぬく！！	宇空陸	空陸海	地球連邦	ジム系		St1	/assets/cards/047-M-048.jpg
48	M-049	RAG-79 アクア・ジム	アクアジム	M	4	水中戦用のアクアジムは、浅海にひそみ、敵の上陸をくいとめる！！	空陸海	宇空陸海	地球連邦	ジム系		St1	/assets/cards/048-M-049.jpg
49	M-050	MS-06FZ ザクⅡ改Bタイプ	ザクⅡ改B	M	4	シュツルムファウストを装備し、ザクの戦闘能力がアップした！！	宇空陸	宇空陸海	ジオン	ザク系		St1	/assets/cards/049-M-050.jpg
50	M-051	MS-06J ザクⅡ	ザクⅡ(地上用)	M	4	地上戦仕様のＪ型ザクが、空と海の敵に狙いをさだめた！！	空陸海	宇空陸海	ジオン	ザク系		St1	/assets/cards/050-M-051.jpg
51	M-052	MSM-03 ゴッグ	ゴッグ	M	4	極秘任務を遂行するため、海底から敵基地に潜入する！！	陸海	宇空陸海	ジオン			St1	/assets/cards/051-M-052.jpg
52	M-053	MS-06F ザクⅡ	ザクⅡ	M	3	地上降下作戦開始！ザクの脅威が地上の敵をせいあつする！！	宇陸	宇空陸海	ジオン	ザク系		St1	/assets/cards/052-M-053.jpg
53	M-054	RGM-79D ジム寒冷地仕様	ジム寒冷地仕様	M	3	北極基地からの増援機!!戦場にあわせて改修がほどこされた!!	空陸海	宇空陸海	地球連邦	ジム系		St1	/assets/cards/053-M-054.jpg
54	M-055	SIEGFRIED ジークフリード	ジークフリード	M	3	小隊の指揮をとりつつ、メガ粒子砲の援護射撃がはなたれた!!	宇	宇空陸海	ジオン	戦艦系		St1	/assets/cards/054-M-055.jpg
55	M-056	FF-X7 コア・ファイター	コア・ファイター	M	3	空に、宇宙に、機動力をいかして、敵の目をかくらんする!!	宇空	宇空陸海	地球連邦			St1	/assets/cards/055-M-056.jpg
56	M-057	MS-04 プロトタイプザク	プロトタイプザク	M	2	勝利のためには、ザクのプロトタイプでさえ実戦に投入する!!	宇陸	宇空陸海	ジオン	ザク系		St1	/assets/cards/056-M-057.jpg
57	M-058	RB-79 ボール	ボール	M	2	宇宙戦用のサポートメカが、キャノン砲で攻撃を開始した!!	宇	宇空陸海	地球連邦			St1	/assets/cards/057-M-058.jpg
58	C-001	アムロ・レイ	アムロ	C		「させるか！」アムロの能力がガンダムを変えた！！		海	地球連邦		●自分の最前線のガンダム系にポイント各+3	St1	/assets/cards/058-C-001.jpg
59	C-002	クリスチーナ・マッケンジー	クリス	C		クリスの調整で、コンピュータの性能がアップした！！		陸	地球連邦		●自分の最前線の地球連邦マークのカードにポイント各+2	St1	/assets/cards/059-C-002.jpg
60	C-003	ブライト・ノア	ブライト	C		「砲撃手なにやってんのー！」ブライトのゲキがとぶ！！		宇	地球連邦		●自分の最前線に戦艦系がいれば、合計ポイントに+5	St1	/assets/cards/060-C-003.jpg
61	C-004	コウ・ウラキ	コウ	C		敵の作戦を阻止するために、コウの執念が熱く燃える！！		空	地球連邦		●自分の最前線に地球連邦マークのカードが2枚以上いれば合計ポイント+5	St1	/assets/cards/061-C-004.jpg
62	C-005	アナベル・ガトー	ガトー	C		己の執念のために……ソロモンの悪夢が立ち上がる！！		空陸	ジオン		●自分の最前線のジオンマークのカードにポイント各+2	St1	/assets/cards/062-C-005.jpg
63	C-006	スレッガー・ロウ	スレッガー	C		特攻成功！「悲しいけど、これ、戦争なのよね……」		宇海	地球連邦		●デッキを1枚めくり、戦場と属性の合うメカニックカードが出たら、相手の最前線から好きなカード一枚を破壊できる。	St1	/assets/cards/063-C-006.jpg
64	C-007	シャア・アズナブル	シャア	C		シャアは専用の機体にのり、性能以上の能力をひきだした！		空	ジオン		●自分の最前線にシャア専用機のカードが1枚でもいれば、合計ポイントに+5	St1	/assets/cards/064-C-007.jpg
65	C-008	ランバ・ラル	ラル	C		ランバ・ラルが、ゲリラ屋本来の戦いをしかけた！		陸海	ジオン		●戦場に“陸”があれば、自分の合計ポイントに+5	St1	/assets/cards/065-C-008.jpg
66	C-009	バーナード・ワイズマン	バーニィ	C		ジオン軍のバーニィは、ザクを知り尽くしている！！		宇陸	ジオン		●デッキを1枚めくり、ジオンマークのカードが出れば、最前線のジオンマークカードにポイント各+2	St1	/assets/cards/066-C-009.jpg
67	C-010	ミハル・ラトキエ	ミハル	C		スパイ活動で情報をキャッチした！！		宇空	ジオン		●自分と相手の最前線のカードとポイントを入れ換える	St1	/assets/cards/067-C-010.jpg
68	C-011	ミノフスキー粒子	ミノフスキー粒子	C		戦闘レーダーが効かなくなり索敵が混乱した！！		空陸	アイテム		●相手の最前線から、ポイントの一番低いカードを破壊できる	St1	/assets/cards/068-C-011.jpg
69	C-012	チョバムアーマー	チョバムアーマー	C		チョバムアーマー装着！敵の攻撃をふせいだ！！		宇海	アイテム		●自分の最前線から好きなカード1枚を小隊にもどせる	St1	/assets/cards/069-C-012.jpg
70	C-013	Iフィールド	Iフィールド	C		ア・バオア・クーでの攻防をしのいだ！！		空海	アイテム		●相手の最前線からNT専用機以外のポイントを0にできる（破壊ではない）	St1	/assets/cards/070-C-013.jpg
71	C-014	補給部隊	補給部隊	C		後方から補給部隊が到着した！！		陸海	アイテム		●デッキを1枚めくり、戦場と属性の合うメカニックカードが出たら、自分の最前線に出せる	St1	/assets/cards/071-C-014.jpg
72	C-015	魚雷	魚雷	C		水中から攻撃をかけて、発見された！！		宇海	アイテム		●相手の最前線の属性”海”を持つカードを1枚だけ破壊できる。	St1	/assets/cards/072-C-015.jpg
73	C-016	地雷	地雷	C		地上戦を有利にするため、地雷が設置された！！		宇空	アイテム		●相手の最前線の属性”陸”を持つカードを1枚だけ破壊できる。	St1	/assets/cards/073-C-016.jpg
74	C-017	ブースター	ブースター	C		ブースターを使い強力な推進力をてにいれた！！		空陸	アイテム		●自分のみ戦場に“空”が追加される。	St1	/assets/cards/074-C-017.jpg
75	C-018	スラスター	スラスター	C		スラスター増設で宇宙に移動可能に！！		宇海	アイテム		●自分のみ戦場に“宇”が追加される。	St1	/assets/cards/075-C-018.jpg
76	C-019	熱核ジェットエンジン	熱核JETエンジン	C		熱核ジェットエンジンを搭載し仕様可能になった！！		空海	アイテム		●自分のみ戦場に“陸”が追加される。	St1	/assets/cards/076-C-019.jpg
77	C-020	ジェットパック	ジェットパック	C		ジェットパック装着で空中移動が可能になった！！		陸海	アイテム		●自分のみ戦場に“空”が追加される。	St1	/assets/cards/077-C-020.jpg`;


export const parseMobilePowersTsvData = (tsv: string): Card[] => {
  if (!tsv.trim()) {
    return [];
  }
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return []; // Header + at least one data line

  const headers = lines[0].split('\t').map(h => h.trim());
  const cards: Card[] = [];

  const getHeaderIndex = (headerName: string): number => {
    const index = headers.indexOf(headerName);
    if (index === -1) console.warn(`TSV Parser: Header "${headerName}" not found.`);
    return index;
  };

  const h_uniqueKey = getHeaderIndex('Unique_Key');
  const h_cardNumber = getHeaderIndex('Card_Number');
  const h_cardName = getHeaderIndex('Card_Name');
  const h_cardNameOmm = getHeaderIndex('Card_Name_Omm');
  const h_type = getHeaderIndex('Type');
  const h_points = getHeaderIndex('Points');
  const h_flavorAbility = getHeaderIndex('Flavor_Ability');
  const h_terrainTypeMCards = getHeaderIndex('Terrain_Type_M_cards');
  const h_battlefieldTerrain = getHeaderIndex('Battlefield_Terrain');
  const h_factionAffiliation = getHeaderIndex('Faction_Affiliation');
  const h_tags = getHeaderIndex('Other_Notes'); 
  const h_effect = getHeaderIndex('Effect');
  const h_gameVar = getHeaderIndex('Var');
  const h_imgURL = getHeaderIndex('imgURL');


  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim()); 
    if (values.length < headers.length) {
        console.warn(`Skipping malformed line ${i+1}: expected ${headers.length} values, got ${values.length}. Line: ${lines[i]}`);
        continue;
    }

    const cardNumber = values[h_cardNumber] || '';
    const rawUniqueKey = h_uniqueKey !== -1 ? values[h_uniqueKey] : '';
    const uniqueKey = rawUniqueKey && /^[A-Z]+-\d{2,4}(?:-\d+)?$/.test(rawUniqueKey)
      ? rawUniqueKey
      : cardNumber;

    const card: Card = {
      uniqueKey,
      cardNumber,
      cardName: values[h_cardName] || '',
      cardNameOmm: values[h_cardNameOmm] || '',
      type: values[h_type] || '',
      points: values[h_points] || '',
      textAbility: values[h_flavorAbility] || '',
      terrainTypeMCards: values[h_terrainTypeMCards] || '',
      battlefieldTerrain: values[h_battlefieldTerrain] || '',
      factionAffiliation: values[h_factionAffiliation] || '',
      tags: (h_tags !== -1 && values[h_tags]) ? values[h_tags] : '',
      effect: (h_effect !== -1 && values[h_effect] && values[h_effect].trim() !== '') ? values[h_effect].trim() : undefined,
      gameVar: (h_gameVar !== -1 && values[h_gameVar]) ? values[h_gameVar] : '',
      imageUrl: (h_imgURL !== -1 && values[h_imgURL] && values[h_imgURL].trim() !== '') ? values[h_imgURL].trim() : undefined,
    };
    cards.push(card);
  }
  return cards;
};


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
