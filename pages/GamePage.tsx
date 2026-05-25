
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BattleSummary, Card, GameState, PlayerType, CPUAction, LogEntry } from '../types';
import { parseMobilePowersTsvData, tsvData as allCardsTsvData } from '../components/RulePage';
import { CardCollectionModal, GameOverModal, LargeCardModal } from '../components/game/GameModals';
import { GamePageContext } from '../components/game/GamePageContext';
import { GameTableLayout } from '../components/game/GameTableLayout';
import * as cpuLogicService from '../services/cpuLogicService';
import { createFullCardInstancePool, generateCompressedDeckCode, parseCompressedDeckCode } from '../utils/deckCodeUtils';
import { cpuDeckPresets } from '../data/cpuDecks'; // Import CPU presets to find by code if needed, though MainMenu should resolve ID to code.
import {
  applyCCardEffect,
  calculateTagBonus,
  canDeploy,
  canPlayCCard,
  checkCombos,
  drawCards,
  getCCardTargetCandidates,
  getCCardTargetMode,
  getPhaseInstruction,
  getTagBonusDetails,
  initialPlayerState,
  isPlayerInteractivePhase,
  shuffleDeck,
} from '../utils/gameRules';


interface GamePageProps {
  onExit: () => void;
  initialDeckCode?: string; // For player
  initialCpuDeckCode?: string; // For CPU
}

