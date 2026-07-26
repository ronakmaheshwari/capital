import BookMyShowValidator from "@/components/new_custom/ScannerComponent";
import DashboardPage from "./Dashboard";

const ScannerPage = () => {
    return (
        <DashboardPage>
        <div className="w-full h-[90vh]">
            <BookMyShowValidator />
        </div>
        <></>
        </DashboardPage>
    )
}

export default ScannerPage;