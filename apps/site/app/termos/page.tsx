import { pageMetadata } from '../seo';
import { LEGAL_DOCS_VERSION } from '../../../../packages/shared-types/src/auth/legal-versions';
import { getPlans, priceLabel } from '../planos/plan-catalog';

export const metadata = pageMetadata(
  'Termos de Uso | Orcivo',
  'Consulte os Termos de Uso do Orcivo: planos, assinatura, cancelamento, uso justo, responsabilidades e tratamento de dados de clientes finais.',
  '/termos',
  true,
);

import Link from 'next/link';
import type { ReactNode } from 'react';

// Dados que só o owner fornece: sempre visíveis e marcados no texto.
function Ph({ children }: { children: ReactNode }) {
  return (
    <mark data-placeholder className="bg-yellow-200 text-slate-900 px-1 rounded font-semibold">
      {children}
    </mark>
  );
}

export default function TermosPage() {
  const plans = getPlans();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">
            Orcivo
          </Link>
        </div>
      </header>
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-gray">
        <h1>Termos de Uso</h1>
        <p>
          <strong>Versão:</strong> {LEGAL_DOCS_VERSION} (vigência a partir de 3 de outubro de 2026)
        </p>
        <p>
          <strong>Contato:</strong> suporte@orcivo.com.br
        </p>

        <h2>1. Quem somos e aceitação</h2>
        <p>
          O Orcivo é um serviço de software oferecido por <Ph>[RAZÃO SOCIAL]</Ph>, inscrita no CNPJ
          sob o nº <Ph>[CNPJ]</Ph>, com sede em <Ph>[ENDEREÇO]</Ph> (&ldquo;Orcivo&rdquo;). Ao criar
          uma conta, marcar a caixa de aceite no cadastro (site, aplicativo web ou aplicativo
          móvel) ou usar o serviço, você (&ldquo;Usuário&rdquo;) declara ter lido e concordado com
          estes Termos de Uso e com a <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
        <p>
          Para aceitar, você precisa ter capacidade civil para contratar. Se contratar em nome de
          uma empresa, declara ter poderes para isso.
        </p>
        <p>
          Registramos a <strong>versão</strong> e a <strong>data e hora</strong> dos documentos que
          você aceitou no cadastro, para comprovar o aceite.
        </p>

        <h2>2. O serviço</h2>
        <p>
          O Orcivo é uma plataforma de gestão para técnicos instaladores e prestadores de serviço:
          cadastro de clientes, orçamentos com PDF e aprovação pelo cliente, ordens de serviço,
          agenda, financeiro, catálogo de itens e, conforme o plano, relatórios, contratos digitais
          e equipe. O serviço está disponível pelo aplicativo móvel e pelo aplicativo web. Novas
          funcionalidades podem ser acrescentadas, alteradas ou descontinuadas; mudanças relevantes
          que afetem o plano contratado serão comunicadas com antecedência razoável.
        </p>
        <p>
          O Orcivo é uma ferramenta de apoio. Valores, prazos, medidas, especificações técnicas,
          garantias e a execução dos serviços são de responsabilidade exclusiva do Usuário.
        </p>

        <h2>3. Conta e acesso</h2>
        <ul>
          <li>Os dados do cadastro devem ser verdadeiros e mantidos atualizados.</li>
          <li>
            Você é responsável por manter a confidencialidade da senha e por toda atividade
            realizada na sua conta. Avise-nos imediatamente em caso de uso não autorizado.
          </li>
          <li>
            Cada conta tem um proprietário. Membros adicionais só podem ser convidados nos planos
            que preveem equipe, respeitado o limite de membros do plano.
          </li>
          <li>
            É proibido compartilhar credenciais entre pessoas fora da equipe cadastrada, usar o
            serviço para fins ilícitos, tentar acessar dados de outras contas, burlar limites de
            plano, realizar engenharia reversa ou sobrecarregar a infraestrutura.
          </li>
        </ul>

        <h2>4. Planos e limites</h2>
        <p>
          O Orcivo é oferecido nos planos <strong>Orcivo Livre</strong>,{' '}
          <strong>Orcivo Solo</strong>, <strong>Orcivo Mais</strong> e{' '}
          <strong>Orcivo Equipe</strong>. Valores e limites vigentes (também divulgados em{' '}
          <Link href="/planos">orcivo.com.br/planos</Link>):
        </p>
        <ul>
          {plans.map((plan) => (
            <li key={plan.code}>
              <strong>{plan.name}</strong> — {priceLabel(plan.code, 'monthly')} no ciclo mensal;{' '}
              {priceLabel(plan.code, 'yearly')} no ciclo anual. {plan.features.join('; ')}.
            </li>
          ))}
        </ul>
        <p>
          Quando o limite do plano é atingido, o Orcivo bloqueia a <em>criação</em> de novos
          registros daquele tipo, mas continua permitindo consultar e exportar os dados já
          existentes. Fazer upgrade libera o novo limite imediatamente. Um downgrade passa a valer
          no próximo ciclo; se houver excesso de registros em relação ao novo plano, eles são
          preservados, porém novas criações ficam bloqueadas até o uso voltar ao limite.
        </p>
        <p>
          O Orcivo poderá reajustar preços e limites de planos pagos mediante aviso prévio
          razoável; o reajuste só se aplica ao ciclo seguinte ao aviso e você poderá cancelar antes
          dele.
        </p>

        <h2>5. Uso justo e uso ampliado</h2>
        <p>
          Quando um plano indica recurso em <strong>uso justo</strong> (por exemplo, orçamentos e
          ordens de serviço no Orcivo Mais e no Orcivo Equipe), não há um número fixo contratado,
          mas o uso deve ser compatível com a atividade profissional normal de um técnico ou de uma
          equipe do porte previsto no plano. Não é considerado uso justo: automatizar a criação em
          massa de registros, revender ou repassar o serviço a terceiros como produto próprio, ou
          qualquer uso que degrade o desempenho para outros usuários.
        </p>
        <p>
          Se identificarmos uso muito acima do padrão, entraremos em contato para entender a
          necessidade antes de qualquer medida. Podemos propor <strong>uso ampliado</strong>{' '}
          (condições comerciais específicas para volumes acima do uso justo). Persistindo o uso
          excessivo sem acordo, o Orcivo poderá aplicar limites técnicos ao recurso afetado, sempre
          preservando o acesso de consulta e exportação aos seus dados.
        </p>

        <h2>6. Assinatura, renovação, cancelamento e reembolso</h2>
        <p>
          <strong>Assinatura.</strong> O Orcivo Livre é gratuito. Os planos Orcivo Solo, Orcivo Mais
          e Orcivo Equipe são pagos, em ciclo mensal ou anual, escolhido na contratação. O
          pagamento é processado pelo Mercado Pago, que pode oferecer cartão de crédito, Pix e
          outros meios disponíveis no momento da contratação. O Orcivo não armazena os dados
          completos do seu cartão.
        </p>
        <p>
          <strong>Renovação.</strong> Os planos pagos renovam automaticamente ao fim de cada ciclo,
          pelo mesmo plano e ciclo, ao valor vigente, até que você cancele. Você será avisado por
          e-mail quando houver falha de cobrança.
        </p>
        <p>
          <strong>Falha de pagamento.</strong> Se a cobrança falhar, a conta fica em situação de
          pendência e há um prazo de carência que varia conforme o plano. Encerrada a carência sem
          regularização, ficam bloqueadas ações de criação (clientes, orçamentos, PDFs, ordens de
          serviço, agendamentos, convites e uploads), mantendo-se o acesso para entrar, consultar e
          exportar dados, regularizar o pagamento, falar com o suporte e cancelar. Com o pagamento
          confirmado, as ações são liberadas automaticamente.
        </p>
        <p>
          <strong>Cancelamento.</strong> Você pode cancelar a qualquer momento pelo painel de
          assinatura. O cancelamento interrompe renovações futuras e o acesso ao plano pago
          continua até o fim do período já pago, quando a conta passa ao Orcivo Livre, respeitados
          os limites desse plano.
        </p>
        <p>
          <strong>Reembolso.</strong> Em contratação feita à distância, você pode desistir em até 7
          (sete) dias corridos contados da primeira contratação do plano pago, com devolução
          integral do valor pago, nos termos do art. 49 do Código de Defesa do Consumidor (se
          aplicável ao seu caso). Para solicitar, escreva a suporte@orcivo.com.br. Passado esse
          prazo, não há reembolso proporcional de períodos já iniciados, salvo falha do serviço
          imputável ao Orcivo ou obrigação legal. Reembolsos são feitos pelo mesmo meio de
          pagamento, em prazo dependente do Mercado Pago e da instituição financeira.
        </p>

        <h2>7. Seus conteúdos e dados de clientes finais</h2>
        <p>
          Os dados que você cadastra (clientes, endereços, orçamentos, ordens de serviço, fotos,
          assinaturas, valores) continuam sendo seus. Você nos concede apenas a licença necessária
          para hospedar, processar, exibir e transmitir esses conteúdos para prestar o serviço.
        </p>
        <p>
          Em relação aos dados pessoais dos seus clientes finais que você insere no Orcivo, na
          forma da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD):{' '}
          <strong>o Usuário (técnico ou empresa) é o controlador</strong> e{' '}
          <strong>o Orcivo é o operador</strong>, tratando esses dados somente conforme as
          instruções do Usuário e para a finalidade de prestar o serviço. Cabe ao Usuário: ter base
          legal para coletar e tratar os dados dos seus clientes, informá-los adequadamente,
          atender aos pedidos desses titulares e não inserir dados que não deveria coletar. O
          Orcivo adotará medidas de segurança adequadas, auxiliará o Usuário no atendimento de
          direitos dos titulares na medida do possível e só usará subcontratados (suboperadores)
          listados na <Link href="/privacidade">Política de Privacidade</Link>.
        </p>

        <h2>8. Disponibilidade, suporte e segurança</h2>
        <p>
          Empregamos esforços razoáveis para manter o serviço disponível e seguro, com cópias de
          segurança periódicas, mas não garantimos funcionamento ininterrupto. Manutenções
          programadas serão avisadas quando possível. O suporte é prestado por e-mail, com
          prioridade conforme o plano. Recomendamos que você exporte seus dados periodicamente.
        </p>

        <h2>9. Responsabilidades e limitação</h2>
        <ul>
          <li>
            O Usuário responde pelo conteúdo que insere, pelos orçamentos e serviços que presta aos
            seus clientes e por suas obrigações fiscais, trabalhistas e regulatórias.
          </li>
          <li>
            O Orcivo não é parte da relação entre o Usuário e seus clientes finais e não garante
            aprovação de orçamentos, recebimento de valores ou resultado comercial.
          </li>
          <li>
            O serviço é fornecido &ldquo;como está&rdquo;, na extensão permitida em lei. O Orcivo
            não responde por danos indiretos, lucros cessantes ou perda de dados decorrentes de uso
            indevido, falha de equipamentos ou redes do Usuário ou caso fortuito e força maior.
          </li>
          <li>
            Na medida permitida pela lei, a responsabilidade total do Orcivo perante o Usuário fica
            limitada ao valor pago por ele nos 12 (doze) meses anteriores ao evento. Nada nestes
            Termos exclui direitos que a legislação consumerista torna irrenunciáveis.
          </li>
        </ul>

        <h2>10. Suspensão e encerramento</h2>
        <p>
          Podemos suspender ou encerrar contas que violem estes Termos, a lei ou direitos de
          terceiros, com aviso sempre que possível. Você pode encerrar sua conta a qualquer momento
          e solicitar a exclusão dos dados conforme a Política de Privacidade; alguns dados podem
          ser mantidos pelo prazo exigido em lei.
        </p>

        <h2>11. Propriedade intelectual</h2>
        <p>
          O software, a marca Orcivo, o design e a documentação pertencem ao Orcivo. Estes Termos
          não transferem a você nenhum direito além da licença limitada, revogável e não exclusiva
          de usar o serviço enquanto a conta estiver ativa.
        </p>

        <h2>12. Alterações destes Termos</h2>
        <p>
          Podemos atualizar estes Termos. Cada versão tem uma data de vigência. Em mudanças
          relevantes avisaremos por e-mail ou no aplicativo; continuar usando o serviço após a
          vigência da nova versão significa concordância, e você pode cancelar se não concordar.
        </p>

        <h2>13. Lei aplicável e foro</h2>
        <p>
          Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro do domicílio do
          Usuário consumidor, ou, nas demais hipóteses, o foro da comarca de <Ph>[ENDEREÇO]</Ph>,
          para dirimir controvérsias.
        </p>

        <h2>14. Contato</h2>
        <p>
          Dúvidas sobre estes Termos: suporte@orcivo.com.br. Dados do responsável:{' '}
          <Ph>[RAZÃO SOCIAL]</Ph>, CNPJ <Ph>[CNPJ]</Ph>, <Ph>[ENDEREÇO]</Ph>. Questões de
          privacidade: encarregado pelo tratamento de dados — <Ph>[E-MAIL DO ENCARREGADO]</Ph>.
        </p>

        <p className="text-sm text-slate-500 mt-12" data-legal-review-notice>
          <strong>Aviso:</strong> este texto é uma base e passa por revisão jurídica formal antes do
          lançamento público. O Orcivo decidiu publicar o conteúdo completo desde já; trechos
          marcados em destaque (como <Ph>[RAZÃO SOCIAL]</Ph>, <Ph>[CNPJ]</Ph>, <Ph>[ENDEREÇO]</Ph> e{' '}
          <Ph>[E-MAIL DO ENCARREGADO]</Ph>) serão preenchidos pelo responsável pelo Orcivo, e o
          documento poderá mudar após a revisão, com nova versão e novo aceite quando necessário.
        </p>
      </article>
    </div>
  );
}