const customScrollbarAndAnimationStyles = `
  html.game-scroll-locked,
  body.game-scroll-locked {
    width: 100%;
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
  }
  .game-screen {
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
    overscroll-behavior: none;
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    background:
      linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(226, 232, 240, 0.98)),
      #eef2f7;
    padding-top: max(0.375rem, env(safe-area-inset-top));
    padding-right: max(0.375rem, env(safe-area-inset-right));
    padding-bottom: max(0.375rem, env(safe-area-inset-bottom));
    padding-left: max(0.375rem, env(safe-area-inset-left));
  }
  @supports not (height: 100dvh) {
    .game-screen {
      height: 100vh;
      min-height: 100vh;
      max-height: 100vh;
    }
  }
  .game-board-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.5rem;
    align-items: stretch;
  }
  .game-topbar {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 8px;
    padding: 0.35rem 0.5rem;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  }
  .game-table-layout {
    position: relative;
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(4.75rem, 1fr) auto minmax(4.75rem, 1fr) minmax(7rem, auto);
    gap: 0.375rem;
    touch-action: none;
  }
  .game-mobile-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .game-fullscreen-button {
    border-radius: 6px;
    border: 1px solid rgba(15, 23, 42, 0.22);
    background: #0f172a;
    color: #f8fafc;
    padding: 0.22rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1.2;
    white-space: nowrap;
  }
  .game-fullscreen-button:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .game-exit-button {
    background: #ef4444;
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 10px rgba(127, 29, 29, 0.18);
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.15;
  }
  .game-orientation-guard {
    display: none;
  }
  .game-orientation-icon {
    width: 3.5rem;
    height: 5.2rem;
    border: 3px solid rgba(248, 250, 252, 0.92);
    border-radius: 12px;
    position: relative;
    transform: rotate(90deg);
    box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.28), 0 18px 44px rgba(15, 23, 42, 0.35);
  }
  .game-orientation-icon::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0.28rem;
    width: 0.32rem;
    height: 0.32rem;
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.92);
    transform: translateX(-50%);
  }
  @media (orientation: portrait) and (max-width: 900px) {
    .game-orientation-guard {
      position: fixed;
      inset: 0;
      z-index: 260;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 1.5rem;
      color: #f8fafc;
      text-align: center;
      background:
        linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.96)),
        #020617;
    }
    .game-orientation-guard strong {
      font-size: 1.35rem;
      line-height: 1.3;
    }
    .game-orientation-guard span {
      max-width: 18rem;
      color: #cbd5e1;
      font-size: 0.88rem;
      line-height: 1.55;
    }
    .game-orientation-guard .game-fullscreen-button {
      padding: 0.55rem 0.9rem;
      font-size: 0.86rem;
      background: #0284c7;
      border-color: rgba(125, 211, 252, 0.55);
    }
    .game-table-layout {
      filter: blur(2px);
      pointer-events: none;
    }
  }
  .game-opponent-strip,
  .game-player-dock,
  .game-center-strip,
  .game-field-lane {
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(148, 163, 184, 0.42);
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  }
  .game-opponent-strip {
    min-height: 2.2rem;
    display: grid;
    grid-template-columns: minmax(6rem, auto) minmax(0, 1fr) minmax(9rem, auto);
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  .game-opponent-identity,
  .game-player-zones,
  .game-zone-buttons {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    white-space: nowrap;
  }
  .game-strip-title {
    font-weight: 700;
    color: #0369a1;
  }
  .game-hidden-hand {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }
  .game-card-back {
    width: 1.25rem;
    height: 1.7rem;
    margin-left: -0.35rem;
    border-radius: 4px;
    border: 1px solid rgba(30, 64, 175, 0.55);
    background: #1d4ed8 url('/assets/card-back.png') center / cover no-repeat;
    box-shadow: 0 2px 5px rgba(15, 23, 42, 0.18);
  }
  .game-card-back:first-child {
    margin-left: 0;
  }
  .game-hand-count {
    margin-left: 0.4rem;
    font-weight: 700;
    color: #334155;
  }
  .game-deck-count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .game-deck-stack {
    width: 1.05rem;
    height: 1.45rem;
    display: inline-block;
    flex: 0 0 auto;
    border-radius: 3px;
    background: #1d4ed8 url('/assets/card-back.png') center / cover no-repeat;
    box-shadow:
      2px 0 0 rgba(30, 41, 59, 0.22),
      4px 0 0 rgba(30, 41, 59, 0.12);
  }
  .game-zone-button,
  .game-action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.55);
    padding: 0.2rem 0.45rem;
    font-weight: 700;
    line-height: 1.15;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .game-zone-button:disabled,
  .game-action-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  .game-zone-button:not(:disabled):hover,
  .game-action-button:not(:disabled):hover {
    transform: translateY(-1px);
  }
  .game-zone-button-player {
    background: #e0f2fe;
    color: #0369a1;
  }
  .game-zone-button-cpu {
    background: #fee2e2;
    color: #b91c1c;
  }
  .game-field-lane {
    min-height: 0;
    padding: 0.35rem;
    overflow: hidden;
    touch-action: none;
  }
  .game-lane-surface {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 7px;
    border: 1px dashed rgba(148, 163, 184, 0.55);
    overflow: hidden;
    touch-action: none;
  }
  .game-lane-attention {
    animation: lane-border-focus 0.92s ease-out;
  }
  .game-lane-player .game-lane-surface {
    background: rgba(239, 246, 255, 0.84);
  }
  .game-lane-cpu .game-lane-surface {
    background: rgba(254, 242, 242, 0.84);
  }
  .game-field-card {
    position: relative;
    flex: 0 0 auto;
    transition: opacity 0.18s ease, transform 0.18s ease;
  }
  .game-field-card-squad {
    z-index: 2;
    opacity: 0.86;
  }
  .game-field-card-battlefield {
    z-index: 3;
    opacity: 1;
  }
  .game-stage-formation .game-field-card-squad {
    opacity: 1;
    transform: none;
  }
  .game-stage-deployment .game-field-card-squad,
  .game-stage-battle .game-field-card-squad {
    opacity: 0.68;
    transform: none;
  }
  .game-lane-badge {
    position: absolute;
    left: 0.25rem;
    top: 0.2rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.78);
    color: rgba(51, 65, 85, 0.62);
    font-size: 0.6rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.18rem 0.35rem;
    pointer-events: none;
    white-space: nowrap;
  }
  .game-lane-badge-front {
    background: rgba(15, 23, 42, 0.72);
    color: white;
  }
  .game-lane-player .game-lane-badge-front {
    top: 0.2rem;
    right: 0.25rem;
    left: auto;
  }
  .game-lane-player .game-lane-badge-squad {
    top: auto;
    bottom: 0.2rem;
  }
  .game-lane-cpu .game-lane-badge-front {
    top: auto;
    bottom: 0.2rem;
    right: 0.25rem;
    left: auto;
  }
  .game-lane-cpu .game-lane-badge-squad {
    top: 0.2rem;
  }
  .game-drop-ready {
    outline: 2px solid rgba(34, 197, 94, 0.75);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
  }
  .game-field-card-targetable {
    z-index: 8;
  }
  .game-card-targetable {
    cursor: crosshair;
    outline: 3px solid rgba(250, 204, 21, 0.95);
    outline-offset: 2px;
    box-shadow:
      0 0 0 5px rgba(250, 204, 21, 0.18),
      0 8px 20px rgba(15, 23, 42, 0.18);
  }
  .game-table-layout .game-card-size,
  .game-zone-button,
  .game-action-button,
  .game-fullscreen-button,
  .game-exit-button {
    -webkit-tap-highlight-color: transparent;
  }
  .game-table-layout .game-card-size {
    touch-action: none;
    -webkit-touch-callout: none;
  }
  .game-screen .kira-border-animated {
    isolation: isolate;
    border-color: transparent !important;
  }
  .game-screen .kira-border-animated::before {
    z-index: 0;
    pointer-events: none;
  }
  .game-screen .kira-border-animated > * {
    position: relative;
    z-index: 1;
  }
  .game-lane-cards {
    position: absolute;
    inset: 0.25rem 0.4rem;
    z-index: 1;
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    gap: 0.55rem;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.1rem 0.2rem;
  }
  .game-lane-cards .game-field-card {
    width: clamp(4.25rem, 7vw, 8.5rem);
    height: auto;
    max-height: 12rem;
    aspect-ratio: 5 / 7;
    flex: 0 0 auto;
  }
  .game-table-layout .game-card-size:hover,
  .game-table-layout .game-card-size:focus-visible {
    position: relative;
    z-index: 20;
    transform: translateY(-2px) scale(1.08);
    transform-origin: center;
  }
  .game-card-hover-preview {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 160;
    width: min(19rem, 28vw);
    pointer-events: none;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.22);
    background: rgba(248, 250, 252, 0.96);
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.28);
    padding: 0.55rem;
  }
  .game-card-hover-preview img,
  .game-card-hover-fallback {
    width: 100%;
    aspect-ratio: 5 / 7;
    object-fit: contain;
    border-radius: 8px;
    background: #e2e8f0;
  }
  .game-card-hover-fallback {
    display: grid;
    place-items: center;
    color: #475569;
    font-size: 3rem;
    font-weight: 900;
  }
  .game-card-hover-copy {
    display: grid;
    gap: 0.15rem;
    margin-top: 0.45rem;
    font-size: 0.75rem;
    color: #334155;
  }
  .game-card-hover-copy strong,
  .game-card-hover-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .game-attention-flash {
    animation: attention-flash 0.72s ease-out;
  }
  .game-center-strip {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(9rem, 1fr) minmax(4rem, auto) minmax(10rem, 1.1fr) minmax(4rem, auto) minmax(18rem, 1.25fr);
    grid-template-rows: auto auto;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.35rem;
  }
  .game-phase-banner {
    grid-column: 1 / 2;
    grid-row: 1 / 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    padding: 0.25rem 0.45rem;
    font-size: 0.78rem;
    font-weight: 700;
    text-align: center;
  }
  .game-target-note {
    display: block;
    width: 100%;
    margin-top: 0.16rem;
    color: #854d0e;
    font-size: 0.62rem;
    line-height: 1.15;
  }
  .game-score-node,
  .game-terrain-node,
  .game-log-node,
  .game-selected-node {
    border-radius: 7px;
    border: 1px solid rgba(148, 163, 184, 0.42);
    background: rgba(248, 250, 252, 0.86);
  }
  .game-score-node {
    display: grid;
    place-items: center;
    min-width: 3.8rem;
    padding: 0.2rem 0.4rem;
  }
  .game-score-label {
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0;
  }
  .game-score-value {
    font-size: clamp(1.45rem, 3vw, 2.35rem);
    font-weight: 900;
    line-height: 0.95;
  }
  .game-terrain-node {
    display: grid;
    place-items: center;
    padding: 0.25rem 0.45rem;
    text-align: center;
  }
  .game-terrain-name,
  .game-unilateral-text {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 800;
    color: #475569;
  }
  .game-terrain-attr,
  .game-terrain-empty {
    font-size: 0.68rem;
    color: #64748b;
  }
  .game-log-node {
    grid-column: 2 / 5;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    padding: 0.25rem 0.45rem;
    font-size: 0.68rem;
    color: #0369a1;
  }
  .game-log-node p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .game-selected-node {
    grid-column: 5 / 6;
    grid-row: 1 / 3;
    min-width: 0;
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.45rem;
    font-size: 0.68rem;
  }
  .game-combo-pulse {
    animation: combo-pulse 1.1s ease-out;
  }
  .game-battle-animation {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: grid;
    place-items: center;
    padding: 2rem;
    pointer-events: auto;
    background:
      radial-gradient(circle at 50% 42%, rgba(248, 250, 252, 0.16), transparent 28rem),
      rgba(2, 6, 23, 0.58);
    animation: battle-overlay-in 0.22s ease-out;
  }
  .game-battle-panel {
    width: min(62rem, 92vw);
    height: min(34rem, 82vh);
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr);
    overflow: hidden;
    border-radius: 10px;
    border: 1px solid rgba(226, 232, 240, 0.55);
    background: rgba(15, 23, 42, 0.82);
    box-shadow: 0 26px 80px rgba(2, 6, 23, 0.6);
  }
  .game-battle-header {
    height: 2.3rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0 0.85rem;
    color: #e2e8f0;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0;
    background: rgba(15, 23, 42, 0.78);
  }
  .game-battle-header.game-battle-result-player {
    background: linear-gradient(90deg, rgba(14, 165, 233, 0.72), rgba(15, 23, 42, 0.78));
  }
  .game-battle-header.game-battle-result-cpu {
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.72), rgba(15, 23, 42, 0.78));
  }
  .game-battle-header.game-battle-result-draw {
    background: linear-gradient(90deg, rgba(234, 179, 8, 0.72), rgba(15, 23, 42, 0.78));
  }
  .game-battle-header strong {
    margin-left: auto;
    font-size: 1.25rem;
    color: #f8fafc;
  }
  .game-battle-confirm-button {
    flex: 0 0 auto;
    border-radius: 999px;
    border: 1px solid rgba(248, 250, 252, 0.45);
    background: rgba(248, 250, 252, 0.92);
    color: #0f172a;
    padding: 0.24rem 0.7rem;
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1;
    box-shadow: 0 0 18px rgba(248, 250, 252, 0.18);
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .game-battle-confirm-button:hover,
  .game-battle-confirm-button:focus-visible {
    background: #ffffff;
    transform: translateY(-1px);
  }
  .game-battle-scoreboard {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 0.65rem;
    padding: 0.5rem 0.75rem;
    background:
      linear-gradient(90deg, rgba(14, 165, 233, 0.15), rgba(15, 23, 42, 0.68) 44%, rgba(239, 68, 68, 0.14)),
      rgba(15, 23, 42, 0.72);
    border-bottom: 1px solid rgba(226, 232, 240, 0.2);
  }
  .game-battle-score-card {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(3.5rem, auto) auto minmax(3.2rem, auto);
    align-items: center;
    gap: 0.45rem;
    border-radius: 8px;
    border: 1px solid rgba(226, 232, 240, 0.22);
    padding: 0.35rem 0.55rem;
    color: #e2e8f0;
    background: rgba(15, 23, 42, 0.62);
  }
  .game-battle-score-card span {
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0;
  }
  .game-battle-score-card strong {
    font-size: clamp(1.55rem, 4vw, 2.45rem);
    line-height: 0.9;
    color: #f8fafc;
    text-align: center;
  }
  .game-battle-score-card em {
    justify-self: end;
    border-radius: 999px;
    padding: 0.16rem 0.45rem;
    font-size: 0.66rem;
    font-style: normal;
    font-weight: 900;
    background: rgba(148, 163, 184, 0.18);
  }
  .game-battle-score-player {
    border-color: rgba(56, 189, 248, 0.34);
  }
  .game-battle-score-cpu {
    border-color: rgba(251, 113, 133, 0.34);
  }
  .game-battle-score-winner {
    transform: scale(1.03);
    box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.32), 0 0 28px rgba(250, 204, 21, 0.26);
  }
  .game-battle-score-loser {
    opacity: 0.62;
    filter: grayscale(0.25);
  }
  .game-battle-result-badge {
    display: grid;
    place-items: center;
    min-width: 7.2rem;
    min-height: 2.45rem;
    border-radius: 999px;
    border: 1px solid rgba(248, 250, 252, 0.42);
    padding: 0 0.8rem;
    color: #f8fafc;
    font-size: 0.88rem;
    font-weight: 900;
    white-space: nowrap;
    box-shadow: 0 0 22px rgba(248, 250, 252, 0.14);
    animation: battle-result-pop 10s ease-out forwards;
  }
  .game-battle-result-player {
    background: rgba(14, 165, 233, 0.75);
  }
  .game-battle-result-cpu {
    background: rgba(239, 68, 68, 0.78);
  }
  .game-battle-result-draw {
    background: rgba(202, 138, 4, 0.78);
  }
  .game-battle-summary {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(11rem, 0.82fr) minmax(0, 1fr);
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: #e2e8f0;
    background:
      linear-gradient(90deg, rgba(14, 165, 233, 0.1), rgba(15, 23, 42, 0.7) 50%, rgba(239, 68, 68, 0.1)),
      rgba(15, 23, 42, 0.76);
    border-bottom: 1px solid rgba(226, 232, 240, 0.2);
  }
  .game-battle-summary-side,
  .game-battle-events {
    min-width: 0;
    border-radius: 8px;
    border: 1px solid rgba(226, 232, 240, 0.2);
    background: rgba(15, 23, 42, 0.54);
    padding: 0.42rem 0.5rem;
  }
  .game-battle-summary-player {
    border-color: rgba(56, 189, 248, 0.34);
  }
  .game-battle-summary-cpu {
    border-color: rgba(251, 113, 133, 0.34);
  }
  .game-battle-summary-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    margin-bottom: 0.28rem;
    font-size: 0.68rem;
    font-weight: 900;
  }
  .game-battle-summary-title strong {
    font-size: 1rem;
    color: #f8fafc;
  }
  .game-battle-summary-cards {
    display: grid;
    gap: 0.2rem;
  }
  .game-battle-summary-card {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.35rem;
    border-radius: 5px;
    background: rgba(248, 250, 252, 0.08);
    padding: 0.16rem 0.28rem;
    font-size: 0.64rem;
  }
  .game-battle-card-name {
    min-width: 0;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 0;
    text-align: left;
    cursor: zoom-in;
  }
  .game-battle-card-name:hover,
  .game-battle-card-name:focus-visible {
    color: #f8fafc;
    text-decoration: underline;
    text-underline-offset: 2px;
    outline: none;
  }
  .game-battle-card-name,
  .game-battle-combo-line,
  .game-battle-events p {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .game-battle-card-points {
    color: #f8fafc;
    font-weight: 900;
  }
  .game-battle-summary-empty {
    color: #94a3b8;
    font-size: 0.64rem;
  }
  .game-battle-combo-line {
    margin-top: 0.22rem;
    color: #fde68a;
    font-size: 0.62rem;
    font-weight: 800;
  }
  .game-battle-formula {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2rem;
    margin-top: 0.28rem;
    color: #cbd5e1;
    font-size: 0.62rem;
    font-weight: 800;
  }
  .game-battle-formula span:last-child {
    color: #f8fafc;
  }
  .game-battle-formula-operator {
    color: #64748b;
  }
  .game-battle-events {
    display: grid;
    align-content: start;
    gap: 0.18rem;
  }
  .game-battle-events-title {
    color: #f8fafc;
    font-size: 0.66rem;
    font-weight: 900;
  }
  .game-battle-events p {
    color: #cbd5e1;
    font-size: 0.58rem;
    line-height: 1.25;
  }
  .game-battle-layer-stack {
    position: relative;
    min-height: 0;
    display: grid;
    grid-auto-rows: 1fr;
  }
  .game-battle-card-strip {
    position: absolute;
    inset: 0.45rem 0.75rem auto 0.75rem;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    pointer-events: none;
  }
  .game-battle-card-strip-side {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    max-width: min(42%, 18rem);
    pointer-events: auto;
  }
  .game-battle-card-strip-player {
    justify-content: flex-start;
  }
  .game-battle-card-strip-cpu {
    justify-content: flex-end;
  }
  .game-battle-mini-card {
    width: clamp(2.15rem, 4.2vw, 3.35rem);
    aspect-ratio: 5 / 7;
    flex: 0 0 auto;
    overflow: hidden;
    border-radius: 5px;
    border: 1px solid rgba(248, 250, 252, 0.62);
    background: rgba(15, 23, 42, 0.7);
    box-shadow: 0 8px 22px rgba(2, 6, 23, 0.36);
    cursor: zoom-in;
  }
  .game-battle-mini-card:hover,
  .game-battle-mini-card:focus-visible {
    outline: 2px solid rgba(250, 204, 21, 0.86);
    outline-offset: 2px;
  }
  .game-battle-mini-card img,
  .game-battle-mini-fallback {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: grid;
    place-items: center;
    color: #e2e8f0;
    font-size: 0.8rem;
    font-weight: 900;
  }
  .game-battle-layer {
    position: relative;
    min-height: 0;
    overflow: hidden;
    background-image:
      linear-gradient(90deg, rgba(14, 165, 233, 0.28), transparent 36%, transparent 64%, rgba(239, 68, 68, 0.24)),
      url('/assets/battle-terrain-layers.png');
    background-size: 100% 400%;
    animation: battle-layer-pan 10s linear;
  }
  .game-battle-layer::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.42)),
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 24px);
    mix-blend-mode: screen;
    opacity: 0.38;
  }
  .game-battle-layer-space {
    background-position: center 0%;
  }
  .game-battle-layer-sky {
    background-position: center 33.333%;
  }
  .game-battle-layer-land {
    background-position: center 66.666%;
  }
  .game-battle-layer-sea {
    background-position: center 100%;
  }
  .game-battle-layer-label {
    position: absolute;
    left: 0.75rem;
    top: 0.5rem;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.72);
    color: #f8fafc;
    font-weight: 900;
    box-shadow: 0 0 0 1px rgba(226, 232, 240, 0.42);
  }
  .game-battle-unit,
  .game-battle-beam,
  .game-battle-burst,
  .game-battle-clash {
    position: absolute;
    z-index: 3;
    top: 50%;
    transform: translateY(-50%);
  }
  .game-battle-unit {
    width: 0.72rem;
    height: 0.72rem;
    border-radius: 999px;
    box-shadow: 0 0 18px currentColor, 0 0 4px #fff inset;
  }
  .game-battle-unit-player {
    left: 17%;
    color: #38bdf8;
    animation: battle-unit-player 10s ease-in-out infinite;
  }
  .game-battle-unit-cpu {
    right: 17%;
    color: #fb7185;
    animation: battle-unit-cpu 10s ease-in-out infinite;
  }
  .game-battle-beam {
    height: 2px;
    width: var(--beam-width, 34%);
    opacity: 0;
    transform-origin: center;
    filter: drop-shadow(0 0 6px currentColor);
  }
  .game-battle-beam-chaos {
    left: var(--beam-left, 50%);
    top: var(--beam-top, 50%);
    color: var(--beam-color, #67e8f9);
    background: linear-gradient(90deg, transparent, currentColor 14%, #f8fafc 50%, currentColor 86%, transparent);
    transform: translate(-50%, -50%) rotate(var(--beam-angle, 0deg)) scaleX(0.18);
    animation: battle-beam-chaos var(--beam-duration, 1.2s) linear infinite;
    animation-delay: var(--beam-delay, 0s);
  }
  .game-battle-beam-chaos-1 {
    --beam-left: 30%;
    --beam-top: 30%;
    --beam-width: 58%;
    --beam-angle: 12deg;
    --beam-color: #67e8f9;
    --beam-duration: 0.92s;
    --beam-delay: -0.12s;
  }
  .game-battle-beam-chaos-2 {
    --beam-left: 68%;
    --beam-top: 36%;
    --beam-width: 52%;
    --beam-angle: -18deg;
    --beam-color: #fda4af;
    --beam-duration: 1.08s;
    --beam-delay: -0.46s;
  }
  .game-battle-beam-chaos-3 {
    --beam-left: 44%;
    --beam-top: 62%;
    --beam-width: 70%;
    --beam-angle: 5deg;
    --beam-color: #a5f3fc;
    --beam-duration: 1.18s;
    --beam-delay: -0.74s;
  }
  .game-battle-beam-chaos-4 {
    --beam-left: 54%;
    --beam-top: 48%;
    --beam-width: 48%;
    --beam-angle: -31deg;
    --beam-color: #fecdd3;
    --beam-duration: 0.98s;
    --beam-delay: -0.28s;
  }
  .game-battle-beam-chaos-5 {
    --beam-left: 27%;
    --beam-top: 76%;
    --beam-width: 50%;
    --beam-angle: -10deg;
    --beam-color: #fef08a;
    --beam-duration: 1.24s;
    --beam-delay: -0.62s;
  }
  .game-battle-beam-chaos-6 {
    --beam-left: 78%;
    --beam-top: 66%;
    --beam-width: 42%;
    --beam-angle: 24deg;
    --beam-color: #fda4af;
    --beam-duration: 1.02s;
    --beam-delay: -0.88s;
  }
  .game-battle-beam-chaos-7 {
    --beam-left: 38%;
    --beam-top: 19%;
    --beam-width: 46%;
    --beam-angle: 34deg;
    --beam-color: #bae6fd;
    --beam-duration: 1.16s;
    --beam-delay: -0.36s;
  }
  .game-battle-beam-chaos-8 {
    --beam-left: 63%;
    --beam-top: 82%;
    --beam-width: 56%;
    --beam-angle: -36deg;
    --beam-color: #fca5a5;
    --beam-duration: 1.1s;
    --beam-delay: -0.52s;
  }
  .game-battle-beam-chaos-9 {
    --beam-left: 51%;
    --beam-top: 52%;
    --beam-width: 76%;
    --beam-angle: -2deg;
    --beam-color: #fde68a;
    --beam-duration: 0.86s;
    --beam-delay: -0.2s;
  }
  .game-battle-beam-chaos-10 {
    --beam-left: 49%;
    --beam-top: 43%;
    --beam-width: 66%;
    --beam-angle: 20deg;
    --beam-color: #93c5fd;
    --beam-duration: 1.3s;
    --beam-delay: -0.96s;
  }
  .game-battle-burst {
    width: 3.8rem;
    height: 3.8rem;
    z-index: 5;
    border-radius: 999px;
    opacity: 0;
    background:
      radial-gradient(circle, rgba(255, 255, 255, 0.95) 0 10%, rgba(250, 204, 21, 0.9) 11% 25%, rgba(249, 115, 22, 0.72) 26% 47%, transparent 48%),
      radial-gradient(circle, rgba(239, 68, 68, 0.72), transparent 68%);
    filter: drop-shadow(0 0 18px rgba(251, 191, 36, 0.9));
    animation: battle-burst 0.9s ease-in-out 2s infinite;
  }
  .game-battle-burst::before,
  .game-battle-burst::after {
    content: '';
    position: absolute;
    inset: 22%;
    border-radius: 999px;
    border: 2px solid rgba(254, 240, 138, 0.78);
  }
  .game-battle-burst::after {
    inset: 8%;
    border-color: rgba(248, 113, 113, 0.55);
  }
  .game-battle-burst-player {
    left: 15.5%;
  }
  .game-battle-burst-cpu {
    right: 15.5%;
  }
  .game-battle-clash {
    left: 50%;
    width: 4rem;
    height: 4rem;
    z-index: 5;
    border-radius: 999px;
    opacity: 0.9;
    background:
      radial-gradient(circle, rgba(255, 255, 255, 0.95) 0 12%, rgba(250, 204, 21, 0.8) 13% 32%, rgba(14, 165, 233, 0.44) 33% 48%, rgba(248, 113, 113, 0.42) 49% 64%, transparent 65%);
    transform: translate(-50%, -50%) scale(0.2);
    filter: drop-shadow(0 0 22px rgba(250, 204, 21, 0.85));
    animation: battle-clash 0.95s ease-in-out infinite;
  }
  .game-selected-thumb {
    width: 3.65rem;
    aspect-ratio: 5 / 7;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 5px;
    background: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.55);
  }
  .game-selected-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .game-selected-copy {
    min-width: 0;
    display: grid;
    gap: 0.1rem;
  }
  .game-selected-copy strong,
  .game-selected-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .game-player-dock {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr);
    gap: 0.45rem;
    align-items: stretch;
    padding: 0.35rem;
  }
  .game-player-command-panel {
    align-self: stretch;
    min-width: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    align-content: center;
    gap: 0.25rem;
    border-radius: 7px;
    background: rgba(248, 250, 252, 0.82);
    border: 1px solid rgba(148, 163, 184, 0.35);
    padding: 0.3rem 0.45rem;
    font-size: 0.72rem;
  }
  .game-player-zones,
  .game-hand-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    align-content: center;
    gap: 0.35rem;
  }
  .game-player-zones {
    display: grid;
    justify-content: stretch;
    gap: 0.25rem;
  }
  .game-player-zone-row {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
  }
  .game-player-zone-summary {
    justify-content: flex-start;
  }
  .game-player-zone-links {
    justify-content: flex-start;
  }
  .game-hand-actions {
    justify-content: flex-start;
  }
  .game-action-primary {
    background: #22c55e;
    color: white;
    border-color: #16a34a;
  }
  .game-action-discard {
    background: #fb923c;
    color: white;
    border-color: #f97316;
  }
  .game-action-cancel {
    background: #e2e8f0;
    color: #334155;
    border-color: #cbd5e1;
  }
  .game-hand-scroll {
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 7px;
    background: rgba(241, 245, 249, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.42);
    padding: 0.35rem;
    overscroll-behavior-x: contain;
    touch-action: pan-x;
  }
  .game-table-layout .game-card-size {
    width: clamp(3rem, 5.2vw, 4.75rem);
    height: auto;
    aspect-ratio: 5 / 7;
    flex: 0 0 auto;
  }
  .game-lane-cards .game-card-size {
    width: 100%;
    height: 100%;
    max-width: none;
  }
  .game-stage-formation .game-lane-cards .game-field-card-squad {
    max-height: 12.5rem;
  }
  .game-stage-deployment .game-lane-cards .game-field-card-squad,
  .game-stage-battle .game-lane-cards .game-field-card-squad {
    width: clamp(3.75rem, 6vw, 7.25rem);
    height: auto;
    max-height: 9.5rem;
  }
  .game-field-slot {
    height: clamp(5.25rem, 17vh, 8.125rem);
    overflow-y: auto;
  }
  .game-hand-zone {
    min-height: clamp(7.25rem, 28vh, 15.125rem);
    max-height: clamp(7.25rem, 28vh, 15.125rem);
  }
  .game-card-size {
    width: 100%;
    aspect-ratio: 5 / 7;
  }
  @media (min-width: 640px) {
    .game-card-size {
      width: 5rem;
      height: 7rem;
    }
  }
  @media (min-width: 1024px) and (min-height: 700px) {
    .game-board-grid {
      grid-template-columns: minmax(0, 1.05fr) minmax(20rem, 0.95fr);
    }
  }
  @media (orientation: landscape) and (min-height: 521px) and (max-height: 820px) {
    .game-status-panel {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(0, 1fr);
      gap: 0.35rem;
      align-items: stretch;
    }
    .game-status-phase,
    .game-status-counts,
    .game-status-battle,
    .game-status-log {
      margin: 0;
    }
    .game-status-phase {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 2.4rem;
    }
    .game-status-counts {
      border-top: 0;
      border-bottom: 0;
      border-left: 1px solid rgba(148, 163, 184, 0.55);
      border-right: 1px solid rgba(148, 163, 184, 0.55);
      padding-inline: 0.45rem;
      font-size: 0.72rem;
    }
    .game-status-battle {
      min-height: 2.4rem;
    }
    .game-status-log {
      grid-column: 1 / -1;
      max-height: 3.1rem;
      padding: 0.3rem 0.5rem;
    }
    .game-field-slot {
      height: clamp(6rem, 16vh, 7.5rem);
    }
    .game-hand-zone {
      min-height: clamp(9rem, 24vh, 12rem);
      max-height: clamp(9rem, 24vh, 12rem);
    }
  }
  @media (orientation: landscape) and (max-height: 520px) {
    .game-screen {
      height: 100vh;
      overflow: hidden;
      padding: 0.375rem;
    }
    .game-topbar {
      margin-bottom: 0.25rem;
      padding: 0.25rem 0.45rem;
    }
    .game-board-grid {
      gap: 0.375rem;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    }
    .game-status-panel {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(0, 1fr);
      gap: 0.25rem;
      align-items: stretch;
      padding: 0.25rem;
    }
    .game-status-phase,
    .game-status-counts,
    .game-status-battle,
    .game-status-log {
      margin: 0;
    }
    .game-status-phase {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 2rem;
    }
    .game-status-counts {
      border-top: 0;
      border-bottom: 0;
      border-left: 1px solid rgba(148, 163, 184, 0.55);
      border-right: 1px solid rgba(148, 163, 184, 0.55);
      padding-inline: 0.35rem;
      font-size: 0.68rem;
    }
    .game-status-battle {
      min-height: 2rem;
    }
    .game-status-log {
      display: none;
    }
    .game-field-stack {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }
    .game-field-slot {
      height: clamp(3.5rem, 16vh, 4.75rem);
    }
    .game-hand-zone {
      min-height: clamp(4.75rem, 24vh, 7rem);
      max-height: clamp(4.75rem, 24vh, 7rem);
    }
    .game-card-size {
      width: clamp(2.4rem, 5.5vw, 4rem);
      height: auto;
      aspect-ratio: 5 / 7;
    }
    .game-table-layout {
      grid-template-rows: auto minmax(4.6rem, 1.25fr) auto minmax(4.6rem, 1.25fr) minmax(4.65rem, auto);
      gap: 0.2rem;
    }
    .game-opponent-strip {
      min-height: 1.85rem;
      grid-template-columns: minmax(4.5rem, auto) minmax(0, 1fr) minmax(6rem, auto);
      padding: 0.15rem 0.35rem;
      font-size: 0.65rem;
    }
    .game-card-back {
      width: 0.95rem;
      height: 1.3rem;
      margin-left: -0.25rem;
    }
    .game-field-lane {
      padding: 0.2rem;
    }
    .game-stage-deployment .game-field-card-squad,
    .game-stage-battle .game-field-card-squad {
      transform: none;
    }
    .game-lane-badge {
      font-size: 0.5rem;
      padding: 0.13rem 0.25rem;
    }
    .game-lane-cards,
    .game-hand-scroll {
      gap: 0.25rem;
    }
    .game-lane-cards {
      inset: 0.18rem 0.25rem;
      padding: 0.05rem 0.15rem;
    }
    .game-lane-cards .game-field-card {
      width: clamp(3rem, 6vw, 4.25rem);
      height: auto;
      max-height: 6.4rem;
    }
    .game-center-strip {
      grid-template-columns: minmax(7.5rem, 1fr) minmax(3.2rem, auto) minmax(7.5rem, 1fr) minmax(3.2rem, auto);
      grid-template-rows: auto auto;
      padding: 0.25rem;
      gap: 0.25rem;
    }
    .game-phase-banner {
      font-size: 0.68rem;
      padding: 0.15rem 0.3rem;
    }
    .game-score-node {
      min-width: 3.05rem;
    }
    .game-score-label {
      display: none;
    }
    .game-terrain-node {
      padding: 0.15rem 0.3rem;
    }
    .game-log-node {
      display: none;
    }
    .game-selected-node {
      display: none;
    }
    .game-player-dock {
      grid-template-columns: minmax(7.9rem, 8.75rem) minmax(0, 1fr);
      gap: 0.25rem;
      padding: 0.2rem;
    }
    .game-player-command-panel {
      gap: 0.25rem;
      padding: 0.2rem 0.3rem;
      font-size: 0.62rem;
    }
    .game-player-zones,
    .game-hand-actions {
      gap: 0.2rem;
    }
    .game-player-zone-row {
      gap: 0.25rem;
    }
    .game-zone-button,
    .game-action-button {
      padding: 0.16rem 0.3rem;
    }
    .game-table-layout .game-card-size {
      width: clamp(2.55rem, 6vw, 3.65rem);
    }
    .game-lane-cards .game-card-size {
      width: 100%;
      height: 100%;
    }
    .game-stage-formation .game-lane-cards .game-field-card-squad {
      max-height: 6.7rem;
    }
    .game-stage-deployment .game-lane-cards .game-field-card-squad,
    .game-stage-battle .game-lane-cards .game-field-card-squad {
      width: clamp(2.7rem, 5.2vw, 3.75rem);
      height: auto;
      max-height: 5.5rem;
    }
    .game-card-hover-preview {
      width: min(11rem, 26vw);
      right: 0.5rem;
      bottom: 0.5rem;
      padding: 0.35rem;
    }
    .game-card-hover-copy {
      display: none;
    }
    .game-battle-animation {
      padding: 0.8rem;
    }
    .game-battle-panel {
      width: min(42rem, 94vw);
      height: min(21.5rem, 86vh);
    }
    .game-battle-header {
      height: 1.8rem;
      font-size: 0.68rem;
    }
    .game-battle-header strong {
      font-size: 1rem;
    }
    .game-battle-confirm-button {
      padding: 0.2rem 0.45rem;
      font-size: 0.6rem;
    }
    .game-battle-scoreboard {
      gap: 0.35rem;
      padding: 0.35rem 0.45rem;
    }
    .game-battle-score-card {
      grid-template-columns: minmax(2.8rem, auto) auto;
      gap: 0.25rem;
      padding: 0.25rem 0.35rem;
    }
    .game-battle-score-card em {
      display: none;
    }
    .game-battle-score-card span {
      font-size: 0.58rem;
    }
    .game-battle-result-badge {
      min-width: 4.8rem;
      min-height: 1.85rem;
      padding: 0 0.45rem;
      font-size: 0.66rem;
    }
    .game-battle-summary {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 0.35rem;
      padding: 0.35rem 0.45rem;
    }
    .game-battle-events {
      display: none;
    }
    .game-battle-summary-side {
      padding: 0.28rem 0.35rem;
    }
    .game-battle-summary-title {
      margin-bottom: 0.18rem;
      font-size: 0.58rem;
    }
    .game-battle-summary-title strong {
      font-size: 0.78rem;
    }
    .game-battle-summary-card {
      padding: 0.12rem 0.22rem;
      font-size: 0.54rem;
    }
    .game-battle-card-strip {
      inset: 0.35rem 0.45rem auto 0.45rem;
      gap: 0.45rem;
    }
    .game-battle-card-strip-side {
      max-width: 46%;
      gap: 0.18rem;
    }
    .game-battle-mini-card {
      width: clamp(1.75rem, 6vw, 2.45rem);
      border-radius: 4px;
    }
    .game-battle-combo-line,
    .game-battle-formula {
      font-size: 0.52rem;
    }
  }
  .custom-scrollbar-xs::-webkit-scrollbar {
    width: 4px; /* Thinner scrollbar */
    height: 4px;
  }
  .custom-scrollbar-xs::-webkit-scrollbar-track {
    background: rgba(203, 213, 225, 0.5); /* slate-300/50 */
    border-radius: 2px;
  }
  .custom-scrollbar-xs::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.7); /* slate-400/70 */
    border-radius: 2px;
  }
  .custom-scrollbar-xs::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.7); /* slate-500/70 */
  }

  @keyframes blink-bg-player {
    0%, 100% { background-color: #7DD3FC; transform: scale(1.12); color: #0C4A6E; box-shadow: 0 0 15px #38BDF8; }
    50% { background-color: #0EA5E9; transform: scale(1); color: white; box-shadow: 0 0 5px #38BDF8;}
  }
  .blinking-winner-player {
    animation: blink-bg-player 0.7s infinite ease-in-out;
  }

  @keyframes blink-bg-cpu {
    0%, 100% { background-color: #FCA5A5; transform: scale(1.12); color: #7F1D1D; box-shadow: 0 0 15px #F87171; }
    50% { background-color: #EF4444; transform: scale(1); color: white; box-shadow: 0 0 5px #F87171; }
  }
  .blinking-winner-cpu {
    animation: blink-bg-cpu 0.7s infinite ease-in-out;
  }

  @keyframes blink-bg-draw {
    0%, 100% { background-color: #FEF08A; transform: scale(1.12); color: #713F12; box-shadow: 0 0 15px #FACC15; }
    50% { background-color: #FACC15; transform: scale(1); color: #422006; box-shadow: 0 0 5px #FACC15; }
  }
  .blinking-winner-draw {
    animation: blink-bg-draw 0.7s infinite ease-in-out;
  }

  @keyframes attention-flash {
    0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); filter: saturate(1); }
    20% { box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.34), 0 0 24px rgba(14, 165, 233, 0.22); filter: saturate(1.35); }
    100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); filter: saturate(1); }
  }
  @keyframes lane-border-focus {
    0% { border-color: rgba(148, 163, 184, 0.55); box-shadow: none; }
    24% { border-color: rgba(14, 165, 233, 0.9); box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.18), inset 0 0 28px rgba(14, 165, 233, 0.14); }
    100% { border-color: rgba(148, 163, 184, 0.55); box-shadow: none; }
  }
  @keyframes combo-pulse {
    0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
    22% { box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.34), 0 10px 34px rgba(250, 204, 21, 0.18); }
    100% { box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); }
  }
  @keyframes battle-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes battle-layer-pan {
    from { background-position-x: 48%; }
    to { background-position-x: 52%; }
  }
  @keyframes battle-result-pop {
    0%, 44% { transform: scale(0.94); box-shadow: 0 0 0 rgba(248, 250, 252, 0); }
    56% { transform: scale(1.08); box-shadow: 0 0 34px rgba(250, 204, 21, 0.38); }
    100% { transform: scale(1); box-shadow: 0 0 22px rgba(248, 250, 252, 0.14); }
  }
  @keyframes battle-unit-player {
    0%, 100% { transform: translate(0, -50%) scale(1); }
    35% { transform: translate(18%, -74%) scale(1.18); }
    70% { transform: translate(46%, -35%) scale(0.9); }
  }
  @keyframes battle-unit-cpu {
    0%, 100% { transform: translate(0, -50%) scale(1); }
    35% { transform: translate(-20%, -30%) scale(1.14); }
    70% { transform: translate(-44%, -68%) scale(0.94); }
  }
  @keyframes battle-beam-chaos {
    0%, 10%, 88%, 100% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--beam-angle, 0deg)) scaleX(0.12);
    }
    18%, 64% {
      opacity: 1;
      transform: translate(-50%, -50%) rotate(var(--beam-angle, 0deg)) scaleX(1);
    }
  }
  @keyframes battle-burst {
    0% { opacity: 0.52; transform: translateY(-50%) scale(0.76); }
    46% { opacity: 1; transform: translateY(-50%) scale(1.16); }
    100% { opacity: 0.66; transform: translateY(-50%) scale(0.92); }
  }
  @keyframes battle-clash {
    0% { opacity: 0.58; transform: translate(-50%, -50%) scale(0.72); }
    48% { opacity: 1; transform: translate(-50%, -50%) scale(1.18); }
    100% { opacity: 0.68; transform: translate(-50%, -50%) scale(0.9); }
  }
`;

