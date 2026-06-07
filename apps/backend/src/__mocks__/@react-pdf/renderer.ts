/**
 * Manual mock de @react-pdf/renderer para o Jest.
 *
 * O pacote real é ESM e o ts-jest (CommonJS) não o transpila, quebrando qualquer
 * suite que carregue o app completo (getTestApp → QuoteModule → QuotePdfService).
 * Este mock é aplicado automaticamente pelo Jest para todas as suites.
 */
export const renderToBuffer = jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT'));
export const Document = ({ children }: { children?: unknown }): unknown => children;
export const Page = ({ children }: { children?: unknown }): unknown => children;
export const View = ({ children }: { children?: unknown }): unknown => children;
export const Text = ({ children }: { children?: unknown }): unknown => children;
export const Image = (): null => null;
export const Svg = ({ children }: { children?: unknown }): unknown => children;
export const Defs = ({ children }: { children?: unknown }): unknown => children;
export const LinearGradient = ({ children }: { children?: unknown }): unknown => children;
export const Stop = (): null => null;
export const Rect = (): null => null;
export const StyleSheet = { create: (s: unknown): unknown => s };
export const Font = {
  register: jest.fn(),
  registerHyphenationCallback: jest.fn(),
};
