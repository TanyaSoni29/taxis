/** @format */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, Switch, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import CallIcon from '@mui/icons-material/Call';
import Badge from '@mui/material/Badge';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTestMode, setIsGoogleApiOn } from '../context/bookingSlice';
import {
	handleSearchBooking,
	makeSearchInactive,
	// makeSearchInactive,
} from '../context/schedulerSlice';
// import CancelIcon from '@mui/icons-material/Cancel';
import LogoImg from '../assets/ace_taxis_v4.svg';
import LongButton from '../components/BookingForm/LongButton';
import SearchIcon from '@mui/icons-material/Search';
import { useForm } from 'react-hook-form';
const Navbar = () => {
	const navigate = useNavigate();
	const { isAuth, logout } = useAuth();
	const dispatch = useDispatch();
	const activeTestMode = useSelector(
		(state) => state.bookingForm.isActiveTestMode
	);
	const isGoogleApiOn = useSelector((state) => state.bookingForm.isGoogleApiOn);
	const callerId = useSelector((state) => state.caller);
	const { activeSearch } = useSelector((state) => state.scheduler);
	const [openSearch, setOpenSearch] = useState(false);
	// const [searchData, setSearchData] = useState({});
	// const inputRef = useRef(null);

	// const handleKeyPress = (e) => {
	// 	if (e.key === 'Enter') {
	// 		e.preventDefault();
	// 		handleClick(e);
	// 	}
	// };

	const handleCancelSearch = () => {
		dispatch(makeSearchInactive()); // Dispatch makeSearchInactive to deactivate search
	};

	return (
		<>
			<>
				{openSearch && (
					<Modal
						open={openSearch}
						setOpen={setOpenSearch}
					>
						<SearchModal
							// handleClick={handleClick}
							openSearch={openSearch}
							// inputRef={inputRef}
							// setSearchData={setSearchData}
							// handleKeyPress={handleKeyPress}
							setOpenSearch={setOpenSearch}
						/>
					</Modal>
				)}
			</>
			<nav className='sticky top-0 z-50 flex justify-between items-center bg-[#424242] text-white p-4'>
				<span className='flex gap-10'>
					<Link
						to='/pusher'
						className='text-lg font-bold flex justify-center items-center space-x-2 uppercase'
					>
						<img
							src={LogoImg}
							className='flex h-8 w-8'
						/>
						<span>Ace Taxis</span>
					</Link>
				</span>

				<span className='flex gap-10 uppercase text-sm'>
					{!isAuth ? (
						<></>
					) : (
						<div className='flex flex-row items-center align-middle gap-8'>
							{callerId.length > 0 && (
								<Badge
									badgeContent={callerId.length}
									color='error'
									className='cursor-pointer select-none animate-bounce'
								>
									<CallIcon />
								</Badge>
							)}

							{/* Search Form Started here */}
							<div className='flex justify-center items-center uppercase'>
								{!activeSearch && (
									<button onClick={() => setOpenSearch(true)}>Search</button>
								)}
								{activeSearch && (
									<button onClick={handleCancelSearch}>Cancel Search</button>
								)}
							</div>

							<span className='flex flex-row gap-2 items-center align-middle'>
								<span>Use Google Api</span>
								<Switch
									checked={isGoogleApiOn}
									onChange={(e) => {
										dispatch(setIsGoogleApiOn(e.target.checked));
									}}
								/>
							</span>

							{/* Test Mode Toogle Button */}
							<span className='flex flex-row gap-2 items-center align-middle'>
								<span>Test Mode</span>
								<Switch
									checked={activeTestMode}
									onChange={(e) => {
										dispatch(setActiveTestMode(e.target.checked));
									}}
								/>
							</span>

							{/* Logout Button */}
							<button
								className='bg-blue-500 text-white px-4 py-2 rounded-lg uppercase text-sm'
								onClick={() => {
									logout();
									navigate('/login');
								}}
							>
								logout
							</button>
						</div>
					)}
				</span>
			</nav>
		</>
	);
};

export default Navbar;

