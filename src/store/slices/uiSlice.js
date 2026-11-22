import { createSlice } from '@reduxjs/toolkit'
import { readTheme } from '@/utils/theme'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { theme: readTheme(), sidebarOpen: false, quickAddOpen: false },
  reducers: {
    setTheme(state, action) { state.theme = action.payload },
    openSidebar(state) { state.sidebarOpen = true },
    closeSidebar(state) { state.sidebarOpen = false },
    openQuickAdd(state) { state.quickAddOpen = true },
    closeQuickAdd(state) { state.quickAddOpen = false },
  },
})

export const { setTheme, openSidebar, closeSidebar, openQuickAdd, closeQuickAdd } = uiSlice.actions
export default uiSlice.reducer
