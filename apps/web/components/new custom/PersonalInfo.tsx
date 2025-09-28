import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PersonalInfo = () => {
    return (
        <div className="bg-white py-5 px-10 h-[79vh] rounded-2xl">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage alt="profile" src="https://i.pravatar.cc/300" />
                            <AvatarFallback>N</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-semibold">Hey Negar!</h2>
                            <p className="text-sm text-muted-foreground">Negarkhosravi@yahoo.com</p>
                        </div>
                    </div>
                    <Button variant="outline">Edit</Button>
                </div>

                {/* Form */}
                <form className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input placeholder="Negar" />
                    </div>

                    <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input placeholder="Khosravi" />
                    </div>

                    <div className="space-y-2 col-span-2">
                        <Label>Email</Label>
                        <Input placeholder="example@mail.com" type="email" />
                    </div>

                    <div className="space-y-2">
                        <Label>City</Label>
                        <Input placeholder="Enter city" />
                    </div>

                    <div className="space-y-2">
                        <Label>State</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="california">California</SelectItem>
                                <SelectItem value="newyork">New York</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Date of birth</Label>
                        <Input type="date" />
                    </div>

                    <div className="space-y-2">
                        <Label>Zip code</Label>
                        <Input placeholder="000000" />
                    </div>

                    <div className="space-y-2 col-span-2">
                        <Label>Phone</Label>
                        <div className="flex gap-2">
                            <Select defaultValue="+1">
                                <SelectTrigger className="w-20">
                                    <SelectValue placeholder="+1" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="+1">+1</SelectItem>
                                    <SelectItem value="+91">+91</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input placeholder="5588 554 88" />
                        </div>
                    </div>
                </form>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Button variant="outline">Discard</Button>
                    <Button className="bg-[#C14FE6] hover:cursor-pointer text-white">
                        Save changes
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PersonalInfo;
