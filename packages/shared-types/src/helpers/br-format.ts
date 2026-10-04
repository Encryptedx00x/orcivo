// Máscaras de entrada/exibição para documentos e contatos brasileiros.
// Aceitam texto parcial (digitação) e devolvem o valor formatado até onde houver dígitos.

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

function apply(digits: string, pattern: string): string {
  let out = '';
  let i = 0;
  for (const ch of pattern) {
    if (i >= digits.length) break;
    if (ch === '#') out += digits[i++];
    else out += ch;
  }
  return out;
}

/** (11) 98765-4321 / (11) 3456-7890 */
export function maskPhone(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  return apply(d, d.length > 10 ? '(##) #####-####' : '(##) ####-####');
}

/** 000.000.000-00 até 11 dígitos; 00.000.000/0000-00 acima disso. */
export function maskCpfCnpj(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 14);
  return d.length > 11 ? apply(d, '##.###.###/####-##') : apply(d, '###.###.###-##');
}

/** 00000-000 */
export function maskCep(value: string | null | undefined): string {
  return apply(onlyDigits(value).slice(0, 8), '#####-###');
}
