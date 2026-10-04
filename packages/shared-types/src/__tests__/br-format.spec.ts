import { maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '../helpers/br-format';

describe('br-format', () => {
  it('formata celular, fixo e digitação parcial', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    expect(maskPhone('1134567890')).toBe('(11) 3456-7890');
    expect(maskPhone('119')).toBe('(11) 9');
    expect(maskPhone('(11) 98765-43219999')).toBe('(11) 98765-4321');
    expect(maskPhone('')).toBe('');
  });

  it('alterna CPF/CNPJ pelo número de dígitos', () => {
    expect(maskCpfCnpj('52998224725')).toBe('529.982.247-25');
    expect(maskCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(maskCpfCnpj('5299')).toBe('529.9');
  });

  it('formata CEP e extrai dígitos', () => {
    expect(maskCep('01310100')).toBe('01310-100');
    expect(onlyDigits('01310-100')).toBe('01310100');
    expect(onlyDigits(null)).toBe('');
  });
});
