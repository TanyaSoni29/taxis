/** @format */
// all External Libraries and Components are imports
import { Button, Switch, TextField, useMediaQuery } from '@mui/material';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import { useEffect, useState, Fragment, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isValidDate } from '../utils/isValidDate';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

// Context And Hooks imports for data flow and management
import {
	onSendQuoteBooking,
	removeBooking,
	setBookingQuote,
	updateValue,
	updateValueSilentMode,
} from '../context/bookingSlice';
import { useAuth } from './../hooks/useAuth';
import {
	makeBookingQuoteRequest,
	fireCallerEvent,
	deleteSchedulerBooking,
	getAccountList,
	getDuration,
	getQuoteHvsDriver,
} from '../utils/apiReq';

// All local component utilitys
import Autocomplete from '../components/AutoComplete';
import Modal from '../components/Modal';
import SimpleSnackbar from '../components/Snackbar-v2';
import GoogleAutoComplete from '../components/GoogleAutoComplete';
import GoogleAutoComplete2 from '../components/GoogleAutoComplete2';
import LongButton from '../components/BookingForm/LongButton';

// All Modals and dialogs for the booking form
import RepeatBooking from '../components/BookingForm/RepeatBooking';
import AddAndEditVia from '../components/BookingForm/AddAndEditVia';
import ListDrivers from '../components/BookingForm/ListDrivers';
import QuoteDialog from '../components/BookingForm/QuoteDialog';
import { addCallerToLookup } from '../context/callerSlice';
import { convertKeysToFirstUpper } from '../utils/casingConverter';
import Loader from '../components/Loader';
import { formatDate } from '../utils/formatDate';
import { openSnackbar } from '../context/snackbarSlice';
import {
	changeActiveDate,
	getRefreshedBookings,
	setDateControl,
} from '../context/schedulerSlice';
import SendQuoteModal from '../components/CustomDialogButtons/SendQuoteModal';
import WarningModal from '../components/BookingForm/WarningModal';

