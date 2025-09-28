import Navbar from "../new custom/Navbar";
import PaymentDetails from "../new custom/PaymentDetails";
import Sidebar from "../new custom/Sidebar";

const UserDashboard = () => {
    return (
        <div className="max-w-7xl flex mx-auto">
            <Sidebar />
            <div className="w-full">
                <Navbar />
                {/* <TicketList/> */}
                {/* <TicketDetails/> */}
                <PaymentDetails />
                {/* <PersonalInfo/> */}
            </div>
        </div>
    );
};

export default UserDashboard;
