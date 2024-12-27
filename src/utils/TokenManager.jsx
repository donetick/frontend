import Cookies from 'js-cookie'
import { API_URL } from '../Config'
import { RefreshToken } from './Fetcher'

import { Preferences } from '@capacitor/preferences'

class ApiManager {
  constructor() {
    this.customServerURL = API_URL
    this.initialized = false
  }
  async init() {
    if (this.initialized) {
      return
    }
    const { value: serverURL } = await Preferences.get({
      key: 'customServerUrl',
    })

    this.customServerURL = serverURL || API_URL
    this.initialized = true
  }
  getApiURL() {
    return this.customServerURL
  }
  updateApiURL(url) {
    this.customServerURL = url
  }
}

export const apiManager = new ApiManager()

export function Fetch(url, options) {
  if (!isTokenValid()) {
    // store current location in cookie
    Cookies.set('ca_redirect', window.location.pathname)
    // Assuming you have a function isTokenValid() that checks token validity
    window.location.href = '/login' // Redirect to login page
    // return Promise.reject("Token is not valid");
  }
  if (!options) {
    options = {}
  }
  options.headers = { ...options.headers, ...HEADERS() }

  const baseURL = apiManager.getApiURL()

  const fullURL = `${baseURL}${url}`
  return fetch(fullURL, options)
}

export const HEADERS = () => {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('ca_token'),
  }
}

export const isTokenValid = () => {
  const expiration = localStorage.getItem('ca_expiration')
  const token = localStorage.getItem('ca_token')

  if (localStorage.getItem('ca_token')) {
    const now = new Date()
    const expire = new Date(expiration)
    if (now < expire) {
      if (now.getTime() + 24 * 60 * 60 * 1000 > expire.getTime()) {
        refreshAccessToken()
      }

      return true
    } else {
      localStorage.removeItem('ca_token')
      localStorage.removeItem('ca_expiration')
    }
    return false
  }
}

export const refreshAccessToken = () => {
  RefreshToken().then(res => {
    if (res.status === 200) {
      res.json().then(data => {
        localStorage.setItem('ca_token', data.token)
        localStorage.setItem('ca_expiration', data.expire)
      })
    } else {
      return res.json().then(error => {
        console.log(error)
      })
    }
  })
}