const getCCardTargetInstruction = (card: Card | null): string | null => {
  if (!card) return null;
  if (card.cardNumber.startsWith('C-006')) return 'Cカード対象: 破壊候補の相手最前線Mカードを選択';
  if (card.cardNumber.startsWith('C-012')) return 'Cカード対象: 小隊へ戻す自軍最前線Mカードを選択';
  if (card.cardNumber.startsWith('C-015')) return 'Cカード対象: 海適性を持つ相手最前線Mカードを選択';
  if (card.cardNumber.startsWith('C-016')) return 'Cカード対象: 陸適性を持つ相手最前線Mカードを選択';
  return null;
};

const findLastCombatStartIndex = (gameLog: LogEntry[]): number => {
  for (let index = gameLog.length - 1; index >= 0; index--) {
    if (gameLog[index].message.includes('タグボーナス計算後')) {
      return index;
    }
  }
  return Math.max(0, gameLog.length - 18);
};

const getSupportLogSummaries = (gameLog: LogEntry[]): string[] => {
  const startIndex = findLastCombatStartIndex(gameLog);
  return gameLog
    .slice(startIndex)
    .filter(logEntry => {
      const message = logEntry.message;
      if (
        message.includes('タグボーナス') ||
        message.includes('コンボ適用後') ||
        message.includes('ポイントが低い') ||
        message.includes('カードを1枚引きました') ||
        message.includes('両者のカウンター') ||
        message.includes('戦闘力比較')
      ) {
        return false;
      }
      return (
        message.includes('を使用') ||
        message.includes('効果') ||
        message.includes('破壊') ||
        message.includes('追加') ||
        message.includes('戻し') ||
        message.includes('入れ換え') ||
        message.includes('ポイントを0') ||
        message.includes('半分') ||
        message.includes('不発') ||
        /[+-]\d+P/.test(message)
      );
    })
    .slice(-4)
    .map(logEntry => `${logEntry.source === 'PLAYER' ? 'PLAYER' : logEntry.source === 'CPU' ? 'CPU' : 'SYS'}: ${logEntry.message}`);
};

