/** @format */

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { Box, Switch } from '@mui/material';
import { useBooking } from '../hooks/useBooking';

const Transition = React.forwardRef(function Transition(props, ref) {
	return (
		<Slide
			direction='up'
			ref={ref}
			{...props}
		/>
	);
});

export default function FullScreenDialog({ children, open, setOpen }) {
	// const [open, setOpen] = React.useState(false);
	const { activeTestMode, setActiveTestMode } = useBooking();

	const handleClose = () => {
		setOpen(false);
	};

	return (
		<React.Fragment>
			<Dialog
				fullScreen
				open={open}
				onClose={handleClose}
				TransitionComponent={Transition}
			>
				<AppBar
					sx={{
						position: 'relative',
						backgroundColor: '#424242',
					}}
				>
					<Toolbar className='flex justify-between'>
						<IconButton
							edge='start'
							color='inherit'
							onClick={handleClose}
							aria-label='close'
						>
							<CloseIcon />
						</IconButton>
						<span className='flex align-middle items-center'>
							<Typography className='select-none'>Test</Typography>
							<Switch
								color='primary'
								defaultChecked={activeTestMode}
								onChange={() => setActiveTestMode(!activeTestMode)}
							/>
						</span>
					</Toolbar>
				</AppBar>
				<Box>{children}</Box>
			</Dialog>
		</React.Fragment>
	);
}