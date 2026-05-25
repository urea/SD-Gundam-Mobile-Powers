
import React from 'react';
import { RuleSection } from './RuleSection';
import { CardDisplayTable } from './CardDisplayTable';
import { Card } from '../types';

const ListItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <li className={`ml-4 list-disc list-outside text-slate-700 ${className}`}>{children}</li>
);

const SubHeading: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className, id }) => (
  <h4 id={id} className={`text-xl font-semibold text-sky-600 mt-6 mb-3 scroll-mt-20 ${className}`}>{children}</h4>
);

const Paragraph: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={`text-slate-700 leading-relaxed ${className}`}>{children}</p>
);

const Strong: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <strong className={`font-semibold text-orange-600 ${className}`}>{children}</strong>
);

const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`overflow-x-auto my-4 ${className}`}>
    <table className="min-w-full border border-slate-300 divide-y divide-slate-300">{children}</table>
  </div>
);
const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <th scope="col" className={`px-4 py-2 text-left text-sm font-semibold text-sky-700 bg-slate-100 ${className}`}>{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={`px-4 py-2 text-sm text-slate-700 border-t border-slate-300 ${className}`}>{children}</td>
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

  // Note: The Unique_Key from TSV is not stored in the Card object by default
  // const h_uniqueKey = getHeaderIndex('Unique_Key'); 
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

    const card: Card = {
      // uniqueKey: (h_uniqueKey !== -1 && values[h_uniqueKey]) ? values[h_uniqueKey] : undefined, // If Card type was updated
      cardNumber: values[h_cardNumber] || '',
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
      <nav className="mb-10 p-4 bg-sky-50 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-sky-700 mb-3">目次 (Table of Contents)</h3>
        <ul className="space-y-1.5 text-sm">
          <li><a href="#game-objective" className="text-sky-600 hover:text-sky-800 hover:underline">ゲームの目的</a></li>
          <li><a href="#card-types" className="text-sky-600 hover:text-sky-800 hover:underline">カードの種類と使い方</a></li>
          <li><a href="#game-flow" className="text-sky-600 hover:text-sky-800 hover:underline">ゲームの流れ</a></li>
          <li><a href="#field-explanation" className="text-sky-600 hover:text-sky-800 hover:underline">フィールドの説明</a></li>
          <li><a href="#terrain-effects" className="text-sky-600 hover:text-sky-800 hover:underline">地形効果について</a></li>
          <li><a href="#combat-rules" className="text-sky-600 hover:text-sky-800 hover:underline">戦闘について</a></li>
          <li><a href="#special-rules" className="text-sky-600 hover:text-sky-800 hover:underline">特殊なルール</a></li>
        </ul>
      </nav>

      <RuleSection id="game-objective" japaneseTitle="ゲームの目的" englishTitle="Game Objective">
        <Paragraph>
          モビルパワーズは、地球連邦軍またはジオン公国軍の司令官となり、MS（モビルスーツ）やMA（モビルアーマー）といった兵器カードと、キャラクターや特殊効果を持つコマンドカードを駆使して戦う2人用対戦カードゲームです。
        </Paragraph>
        <Paragraph>
          プレイヤーは自分の小隊を編成し、戦場に出撃させ、相手の小隊と戦闘を行います。戦闘に勝利することで相手に<Strong>敗戦ポイント</Strong>を与え、先に相手の敗戦ポイントを<Strong>10点</Strong>にしたプレイヤーがゲームの勝者となります。
        </Paragraph>
      </RuleSection>

      <RuleSection id="card-types" japaneseTitle="カードの種類と使い方" englishTitle="Card Types and How to Use Them">
        <Paragraph>
          カードは大きく分けて2種類あります：<Strong>Mカード（メカニックカード）</Strong>と<Strong>Cカード（カウンターカード）</Strong>です。
        </Paragraph>
        <SubHeading id="m-cards">Mカード (メカニックカード)</SubHeading>
        <Paragraph>
          MS、MA、戦艦などの兵器を表すカードです。各Mカードには以下の情報が記載されています。
        </Paragraph>
        <ul className="list-none space-y-2 pl-0">
          <ListItem><Strong>カード名:</Strong> 兵器の名称です。（例：RX-78-2 ガンダム）</ListItem>
          <ListItem><Strong>ポイント(P):</Strong> 兵器の基本戦闘力です。これが高いほど強力ですが、戦場に出すための条件が厳しくなることがあります。</ListItem>
          <ListItem><Strong>所属:</Strong> 地球連邦軍かジオン公国軍かなど、所属勢力を示します。</ListItem>
          <ListItem><Strong>地形適性:</Strong> 「宇」「陸」「海」「空」で示され、その兵器が活動可能な地形を表します。戦場の地形と一致しない場合、出撃できません。</ListItem>
          <ListItem><Strong>テキスト/能力 (Flavor Ability):</Strong> 特殊な能力やフレーバーテキストが記載されています。</ListItem>
          <ListItem><Strong>タグ (Tags):</Strong> 「ガンダム系」「シャア専用機」など、カードの特性を示すキーワードです。これらはスペースで区切られています。Cカードの効果に関わることがあり、また、戦場にいる他の味方Mカードとのタグの一致数によって戦闘力が上昇します。</ListItem>
          <ListItem><Strong>Var (バリエーション):</Strong> カードのバリエーション情報です（例：St1、Ki1）。「キラカード」などの識別に使われることがあります。</ListItem>
        </ul>

        <SubHeading id="c-cards">Cカード (カウンターカード)</SubHeading>
        <Paragraph>
          キャラクター、アイテム、イベントなどを表すカードです。主に戦闘中（カウンター／支援フェイズ）に使用し、戦況を有利に進めるための様々な効果を発揮します。
        </Paragraph>
        <ul className="list-none space-y-2 pl-0">
          <ListItem><Strong>カード名:</Strong> キャラクター名や事象名です。（例：アムロ・レイ、ミノフスキー粒子）</ListItem>
          <ListItem><Strong>効果地形:</Strong> Cカードが効果を発揮できる戦場の地形属性を示します。現在の戦場地形と一致しないCカードは原則使用できません。（一部例外あり）</ListItem>
          <ListItem><Strong>テキスト/フレーバー (Flavor Ability):</Strong> カードの雰囲気を伝える短いキャッチコピーや説明文が記載されています。</ListItem>
          <ListItem><Strong>効果 (Effect):</Strong> カードが持つ具体的な効果内容です。ポイントの増減、カードの破壊、特殊な行動などが含まれます。これがCカードの主要なルールテキストとなります。</ListItem>
          <ListItem><Strong>所属:</Strong> Mカード同様、関連する勢力を示します。</ListItem>
          <ListItem><Strong>タグ (Tags):</Strong> Mカード同様、カードの特性を示すキーワードが含まれることがあります。</ListItem>
           <ListItem><Strong>Var (バリエーション):</Strong> カードのバリエーション情報です。</ListItem>
        </ul>
        <Paragraph className="mt-4">
          カードの詳細な見方や各項目の意味については、カードリストの表も参照してください。
        </Paragraph>
      </RuleSection>

      <RuleSection id="game-flow" japaneseTitle="ゲームの流れ" englishTitle="Game Flow">
        <Paragraph>
          ゲームは以下のフェイズを繰り返して進行します。
        </Paragraph>
        <ol className="list-decimal list-outside ml-5 space-y-3 text-slate-700">
          <li>
            <Strong>編成フェイズ (Formation Phase)</Strong>
            <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
              <ListItem>各プレイヤーは山札からカードを1枚引きます。（手札は最大7枚。7枚を超える場合は1枚選び、捨て札にする。）</ListItem>
              <ListItem>自分の手札からMカードを1枚選び、自分の「小隊フィールド」に裏向きで配置します。（小隊フィールドには最大3枚まで配置可能。）</ListItem>
              <ListItem>もし手札に配置できるMカードがない（Cカードしかない、またはMカードはあるが小隊が3枚で満員）場合、手札から任意のカード1枚を選び、自分の「敗北フィールド」に表向きで置きます。これは敗戦ポイント1点となります。</ListItem>
              <ListItem>両プレイヤーが配置を終えたら次のフェイズへ。</ListItem>
            </ul>
          </li>
          <li>
            <Strong>出陣フェイズ (Deployment Phase)</Strong>
            <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
              <ListItem>先攻プレイヤー（前のターンに戦闘ポイントが低かった側、または同点なら前のターンの後攻側）が山札からカードを1枚引き、それを「地形カード」として戦場に出します。このカードの「効果地形」がこの戦闘の地形属性となります。</ListItem>
              <ListItem>両プレイヤーは、自分の小隊フィールドにあるMカードの中で、決定された戦場地形に適性を持つカードを全て「最前線フィールド」に表向きで移動させます。</ListItem>
              <ListItem>地形に適性がないMカードは小隊フィールドに残ります（待機）。</ListItem>
              <ListItem>どちらか一方のプレイヤーしか最前線にMカードを出せなかった場合、「一方的出撃」となり、戦闘は発生せず、出撃できた側の勝利として扱われ、出撃できなかった側は小隊のMカード枚数分の敗戦ポイントを受けます。その後、ターン終了処理へ。</ListItem>
            </ul>
          </li>
          <li>
            <Strong>戦闘計算フェイズ (Combat Calculation Phase)</Strong>
            <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
              <ListItem>各プレイヤーは、自分の最前線フィールドに出ているMカードのポイントの合計値を計算します。この際、Mカードの「タグ」が他の味方Mカードのタグと一致する場合、一致したタグの数だけそのMカードのポイントが上昇します。さらに、特定のカードの組み合わせによる「コンボ」が成立した場合、追加のポイントが加算されます。これが現在の戦闘ポイントとなります。</ListItem>
            </ul>
          </li>
          <li>
            <Strong>カウンター／支援フェイズ (Counter/Support Phase)</Strong>
            <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
              <ListItem>戦闘計算フェイズで戦闘ポイントが<Strong>低かった</Strong>プレイヤーから順に行動します。（同点の場合は、前のターンの後攻側から）</ListItem>
              <ListItem>各プレイヤーは山札からカードを1枚引きます。</ListItem>
              <ListItem>その後、以下のいずれかを選択します：
                <ul className="list-lower-alpha list-outside ml-5 mt-1 space-y-0.5">
                  <ListItem>手札からCカードを1枚選び、効果を使用する。（使用したCカードは捨て札へ）</ListItem>
                  <ListItem>手札から任意のカード1枚を選び、捨て札にする。</ListItem>
                  <ListItem>何もしない（パス）。</ListItem>
                </ul>
              </ListItem>
              <ListItem>使用するCカードは表向きで公開し、効果を解決します。</ListItem>
              <ListItem>Cカードの効果は即座に解決され、戦闘ポイントが変動することがあります。</ListItem>
              <ListItem>両プレイヤーが行動を終えたら次のフェイズへ。</ListItem>
            </ul>
          </li>
          <li>
            <Strong>戦闘解決フェイズ (Combat Resolution Phase)</Strong>
            <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
              <ListItem>最終的な戦闘ポイントを比較します。</ListItem>
              <ListItem>戦闘ポイントが<Strong>高い</Strong>プレイヤーが戦闘の勝者となります。</ListItem>
              <ListItem>敗者は、自分の最前線フィールドに出ているMカードの枚数分だけ敗戦ポイントを受け、それらのMカードを自分の敗北フィールドに置きます。</ListItem>
              <ListItem>勝者の最前線フィールドのMカードは捨て札となります。</ListItem>
              <ListItem>引き分けの場合は、両者の最前線Mカードはそれぞれの捨て札となります。（敗戦ポイントは発生しない）</ListItem>
            </ul>
          </li>
          <li>
            <Strong>終了フェイズ (End Phase)</Strong>
            <ul className="list-disc list-outside ml-4 mt-1 space-y-1">
              <ListItem>待機していたMカード（小隊フィールドに残っていたカード）は全て持ち主の捨て札となります。</ListItem>
              <ListItem>ターンが終了し、相手プレイヤーのターンに移り、編成フェイズから繰り返します。</ListItem>
            </ul>
          </li>
        </ol>
      </RuleSection>

      <RuleSection id="field-explanation" japaneseTitle="フィールドの説明" englishTitle="Field Explanation">
        <ul className="list-none space-y-3 pl-0">
          <ListItem><Strong>山札 (Deck):</Strong> ゲーム開始時に用意するカードの束。ここからカードを引きます。</ListItem>
          <ListItem><Strong>手札 (Hand):</Strong> プレイヤーが引いて持っているカード。ここからカードを使用したり配置したりします。</ListItem>
          <ListItem><Strong>小隊フィールド (Squad Field):</Strong> 編成フェイズでMカードを裏向きで配置する場所。最大3枚まで。</ListItem>
          <ListItem><Strong>最前線フィールド (Battlefront Field):</Strong> 出陣フェイズで小隊から移動してきたMカードが置かれる戦闘場所。</ListItem>
          <ListItem><Strong>敗北フィールド (Defeat Pile):</Strong> 敗戦ポイントとなったカードが置かれる場所。ここのカード枚数が敗戦ポイントとなります。</ListItem>
          <ListItem><Strong>捨て札置き場 (Discard Pile):</Strong> 使用済み、または効果で破壊されたカードが置かれる場所。</ListItem>
          <ListItem><Strong>地形カード置き場 (Terrain Card Slot):</Strong> 出陣フェイズで引かれた地形カードが置かれる場所。現在の戦場の地形を示します。</ListItem>
        </ul>
      </RuleSection>

      <RuleSection id="terrain-effects" japaneseTitle="地形効果について" englishTitle="Terrain Effects">
        <Paragraph>
          戦場の地形は、出陣フェイズで引かれる地形カードによって決定されます。地形カードには「宇」「陸」「海」「空」「宇陸海空」（全地形）などの地形属性が記されています。
        </Paragraph>
        <Paragraph>
          Mカードは、自身の持つ「地形適性」と戦場の「地形属性」が一致（一つでも適性があれば可）しなければ、最前線フィールドに出撃できません。
        </Paragraph>
        <Paragraph>
          Cカードも同様に、カードに記された「効果地形」と戦場の「地形属性」が一致しなければ、原則として使用できません。（効果テキストに「地形に関わらず使用可能」などの記述がある場合は例外）
        </Paragraph>
        <Table>
          <thead>
            <tr><Th>地形アイコン</Th><Th>日本語</Th><Th>英語</Th><Th>説明</Th></tr>
          </thead>
          <tbody>
            <tr><Td>宇</Td><Td>宇宙</Td><Td>Space</Td><Td>宇宙空間での戦闘に適性/効果。</Td></tr>
            <tr><Td>陸</Td><Td>地上</Td><Td>Land</Td><Td>陸上での戦闘に適性/効果。</Td></tr>
            <tr><Td>海</Td><Td>水中・海上</Td><Td>Water/Sea</Td><Td>水中や海上での戦闘に適性/効果。</Td></tr>
            <tr><Td>空</Td><Td>空中</Td><Td>Air/Sky</Td><Td>空中での戦闘に適性/効果。</Td></tr>
            <tr><Td>宇陸海空</Td><Td>全地形</Td><Td>All Terrains</Td><Td>あらゆる地形で適性/効果を持つ。</Td></tr>
          </tbody>
        </Table>
      </RuleSection>

      <RuleSection id="combat-rules" japaneseTitle="戦闘について" englishTitle="Combat Rules">
        <SubHeading id="calculating-combat-points">戦闘ポイントの計算</SubHeading>
        <Paragraph>
          各プレイヤーの戦闘ポイントは、最前線フィールドに出ているMカードの「ポイント(P)」の合計です。
        </Paragraph>
        <Paragraph>
          さらに、Mカードはその「タグ」が自軍の他のMカード（同じく最前線フィールドにいるもの）のタグと一致する場合、その一致したタグの総数だけポイントが加算されます。例えば、カードAが「タグ1 タグ2」を持ち、カードBが「タグ1 タグ3」を同じ戦場に持っている場合、カードAは+1ポイント（カードBとの「タグ1」の一致により）、カードBも+1ポイント（カードAとの「タグ1」の一致により）を得ます。この計算は各カード個別に行われます。
        </Paragraph>
        <Paragraph>
          特定のMカードの組み合わせ（例：同一ナンバーのカード3枚、キラカード3枚など）が最前線フィールドに揃うことで「コンボ」が成立し、追加の戦闘ポイントが得られます。詳細は「コンボルール」を参照してください。
        </Paragraph>
        <Paragraph>
          カウンター／支援フェイズでは、Cカードの効果によってこの戦闘ポイントが増減します。
        </Paragraph>
        <SubHeading id="winning-combat">戦闘の勝敗</SubHeading>
        <Paragraph>
          カウンター／支援フェイズ終了後、最終的な戦闘ポイントを比較し、数値が大きい側が勝利となります。
        </Paragraph>
        <Paragraph>
          勝利した側は、敗北した側に、敗北した側の最前線Mカード枚数分の敗戦ポイントを与えます。
        </Paragraph>
        <Paragraph>
          例：プレイヤーAが戦闘ポイント15、プレイヤーBが戦闘ポイント10で、プレイヤーBの最前線にMカードが2枚あった場合、プレイヤーAの勝利。プレイヤーBは敗戦ポイント2点を受けます。
        </Paragraph>
        <SubHeading id="combo-rules">コンボルール</SubHeading>
        <Paragraph>
          特定の条件を満たすMカードが最前線フィールドに3枚揃った場合、以下のコンボが成立し、対応するポイントが戦闘力に加算されます。これらのコンボは条件を満たせば複数同時に成立することもあります。
        </Paragraph>
        <Table>
          <thead>
            <tr><Th>コンボ名称</Th><Th>成立条件</Th><Th>加算ポイント</Th></tr>
          </thead>
          <tbody>
            <tr><Td>トリプルキラコンボ</Td><Td>同一ナンバーのキラカード（Varが "Ki" で始まるカード）が前線フィールドに3枚。</Td><Td>+10</Td></tr>
            <tr><Td>トリプルGコンボ</Td><Td>同一ナンバーかつ「ガンダム系」タグを持つカードが前線フィールドに3枚。</Td><Td>+8</Td></tr>
            <tr><Td>大将軍コンボ</Td><Td>「大将軍」タグを持つカードが前線フィールドに3枚。</Td><Td>+8</Td></tr>
            <tr><Td>闇コンボ</Td><Td>「闇の支配者」タグを持つカードが前線フィールドに3枚。</Td><Td>+8</Td></tr>
            <tr><Td>トリプルコンボ</Td><Td>同一ナンバーのカードが前線フィールドに3枚。</Td><Td>+7</Td></tr>
            <tr><Td>キラコンボ</Td><Td>キラカード（Varが "Ki" で始まるカード）が前線フィールドに3枚。</Td><Td>+5</Td></tr>
            <tr><Td>機体系コンボ</Td><Td>同一の「〇〇系」タグ（例：「ガンダム系」）を持つカードが前線フィールドに3枚。</Td><Td>+5</Td></tr>
            <tr><Td>パイロットコンボ</Td><Td>同一の「〇〇専用機」タグ（例：「シャア専用機」）を持つカードが前線フィールドに3枚。</Td><Td>+5</Td></tr>
          </tbody>
        </Table>
      </RuleSection>

      <RuleSection id="special-rules" japaneseTitle="特殊なルール" englishTitle="Special Rules">
        <SubHeading id="hand-limit">手札制限</SubHeading>
        <Paragraph>手札は常に7枚が上限です。編成フェイズやカウンター／支援フェイズでカードを引いた結果、手札が8枚以上になった場合、ただちに余分なカードを選んで捨て札にしなければなりません。</Paragraph>
        <SubHeading id="deck-out">山札切れ</SubHeading>
        <Paragraph>いずれかのフェイズでカードを引く際、山札が0枚で引けない場合、そのプレイヤーは即座にゲームに敗北します。</Paragraph>
        <SubHeading id="simultaneous-actions">同時処理の原則</SubHeading>
        <Paragraph>基本的に効果や処理はテキストに書かれた順番に解決されますが、もし両プレイヤーが同時に何かを行う指示がある場合は、ターンプレイヤー（編成フェイズや出陣フェイズの主導権を持つ側）から先に行動します。</Paragraph>
      </RuleSection>
    </>
  );
};

export const RulePage: React.FC = () => {
  return <RuleContent />;
};

// Helper function to safely get string value from TSV (CSV)
const getString = (value: any): string => (value !== undefined && value !== null ? String(value) : '');