const createCombatSideSummary = (
  battlefield: Card[],
  finalTotal: number,
  ownerName: 'プレイヤー' | 'CPU',
) => {
  const displayTagLabel = (tag: string): string => tag.endsWith('専用機') ? tag.replace(/専用機$/, '') : tag;
  const summarizeTagDetails = (details: string[]): string => {
    const counts = details.reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([tag, count]) => count > 1 ? `${tag} x${count}` : tag)
      .join(' / ');
  };
  const mCards = battlefield.filter(card => card.type === 'M');
  const cards = mCards.map(card => {
    const basePoints = parseInt(card.points, 10) || 0;
    const tagDetails = getTagBonusDetails(card, mCards);
    const tagBonus = tagDetails.length;
    return {
      cardNumber: card.cardNumber,
      name: card.cardNameOmm || card.cardName,
      sourceCard: card,
      imageUrl: card.imageUrl,
      basePoints,
      tagBonus,
      tagDetails: tagDetails.map(detail => displayTagLabel(detail.tag)),
      total: basePoints + tagBonus,
      terrain: card.terrainTypeMCards || '-',
    };
  });
  const combos = checkCombos(mCards, ownerName).achievedCombos;
  const baseTotal = cards.reduce((total, card) => total + card.basePoints, 0);
  const tagTotal = cards.reduce((total, card) => total + card.tagBonus, 0);
  const comboTotal = combos.reduce((total, combo) => total + combo.points, 0);
  const supportDelta = finalTotal - baseTotal - tagTotal - comboTotal;

  return {
    cards,
    baseTotal,
    tagTotal,
    comboTotal,
    supportDelta,
    finalTotal,
    combos,
    tagLogs: cards
      .filter(card => card.tagBonus > 0)
      .map(card => `${ownerName}: ${card.name} タグ +${card.tagBonus} (${summarizeTagDetails(card.tagDetails)})`),
  };
};

const createBattleSummary = (player: GameState['player'], cpu: GameState['cpu'], gameLog: LogEntry[]): BattleSummary => {
  const playerSummary = createCombatSideSummary(player.battlefield, player.combatPoints, 'プレイヤー');
  const cpuSummary = createCombatSideSummary(cpu.battlefield, cpu.combatPoints, 'CPU');

  return {
    player: playerSummary,
    cpu: cpuSummary,
    cCardLogs: getSupportLogSummaries(gameLog),
    tagLogs: [...playerSummary.tagLogs, ...cpuSummary.tagLogs],
  };
};

