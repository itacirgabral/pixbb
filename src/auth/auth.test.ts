import 'dotenv/config'
import { describe, expect, test } from '@jest/globals'
import { gerarToken, greenToken, preGreen } from '../auth'
import { setTimeout } from 'timers/promises'

describe('AUTH', () => {
  test('gera token novo com basic_authorization da env', () => gerarToken()
    .then(jwt => {
      expect(typeof jwt).toBe('string')
    })
  )
  test('gera token novo com basic_authorization por argumento e dá errado', () => gerarToken('iço.ta.errado')
    .catch(err => {
      expect(err.message).toBe('Request failed with status code 401')
    })
  )
  test('gera tokens e o deixa em cache até expirar', async () => {
    const t0 = Date.now()
    const tokenA = await greenToken()
    const t1 = Date.now()
    const tokenB = await greenToken()
    const t2 = Date.now()

    const d1 = t1 - t0
    const d2 = t2 - t1
    console.log(`d1=${d1} d2=${d2}`)

    expect(tokenA).toBe(tokenB)
  })
  test('gera tokens proximos que devem ser iguais', async () => {
    const tokenAP = greenToken()
    const tokenBP = greenToken()
    const [tokenA, tokenB] = await Promise.all([tokenAP, tokenBP])

    expect(tokenA).toBe(tokenB)
  })
  test('gera tokens rapidos que devem ser diferentes', async () => {
    const tokenA = await greenToken(undefined, 599_000) // default expiration 600_000
    await setTimeout(2_000) // wait to expire
    const tokenB = await greenToken()

    expect(tokenA).not.toBe(tokenB)
  })
  test('gera tokens com o pre atualizador ligado', async () => {
    preGreen(true, undefined, 0, 1_000) // atualiza a cada 1s

    const tokenA = await greenToken()
    await setTimeout(2_000)
    const tokenB = await greenToken()

    preGreen(false) // desliga
    expect(tokenA).not.toBe(tokenB)
  })
})
