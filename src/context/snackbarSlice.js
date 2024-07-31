/** @format */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	open: false,
	message: '',
	type: 'success',
};

const snackbarSlice = createSlice({
	name: 'snackbar',
	initialState,
	reducers: {
		openSnackbar: {
			prepare(message, type) {
				return { payload: { message, type } };
			},
			reducer(state, action) {
				const { message, type } = action.payload;
				state.open = true;
				state.message = message;
				state.type = type;
			},
		},
		closeSnackbar(state) {
			state.open = false;
		},
	},
});

export const { openSnackbar, closeSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;