export const GamePage: React.FC<GamePageProps> = ({ onExit, initialDeckCode, initialCpuDeckCode }) => {
  const gameScreenRef = useRef<HTMLDivElement | null>(null);
  const [allBaseCards, setAllBaseCards] = useState<Card[]>([]);
  const [fullInstancePool, setFullInstancePool] = useState<Card[]>([]);
  const [baseCardToShortIdMap, setBaseCardToShortIdMap] = useState<Map<string, number>>(new Map());
  const [shortIdToBaseCardMap, setShortIdToBaseCardMap] = useState<Map<number, string>>(new Map());

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardLocal, setSelectedCardLocal] = useState<Card | null>(null);
  const [pendingTargetCCard, setPendingTargetCCard] = useState<Card | null>(null);
  
  const [combatResultVisual, setCombatResultVisual] = useState<PlayerType | 'DRAW' | null>(null);
  const [isVisualizingCombat, setIsVisualizingCombat] = useState(false);
  
  const [isVisualizingUnilateralDeployment, setIsVisualizingUnilateralDeployment] = useState(false);
  const [unilateralDeploymentWinner, setUnilateralDeploymentWinner] = useState<PlayerType | null>(null);

  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});

  const [isDiscardPileModalOpen, setIsDiscardPileModalOpen] = useState(false);
  const [discardPileOwnerName, setDiscardPileOwnerName] = useState<string | null>(null);
  const [cardsInModal, setCardsInModal] = useState<Card[]>([]);

  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  
  const [isLargeCardModalOpen, setIsLargeCardModalOpen] = useState(false);
  const [cardForLargeModal, setCardForLargeModal] = useState<Card | null>(null);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);


  const handleImageError = (cardKey: string) => {
    setImageLoadErrors(prev => ({ ...prev, [cardKey]: true }));
  };

  const setSelectedCard = (card: Card | null) => {
    if (pendingTargetCCard && card?.cardNumber !== pendingTargetCCard.cardNumber) {
      setPendingTargetCCard(null);
    }
    setSelectedCardLocal(card);
  };

  const openLargeCardModal = (card: Card) => {
    if (card.imageUrl) {
      setCardForLargeModal(card);
      setIsLargeCardModalOpen(true);
    }
  };

  const closeLargeCardModal = () => {
    setIsLargeCardModalOpen(false);
  };

  const openDiscardPileModal = (owner: PlayerType) => {
    if (!gameState) return;
    if (owner === 'PLAYER') {
      setCardsInModal(gameState.player.discardPile);
      setDiscardPileOwnerName('プレイヤー');
    } else {
      setCardsInModal(gameState.cpu.discardPile);
      setDiscardPileOwnerName('CPU');
    }
    setIsDiscardPileModalOpen(true);
  };

  const closeDiscardPileModal = () => {
    setIsDiscardPileModalOpen(false);
    setCardsInModal([]);
    setDiscardPileOwnerName(null);
  };

  const openPlayerDeckModal = () => {
    if (!gameState) return;
    setIsDeckModalOpen(true);
  };

  const closeDeckModal = () => {
    setIsDeckModalOpen(false);
  };

  const addLogEntry = useCallback((message: string, source: LogEntry['source'] = 'SYSTEM') => {
    setGameState(prev => {
      if (!prev) return prev;
      const newEntry: LogEntry = { message, source, timestamp: Date.now() };
      return { ...prev, gameLog: [...prev.gameLog, newEntry] };
    });
  }, []);


  useEffect(() => {
    const parsedBase = parseMobilePowersTsvData(allCardsTsvData);
    setAllBaseCards(parsedBase);

    if (parsedBase.length > 0) {
        const instancePool = createFullCardInstancePool(parsedBase);
        setFullInstancePool(instancePool);

        const gamePlayableBaseCards = parsedBase.filter(c => c.type === 'M' || c.type === 'C');
        const sortedBaseCardNumbers = Array.from(new Set(gamePlayableBaseCards.map(c => c.cardNumber))).sort();
        
        const bToS = new Map<string, number>();
        const sToB = new Map<number, string>();
        sortedBaseCardNumbers.forEach((num, idx) => {
            bToS.set(num, idx);
            sToB.set(idx, num);
        });
        setBaseCardToShortIdMap(bToS);
        setShortIdToBaseCardMap(sToB);
    }
  }, []);

  const initializeGame = useCallback((playerDeckCodeToUse?: string, cpuDeckCodeToUse?: string) => {
    if (allBaseCards.length === 0 || fullInstancePool.length === 0 || baseCardToShortIdMap.size === 0) {
        console.warn("Base cards, instance pool, or ID maps not loaded yet. Cannot initialize game.");
        addLogEntry("エラー: ゲーム初期化に必要なデータが不足しています。", "SYSTEM");
        return;
    }

    let playerDeckBase: Card[];
    let cpuDeckBase: Card[];
    const gameLogMessages: LogEntry[] = [{ message: 'ゲーム開始！', source: 'SYSTEM', timestamp: Date.now() }];

    // Player Deck Setup
    if (playerDeckCodeToUse && playerDeckCodeToUse.trim() !== '') {
        const parsedPlayerDeck = parseCompressedDeckCode(playerDeckCodeToUse.trim(), shortIdToBaseCardMap, fullInstancePool);
        if (parsedPlayerDeck) {
            playerDeckBase = parsedPlayerDeck; 
            gameLogMessages.push({ message: "提供されたデッキコードからプレイヤーのデッキを構築しました。", source: 'SYSTEM', timestamp: Date.now() });
        } else {
            gameLogMessages.push({ message: "プレイヤーのデッキコードが無効です。ランダムデッキで開始します。", source: 'SYSTEM', timestamp: Date.now() });
            playerDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
        }
    } else {
        gameLogMessages.push({ message: "ランダムデッキでプレイヤーのデッキを構築しました。", source: 'SYSTEM', timestamp: Date.now() });
        playerDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
    }
    playerDeckBase = shuffleDeck(playerDeckBase);
    const { newDeck: playerDeckAfterDraw, drawnCards: playerInitialHand } = drawCards(playerDeckBase, 7);

    // CPU Deck Setup
    if (cpuDeckCodeToUse && cpuDeckCodeToUse.trim() !== '') {
        const parsedCpuDeck = parseCompressedDeckCode(cpuDeckCodeToUse.trim(), shortIdToBaseCardMap, fullInstancePool);
        if (parsedCpuDeck) {
            cpuDeckBase = parsedCpuDeck;
            const presetName = cpuDeckPresets.find(p => p.code === cpuDeckCodeToUse)?.name;
            gameLogMessages.push({ message: presetName ? `CPUは「${presetName}」デッキを使用します。` : "CPUは提供されたデッキコードを使用します。", source: 'SYSTEM', timestamp: Date.now() });
        } else {
            gameLogMessages.push({ message: "CPUのデッキコードが無効です。ランダムデッキで開始します。", source: 'SYSTEM', timestamp: Date.now() });
            cpuDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
        }
    } else {
        gameLogMessages.push({ message: "ランダムデッキでCPUのデッキを構築しました。", source: 'SYSTEM', timestamp: Date.now() });
        cpuDeckBase = shuffleDeck([...fullInstancePool]).slice(0, 55);
    }
    cpuDeckBase = shuffleDeck(cpuDeckBase);
    const { newDeck: cpuDeckAfterDraw, drawnCards: cpuInitialHand } = drawCards(cpuDeckBase, 7);


    setGameState({
      phase: 'FORMATION_PLAYER_DRAW',
      activePlayer: 'PLAYER', 
      turnOrder: ['PLAYER', 'CPU'], 
      player: { ...initialPlayerState(), deck: playerDeckAfterDraw, hand: playerInitialHand },
      cpu: { ...initialPlayerState(), deck: cpuDeckAfterDraw, hand: cpuInitialHand },
      currentTerrainCard: null,
      battlefieldTerrainAttribute: null,
      counterSupportTurnOrder: null,
      currentCounterSupportActorIndex: 0,
      gameLog: gameLogMessages,
      winner: null,
      isPlayerTurnInteractive: true, 
      isCPUMoving: false,
    });
    setSelectedCardLocal(null);
    setPendingTargetCCard(null);
    setCombatResultVisual(null);
    setIsVisualizingCombat(false);
    setIsVisualizingUnilateralDeployment(false);
    setUnilateralDeploymentWinner(null);
    setImageLoadErrors({});
  }, [allBaseCards, fullInstancePool, baseCardToShortIdMap, shortIdToBaseCardMap, addLogEntry]);

  useEffect(() => {
    if (allBaseCards.length > 0 && fullInstancePool.length > 0 && baseCardToShortIdMap.size > 0 && !gameState) {
        initializeGame(initialDeckCode, initialCpuDeckCode);
    }
  }, [allBaseCards, fullInstancePool, baseCardToShortIdMap, initialDeckCode, initialCpuDeckCode, initializeGame, gameState]);

  useEffect(() => {
    if (pendingTargetCCard && gameState?.phase !== 'COUNTER_SUPPORT_PLAYER_PLAY_C') {
      setPendingTargetCCard(null);
    }
  }, [gameState?.phase, pendingTargetCCard]);

  const goToNextCounterSupportStepOrCombatResolution = (currentGameState: GameState): Partial<GameState> => {
    if (!currentGameState.counterSupportTurnOrder) {
        const newLogEntry: LogEntry = { message: "エラー: C/S順序不明、戦闘解決へ。", source: 'SYSTEM', timestamp: Date.now() };
        return { phase: 'COMBAT_RESOLUTION', isPlayerTurnInteractive: false, gameLog: [...currentGameState.gameLog, newLogEntry] };
    }

    const newIndex = currentGameState.currentCounterSupportActorIndex + 1;
    if (newIndex < currentGameState.counterSupportTurnOrder.length) {
        const nextActor = currentGameState.counterSupportTurnOrder[newIndex];
        const nextPhase = nextActor === 'PLAYER' ? 'COUNTER_SUPPORT_PLAYER_DRAW' : 'COUNTER_SUPPORT_CPU_DRAW';
        const newLogEntry: LogEntry = { message: `${nextActor === 'PLAYER' ? 'プレイヤー' : 'CPU'}のカウンター／支援ドローフェイズへ。`, source: 'SYSTEM', timestamp: Date.now()};
        return {
            phase: nextPhase,
            currentCounterSupportActorIndex: newIndex,
            isPlayerTurnInteractive: nextActor === 'PLAYER',
            gameLog: [...currentGameState.gameLog, newLogEntry]
        };
    } else {
        const newLogEntry: LogEntry = { message: "両者のカウンター／支援終了。戦闘解決へ。", source: 'SYSTEM', timestamp: Date.now()};
        return {
            phase: 'COMBAT_RESOLUTION',
            isPlayerTurnInteractive: false,
            gameLog: [...currentGameState.gameLog, newLogEntry]
        };
    }
  };


  const handlePlayerAction = async (actionType: string, cardToActOn?: Card, targetCard?: Card) => {
    if (!gameState || !gameState.isPlayerTurnInteractive || gameState.winner || !cardToActOn) return;

    const card = cardToActOn;
    if (
      actionType === 'PLAY_C_CARD' &&
      card.type === 'C' &&
      gameState.phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C' &&
      canPlayCCard(card, gameState.player, gameState) &&
      !targetCard
    ) {
      const targetMode = getCCardTargetMode(card);
      const targetCandidates = getCCardTargetCandidates(card, gameState, 'PLAYER');
      if (targetMode && targetCandidates.length > 0) {
        setPendingTargetCCard(card);
        setSelectedCardLocal(card);
        return;
      }
    }

    setGameState(prev => {
        if (!prev) return null;
        let newPlayerState = { ...prev.player };
        let newCpuState = { ...prev.cpu };
        let newLog = [...prev.gameLog];
        let nextPhasePartial: Partial<GameState> = {};

        if (prev.phase === 'FORMATION_PLAYER_PLACE') {
            if (actionType === 'PLAY_M_CARD_TO_SQUAD' && card.type === 'M' && newPlayerState.squad.length < 3) {
                const cardForSquad = { ...card, fieldOrder: newPlayerState.squad.length };
                newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber); 
                newPlayerState.squad = [...newPlayerState.squad, cardForSquad];
                newLog.push({message: `プレイヤーが ${card.cardName} を小隊に配置。`, source: 'PLAYER', timestamp: Date.now()});
            } else if (actionType === 'DISCARD_TO_DEFEAT_PILE') {
                newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber);
                newPlayerState.discardPile = [...newPlayerState.discardPile, card];
                newLog.push({message: `プレイヤーが ${card.cardName} を手札から捨て札へ (編成時Mカード配置不可のため)。`, source: 'PLAYER', timestamp: Date.now()});
            } else {
                newLog.push({message: `プレイヤーの行動 ${actionType} は現在実行できません。`, source: 'SYSTEM', timestamp: Date.now()});
                return prev;
            }

            const playerNowDone = newPlayerState.squad.length >= 3 || (!newPlayerState.hand.some(c => c.type === 'M') && newPlayerState.squad.length <3 );
            const cpuAlreadyDone = prev.cpu.squad.length >= 3 || (!prev.cpu.hand.some(c => c.type === 'M') && prev.cpu.squad.length < 3);


            if (playerNowDone && cpuAlreadyDone) {
                nextPhasePartial = { phase: 'FORMATION_CHECK_FULL', isPlayerTurnInteractive: false };
            } else if (playerNowDone && !cpuAlreadyDone) {
                 nextPhasePartial = { phase: 'FORMATION_CPU_DRAW', isPlayerTurnInteractive: false };
            } else {
                 nextPhasePartial = { phase: 'FORMATION_CPU_DRAW', isPlayerTurnInteractive: false };
            }


        } else if (prev.phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C') {
            if (actionType === 'PLAY_C_CARD' && card.type === 'C') {
                if (!canPlayCCard(card, newPlayerState, { ...prev, player: newPlayerState, cpu: newCpuState })) {
                    newLog.push({message: `Cカードを出すには戦場にMカードが必要です。(${card.cardName})`, source: 'SYSTEM', timestamp: Date.now()});
                } else {
                    newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber);
                    newPlayerState.discardPile = [...newPlayerState.discardPile, card];

                    const effectResult = applyCCardEffect(card, { ...prev, player: newPlayerState, cpu: newCpuState }, 'PLAYER', targetCard);
                    newPlayerState = effectResult.player;
                    newCpuState = effectResult.cpu;
                    newLog.push(...effectResult.logMessages);

                    nextPhasePartial = goToNextCounterSupportStepOrCombatResolution({ ...prev, player: newPlayerState, cpu: newCpuState, gameLog: newLog });
                }
            } else if (actionType === 'DISCARD_FROM_HAND_CS') {
                newPlayerState.hand = newPlayerState.hand.filter(c => c.cardNumber !== card.cardNumber);
                newPlayerState.discardPile = [...newPlayerState.discardPile, card];
                newLog.push({message: `プレイヤーが手札から ${card.cardName} を捨てました。`, source: 'PLAYER', timestamp: Date.now()});
                nextPhasePartial = goToNextCounterSupportStepOrCombatResolution({ ...prev, player: newPlayerState, cpu: newCpuState, gameLog: newLog });
            } else {
                 newLog.push({message: `プレイヤーの行動 ${actionType} は現在実行できません。`, source: 'SYSTEM', timestamp: Date.now()});
                 return prev;
            }
        } else {
            return prev;
        }

        setSelectedCardLocal(null);
        setPendingTargetCCard(null);
        return { ...prev, player: newPlayerState, cpu: newCpuState, gameLog: newLog, ...nextPhasePartial };
    });
  };

  const processCPUAction = useCallback((aiDecisionInput: CPUAction | null) => {
    setGameState(prev => {
      if (!prev) return prev;

      const aiDecision = aiDecisionInput || { action: 'NO_ACTION', reasoning: 'AI service failed or returned null decision' };

      let newLog: LogEntry[] = [...prev.gameLog, {message: `CPU: ${aiDecision.action} ${aiDecision.cardId || ''} (${aiDecision.reasoning || '理由なし'})`, source: 'SYSTEM', timestamp: Date.now()}];
      let newPlayerState = { ...prev.player };
      let newCpuState = { ...prev.cpu };
      let nextPhasePartial: Partial<GameState> = {};
      let actionTakenSuccessfully = false;

      if (prev.phase === 'FORMATION_CPU_PLACE') {
        if (aiDecision.action === 'PLAY_M_CARD' && aiDecision.cardId) {
          const cardToPlay = newCpuState.hand.find(c => c.cardNumber === aiDecision.cardId);
          if (cardToPlay && cardToPlay.type === 'M' && newCpuState.squad.length < 3) {
            const cardForSquad = { ...cardToPlay, fieldOrder: newCpuState.squad.length };
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToPlay.cardNumber);
            newCpuState.squad = [...newCpuState.squad, cardForSquad];
            newLog = [...newLog, {message: `CPUが ${cardToPlay.cardName} を小隊に配置。`, source: 'CPU', timestamp: Date.now()}];
            actionTakenSuccessfully = true;
          } else {
            newLog = [...newLog, {message: `CPU AI提案 (${aiDecision.cardId} 配置)は無効でした。`, source: 'SYSTEM', timestamp: Date.now()}];
          }
        } else if (aiDecision.action === 'DISCARD_TO_DEFEAT' && aiDecision.cardId) {
          const cardToDiscard = newCpuState.hand.find(c => c.cardNumber === aiDecision.cardId);
          if (cardToDiscard) {
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscard.cardNumber);
            newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscard]; 
            newLog = [...newLog, {message: `CPUが ${cardToDiscard.cardName} を手札から捨て札へ (編成時Mカード配置不可のため)。`, source: 'CPU', timestamp: Date.now()}];
            actionTakenSuccessfully = true;
          } else {
            newLog = [...newLog, {message: `CPU AI提案 (${aiDecision.cardId} 捨て札へ)は手札にないため無効でした。`, source: 'SYSTEM', timestamp: Date.now()}];
          }
        }

        if (!actionTakenSuccessfully) {
          newLog = [...newLog, {message: `CPU AIの行動が無効/未指定/NO_ACTIONのため、フォールバック処理を実行します。`, source: 'SYSTEM', timestamp: Date.now()}];
          const availableMCardsInHand = newCpuState.hand.filter(c => c.type === 'M');
          if (newCpuState.squad.length < 3 && availableMCardsInHand.length > 0) {
            const cardToPlay = availableMCardsInHand.sort((a,b) => parseInt(b.points) - parseInt(a.points))[0];
            const cardForSquad = { ...cardToPlay, fieldOrder: newCpuState.squad.length };
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToPlay.cardNumber);
            newCpuState.squad = [...newCpuState.squad, cardForSquad];
            newLog = [...newLog, {message: `CPUフォールバック: ${cardToPlay.cardName} を小隊に配置。`, source: 'CPU', timestamp: Date.now()}];
          } else if (newCpuState.hand.length > 0) {
            const cardToDiscard = newCpuState.hand[Math.floor(Math.random() * newCpuState.hand.length)];
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscard.cardNumber);
            newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscard]; 
            newLog = [...newLog, {message: `CPUフォールバック: ${cardToDiscard.cardName} を手札から捨て札へ (編成時Mカード配置不可のため)。`, source: 'CPU', timestamp: Date.now()}];
          } else {
            newLog = [...newLog, {message: `CPUフォールバック: 手札が空で行動できません。`, source: 'CPU', timestamp: Date.now()}];
          }
        }

        const playerFormationDone = prev.player.squad.length >= 3 || (!prev.player.hand.some(c => c.type === 'M') && prev.player.squad.length < 3);
        const cpuFormationDone = newCpuState.squad.length >= 3 || (!newCpuState.hand.some(c => c.type === 'M') && newCpuState.squad.length < 3);


        if (playerFormationDone && cpuFormationDone) {
            nextPhasePartial = { phase: 'FORMATION_CHECK_FULL', isPlayerTurnInteractive: false };
        } else if (cpuFormationDone && !playerFormationDone) {
             nextPhasePartial = { phase: 'FORMATION_PLAYER_DRAW', isPlayerTurnInteractive: true };
        } else {
             nextPhasePartial = { phase: 'FORMATION_PLAYER_DRAW', isPlayerTurnInteractive: true };
        }

      } else if (prev.phase === 'COUNTER_SUPPORT_CPU_PLAY_C') {
        const cardId = aiDecision.cardId;
        const cardToAct = cardId ? newCpuState.hand.find(c => c.cardNumber === cardId) : null;

        if (aiDecision.action === 'PLAY_C_CARD' && cardToAct && cardToAct.type === 'C') {
            if (!canPlayCCard(cardToAct, newCpuState, { ...prev, player: newPlayerState, cpu: newCpuState })) {
                newLog.push({message: `CPUはCカード(${cardToAct.cardName})を出そうとしましたが、戦場にMカードがいません。フォールバック。`, source: 'CPU', timestamp: Date.now()});
                const cardToDiscardFallback = cardToAct || (newCpuState.hand.length > 0 ? newCpuState.hand[0] : null);
                if (cardToDiscardFallback) {
                    newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscardFallback.cardNumber);
                    newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscardFallback];
                    newLog.push({message: `CPUフォールバック: ${cardToDiscardFallback.cardName} を捨てました。`, source: 'CPU', timestamp: Date.now()});
                }
            } else {
                newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToAct.cardNumber);
                newCpuState.discardPile = [...newCpuState.discardPile, cardToAct];
                const effectResult = applyCCardEffect(cardToAct, { ...prev, player: newPlayerState, cpu: newCpuState }, 'CPU');
                newPlayerState = effectResult.player;
                newCpuState = effectResult.cpu;
                newLog.push(...effectResult.logMessages);
            }
        } else if (aiDecision.action === 'DISCARD_FROM_HAND' && cardToAct) {
            newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToAct.cardNumber);
            newCpuState.discardPile = [...newCpuState.discardPile, cardToAct];
            newLog.push({message: `CPUが手札から ${cardToAct.cardName} を捨てました。`, source: 'CPU', timestamp: Date.now()});
        } else { 
            newLog.push({message: `CPUはCカードを使用しないか、無効な行動でした。`, source: 'CPU', timestamp: Date.now()});
            if (aiDecision.action !== 'NO_ACTION' && newCpuState.hand.length > 0) {
                newLog.push({message: `フォールバック: 手札から1枚捨てます。`, source: 'CPU', timestamp: Date.now()});
                const cardToDiscard = newCpuState.hand[Math.floor(Math.random() * newCpuState.hand.length)];
                newCpuState.hand = newCpuState.hand.filter(c => c.cardNumber !== cardToDiscard.cardNumber);
                newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscard];
                newLog.push({message: `CPUフォールバック: ${cardToDiscard.cardName} を捨てました。`, source: 'CPU', timestamp: Date.now()});
            } else if (aiDecision.action !== 'NO_ACTION' && newCpuState.hand.length === 0) {
                 newLog.push({message: `CPUフォールバック: 手札が空で捨てられません。`, source: 'CPU', timestamp: Date.now()});
            }
        }
        nextPhasePartial = goToNextCounterSupportStepOrCombatResolution({ ...prev, player: newPlayerState, cpu: newCpuState, gameLog: newLog });
      } else if (prev.phase === 'DEPLOYMENT_CPU_TERRAIN') {
           // Terrain logic is handled directly in useEffect for DEPLOYMENT_CPU_TERRAIN as per original implementation
           // But if we wanted to use AI, we'd use getCPUTerrainSelectionAction here.
           // Leaving as is to respect the existing structure where terrain is drawn from deck.
      } else {
        newLog.push({message: `Error: processCPUAction called for unexpected phase ${prev.phase}.`, source: 'SYSTEM', timestamp: Date.now()});
        nextPhasePartial = { phase: prev.phase, isPlayerTurnInteractive: prev.isPlayerTurnInteractive };
      }

      if (nextPhasePartial.phase === undefined) {
        newLog.push({message: `Critical Error: nextPhasePartial.phase is undefined at end of processCPUAction for ${prev.phase}. Defaulting to current phase.`, source: 'SYSTEM', timestamp: Date.now()});
        nextPhasePartial.phase = prev.phase;
      }
      if (nextPhasePartial.isPlayerTurnInteractive === undefined) {
        newLog.push({message: `Critical Error: nextPhasePartial.isPlayerTurnInteractive is undefined for ${nextPhasePartial.phase}. Recalculating.`, source: 'SYSTEM', timestamp: Date.now()});
        nextPhasePartial.isPlayerTurnInteractive = isPlayerInteractivePhase(nextPhasePartial.phase);
      }

      return {
        ...prev,
        player: newPlayerState,
        cpu: newCpuState,
        gameLog: newLog,
        isCPUMoving: false,
        ...nextPhasePartial
      };
    });
  }, [addLogEntry]); 

  const confirmCombatResolution = useCallback(() => {
    setCombatResultVisual(null);
    setGameState(currentGs => {
      if (!currentGs || currentGs.phase !== 'COMBAT_RESOLUTION') return currentGs;

      let newPlayerState = { ...currentGs.player };
      let newCpuState = { ...currentGs.cpu };
      let tempLogEntries: LogEntry[] = [];
      let gameShouldEnd = false;
      let winnerOnEnd: PlayerType | null = null;

      const lastLog = currentGs.gameLog[currentGs.gameLog.length - 1];
      let currentLog = [...currentGs.gameLog];
      if (lastLog && lastLog.message.includes("結果表示中...")) {
        currentLog.pop();
      }
      tempLogEntries.push({message: `戦闘解決確定: プレイヤー ${newPlayerState.combatPoints} vs CPU ${newCpuState.combatPoints}`, source: 'SYSTEM', timestamp: Date.now()});

      const playerMOnBattlefield = newPlayerState.battlefield.filter(c => c.type === 'M');
      const cpuMOnBattlefield = newCpuState.battlefield.filter(c => c.type === 'M');

      if (newPlayerState.combatPoints > newCpuState.combatPoints) {
        tempLogEntries.push({message: "プレイヤーの勝利！戦闘ポイントで上回りました。", source: 'SYSTEM', timestamp: Date.now()});
        if (playerMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
          newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerMOnBattlefield];
        }
        if (cpuMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) はCPUの敗北フィールドへ。`, source: 'CPU', timestamp: Date.now()});
          newCpuState.defeatPile = [...newCpuState.defeatPile, ...cpuMOnBattlefield];
          const defeatedCpuCardCount = cpuMOnBattlefield.length;
          newCpuState.defeatPoints += defeatedCpuCardCount;
          tempLogEntries.push({message: `CPUは敗北ポイントを ${defeatedCpuCardCount}点獲得。合計: ${newCpuState.defeatPoints}点。`, source: 'CPU', timestamp: Date.now()});
          if (newCpuState.defeatPoints >= 10) {
            tempLogEntries.push({message: "CPUの敗北ポイントが10に達しました！ プレイヤーの勝利！", source: 'SYSTEM', timestamp: Date.now()});
            gameShouldEnd = true;
            winnerOnEnd = 'PLAYER';
          }
        }
      } else if (newCpuState.combatPoints > newPlayerState.combatPoints) {
        tempLogEntries.push({message: "CPUの勝利！戦闘ポイントで上回りました。", source: 'SYSTEM', timestamp: Date.now()});
        if (playerMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) はプレイヤーの敗北フィールドへ。`, source: 'PLAYER', timestamp: Date.now()});
          newPlayerState.defeatPile = [...newPlayerState.defeatPile, ...playerMOnBattlefield];
          const defeatedCardCount = playerMOnBattlefield.length;
          newPlayerState.defeatPoints += defeatedCardCount;
          tempLogEntries.push({message: `プレイヤーは敗北ポイントを ${defeatedCardCount}点獲得。合計: ${newPlayerState.defeatPoints}点。`, source: 'PLAYER', timestamp: Date.now()});
          if (newPlayerState.defeatPoints >= 10) {
            tempLogEntries.push({message: "プレイヤーの敗北ポイントが10に達しました！ CPUの勝利！", source: 'SYSTEM', timestamp: Date.now()});
            gameShouldEnd = true;
            winnerOnEnd = 'CPU';
          }
        }
        if (cpuMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
          newCpuState.discardPile = [...newCpuState.discardPile, ...cpuMOnBattlefield];
        }
      } else {
        tempLogEntries.push({message: "引き分け！戦闘ポイントが同じです。", source: 'SYSTEM', timestamp: Date.now()});
        if (playerMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
          newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerMOnBattlefield];
        }
        if (cpuMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
          newCpuState.discardPile = [...newCpuState.discardPile, ...cpuMOnBattlefield];
        }
      }

      newPlayerState.battlefield = [];
      newCpuState.battlefield = [];

      if (gameShouldEnd) {
        return {
          ...currentGs,
          player: newPlayerState,
          cpu: newCpuState,
          phase: 'GAME_OVER',
          winner: winnerOnEnd,
          isPlayerTurnInteractive: false,
          gameLog: [...currentLog, ...tempLogEntries],
          isCPUMoving: false,
        };
      }

      tempLogEntries.push({message: '戦闘解決完了。終了フェイズへ。', source: 'SYSTEM', timestamp: Date.now()});
      return {
        ...currentGs,
        player: newPlayerState,
        cpu: newCpuState,
        phase: 'END_TURN_CLEANUP',
        gameLog: [...currentLog, ...tempLogEntries],
        isPlayerTurnInteractive: false,
        isCPUMoving: false,
      };
    });
    setIsVisualizingCombat(false);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('game-scroll-locked');
    document.body.classList.add('game-scroll-locked');

    return () => {
      document.documentElement.classList.remove('game-scroll-locked');
      document.body.classList.remove('game-scroll-locked');
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenActive(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const requestGameFullscreen = useCallback(async () => {
    const target = gameScreenRef.current ?? document.documentElement;

    try {
      if (!document.fullscreenElement && target.requestFullscreen) {
        await target.requestFullscreen();
      }

      const orientation = window.screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (orientation?.lock) {
        await orientation.lock('landscape').catch(() => undefined);
      }
    } catch {
      addLogEntry('ブラウザの制限により全画面化できませんでした。ホーム画面に追加して起動してください。', 'SYSTEM');
    }
  }, [addLogEntry]);

  useEffect(() => {
    if (!gameState || gameState.winner) return;

    const currentPhase = gameState.phase;
    if (gameState.isCPUMoving &&
        (currentPhase === 'FORMATION_CPU_PLACE' || currentPhase === 'COUNTER_SUPPORT_CPU_PLAY_C' || currentPhase === 'DEPLOYMENT_CPU_TERRAIN')) {
        return;
    }

    if (isVisualizingCombat || isVisualizingUnilateralDeployment) {
        return;
    }

    if (!gameState.isPlayerTurnInteractive && !gameState.isCPUMoving) {
        switch (currentPhase) {
            case 'FORMATION_CPU_DRAW':
                setGameState(prev => {
                    if(!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.cpu.deck, 1);
                    if (drawnCards.length === 0) {
                      addLogEntry('CPUのデッキが尽きた！プレイヤーの勝利！', 'SYSTEM');
                      return {...prev, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('CPUが編成フェイズでカードを1枚引きました。', 'CPU');
                    return {...prev, cpu: {...prev.cpu, deck: newDeck, hand: [...prev.cpu.hand, ...drawnCards]}, phase: 'FORMATION_CPU_PLACE', isPlayerTurnInteractive: false};
                });
                break;
            case 'FORMATION_CPU_PLACE':
                setGameState(prev => prev ? ({ ...prev, isCPUMoving: true }) : null);
                cpuLogicService.getCPUFormationAction(gameState).then(processCPUAction);
                break;
            case 'FORMATION_CHECK_FULL':
                setGameState(prev => {
                    if (!prev) return null;
                    const nextTerrainSelector = prev.turnOrder[0]; 
                    addLogEntry(`編成完了。${nextTerrainSelector === 'PLAYER' ? 'プレイヤー' : 'CPU'} が地形カードを決定します。`, 'SYSTEM');
                    return {
                        ...prev,
                        phase: nextTerrainSelector === 'PLAYER' ? 'DEPLOYMENT_PLAYER_TERRAIN' : 'DEPLOYMENT_CPU_TERRAIN',
                        activePlayer: nextTerrainSelector,
                        isPlayerTurnInteractive: false, 
                    };
                });
                break;
            case 'DEPLOYMENT_PLAYER_TERRAIN':
                setGameState(prev => {
                    if (!prev) return null;
                    const { newDeck: playerDeckAfterDraw, drawnCards: terrainCardsDrawn } = drawCards(prev.player.deck, 1);
                    if (terrainCardsDrawn.length === 0) {
                        addLogEntry('プレイヤーのデッキが尽き、地形を引けませんでした。CPUの勝利！', 'SYSTEM');
                        return { ...prev, phase: 'GAME_OVER', winner: 'CPU', isPlayerTurnInteractive: false };
                    }
                    const terrainCard = terrainCardsDrawn[0];
                    const terrainAttribute = terrainCard.battlefieldTerrain || "";
                    addLogEntry(`プレイヤーが地形カードとして ${terrainCard.cardName} (属性: ${terrainAttribute}) を引きました。`, 'PLAYER');
                    return { ...prev, player: { ...prev.player, deck: playerDeckAfterDraw, discardPile: [...prev.player.discardPile, terrainCard] }, currentTerrainCard: terrainCard, battlefieldTerrainAttribute: terrainAttribute, phase: 'DEPLOYMENT_MOVE_CARDS', isPlayerTurnInteractive: false };
                });
                break;
             case 'DEPLOYMENT_CPU_TERRAIN':
                // Note: Rules say draw from deck, so we don't use AI decision here to keep consistent with rules.
                setGameState(prev => prev ? ({ ...prev, isCPUMoving: true }) : null);
                setGameState(prev => {
                     if (!prev) return null;
                     const { newDeck: cpuDeckAfterDraw, drawnCards: terrainCardsDrawn } = drawCards(prev.cpu.deck, 1);
                     if (terrainCardsDrawn.length === 0) {
                        addLogEntry('CPUのデッキが尽き、地形を引けませんでした。プレイヤーの勝利！', 'SYSTEM');
                        return { ...prev, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false };
                     }
                     const terrainCard = terrainCardsDrawn[0];
                     const terrainAttribute = terrainCard.battlefieldTerrain || ""; 
                     addLogEntry(`CPUが地形カードとして ${terrainCard.cardName} (属性: ${terrainAttribute}) を引きました。`, 'CPU');
                     return { ...prev, cpu: { ...prev.cpu, deck: cpuDeckAfterDraw, discardPile: [...prev.cpu.discardPile, terrainCard] }, currentTerrainCard: terrainCard, battlefieldTerrainAttribute: terrainAttribute, phase: 'DEPLOYMENT_MOVE_CARDS', isPlayerTurnInteractive: false, isCPUMoving: false };
                });
                break;
            case 'DEPLOYMENT_MOVE_CARDS':
                setGameState(prev => {
                    if (!prev || !prev.battlefieldTerrainAttribute) return prev;
                    let newPlayerSquad = [...prev.player.squad];
                    let newPlayerBattlefield = [...prev.player.battlefield];
                    let newCpuSquad = [...prev.cpu.squad];
                    let newCpuBattlefield = [...prev.cpu.battlefield];
                    const terrain = prev.battlefieldTerrainAttribute;
                    let tempLogEntries: LogEntry[] = [];

                    newPlayerSquad = newPlayerSquad.filter(card => {
                        if (canDeploy(card, terrain)) { newPlayerBattlefield.push(card); tempLogEntries.push({message: `プレイヤーの ${card.cardNameOmm || card.cardName} が戦場へ。`, source: 'PLAYER', timestamp: Date.now()}); return false; } return true;
                    });
                    newCpuSquad = newCpuSquad.filter(card => {
                        if (canDeploy(card, terrain)) { newCpuBattlefield.push(card); tempLogEntries.push({message: `CPUの ${card.cardNameOmm || card.cardName} が戦場へ。`, source: 'CPU', timestamp: Date.now()}); return false; } return true;
                    });
                    return { ...prev, player: { ...prev.player, squad: newPlayerSquad, battlefield: newPlayerBattlefield }, cpu: { ...prev.cpu, squad: newCpuSquad, battlefield: newCpuBattlefield }, phase: 'DEPLOYMENT_CHECK_UNILATERAL', gameLog: [...prev.gameLog, ...tempLogEntries], isPlayerTurnInteractive: false };
                });
                break;
            case 'DEPLOYMENT_CHECK_UNILATERAL':
                setGameState(prev => {
                    if (!prev) return null;
                    let newPlayerState = { ...prev.player };
                    let newCpuState = { ...prev.cpu };
                    let tempLogEntries: LogEntry[] = [];
                    let gameShouldEnd = false;
                    let winnerOnEnd: PlayerType | null = null;
                    let visualizeUnilateral: PlayerType | null = null;

                    const playerCanDeploy = newPlayerState.battlefield.length > 0;
                    const cpuCanDeploy = newCpuState.battlefield.length > 0;

                    if (playerCanDeploy && !cpuCanDeploy) {
                        tempLogEntries.push({message: "一方的出撃！プレイヤーのみ出撃。CPUは小隊の残存Mカード分の敗北ポイントを受けます。演出表示中...", source: 'SYSTEM', timestamp: Date.now()});
                        visualizeUnilateral = 'PLAYER';
                        const cpuSquadMCards = newCpuState.squad.filter(c => c.type === 'M');
                        if (cpuSquadMCards.length > 0) {
                            newCpuState.defeatPile = [...newCpuState.defeatPile, ...cpuSquadMCards];
                            const defeatPointsReceived = cpuSquadMCards.length;
                            newCpuState.defeatPoints += defeatPointsReceived;
                            newCpuState.squad = newCpuState.squad.filter(c => c.type !== 'M');
                            tempLogEntries.push({message: `CPUは敗北ポイント ${defeatPointsReceived}点 を獲得。合計: ${newCpuState.defeatPoints}点 (演出後確定)`, source: 'CPU', timestamp: Date.now()});
                            if (newCpuState.defeatPoints >= 10) {
                                gameShouldEnd = true; winnerOnEnd = 'PLAYER';
                            }
                        }
                    } else if (!playerCanDeploy && cpuCanDeploy) {
                        tempLogEntries.push({message: "一方的出撃！CPUのみ出撃。プレイヤーは小隊の残存Mカード分の敗北ポイントを受けます。演出表示中...", source: 'SYSTEM', timestamp: Date.now()});
                        visualizeUnilateral = 'CPU';
                        const playerSquadMCards = newPlayerState.squad.filter(c => c.type === 'M');
                         if (playerSquadMCards.length > 0) {
                            newPlayerState.defeatPile = [...newPlayerState.defeatPile, ...playerSquadMCards];
                            const defeatPointsReceived = playerSquadMCards.length;
                            newPlayerState.defeatPoints += defeatPointsReceived;
                            newPlayerState.squad = newPlayerState.squad.filter(c => c.type !== 'M'); 
                            tempLogEntries.push({message: `プレイヤーは敗北ポイント ${defeatPointsReceived}点 を獲得。合計: ${newPlayerState.defeatPoints}点 (演出後確定)`, source: 'PLAYER', timestamp: Date.now()});
                            if (newPlayerState.defeatPoints >= 10) {
                                gameShouldEnd = true; winnerOnEnd = 'CPU';
                            }
                        }
                    } else if (!playerCanDeploy && !cpuCanDeploy) {
                        addLogEntry("両者ともユニットを出撃できませんでした。戦闘は発生せず、ターン終了処理へ。", "SYSTEM");
                        return { ...prev, phase: 'END_TURN_CLEANUP', isPlayerTurnInteractive: false };
                    } else {
                        addLogEntry("両者ユニット出撃。戦闘計算へ。", "SYSTEM");
                        return { ...prev, phase: 'COMBAT_CALCULATE_INITIAL_POINTS', isPlayerTurnInteractive: false };
                    }
                    
                    if (visualizeUnilateral) {
                        setIsVisualizingUnilateralDeployment(true);
                        setUnilateralDeploymentWinner(visualizeUnilateral);
                        
                        setTimeout(() => {
                            setGameState(currentGs => {
                                if (!currentGs) return null;
                                let finalLog = currentGs.gameLog.filter(entry => !entry.message.includes("演出表示中..."));
                                const finalLogLastIndex = finalLog.length - 1;
                                if (finalLogLastIndex >= 0 && finalLog[finalLogLastIndex].message.includes("(演出後確定)")) {
                                    finalLog[finalLogLastIndex] = {
                                        ...finalLog[finalLogLastIndex],
                                        message: finalLog[finalLogLastIndex].message.replace(" (演出後確定)", ""),
                                    };
                                }

                                if (gameShouldEnd) {
                                    finalLog.push({message: winnerOnEnd === 'PLAYER' ? "CPUの敗北ポイントが10に達しました！プレイヤーの勝利！" : "プレイヤーの敗北ポイントが10に達しました！CPUの勝利！", source: 'SYSTEM', timestamp: Date.now()});
                                    return { ...currentGs, player: newPlayerState, cpu: newCpuState, phase: 'GAME_OVER', winner: winnerOnEnd, gameLog: finalLog, isPlayerTurnInteractive: false, isCPUMoving: false };
                                } else {
                                    finalLog.push({message: "一方的出撃処理完了。ターン終了処理へ。", source: 'SYSTEM', timestamp: Date.now()});
                                    return { ...currentGs, player: newPlayerState, cpu: newCpuState, phase: 'END_TURN_CLEANUP', gameLog: finalLog, isPlayerTurnInteractive: false, isCPUMoving: false };
                                }
                            });
                            setIsVisualizingUnilateralDeployment(false);
                            setUnilateralDeploymentWinner(null);
                        }, 2000);
                        return { ...prev, gameLog: [...prev.gameLog, ...tempLogEntries], isPlayerTurnInteractive: false };
                    }
                    return { ...prev, gameLog: [...prev.gameLog, ...tempLogEntries] };
                });
                break;
            case 'COMBAT_CALCULATE_INITIAL_POINTS':
                setGameState(prev => {
                    if (!prev) return prev;
                    let playerCombatPoints = 0;
                    let cpuCombatPoints = 0;
                    let tempLogEntries: LogEntry[] = [];

                    prev.player.battlefield.filter(c => c.type === 'M').forEach(card => {
                        const baseP = parseInt(card.points) || 0;
                        const tagB = calculateTagBonus(card, prev.player.battlefield);
                        playerCombatPoints += (baseP + tagB);
                        if (tagB > 0) tempLogEntries.push({message: `プレイヤーの ${card.cardNameOmm || card.cardName} がタグボーナス +${tagB}P を獲得。`, source: 'PLAYER', timestamp: Date.now()});
                    });

                    prev.cpu.battlefield.filter(c => c.type === 'M').forEach(card => {
                        const baseP = parseInt(card.points) || 0;
                        const tagB = calculateTagBonus(card, prev.cpu.battlefield);
                        cpuCombatPoints += (baseP + tagB);
                        if (tagB > 0) tempLogEntries.push({message: `CPUの ${card.cardNameOmm || card.cardName} がタグボーナス +${tagB}P を獲得。`, source: 'CPU', timestamp: Date.now()});
                    });
                    
                    tempLogEntries.push({message: `タグボーナス計算後: プレイヤー ${playerCombatPoints}P, CPU ${cpuCombatPoints}P`, source: 'SYSTEM', timestamp: Date.now()});

                    const playerCombosResult = checkCombos(prev.player.battlefield.filter(c => c.type === 'M'), "プレイヤー");
                    playerCombosResult.achievedCombos.forEach(combo => playerCombatPoints += combo.points);
                    tempLogEntries = [...tempLogEntries, ...playerCombosResult.logMessages];

                    const cpuCombosResult = checkCombos(prev.cpu.battlefield.filter(c => c.type === 'M'), "CPU");
                    cpuCombosResult.achievedCombos.forEach(combo => cpuCombatPoints += combo.points);
                    tempLogEntries = [...tempLogEntries, ...cpuCombosResult.logMessages];
                    
                    if (playerCombosResult.achievedCombos.length > 0 || cpuCombosResult.achievedCombos.length > 0) {
                       tempLogEntries.push({message: `コンボ適用後: プレイヤー ${playerCombatPoints}P, CPU ${cpuCombatPoints}P`, source: 'SYSTEM', timestamp: Date.now()});
                    }


                    let csOrder: PlayerType[];
                    if (playerCombatPoints < cpuCombatPoints) { csOrder = ['PLAYER', 'CPU']; tempLogEntries.push({message:'プレイヤーがポイントが低いのでカウンター／支援を先に行います。', source: 'SYSTEM', timestamp: Date.now()}); }
                    else if (cpuCombatPoints < playerCombatPoints) { csOrder = ['CPU', 'PLAYER']; tempLogEntries.push({message: 'CPUがポイントが低いのでカウンター／支援を先に行います。', source: 'SYSTEM', timestamp: Date.now()}); }
                    else { csOrder = prev.activePlayer === 'PLAYER' ? ['CPU', 'PLAYER'] : ['PLAYER', 'CPU']; tempLogEntries.push({message: `戦闘ポイントが同じため、${csOrder[0] === 'PLAYER' ? 'プレイヤー' : 'CPU'}がカウンター／支援を先に行います。`, source: 'SYSTEM', timestamp: Date.now()});}
                    
                    const firstActor = csOrder[0];
                    return { 
                        ...prev, 
                        player: { ...prev.player, combatPoints: playerCombatPoints }, 
                        cpu: { ...prev.cpu, combatPoints: cpuCombatPoints }, 
                        counterSupportTurnOrder: csOrder, 
                        currentCounterSupportActorIndex: 0, 
                        phase: firstActor === 'PLAYER' ? 'COUNTER_SUPPORT_PLAYER_DRAW' : 'COUNTER_SUPPORT_CPU_DRAW', 
                        isPlayerTurnInteractive: firstActor === 'PLAYER', 
                        gameLog: [...prev.gameLog, ...tempLogEntries] 
                    };
                });
                break;
            case 'COUNTER_SUPPORT_CPU_DRAW':
                 setGameState(prev => {
                    if(!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.cpu.deck, 1);
                    if (drawnCards.length === 0) {
                        addLogEntry('CPUのデッキが尽きた！プレイヤーの勝利！', 'SYSTEM');
                        return {...prev, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('CPUがカウンター／支援フェイズでカードを1枚引きました。', 'CPU');
                    return {...prev, cpu: {...prev.cpu, deck: newDeck, hand: [...prev.cpu.hand, ...drawnCards]}, phase: 'COUNTER_SUPPORT_CPU_PLAY_C', isPlayerTurnInteractive: false};
                 });
                break;
            case 'COUNTER_SUPPORT_CPU_PLAY_C':
                setGameState(prev => prev ? ({ ...prev, isCPUMoving: true }) : null);
                cpuLogicService.getCPUCounterSupportAction(gameState).then(processCPUAction);
                break;
            case 'COMBAT_RESOLUTION':
                {
                    const playerPoints = gameState.player.combatPoints;
                    const cpuPoints = gameState.cpu.combatPoints;
                    let winnerForVisual: PlayerType | 'DRAW' | null = null;
                    if (playerPoints > cpuPoints) winnerForVisual = 'PLAYER';
                    else if (cpuPoints > playerPoints) winnerForVisual = 'CPU';
                    else winnerForVisual = 'DRAW';

                    setCombatResultVisual(winnerForVisual);
                    setIsVisualizingCombat(true);
                    addLogEntry(`戦闘力比較... プレイヤー: ${playerPoints} vs CPU: ${cpuPoints}. 結果表示中...`, 'SYSTEM');
                }
                break;
            case 'END_TURN_CLEANUP':
                 setGameState(prev => {
                    if (!prev) return prev;

                    let newPlayerState = { ...prev.player };
                    let newCpuState = { ...prev.cpu };
                    let tempLogEntries: LogEntry[] = [];

                    if (newPlayerState.squad.length > 0) {
                        const playerSquadMCards = newPlayerState.squad.filter(c => c.type === 'M');
                        if (playerSquadMCards.length > 0) {
                            tempLogEntries.push({message: `プレイヤーの待機MS (${playerSquadMCards.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
                            newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerSquadMCards];
                            newPlayerState.squad = newPlayerState.squad.filter(c => c.type !== 'M'); 
                        }
                    }
                    if (newCpuState.squad.length > 0) {
                        const cpuSquadMCards = newCpuState.squad.filter(c => c.type === 'M');
                         if (cpuSquadMCards.length > 0) {
                            tempLogEntries.push({message: `CPUの待機MS (${cpuSquadMCards.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
                            newCpuState.discardPile = [...newCpuState.discardPile, ...cpuSquadMCards];
                            newCpuState.squad = newCpuState.squad.filter(c => c.type !== 'M'); 
                        }
                    }
                    if (newPlayerState.battlefield.length > 0) {
                        newPlayerState.discardPile = [...newPlayerState.discardPile, ...newPlayerState.battlefield];
                        newPlayerState.battlefield = [];
                    }
                    if (newCpuState.battlefield.length > 0) {
                        newCpuState.discardPile = [...newCpuState.discardPile, ...newCpuState.battlefield];
                        newCpuState.battlefield = [];
                    }
                    
                    tempLogEntries.push({message: `ターン終了。次のターンは ${prev.turnOrder[0] === 'PLAYER' ? 'CPU' : 'プレイヤー'} が地形選択の先手です。編成フェイズへ。`, source: 'SYSTEM', timestamp: Date.now()});


                    const nextActivePlayer = prev.activePlayer === 'PLAYER' ? 'CPU' : 'PLAYER';
                    return {
                        ...prev,
                        activePlayer: nextActivePlayer, 
                        turnOrder: prev.activePlayer === prev.turnOrder[0] ? [prev.turnOrder[1], prev.turnOrder[0]] : [prev.turnOrder[0], prev.turnOrder[1]], 
                        phase: 'FORMATION_PLAYER_DRAW', 
                        isPlayerTurnInteractive: true, 
                        player: {...newPlayerState, combatPoints: 0},
                        cpu: {...newCpuState, combatPoints: 0},
                        currentTerrainCard: null,
                        battlefieldTerrainAttribute: null,
                        counterSupportTurnOrder: null,
                        currentCounterSupportActorIndex: 0,
                        gameLog: [...prev.gameLog, ...tempLogEntries] as LogEntry[]
                    };
                 });
                break;
        }
    } else if (gameState.isPlayerTurnInteractive) { 
        switch (currentPhase) {
            case 'FORMATION_PLAYER_DRAW':
                setGameState(prev => {
                    if (!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.player.deck, 1);
                    if (drawnCards.length === 0) {
                        addLogEntry('プレイヤーのデッキが尽きた！CPUの勝利！', 'SYSTEM');
                        return {...prev, phase: 'GAME_OVER', winner: 'CPU', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('プレイヤーが編成フェイズでカードを1枚引きました。', 'PLAYER');
                    return {...prev, player: {...prev.player, deck: newDeck, hand: [...prev.player.hand, ...drawnCards]}, phase: 'FORMATION_PLAYER_PLACE'};
                });
                break;
            case 'COUNTER_SUPPORT_PLAYER_DRAW':
                setGameState(prev => {
                    if (!prev) return null;
                    const {newDeck, drawnCards} = drawCards(prev.player.deck, 1);
                     if (drawnCards.length === 0) {
                        addLogEntry('プレイヤーのデッキが尽きた！CPUの勝利！', 'SYSTEM');
                        return {...prev, phase: 'GAME_OVER', winner: 'CPU', isPlayerTurnInteractive: false};
                    }
                    addLogEntry('プレイヤーがカウンター／支援フェイズでカードを1枚引きました。', 'PLAYER');
                    return {...prev, player: {...prev.player, deck: newDeck, hand: [...prev.player.hand, ...drawnCards]}, phase: 'COUNTER_SUPPORT_PLAYER_PLAY_C'};
                });
                break;
        }
    }

  }, [gameState, processCPUAction, isVisualizingCombat, isVisualizingUnilateralDeployment, addLogEntry]); 


  if (!gameState) {
    return <div className="p-8 text-center text-slate-600">ゲームを初期化中...</div>;
  }

  const { player, cpu, phase, gameLog, winner, currentTerrainCard, battlefieldTerrainAttribute, isCPUMoving, isPlayerTurnInteractive } = gameState;
  const phaseInstructionText = getPhaseInstruction(phase, player.hand, player.squad, isVisualizingUnilateralDeployment, unilateralDeploymentWinner);
  const canPlayerPlaySelectedCCard = selectedCardLocal && canPlayCCard(selectedCardLocal, player, gameState);
  const pendingTargetMode = getCCardTargetMode(pendingTargetCCard);
  const cCardTargetCandidates = pendingTargetCCard
    ? getCCardTargetCandidates(pendingTargetCCard, gameState, 'PLAYER')
    : [];
  const playerCCardTargetableNumbers = new Set(
    pendingTargetMode === 'OWN_M' ? cCardTargetCandidates.map(card => card.cardNumber) : [],
  );
  const cpuCCardTargetableNumbers = new Set(
    pendingTargetMode && pendingTargetMode !== 'OWN_M' ? cCardTargetCandidates.map(card => card.cardNumber) : [],
  );
  const cCardTargetInstruction = getCCardTargetInstruction(pendingTargetCCard);
  const handleTargetCard = (targetCard: Card) => {
    if (!pendingTargetCCard) return;
    handlePlayerAction('PLAY_C_CARD', pendingTargetCCard, targetCard);
  };
  const cancelCCardTargeting = () => {
    setPendingTargetCCard(null);
  };


  let phaseInstructionContainerClass = 'bg-slate-100';
  let phaseInstructionBaseTextClass = 'text-slate-700';
  let phaseInstructionStatusTextClass = 'text-slate-500';

  if (isVisualizingCombat || isVisualizingUnilateralDeployment) {
    phaseInstructionContainerClass = 'bg-purple-100';
    phaseInstructionBaseTextClass = 'text-purple-700';
    phaseInstructionStatusTextClass = 'text-purple-700';
  } else if (isPlayerTurnInteractive) {
    phaseInstructionContainerClass = 'bg-sky-100';
    phaseInstructionBaseTextClass = 'text-sky-700';
  } else if (
    phase === 'FORMATION_CPU_DRAW' ||
    phase === 'FORMATION_CPU_PLACE' ||
    phase === 'DEPLOYMENT_CPU_TERRAIN' ||
    phase === 'COUNTER_SUPPORT_CPU_DRAW' ||
    phase === 'COUNTER_SUPPORT_CPU_PLAY_C'
  ) {
    phaseInstructionContainerClass = 'bg-red-100';
    phaseInstructionBaseTextClass = 'text-red-700';
    phaseInstructionStatusTextClass = 'text-red-700';
  }

  const battleSummary = isVisualizingCombat ? createBattleSummary(player, cpu, gameLog) : null;

  return (
    <GamePageContext.Provider value={{ handleImageError, imageLoadErrors, setSelectedCard }}>
      <div ref={gameScreenRef} className="game-screen text-slate-800 p-1.5 sm:p-2 lg:p-3 flex flex-col">
        <style dangerouslySetInnerHTML={{ __html: customScrollbarAndAnimationStyles }} />
        <header className="game-topbar mb-1 flex justify-between items-center">
          <h1 className="text-base sm:text-lg font-bold text-sky-700 flex items-center gap-2">
            モビルパワーズ - CPU対戦 
          </h1> 
          <div className="game-mobile-actions">
            <button
              aria-label="ゲーム画面を全画面表示にする"
              className="game-fullscreen-button"
              disabled={isFullscreenActive}
              onClick={requestGameFullscreen}
              type="button"
            >
              {isFullscreenActive ? '全画面中' : '全画面'}
            </button>
            <button onClick={onExit} className="game-exit-button" type="button">
              ゲーム終了
            </button>
          </div>
        </header>

        <aside className="game-orientation-guard" aria-live="polite">
          <span className="game-orientation-icon" aria-hidden="true" />
          <strong>横向きでプレイしてください</strong>
          <span>盤面を表示しきるため、スマホを横向きにしてください。ホーム画面に追加して起動すると、全画面でより安定します。</span>
          <button className="game-fullscreen-button" onClick={requestGameFullscreen} type="button">
            全画面で続ける
          </button>
        </aside>

        <GameOverModal
          winner={winner}
          onRetry={() => initializeGame(initialDeckCode, initialCpuDeckCode)}
          onExit={onExit}
        />

        <LargeCardModal
          isOpen={isLargeCardModalOpen}
          card={cardForLargeModal}
          onClose={closeLargeCardModal}
        />

        <CardCollectionModal
          isOpen={isDiscardPileModalOpen}
          cards={cardsInModal}
          emptyMessage="捨て札はありません。"
          isPlayerCard={discardPileOwnerName === 'プレイヤー'}
          keyPrefix="modal-discard"
          location="discardPile"
          onClose={closeDiscardPileModal}
          onSelectCard={setSelectedCardLocal}
          selectedCard={selectedCardLocal}
          title={`${discardPileOwnerName}の捨て札 (${cardsInModal.length}枚)`}
        />

        <CardCollectionModal
          isOpen={isDeckModalOpen && !!gameState}
          cards={gameState?.player.deck ?? []}
          emptyMessage="山札はありません。"
          isPlayerCard={true}
          keyPrefix="modal-deck"
          location="deck"
          onClose={closeDeckModal}
          onSelectCard={setSelectedCardLocal}
          selectedCard={selectedCardLocal}
          title={`プレイヤーの山札 (${gameState?.player.deck.length ?? 0}枚)`}
        />

        <GameTableLayout
          battlefieldTerrainAttribute={battlefieldTerrainAttribute}
          battleSummary={battleSummary}
          canPlayerPlaySelectedCCard={canPlayerPlaySelectedCCard}
          combatResultVisual={combatResultVisual}
          cpu={cpu}
          cCardTargetInstruction={cCardTargetInstruction}
          cpuCCardTargetableNumbers={cpuCCardTargetableNumbers}
          currentTerrainCard={currentTerrainCard}
          gameLog={gameLog}
          imageLoadErrors={imageLoadErrors}
          isCPUMoving={isCPUMoving}
          isCpuWinnerVisualizing={
            ((combatResultVisual === 'CPU' || combatResultVisual === 'DRAW') && isVisualizingCombat) ||
            (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'CPU')
          }
          isPlayerTurnInteractive={isPlayerTurnInteractive}
          isPlayerWinnerVisualizing={
            ((combatResultVisual === 'PLAYER' || combatResultVisual === 'DRAW') && isVisualizingCombat) ||
            (isVisualizingUnilateralDeployment && unilateralDeploymentWinner === 'PLAYER')
          }
          isVisualizingCombat={isVisualizingCombat}
          isVisualizingUnilateralDeployment={isVisualizingUnilateralDeployment}
          onImageError={handleImageError}
          onConfirmCombatResolution={confirmCombatResolution}
          onOpenDiscardPile={openDiscardPileModal}
          onOpenLargeCard={openLargeCardModal}
          onOpenPlayerDeck={openPlayerDeckModal}
          onCancelCCardTargeting={cancelCCardTargeting}
          onPlayerAction={handlePlayerAction}
          onSelectCard={setSelectedCard}
          onTargetCard={handleTargetCard}
          phase={phase}
          phaseInstructionBaseTextClass={phaseInstructionBaseTextClass}
          phaseInstructionContainerClass={phaseInstructionContainerClass}
          phaseInstructionStatusTextClass={phaseInstructionStatusTextClass}
          phaseInstructionText={phaseInstructionText}
          player={player}
          playerCCardTargetableNumbers={playerCCardTargetableNumbers}
          pendingTargetCCard={pendingTargetCCard}
          selectedCard={selectedCardLocal}
          unilateralDeploymentWinner={unilateralDeploymentWinner}
          winner={winner}
        />
      </div>
    </GamePageContext.Provider>
  );
};
