export const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export const number = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
});

export function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
