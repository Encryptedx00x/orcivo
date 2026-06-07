import { join } from 'path';
import { Font } from '@react-pdf/renderer';

/**
 * Registra Inter e JetBrains Mono (mesmas famílias do design system) para o PDF.
 * Os .ttf vivem em ./fonts e são copiados para dist/quote/fonts via nest-cli assets.
 * Idempotente — chamado uma vez no carregamento do módulo do serviço de PDF.
 */
let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;
  // Em testes, @react-pdf/renderer é mockado parcialmente (sem Font) — não quebrar.
  if (!Font || typeof Font.register !== 'function') return;
  registered = true;

  const fontsDir = join(__dirname, 'fonts');
  const p = (file: string): string => join(fontsDir, file);

  Font.register({
    family: 'Inter',
    fonts: [
      { src: p('Inter-Regular.ttf'), fontWeight: 400 },
      { src: p('Inter-Medium.ttf'), fontWeight: 500 },
      { src: p('Inter-SemiBold.ttf'), fontWeight: 600 },
      { src: p('Inter-Bold.ttf'), fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'JetBrainsMono',
    fonts: [
      { src: p('JetBrainsMono-Regular.ttf'), fontWeight: 400 },
      { src: p('JetBrainsMono-Medium.ttf'), fontWeight: 500 },
      { src: p('JetBrainsMono-SemiBold.ttf'), fontWeight: 600 },
    ],
  });

  // Sem hifenização automática — evita quebras estranhas em descrições.
  Font.registerHyphenationCallback((word) => [word]);
}
