import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";

const Navbar = () => {
    return (
        <div className="flex justify-between items-center w-full bg-white px-6 py-3 rounded-2xl my-10">
            {/* Left: Search */}
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <Input className="pl-10 bg-gray-100" placeholder="Search..." type="text" />
            </div>

            {/* Right: Bell + Avatar */}
            <div className="flex justify-center items-center gap-3">
                <Button className="flex items-center justify-center transition-colors hover:text-[#D580F2] hover:cursor-pointer bg-black rounded-full w-10 h-10">
                    <Bell className="w-5 h-5 text-white" />
                </Button>

                <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
            </div>
        </div>
    );
};

export default Navbar;
