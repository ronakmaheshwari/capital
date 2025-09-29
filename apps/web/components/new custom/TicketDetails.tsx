import { Armchair, ArrowLeft, Calendar, Download, History, MapPin } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const TicketDetails = () => {
    return (
        <div className="flex flex-col gap-5 bg-white h-[79vh] rounded-2xl px-10 py-5">
            <Button
                className="flex justify-start transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                variant="link"
            >
                <ArrowLeft className="!w-[20px] !h-[20px]" />
                Back to Ticket
            </Button>

            <div className="flex w-full">
                <div className="flex flex-col items-center jutify-center gap-2">
                    <div className="w-48 h-48 rounded-2xl overflow-hidden">
                        <Image
                            alt="Logo"
                            className="object-cover w-full h-full"
                            height={192}
                            src="/assets/E-singer2.png"
                            width={192}
                        />
                    </div>

                    <div className="font-bold text-2xl">Adele Concert</div>
                </div>

                <div className="flex flex-col justify-start w-full  gap-18 px-5 my-2 ">
                    <div className="flex w-full justify-between items-center">
                        <div className="font-bold text-3xl text-[#482C52]">Order Details</div>
                        <div className="flex gap-2">
                            <Button className="flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer">
                                <History className="!w-[20px] !h-[20px]" />
                                Back to Ticket
                            </Button>
                            <Button
                                className="flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer"
                                variant="outline"
                            >
                                <Download className="!w-[20px] !h-[20px]" />
                                Download
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-bold text-lg">Order Tracking Code</div>
                            <div className="text-lg"># R123</div>
                        </div>
                        <div>
                            <div className="font-bold text-lg">Order Date</div>
                            <div className="text-lg">Fri 16 Oct - 13:57 PM</div>
                        </div>

                        <Badge className="bg-green-50 text-green-600 font-semibold text-md">
                            Success
                        </Badge>
                    </div>
                </div>
            </div>

            <Separator />
            {/* Event Details */}
            <div className="p-0">
                <h2 className="text-[#482C52] text-xl font-bold mb-4">Event Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-2 text-gray-900">
                            <MapPin size={18} /> <span className="font-semibold">Location</span>
                        </div>
                        <p className="text-gray-400 font-medium">American Airlines Center</p>
                        <p className="text-gray-400 text-sm">Dallas, Texas, USA</p>
                    </div>

                    <div className="flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-2 text-gray-900">
                            <Calendar size={18} /> <span className="font-semibold">Event Date</span>
                        </div>
                        <p className="text-gray-400 font-medium">Tue 30 Sep • 7:30 PM</p>
                    </div>

                    <div className="flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-2 text-gray-900">
                            <Armchair size={18} />{" "}
                            <span className="font-semibold">Selected Seat</span>
                        </div>
                        <p className="text-gray-400 font-medium">
                            Section 324 • Row T • Seats 29-30
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="p-0">
                <h2 className="text-[#482C52] text-xl font-bold mb-4">Payment</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex flex-col space-y-1">
                        <span className="font-semibold">Ticket count</span>
                        <span className="text-gray-400 text-sm">2 tickets</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="font-semibold">Transaction costs</span>
                        <span className="text-gray-400 text-sm">$20</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="font-semibold">Total paid</span>
                        <span className="text-gray-400 text-sm">$260</span>
                    </div>
                    <div className="flex justify-center items-center">
                        <img alt="QR Code" className="w-20 h-20" src="/assets/qr-code.png" />
                    </div>

                    <div className="flex flex-col space-y-1 mt-4">
                        <span className="font-semibold">Paid by</span>
                        <span className="text-gray-400 text-sm">Negar khosravi</span>
                    </div>
                    <div className="flex flex-col space-y-1 mt-4">
                        <span className="font-semibold">Payment method</span>
                        <span className="text-gray-400 text-sm">Stripe</span>
                    </div>
                    <div className="flex flex-col space-y-1 mt-4">
                        <span className="font-semibold">Transaction ID</span>
                        <span className="text-gray-400 text-sm">7984-KJD8-3827</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetails;
