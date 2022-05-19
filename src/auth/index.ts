import axios from 'axios'
import qs from 'qs'

const envBasicAuthorization = process.env.basic_authorization || ''
const dothomo = process.env.NODE_ENV === 'production' ? '' : '.hm'

const gerarTokenRaw = (basic?: string) => axios({
  method: 'post',
  url: `https://oauth${dothomo}.bb.com.br/oauth/token`,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: basic || envBasicAuthorization
  },
  data: qs.stringify({
    grant_type: 'client_credentials',
    scope: 'cob.read cob.write pix.read pix.write'
  })
})

const gerarToken = (basic?: string) => new Promise<string>((resolve, reject) => {
  gerarTokenRaw(basic)
    .then(response => {
      const token = response?.data?.access_token
      if (token && typeof token === 'string') {
        resolve(token)
      } else {
        reject(new Error('no access_token in the response'))
      }
    }).catch(reject)
})

let greenTokenP: Promise<string>
let gootAt = -Infinity
let isGoing = false

const greenToken = (basic?: string, errorMargin = 20_000) => new Promise<string>((resolve) => {
  const isExpired = Date.now() > gootAt

  if (isExpired && !isGoing) {
    isGoing = true
    const startTime = Date.now()

    greenTokenP = gerarTokenRaw(basic)
      .then(response => {
        const token = response?.data?.access_token
        const expires = response?.data?.expires_in // Seconds

        const tkOK = !!token && typeof token === 'string'
        const exOK = !!expires && typeof expires === 'number'
        if (tkOK && exOK) {
          isGoing = false
          gootAt = startTime - errorMargin + expires * 1000
          return token
        } else {
          throw new Error('bad oauth token')
        }
      })
  }

  greenTokenP.then(resolve)
})

let intervalId: ReturnType<typeof setInterval>
const preGreen = (turnOn: boolean, basic?: string, errorMargin = 20_000, interval = 540_000) => {
  if (turnOn && !intervalId) {
    intervalId = setInterval(() => {
      const startTime = Date.now()
      gerarTokenRaw(basic)
        .then(response => {
          const token = response?.data?.access_token
          const expires = response?.data?.expires_in // Seconds

          const tkOK = !!token && typeof token === 'string'
          const exOK = !!expires && typeof expires === 'number'
          if (tkOK && exOK) {
            gootAt = startTime - errorMargin + expires * 1000
            greenTokenP = Promise.resolve(token)
          }
        })
    }, interval)
  } else {
    clearInterval(intervalId)
  }
}

export {
  gerarToken,
  greenToken,
  preGreen
}
