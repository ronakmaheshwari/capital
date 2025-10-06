"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

export default function CarouselComponent() {
  const banners = [
    "/assets/banner2.jpg",
    "/assets/banner4.jpg",
    "/assets/banner3.jpg",
    "/assets/banner1.png",
  ];

  return (
    <div className="flex justify-center items-center w-full">
      <Carousel
        className="w-full max-w-[1800px] mt-8"
        opts={{
          align: "center",
          loop: true,
        }}
      >
        <CarouselContent className="-ml-4">
          {banners.map((src, index) => (
            <CarouselItem
              key={index}
              className="pl-4 basis-[85%] sm:basis-[80%] md:basis-[70%] lg:basis-[65%] xl:basis-[60%]"
            >
              <div className="overflow-hidden rounded-lg shadow-md">
                <Image
                  src={src}
                  alt={`Banner ${index + 1}`}
                  width={1800}
                  height={380}
                  className="w-full h-[380px] object-cover rounded-lg"
                />

              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="!left-4 !bg-white/90 hover:!bg-black hover:!text-white !shadow-lg !rounded-full !w-12 !h-12 transition-all duration-300" />
        <CarouselNext className="!right-4 !bg-white/90 hover:!bg-black hover:!text-white !shadow-lg !rounded-full !w-12 !h-12 transition-all duration-300" />

      </Carousel>
    </div>
  );
}
