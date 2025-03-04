/** @format */

import {
	ScheduleComponent,
	Day,
	Agenda,
	Inject,
} from '@syncfusion/ej2-react-schedule';
import { registerLicense } from '@syncfusion/ej2-base';
import Modal from '../components/Modal';
import CustomDialog from '../components/CustomDialog';

registerLicense(import.meta.env.VITE_SYNCFUSION_KEY);

import './scheduler.css';
import ProtectedRoute from '../utils/Protected';
import { useEffect, useRef, useState } from 'react';
import Snackbar from '../components/Snackbar-v2';
import { useDispatch, useSelector } from 'react-redux';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import Button from '@mui/material/Button';
import WatchLaterOutlinedIcon from '@mui/icons-material/WatchLaterOutlined';
import LocalTaxiOutlinedIcon from '@mui/icons-material/LocalTaxiOutlined';
import CurrencyPoundOutlinedIcon from '@mui/icons-material/CurrencyPoundOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import isLightColor from '../utils/isLight';
import { Switch, useMediaQuery } from '@mui/material';
import {
	allocateActiveBookingStatus,
	changeActiveDate,
	completeActiveBookingStatus,
	getRefreshedBookings,
	setActiveBookingIndex,
	setActiveSearchResult,
	setDateControl,
} from '../context/schedulerSlice';
import { createBookingFromScheduler } from '../context/bookingSlice';
import Loader from '../components/Loader';
import { getAllDrivers } from '../utils/apiReq';
import { useAuth } from '../hooks/useAuth';

