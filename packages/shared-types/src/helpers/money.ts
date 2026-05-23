import Decimal from 'decimal.js';

/** Formata valor string decimal para exibição: "1234.56" → "R$ 1.234,56" */
export function formatMoney(value: string | null | undefined): string {
  if (!value) return 'R$ 0,00';
  const d = new Decimal(value);
  return `R$ ${d
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** Multiplica dois valores string decimal: "10.00" * "3.000" → "30.00" */
export function multiplyDecimal(a: string, b: string): string {
  return new Decimal(a).mul(new Decimal(b)).toFixed(2);
}

/** Soma array de valores string decimal */
export function sumDecimal(values: string[]): string {
  return values.reduce(
    (acc, v) => new Decimal(acc).add(new Decimal(v)).toFixed(2),
    '0',
  );
}
