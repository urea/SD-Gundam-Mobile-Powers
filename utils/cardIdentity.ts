import { Card } from '../types';

export const getCardBaseId = (card: Pick<Card, 'uniqueKey' | 'cardNumber'>): string => {
  return card.uniqueKey || card.cardNumber;
};

export const getCardInstanceId = (card: Pick<Card, 'instanceId' | 'uniqueKey' | 'cardNumber'>): string => {
  return card.instanceId || getCardBaseId(card);
};

export const isSameCardInstance = (
  a: Pick<Card, 'instanceId' | 'uniqueKey' | 'cardNumber'> | null | undefined,
  b: Pick<Card, 'instanceId' | 'uniqueKey' | 'cardNumber'> | null | undefined,
): boolean => {
  if (!a || !b) return false;
  return getCardInstanceId(a) === getCardInstanceId(b);
};

export const compareCardsByIdentity = (
  a: Pick<Card, 'cardNumber' | 'cardName' | 'uniqueKey' | 'instanceId'>,
  b: Pick<Card, 'cardNumber' | 'cardName' | 'uniqueKey' | 'instanceId'>,
): number => {
  const numberDiff = a.cardNumber.localeCompare(b.cardNumber);
  if (numberDiff !== 0) return numberDiff;

  const keyDiff = getCardBaseId(a).localeCompare(getCardBaseId(b));
  if (keyDiff !== 0) return keyDiff;

  const nameDiff = a.cardName.localeCompare(b.cardName);
  if (nameDiff !== 0) return nameDiff;

  return getCardInstanceId(a).localeCompare(getCardInstanceId(b));
};
