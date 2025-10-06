import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaTelegramPlane,
} from "react-icons/fa";

const Footer: FC = () => {
  const year: number = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="max-w-7xl mx-auto py-20">
        {/* Logo */}
        <div className="flex flex-col justify-center items-center w-full">
          <Image
            src="/assets/Eventique2.png"
            alt="Tagline"
            className="w-[200px] mt-2"
            width={300}
            height={50}
          />
        </div>

        {/* Navigation Links */}
        <div className="flex justify-center items-center mt-10 space-x-4">
          <Button variant="link" className="text-white">
            Home
          </Button>
          <Button variant="link" className="text-white">
            Contact
          </Button>
          <Button variant="link" className="text-white">
            About
          </Button>
          <Button variant="link" className="text-white">
            Privacy Policy
          </Button>
        </div>

        {/* Social Icons */}
        <div className="flex gap-4 p-6 justify-center">
          {[FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube, FaTelegramPlane].map(
            (Icon, index) => (
              <Button
                key={index}
                variant="ghost"
                className="bg-white text-black rounded-full w-12 h-12 p-0 flex items-center justify-center hover:bg-gray-200"
              >
                <Icon className="w-5 h-5" />
              </Button>
            )
          )}
        </div>

        {/* Separator */}
        <Separator className="bg-gray-700/50 mb-4" />

        {/* Footer Text */}
        <div className="text-center text-sm text-gray-400 mt-10">
          <p>
            Copyright © {year}{" "}
            <span className="text-white font-semibold">Eventique</span>. All
            rights reserved.
          </p>
          <p className="flex items-center justify-center gap-1 mt-1">
            Built with <span className="text-red-500">❤️</span> by the Eventique
            team
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
