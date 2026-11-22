import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'loading' },
  reducers: {
    setUser(state, { payload }) {
      state.user = payload
      state.status = payload ? 'authenticated' : 'unauthenticated'
    },
    patchUser(state, { payload }) {
      if (state.user) state.user = { ...state.user, ...payload }
    },
  },
})

export const { setUser, patchUser } = authSlice.actions
export default authSlice.reducer