const AceScheduler = () => {
	const isMobile = useMediaQuery('(max-width: 640px)');
	const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

	// taking our global states from the redux
	const {
		bookings,
		activeComplete,
		activeAllocate,
		activeDate,
		activeSearch,
		// activeSearchResults,
		// activeSoftAllocate,
		loading: searchLoading,
	} = useSelector((state) => state.scheduler);
	// const activeTestMode = useSelector(
	// 	(state) => state.bookingForm.isActiveTestMode
	// );

	// setting some states for the complenent level state management
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedBookingData, setSelectedBookingData] = useState();
	const [viewBookingModal, setViewBookingModal] = useState(false);
	const [driverData, setDriverData] = useState([]);
	const dispatch = useDispatch();
	const user = useAuth();
	const scheduleRef = useRef(null);
	// data that syncfusion requires for inside computation of the internal mapping
	const fieldsData = {
		id: 'bookingId',
		subject: { name: 'cellText' },
		isAllDay: { name: 'isAllDay' },
		startTime: { name: 'pickupDateTime' },
		endTime: { name: 'endTime' },
		OwnerColor: { name: 'backgroundColorRGB' },
		// recurrenceRule: { name: 'recurrenceRule' },
		Readonly: { name: 'Readonly' },
	};

	// syncfusion handler function for each render of syncfusion element on the screen
	function onEventRendered(args) {
		if (!args || !args.element || !args.element.classList) {
			console.warn('Skipping event rendering due to missing element:', args);
			return; // Prevents modifying null elements
		}
		args.element;
		let driverColor = '#795548'; // Default color if both suggestedUserId and userId are null

		if (args?.data?.suggestedUserId && !args?.data?.userId) {
			// If there's a suggestedUserId, use the suggested driver's color
			const suggestedDriver = driverData.find(
				(driver) => driver.id === args.data.suggestedUserId
			);
			if (suggestedDriver) {
				driverColor = suggestedDriver.colorRGB;
			}
		} else if (args?.data?.userId) {
			// If suggestedUserId is null but userId exists, use the user's color
			driverColor = args.data.backgroundColorRGB;
		}

		// Apply gradient based on activeSoftAllocate status
		if (args?.data?.suggestedUserId && !args?.data?.userId) {
			// Use a dot-pattern gradient for soft allocation
			args.element.style.backgroundImage = `
    radial-gradient(${driverColor} 40%, transparent 40%),
    radial-gradient(${driverColor} 40%, transparent 40%)`;

			// Adjust the background size to reflect larger dots and manage spacing
			args.element.style.backgroundSize = '20px 20px'; // Increase size to make dots larger
			args.element.style.backgroundPosition = '0 0, 10px 10px';
			args.element.style.backgroundColor = '#795548';

			const subjectElement = args?.element?.querySelector('.e-subject');
			if (subjectElement) {
				subjectElement.style.display = 'inline-block'; // Ensure it only takes the width of the text
				subjectElement.style.padding = '0 4px'; // Add a little padding if needed
				subjectElement.style.backgroundColor = driverColor; // Optional background for clarity
				subjectElement.style.borderRadius = '4px'; // Round the edges for a badge-like appearance
				subjectElement.style.maxWidth = 'fit-content'; // Ensure it wraps to the text width
				// subjectElement.style.overflow = 'hidden'; // Hide overflow if text exceeds width
				subjectElement.style.whiteSpace = 'wrap'; // Prevent wrapping to new lines
			}
			const timeElement = args?.element?.querySelector('.e-time');
			if (timeElement) {
				timeElement.style.display = 'block';
				timeElement.style.backgroundColor = driverColor;
				timeElement.style.padding = '0 4px'; // Add a little padding if needed
				timeElement.style.borderRadius = '4px';
				timeElement.style.maxWidth = 'fit-content'; // Ensure it wraps to the text width
				// subjectElement.style.overflow = 'hidden'; // Hide overflow if text exceeds width
				timeElement.style.whiteSpace = 'wrap';
			}

			// const subjectElement = args.element.querySelector('.e-subject');

			// // Create the badge element

			// // Append the badge next to the subject text
		} else if (args.data.userId && args.data.status === 1) {
			// Use a -40-degree gradient for normal allocation
			args.element.style.background = `repeating-linear-gradient(-40deg, ${driverColor}, ${driverColor} 10px, rgb(187, 187, 187) 20px)`;
			args.element.style.backgroundColor = driverColor;
		} else {
			// No gradient, just set the color
			args.element.style.backgroundColor = driverColor;
		}

		// Apply the driver color as the background color for fallback cases
		args.element.style.borderRadius = '10px';

		const createBadge = (text, bgColor) => {
			const badge = document.createElement('span');
			badge.textContent = text;
			badge.style.backgroundColor = bgColor;

			badge.style.color = isLightColor(bgColor) ? 'black' : 'white';
			// badge.style.padding = '0px 5px';
			badge.style.padding = '2px 5px';
			badge.style.marginLeft = '5px';
			badge.style.border = `1px solid ${
				isLightColor(bgColor) ? 'black' : 'white'
			}`;
			// badge.style.borderRadius = '50%';
			badge.style.borderRadius = '12px';

			badge.style.fontSize = '12px';
			badge.style.fontWeight = 'bold';
			badge.style.display = 'inline';
			badge.style.whiteSpace = 'wrap';

			return badge;
		};
		const subjectElement = args?.element?.querySelector('.e-subject');
		const parentNode = subjectElement.parentNode;

		if (args?.data?.scope === 4) {
			const badgeColor =
				args.data.paymentStatus === 0
					? 'red'
					: args?.data?.paymentStatus === 2
					? 'green'
					: args.data.paymentStatus === 3
					? 'orange'
					: '';
			const cardBadge = createBadge('Card', badgeColor);
			parentNode.insertBefore(cardBadge, subjectElement);
			// - ${
			// 	args?.data?.paymentStatus === 0
			// 		? 'Unpaid'
			// 		: args?.data?.paymentStatus === 2
			// 		? 'Paid'
			// 		: args?.data?.paymentStatus === 3
			// 		? 'Unpaid'
			// 		: ''
			// }
			// `;

			// subjectElement.appendChild(badge);
		}
		if (args?.data?.isASAP) {
			// const asapBadge = createBadge('ASAP', '#228B22');
			// parentNode.insertBefore(asapBadge, subjectElement);
			args.element.style.border = '3px dashed #228B22';
		}
		if (isLightColor(driverColor)) {
			if (args?.element?.querySelector('.e-subject'))
				args.element.querySelector('.e-subject').style.color = 'black';
			if (args?.element?.querySelector('.e-time'))
				args.element.querySelector('.e-time').style.color = 'black';
			if (args?.element?.querySelector('.e-date-time'))
				args.element.querySelector('.e-date-time').style.color = 'black';
			if (args?.element?.querySelector('.e-icons'))
				args.element.querySelector('.e-icons').style.color = 'black';
		} else {
			if (args?.element?.querySelector('.e-subject'))
				args.element.querySelector('.e-subject').style.color = 'white';
			if (args?.element?.querySelector('.e-time'))
				args.element.querySelector('.e-time').style.color = 'white';
			if (args?.element?.querySelector('.e-date-time'))
				args.element.querySelector('.e-date-time').style.color = 'white';
			if (args?.element?.querySelector('.e-icons'))
				args.element.querySelector('.e-icons').style.color = 'white';
		}
	}

	// refresh the booking when activeTestMode, currentDate, dispatch, activeComplete changes
	useEffect(() => {
		async function helper() {
			dispatch(getRefreshedBookings());
			getAllDrivers().then((res) => {
				const driverUsers = [
					{ id: 0, fullName: 'Unallocated', colorRGB: '#795548' },
					...res.users,
				];
				setDriverData(driverUsers);
			});
		}
		helper();
	}, [activeDate, dispatch, activeComplete, activeAllocate]);
	// }, [activeTestMode, activeDate, dispatch, activeComplete]);
	// refresh the booking every 10000 (10 sec)
	useEffect(() => {
		async function helper() {
			dispatch(getRefreshedBookings());
		}
		const refreshInterval = setInterval(helper, 10000);
		return () => clearInterval(refreshInterval);
	}, [dispatch]);

	const eventSettings = {
		// dataSource: activeSearch ? activeSearchResults || [] : bookings || [],
		dataSource: bookings || [],
		fields: fieldsData,
		allowAdding: false,
		allowEditing: false,
		allowDeleting: false,
		recurrenceMode: 'Occurrence',
	};

	// handler funciton for each booking click
	const onEventClick = async (args) => {
		if (activeSearch) {
			// dispatch(setActiveSearchResult(args.event.bookingId, activeTestMode));
			dispatch(setActiveSearchResult(args.event.bookingId));
		} else {
			setSelectedBookingData(args.event);
			dispatch(setActiveBookingIndex(args.event.bookingId));
		}
		setDialogOpen(true);
	};

	const createBookingOnTimeStamp = function (args) {
		dispatch(createBookingFromScheduler(args.startTime));
	};

	// Create a ref for ScheduleComponent
	const onCreate = () => {
		const scheduleObj = scheduleRef.current;
		if (scheduleObj) {
			// Get current time and go 1 hour back
			const currentTime = new Date();
			currentTime.setHours(currentTime.getHours() - 2);

			// Get the local time string
			const hours = currentTime.getHours();
			const minutes = currentTime.getMinutes();

			// Format the time to HH:mm (adding leading zero if needed)
			const formattedTime = `${hours}:${
				minutes < 10 ? '0' + minutes : minutes
			}`;

			// console.log(formattedTime); // This should log the correct time in local format

			// Scroll to the formatted time
			scheduleObj.scrollTo(formattedTime);
		}
	};

	// Effect to trigger scroll on initial load (or whenever necessary)
	useEffect(() => {
		onCreate(); // Call onCreate to scroll when the component mounts
	}, []);
	// console.log('active Date in Scheduler----', activeDate);
	return (
		<ProtectedRoute>
			<Snackbar />
			{searchLoading && <Loader />}

			<ScheduleComponent
				ref={scheduleRef}
				firstDayOfWeek={1}
				height={
					isMobile || isTablet
						? window.innerHeight - 100
						: window.innerHeight - 150
				}
				// currentView={activeSearch ? 'Agenda' : 'Day'}
				currentView={'Day'}
				selectedDate={activeDate}
				navigating={(args) => {
					dispatch(setDateControl(new Date(args.currentDate).toISOString()));
					dispatch(changeActiveDate(new Date(args.currentDate).toISOString()));
				}}
				eventSettings={eventSettings}
				eventRendered={onEventRendered}
				eventClick={onEventClick}
				cellClick={createBookingOnTimeStamp}
				editorTemplate={null}
				popupOpen={(args) => (args.cancel = true)}
				className='schedule-cell-dimension'
				views={[
					{ option: 'Day' },
					{
						option: 'Agenda',
						// allowVirtualScrolling: activeSearch ? true : false,
						allowVirtualScrolling: false,
						interval: 1,
					},
				]}

				// agendaDaysCount={365}
			>
				{dialogOpen && !viewBookingModal && (
					<Modal
						open={dialogOpen}
						setOpen={setDialogOpen}
					>
						<CustomDialog closeDialog={() => setDialogOpen(false)} />
					</Modal>
				)}
				{viewBookingModal && (
					<Modal
						open={viewBookingModal}
						setOpen={setViewBookingModal}
					>
						<ViewBookingModal
							data={selectedBookingData}
							setViewBookingModal={setViewBookingModal}
						/>
					</Modal>
				)}
				<Inject services={[Day, Agenda]} />
			</ScheduleComponent>

			<div className='flex justify-end w-[10%] fixed top-[100px] right-[0px] sm:top-[125px] sm:right-[350px] z-[40]'>
				{(!isMobile || user?.currentUser?.roleId !== 3) && !activeSearch && (
					<span className='flex flex-row gap-2 items-center align-middle'>
						<span className='select-none whitespace-nowrap text-xs sm:text-sm uppercase font-normal'>
							Show Allocated
						</span>
						<Switch
							checked={activeAllocate}
							onChange={() => {
								dispatch(allocateActiveBookingStatus(!activeAllocate));
							}}
							className='text-sm'
						/>
					</span>
				)}
			</div>
			{/* Changed by Tanya - (9 Aug) */}
			<div className='flex justify-end w-[10%] fixed top-[120px] right-[0px] sm:top-[125px] sm:right-[160px] z-[40]'>
				{(!isMobile || user?.currentUser?.roleId !== 3) && !activeSearch && (
					<span className='flex flex-row gap-2 items-center align-middle'>
						<span className='select-none whitespace-nowrap text-xs sm:text-sm uppercase font-normal'>
							Show Completed
						</span>
						<Switch
							checked={activeComplete}
							onChange={() => {
								dispatch(completeActiveBookingStatus(!activeComplete));
							}}
							className='text-sm'
						/>
					</span>
				)}
			</div>
		</ProtectedRoute>
	);
};
export default AceScheduler;

