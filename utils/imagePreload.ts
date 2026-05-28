import type { Card } from '../types';

const imagePreloadCache = new Map<string, Promise<void>>();

const GAME_STATIC_IMAGE_URLS = [
  '/assets/card-back.png',
  '/assets/mobile-powers-main-bg.png',
  '/assets/terrain/terrain-land-sea.jpg',
  '/assets/terrain/terrain-land.jpg',
  '/assets/terrain/terrain-sea.jpg',
  '/assets/terrain/terrain-sky-land-sea.jpg',
  '/assets/terrain/terrain-sky-land.jpg',
  '/assets/terrain/terrain-sky-sea.jpg',
  '/assets/terrain/terrain-sky.jpg',
  '/assets/terrain/terrain-space-land-sea.jpg',
  '/assets/terrain/terrain-space-land.jpg',
  '/assets/terrain/terrain-space-sea.jpg',
  '/assets/terrain/terrain-space-sky-land-sea.jpg',
  '/assets/terrain/terrain-space-sky-land.jpg',
  '/assets/terrain/terrain-space-sky-sea.jpg',
  '/assets/terrain/terrain-space-sky.jpg',
  '/assets/terrain/terrain-space.jpg',
];

const preloadImage = (src: string): Promise<void> => {
  const normalizedSrc = src.trim();
  if (!normalizedSrc || typeof Image === 'undefined') {
    return Promise.resolve();
  }

  const cached = imagePreloadCache.get(normalizedSrc);
  if (cached) return cached;

  const promise = new Promise<void>(resolve => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (image.decode) {
        image.decode().catch(() => undefined).finally(resolve);
      } else {
        resolve();
      }
    };
    image.onerror = () => resolve();
    image.src = normalizedSrc;
  });

  imagePreloadCache.set(normalizedSrc, promise);
  return promise;
};

export const preloadImages = (srcs: Array<string | undefined | null>): Promise<void> => {
  const uniqueSrcs = Array.from(new Set(srcs.filter((src): src is string => !!src && src.trim().length > 0)));
  return Promise.all(uniqueSrcs.map(preloadImage)).then(() => undefined);
};

export const preloadGameStaticImages = (): Promise<void> => {
  return preloadImages(GAME_STATIC_IMAGE_URLS);
};

export const preloadGameImagesForDecks = (decks: Card[][]): Promise<void> => {
  const deckImageUrls = decks.flatMap(deck => deck.map(card => card.imageUrl));
  return preloadImages([...GAME_STATIC_IMAGE_URLS, ...deckImageUrls]);
};
