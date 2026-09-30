import { Outlet } from "react-router";

const PaymentLayout = () => (
  <div className="min-h-screen overflow-y-auto bg-gray-50 px-4 py-8 sm:px-6 lg:py-10">
    <Outlet />
  </div>
);

export default PaymentLayout;
