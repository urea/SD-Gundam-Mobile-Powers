
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BattleSummary, Card, GameState, PlayerType, CPUAction, LogEntry, PlayedCCardSummary } from '../types';
import { parseMobilePowersTsvData, tsvData as allCardsTsvData } from '../components/RulePage';
import { CardCollectionModal, GameOverModal, LargeCardModal } from '../components/game/GameModals';
import { GamePageContext } from '../components/game/GamePageContext';
import { GameTableLayout } from '../components/game/GameTableLayout';
import * as cpuLogicService from '../services/cpuLogicService';
import { createFullCardInstancePool, generateCompressedDeckCode, parseCompressedDeckCode } from '../utils/deckCodeUtils';
import { getCardBaseId, getCardInstanceId, isSameCardInstance } from '../utils/cardIdentity';
import { cpuDeckPresets } from '../data/cpuDecks'; // Import CPU presets to find by code if needed, though MainMenu should resolve ID to code.
import {
  applyCCardEffect,
  canDeploy,
  canPlayCCard,
  checkCombos,
  drawCards,
  getCCardTargetCandidates,
  getCCardTargetMode,
  getPhaseInstruction,
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
    grid-template-rows: auto minmax(9.75rem, 2fr) minmax(7rem, auto);
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
  .game-battlefield-area {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.375rem;
    isolation: isolate;
    overflow: hidden;
  }
  .game-battlefield-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: block;
    pointer-events: none;
  }
  .game-battlefield-log-panel {
    position: absolute;
    left: 0.5rem;
    top: clamp(0.45rem, 1.2vw, 0.9rem);
    bottom: clamp(0.45rem, 1.2vw, 0.9rem);
    width: min(22rem, 36vw);
    max-height: none;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.2rem;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.48);
    background: rgba(248, 250, 252, 0.9);
    box-shadow: 0 10px 26px rgba(15, 23, 42, 0.13);
    padding: 0.28rem 0.42rem;
    pointer-events: auto;
    -webkit-user-select: text;
    user-select: text;
  }
  .game-battlefield-log-panel-battle {
    width: min(24rem, 38vw);
    max-height: none;
    grid-template-rows: auto auto minmax(0, 1fr);
  }
  .game-battlefield-terrain-node {
    position: absolute;
    right: clamp(0.55rem, 2vw, 1.6rem);
    top: 50%;
    max-width: min(19rem, 28vw);
    min-width: min(12rem, 24vw);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.42);
    background: rgba(248, 250, 252, 0.86);
    padding: 0.22rem 0.42rem;
    text-align: center;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    transform: translateY(-50%);
  }
  .game-battlefield-terrain-node button,
  .game-center-confirm-button {
    pointer-events: auto;
  }
  .game-battlefield-confirm-node {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 14;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .game-defeat-points {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 3.3rem;
    border-radius: 6px;
    border: 1px solid currentColor;
    padding: 0.13rem 0.35rem;
    font-size: 0.78rem;
    font-weight: 900;
    line-height: 1.05;
  }
  .game-defeat-points-player {
    color: #0369a1;
    background: #e0f2fe;
  }
  .game-defeat-points-cpu {
    color: #b91c1c;
    background: #fee2e2;
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
    isolation: isolate;
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
  .game-lane-terrain-active .game-lane-surface {
    background-image:
      linear-gradient(90deg, rgba(14, 165, 233, 0.14), rgba(248, 250, 252, 0.16) 50%, rgba(248, 113, 113, 0.12)),
      var(--lane-terrain-image);
    background-repeat: no-repeat;
    background-size: 100% 100%, cover;
    background-position: center, center;
    border-style: solid;
    border-color: rgba(226, 232, 240, 0.62);
    box-shadow: inset 0 0 38px rgba(15, 23, 42, 0.18);
    animation: lane-terrain-drift 18s ease-in-out infinite alternate;
  }
  .game-lane-terrain-active .game-lane-surface::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(248, 250, 252, 0.12), rgba(15, 23, 42, 0.18)),
      radial-gradient(circle at 50% 50%, rgba(248, 250, 252, 0.16), transparent 18rem);
  }
  .game-lane-beams {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    opacity: 0.52;
    pointer-events: none;
    mix-blend-mode: screen;
  }
  .game-lane-battle-active .game-lane-beams {
    opacity: 0;
  }
  .game-lane-battle-active .game-lane-beam {
    animation: none;
  }
  .game-lane-beam {
    position: absolute;
    left: var(--beam-left, 50%);
    top: var(--beam-top, 50%);
    width: var(--beam-width, 42%);
    height: var(--beam-height, 3px);
    border-radius: 999px;
    background: linear-gradient(90deg, transparent, currentColor 18%, rgba(248, 250, 252, 0.95) 50%, currentColor 82%, transparent);
    color: var(--beam-color, #67e8f9);
    filter: drop-shadow(0 0 7px currentColor);
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--beam-angle, 0deg)) scaleX(0.3);
    transform-origin: center;
    animation: lane-beam-sweep var(--beam-duration, 2.6s) ease-in-out infinite;
    animation-delay: var(--beam-delay, 0s);
  }
  .game-lane-beams-player .game-lane-beam {
    --beam-color: #67e8f9;
  }
  .game-lane-beams-cpu .game-lane-beam {
    --beam-color: #fda4af;
  }
  .game-lane-beam-1 {
    --beam-left: 35%;
    --beam-top: 28%;
    --beam-width: 58%;
    --beam-angle: 9deg;
    --beam-duration: 2.2s;
    --beam-delay: -0.2s;
  }
  .game-lane-beam-2 {
    --beam-left: 62%;
    --beam-top: 42%;
    --beam-width: 52%;
    --beam-angle: -16deg;
    --beam-duration: 2.7s;
    --beam-delay: -1.05s;
  }
  .game-lane-beam-3 {
    --beam-left: 48%;
    --beam-top: 66%;
    --beam-width: 68%;
    --beam-angle: 4deg;
    --beam-duration: 2.4s;
    --beam-delay: -1.65s;
  }
  .game-lane-beam-4 {
    --beam-left: 72%;
    --beam-top: 72%;
    --beam-width: 42%;
    --beam-angle: 24deg;
    --beam-duration: 3s;
    --beam-delay: -0.7s;
  }
  .game-lane-beam-5 {
    --beam-left: 25%;
    --beam-top: 78%;
    --beam-width: 44%;
    --beam-angle: -28deg;
    --beam-duration: 2.85s;
    --beam-delay: -2.1s;
  }
  .game-lane-beam-6 {
    --beam-left: 54%;
    --beam-top: 16%;
    --beam-width: 48%;
    --beam-height: 2px;
    --beam-angle: 34deg;
    --beam-duration: 2.55s;
    --beam-delay: -1.35s;
  }
  .game-lane-explosion {
    position: absolute;
    inset: 0;
    z-index: 5;
    overflow: hidden;
    pointer-events: none;
    mix-blend-mode: screen;
  }
  .game-lane-explosion-core,
  .game-lane-explosion-ring,
  .game-lane-explosion-spark {
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 999px;
    pointer-events: none;
  }
  .game-lane-explosion-core {
    width: clamp(5rem, 13vw, 10rem);
    aspect-ratio: 1;
    background:
      radial-gradient(circle, rgba(255, 255, 255, 0.96) 0 9%, rgba(254, 240, 138, 0.9) 10% 24%, rgba(249, 115, 22, 0.72) 25% 42%, rgba(239, 68, 68, 0.34) 43% 58%, transparent 60%),
      radial-gradient(circle, rgba(248, 113, 113, 0.5), transparent 70%);
    filter: drop-shadow(0 0 18px rgba(251, 191, 36, 0.86));
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.35);
    animation: lane-explosion-core 1.15s ease-out infinite;
  }
  .game-lane-explosion-ring {
    width: clamp(5.8rem, 16vw, 12rem);
    aspect-ratio: 1;
    border: 0.22rem solid rgba(254, 240, 138, 0.68);
    box-shadow: 0 0 20px rgba(250, 204, 21, 0.4);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.28);
    animation: lane-explosion-ring 1.15s ease-out infinite;
  }
  .game-lane-explosion-spark {
    width: clamp(5rem, 14vw, 10rem);
    height: 0.18rem;
    background: linear-gradient(90deg, transparent, rgba(254, 240, 138, 0.96), rgba(248, 113, 113, 0.78), transparent);
    filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.76));
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--spark-angle, 0deg)) scaleX(0.2);
    animation: lane-explosion-spark 1.15s ease-out infinite;
  }
  .game-lane-explosion-spark-1 {
    --spark-angle: 12deg;
  }
  .game-lane-explosion-spark-2 {
    --spark-angle: -31deg;
    animation-delay: 0.08s;
  }
  .game-lane-explosion-spark-3 {
    --spark-angle: 58deg;
    animation-delay: 0.14s;
  }
  .game-lane-battle-player .game-lane-surface {
    border-color: rgba(14, 165, 233, 0.64);
  }
  .game-lane-battle-cpu .game-lane-surface {
    border-color: rgba(248, 113, 113, 0.64);
  }
  .game-lane-battle-draw .game-lane-surface {
    border-color: rgba(250, 204, 21, 0.64);
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
    transform: scale(0.82);
  }
  .game-lane-badge {
    position: absolute;
    z-index: 3;
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
  .game-lane-score {
    position: absolute;
    right: 0.5rem;
    z-index: 6;
    min-width: 3.8rem;
    display: grid;
    place-items: center;
    border-radius: 8px;
    border: 1px solid currentColor;
    padding: 0.16rem 0.34rem;
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.14);
    line-height: 1;
  }
  .game-lane-score span {
    font-size: 0.5rem;
    font-weight: 900;
  }
  .game-lane-score strong {
    font-size: clamp(1.4rem, 2.7vw, 2.25rem);
    font-weight: 900;
  }
  .game-lane-score-cpu {
    top: 0.45rem;
  }
  .game-lane-score-player {
    bottom: 0.45rem;
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
  .game-card-destroyed {
    filter: grayscale(0.35) saturate(0.78);
  }
  .game-card-tapped {
    filter: saturate(0.82) brightness(0.95);
    outline: 2px solid rgba(245, 158, 11, 0.75);
    outline-offset: -2px;
  }
  .game-card-pending-discard {
    filter: grayscale(0.2) saturate(0.72) brightness(0.94);
    outline: 2px solid rgba(100, 116, 139, 0.82);
    outline-offset: -2px;
  }
  .game-card-pending-defeat {
    filter: saturate(0.72) brightness(0.92);
    outline: 2px solid rgba(220, 38, 38, 0.82);
    outline-offset: -2px;
  }
  .game-card-tapped-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    z-index: 5;
    padding: 0.1rem 0.3rem;
    border-radius: 999px;
    background: rgba(146, 64, 14, 0.9);
    color: #fffbeb;
    font-size: 0.55rem;
    font-weight: 800;
    line-height: 1.15;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
  }
  .game-card-pending-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    z-index: 5;
    padding: 0.1rem 0.3rem;
    border-radius: 999px;
    color: #fff;
    font-size: 0.55rem;
    font-weight: 900;
    line-height: 1.15;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
  }
  .game-card-pending-discard-badge {
    background: rgba(71, 85, 105, 0.94);
  }
  .game-card-pending-defeat-badge {
    background: rgba(185, 28, 28, 0.94);
  }
  .game-card-destroyed-overlay {
    position: absolute;
    inset: 0;
    z-index: 6;
    display: grid;
    place-items: center;
    border-radius: inherit;
    background:
      linear-gradient(135deg, transparent 0 43%, rgba(127, 29, 29, 0.92) 44% 56%, transparent 57%),
      linear-gradient(45deg, transparent 0 43%, rgba(127, 29, 29, 0.92) 44% 56%, transparent 57%),
      rgba(15, 23, 42, 0.28);
    pointer-events: none;
  }
  .game-card-destroyed-mark {
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 2px solid rgba(254, 226, 226, 0.94);
    background: rgba(153, 27, 27, 0.9);
    color: #fef2f2;
    font-size: 1.6rem;
    font-weight: 900;
    line-height: 1;
    box-shadow: 0 0 18px rgba(127, 29, 29, 0.55);
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
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, clamp(5.25rem, 8.9vw, 8.1rem)));
    justify-content: center;
    justify-items: center;
    align-items: center;
    gap: clamp(0.28rem, 0.65vw, 0.55rem);
    overflow: hidden;
    padding: 0.1rem 0.2rem;
  }
  .game-field-slot {
    position: relative;
    min-width: 0;
    width: 100%;
    height: auto;
    aspect-ratio: 5 / 7;
    display: grid;
    place-items: center;
    border-radius: 8px;
    overflow: visible;
    isolation: isolate;
  }
  .game-field-slot-empty {
    border: 1px dashed rgba(100, 116, 139, 0.28);
    background: rgba(255, 255, 255, 0.34);
  }
  .game-field-slot-empty-label {
    color: rgba(71, 85, 105, 0.42);
    font-size: 0.58rem;
    font-weight: 900;
    line-height: 1;
  }
  .game-lane-cards .game-field-card {
    width: 100%;
    height: 100%;
    max-height: none;
    aspect-ratio: 5 / 7;
    flex: none;
  }
  .game-field-card-counter {
    z-index: 4;
  }
  .game-field-card-counter .game-card-size {
    box-shadow: 0 7px 18px rgba(161, 98, 7, 0.28);
  }
  .game-cs-slot-label,
  .game-field-overflow-count {
    position: absolute;
    z-index: 7;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: #fff7ed;
    font-size: 0.52rem;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
    box-shadow: 0 2px 7px rgba(15, 23, 42, 0.24);
  }
  .game-cs-slot-label {
    left: 0.2rem;
    top: 0.2rem;
    padding: 0.14rem 0.28rem;
    background: rgba(180, 83, 9, 0.94);
  }
  .game-field-overflow-count {
    right: 0.2rem;
    top: 0.2rem;
    min-width: 1.25rem;
    height: 1.25rem;
    background: rgba(15, 23, 42, 0.8);
  }
  .game-field-card-stacked {
    justify-self: start;
    align-self: start;
    width: 82%;
    height: 82%;
  }
  .game-field-card-counter-compact {
    position: absolute;
    right: -0.05rem;
    bottom: -0.05rem;
    width: 48%;
    height: 48%;
    z-index: 6;
  }
  .game-field-card-counter-compact .game-card-size {
    border-radius: 5px;
  }
  .game-field-card-counter-compact .game-cs-slot-label {
    left: -0.1rem;
    top: -0.1rem;
    padding: 0.1rem 0.2rem;
    font-size: 0.42rem;
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
    grid-template-columns: minmax(20rem, 44%) minmax(4rem, auto) minmax(9rem, 18%) minmax(4rem, auto) minmax(7rem, 14%);
    grid-template-rows: auto auto;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.35rem;
  }
  .game-center-info-node {
    grid-column: 1 / 2;
    grid-row: 1 / 3;
    min-width: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.25rem;
    padding: 0.3rem 0.45rem;
    overflow: hidden;
  }
  .game-center-info-node-with-battle {
    grid-template-rows: auto auto minmax(0, 1fr);
  }
  .game-center-status-row {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.45rem;
    border-radius: 5px;
    padding: 0.12rem 0.34rem;
    background: rgba(241, 245, 249, 0.92);
    color: #475569;
    font-size: 0.62rem;
    line-height: 1.15;
  }
  .game-center-status-row strong {
    font-size: 0.64rem;
    font-weight: 900;
    white-space: nowrap;
  }
  .game-center-status-row span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .game-center-status-player {
    background: rgba(224, 242, 254, 0.92);
    color: #0369a1;
  }
  .game-center-status-counter {
    background: rgba(243, 232, 255, 0.9);
    color: #7e22ce;
  }
  .game-center-status-cpu {
    background: rgba(254, 226, 226, 0.9);
    color: #b91c1c;
  }
  .game-center-status-battle {
    background: rgba(255, 237, 213, 0.92);
    color: #c2410c;
  }
  .game-score-node,
  .game-terrain-node,
  .game-counter-side,
  .game-center-info-node,
  .game-selected-node {
    border-radius: 7px;
    border: 1px solid rgba(148, 163, 184, 0.42);
    background: rgba(248, 250, 252, 0.86);
  }
  .game-score-node {
    grid-row: 1 / 3;
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
    grid-row: 1 / 3;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0.32rem;
    text-align: center;
  }
  .game-terrain-content {
    max-width: 100%;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
  }
  .game-terrain-card-thumb {
    width: 1.25rem;
    height: 1.68rem;
    flex: 0 0 1.25rem;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: #e2e8f0;
    color: #475569;
    font-size: 0.62rem;
    font-weight: 900;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.14);
  }
  .game-terrain-card-thumb:not(:disabled) {
    cursor: zoom-in;
  }
  .game-terrain-card-thumb:disabled {
    cursor: default;
    opacity: 0.8;
  }
  .game-terrain-card-thumb img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #f8fafc;
  }
  .game-terrain-copy {
    min-width: 0;
    display: grid;
    justify-items: start;
    text-align: left;
    line-height: 1.15;
  }
  .game-terrain-name {
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
  .game-counter-node {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.25rem;
  }
  .game-counter-side {
    min-width: 0;
    min-height: 2.55rem;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.28rem;
    padding: 0.18rem 0.32rem;
  }
  .game-counter-side-player {
    border-color: rgba(14, 165, 233, 0.34);
    background: rgba(239, 246, 255, 0.92);
  }
  .game-counter-side-cpu {
    border-color: rgba(248, 113, 113, 0.34);
    background: rgba(254, 242, 242, 0.92);
  }
  .game-counter-title {
    display: flex;
    flex-direction: column;
    color: #475569;
    font-size: 0.52rem;
    font-weight: 900;
    line-height: 1.1;
    white-space: nowrap;
  }
  .game-counter-list {
    min-width: 0;
    display: grid;
    align-items: center;
  }
  .game-counter-card {
    min-width: 0;
    display: grid;
    grid-template-columns: 1.55rem minmax(0, 1fr);
    align-items: center;
    gap: 0.25rem;
    border-radius: 5px;
    color: #334155;
    text-align: left;
  }
  .game-counter-card img,
  .game-counter-fallback {
    width: 1.55rem;
    aspect-ratio: 5 / 7;
    border-radius: 4px;
    object-fit: cover;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.14);
  }
  .game-counter-fallback {
    display: grid;
    place-items: center;
    background: #e2e8f0;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 900;
  }
  .game-counter-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.04rem;
    line-height: 1.12;
  }
  .game-counter-copy strong,
  .game-counter-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .game-counter-copy strong {
    font-size: 0.62rem;
    font-weight: 900;
  }
  .game-counter-copy span,
  .game-counter-empty {
    color: #64748b;
    font-size: 0.58rem;
  }
  .game-counter-empty {
    font-weight: 800;
  }
  .game-log-node {
    min-height: 0;
    display: grid;
    align-content: start;
    gap: 0.08rem;
    overflow: auto;
    padding: 0.05rem 0.16rem 0.1rem;
    font-size: 0.62rem;
    color: #111827;
    cursor: text;
    -webkit-user-select: text;
    user-select: text;
  }
  .game-log-node p {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    overflow-wrap: anywhere;
    -webkit-user-select: text;
    user-select: text;
  }
  .game-log-entry-player {
    color: #0369a1;
  }
  .game-log-entry-cpu {
    color: #b91c1c;
  }
  .game-log-entry-system {
    color: #111827;
  }
  .game-center-battle-summary {
    min-width: 0;
    display: grid;
    gap: 0.22rem;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.34);
    background: rgba(15, 23, 42, 0.05);
    padding: 0.22rem 0.34rem;
  }
  .game-center-battle-summary-player {
    border-color: rgba(14, 165, 233, 0.36);
    background: rgba(224, 242, 254, 0.5);
  }
  .game-center-battle-summary-cpu {
    border-color: rgba(248, 113, 113, 0.36);
    background: rgba(254, 226, 226, 0.48);
  }
  .game-center-battle-summary-draw {
    border-color: rgba(250, 204, 21, 0.42);
    background: rgba(254, 249, 195, 0.48);
  }
  .game-center-battle-head {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.4rem;
    color: #334155;
    font-size: 0.62rem;
  }
  .game-center-battle-head strong {
    color: #0f172a;
    font-size: 0.7rem;
    font-weight: 900;
    white-space: nowrap;
  }
  .game-center-battle-head span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 800;
  }
  .game-center-confirm-button {
    border: 1px solid rgba(14, 165, 233, 0.46);
    border-radius: 5px;
    background: #0284c7;
    color: white;
    padding: 0.12rem 0.42rem;
    font-size: 0.58rem;
    font-weight: 900;
    line-height: 1.2;
    white-space: nowrap;
  }
  .game-battlefield-confirm-button {
    min-width: 8.6rem;
    border-color: rgba(14, 165, 233, 0.62);
    border-radius: 7px;
    box-shadow: 0 12px 26px rgba(2, 132, 199, 0.24);
    padding: 0.35rem 0.8rem;
    font-size: 0.74rem;
  }
  .game-center-confirm-button:hover,
  .game-center-confirm-button:focus-visible {
    background: #0369a1;
    outline: none;
  }
  .game-center-battle-formulas {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.28rem;
    color: #475569;
    font-size: 0.56rem;
    font-weight: 800;
    line-height: 1.18;
  }
  .game-center-battle-formulas span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .game-center-battle-formulas strong {
    margin-right: 0.25rem;
    color: #0f172a;
  }
  .game-selected-node {
    grid-column: 5 / 6;
    grid-row: 1 / 3;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    padding: 0.25rem 0.45rem;
    font-size: 0.68rem;
  }
  .game-selected-node-empty {
    pointer-events: none;
  }
  .game-combo-pulse {
    animation: combo-pulse 1.1s ease-out;
  }
  .game-player-dock {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    align-items: stretch;
    padding: 0.35rem;
  }
  .game-player-command-panel {
    position: absolute;
    left: 0.35rem;
    top: 0.35rem;
    bottom: 0.35rem;
    z-index: 5;
    width: clamp(11rem, 15vw, 14rem);
    min-width: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    align-content: center;
    gap: 0.25rem;
    border-radius: 7px;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(239, 246, 255, 0.92));
    border: 1px solid rgba(14, 165, 233, 0.28);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.11);
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
    grid-column: 1 / -1;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(8, minmax(0, clamp(3.35rem, 5.25vw, 4.7rem)));
    justify-content: center;
    justify-items: center;
    align-items: center;
    gap: clamp(0.2rem, 0.42vw, 0.4rem);
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 7px;
    background: rgba(241, 245, 249, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.42);
    padding: 0.35rem;
    overscroll-behavior-x: contain;
    touch-action: pan-x;
  }
  .game-hand-slot {
    width: 100%;
    aspect-ratio: 5 / 7;
    display: grid;
    place-items: center;
    border-radius: 7px;
  }
  .game-hand-slot-empty {
    border: 1px dashed rgba(100, 116, 139, 0.18);
    background: rgba(255, 255, 255, 0.25);
  }
  .game-table-layout .game-card-size {
    width: clamp(3rem, 5.2vw, 4.75rem);
    height: auto;
    aspect-ratio: 5 / 7;
    flex: 0 0 auto;
  }
  .game-hand-slot .game-card-size {
    width: 100%;
    height: auto;
    max-width: none;
  }
  .game-lane-cards .game-card-size {
    width: 100%;
    height: 100%;
    max-width: none;
  }
  .game-stage-formation .game-lane-cards .game-field-card-squad {
    max-height: none;
  }
  .game-stage-deployment .game-lane-cards .game-field-card-squad,
  .game-stage-battle .game-lane-cards .game-field-card-squad {
    width: 100%;
    height: 100%;
    max-height: none;
  }
  .game-field-slot {
    overflow: visible;
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
    .game-lane-cards {
      grid-template-columns: repeat(4, minmax(0, clamp(4.75rem, 8.35vw, 7rem)));
    }
    .game-field-slot {
      width: 100%;
      height: auto;
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
      grid-template-rows: auto minmax(9.4rem, 1fr) minmax(4.65rem, auto);
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
      transform: scale(0.82);
    }
    .game-lane-badge {
      font-size: 0.5rem;
      padding: 0.13rem 0.25rem;
    }
    .game-lane-score {
      right: 0.35rem;
      min-width: 2.9rem;
      padding: 0.1rem 0.24rem;
    }
    .game-lane-score span {
      display: none;
    }
    .game-lane-score strong {
      font-size: clamp(1.12rem, 2.9vw, 1.7rem);
    }
    .game-lane-score-cpu {
      top: 0.32rem;
    }
    .game-lane-score-player {
      bottom: 0.32rem;
    }
    .game-lane-cards,
    .game-hand-scroll {
      gap: 0.25rem;
    }
    .game-hand-scroll {
      grid-template-columns: repeat(8, minmax(0, clamp(2.75rem, 5.6vw, 3.85rem)));
    }
    .game-lane-cards {
      inset: 0.18rem 0.25rem;
      grid-template-columns: repeat(4, minmax(0, clamp(3.65rem, 7.8vw, 5.2rem)));
      gap: 0.25rem;
      padding: 0.05rem 0.15rem;
    }
    .game-field-slot {
      width: 100%;
      height: auto;
    }
    .game-lane-cards .game-field-card {
      width: 100%;
      height: 100%;
      max-height: none;
    }
    .game-battlefield-area {
      gap: 0.22rem;
    }
    .game-battlefield-log-panel {
      left: 0.42rem;
      top: 0.36rem;
      bottom: 0.36rem;
      width: min(15rem, 34vw);
      max-height: none;
      gap: 0.12rem;
      padding: 0.16rem 0.26rem;
    }
    .game-battlefield-log-panel-battle {
      width: min(16.5rem, 36vw);
      max-height: none;
    }
    .game-battlefield-terrain-node {
      right: 0.42rem;
      min-width: 5.8rem;
      max-width: 6.6rem;
      padding: 0.14rem 0.22rem;
    }
    .game-battlefield-terrain-node .game-terrain-copy {
      display: none;
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
    .game-terrain-card-thumb {
      width: 1.25rem;
      height: 1.68rem;
      flex-basis: 1.25rem;
    }
    .game-center-info-node {
      gap: 0.16rem;
      padding: 0.16rem 0.25rem;
    }
    .game-center-status-row {
      gap: 0.24rem;
      padding: 0.08rem 0.22rem;
      font-size: 0.52rem;
    }
    .game-center-status-row strong,
    .game-center-battle-head strong {
      font-size: 0.58rem;
    }
    .game-center-battle-summary {
      gap: 0.12rem;
      padding: 0.14rem 0.22rem;
    }
    .game-center-battle-head {
      gap: 0.24rem;
      font-size: 0.54rem;
    }
    .game-center-confirm-button {
      padding: 0.08rem 0.25rem;
      font-size: 0.5rem;
    }
    .game-battlefield-confirm-button {
      min-width: 6.8rem;
      padding: 0.24rem 0.5rem;
      font-size: 0.6rem;
    }
    .game-center-battle-formulas {
      grid-template-columns: minmax(0, 1fr);
      gap: 0.08rem;
      font-size: 0.5rem;
    }
    .game-log-node {
      font-size: 0.54rem;
    }
    .game-counter-node {
      gap: 0.16rem;
    }
    .game-counter-side {
      min-height: 2.15rem;
      gap: 0.18rem;
      padding: 0.12rem 0.2rem;
    }
    .game-counter-title {
      font-size: 0.47rem;
    }
    .game-counter-card {
      grid-template-columns: 1.25rem minmax(0, 1fr);
      gap: 0.18rem;
    }
    .game-counter-card img,
    .game-counter-fallback {
      width: 1.25rem;
    }
    .game-counter-copy strong {
      font-size: 0.56rem;
    }
    .game-counter-copy span {
      display: none;
    }
    .game-selected-node {
      display: none;
    }
    .game-player-dock {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
      padding: 0.2rem;
    }
    .game-player-command-panel {
      left: 0.2rem;
      top: 0.2rem;
      bottom: 0.2rem;
      width: clamp(7.9rem, 17vw, 8.75rem);
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
    .game-hand-slot .game-card-size {
      width: 100%;
      height: auto;
    }
    .game-lane-cards .game-card-size {
      width: 100%;
      height: 100%;
    }
    .game-stage-formation .game-lane-cards .game-field-card-squad {
      max-height: none;
    }
    .game-stage-deployment .game-lane-cards .game-field-card-squad,
    .game-stage-battle .game-lane-cards .game-field-card-squad {
      width: 100%;
      height: 100%;
      max-height: none;
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
  @keyframes lane-terrain-drift {
    from { background-position-x: center, 49%; }
    to { background-position-x: center, 51%; }
  }
  @keyframes lane-beam-sweep {
    0%, 16%, 100% {
      opacity: 0;
      transform: translate(-58%, -50%) rotate(var(--beam-angle, 0deg)) scaleX(0.18);
    }
    28%, 72% {
      opacity: 0.88;
      transform: translate(-50%, -50%) rotate(var(--beam-angle, 0deg)) scaleX(1);
    }
    86% {
      opacity: 0;
      transform: translate(-42%, -50%) rotate(var(--beam-angle, 0deg)) scaleX(0.42);
    }
  }
  @keyframes lane-explosion-core {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.28); filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.2)); }
    18% { opacity: 1; transform: translate(-50%, -50%) scale(1.02); filter: drop-shadow(0 0 22px rgba(251, 191, 36, 0.88)); }
    48% { opacity: 0.72; transform: translate(-50%, -50%) scale(0.82); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.26); filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0)); }
  }
  @keyframes lane-explosion-ring {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.22); }
    22% { opacity: 0.9; transform: translate(-50%, -50%) scale(0.78); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.55); }
  }
  @keyframes lane-explosion-spark {
    0%, 10% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spark-angle, 0deg)) scaleX(0.15); }
    26% { opacity: 0.92; transform: translate(-50%, -50%) rotate(var(--spark-angle, 0deg)) scaleX(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spark-angle, 0deg)) scaleX(1.42); }
  }
  @keyframes combo-pulse {
    0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
    22% { box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.34), 0 10px 34px rgba(250, 204, 21, 0.18); }
    100% { box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); }
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

