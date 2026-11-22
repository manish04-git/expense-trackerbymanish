import { configureStore } from '@reduxjs/toolkit'
import ui from '@/store/slices/uiSlice'
import auth from '@/store/slices/authSlice'
import settings from '@/store/slices/settingsSlice'
import data from '@/store/slices/dataSlice'

export const store = configureStore({
  reducer: { ui, auth, settings, data },
})
