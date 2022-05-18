import axios from 'axios'
import * as docVal from 'cpf-cnpj-validator'
import QRCode from 'qrcode'

const envExpiracao = Number.parseInt(process.env.expiracao) || 600 // 10min=600s 10h=36000s
const envChave = process.env.chave || 'testqrcode01@bb.com.br'
const envDevAppKey = process.env.developer_application_key || ''

interface CriarCobrancaArgs {
  valor: number;
  descricao?: string;
  cnpj?: string;
  cpf?: string;
  nome?: string;
}

const criarCobrancaRaw = (jwt: string, criarCobrancaArgs: CriarCobrancaArgs, expiracao?: number, chave?: string, devAppkey?: string) => {
  const headers = {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  }
  const data = JSON.stringify({
    calendario: {
      expiracao: String(expiracao || envExpiracao)
    },
    devedor: criarCobrancaArgs.cnpj || criarCobrancaArgs.cpf
      ? {
          cnpj: criarCobrancaArgs.cnpj,
          cpf: criarCobrancaArgs.cpf,
          nome: criarCobrancaArgs.nome
        }
      : undefined,
    valor: {
      original: String(criarCobrancaArgs.valor)
    },
    chave: chave || envChave,
    solicitacaoPagador: criarCobrancaArgs.descricao
  })

  return axios({
    method: 'put',
    url: `https://api.hm.bb.com.br/pix/v1/cobqrcode/?gw-dev-app-key=${devAppkey || envDevAppKey}`,
    headers,
    data
  })
}

const criarCobranca = (jwt: string, criarCobrancaArgs: CriarCobrancaArgs, expiracao?: number, chave?: string, devAppkey?: string) => new Promise<{ txid: string; qrcode: string; qrBase64: string; qrAscii: string; }>((resolve, reject) => {
  // const haveDevedor = (docVal.cnpj.isValid(criarCobrancaArgs.cnpj) || docVal.cpf.isValid(criarCobrancaArgs.cpf))
  const cnpjOK = docVal.cnpj.isValid(criarCobrancaArgs.cnpj)
  const cpfOK = docVal.cpf.isValid(criarCobrancaArgs.cpf)

  console.dir({
    cpf: criarCobrancaArgs.cpf,
    cpfOK,
    cnpj: criarCobrancaArgs.cnpj,
    cnpjOK
  })

  if (criarCobrancaArgs.cnpj && criarCobrancaArgs.cpf) {
    reject(new Error('se usar cnpj não use cpf'))
  } else {
    // se não tiver um nome nem não aparece cpf/cnpj
    // entao usa o proprio cpf/cnpj como nome
    const cnpjOrNothing = cnpjOK ? criarCobrancaArgs.cnpj : undefined
    const cpfOrNothing = cpfOK ? criarCobrancaArgs.cpf : undefined
    const nomeExtendido = criarCobrancaArgs.nome || cnpjOrNothing || cpfOrNothing

    const extArgs = {
      valor: criarCobrancaArgs.valor,
      descricao: criarCobrancaArgs.descricao,
      cnpj: cnpjOK ? criarCobrancaArgs.cnpj : undefined,
      cpf: cpfOK ? criarCobrancaArgs.cpf : undefined,
      nome: cnpjOK || cpfOK ? nomeExtendido : undefined
    }

    criarCobrancaRaw(jwt, extArgs, expiracao, chave, devAppkey)
      .then((response) => {
        const txid = response?.data?.txid
        const qrcode = response?.data?.textoImagemQRcode

        const txidOK = !!txid && typeof txid === 'string'
        const qrOK = !!qrcode && typeof qrcode === 'string'

        if (txidOK && qrOK) {
          Promise.all([
            QRCode.toDataURL(qrcode),
            QRCode.toString(qrcode)
          ]).then(([qrBase64, qrAscii]) => resolve({ txid, qrcode, qrBase64, qrAscii }))
            .catch(reject)
        } else {
          reject(new Error('no charge data in response'))
        }
      }).catch(reject)
  }
})

const consultarPIXRaw = (jwt: string, txid: string, devAppkey?: string) => axios({
  method: 'get',
  headers: {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  url: `https://api.hm.bb.com.br/pix/v1/cob/${txid}?gw-dev-app-key=${devAppkey || envDevAppKey}`
})

const consultarPIX = (jwt: string, txid: string, devAppkey?: string) => new Promise<{ txid: string; status: string; valor: number; documento?: string; nome?: string; descricao?: string; chave: string; validade: Date; }>((resolve, reject) => {
  consultarPIXRaw(jwt, txid, devAppkey)
    .then((response) => {
      const txid = response?.data?.txid
      const status = response?.data?.status
      const valor = Number.parseFloat(response?.data?.valor?.original)
      const documento = response?.data?.devedor?.cnpj || response?.data?.devedor?.cpf
      const nome = response?.data?.devedor?.nome
      const descricao = response?.data?.solicitacaoPagador
      const chave = response?.data?.chave
      const validade = new Date(response?.data?.calendario?.criacao)
      validade.setSeconds(validade.getSeconds() + Number.parseInt(response?.data?.calendario?.expiracao))

      const txidOK = !!txid && typeof txid === 'string'
      const statusOK = !!status && typeof status === 'string'
      const valorOK = !!valor && !Number.isNaN(valor)
      const chaveOK = !!chave && typeof chave === 'string'
      const validadeOK = !!validade && !Number.isNaN(validade.getTime())
      if (txidOK && statusOK && valorOK && chaveOK && validadeOK) {
        resolve({
          txid,
          status,
          valor,
          documento,
          nome,
          descricao,
          chave,
          validade
        })
      } else {
        reject(new Error('wrong pix data in response'))
      }
    })
    .catch(reject)
})

export {
  criarCobranca,
  consultarPIX
}
