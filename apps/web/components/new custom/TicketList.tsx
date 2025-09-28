import { ChevronRight, Dot, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const TicketList = () => {
    return (
        <div className="flex flex-col gap-5 bg-white h-[79vh] rounded-2xl px-10">
            {/* Filter Bar */}
            <div className="mt-10">
                <Button
                    className=" text-lg hover:cursor-pointer hover:text-[#D580F2]"
                    variant="link"
                >
                    All (7)
                </Button>
                <Button
                    className=" text-lg hover:cursor-pointer hover:text-[#D580F2]"
                    variant="link"
                >
                    Pending (7)
                </Button>
                <Button
                    className=" text-lg hover:cursor-pointer hover:text-[#D580F2]"
                    variant="link"
                >
                    Cancelled (7)
                </Button>
                <Button
                    className="text-lg hover:cursor-pointer hover:text-[#D580F2]"
                    variant="link"
                >
                    Completed (7)
                </Button>
            </div>

            {/* Card1 */}
            <div className="bg-white p-5 rounded-2xl  hover:shadow-[0_13px_27px_-5px_rgba(50,50,93,0.25),0_8px_16px_-8px_rgba(0,0,0,0.3)] transition-shadow duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="font-bold">Adele Concert</div>
                        <div className="font-semibold"># R123</div>
                    </div>
                    <div className="inline-flex items-center px-4 py-1 rounded-full bg-green-100 text-green-600">
                        Completed
                    </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="font-semibold">Order Date: </div>
                        <div className="font-semibold flex text-[#999999]">
                            Tue 30 Sep <Dot /> 7:30 PM
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="font-semibold">Total Paid: </div>
                        <div className="font-semibold flex text-[#999999]">$200</div>
                    </div>
                    <div className="flex gap-2">
                        <div className="font-semibold flex">
                            <Ticket className="mr-1" />
                            Tickets:{" "}
                        </div>
                        <div className="font-semibold flex text-[#999999]">2 tickets</div>
                    </div>
                    <div>
                        <Button
                            className="flex items-center gap-1 text-[#C14FE6] p-0 hover:cursor-pointer"
                            variant="link"
                        >
                            Ticket Details <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            {/* Card2 */}
            <div className="bg-white p-5 rounded-2xl  hover:shadow-[0_13px_27px_-5px_rgba(50,50,93,0.25),0_8px_16px_-8px_rgba(0,0,0,0.3)] transition-shadow duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="font-bold">Adele Concert</div>
                        <div className="font-semibold"># R123</div>
                    </div>
                    <div className="inline-flex items-center px-4 py-1 rounded-full bg-green-100 text-green-600">
                        Completed
                    </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="font-semibold">Order Date: </div>
                        <div className="font-semibold flex text-[#999999]">
                            Tue 30 Sep <Dot /> 7:30 PM
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="font-semibold">Total Paid: </div>
                        <div className="font-semibold flex text-[#999999]">$200</div>
                    </div>
                    <div className="flex gap-2">
                        <div className="font-semibold flex">
                            <Ticket className="mr-1" />
                            Tickets:{" "}
                        </div>
                        <div className="font-semibold flex text-[#999999]">2 tickets</div>
                    </div>
                    <div>
                        <Button
                            className="flex items-center gap-1 text-[#C14FE6] p-0 hover:cursor-pointer"
                            variant="link"
                        >
                            Ticket Details <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            {/* Card3 */}
            <div className="bg-white p-5 rounded-2xl hover:shadow-[0_13px_27px_-5px_rgba(50,50,93,0.25),0_8px_16px_-8px_rgba(0,0,0,0.3)] transition-shadow duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="font-bold">Adele Concert</div>
                        <div className="font-semibold"># R123</div>
                    </div>
                    <div className="inline-flex items-center px-4 py-1 rounded-full bg-green-100 text-green-600">
                        Completed
                    </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="font-semibold">Order Date: </div>
                        <div className="font-semibold flex text-[#999999]">
                            Tue 30 Sep <Dot /> 7:30 PM
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="font-semibold">Total Paid: </div>
                        <div className="font-semibold flex text-[#999999]">$200</div>
                    </div>
                    <div className="flex gap-2">
                        <div className="font-semibold flex">
                            <Ticket className="mr-1" />
                            Tickets:{" "}
                        </div>
                        <div className="font-semibold flex text-[#999999]">2 tickets</div>
                    </div>
                    <div>
                        <Button
                            className="flex items-center gap-1 text-[#C14FE6] p-0 hover:cursor-pointer"
                            variant="link"
                        >
                            Ticket Details <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketList;
