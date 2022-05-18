import 'dotenv/config'
import { describe, test } from '@jest/globals'
import { greenToken } from '../auth'
import { criarCobranca, consultarPIX } from '../charge'

describe('CHARGE', () => {
  test('gera novo pix apenas com preço', async () => {
    const jwt = await greenToken()
    const { txid, qrAscii } = await criarCobranca(jwt, { valor: 12.34 })
    console.log(`txid=${txid}\n\n${qrAscii}`)
  })
  test('gera novo pix e busca no BB', async () => {
    const jwt = await greenToken()
    const { txid } = await criarCobranca(jwt, { valor: 12.34, descricao: 'Tortuguitas felizes' })
    console.log(`txid=${txid}`)

    const { descricao, status } = await consultarPIX(jwt, txid)
    console.log(`${descricao} ${status}`)
  })
  test('gera novo pix com cpf e nome', async () => {
    const jwt = await greenToken()
    const cpf = '29653927850' // obs não basta ser válido, precisa existir
    const nome = 'Luizão'
    const { txid } = await criarCobranca(jwt, { valor: 12.34, cpf, nome })
    console.log(`txid=${txid}`)
  })
  test('gera novo pix com cnpj', async () => {
    const jwt = await greenToken()
    const cnpj = '00000000000191' // obs não basta ser válido, precisa existir
    const { txid } = await criarCobranca(jwt, { valor: 12.34, cnpj })
    console.log(`txid=${txid}`)
  })
})