function SearchModal({ setOpenSearch }) {
	const dispatch = useDispatch();
	const {
		register,
		handleSubmit,
		reset,
		formState: { isSubmitSuccessful, errors }, // Access form errors
	} = useForm({
		defaultValues: {
			pickupAddress: '',
			pickupPostcode: '',
			destinationAddress: '',
			destinationPostcode: '',
			passenger: '',
			phoneNumber: '',
			details: '',
		},
	});

	const handleSubmitForm = async (data) => {
		const newinputData = {
			pickupAddress: data.pickupAddress || '',
			pickupPostcode: data.pickupPostcode || '',
			destinationAddress: data.destinationAddress || '',
			destinationPostcode: data.destinationPostcode || '',
			passenger: data.passenger || '',
			phoneNumber: data.phoneNumber || '',
			details: data.details || '',
		};

		// Dispatch search action only if some data is entered
		if (
			newinputData.pickupAddress ||
			newinputData.pickupPostcode ||
			newinputData.destinationAddress ||
			newinputData.destinationPostcode ||
			newinputData.passenger ||
			newinputData.phoneNumber ||
			newinputData.details
		) {
			dispatch(handleSearchBooking(newinputData));
			setOpenSearch(false); // Close the modal after search
		} else {
			console.log('Please enter search criteria');
		}
	};

	useEffect(() => {
		if (isSubmitSuccessful) {
			reset({
				pickupAddress: '',
				pickupPostcode: '',
				destinationAddress: '',
				destinationPostcode: '',
				passenger: '',
				phoneNumber: '',
				details: '',
			});
		}
	}, [reset, isSubmitSuccessful]);

	return (
		<div className='bg-white p-6 rounded-lg shadow-lg w-[25vw] max-w-md mx-auto'>
			<h2 className='text-2xl font-semibold mb-4 flex items-center'>
				<SearchIcon />
				Search Bookings
			</h2>
			<form onSubmit={handleSubmit(handleSubmitForm)}>
				<Box
					mt={2}
					display='flex'
					justifyContent='space-between'
					gap={2}
				>
					<TextField
						label='Pickup Address'
						fullWidth
						error={!!errors.pickupAddress} // Show error if validation fails
						helperText={
							errors.pickupAddress ? 'Must be at least 3 characters' : ''
						}
						{...register('pickupAddress', {
							minLength: {
								value: 3,
								message: 'Must be at least 3 characters',
							},
						})}
					/>
					<TextField
						label='Pickup Postcode'
						fullWidth
						error={!!errors.pickupPostcode}
						helperText={
							errors.pickupPostcode ? 'Must be at least 3 Numbers' : ''
						}
						{...register('pickupPostcode', {
							minLength: {
								value: 3,
								message: 'Must be at least 3 Numbers',
							},
						})}
					/>
				</Box>
				<Box
					mt={2}
					display='flex'
					justifyContent='space-between'
					gap={2}
				>
					<TextField
						label='Destination Address'
						fullWidth
						error={!!errors.destinationAddress}
						helperText={
							errors.destinationAddress ? 'Must be at least 3 characters' : ''
						}
						{...register('destinationAddress', {
							minLength: {
								value: 3,
								message: 'Must be at least 3 characters',
							},
						})}
					/>
					<TextField
						label='Destination Postcode'
						fullWidth
						error={!!errors.destinationPostcode}
						helperText={
							errors.destinationPostcode ? 'Must be at least 3 Numbers' : ''
						}
						{...register('destinationPostcode', {
							minLength: {
								value: 3,
								message: 'Must be at least 3 Numbers',
							},
						})}
					/>
				</Box>
				<Box
					mt={2}
					display='flex'
					justifyContent='space-between'
					gap={2}
				>
					<TextField
						label='Passenger'
						fullWidth
						error={!!errors.passenger}
						helperText={errors.passenger ? 'Must be at least 3 characters' : ''}
						{...register('passenger', {
							minLength: {
								value: 3,
								message: 'Must be at least 3 characters',
							},
						})}
					/>
					<TextField
						label='Phone Number'
						fullWidth
						error={!!errors.phoneNumber}
						helperText={errors.phoneNumber ? 'Must be at least 3 Numbers' : ''}
						{...register('phoneNumber', {
							minLength: {
								value: 3,
								message: 'Must be at least 3 Numbers',
							},
						})}
					/>
				</Box>
				<Box
					mt={2}
					display='flex'
					justifyContent='space-between'
					gap={2}
				>
					<TextField
						label='Details'
						fullWidth
						error={!!errors.details}
						helperText={errors.details ? 'Must be at least 3 characters' : ''}
						{...register('details', {
							minLength: {
								value: 3,
								message: 'Must be at least 3 characters',
							},
						})}
					/>
				</Box>

				<div className='mt-4 flex flex-row gap-1'>
					<LongButton
						type='submit'
						color='bg-green-700'
					>
						Search
					</LongButton>
					<LongButton
						color='bg-red-700'
						onClick={() => setOpenSearch(false)} // Close modal on Cancel
					>
						Cancel
					</LongButton>
				</div>
			</form>
		</div>
	);
}
