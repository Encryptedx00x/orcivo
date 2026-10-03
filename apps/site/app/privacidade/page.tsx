import { pageMetadata } from '../seo';
import { LEGAL_DOCS_VERSION } from '@orcivo/shared-types';

export const metadata = pageMetadata(
  'Política de Privacidade | Orcivo',
  'Saiba como o Orcivo trata dados pessoais conforme a LGPD: bases legais, direitos do titular, retenção, suboperadores e cookies.',
  '/privacidade',
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

export default function PrivacidadePage() {
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
        <h1>Política de Privacidade</h1>
        <p>
          <strong>Versão:</strong> {LEGAL_DOCS_VERSION} (vigência a partir de 3 de outubro de 2026)
        </p>
        <p>
          <strong>Contato:</strong> suporte@orcivo.com.br
        </p>

        <h2>1. Introdução e quem é o responsável</h2>
        <p>
          Esta Política explica como o Orcivo trata dados pessoais, em conformidade com a Lei Geral
          de Proteção de Dados (Lei nº 13.709/2018 — LGPD). O serviço é oferecido por{' '}
          <Ph>[RAZÃO SOCIAL]</Ph>, CNPJ <Ph>[CNPJ]</Ph>, com sede em <Ph>[ENDEREÇO]</Ph>
          (&ldquo;Orcivo&rdquo;). Ela complementa os <Link href="/termos">Termos de Uso</Link>.
        </p>
        <p>O Orcivo atua em dois papéis distintos:</p>
        <ul>
          <li>
            <strong>Controlador</strong>, em relação aos dados do próprio Usuário (técnico ou
            empresa que cria a conta): cadastro, autenticação, cobrança e uso do serviço.
          </li>
          <li>
            <strong>Operador</strong>, em relação aos dados dos clientes finais do Usuário (pessoas
            atendidas pelo técnico) que o Usuário registra na plataforma. Nesse caso,{' '}
            <strong>o Usuário (técnico) é o controlador</strong> e o Orcivo trata os dados apenas
            conforme as instruções dele e para prestar o serviço.
          </li>
        </ul>

        <h2>2. Dados que tratamos</h2>
        <h3>2.1 Dados do Usuário (Orcivo como controlador)</h3>
        <ul>
          <li>
            Cadastro: nome, e-mail, telefone (opcional) e senha (guardada apenas em forma de hash).
          </li>
          <li>
            Empresa: nome fantasia, CPF ou CNPJ, cidade, UF, telefone, cor da marca, logo e chave
            Pix informados por você.
          </li>
          <li>
            Aceite dos documentos legais: versão dos Termos e da Política aceitos e data e hora do
            aceite.
          </li>
          <li>
            Assinatura e cobrança: plano, ciclo, status da assinatura e identificadores de
            pagamento. Dados completos de cartão são tratados pelo Mercado Pago e não ficam no
            Orcivo.
          </li>
          <li>
            Uso e segurança: registros de auditoria de ações na conta, endereço IP, tipo de
            dispositivo e eventos de acesso, necessários para segurança e prevenção a fraudes.
          </li>
          <li>Comunicações com o suporte.</li>
        </ul>
        <h3>2.2 Dados de clientes finais (Orcivo como operador)</h3>
        <p>
          Os dados que o Usuário cadastrar sobre seus clientes: nome, documento, telefone, e-mail,
          endereços, histórico de orçamentos e ordens de serviço, fotos de serviços, assinaturas de
          aprovação, valores e pagamentos. O Orcivo não define quais dados são coletados nem a
          finalidade; isso cabe ao Usuário, que deve ter base legal e informar seus clientes.
        </p>

        <h2>3. Finalidades e bases legais</h2>
        <ul>
          <li>
            <strong>Prestar o serviço e criar/gerenciar a conta</strong> — execução de contrato
            (art. 7º, V, LGPD).
          </li>
          <li>
            <strong>Cobrança, assinatura e emissão de comprovantes</strong> — execução de contrato e
            cumprimento de obrigação legal ou regulatória (art. 7º, V e II).
          </li>
          <li>
            <strong>Segurança, prevenção a fraudes, auditoria e suporte</strong> — legítimo
            interesse (art. 7º, IX), com avaliação de que não prevalecem direitos e liberdades do
            titular, e exercício regular de direitos (art. 7º, VI).
          </li>
          <li>
            <strong>Comunicações transacionais</strong> (confirmação de cadastro, redefinição de
            senha, falhas de cobrança, avisos do serviço) — execução de contrato.
          </li>
          <li>
            <strong>Comunicações de novidades ou ofertas</strong>, quando houver — consentimento ou
            legítimo interesse conforme o caso, com opção de descadastro.
          </li>
          <li>
            <strong>Registro do aceite dos Termos e desta Política</strong> — cumprimento de
            obrigação legal e exercício regular de direitos.
          </li>
          <li>
            <strong>Dados de clientes finais</strong> — a base legal é definida pelo Usuário como
            controlador (por exemplo, execução de contrato com o cliente dele ou legítimo
            interesse); o Orcivo trata como operador.
          </li>
        </ul>
        <p>Não vendemos dados pessoais nem os usamos para publicidade de terceiros.</p>

        <h2>4. Compartilhamento e suboperadores</h2>
        <p>
          Para operar o serviço, contratamos os seguintes suboperadores, que tratam dados em nosso
          nome e sob obrigações de confidencialidade e segurança:
        </p>
        <ul>
          <li>
            <strong>Mercado Pago</strong> — processamento de pagamentos e assinaturas dos planos
            pagos.
          </li>
          <li>
            <strong>Provedor de e-mail (Resend)</strong> — envio de e-mails transacionais (cadastro,
            redefinição de senha, avisos de cobrança e orçamentos enviados).
          </li>
          <li>
            <strong>Hospedagem e armazenamento de arquivos</strong> — servidores (VPS) que executam
            a aplicação e o banco de dados, e armazenamento de objetos compatível com S3 (MinIO)
            para fotos, PDFs e assinaturas. <Ph>[PROVEDOR DE HOSPEDAGEM E REGIÃO]</Ph>
          </li>
        </ul>
        <p>
          Também podemos compartilhar dados com autoridades quando exigido por lei ou ordem
          judicial, e com assessores profissionais sob sigilo. Quando um orçamento é enviado ao
          cliente final do Usuário, o conteúdo do orçamento é disponibilizado a esse cliente por
          link, por decisão do Usuário. Se algum suboperador estiver fora do Brasil, a transferência
          internacional observará os mecanismos do art. 33 da LGPD. Mudanças na lista de
          suboperadores serão refletidas nesta página.
        </p>

        <h2>5. Seus direitos como titular</h2>
        <p>
          Nos termos do art. 18 da LGPD, você pode solicitar, a qualquer momento: confirmação da
          existência de tratamento; acesso aos dados; correção de dados incompletos, inexatos ou
          desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados
          em desconformidade; portabilidade; eliminação dos dados tratados com consentimento;
          informação sobre compartilhamentos; informação sobre a possibilidade de não consentir e
          suas consequências; revogação do consentimento; e revisão de decisões automatizadas.
        </p>
        <p>
          Para exercer seus direitos, escreva ao nosso encarregado pelo tratamento de dados (DPO):{' '}
          <Ph>[E-MAIL DO ENCARREGADO]</Ph>, ou para suporte@orcivo.com.br. Responderemos em prazo
          razoável, conforme a regulamentação aplicável. Você também pode peticionar à Autoridade
          Nacional de Proteção de Dados (ANPD).
        </p>
        <p>
          <strong>Se você é cliente final de um técnico que usa o Orcivo:</strong> o controlador dos
          seus dados é o técnico ou a empresa que o atendeu. Dirija seu pedido a ele; se nos
          procurar, encaminharemos o pedido ao controlador e o auxiliaremos no que for necessário.
        </p>

        <h2>6. Retenção e exclusão</h2>
        <ul>
          <li>
            Dados da conta são mantidos enquanto ela estiver ativa. Ao encerrar a conta, os dados do
            Usuário e de seus clientes finais são excluídos ou anonimizados após um período de
            carência para recuperação e término de rotinas de backup, salvo o que a lei obrigue
            manter.
          </li>
          <li>
            Dados de cobrança, notas e comprovantes e o registro de aceite dos documentos legais
            podem ser mantidos por até 5 (cinco) anos após o encerramento, para cumprimento de
            obrigações legais e fiscais e defesa em processos.
          </li>
          <li>
            Registros de segurança e auditoria são mantidos pelo período necessário à finalidade e à
            lei.
          </li>
          <li>
            Cópias de segurança expiram em ciclo de rotação; a eliminação definitiva nelas ocorre ao
            fim do ciclo.
          </li>
        </ul>
        <p>
          Você pode exportar seus dados enquanto a conta estiver ativa. Pedidos de exclusão podem
          ser feitos pelo canal do encarregado.
        </p>

        <h2>7. Segurança</h2>
        <p>
          Adotamos medidas técnicas e organizacionais proporcionais ao risco: tráfego criptografado
          (HTTPS), senhas protegidas por hash, isolamento dos dados entre contas, controle de acesso
          por função, registros de auditoria, cópias de segurança e acesso restrito à
          infraestrutura. Nenhum sistema é totalmente imune; em caso de incidente que possa causar
          risco ou dano relevante, comunicaremos os titulares afetados e a ANPD nos termos da lei.
        </p>

        <h2>8. Cookies e tecnologias semelhantes</h2>
        <p>
          Usamos <strong>cookies estritamente necessários</strong> no aplicativo web, para manter
          sua sessão autenticada e proteger o acesso. Sem eles o serviço não funciona e, por isso,
          não dependem de consentimento. No momento, não usamos cookies de publicidade nem de
          perfilamento. Se passarmos a usar cookies de análise ou de marketing, atualizaremos esta
          Política e solicitaremos seu consentimento quando exigido. Você pode apagar ou bloquear
          cookies nas configurações do navegador, ciente de que isso pode impedir o login. O
          aplicativo móvel guarda credenciais de sessão em armazenamento seguro do dispositivo.
        </p>

        <h2>9. Crianças e adolescentes</h2>
        <p>
          O Orcivo é destinado a profissionais maiores de 18 anos e não é direcionado a crianças ou
          adolescentes.
        </p>

        <h2>10. Alterações desta Política</h2>
        <p>
          Podemos atualizar esta Política. Cada versão tem data de vigência e, em mudanças
          relevantes, avisaremos por e-mail ou no aplicativo. A versão aceita por você no cadastro
          fica registrada.
        </p>

        <h2>11. Contato e encarregado</h2>
        <p>
          Controlador: <Ph>[RAZÃO SOCIAL]</Ph>, CNPJ <Ph>[CNPJ]</Ph>, <Ph>[ENDEREÇO]</Ph>.
          Encarregado pelo tratamento de dados (DPO): <Ph>[E-MAIL DO ENCARREGADO]</Ph>. Suporte
          geral: suporte@orcivo.com.br.
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
