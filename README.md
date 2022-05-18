# PIX BB
Biblioteca em nodejs/typescript para a API de PIX do Banco do Brasil
> A API Pix BB é o elemento final para que o usuário recebedor possa automatizar
> sua interação com o Banco do Brasil, a fim de receber e gerenciar transações
> Pix. 

> O usuário recebedor poderá, via API Pix BB, gerar QR Code de cobrança para
> pagamentos e verificar a liquidação desses pagamentos, entre outras
> possibilidades.

[Fonte](https://apoio.developers.bb.com.br/referency/post/5fe0853e156f4c0012e4e2a9)

## Exemplo
```typescript
// O token vence a cada uns 10 minutos
// greenToken retorna o mesmo token antes disso
// e busca outro se já tiver passado
const jwt = await greenToken()

const {
  txid,
  qrAscii
} = await criarCobranca(jwt, { valor: 12.34, descricao: 'Tortuguitas Felizes' })

// qrAscii é o qrcode em texto, que pode ser printado no terminal
// qrBase64 é um png em base64 pra ser usado em html
console.log(`txid=${txid}\n\n${qrAscii}`)

const { descricao, status } = await consultarPIX(jwt, txid)
```

Veja os testes para mais exemplos

## Credenciais
São necessárias `developer_application_key`, `basic_authorization` e `chave`,
podem estar num arquivo .env