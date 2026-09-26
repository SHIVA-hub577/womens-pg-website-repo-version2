import React, { useState } from 'react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="relative z-50 w-full max-w-5xl mx-auto pt-4 px-3 sm:px-6">
      {/* Floating Centered Glass Pill Navbar */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/80 shadow-xl shadow-slate-900/5 rounded-full px-5 sm:px-7 py-3 flex items-center justify-between transition-all">
        
        {/* Left: Brand Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#ef4d23]/10 flex items-center justify-center text-[#ef4d23] group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="font-bold text-lg sm:text-xl text-[#0b0f1a] tracking-tight">
            Pujyasritha's <span className="text-[#ef4d23]">Living</span>
          </span>
        </a>

        {/* Center: Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <a href="/" className="text-sm font-semibold text-[#0b0f1a] hover:text-[#ef4d23] transition-colors">
            Home
          </a>
          <a href="#rooms" className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] transition-colors">
            Rooms
          </a>
          <a href="#residents" className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] transition-colors">
            Residents
          </a>
          <a href="#payments" className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] transition-colors">
            Payments
          </a>
          <a href="#complaints" className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] transition-colors">
            Complaints
          </a>
        </div>

        {/* Right: Auth & CTA Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/admin/login"
            className="bg-[#0b0f1a] text-white hover:bg-slate-800 text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md"
          >
            Admin Login
          </a>
          <a
            href="/login"
            className="bg-[#ef4d23] text-white hover:bg-[#d93d15] text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-full shadow-md shadow-[#ef4d23]/30 transition-all hover:scale-105"
          >
            Get Started
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:text-[#ef4d23] focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-3 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
          <a
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#0b0f1a] hover:text-[#ef4d23] py-2 border-b border-slate-100"
          >
            Home
          </a>
          <a
            href="#rooms"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] py-2 border-b border-slate-100"
          >
            Rooms
          </a>
          <a
            href="#residents"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] py-2 border-b border-slate-100"
          >
            Residents
          </a>
          <a
            href="#payments"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] py-2 border-b border-slate-100"
          >
            Payments
          </a>
          <a
            href="#complaints"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-600 hover:text-[#ef4d23] py-2 border-b border-slate-100"
          >
            Complaints
          </a>
          
          <div className="flex flex-col gap-2.5 pt-2">
            <a
              href="/admin/login"
              className="w-full text-center bg-[#0b0f1a] text-white hover:bg-slate-800 text-sm font-semibold py-3 rounded-full transition-all"
            >
              Admin Login
            </a>
            <a
              href="/login"
              className="w-full text-center bg-[#ef4d23] text-white hover:bg-[#d93d15] text-sm font-semibold py-3 rounded-full shadow-md shadow-[#ef4d23]/25 transition-all"
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
