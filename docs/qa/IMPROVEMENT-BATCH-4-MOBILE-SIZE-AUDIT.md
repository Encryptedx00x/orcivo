# Improvement Batch 4 — auditoria de tamanho do app

Data da medição: 2026-10-14  
Tarefa: `B4-18-mobile-size-budget`

## Resultado executivo

O valor de aproximadamente **73 MB** continua sendo uma observação do primeiro Key User sobre a build instalada.
O APK original, um AAB e um IPA não estão disponíveis no repositório e esta máquina não possui Android SDK,
`adb`, emulador ou ambiente iOS; portanto, esse número não foi promovido a baseline exata nem comparado como se
fosse reproduzível.

A parte reproduzível foi medida com um export Android de produção do Expo/Metro, bytecode Hermes e source map. O
baseline é de **3.226.080 bytes de bytecode Hermes** (1.255.294 bytes em gzip), **1.655 bytes de assets empacotados
pelo Metro**, seis assets e 2.761 módulos no source map. O comando `pnpm --filter @orcivo/mobile size:android`
refaz o export, apresenta a composição e falha quando o orçamento é excedido.

## Orçamento inicial

| Métrica                 |    Baseline |      Limite | Justificativa                                       |
| ----------------------- | ----------: | ----------: | --------------------------------------------------- |
| Bytecode Hermes Android | 3.226.080 B | 3.548.688 B | tolerância de 10% para evolução funcional           |
| Assets do export Metro  |     1.655 B |   262.144 B | impede inclusão acidental de mídia pesada no bundle |

Source maps ficam fora do orçamento porque não integram o artefato distribuído normal. Os assets nativos
`icon.png` (5.337 B), `adaptive-icon.png` (5.337 B) e `splash.png` (13.953 B) são inventariados separadamente.

## Composição observada

Os maiores grupos por bytes de código-fonte incorporados ao source map foram:

| Grupo                             | Bytes de fonte |
| --------------------------------- | -------------: |
| `react-native`                    |      2.319.541 |
| `lucide-react-native`             |      1.375.446 |
| código do app                     |        647.566 |
| `react-native-svg`                |        251.255 |
| `@react-navigation/core`          |        172.054 |
| `zod`                             |        157.923 |
| `@react-native/virtualized-lists` |        154.583 |
| `decimal.js`                      |        136.673 |
| `expo`                            |        122.552 |
| `react-native-screens`            |        122.237 |

Bytes de fonte servem para localizar candidatos, não equivalem diretamente a bytes finais do APK. As dependências
listadas sustentam navegação, contratos, dinheiro Decimal, ícones do design aprovado e recursos nativos usados; não
foi encontrada remoção segura que justificasse eliminar funcionalidade. Os dois ícones PNG de 5,3 KB têm papéis
nativos distintos e a economia potencial é irrelevante diante do risco de configuração de plataforma.

`lucide-react-native` merece acompanhamento por ser o segundo maior grupo de fonte, mas trocar a biblioteca ou
introduzir imports internos não documentados seria mudança de design/empacotamento sem prova de economia no
artefato. O orçamento agora detectará regressão antes que uma otimização dessa natureza seja considerada.

## Reprodução e limites da evidência

1. Na raiz do monorepo, executar `pnpm --filter @orcivo/mobile test:size-budget`.
2. Executar `pnpm --filter @orcivo/mobile size:android` com rede local disponível para o Metro.
3. O script usa configuração equivalente a produção, com API pública, sem publicar app nem acessar dados.
4. Para medir APK/AAB, executar futuramente uma build Android distribuível aprovada e anexar `ls -l`/hash do
   artefato; para IPA, repetir em ambiente Apple autorizado. Publicação em loja continua fora de escopo.

A instalação nativa antes/depois ficou **não reproduzida neste equipamento**, porque não existe dispositivo,
emulador nem artefato instalável. A abertura equivalente pelo Expo web e as Homes fácil/completa já foram
verificadas nas B4-16/B4-17; esta tarefa não removeu recursos nem alterou UI. A apresentação do download/instalação
fica **não aplicável ao produto atual**: Orcivo não controla a tela de download da loja e não há página própria de
distribuição no escopo. Quando existir uma superfície controlável, ela deverá exibir o tamanho vindo do artefato,
nunca uma constante estimada.
