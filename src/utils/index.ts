/**
 * 本地存储 可用chrome.storage.sync / chrome.storage.local
 */

import { PANGU_ENV, STORAGE } from './constants'

export const chromeLocalStorage = {
  get: async (key: `${PANGU_ENV}_${STORAGE}` | STORAGE) =>
    new Promise((resolve) => chrome.storage.local.get([key], (items: any) => resolve(items[key]))),
}
