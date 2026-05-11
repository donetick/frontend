import { Network } from '@capacitor/network'

class NetworkManager {
  constructor() {
    this.isOnline = true
    this.isNetworkOn = null
    this.init()
    this.connectionStatusListeners = []
    this.queueSyncListeners = []
    this.lastChecked = null
    this.offlineSince = null
  }
  async init() {
    const status = await Network.getStatus()
    this.isNetworkOn = status.connected
    this.lastChecked = Date.now()

    Network.addListener('networkStatusChange', status => {
      if (this.isNetworkOn !== status.connected) {
        this.isNetworkOn = status.connected
        this.lastChecked = Date.now()
        this.isOnline = status.connected
        if (!status.connected) {
          this.offlineSince = Date.now()
        }
        this.notifyConnectionStatus()
      }
    })
  }

  setOffline() {
    if (this.isOnline === true) {
      this.isOnline = false
      this.notifyConnectionStatus()
      this.offlineSince = Date.now() // Record the time when we went offline
    }
  }
  setOnline() {
    if (this.isOnline === false) {
      this.isOnline = true
      this.notifyConnectionStatus()
    }
  }

  notifyConnectionStatus() {
    this.connectionStatusListeners.forEach(callback => {
      callback(this.isOnline)
    })
  }

  notifyBackendSync() {
    this.queueSyncListeners.forEach(callback => {
      callback()
    })
  }

  registerNetworkListener(callback) {
    this.connectionStatusListeners.push(callback)
  }
  registerBackendSyncListener(callback) {
    // if callback is not in the list already, add it
    if (!this.queueSyncListeners.includes(callback)) {
      this.queueSyncListeners.push(callback)
    }
  }
}

export const networkManager = new NetworkManager()
