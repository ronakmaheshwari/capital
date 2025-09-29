import { Bell, LogOut, Settings, Ticket, UserRound, Wallet } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";

const Sidebar = () => {
    return (
        <div className="w-1/4 bg-white h-[90vh] p-10 m-10 rounded-2xl flex flex-col items-start gap-5">
            <div className="flex justify-center items-center w-full">
                <Image alt="Logo" height={50} src="/assets/Eventique.png" width={180} />
            </div>
            <Separator />
            <div className="flex flex-col items-start justify-center gap-2">
                <Button
                    className="text-md flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                    variant="link"
                >
                    <Ticket className="!w-[24px] !h-[24px] mr-1" />
                    Tickets
                </Button>
                <Button
                    className="text-md flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                    variant="link"
                >
                    <UserRound className="!w-[24px] !h-[24px] mr-1" />
                    Personal Info
                </Button>
                <Button
                    className="text-md flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                    variant="link"
                >
                    <Wallet className="!w-[24px] !h-[24px] mr-1" />
                    Payment
                </Button>
                <Button
                    className="text-md flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                    variant="link"
                >
                    <Bell className="!w-[24px] !h-[24px] mr-1" />
                    Notifications
                </Button>
            </div>

            <Separator />
            <div className="flex flex-col items-start justify-center gap-2">
                <Button
                    className="text-md flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                    variant="link"
                >
                    <Settings className="!w-[24px] !h-[24px] mr-1" />
                    Settings
                </Button>
                <Button
                    className="text-md flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                    variant="link"
                >
                    <LogOut className="!w-[24px] !h-[24px] mr-1" />
                    Logout
                </Button>
            </div>
        </div>
    );
};

export default Sidebar;
