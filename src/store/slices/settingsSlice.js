import { createSlice } from '@reduxjs/toolkit'
import { DEFAULT_SETTINGS } from '@/constants'

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { values: DEFAULT_SETTINGS, loaded: false },
  reducers: {
    setSettings(state, { payload }) {
      const { currency, language, theme, dateFormat, fyStartMonth, defaultAccountId, notifications } = payload || {}
      const merged = { ...DEFAULT_SETTINGS }
      if (currency) merged.currency = currency
      if (language) merged.language = language
      if (theme) merged.theme = theme
      if (dateFormat) merged.dateFormat = dateFormat
      if (fyStartMonth) merged.fyStartMonth = fyStartMonth
      merged.defaultAccountId = defaultAccountId ?? null
      merged.notifications = { ...DEFAULT_SETTINGS.notifications, ...(notifications || {}) }
      state.values = merged
      state.loaded = true
    },
    resetSettings() { return { values: DEFAULT_SETTINGS, loaded: false } },
  },
})

export const { setSettings, resetSettings } = settingsSlice.actions
export default settingsSlice.reducer
