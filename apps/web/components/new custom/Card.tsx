import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

const MovieCarousel = () => {
  const movies = [
  { src: "/assets/movie5.jpg", title: "The Last Horizon", genre: "Action" },
  { src: "/assets/movie2.jpg", title: "Whisper of Time", genre: "Drama" },
  { src: "/assets/movie3.jpg", title: "Nightfall", genre: "Thriller" },
  { src: "/assets/movie4.jpg", title: "Laugh Out Loud", genre: "Comedy" },
  { src: "/assets/movie5.jpg", title: "Romantic Escape", genre: "Romance" },
  { src: "/assets/movie2.jpg", title: "Galactic Quest", genre: "Sci-Fi" },
  { src: "/assets/movie3.jpg", title: "Mystery Manor", genre: "Mystery" },
  { src: "/assets/movie4.jpg", title: "Hero's Return", genre: "Adventure" },
  { src: "/assets/movie5.jpg", title: "Soulful Strings", genre: "Musical" },
  { src: "/assets/movie3.jpg", title: "Haunted Nights", genre: "Horror" },
];


  return (
    <section className="w-full max-w-[1200px] mx-auto mt-10 px-4">
      <h2 className="text-2xl font-semibold mb-6">Recommended Movies</h2>

      <Carousel className="w-full">
        <CarouselContent>
          {movies.map((movie, index) => (
            <CarouselItem
              key={index}
              className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pl-4"
            >
              <div className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer w-[222px] h-[378px]">
                <img
                  src={movie.src}
                  alt={movie.title}
                  className="object-cover rounded-xl transition-transform duration-500 hover:scale-105 w-[222px] h-[378px]"
                />
                <Image
                  src={movie.src}
                  alt={movie.title}
                  className="object-cover rounded-xl transition-transform duration-500 hover:scale-105 "
                  width={222}
                  height={378}
                />
                
              </div>
              <div className="p-2">
                  <h3 className="text-lg text-black font-medium">{movie.title}</h3>
                  <p className="text-sm text-gray-500">{movie.genre}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="!left-4 !bg-white/90 hover:!bg-black hover:!text-white !shadow-lg !rounded-full !w-10 !h-10 transition-all duration-300" />
        <CarouselNext className="!right-4 !bg-white/90 hover:!bg-black hover:!text-white !shadow-lg !rounded-full !w-10 !h-10 transition-all duration-300" />
      </Carousel>
    </section>
  );
};

export default MovieCarousel;
