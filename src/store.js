/** @format */
import { configureStore } from '@reduxjs/toolkit';

import bookingFormReducer from './context/bookingSlice';
import caller from './context/callerSlice';
import snackbarReducer from './context/snackbarSlice';
import schedulerReducer from './context/schedulerSlice';
import bookingLogsReducer from './context/BookingLogSlice';
import coaEntryReducer from './context/coaEntrysSlice';
import notificationReducer from './context/notificationSlice';

const store = configureStore({
	reducer: {
		bookingForm: bookingFormReducer,
		caller,
		snackbar: snackbarReducer,
		scheduler: schedulerReducer,
		logs: bookingLogsReducer,
		coaEntry: coaEntryReducer,
		notification: notificationReducer,
	},
});

export default store;
