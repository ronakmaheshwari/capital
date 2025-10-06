import Image from "next/image"

const Banner = () => {
  return (
      <div className="relative w-full my-20">
        <Image
          src="/assets/show-banner.png"
          alt="Banner"
          className="w-full h-auto object-cover"
          width={1920}
          height={600}
        />
        <div className="absolute inset-0 bg-black opacity-50"></div>

        <div className=" max-w-7xl">
            <div className="absolute top-1/3 left-68">
          <h1 className="text-4xl font-bold text-white">Start exploring events today!</h1>
          <p className="text-xl text-[#999999] mt-4">
            Find concerts, shows, and more near you.
          </p>
          <a href="/events">
            <button className="bg-[#d46cf6] text-white py-3 px-14 mt-4 rounded-lg hover:bg-[#B06BCF] transition duration-300">
              Start
            </button>
          </a>
        </div>
        </div>
      </div>
  )
}

export default Banner

