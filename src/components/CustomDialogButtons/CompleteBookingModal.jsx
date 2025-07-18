/** @format */

// Complete Booking Modal Structure
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { handleCompleteBooking } from "../../context/schedulerSlice";
import { openSnackbar } from "../../context/snackbarSlice";
import CurrencyPoundOutlinedIcon from "@mui/icons-material/CurrencyPoundOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import { Button } from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
export default function CompleteBookingModal({
  setIsCompleteBookingModal,
  closeDialog,
}) {
  const {
    bookings,
    currentlySelectedBookingIndex: index,
    activeSearchResult,
    activeSearch,
  } = useSelector((state) => state.scheduler);
  let data = {};
  data = bookings[index];
  if (activeSearch) data = activeSearchResult;
  const [accountPrice, setAccountPrice] = useState(data.priceAccount || 0);
  const [waitingTime, setWaitingTime] = useState(data.waitingTime || 0);
  const [parkingCharge, setParkingCharge] = useState(data.parkingCharge || 0);
  const [price, setPrice] = useState(data.price || 0);
  const user = useAuth();
  console.log({ data, user });
  const dispatch = useDispatch();

  const disableInput = () => {
    if (
      (data?.scope === 1 || data?.scope === 4) &&
      user?.currentUser?.roleId === 3
    ) {
      return true;
    } else if (data.scope !== 1) {
      return false;
    }

    return false;
  };

  const handleCompleteClick = async (e) => {
    // console.log(`${data.bookingId} is completed`);
    e.preventDefault();
    const completedBookingData = {
      waitingTime,
      parkingCharge,
      driverPrice: price,
      accountPrice: data.priceAccount,
    };
    const response = dispatch(handleCompleteBooking(completedBookingData));
    setIsCompleteBookingModal(false);
    closeDialog();
    if (response.status === "success") {
      dispatch(openSnackbar("Booking Completed", "success"));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-[80vw] sm:w-[23vw] bg-white rounded-lg px-4 pb-4 pt-5 sm:p-6 sm:pb-4 gap-4">
      <div className="flex w-full flex-col gap-2 justify-center items-center mt-3">
        <div className="p-4 flex justify-center items-center text-center rounded-full bg-[#FEE2E2]">
          <HelpOutlineOutlinedIcon sx={{ color: "#E45454" }} />
        </div>
        <div className="flex w-full flex-col justify-center items-center">
          <p className="font-medium text-2xl ">Job completion</p>
        </div>
        <form
          onSubmit={handleCompleteClick}
          className="w-full flex flex-col justify-center items-center gap-3 mt-2"
        >
          <div className="w-full relative flex flex-col justify-center items-start gap-2">
            <label>Waiting Time Minutes</label>
            <input
              type="number"
              min="0"
              value={waitingTime === 0 ? "" : waitingTime}
              onChange={(e) => setWaitingTime(+e.target.value)}
              className="w-full pl-10 pr-4 py-2 p-2 border border-gray-500 rounded-md placeholder:text-slate-900"
              disabled={user?.currentUser?.roleId === 3 || data?.scope !== 1}
            />
            <i className="absolute left-4 top-10 text-black">
              <AccessTimeOutlinedIcon fontSize="12px" />
            </i>
          </div>
          <div className="w-full relative flex flex-col justify-center items-start gap-2">
            <label>Parking Charge</label>
            <input
              type="number"
              step="0.01"
              value={parkingCharge === 0 ? "" : parkingCharge}
              onChange={(e) => setParkingCharge(+e.target.value)}
              min="0"
              className="w-full pl-10 pr-4 py-2 p-2 border border-gray-500 rounded-md placeholder:text-slate-900"
              disabled={user?.currentUser?.roleId === 3 || data?.scope !== 1}
            />
            <i className="absolute left-4 top-10 text-black">
              <CurrencyPoundOutlinedIcon fontSize="12px" />
            </i>
          </div>
          <div className="w-full relative flex flex-col justify-center items-start gap-2">
            <label className="">
              Price <span className="text-red-600">*</span>
            </label>
            <input
              required
              type="number"
              value={price === 0 ? "" : price}
              onChange={(e) => setPrice(+e.target.value)}
              className="w-full pl-10 pr-4 py-2 p-2 border border-gray-500 rounded-md placeholder:text-slate-900"
              disabled={disableInput()}
            />
            <i className=" absolute left-4 top-10  text-black">
              <CurrencyPoundOutlinedIcon fontSize="12px" />
            </i>
          </div>
          {data.priceAccount > 0 && user?.currentUser?.roleId === 1 && (
            <div className="w-full relative flex flex-col justify-center items-start gap-2">
              <label className="">Account Price</label>
              <input
                type="number"
                value={accountPrice === 0 ? "" : accountPrice}
                onChange={(e) => setAccountPrice(+e.target.value)}
                className="w-full pl-10 pr-4 py-2 p-2 border border-gray-500 rounded-md placeholder:text-slate-900"
              />
              <i className="absolute left-4 top-10  text-black">
                <CurrencyPoundOutlinedIcon fontSize="12px" />
              </i>
            </div>
          )}
          <Button
            variant="contained"
            color="error"
            sx={{ paddingY: "0.5rem", marginTop: "4px" }}
            className="w-full cursor-pointer"
            type="submit"
          >
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
