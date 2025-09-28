import { FaCcPaypal, FaGooglePay } from "react-icons/fa6";
import { LiaAmazonPay } from "react-icons/lia";
import { RiVisaFill } from "react-icons/ri";
import { SiApplepay, SiPaytm } from "react-icons/si";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const PaymentDetails = () => {
    return (
        <div className="h-[79vh] rounded-2xl bg-white py-5 px-10">
            <div className="flex flex-col gap-5">
                <div className="font-bold text-3xl text-[#482C52]">Payment Details</div>
                <Separator />
            </div>

            <div className="flex bg-white w-full ">
                <div className="flex flex-col gap-14 w-3/4">
                    <div className="flex gap-8 w-full mt-5">
                        <RiVisaFill className="text-4xl" />
                        <SiApplepay className="text-4xl" />
                        <FaGooglePay className="text-4xl" />
                        <SiPaytm className="text-4xl" />
                        <LiaAmazonPay className="text-4xl" />
                        <FaCcPaypal className="text-4xl" />
                    </div>
                    {/* Card details */}
                    <div className="w-3/4  space-y-4">
                        <p className="text-sm text-muted-foreground">
                            This credit card will be used by default for billing.
                        </p>

                        {/* Name on Card */}
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Name on card</Label>
                            <Input placeholder="Enter cardholder name" />
                        </div>

                        {/* Card Number */}
                        <div className="space-y-1 relative">
                            <Label className="text-muted-foreground text-xs">Card number</Label>
                            <Input className="pr-10" placeholder="1234 5678 9012 3456" />
                            {/* <CheckCircle className="absolute right-3 top-9 h-5 w-5 text-green-600" /> */}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Expiry */}
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs">Expiry</Label>
                                <Input placeholder="MM / YY" />
                            </div>

                            {/* CVC */}
                            <div className="space-y-1 relative">
                                <Label className="text-muted-foreground text-xs">CVC/CVV</Label>
                                <Input className="pr-10" placeholder="123" />
                                {/* <Eye className="absolute right-3 top-9 h-5 w-5 text-muted-foreground" /> */}
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div
                        className="relative rounded-2xl overflow-hidden w-104 h-64 bg-cover bg-center text-white"
                        style={{
                            backgroundImage: "url('/assets/Card.png')",
                        }}
                    >
                        {/* Name and Expiry */}
                        <div className="flex justify-between items-end absolute bottom-10 left-6 right-6">
                            <div className="flex flex-col">
                                <span className="text-xs uppercase">Card Holder</span>
                                <span className="font-semibold">John Doe</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs uppercase">Expires</span>
                                <span className="font-semibold">12/26</span>
                            </div>
                        </div>

                        {/* Last 4 digits */}
                        <div className="absolute top-31 right-20 text-xl">3456</div>
                    </div>
                    <div className="relative rounded-2xl w-104 h-54 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-600 transition-colors">
                        <span className="text-lg font-semibold">+ Add New Card</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentDetails;
