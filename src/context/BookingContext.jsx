/** @format */
import { createContext, useEffect, useReducer, useState } from 'react';
import {
	makeBooking,
	updateBooking,
	deleteSchedulerBooking,
} from './../utils/apiReq';
import Pusher from 'pusher-js';
import { useAuth } from '../hooks/useAuth';

// connect to pusher for the caller id event
const pusher = new Pusher('8d1879146140a01d73cf', {
	cluster: 'eu',
});

// subscribing to a channel for caller id
const channel = pusher.subscribe('my-channel');

const BookingContext = createContext();

const formatDate = (dateStr) => {
	const date = new Date(dateStr);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(date.getDate()).padStart(2, '0')}T${String(
		date.getHours()
	).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const initState = [
	{
		returnBooking: false,
		bookedByName: '',
		PickupAddress: '',
		PickupPostCode: '',
		DestinationAddress: '',
		DestinationPostCode: '',
		PickupDateTime: formatDate(new Date()),
		returnTime: '',
		isReturn: false,
		vias: [],
		Passengers: 1,
		hours: 0,
		minutes: 20,
		durationText: '20',
		isAllDay: false,
		PassengerName: '',
		PhoneNumber: '',
		Email: '',
		repeatBooking: false,
		recurrenceRule: '',
		frequency: 'none',
		repeatEnd: 'never',
		repeatEndValue: '',
		details: '',
		Price: 0,
		scope: 0,
		chargeFromBase: false,
		paymentStatus: 0,
		driver: {},
		accountNumber: 0,
		priceAccount: 0,
		userId: '',
		formBusy: false,
	},
];

function reducer(state, action) {
	switch (action.type) {
		case 'updateValue':
			return state.map((item, id) =>
				id === action.payload.itemIndex
					? { ...item, [action.payload.property]: action.payload.value }
					: item
			);
		case 'addData':
			return [...state, action.payload];
		case 'updateVia':
			return state.map((item, index) => {
				if (index === action.payload.itemIndex) {
					const updatedVias = item.vias.map((via, viaIndex) =>
						viaIndex === action.payload.viaIndex
							? { ...via, [action.payload.property]: action.payload.value }
							: via
					);
					return { ...item, vias: updatedVias };
				}
				return item;
			});
		case 'addVia':
			return state.map((item, index) => {
				if (index === action.payload.itemIndex) {
					const newVia = {
						address: action.payload.property,
						postCode: action.payload.property,
						id: item.vias.length,
					};
					return { ...item, vias: [...item.vias, newVia] };
				}
				return item;
			});
		case 'endBooking':
			return action.payload.itemIndex === 0
				? state.map((item, idx) => (idx === 0 ? initState[0] : item))
				: state.filter((item, index) => index !== action.payload.itemIndex);
		default:
			throw new Error('invalid type');
	}
}

function BookingProvider({ children }) {
	const { currentUser } = useAuth();
	const [data, dispacher] = useReducer(reducer, initState);
	const [callerId, setCallerId] = useState([]);
	const [activeTab, setActiveTab] = useState(0);
	const isCurrentTabActive = data[activeTab]?.formBusy;

	function updateValue(itemIndex, property, value) {
		dispacher({ type: 'updateValue', payload: { itemIndex, value, property } });
		if (property !== 'updatedByName' && property !== 'bookedByName') {
			dispacher({
				type: 'updateValue',
				payload: { itemIndex, value: true, property: 'formBusy' },
			});
		}
	}

	function insertData(data) {
		dispacher({ type: 'addData', payload: data });
	}

	function addVia(itemIndex, property, value) {
		dispacher({ type: 'addVia', payload: { itemIndex, property, value } });
	}

	async function onBooking(itemIndex) {
		const targetBooking = data[itemIndex];
		const res = await makeBooking(targetBooking);
		if (res.status === 'success') {
			dispacher({ type: 'endBooking', payload: { itemIndex } });
			setActiveTab(data.length !== 1 ? data.length - 2 : 0);
			return { status: 'success' };
		} else {
			return { status: 'error', message: res.message };
		}
	}

	async function onUpdateBooking(itemIndex) {
		const targetBooking = data[itemIndex];
		const res = await updateBooking(targetBooking);
		if (res.status === 'success') {
			dispacher({ type: 'endBooking', payload: { itemIndex } });
			setActiveTab(data.length !== 1 ? data.length - 2 : 0);
			return { status: 'success' };
		} else {
			return { status: 'error', message: res.message };
		}
	}

	async function deleteBooking(itemIndex) {
		dispacher({ type: 'endBooking', payload: { itemIndex } });
		setActiveTab(data.length === 1 ? 0 : data.length - 2);
	}

	// this is the caller id use effect it will trigger dialog box when the caller id is received
	useEffect(() => {
		if (currentUser && !currentUser.isAdmin) return;
		function handleBind(data) {
			try {
				const parsedData = JSON.parse(data.message);
				if (
					parsedData.Current.length === 0 &&
					parsedData.Previous.length === 0
				) {
					insertData({ ...initState[0], PhoneNumber: parsedData.Telephone });
				} else {
					console.log(parsedData);
					setCallerId((prev) => [...prev, parsedData]);
				}
			} catch (error) {
				console.error('Failed to parse message data:', error);
			}
		}
		channel.bind('my-event', handleBind);
		return () => {
			channel.unbind('my-event', handleBind);
		};
	}, [currentUser]);

	function onRemoveCaller() {
		const filteredCaller = callerId.filter((_, idx) => idx !== 0);
		setCallerId(filteredCaller);
		// setActiveTab(data.length === 1 ? 0 : data.length - 2);
	}

	async function onDeleteBooking(bookingId) {
		const res = await deleteSchedulerBooking({
			bookingId,
			cancelledByName: currentUser.fullName,
			actionByUserId: currentUser.id,
		});
		return res;
	}

	// this use effect will refresh the booking every single minute
	// useEffect(() => {
	// 	const refreshData = setInterval(getBookingData, 1000 * 60);
	// 	return () => {
	// 		clearInterval(refreshData);
	// 	};
	// }, []);

	return (
		<BookingContext.Provider
			value={{
				data,
				callerId,
				onRemoveCaller,
				updateValue,
				onBooking,
				deleteBooking,
				insertData,
				callerTab: data,
				onUpdateBooking,
				addVia,
				onDeleteBooking,
				activeTab,
				onActiveTabChange: setActiveTab,
				isCurrentTabActive,
			}}
		>
			{children}
		</BookingContext.Provider>
	);
}

export { BookingProvider, BookingContext };