const isActiveMCard = (card: Card): boolean => card.type === 'M' && !card.isDestroyed;

const getBattlefieldBaseTotal = (cards: Card[]): number =>
  cards
    .filter(isActiveMCard)
    .reduce((total, card) => total + (parseInt(card.points, 10) || 0), 0);

const clearDestroyedMarker = (card: Card): Card => (
  card.isDestroyed ? { ...card, isDestroyed: undefined } : card
);

const clearTemporaryCardState = (card: Card): Card => {
  const nextCard = { ...card };
  delete nextCard.isDestroyed;
  delete nextCard.isTapped;
  delete nextCard.isPendingDiscard;
  delete nextCard.isPendingDefeat;
  return nextCard;
};

const getCardDisplayName = (card: Card): string => card.cardNameOmm || card.cardName;

const getCardLogList = (
  cards: Card[],
  owner?: PlayerType,
  visibility: 'public' | 'faceDown' = 'public',
): string => (
  owner === 'CPU' && visibility === 'faceDown'
    ? `${cards.length}枚`
    : cards.map(getCardDisplayName).join(', ')
);

const createLogEntry = (message: string, source: LogEntry['source'] = 'SYSTEM'): LogEntry => ({
  message,
  source,
  timestamp: Date.now(),
});

const appendLogEntries = (gameLog: LogEntry[], entries: LogEntry[]): LogEntry[] => {
  const nextLog = [...gameLog];
  entries.forEach(entry => {
    const lastEntry = nextLog[nextLog.length - 1];
    const isDuplicate =
      lastEntry &&
      lastEntry.source === entry.source &&
      lastEntry.message === entry.message &&
      Math.abs(entry.timestamp - lastEntry.timestamp) < 1000;
    if (!isDuplicate) {
      nextLog.push(entry);
    }
  });
  return nextLog;
};

