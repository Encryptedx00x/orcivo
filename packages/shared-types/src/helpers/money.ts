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

/** Subtrai valores string decimal: "100.00" - "30.50" → "69.50" */
export function subtractDecimal(a: string, b: string): string {
  return new Decimal(a).minus(new Decimal(b)).toFixed(2);
}

/** Soma array de valores string decimal */
export function sumDecimal(values: string[]): string {
  return values.reduce((acc, v) => new Decimal(acc).add(new Decimal(v)).toFixed(2), '0');
}

/**
 * Normaliza o valor digitado no formato pt-BR ou decimal para uma string
 * decimal com duas casas. Retorna null para valores inválidos ou não positivos.
 */
export function parseMoneyInput(value: string): string | null {
  const raw = value
    .trim()
    .replace(/^R\$\s?/, '')
    .replace(/\s/g, '');
  if (!raw || !/^[\d.,]+$/.test(raw)) return null;

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(raw)
      ? raw.replace(/\./g, '')
      : raw;

  try {
    const amount = new Decimal(normalized);
    if (!amount.isFinite() || !amount.gt(0) || amount.decimalPlaces() > 2) return null;
    return amount.toFixed(2);
  } catch {
    return null;
  }
}

/** Média de valores decimais, sem conversão para ponto flutuante. */
export function averageDecimal(values: string[]): string {
  if (values.length === 0) return '0.00';
  return new Decimal(sumDecimal(values)).div(values.length).toFixed(2);
}

/** Maior valor decimal de uma lista, usado em escalas de gráficos. */
export function maxDecimal(values: string[]): string {
  return values.reduce((max, value) => Decimal.max(max, new Decimal(value)).toFixed(2), '0.00');
}

/** Percentual decimal para CSS, sem expor valores monetários como number. */
export function decimalPercentage(value: string, total: string): string {
  const divisor = new Decimal(total);
  if (divisor.lte(0)) return '0';
  return new Decimal(value).div(divisor).mul(100).toFixed(2);
}
