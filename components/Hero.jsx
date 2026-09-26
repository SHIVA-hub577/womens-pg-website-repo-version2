import React from 'react';

export default function Hero() {
  return (
    <div className="relative w-full z-10 flex flex-col justify-center items-center text-center py-16 sm:py-24 lg:py-32 px-4 sm:px-8 my-auto">
      
      {/* Hero Content Center */}
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/95 border border-slate-200/90 shadow-sm px-5 py-2 rounded-full mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-sm sm:text-base">🏡</span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide">
            Women’s PG & Hostel Management
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#0b0f1a] leading-[1.15] mb-6">
          Smart Living,<br className="hidden sm:inline" />
          <span className="font-serif italic font-normal text-[#ef4d23] text-5xl sm:text-7xl lg:text-8xl ml-2">Management</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal mb-8 sm:mb-10">
          Manage rooms, track rent, handle complaints, and streamline hostel operations — all in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <a
            href="/admin/dashboard"
            className="w-full sm:w-auto bg-[#ef4d23] text-white font-bold text-base px-9 py-4 rounded-full shadow-xl shadow-[#ef4d23]/35 hover:bg-[#d93d15] hover:scale-105 active:scale-95 transition-all duration-200 text-center"
          >
            Explore Dashboard
          </a>
          <a
            href="#rooms"
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-[#0b0f1a] border border-slate-200/90 font-bold text-base px-9 py-4 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all duration-200 text-center"
          >
            View Rooms
          </a>
        </div>
      </div>
    </div>
  );
}