function Booking({ bookingData, id, onBookingUpload }) {
	// All Hooks and Contexts for the data flow and management
	const { currentUser, isAuth } = useAuth();

	const dispatch = useDispatch();
	const callerId = useSelector((state) => state.caller);
	const { isGoogleApiOn, isBookingOpenInEditMode } = useSelector(
		(state) => state.bookingForm
	);
	const { dateControl } = useSelector((state) => state.scheduler);

	// All Local States and Hooks for ui and fligs
	const [isAddVIAOpen, setIsAddVIAOpen] = useState(false);
	const [arriveByFlag, setArriveByFlag] = useState(false);
	const [isRepeatBookingModelActive, setIsRepeatBookingModelActive] =
		useState(false);
	const [isDriverModalActive, setDriverModalActive] = useState(false);
	const [confirmCoaModal, setConfirmCoaModal] = useState(false);
	const [accountDetails, setAccountDetails] = useState([]);
	const pickupRef = useRef(null);
	const destinationRef = useRef(null);
	const userNameRef = useRef(null);
	const phoneNumberRef = useRef(null);
	const pickupDateTimeRef = useRef(null);
	const [isQuoteDialogActive, setIsQuoteDialogActive] = useState(false);
	const [isSendQuoteActive, setIsSendQuoteActive] = useState(false);
	const [quote, setQuote] = useState(null);
	const [formSubmitLoading, setFormSubmitLoading] = useState(false);
	const [isWarningOpen, setIsWarningOpen] = useState(false);
	const [warningCallback, setWarningCallback] = useState(() => () => {});
	const isMobile = useMediaQuery('(max-width:640px)');
	// working for 🔁 button basically toggles between pickup and destination addresses
	function toggleAddress() {
		updateData('destinationAddress', bookingData.pickupAddress);
		updateData('destinationPostCode', bookingData.pickupPostCode);
		updateData('pickupAddress', bookingData.destinationAddress);
		updateData('pickupPostCode', bookingData.destinationPostCode);
	}

	// Submit the form data to the Puser Component
	async function handleSubmit(e) {
		e.preventDefault();

		if (bookingData.returnDateTime) {
			const pickup = new Date(bookingData.pickupDateTime).getTime();
			const returnTime = new Date(bookingData.returnDateTime).getTime();

			if (returnTime < pickup) {
				dispatch(openSnackbar('Return time must be after pickup', 'error'));
				pickupDateTimeRef.current.focus();
				pickupDateTimeRef.current.select();
				return;
			}
		}

		// const { hours, minutes } = bookingData;
		const hours = Number(bookingData.hours);
		const minutes = Number(bookingData.minutes);

		if (
			hours < 0 ||
			hours > 100 ||
			isNaN(hours) ||
			minutes < 0 ||
			minutes > 59 ||
			isNaN(minutes)
		) {
			dispatch(openSnackbar('Invalid duration range', 'error'));
			return;
		}

		updateData('durationMinutes', hours * 60 + minutes);

		const passengerNameCount = bookingData?.passengerName?.split(',')?.length;
		const passengers = bookingData?.passengers;

		if (
			bookingData.scope === 1 &&
			(bookingData.accountNumber === 9014 ||
				bookingData.accountNumber === 10026) &&
			passengerNameCount !== Number(passengers)
		) {
			dispatch(
				openSnackbar(
					'Booking does not specify the correct number of passengers',
					'error'
				)
			);
			return;
		}

		if (
			bookingData.scope === 1 &&
			(bookingData.accountNumber === 9014 ||
				bookingData.accountNumber === 10026) &&
			passengerNameCount !== bookingData.vias.length + 1
		) {
			const confirmed = await new Promise((resolve) => {
				setWarningCallback(() => resolve);
				setIsWarningOpen(true);
			});

			if (!confirmed) return;
		}

		setFormSubmitLoading(true);
		await onBookingUpload(id);
		setFormSubmitLoading(false);
	}

	// Abstract way to call the updateValue redux function setting the ID
	function updateData(property, val) {
		dispatch(updateValue(id, property, val));
	}

	// This Function sets the pickup address and postcode by location data used in autocomplete
	function handleAddPickup(location) {
		updateData('pickupAddress', location.address);
		updateData('pickupPostCode', location.postcode);
	}

	// This Function sets the destination address and postcode by location data used in autocomplete
	function handleAddDestination(location) {
		updateData('destinationAddress', location.address);
		updateData('destinationPostCode', location.postcode);
	}

	// This Function adds the driver to the booking form
	function addDriverToBooking(driverId) {
		setDriverModalActive(false);
		updateData('userId', driverId);
	}

	// This Function gets the quote and set the value to the booking form
	async function findQuote() {
		const quote = await makeBookingQuoteRequest({
			pickupPostcode: bookingData.pickupPostCode,
			viaPostcodes: bookingData.vias.map((via) => via.postCode),
			destinationPostcode: bookingData.destinationPostCode,
			pickupDateTime: bookingData.pickupDateTime,
			passengers: bookingData.passengers,
			priceFromBase: bookingData.chargeFromBase,
		});
		if (quote.status === 'success') {
			updateData('price', +quote.totalPrice);
			updateData('durationText', String(quote.totalMinutes));
			updateData('quoteOptions', quote);
			setIsQuoteDialogActive(true);
			setQuote(quote);
		} else {
			setQuote(null);
			dispatch(openSnackbar('Failed to get quote', 'error'));
		}
	}

	// This Function cancels the booking form
	function deleteForm() {
		dispatch(removeBooking(id));
		dispatch(setBookingQuote(null));
	}

	async function handleFireCallerEvent() {
		const data = await fireCallerEvent(bookingData.phoneNumber);
		if (data.status === 'success') {
			if (data.current.length || data.previous.length) {
				dispatch(addCallerToLookup(convertKeysToFirstUpper(data)));
				pickupRef.current.focus();
				pickupRef.current.select();
			} else {
				dispatch(openSnackbar('No caller found', 'info'));
			}
		}
	}

	function handleChangeFocus(event, ref) {
		if (event.key === 'Enter') {
			ref.current.focus();
			ref.current.select();
		}
	}

	function handleClick(event, ref) {
		ref.current.focus();
		// ref.current.select();
	}

	async function calculatePickup() {
		if (!bookingData.arriveBy) {
			console.error('arriveBy is missing');
			return;
		}

		// Make the booking quote request
		const quote = await getDuration({
			pickupPostcode: bookingData.pickupPostCode,
			destinationPostcode: bookingData.destinationPostCode,
			pickupDate: bookingData.arriveBy, // Initially pass arriveBy time
		});

		if (quote.status === 200) {
			let totalDuration = quote?.data; // Duration in minutes

			if (!totalDuration) {
				console.error('Total duration is missing in quote response');
				return;
			}

			totalDuration += 5; // Add 5 minutes buffer

			// Convert arriveBy (ISO 8601 format) to Date object
			const arriveByDate = new Date(bookingData.arriveBy);

			// Subtract totalDuration (converted from minutes to milliseconds)
			const pickupDate = new Date(
				arriveByDate.getTime() - totalDuration * 60000
			);

			if (isNaN(pickupDate.getTime())) {
				console.error('Invalid calculated pickup date:', pickupDate);
				return;
			}

			// const isoPickupDate = pickupDate.toISOString().slice(0, 16);

			// const localPickupDate = pickupDate
			// 	.toLocaleString('en-GB', {
			// 		year: 'numeric',
			// 		month: '2-digit',
			// 		day: '2-digit',
			// 		hour: '2-digit',
			// 		minute: '2-digit',
			// 		hour12: false,
			// 	})
			// 	.replace(',', ''); // Removes the comma for clean formatting

			// console.log(
			// 	'ISO Pickup Time:',
			// 	isoPickupDate,
			// 	bookingData.pickupDateTime
			// );
			// console.log('Local Pickup Time (Display):', localPickupDate);

			// Update state with both values
			dispatch(
				updateValueSilentMode(id, 'pickupDateTime', formatDate(pickupDate))
			);
		}
	}

	useEffect(() => {
		async function getAccountListDetails() {
			try {
				const response = await getAccountList();
				setAccountDetails(response);
			} catch (error) {
				console.log(error);
			}
		}

		getAccountListDetails();
	}, []);

	// auto calculate the quotes based on Pickup and destination
	useEffect(() => {
		if (
			!bookingData.pickupPostCode ||
			(!bookingData.destinationPostCode && bookingData.vias.length === 0) ||
			bookingData.scope !== 0
		)
			return;

		if (!bookingData.formBusy) return;
		makeBookingQuoteRequest({
			pickupPostcode: bookingData.pickupPostCode,
			viaPostcodes: bookingData.vias.map((via) => via.postCode),
			destinationPostcode: bookingData.destinationPostCode,
			pickupDateTime: bookingData.pickupDateTime,
			passengers: bookingData.passengers,
			priceFromBase: bookingData.chargeFromBase,
		}).then((quote) => {
			if (quote.status === 'success') {
				if (!bookingData?.manuallyPriced) {
					dispatch(updateValueSilentMode(id, 'price', +quote.totalPrice));
				}
				dispatch(updateValueSilentMode(id, 'quoteOptions', quote));
				dispatch(
					updateValueSilentMode(id, 'durationText', String(quote.totalMinutes))
				);
				dispatch(
					updateValueSilentMode(
						id,
						'hours',
						Math.floor(quote.totalMinutes / 60)
					)
				);
				dispatch(updateValueSilentMode(id, 'minutes', quote.totalMinutes % 60));
			} else {
				// setQuote(null);
				updateData('price', '');
				dispatch(openSnackbar('Failed to get quote', 'error'));
			}
		});
	}, [
		bookingData.pickupPostCode,
		bookingData.destinationPostCode,
		bookingData.postcode,
		bookingData.chargeFromBase,
		bookingData.vias,
		bookingData.pickupDateTime,
		bookingData.passengers,
		bookingData.scope,
		bookingData.manuallyPriced,
		dispatch,
		id,
	]);

	// This Function sets the END key functionality
	useEffect(() => {
		const handleKeyPress = (event) => {
			if (event.key === 'End') {
				document.getElementById('myForm').requestSubmit();
			}
			if (event.key === 'Enter') event.preventDefault();
		};

		window.addEventListener('keydown', handleKeyPress);

		return () => {
			window.removeEventListener('keydown', handleKeyPress);
		};
	}, []);

	// This Function sets the user name to the booking form
	useEffect(() => {
		if (!isAuth) return;
		if (currentUser && !currentUser?.fullName) return;
		if (bookingData.bookingType === 'current') {
			dispatch(
				updateValueSilentMode(id, 'updatedByName', currentUser?.fullName)
			);
		} else {
			dispatch(
				updateValueSilentMode(id, 'bookedByName', currentUser?.fullName)
			);
		}
	}, [isAuth, currentUser, bookingData.bookingType, dispatch, id]);

	// Set the snackbar for caller event
	useEffect(() => {
		if (callerId.length > 0 && bookingData.formBusy) {
			dispatch(openSnackbar(`${callerId.length} Caller Waiting`, 'error'));
		}
	}, [callerId.length, bookingData.formBusy, dispatch]);

	// Focus on the input field based on the booking type
	useEffect(() => {
		if (bookingData.formBusy) return;
		if (bookingData.bookingType === 'previous') {
			destinationRef.current.focus();
			destinationRef.current.select();
		} else {
			if (isBookingOpenInEditMode) {
				pickupRef.current.focus(); // only focus apply in case of edit
			} else {
				pickupRef.current.focus(); // other case will have focus and select All
				pickupRef.current.select();
			}
		}
	}, [
		bookingData.pickupAddress,
		bookingData.bookingType,
		bookingData.formBusy,
		isBookingOpenInEditMode,
	]);

	// update the time of the form if form is not busy every 30 sec
	useEffect(() => {
		function updateToCurrentTime() {
			if (bookingData.formBusy) {
				clearInterval(updateTimeInterval);
				return;
			}
			const dateFromControl = new Date(dateControl);

			// Get the current time
			const now = new Date();

			// Merge the date from dateControl and the time from now
			dateFromControl.setHours(now.getHours(), now.getMinutes(), 0, 0);
			const newDateTime = formatDate(dateFromControl);
			// Dispatch the updated pickupDateTime
			if (newDateTime !== bookingData.pickupDateTime) {
				dispatch(updateValueSilentMode(id, 'pickupDateTime', newDateTime));
			}
		}
		if (bookingData.bookingType === 'Current') return;
		const updateTimeInterval = setInterval(updateToCurrentTime, 1000);
		return () => clearInterval(updateTimeInterval);
	}, [
		dispatch,
		bookingData.pickupDateTime,
		id,
		bookingData.formBusy,
		bookingData.bookingType,
		dateControl,
	]);

	useEffect(() => {
		function getDateWithZeroTime(input) {
			const date = new Date(input);

			// Set hours, minutes, seconds, and milliseconds to 00
			date.setHours(0, 0, 0, 0);

			return date;
		}

		if (bookingData.pickupDateTime) {
			const date = new Date(
				getDateWithZeroTime(bookingData.pickupDateTime)
			).toISOString();
			if (bookingData.formBusy) {
				dispatch(changeActiveDate(date));
				dispatch(setDateControl(bookingData.pickupDateTime));
			}
		}
	}, [bookingData.formBusy, bookingData.pickupDateTime, dispatch]);


	useEffect(() => {
		if (bookingData.formBusy) return;
		dispatch(
			updateValueSilentMode(
				id,
				'hours',
				Math.floor(bookingData.durationMinutes / 60)
			)
		);
		dispatch(
			updateValueSilentMode(
				id,
				'minutes',
				Math.floor(bookingData.durationMinutes % 60)
			)
		);
	}, [bookingData.durationMinutes, id, dispatch, bookingData.formBusy]);

	function convertToOneHourLaterFromPickUp() {
		const pickupDateTime = new Date(bookingData.pickupDateTime);
		const oneHourLater = new Date(
			pickupDateTime.getTime() + 1 * 60 * 60 * 1000
		);
		return formatDate(oneHourLater);
	}

	async function handleCoaButton() {
		try {
			if (bookingData?.bookingId) {
				const reqData = {
					bookingId: bookingData?.bookingId,
					cancelledByName: currentUser?.fullName,
					actionByUserId: currentUser?.id,
					cancelBlock: false,
					cancelledOnArrival: true,
				};

				const data = await deleteSchedulerBooking(reqData);
				if (data.status === 'success') {
					dispatch(openSnackbar('COA done successfully', 'success'));
					setConfirmCoaModal(false);
					getRefreshedBookings();
				}
			}
		} catch (error) {
			console.log(error);
		}
	}

	async function handleSendQuoteModal(selectedOptions) {
		try {
			await dispatch(onSendQuoteBooking(id, selectedOptions));
			dispatch(openSnackbar('Quote Sent Successfully', 'success'));
		} catch (error) {
			console.log(error);
		}
	}

	const hvsDriverQuote = useCallback(async () => {
		try {
			if (!bookingData.pickupPostCode || !bookingData.destinationPostCode)
				return;

			const payload = {
				pickupPostcode: bookingData.pickupPostCode,
				viaPostcodes: bookingData.vias.map((via) => via.postCode),
				destinationPostcode: bookingData.destinationPostCode,
				pickupDateTime: bookingData.pickupDateTime,
				passengers: bookingData.passengers,
				priceFromBase: bookingData.chargeFromBase,
			};

			const response = await getQuoteHvsDriver(payload);

			if (response.status === 'success') {
				updateData('price', response?.totalPrice.toFixed(2));
			}
		} catch (error) {
			console.log(error);
			dispatch(openSnackbar('Unable to fetch Driver Price', 'error'));
		}
	}, [
		bookingData.chargeFromBase,
		bookingData.destinationPostCode,
		bookingData.passengers,
		bookingData.pickupDateTime,
		bookingData.pickupPostCode,
		bookingData.vias,
		dispatch,
		updateData,
	]);

	useEffect(() => {
		if (
			bookingData.scope === 1 &&
			(bookingData.accountNumber === 9014 ||
				bookingData.accountNumber === 10026)
		) {
			hvsDriverQuote();
		}
	}, [bookingData.scope, bookingData.accountNumber, hvsDriverQuote]);

	if (!bookingData) return null;

	return (
		<div className='bg-background text-foreground p-3 m-auto'>
			<form
				autoComplete='off'
				id='myForm'
				action=''
				onSubmit={handleSubmit}
			>
				<>
					{formSubmitLoading && <Loader />}
					<Modal
						open={isRepeatBookingModelActive}
						setOpen={setIsRepeatBookingModelActive}
					>
						<RepeatBooking onSet={setIsRepeatBookingModelActive} />
					</Modal>
					<Modal
						open={isDriverModalActive}
						setOpen={setDriverModalActive}
					>
						<ListDrivers
							onSet={addDriverToBooking}
							setOpen={setDriverModalActive}
						/>
					</Modal>
					<Modal
						open={isAddVIAOpen}
						setOpen={setIsAddVIAOpen}
					>
						<AddAndEditVia onSet={setIsAddVIAOpen} />
					</Modal>
					<Modal
						open={isQuoteDialogActive}
						setOpen={setIsQuoteDialogActive}
					>
						<QuoteDialog
							onSet={setIsQuoteDialogActive}
							id={id}
							quote={quote}
						/>
					</Modal>
					<Modal
						open={confirmCoaModal}
						setOpen={setConfirmCoaModal}
					>
						<ConfirmCOA
							onClick={handleCoaButton}
							setConfirmCoaModal={setConfirmCoaModal}
						/>
					</Modal>
					<Modal
						open={isSendQuoteActive}
						setOpen={setIsSendQuoteActive}
					>
						<SendQuoteModal
							onclick={handleSendQuoteModal}
							setIsSendQuoteActive={setIsSendQuoteActive}
						/>
					</Modal>
					<SimpleSnackbar />
					<Modal
						open={isWarningOpen}
						setOpen={setIsWarningOpen}
					>
						<WarningModal
							setIsWarningOpen={setIsWarningOpen}
							resolve={warningCallback}
						/>
					</Modal>
				</>
				<div className='max-w-3xl mx-auto bg-card pb-4 px-4 rounded-lg shadow-lg mb-20 sm:mb-0'>
					<div className='flex items-center justify-between mb-4'>
						<div className='flex gap-5 flex-col md:flex-row'>
							<input
								required
								type='datetime-local'
								className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
								value={bookingData.pickupDateTime}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										pickupRef.current.focus();
										pickupRef.current.select();
									}
								}}
								onChange={(e) => {
									if (!isValidDate(e.target.value)) return;
									updateData('pickupDateTime', e.target.value);
									if (arriveByFlag) updateData('arriveBy', e.target.value);
									return e.target.value;
								}}
							/>

							{bookingData.returnBooking ? (
								<input
									disabled={bookingData.returnBooking ? false : true}
									required
									type='datetime-local'
									value={bookingData.returnDateTime}
									onChange={(e) => updateData('returnDateTime', e.target.value)}
									ref={pickupDateTimeRef}
									className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
								/>
							) : null}
							<div className='flex justify-center items-center'>
								<span
									className={`${
										bookingData.isASAP ? 'text-[#228B22]' : ''
									} mr-2`}
								>
									ASAP
								</span>
								<Switch
									sx={{
										'& .MuiSwitch-switchBase.Mui-checked': {
											color: '#228B22', // Thumb color
										},
										'& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
											backgroundColor: '#228B22', // Track color
										},
									}}
									checked={bookingData.isASAP}
									onChange={() => {
										if (!bookingData.isASAP) {
											// Calculate new pickupDateTime
											const currentDateTime = new Date(
												bookingData.pickupDateTime
											);
											currentDateTime.setMinutes(
												currentDateTime.getMinutes() + 5
											);
											const newPickupDateTime = formatDate(currentDateTime);

											// Update isASAP and pickupDateTime
											updateData('isASAP', true); // Set isASAP to true
											updateData('pickupDateTime', newPickupDateTime); // Update pickupDateTime
										} else {
											// Simply toggle off isASAP without updating pickupDateTime
											updateData('isASAP', false);
										}
									}}
								/>
							</div>
						</div>
						<div className='flex gap-5 flex-col md:flex-row justify-between items-center align-middle'>
							<div className='bg-red-700 hover:bg-opacity-80 rounded-lg flex  text-white'>
								<button
									type='button'
									className='px-3 py-2'
									onClick={() => setIsRepeatBookingModelActive(true)}
								>
									Repeat Booking
								</button>
							</div>
							<div>
								<span className='mr-2'>Return</span>
								<Switch
									color='error'
									checked={bookingData.returnBooking}
									onClick={() => {
										!bookingData.returnBooking
											? updateData(
													'returnDateTime',
													convertToOneHourLaterFromPickUp()
													// eslint-disable-next-line no-mixed-spaces-and-tabs
											  )
											: updateData('returnDateTime', null);
										updateData('returnBooking', !bookingData.returnBooking);
									}}
								/>
							</div>
							<></>
						</div>
					</div>
					{/* Google AutoSuggestion 1 */}

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-2'>
						{isGoogleApiOn ? (
							<GoogleAutoComplete
								placeholder='Pickup Address'
								value={bookingData.pickupAddress}
								onPushChange={handleAddPickup}
								onChange={(e) => {
									const addressValue = e.target.value;
									updateData('pickupAddress', addressValue);

									// Clear pickupPostCode if pickupAddress is empty
									if (!addressValue) {
										updateData('pickupPostCode', '');
									}
								}}
								inputRef={pickupRef}
								handleChangeRef={(e) => handleChangeFocus(e, destinationRef)}
								handleClickRef={
									isMobile ? null : (e) => handleClick(e, pickupRef)
								}
							/>
						) : (
							<GoogleAutoComplete2
								placeholder='Pickup Address'
								value={bookingData.pickupAddress}
								onPushChange={handleAddPickup}
								onChange={(e) => {
									const addressValue = e.target.value;
									updateData('pickupAddress', addressValue);

									// Clear pickupPostCode if pickupAddress is empty
									if (!addressValue) {
										updateData('pickupPostCode', '');
									}
								}}
								inputRef={pickupRef}
								handleChangeRef={(e) => handleChangeFocus(e, destinationRef)}
								handleClickRef={
									isMobile ? null : (e) => handleClick(e, pickupRef)
								}
							/>
						)}
						<Autocomplete
							type='postal'
							required={false}
							placeholder='Post Code'
							value={bookingData.pickupPostCode}
							onPushChange={handleAddPickup}
							onChange={(e) => updateData('pickupPostCode', e.target.value)}
						/>
					</div>
					{/* Toogle Button Start*/}
					<div className='flex justify-center mb-2'>
						<button
							type='button'
							onClick={toggleAddress}
						>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								viewBox='0 0 24 24'
								fill='currentColor'
								aria-hidden='true'
								className='h-6 w-6 text-red-600 mx-auto'
							>
								<path
									fillRule='evenodd'
									d='M6.97 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06L8.25 4.81V16.5a.75.75 0 01-1.5 0V4.81L3.53 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zm9.53 4.28a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V7.5a.75.75 0 01.75-.75z'
									clipRule='evenodd'
								></path>
							</svg>
						</button>
					</div>
					{/* Toogle Button Ends */}

					{/* Google AutoSuggestion 2 */}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-2'>
						{isGoogleApiOn ? (
							<GoogleAutoComplete
								placeholder='Destination Address'
								value={bookingData.destinationAddress}
								onPushChange={handleAddDestination}
								onChange={(e) => {
									const addressValue = e.target.value;
									updateData('destinationAddress', addressValue);

									if (!addressValue) {
										updateData('destinationPostCode', '');
									}
								}}
								inputRef={destinationRef}
								handleChangeRef={(e) => handleChangeFocus(e, userNameRef)}
								handleClickRef={
									isMobile ? null : (e) => handleClick(e, destinationRef)
								}
							/>
						) : (
							<GoogleAutoComplete2
								placeholder='Destination Address'
								value={bookingData.destinationAddress}
								onPushChange={handleAddDestination}
								onChange={(e) => {
									const addressValue = e.target.value;
									updateData('destinationAddress', addressValue);

									if (!addressValue) {
										updateData('destinationPostCode', '');
									}
								}}
								inputRef={destinationRef}
								handleChangeRef={(e) => handleChangeFocus(e, userNameRef)}
								handleClickRef={
									isMobile ? null : (e) => handleClick(e, destinationRef)
								}
							/>
						)}
						<Autocomplete
							required={false}
							type='postal'
							placeholder='Post Code'
							value={bookingData.destinationPostCode}
							onPushChange={handleAddDestination}
							onChange={(e) =>
								updateData('destinationPostCode', e.target.value)
							}
						/>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-2'>
						<textarea
							placeholder='Booking Details'
							className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
							value={bookingData.details}
							onChange={(e) => updateData('details', e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									const newValue = bookingData.details + '\n';
									updateData('details', newValue);
								}
							}}
						></textarea>
						<div className='flex-col justify-center items-center'>
							<div className='flex justify-start items-center mb-2'>
								<span
									className={`${
										bookingData.isASAP ? 'text-[#228B22]' : ''
									} mr-2`}
								>
									Arrive By
								</span>
								<Switch
									sx={{
										'& .MuiSwitch-switchBase.Mui-checked': {
											color: '#228B22', // Thumb color
										},
										'& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
											backgroundColor: '#228B22', // Track color
										},
									}}
									checked={arriveByFlag}
									onChange={() => {
										setArriveByFlag((prev) => {
											const newFlag = !prev;
											if (!newFlag) {
												updateData('arriveBy', null); // Set arriveBy to null when switching off
											} else {
												updateData(
													'arriveBy',
													formatDate(new Date(bookingData?.pickupDateTime))
												);
											}
											return newFlag;
										});
									}}
								/>

								<div
									className='px-3 bg-red-700 hover:bg-opacity-80 rounded-lg flex cursor-pointer'
									onClick={calculatePickup}
								>
									<span
										color='error'
										className='text-white flex gap-2 px-3 py-2'
										type='button'
									>
										<span>Calculate Pickup</span>
									</span>
								</div>
							</div>

							<input
								required
								type='datetime-local'
								className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
								value={bookingData?.arriveBy || ''}
								disabled={!arriveByFlag}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										pickupRef.current.focus();
										pickupRef.current.select();
									}
								}}
								onChange={(e) => {
									if (!isValidDate(e.target.value)) return;
									updateData('arriveBy', e.target.value);
									if (e.inputType === 'insertText') e.target.blur();
									return e.target.value;
								}}
							/>
						</div>
					</div>

					<div className='mb-4'>
						<LongButton onClick={() => setIsAddVIAOpen(true)}>
							Add VIA
						</LongButton>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-5 sm:place-content-center place-content-start gap-4 mb-4 '>
						<div className='flex sm:items-center items-start gap-2'>
							{/* <span>£</span> */}
							<Input
								type='number'
								required={true}
								placeholder='Driver Price (£)'
								value={bookingData.price}
								onChange={(e) =>
									updateData(
										'price',
										(() => {
											const value = parseFloat(e.target.value);
											if (e.target.value === '') return '';
											if (
												(!isNaN(value) && value >= 0) ||
												e.target.value === ''
											) {
												return value;
											} else return bookingData.price;
										})()
									)
								}
								disabled={isBookingOpenInEditMode && currentUser?.roleId === 3}
							/>
						</div>

						<div className='flex sm:items-center sm:justify-center'>
							<span className='sm:-ml-2 mr-2 select-none'>Manually Priced</span>
							<input
								type='checkbox'
								checked={bookingData.manuallyPriced}
								onChange={(e) => updateData('manuallyPriced', e.target.checked)}
								className='form-checkbox h-5 w-5 text-primary'
							/>
						</div>

						<div className='flex sm:items-center sm:justify-center'>
							<label className='mr-2'>Passengers</label>
							<select
								value={bookingData.passengers}
								onChange={(e) => updateData('passengers', e.target.value)}
								className='sm:min-w-[45%] bg-input text-foreground p-2 rounded-lg border border-border'
							>
								<option value={1}>1</option>
								<option value={2}>2</option>
								<option value={3}>3</option>
								<option value={4}>4</option>
								<option value={5}>5</option>
								<option value={6}>6</option>
								<option value={7}>7</option>
								<option value={8}>8</option>
								<option value={9}>9</option>
							</select>
						</div>
						{/* <label className='flex items-center'>
							<span className='mr-2'>Charge From Base</span>
							<Switch
								color='error'
								checked={bookingData.chargeFromBase}
								onChange={() =>
									updateData('chargeFromBase', !bookingData.chargeFromBase)
								}
							/>
						</label> */}

						<div className='flex sm:items-center sm:justify-center'>
							<span className='mr-2 select-none'>All Day</span>
							<input
								type='checkbox'
								checked={bookingData.isAllDay}
								onChange={(e) => updateData('isAllDay', e.target.checked)}
								className='form-checkbox h-5 w-5 text-primary'
							/>
						</div>
						<div className='flex sm:justify-center sm:items-center'>
							{bookingData.scope !== 1 && (
								<>
									{bookingData.price ? (
										<LongButton onClick={() => updateData('price', '')}>
											Reset Price
										</LongButton>
									) : (
										<LongButton onClick={findQuote}>Get Quote</LongButton>
									)}
								</>
							)}
						</div>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
						<Input
							required
							type='text'
							placeholder='Name'
							value={bookingData.passengerName}
							inputRef={userNameRef}
							onChange={(e) => updateData('passengerName', e.target.value)}
							className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
						/>
						{/* Hours Duration Section Details */}
						<div className='flex items-center'>
							<Input
								type='number'
								placeholder='Hours'
								required
								className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
								value={bookingData.hours}
								onChange={(e) => updateData('hours', e.target.value)}
							/>
							<Input
								type='number'
								required
								placeholder='Minutes'
								value={bookingData.minutes}
								onChange={(e) => updateData('minutes', e.target.value)}
							/>
						</div>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-2'>
						<Input
							type='email'
							placeholder='Email'
							value={bookingData.email}
							onChange={(e) => updateData('email', e.target.value)}
							className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
						/>
						<div className='flex justify-between flex-row items-center gap-1'>
							<Input
								type='text'
								placeholder='Phone'
								value={bookingData.phoneNumber}
								inputRef={phoneNumberRef}
								onChange={(e) => {
									const value = e.target.value;
									// Remove non-numeric characters and limit to 12 digits
									const cleanedValue = value.replace(/\D/g, '').slice(0, 12);
									updateData('phoneNumber', cleanedValue);
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleFireCallerEvent();
									}
								}}
								className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
							/>
							<div
								className='px-3 bg-red-700 hover:bg-opacity-80 rounded-lg flex cursor-pointer'
								onClick={() => handleFireCallerEvent()}
							>
								<span
									style={{ padding: '1rem 0' }}
									color='error'
									className='text-white flex gap-2 px-3'
									type='button'
								>
									<LocalPhoneIcon />
									<span>Lookup</span>
								</span>
							</div>
						</div>
					</div>

					{
						<>
							{/* <p>options</p> */}
							<div className='options mb-2 flex justify-between gap-3 align-middle items-center'>
								{currentUser?.roleId !== 3 && (
									<p className='text-gray-700 text-sm'>status:</p>
								)}
								{currentUser?.roleId !== 3 && (
									<select
										name='status'
										onChange={(e) =>
											updateData('paymentStatus', +e.target.value)
										}
										id='options'
										value={bookingData.paymentStatus}
										className='block w-[75%] mt-1 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm'
									>
										<option value={0}>None</option>
										<option value={2}>Paid</option>
										<option value={3}>Awaiting payment</option>
									</select>
								)}
								<p className='text-gray-700 text-sm'>scope:</p>
								<select
									name='scope'
									id='options'
									value={bookingData.scope}
									onChange={(e) => {
										updateData('scope', +e.target.value);
										if (+e.target.value === 1) updateData('price', '');
									}}
									className='block w-[75%] mt-1 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm'
								>
									<option value={0}>Cash</option>
									{currentUser?.roleId !== 3 && (
										<option value={1}>Account</option>
									)}
									<option value={2}>Rank</option>
									{currentUser?.roleId !== 3 && <option value={4}>Card</option>}
									{currentUser?.roleId !== 3 && <option value={3}>All</option>}
								</select>
							</div>
							{bookingData.scope === 1 ? (
								<div className='flex justify-between items-center'>
									<div className='flex justify-between items-center w-[48%]'>
										<p className='text-gray-700 text-sm capitalize'>
											Account number:
										</p>
										<select
											name='account'
											id='account'
											value={bookingData.accountNumber}
											onChange={(e) => {
												updateData('accountNumber', +e.target.value);
												if (
													+e.target.value === 9014 ||
													+e.target.value === 10026
												)
													hvsDriverQuote();
											}}
											className='block w-[65%] mt-1 py-2 px-0 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm'
										>
											{accountDetails?.map((el, i) => (
												<Fragment key={i}>
													{el.accountName && (
														<option value={el.accNo}>
															{el.accNo === 0
																? 'select'
																: `${el.accNo}-${el.accountName}`}
														</option>
													)}
												</Fragment>
											))}
										</select>
									</div>

									<div className='mb-2 w-[50%] flex flex-col gap-4'>
										{bookingData?.scope === 1 && currentUser?.roleId === 1 ? (
											<Input
												type='number'
												placeholder='Price Account'
												value={bookingData.priceAccount}
												onChange={(e) => {
													const newValue = parseFloat(e.target.value);
													if (e.target.value === '')
														return updateData('priceAccount', '');
													if (!isNaN(newValue) && newValue >= 0) {
														return updateData('priceAccount', +e.target.value);
													}
												}}
												className='w-full bg-input text-foreground p-2 rounded-lg border border-border'
											/>
										) : null}
									</div>
								</div>
							) : null}
						</>
					}

					<div className='flex justify-between gap-5 mb-2'>
						<LongButton onClick={() => setDriverModalActive(true)}>
							Allocate Driver
						</LongButton>
					</div>

					<div className='flex justify-between space-x-4'>
						<div className='flex justify-start space-x-4'>
							{currentUser?.roleId !== 3 && (
								<button
									onClick={() => setConfirmCoaModal(true)}
									className='bg-muted text-primary-foreground text-white px-4 py-2 rounded-lg bg-orange-700'
									type='button'
								>
									Cancel On Arrival
								</button>
							)}
							{currentUser?.roleId !== 3 && (
								<button
									onClick={() => {
										if (bookingData?.phoneNumber || bookingData?.email) {
											setIsSendQuoteActive(true);
										} else {
											dispatch(
												openSnackbar('Please fill phone or email', 'error')
											);
										}
									}}
									className='bg-muted text-primary-foreground px-4 py-2 rounded-lg bg-gray-100'
									type='button'
								>
									Send Quote
								</button>
							)}
						</div>

						<div className='flex justify-end space-x-4'>
							<button
								onClick={deleteForm}
								className='bg-muted text-muted-foreground px-4 py-2 rounded-lg bg-gray-100'
								type='button'
							>
								Cancel
							</button>
							<button
								className='bg-primary text-primary-foreground px-4 py-2 rounded-lg text-white bg-gray-900'
								type='submit'
							>
								{bookingData.bookingType === 'Current' ? 'Update' : 'Create'}
							</button>
						</div>
					</div>
				</div>
			</form>
		</div>
	);
}

