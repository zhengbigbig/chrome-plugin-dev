import '@types/chrome'

declare module '*.js'

declare interface Window {
  _panguMicroMate_projectPortSet: Set<string>
  _panguMicroMate_proxyFetchUrlSet: Set<string>
  _panguMicroMate_isInjected: boolean
}
