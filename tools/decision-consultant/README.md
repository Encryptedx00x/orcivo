# Decision Consultant Tool

Ferramenta opcional para consultar a OpenAI API em decisões moderadas durante execução GSD.

## Uso

1. Configure a variável de ambiente:

```powershell
$env:OPENAI_API_KEY="sua_chave"
```

2. Crie uma pergunta:

```powershell
mkdir .decision
notepad .decision/QUESTION.md
```

3. Rode:

```powershell
node tools/decision-consultant/consult-gpt.mjs .decision/QUESTION.md
```

Se `"requires_user": true`, pare e peça aprovação.

Se `"requires_user": false` e `"confidence": "high"`, execute conforme AUTONOMY_POLICY.md.

## Segurança

Não commitar `.decision/`.

Não colocar API key no repo.

Não enviar segredos, API keys, credenciais, PII real ou dados privados de produção.