const flushPendingSquadDiscards = (
  state: GameState['player'],
  owner: PlayerType,
): { state: GameState['player']; logEntry: LogEntry | null } => {
  const pendingDiscardCards = state.squad.filter(card => card.type === 'M' && card.isPendingDiscard);
  if (pendingDiscardCards.length === 0) {
    return { state, logEntry: null };
  }

  const pendingIds = new Set(pendingDiscardCards.map(getCardInstanceId));
  const ownerName = owner === 'PLAYER' ? 'プレイヤー' : 'CPU';
  return {
    state: {
      ...state,
      squad: state.squad.filter(card => !pendingIds.has(getCardInstanceId(card))),
      discardPile: [...state.discardPile, ...pendingDiscardCards.map(clearTemporaryCardState)],
    },
    logEntry: {
      message: `${ownerName}の捨て札予定Mカード (${getCardLogList(pendingDiscardCards, owner, 'faceDown')}) は捨て札へ。`,
      source: owner,
      timestamp: Date.now(),
    },
  };
};

const findLastCombatStartIndex = (gameLog: LogEntry[]): number => {
  for (let index = gameLog.length - 1; index >= 0; index--) {
    if (gameLog[index].message.includes('攻撃ポイント計算後')) {
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
  const mCards = battlefield.filter(isActiveMCard);
  const cards = mCards.map(card => {
    const basePoints = parseInt(card.points, 10) || 0;
    return {
      cardNumber: card.cardNumber,
      name: card.cardNameOmm || card.cardName,
      sourceCard: card,
      imageUrl: card.imageUrl,
      basePoints,
      tagBonus: 0,
      tagDetails: [],
      total: basePoints,
      terrain: card.terrainTypeMCards || '-',
    };
  });
  const combos = checkCombos(mCards, ownerName).achievedCombos;
  const baseTotal = cards.reduce((total, card) => total + card.basePoints, 0);
  const tagTotal = 0;
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
    tagLogs: [],
  };
};

const createPlayedCCardSummaries = (
  playedCCards: PlayedCCardSummary[],
): BattleSummary['playedCCards'] => {
  return playedCCards;
};

const createBattleSummary = (player: GameState['player'], cpu: GameState['cpu'], gameLog: LogEntry[], playedCCards: PlayedCCardSummary[]): BattleSummary => {
  const playerSummary = createCombatSideSummary(player.battlefield, player.combatPoints, 'プレイヤー');
  const cpuSummary = createCombatSideSummary(cpu.battlefield, cpu.combatPoints, 'CPU');

  return {
    player: playerSummary,
    cpu: cpuSummary,
    cCardLogs: getSupportLogSummaries(gameLog),
    tagLogs: [...playerSummary.tagLogs, ...cpuSummary.tagLogs],
    playedCCards: createPlayedCCardSummaries(playedCCards),
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
    if (pendingTargetCCard && !isSameCardInstance(card, pendingTargetCCard)) {
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
      return { ...prev, gameLog: appendLogEntries(prev.gameLog, [createLogEntry(message, source)]) };
    });
  }, []);


  useEffect(() => {
    const parsedBase = parseMobilePowersTsvData(allCardsTsvData);
    setAllBaseCards(parsedBase);

    if (parsedBase.length > 0) {
        const instancePool = createFullCardInstancePool(parsedBase);
        setFullInstancePool(instancePool);

        const gamePlayableBaseCards = parsedBase.filter(c => c.type === 'M' || c.type === 'C');
        const sortedBaseCardNumbers = Array.from(new Set(gamePlayableBaseCards.map(getCardBaseId))).sort();
        
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
      playedCCards: [],
      gameLog: gameLogMessages,
      winner: null,
      isPlayerTurnInteractive: true, 
      isCPUMoving: false,
    });
    setSelectedCardLocal(null);
    setPendingTargetCCard(null);
    setCombatResultVisual(null);
    setIsVisualizingCombat(false);
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
        const newLogEntry = createLogEntry("エラー: C/S順序不明、戦闘解決へ。", 'SYSTEM');
        return { phase: 'COMBAT_RESOLUTION', isPlayerTurnInteractive: false, gameLog: appendLogEntries(currentGameState.gameLog, [newLogEntry]) };
    }

    const newIndex = currentGameState.currentCounterSupportActorIndex + 1;
    if (newIndex < currentGameState.counterSupportTurnOrder.length) {
        const nextActor = currentGameState.counterSupportTurnOrder[newIndex];
        const nextPhase = nextActor === 'PLAYER' ? 'COUNTER_SUPPORT_PLAYER_DRAW' : 'COUNTER_SUPPORT_CPU_DRAW';
        const newLogEntry = createLogEntry(`${nextActor === 'PLAYER' ? 'プレイヤー' : 'CPU'}のカウンター／支援ドローフェイズへ。`, 'SYSTEM');
        return {
            phase: nextPhase,
            currentCounterSupportActorIndex: newIndex,
            isPlayerTurnInteractive: nextActor === 'PLAYER',
            gameLog: appendLogEntries(currentGameState.gameLog, [newLogEntry])
        };
    } else {
        const newLogEntry = createLogEntry("両者のカウンター／支援終了。戦闘解決へ。", 'SYSTEM');
        return {
            phase: 'COMBAT_RESOLUTION',
            isPlayerTurnInteractive: false,
            gameLog: appendLogEntries(currentGameState.gameLog, [newLogEntry])
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
                newPlayerState.hand = newPlayerState.hand.filter(c => !isSameCardInstance(c, card));
                newPlayerState.squad = [...newPlayerState.squad, cardForSquad];
                newLog.push({message: `プレイヤーが ${card.cardName} を小隊に配置。`, source: 'PLAYER', timestamp: Date.now()});
            } else if (actionType === 'DISCARD_TO_DEFEAT_PILE') {
                newPlayerState.hand = newPlayerState.hand.filter(c => !isSameCardInstance(c, card));
                newPlayerState.defeatPile = [...newPlayerState.defeatPile, card];
                newPlayerState.defeatPoints += 1;
                newLog.push({message: `プレイヤーが ${card.cardName} を手札から敗戦フィールドへ (編成時Mカード配置不可のため)。敗北ポイント: ${newPlayerState.defeatPoints}。`, source: 'PLAYER', timestamp: Date.now()});
                if (newPlayerState.defeatPoints >= 10) {
                    return { ...prev, player: newPlayerState, gameLog: newLog, phase: 'GAME_OVER', winner: 'CPU', isPlayerTurnInteractive: false, isCPUMoving: false };
                }
            } else {
                newLog.push({message: `プレイヤーの行動 ${actionType} は現在実行できません。`, source: 'SYSTEM', timestamp: Date.now()});
                return prev;
            }

            const playerNowDone = newPlayerState.squad.length >= 3;
            const cpuAlreadyDone = prev.cpu.squad.length >= 3;


            if (playerNowDone && cpuAlreadyDone) {
                nextPhasePartial = { phase: 'FORMATION_CHECK_FULL', isPlayerTurnInteractive: false };
            } else if (!cpuAlreadyDone) {
                 nextPhasePartial = { phase: 'FORMATION_CPU_DRAW', isPlayerTurnInteractive: false };
            } else {
                 nextPhasePartial = { phase: 'FORMATION_PLAYER_DRAW', isPlayerTurnInteractive: true };
            }


        } else if (prev.phase === 'COUNTER_SUPPORT_PLAYER_PLAY_C') {
            if (actionType === 'PLAY_C_CARD' && card.type === 'C') {
                if (!canPlayCCard(card, newPlayerState, { ...prev, player: newPlayerState, cpu: newCpuState })) {
                    newLog.push({message: `Cカードを出すには戦場にMカードが必要です。(${card.cardName})`, source: 'SYSTEM', timestamp: Date.now()});
                } else {
                    newPlayerState.hand = newPlayerState.hand.filter(c => !isSameCardInstance(c, card));
                    const playedCardSummary: PlayedCCardSummary = {
                        owner: 'PLAYER',
                        cardNumber: card.cardNumber,
                        name: getCardDisplayName(card),
                        imageUrl: card.imageUrl,
                        effect: card.effect || card.textAbility || '',
                        sourceCard: card,
                    };

                    const effectResult = applyCCardEffect(card, { ...prev, player: newPlayerState, cpu: newCpuState }, 'PLAYER', targetCard);
                    newPlayerState = effectResult.player;
                    newCpuState = effectResult.cpu;
                    newLog.push(...effectResult.logMessages);

                    nextPhasePartial = goToNextCounterSupportStepOrCombatResolution({ ...prev, player: newPlayerState, cpu: newCpuState, playedCCards: [...prev.playedCCards, playedCardSummary], gameLog: newLog });
                    nextPhasePartial.playedCCards = [...prev.playedCCards, playedCardSummary];
                }
            } else if (actionType === 'DISCARD_FROM_HAND_CS') {
                newPlayerState.hand = newPlayerState.hand.filter(c => !isSameCardInstance(c, card));
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
      if (prev.phase !== 'FORMATION_CPU_PLACE' && prev.phase !== 'COUNTER_SUPPORT_CPU_PLAY_C') {
        return prev;
      }

      const aiDecision: CPUAction = aiDecisionInput || { action: 'DISCARD_FROM_HAND', reasoning: 'AI service failed or returned null decision; discard fallback.' };

      let newLog: LogEntry[] = [...prev.gameLog];
      let newPlayerState = { ...prev.player };
      let newCpuState = { ...prev.cpu };
      let nextPhasePartial: Partial<GameState> = {};
      let actionTakenSuccessfully = false;

      if (prev.phase === 'FORMATION_CPU_PLACE') {
        if (aiDecision.action === 'PLAY_M_CARD' && aiDecision.cardId) {
          const cardToPlay = newCpuState.hand.find(c => getCardInstanceId(c) === aiDecision.cardId);
          if (cardToPlay && cardToPlay.type === 'M' && newCpuState.squad.length < 3) {
            const cardForSquad = { ...cardToPlay, fieldOrder: newCpuState.squad.length };
            newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToPlay));
            newCpuState.squad = [...newCpuState.squad, cardForSquad];
            newLog = [...newLog, {message: 'CPUがMカードを小隊に伏せて配置。', source: 'CPU', timestamp: Date.now()}];
            actionTakenSuccessfully = true;
          } else {
            newLog = [...newLog, {message: 'CPUの配置提案は無効でした。', source: 'SYSTEM', timestamp: Date.now()}];
          }
        } else if (aiDecision.action === 'DISCARD_TO_DEFEAT' && aiDecision.cardId) {
          const cardToDiscard = newCpuState.hand.find(c => getCardInstanceId(c) === aiDecision.cardId);
          if (cardToDiscard) {
            newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToDiscard));
            newCpuState.defeatPile = [...newCpuState.defeatPile, cardToDiscard];
            newCpuState.defeatPoints += 1;
            newLog = [...newLog, {message: `CPUが手札1枚を敗戦フィールドへ (編成時Mカード配置不可のため)。敗北ポイント: ${newCpuState.defeatPoints}。`, source: 'CPU', timestamp: Date.now()}];
            if (newCpuState.defeatPoints >= 10) {
              return { ...prev, player: newPlayerState, cpu: newCpuState, gameLog: newLog, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false, isCPUMoving: false };
            }
            actionTakenSuccessfully = true;
          } else {
            newLog = [...newLog, {message: 'CPUの敗戦フィールド配置提案は無効でした。', source: 'SYSTEM', timestamp: Date.now()}];
          }
        }

        if (!actionTakenSuccessfully) {
          newLog = [...newLog, {message: `CPU AIの行動が無効/未指定のため、フォールバック処理を実行します。`, source: 'SYSTEM', timestamp: Date.now()}];
          const availableMCardsInHand = newCpuState.hand.filter(c => c.type === 'M');
          if (newCpuState.squad.length < 3 && availableMCardsInHand.length > 0) {
            const cardToPlay = availableMCardsInHand.sort((a,b) => parseInt(b.points) - parseInt(a.points))[0];
            const cardForSquad = { ...cardToPlay, fieldOrder: newCpuState.squad.length };
            newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToPlay));
            newCpuState.squad = [...newCpuState.squad, cardForSquad];
            newLog = [...newLog, {message: 'CPUフォールバック: Mカードを小隊に伏せて配置。', source: 'CPU', timestamp: Date.now()}];
          } else if (newCpuState.hand.length > 0) {
            const cardToDiscard = newCpuState.hand[Math.floor(Math.random() * newCpuState.hand.length)];
            newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToDiscard));
            newCpuState.defeatPile = [...newCpuState.defeatPile, cardToDiscard];
            newCpuState.defeatPoints += 1;
            newLog = [...newLog, {message: `CPUフォールバック: 手札1枚を敗戦フィールドへ (編成時Mカード配置不可のため)。敗北ポイント: ${newCpuState.defeatPoints}。`, source: 'CPU', timestamp: Date.now()}];
            if (newCpuState.defeatPoints >= 10) {
              return { ...prev, player: newPlayerState, cpu: newCpuState, gameLog: newLog, phase: 'GAME_OVER', winner: 'PLAYER', isPlayerTurnInteractive: false, isCPUMoving: false };
            }
          } else {
            newLog = [...newLog, {message: `CPUフォールバック: 手札が空で行動できません。`, source: 'CPU', timestamp: Date.now()}];
          }
        }

        const playerFormationDone = prev.player.squad.length >= 3;
        const cpuFormationDone = newCpuState.squad.length >= 3;


        if (playerFormationDone && cpuFormationDone) {
            nextPhasePartial = { phase: 'FORMATION_CHECK_FULL', isPlayerTurnInteractive: false };
        } else if (!playerFormationDone) {
             nextPhasePartial = { phase: 'FORMATION_PLAYER_DRAW', isPlayerTurnInteractive: true };
        } else {
             nextPhasePartial = { phase: 'FORMATION_CPU_DRAW', isPlayerTurnInteractive: false };
        }

      } else if (prev.phase === 'COUNTER_SUPPORT_CPU_PLAY_C') {
        const cardId = aiDecision.cardId;
        const cardToAct = cardId ? newCpuState.hand.find(c => getCardInstanceId(c) === cardId) : null;
        let nextPlayedCCards = prev.playedCCards;

        if (aiDecision.action === 'PLAY_C_CARD' && cardToAct && cardToAct.type === 'C') {
            if (!canPlayCCard(cardToAct, newCpuState, { ...prev, player: newPlayerState, cpu: newCpuState })) {
                newLog.push({message: 'CPUはCカードを出そうとしましたが、戦場にMカードがいません。フォールバック。', source: 'CPU', timestamp: Date.now()});
                const cardToDiscardFallback = cardToAct || (newCpuState.hand.length > 0 ? newCpuState.hand[0] : null);
                if (cardToDiscardFallback) {
                    newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToDiscardFallback));
                    newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscardFallback];
                    newLog.push({message: 'CPUフォールバック: 手札1枚を捨てました。', source: 'CPU', timestamp: Date.now()});
                }
            } else {
                newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToAct));
                const playedCardSummary: PlayedCCardSummary = {
                    owner: 'CPU',
                    cardNumber: cardToAct.cardNumber,
                    name: getCardDisplayName(cardToAct),
                    imageUrl: cardToAct.imageUrl,
                    effect: cardToAct.effect || cardToAct.textAbility || '',
                    sourceCard: cardToAct,
                };
                const effectResult = applyCCardEffect(cardToAct, { ...prev, player: newPlayerState, cpu: newCpuState }, 'CPU');
                newPlayerState = effectResult.player;
                newCpuState = effectResult.cpu;
                newLog.push(...effectResult.logMessages);
                nextPlayedCCards = [...prev.playedCCards, playedCardSummary];
            }
        } else if (aiDecision.action === 'DISCARD_FROM_HAND' && cardToAct) {
            newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToAct));
            newCpuState.discardPile = [...newCpuState.discardPile, cardToAct];
            newLog.push({message: 'CPUが手札1枚を捨てました。', source: 'CPU', timestamp: Date.now()});
        } else { 
            newLog.push({message: `CPUはCカードを使用しないか、無効な行動でした。`, source: 'CPU', timestamp: Date.now()});
            if (newCpuState.hand.length > 0) {
                newLog.push({message: `フォールバック: 手札から1枚捨てます。`, source: 'CPU', timestamp: Date.now()});
                const cardToDiscard = newCpuState.hand[Math.floor(Math.random() * newCpuState.hand.length)];
                newCpuState.hand = newCpuState.hand.filter(c => !isSameCardInstance(c, cardToDiscard));
                newCpuState.discardPile = [...newCpuState.discardPile, cardToDiscard];
                newLog.push({message: 'CPUフォールバック: 手札1枚を捨てました。', source: 'CPU', timestamp: Date.now()});
            } else {
                 newLog.push({message: `CPUフォールバック: 手札が空で捨てられません。`, source: 'CPU', timestamp: Date.now()});
            }
        }
        nextPhasePartial = goToNextCounterSupportStepOrCombatResolution({ ...prev, player: newPlayerState, cpu: newCpuState, playedCCards: nextPlayedCCards, gameLog: newLog });
        nextPhasePartial.playedCCards = nextPlayedCCards;
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
  }, []);

  const confirmCombatResolution = useCallback(() => {
    setCombatResultVisual(null);
    setGameState(currentGs => {
      if (!currentGs || currentGs.phase !== 'COMBAT_RESOLUTION') return currentGs;

      let newPlayerState = { ...currentGs.player };
      let newCpuState = { ...currentGs.cpu };
      let tempLogEntries: LogEntry[] = [];
      let gameShouldEnd = false;
      let winnerOnEnd: PlayerType | null = null;

      const currentLog = currentGs.gameLog;
      tempLogEntries.push({message: `戦闘解決確定: プレイヤー ${newPlayerState.combatPoints} vs CPU ${newCpuState.combatPoints}`, source: 'SYSTEM', timestamp: Date.now()});

      const playerDestroyedMOnBattlefield = newPlayerState.battlefield.filter(c => c.type === 'M' && c.isDestroyed);
      const cpuDestroyedMOnBattlefield = newCpuState.battlefield.filter(c => c.type === 'M' && c.isDestroyed);
      const playerMOnBattlefield = newPlayerState.battlefield.filter(isActiveMCard);
      const cpuMOnBattlefield = newCpuState.battlefield.filter(isActiveMCard);

      if (playerDestroyedMOnBattlefield.length > 0) {
        tempLogEntries.push({message: `破壊済みのプレイヤー戦場Mカード (${playerDestroyedMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
        newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerDestroyedMOnBattlefield.map(clearDestroyedMarker)];
      }
      if (cpuDestroyedMOnBattlefield.length > 0) {
        tempLogEntries.push({message: `破壊済みのCPU戦場Mカード (${cpuDestroyedMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
        newCpuState.discardPile = [...newCpuState.discardPile, ...cpuDestroyedMOnBattlefield.map(clearDestroyedMarker)];
      }

      const playedPlayerCCards = currentGs.playedCCards.filter(card => card.owner === 'PLAYER').map(card => card.sourceCard);
      const playedCpuCCards = currentGs.playedCCards.filter(card => card.owner === 'CPU').map(card => card.sourceCard);
      if (playedPlayerCCards.length > 0) {
        tempLogEntries.push({message: `プレイヤーの使用Cカード (${playedPlayerCCards.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
        newPlayerState.discardPile = [...newPlayerState.discardPile, ...playedPlayerCCards];
      }
      if (playedCpuCCards.length > 0) {
        tempLogEntries.push({message: `CPUの使用Cカード (${playedCpuCCards.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
        newCpuState.discardPile = [...newCpuState.discardPile, ...playedCpuCCards];
      }

      if (newPlayerState.combatPoints > newCpuState.combatPoints) {
        tempLogEntries.push({message: "プレイヤーの勝利！戦闘ポイントで上回りました。", source: 'SYSTEM', timestamp: Date.now()});
        if (playerMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
          newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerMOnBattlefield.map(clearDestroyedMarker)];
        }
        if (cpuMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) はCPUの敗北フィールドへ。`, source: 'CPU', timestamp: Date.now()});
          newCpuState.defeatPile = [...newCpuState.defeatPile, ...cpuMOnBattlefield.map(clearDestroyedMarker)];
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
          newPlayerState.defeatPile = [...newPlayerState.defeatPile, ...playerMOnBattlefield.map(clearDestroyedMarker)];
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
          newCpuState.discardPile = [...newCpuState.discardPile, ...cpuMOnBattlefield.map(clearDestroyedMarker)];
        }
      } else {
        tempLogEntries.push({message: "引き分け！戦闘ポイントが同じです。", source: 'SYSTEM', timestamp: Date.now()});
        if (playerMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `プレイヤーの戦場Mカード (${playerMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'PLAYER', timestamp: Date.now()});
          newPlayerState.discardPile = [...newPlayerState.discardPile, ...playerMOnBattlefield.map(clearDestroyedMarker)];
        }
        if (cpuMOnBattlefield.length > 0) {
          tempLogEntries.push({message: `CPUの戦場Mカード (${cpuMOnBattlefield.map(c => c.cardNameOmm || c.cardName).join(', ')}) は捨て札へ。`, source: 'CPU', timestamp: Date.now()});
          newCpuState.discardPile = [...newCpuState.discardPile, ...cpuMOnBattlefield.map(clearDestroyedMarker)];
        }
      }

      newPlayerState.battlefield = [];
      newCpuState.battlefield = [];

      const playerPendingDiscardResult = flushPendingSquadDiscards(newPlayerState, 'PLAYER');
      newPlayerState = playerPendingDiscardResult.state;
      if (playerPendingDiscardResult.logEntry) {
        tempLogEntries.push(playerPendingDiscardResult.logEntry);
      }
      const cpuPendingDiscardResult = flushPendingSquadDiscards(newCpuState, 'CPU');
      newCpuState = cpuPendingDiscardResult.state;
      if (cpuPendingDiscardResult.logEntry) {
        tempLogEntries.push(cpuPendingDiscardResult.logEntry);
      }

      if (gameShouldEnd) {
        return {
          ...currentGs,
          player: newPlayerState,
          cpu: newCpuState,
          phase: 'GAME_OVER',
          winner: winnerOnEnd,
          isPlayerTurnInteractive: false,
          playedCCards: [],
          gameLog: appendLogEntries(currentLog, tempLogEntries),
          isCPUMoving: false,
        };
      }

      tempLogEntries.push({message: '戦闘解決完了。終了フェイズへ。', source: 'SYSTEM', timestamp: Date.now()});
      return {
        ...currentGs,
        player: newPlayerState,
        cpu: newCpuState,
        phase: 'END_TURN_CLEANUP',
        playedCCards: [],
        gameLog: appendLogEntries(currentLog, tempLogEntries),
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

    if (isVisualizingCombat) {
      return;
    }

    if (!gameState.isPlayerTurnInteractive && !gameState.isCPUMoving) {
        switch (currentPhase) {
            case 'FORMATION_CPU_DRAW':
                setGameState(prev => {
                    if(!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    if (prev.cpu.squad.length >= 3) {
                      const playerDone = prev.player.squad.length >= 3;
                      const skipLog = createLogEntry('CPUの小隊はすでに3枚のため、編成順をスキップします。', 'CPU');
                      return {
                        ...prev,
                        phase: playerDone ? 'FORMATION_CHECK_FULL' : 'FORMATION_PLAYER_DRAW',
                        isPlayerTurnInteractive: !playerDone,
                        gameLog: appendLogEntries(prev.gameLog, [skipLog]),
                      };
                    }
                    const {newDeck, drawnCards} = drawCards(prev.cpu.deck, 1);
                    if (drawnCards.length === 0) {
                      return {
                        ...prev,
                        phase: 'GAME_OVER',
                        winner: 'PLAYER',
                        isPlayerTurnInteractive: false,
                        gameLog: appendLogEntries(prev.gameLog, [createLogEntry('CPUのデッキが尽きた！プレイヤーの勝利！', 'SYSTEM')]),
                      };
                    }
                    return {
                      ...prev,
                      cpu: {...prev.cpu, deck: newDeck, hand: [...prev.cpu.hand, ...drawnCards]},
                      phase: 'FORMATION_CPU_PLACE',
                      isPlayerTurnInteractive: false,
                      gameLog: appendLogEntries(prev.gameLog, [createLogEntry('CPUが編成フェイズでカードを1枚引きました。', 'CPU')]),
                    };
                });
                break;
            case 'FORMATION_CPU_PLACE':
                setGameState(prev => prev ? ({ ...prev, isCPUMoving: true }) : null);
                cpuLogicService.getCPUFormationAction(gameState).then(processCPUAction);
                break;
            case 'FORMATION_CHECK_FULL':
                setGameState(prev => {
                    if (!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    const nextTerrainSelector = prev.turnOrder[0]; 
                    return {
                        ...prev,
                        phase: nextTerrainSelector === 'PLAYER' ? 'DEPLOYMENT_PLAYER_TERRAIN' : 'DEPLOYMENT_CPU_TERRAIN',
                        activePlayer: nextTerrainSelector,
                        isPlayerTurnInteractive: false, 
                        gameLog: appendLogEntries(
                          prev.gameLog,
                          [createLogEntry(`編成完了。${nextTerrainSelector === 'PLAYER' ? 'プレイヤー' : 'CPU'} が地形カードを決定します。`, 'SYSTEM')],
                        ),
                    };
                });
                break;
            case 'DEPLOYMENT_PLAYER_TERRAIN':
                setGameState(prev => {
                    if (!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    const { newDeck: playerDeckAfterDraw, drawnCards: terrainCardsDrawn } = drawCards(prev.player.deck, 1);
                    if (terrainCardsDrawn.length === 0) {
                        return {
                          ...prev,
                          phase: 'GAME_OVER',
                          winner: 'CPU',
                          isPlayerTurnInteractive: false,
                          gameLog: appendLogEntries(prev.gameLog, [createLogEntry('プレイヤーのデッキが尽き、地形を引けませんでした。CPUの勝利！', 'SYSTEM')]),
                        };
                    }
                    const terrainCard = terrainCardsDrawn[0];
                    const terrainAttribute = terrainCard.battlefieldTerrain || "";
                    return {
                      ...prev,
                      player: { ...prev.player, deck: playerDeckAfterDraw, discardPile: [...prev.player.discardPile, terrainCard] },
                      currentTerrainCard: terrainCard,
                      battlefieldTerrainAttribute: terrainAttribute,
                      phase: 'DEPLOYMENT_MOVE_CARDS',
                      isPlayerTurnInteractive: false,
                      gameLog: appendLogEntries(prev.gameLog, [createLogEntry(`プレイヤーが地形カードとして ${terrainCard.cardName} (属性: ${terrainAttribute}) を引きました。`, 'PLAYER')]),
                    };
                });
                break;
             case 'DEPLOYMENT_CPU_TERRAIN':
                // Note: Rules say draw from deck, so we don't use AI decision here to keep consistent with rules.
                setGameState(prev => {
                     if (!prev) return null;
                     if (prev.phase !== currentPhase) return prev;
                     const { newDeck: cpuDeckAfterDraw, drawnCards: terrainCardsDrawn } = drawCards(prev.cpu.deck, 1);
                     if (terrainCardsDrawn.length === 0) {
                        return {
                          ...prev,
                          phase: 'GAME_OVER',
                          winner: 'PLAYER',
                          isPlayerTurnInteractive: false,
                          isCPUMoving: false,
                          gameLog: appendLogEntries(prev.gameLog, [createLogEntry('CPUのデッキが尽き、地形を引けませんでした。プレイヤーの勝利！', 'SYSTEM')]),
                        };
                     }
                     const terrainCard = terrainCardsDrawn[0];
                     const terrainAttribute = terrainCard.battlefieldTerrain || ""; 
                     return {
                       ...prev,
                       cpu: { ...prev.cpu, deck: cpuDeckAfterDraw, discardPile: [...prev.cpu.discardPile, terrainCard] },
                       currentTerrainCard: terrainCard,
                       battlefieldTerrainAttribute: terrainAttribute,
                       phase: 'DEPLOYMENT_MOVE_CARDS',
                       isPlayerTurnInteractive: false,
                       isCPUMoving: false,
                       gameLog: appendLogEntries(prev.gameLog, [createLogEntry(`CPUが地形カードとして ${terrainCard.cardName} (属性: ${terrainAttribute}) を引きました。`, 'CPU')]),
                     };
                });
                break;
            case 'DEPLOYMENT_MOVE_CARDS':
                setGameState(prev => {
                    if (!prev || !prev.battlefieldTerrainAttribute) return prev;
                    if (prev.phase !== currentPhase) return prev;
                    let newPlayerSquad = [...prev.player.squad];
                    let newPlayerBattlefield = [...prev.player.battlefield];
                    let newCpuSquad = [...prev.cpu.squad];
                    let newCpuBattlefield = [...prev.cpu.battlefield];
                    const terrain = prev.battlefieldTerrainAttribute;
                    let tempLogEntries: LogEntry[] = [];

                    newPlayerSquad = newPlayerSquad.filter(card => {
                        if (canDeploy(card, terrain)) { newPlayerBattlefield.push(clearTemporaryCardState(card)); tempLogEntries.push({message: `プレイヤーの ${card.cardNameOmm || card.cardName} が戦場へ。`, source: 'PLAYER', timestamp: Date.now()}); return false; } return true;
                    });
                    newCpuSquad = newCpuSquad.filter(card => {
                        if (canDeploy(card, terrain)) { newCpuBattlefield.push(clearTemporaryCardState(card)); tempLogEntries.push({message: `CPUの ${card.cardNameOmm || card.cardName} が戦場へ。`, source: 'CPU', timestamp: Date.now()}); return false; } return true;
                    });
                    return {
                      ...prev,
                      player: { ...prev.player, squad: newPlayerSquad, battlefield: newPlayerBattlefield },
                      cpu: { ...prev.cpu, squad: newCpuSquad, battlefield: newCpuBattlefield },
                      phase: 'DEPLOYMENT_CHECK_UNILATERAL',
                      gameLog: appendLogEntries(prev.gameLog, tempLogEntries),
                      isPlayerTurnInteractive: false,
                    };
                });
                break;
            case 'DEPLOYMENT_CHECK_UNILATERAL':
                setGameState(prev => {
                    if (!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    let newPlayerState = { ...prev.player };
                    let newCpuState = { ...prev.cpu };
                    let tempLogEntries: LogEntry[] = [];
                    let gameShouldEnd = false;
                    let winnerOnEnd: PlayerType | null = null;

                    const playerCanDeploy = newPlayerState.battlefield.length > 0;
                    const cpuCanDeploy = newCpuState.battlefield.length > 0;

                    if (playerCanDeploy && !cpuCanDeploy) {
                        tempLogEntries.push({message: "一方的出撃！プレイヤーのみ出撃。CPUは小隊の残存Mカード分の敗北ポイントを受けます。", source: 'SYSTEM', timestamp: Date.now()});
                        const cpuSquadMCards = newCpuState.squad.filter(c => c.type === 'M');
                        if (cpuSquadMCards.length > 0) {
                            const pendingDefeatIds = new Set(cpuSquadMCards.map(getCardInstanceId));
                            newCpuState.defeatPile = [...newCpuState.defeatPile, ...cpuSquadMCards.map(clearTemporaryCardState)];
                            const defeatPointsReceived = cpuSquadMCards.length;
                            newCpuState.defeatPoints += defeatPointsReceived;
                            newCpuState.squad = newCpuState.squad.filter(c => !pendingDefeatIds.has(getCardInstanceId(c)));
                            tempLogEntries.push({message: `CPUは敗北ポイント ${defeatPointsReceived}点 を獲得。合計: ${newCpuState.defeatPoints}点。`, source: 'CPU', timestamp: Date.now()});
                            if (newCpuState.defeatPoints >= 10) {
                                gameShouldEnd = true; winnerOnEnd = 'PLAYER';
                            }
                        }
                    } else if (!playerCanDeploy && cpuCanDeploy) {
                        tempLogEntries.push({message: "一方的出撃！CPUのみ出撃。プレイヤーは小隊の残存Mカード分の敗北ポイントを受けます。", source: 'SYSTEM', timestamp: Date.now()});
                        const playerSquadMCards = newPlayerState.squad.filter(c => c.type === 'M');
                         if (playerSquadMCards.length > 0) {
                            const pendingDefeatIds = new Set(playerSquadMCards.map(getCardInstanceId));
                            newPlayerState.defeatPile = [...newPlayerState.defeatPile, ...playerSquadMCards.map(clearTemporaryCardState)];
                            const defeatPointsReceived = playerSquadMCards.length;
                            newPlayerState.defeatPoints += defeatPointsReceived;
                            newPlayerState.squad = newPlayerState.squad.filter(c => !pendingDefeatIds.has(getCardInstanceId(c)));
                            tempLogEntries.push({message: `プレイヤーは敗北ポイント ${defeatPointsReceived}点 を獲得。合計: ${newPlayerState.defeatPoints}点。`, source: 'PLAYER', timestamp: Date.now()});
                            if (newPlayerState.defeatPoints >= 10) {
                                gameShouldEnd = true; winnerOnEnd = 'CPU';
                            }
                        }
                    } else if (!playerCanDeploy && !cpuCanDeploy) {
                        const nextTerrainSelector = prev.activePlayer === 'PLAYER' ? 'CPU' : 'PLAYER';
                        return {
                            ...prev,
                            activePlayer: nextTerrainSelector,
                            phase: nextTerrainSelector === 'PLAYER' ? 'DEPLOYMENT_PLAYER_TERRAIN' : 'DEPLOYMENT_CPU_TERRAIN',
                            isPlayerTurnInteractive: false,
                            gameLog: appendLogEntries(
                              prev.gameLog,
                              [createLogEntry(`両者ともユニットを出撃できませんでした。${nextTerrainSelector === 'PLAYER' ? 'プレイヤー' : 'CPU'} が新たな地形カードを出します。`, 'SYSTEM')],
                            ),
                        };
                    } else {
                        return {
                          ...prev,
                          phase: 'DEPLOYMENT_HANDLE_TAPPED',
                          isPlayerTurnInteractive: false,
                          gameLog: appendLogEntries(prev.gameLog, [createLogEntry('両者ユニット出撃。戦闘計算へ。', 'SYSTEM')]),
                        };
                    }

                    if (gameShouldEnd) {
                        tempLogEntries.push({
                          message: winnerOnEnd === 'PLAYER' ? "CPUの敗北ポイントが10に達しました！プレイヤーの勝利！" : "プレイヤーの敗北ポイントが10に達しました！CPUの勝利！",
                          source: 'SYSTEM',
                          timestamp: Date.now(),
                        });
                        return {
                          ...prev,
                          player: newPlayerState,
                          cpu: newCpuState,
                          phase: 'GAME_OVER',
                          winner: winnerOnEnd,
                          gameLog: appendLogEntries(prev.gameLog, tempLogEntries),
                          isPlayerTurnInteractive: false,
                          isCPUMoving: false,
                        };
                    }

                    tempLogEntries.push({message: "一方的出撃処理完了。ターン終了処理へ。", source: 'SYSTEM', timestamp: Date.now()});
                    return {
                      ...prev,
                      player: newPlayerState,
                      cpu: newCpuState,
                      phase: 'END_TURN_CLEANUP',
                      gameLog: appendLogEntries(prev.gameLog, tempLogEntries),
                      isPlayerTurnInteractive: false,
                      isCPUMoving: false,
                    };
                });
                break;
            case 'DEPLOYMENT_HANDLE_TAPPED':
                setGameState(prev => {
                    if (!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    let newPlayerState = { ...prev.player };
                    let newCpuState = { ...prev.cpu };
                    const tempLogEntries: LogEntry[] = [];

                    const handleWaitingM = (cards: Card[], owner: PlayerType) => {
                      const stillWaiting: Card[] = [];
                      const pendingDiscard: Card[] = [];
                      cards.forEach(card => {
                        if (card.type !== 'M') {
                          stillWaiting.push(card);
                          return;
                        }
                        if (card.isTapped) {
                          const nextCard = { ...card, isTapped: false, isPendingDiscard: true };
                          stillWaiting.push(nextCard);
                          pendingDiscard.push(nextCard);
                        } else {
                          stillWaiting.push({ ...card, isTapped: true, isPendingDiscard: false, isPendingDefeat: false });
                        }
                      });
                      if (pendingDiscard.length > 0) {
                        tempLogEntries.push({
                          message: `${owner === 'PLAYER' ? 'プレイヤー' : 'CPU'}の前ターンから待機していたMカード (${getCardLogList(pendingDiscard, owner, 'faceDown')}) は捨て札予定として戦闘終了まで小隊に残します。`,
                          source: owner,
                          timestamp: Date.now(),
                        });
                      }
                      const newlyTapped = stillWaiting.filter(card => card.type === 'M' && card.isTapped && !card.isPendingDiscard);
                      if (newlyTapped.length > 0) {
                        tempLogEntries.push({
                          message: `${owner === 'PLAYER' ? 'プレイヤー' : 'CPU'}の出撃できなかったMカード (${getCardLogList(newlyTapped, owner, 'faceDown')}) は小隊でタップ待機。`,
                          source: owner,
                          timestamp: Date.now(),
                        });
                      }
                      return { stillWaiting };
                    };

                    const playerResult = handleWaitingM(newPlayerState.squad, 'PLAYER');
                    const cpuResult = handleWaitingM(newCpuState.squad, 'CPU');
                    newPlayerState = {
                      ...newPlayerState,
                      squad: playerResult.stillWaiting,
                    };
                    newCpuState = {
                      ...newCpuState,
                      squad: cpuResult.stillWaiting,
                    };

                    return {
                      ...prev,
                      player: newPlayerState,
                      cpu: newCpuState,
                      phase: 'COMBAT_CALCULATE_INITIAL_POINTS',
                      gameLog: appendLogEntries(prev.gameLog, tempLogEntries),
                      isPlayerTurnInteractive: false,
                    };
                });
                break;
            case 'COMBAT_CALCULATE_INITIAL_POINTS':
                setGameState(prev => {
                    if (!prev) return prev;
                    if (prev.phase !== currentPhase) return prev;
                    let playerCombatPoints = 0;
                    let cpuCombatPoints = 0;
                    let tempLogEntries: LogEntry[] = [];

                    prev.player.battlefield.filter(isActiveMCard).forEach(card => {
                        const baseP = parseInt(card.points) || 0;
                        playerCombatPoints += baseP;
                    });

                    prev.cpu.battlefield.filter(isActiveMCard).forEach(card => {
                        const baseP = parseInt(card.points) || 0;
                        cpuCombatPoints += baseP;
                    });
                    
                    tempLogEntries.push({message: `攻撃ポイント計算後: プレイヤー ${playerCombatPoints}P, CPU ${cpuCombatPoints}P`, source: 'SYSTEM', timestamp: Date.now()});

                    const playerCombosResult = checkCombos(prev.player.battlefield.filter(isActiveMCard), "プレイヤー");
                    if (playerCombosResult.achievedCombos[0]) playerCombatPoints += playerCombosResult.achievedCombos[0].points;
                    tempLogEntries = [...tempLogEntries, ...playerCombosResult.logMessages];

                    const cpuCombosResult = checkCombos(prev.cpu.battlefield.filter(isActiveMCard), "CPU");
                    if (cpuCombosResult.achievedCombos[0]) cpuCombatPoints += cpuCombosResult.achievedCombos[0].points;
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
                        gameLog: appendLogEntries(prev.gameLog, tempLogEntries)
                    };
                });
                break;
            case 'COUNTER_SUPPORT_CPU_DRAW':
                 setGameState(prev => {
                    if(!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    const {newDeck, drawnCards} = drawCards(prev.cpu.deck, 1);
                    if (drawnCards.length === 0) {
                        return {
                          ...prev,
                          phase: 'GAME_OVER',
                          winner: 'PLAYER',
                          isPlayerTurnInteractive: false,
                          gameLog: appendLogEntries(prev.gameLog, [createLogEntry('CPUのデッキが尽きた！プレイヤーの勝利！', 'SYSTEM')]),
                        };
                    }
                    return {
                      ...prev,
                      cpu: {...prev.cpu, deck: newDeck, hand: [...prev.cpu.hand, ...drawnCards]},
                      phase: 'COUNTER_SUPPORT_CPU_PLAY_C',
                      isPlayerTurnInteractive: false,
                      gameLog: appendLogEntries(prev.gameLog, [createLogEntry('CPUがカウンター／支援フェイズでカードを1枚引きました。', 'CPU')]),
                    };
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
                    if (prev.phase !== currentPhase) return prev;

                    let newPlayerState = { ...prev.player };
                    let newCpuState = { ...prev.cpu };
                    let tempLogEntries: LogEntry[] = [];

                    const playerPendingDiscardResult = flushPendingSquadDiscards(newPlayerState, 'PLAYER');
                    newPlayerState = playerPendingDiscardResult.state;
                    if (playerPendingDiscardResult.logEntry) {
                        tempLogEntries.push(playerPendingDiscardResult.logEntry);
                    }
                    const cpuPendingDiscardResult = flushPendingSquadDiscards(newCpuState, 'CPU');
                    newCpuState = cpuPendingDiscardResult.state;
                    if (cpuPendingDiscardResult.logEntry) {
                        tempLogEntries.push(cpuPendingDiscardResult.logEntry);
                    }

                    const playerWaitingCards = newPlayerState.squad.filter(c => c.type === 'M' && c.isTapped && !c.isPendingDiscard);
                    const cpuWaitingCards = newCpuState.squad.filter(c => c.type === 'M' && c.isTapped && !c.isPendingDiscard);
                    if (playerWaitingCards.length > 0) {
                        tempLogEntries.push({message: `プレイヤーの待機Mカード (${playerWaitingCards.map(c => c.cardNameOmm || c.cardName).join(', ')}) は小隊に残ります。`, source: 'PLAYER', timestamp: Date.now()});
                    }
                    if (cpuWaitingCards.length > 0) {
                        tempLogEntries.push({message: `CPUの待機Mカード (${getCardLogList(cpuWaitingCards, 'CPU', 'faceDown')}) は小隊に残ります。`, source: 'CPU', timestamp: Date.now()});
                    }
                    if (newPlayerState.battlefield.length > 0) {
                        newPlayerState.discardPile = [...newPlayerState.discardPile, ...newPlayerState.battlefield.map(clearDestroyedMarker)];
                        newPlayerState.battlefield = [];
                    }
                    if (newCpuState.battlefield.length > 0) {
                        newCpuState.discardPile = [...newCpuState.discardPile, ...newCpuState.battlefield.map(clearDestroyedMarker)];
                        newCpuState.battlefield = [];
                    }
                    
                    const nextTurnOrder: [PlayerType, PlayerType] = [prev.turnOrder[1], prev.turnOrder[0]];
                    const nextActivePlayer = nextTurnOrder[0];
                    const nextFormationPhase = nextActivePlayer === 'PLAYER' ? 'FORMATION_PLAYER_DRAW' : 'FORMATION_CPU_DRAW';
                    tempLogEntries.push({message: `ターン終了。次のターンは ${nextActivePlayer === 'PLAYER' ? 'プレイヤー' : 'CPU'} が地形選択の先手です。編成フェイズへ。`, source: 'SYSTEM', timestamp: Date.now()});

                    return {
                        ...prev,
                        activePlayer: nextActivePlayer, 
                        turnOrder: nextTurnOrder,
                        phase: nextFormationPhase,
                        isPlayerTurnInteractive: nextActivePlayer === 'PLAYER',
                        player: {...newPlayerState, combatPoints: 0},
                        cpu: {...newCpuState, combatPoints: 0},
                        currentTerrainCard: null,
                        battlefieldTerrainAttribute: null,
                        counterSupportTurnOrder: null,
                        currentCounterSupportActorIndex: 0,
                        playedCCards: [],
                        gameLog: appendLogEntries(prev.gameLog, tempLogEntries) as LogEntry[]
                    };
                 });
                break;
        }
    } else if (gameState.isPlayerTurnInteractive) { 
        switch (currentPhase) {
            case 'FORMATION_PLAYER_DRAW':
                setGameState(prev => {
                    if (!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    if (prev.player.squad.length >= 3) {
                      const cpuDone = prev.cpu.squad.length >= 3;
                      const skipLog = createLogEntry('プレイヤーの小隊はすでに3枚のため、編成順をスキップします。', 'PLAYER');
                      return {
                        ...prev,
                        phase: cpuDone ? 'FORMATION_CHECK_FULL' : 'FORMATION_CPU_DRAW',
                        isPlayerTurnInteractive: false,
                        gameLog: appendLogEntries(prev.gameLog, [skipLog]),
                      };
                    }
                    const {newDeck, drawnCards} = drawCards(prev.player.deck, 1);
                    if (drawnCards.length === 0) {
                        return {
                          ...prev,
                          phase: 'GAME_OVER',
                          winner: 'CPU',
                          isPlayerTurnInteractive: false,
                          gameLog: appendLogEntries(prev.gameLog, [createLogEntry('プレイヤーのデッキが尽きた！CPUの勝利！', 'SYSTEM')]),
                        };
                    }
                    return {
                      ...prev,
                      player: {...prev.player, deck: newDeck, hand: [...prev.player.hand, ...drawnCards]},
                      phase: 'FORMATION_PLAYER_PLACE',
                      gameLog: appendLogEntries(prev.gameLog, [createLogEntry('プレイヤーが編成フェイズでカードを1枚引きました。', 'PLAYER')]),
                    };
                });
                break;
            case 'COUNTER_SUPPORT_PLAYER_DRAW':
                setGameState(prev => {
                    if (!prev) return null;
                    if (prev.phase !== currentPhase) return prev;
                    const {newDeck, drawnCards} = drawCards(prev.player.deck, 1);
                     if (drawnCards.length === 0) {
                        return {
                          ...prev,
                          phase: 'GAME_OVER',
                          winner: 'CPU',
                          isPlayerTurnInteractive: false,
                          gameLog: appendLogEntries(prev.gameLog, [createLogEntry('プレイヤーのデッキが尽きた！CPUの勝利！', 'SYSTEM')]),
                        };
                    }
                    return {
                      ...prev,
                      player: {...prev.player, deck: newDeck, hand: [...prev.player.hand, ...drawnCards]},
                      phase: 'COUNTER_SUPPORT_PLAYER_PLAY_C',
                      gameLog: appendLogEntries(prev.gameLog, [createLogEntry('プレイヤーがカウンター／支援フェイズでカードを1枚引きました。', 'PLAYER')]),
                    };
                });
                break;
        }
    }

  }, [gameState, processCPUAction, isVisualizingCombat, addLogEntry]);


  if (!gameState) {
    return <div className="p-8 text-center text-slate-600">ゲームを初期化中...</div>;
  }

  const { player, cpu, phase, gameLog, winner, currentTerrainCard, battlefieldTerrainAttribute, isCPUMoving, isPlayerTurnInteractive, playedCCards } = gameState;
  const phaseInstructionText = getPhaseInstruction(phase, player.hand, player.squad);
  const canPlayerPlaySelectedCCard = selectedCardLocal && canPlayCCard(selectedCardLocal, player, gameState);
  const pendingTargetMode = getCCardTargetMode(pendingTargetCCard);
  const cCardTargetCandidates = pendingTargetCCard
    ? getCCardTargetCandidates(pendingTargetCCard, gameState, 'PLAYER')
    : [];
  const playerCCardTargetableNumbers = new Set(
    pendingTargetMode === 'OWN_M' ? cCardTargetCandidates.map(getCardInstanceId) : [],
  );
  const cpuCCardTargetableNumbers = new Set(
    pendingTargetMode && pendingTargetMode !== 'OWN_M' ? cCardTargetCandidates.map(getCardInstanceId) : [],
  );
  const cCardTargetInstruction = getCCardTargetInstruction(pendingTargetCCard);
  const handleTargetCard = (targetCard: Card) => {
    if (!pendingTargetCCard) return;
    handlePlayerAction('PLAY_C_CARD', pendingTargetCCard, targetCard);
  };
  const cancelCCardTargeting = () => {
    setPendingTargetCCard(null);
  };

  const battleSummary = isVisualizingCombat
    ? createBattleSummary(player, cpu, gameLog, playedCCards)
    : null;

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
          isCPUMoving={isCPUMoving}
          isCpuWinnerVisualizing={
            (combatResultVisual === 'CPU' || combatResultVisual === 'DRAW') && isVisualizingCombat
          }
          isPlayerTurnInteractive={isPlayerTurnInteractive}
          isPlayerWinnerVisualizing={
            (combatResultVisual === 'PLAYER' || combatResultVisual === 'DRAW') && isVisualizingCombat
          }
          isVisualizingCombat={isVisualizingCombat}
          onConfirmCombatResolution={confirmCombatResolution}
          onOpenDiscardPile={openDiscardPileModal}
          onOpenLargeCard={openLargeCardModal}
          onOpenPlayerDeck={openPlayerDeckModal}
          onCancelCCardTargeting={cancelCCardTargeting}
          onPlayerAction={handlePlayerAction}
          onSelectCard={setSelectedCard}
          onTargetCard={handleTargetCard}
          phase={phase}
          phaseInstructionText={phaseInstructionText}
          player={player}
          playerCCardTargetableNumbers={playerCCardTargetableNumbers}
          playedCCards={playedCCards}
          pendingTargetCCard={pendingTargetCCard}
          selectedCard={selectedCardLocal}
          winner={winner}
        />
      </div>
    </GamePageContext.Provider>
  );
};