function ViewBookingModal({ data, setViewBookingModal }) {
	return (
		<div className='flex flex-col items-center justify-center w-[23vw] bg-white rounded-lg px-4 pb-4 pt-5 sm:p-6 sm:pb-4'>
			<div className='p-4 flex justify-center items-center text-center rounded-full bg-[#FEE2E2]'>
				<CalendarTodayIcon sx={{ color: '#E45454' }} />
			</div>
			<div className='flex w-full flex-col gap-2 justify-center items-center mt-3'>
				<div className='flex w-full flex-col justify-center items-center'>
					<p className='font-medium '>Booking Details</p>
					<div className='font-bold'># {data?.bookingId}</div>
				</div>
				<div className='bg-[#16A34A] text-center font-medium text-white py-2 px-4 w-full rounded-sm'>
					<p>Booking Confirmed</p>
				</div>
				<div className='max-h-[70vh] overflow-auto'>
					{/* Pickup */}
					<div className='bg-[#F3F4F6] w-full flex flex-row justify-between items-center gap-10 border-y-gray-300 border-y '>
						<HomeOutlinedIcon sx={{ color: '#16A34A', marginLeft: '1rem' }} />
						<div className='w-full flex flex-col items-start gap-1 mb-2'>
							<div className='w-full py-1 border-b-gray-300 border-b-[1px]'>
								<p className='font-medium'>Pickup</p>
							</div>
							<div className='w-full flex flex-col items-start'>
								<p className='font-medium'>
									{data?.dateCreated?.split('T').join(' ').split('.')[0]}
								</p>
								<p className='text-[14px] text-orange-900 cursor-pointer'>
									{data?.pickupAddress}
								</p>
								<p className='text-[14px] text-orange-900 cursor-pointer'>
									{data?.pickupPostCode}
								</p>
							</div>
						</div>
					</div>
					{/* Via if Present */}
					{data?.vias.length > 0 && (
						<div className='bg-[#F3F4F6] w-full flex flex-row justify-between items-center gap-10 border-y-gray-300 border-y'>
							<HomeOutlinedIcon sx={{ color: '#16A34A', marginLeft: '1rem' }} />
							<div className='w-full flex flex-col items-start gap-1 mb-2'>
								<div className='w-full py-1 border-b-gray-300 border-b-[1px]'>
									<p className='font-medium'>{`Via's`}</p>
								</div>
								{data?.vias.map((via, index) => (
									<div
										key={index}
										className='w-full flex flex-col items-start'
									>
										<p className='text-[14px] text-orange-900 cursor-pointer'>
											{via.address}
										</p>
										<p className='text-[14px] text-orange-900 cursor-pointer'>
											{via.postCode}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
					{/* Destination */}
					<div className='bg-[#F3F4F6] w-full flex flex-row justify-between items-center gap-10 border-y-gray-300 border-y '>
						<HomeOutlinedIcon sx={{ color: '#16A34A', marginLeft: '1rem' }} />
						<div className='w-full flex flex-col items-start gap-1 mb-2'>
							<div className='w-full py-1 border-b-gray-300 border-b-[1px]'>
								<p className='font-medium'>Destination</p>
							</div>
							<div className='w-full flex flex-col items-start'>
								<p className='text-[14px] text-orange-900 cursor-pointer'>
									{data?.destinationAddress}
								</p>
								<p className='text-[14px] text-orange-900 cursor-pointer'>
									{data?.destinationPostCode}
								</p>
							</div>
						</div>
					</div>
					{/* Details - Journey */}
					<div className='bg-[#F3F4F6] w-full flex flex-row justify-between items-center gap-10 border-y-gray-300 border-y '>
						<div className='w-full flex flex-col items-start gap-1 mb-2'>
							<div className='w-full flex justify-end '>
								<div className='w-[80%] py-1 border-b-gray-300 border-b-[1px]'>
									<p className='font-medium'>Details</p>
								</div>
							</div>
							<div className='w-full flex flex-row justify-start gap-10 items-center'>
								<PersonOutlineOutlinedIcon
									sx={{ marginLeft: '1rem', padding: '1px' }}
								/>
								<div className=' w-full flex flex-col py-1'>
									<p className='font-medium text-black'>
										{data?.passengerName}
									</p>
									<p className='text-[14px] text-black'>
										{data?.passengers} <span>Passenger(s)</span>
									</p>
								</div>
							</div>
							<div className='w-full flex flex-row justify-start gap-10 items-center'>
								<LocalPhoneOutlinedIcon
									sx={{ marginLeft: '1rem', padding: '1px' }}
								/>
								<div className=' w-full flex flex-col py-1'>
									<p className='text-[14px] text-orange-900 cursor-pointer'>
										{data.phoneNumber}
									</p>
								</div>
							</div>
						</div>
					</div>
					{/* Price - Information */}
					<div className='bg-[#F3F4F6] w-full flex flex-row justify-between items-center gap-10 border-y-gray-300 border-y '>
						<div className='w-full flex flex-col items-start gap-1 mb-2'>
							<div className='w-full flex justify-end '>
								<div className='w-[80%] py-1 border-b-gray-300 border-b-[1px]'>
									<p className='font-medium'>Price - Journey Information</p>
								</div>
							</div>
							<div className='w-full flex flex-row justify-start gap-10 items-center'>
								<WatchLaterOutlinedIcon
									sx={{ marginLeft: '1rem', padding: '2px' }}
								/>
								<div className=' w-full flex flex-col py-1'>
									<p className='text-[14px] text-black'>
										{Math.floor(data?.durationMinutes / 60)}{' '}
										<span>Hour(s)</span> {data?.durationMinutes % 60}{' '}
										<span>Minute(s)</span>
									</p>
								</div>
							</div>
							{data?.mileageText > 0 && (
								<div className='w-full flex flex-row justify-start gap-10 items-center'>
									<LocalTaxiOutlinedIcon
										sx={{ marginLeft: '1rem', padding: '2px' }}
									/>
									<div className=' w-full flex flex-col py-1'>
										<p className='text-[14px] text-black'>
											{data?.mileageText}
										</p>
									</div>
								</div>
							)}
							{data?.price > 0 && (
								<div className='w-full flex flex-row justify-start gap-10 items-center'>
									<CurrencyPoundOutlinedIcon
										sx={{ marginLeft: '1rem', padding: '3px' }}
									/>
									<div className=' w-full flex flex-col py-1'>
										<p className='text-[14px] text-orange-900 cursor-pointer'>
											{data.price}
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<Button
					variant='contained'
					color='error'
					sx={{ paddingY: '0.5rem', marginTop: '4px' }}
					className='w-full cursor-pointer'
					onClick={() => setViewBookingModal(false)}
				>
					Back
				</Button>
			</div>
		</div>
	);
}
