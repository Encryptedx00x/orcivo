# VPS do Orcivo

## Variáveis de ambiente do Mercado Pago

Adicione as variáveis abaixo em `/srv/orcivo/.env` antes de iniciar ou atualizar os serviços de billing:

```dotenv
# Use `test` no ambiente de teste e `production` somente em produção.
MP_ENV=
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=
```

Os valores de produção para `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` e `MP_WEBHOOK_SECRET` são uma decisão Level C: devem ser enviados pelo owner e nunca registrados neste repositório.

Mantenha o arquivo `/srv/orcivo/.env` fora do controle de versão e use as credenciais de teste enquanto `MP_ENV=test`.
