import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UserData {
  accessToken: string;
  _id:string;
  name: string;
  email: string;
  username: string;
}

interface UserState {
  user: UserData | null;
}

const initialState: UserState = {
  user: null
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserData>) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    }
  }
})

export const { setUser, clearUser } = userSlice.actions;
export type { UserData };
export default userSlice.reducer;