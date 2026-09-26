import React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 sm:p-5 lg:p-6 font-sans text-slate-800 antialiased selection:bg-[#ef4d23] selection:text-white">
      
      {/* Outer Hero Container */}
      <div className="relative w-full min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-40px)] overflow-hidden bg-[#f5f2ee] rounded-3xl border border-black/5 shadow-2xl flex flex-col justify-between pb-10">
        
        {/* Soft Hostel / Living Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 mix-blend-multiply"
          style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        ></div>

        {/* Light Overlay for Crisp Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-transparent"></div>

        {/* Ambient Glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-br from-[#ef4d23]/15 via-amber-200/25 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        {/* Floating Navbar */}
        <Navbar />

        {/* Center Hero Content & Feature Preview */}
        <Hero />
      </div>
    </div>
  );
}