// Via Section Modal

function Input({ value, onChange, type, placeholder, required, ...props }) {
	return (
		<TextField
			autoComplete='new-password'
			required={required}
			type={type}
			value={value}
			onChange={onChange}
			id={String(Math.random() * 10000)}
			label={placeholder}
			{...props}
		/>
	);
}

function ConfirmCOA({ onClick, setConfirmCoaModal }) {
	return (
		<div className='flex flex-col items-center justify-center w-[80vw] sm:w-[23vw] bg-white rounded-lg px-4 pb-4 pt-5 sm:p-6 sm:pb-4 gap-4'>
			<div className='flex w-full flex-col gap-2 justify-center items-center mt-3'>
				<div className='p-4 flex justify-center items-center text-center rounded-full bg-[#FEE2E2]'>
					<LibraryBooksIcon sx={{ color: '#E45454' }} />
				</div>
			</div>
			<div className='text-center w-full'>
				Are you sure you want to set this job as a COA?
			</div>
			<div className='w-full flex items-center justify-center gap-4'>
				<Button
					variant='contained'
					color='error'
					sx={{ paddingY: '0.5rem', marginTop: '4px' }}
					className='w-full cursor-pointer'
					onClick={() => setConfirmCoaModal(false)}
				>
					Cancel
				</Button>
				<Button
					variant='contained'
					color='success'
					sx={{ paddingY: '0.5rem', marginTop: '4px' }}
					className='w-full cursor-pointer'
					onClick={() => onClick()}
				>
					Confirm
				</Button>
			</div>
		</div>
	);
}

export default Booking;
