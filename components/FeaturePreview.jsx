import React from 'react';

export default function FeaturePreview() {
  return (
    <div className="w-full max-w-6xl mx-auto mt-12 sm:mt-16 lg:mt-20 z-10 relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch text-left">
        
        {/* Card 1 — Room Overview */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:shadow-[#ef4d23]/10 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center font-semibold text-xl group-hover:scale-110 transition-transform">
                  🛏️
                </div>
                <div>
                  <h3 className="font-bold text-[#0b0f1a] text-lg leading-snug">Room Overview</h3>
                  <p className="text-xs text-slate-500 font-medium">Real-time Occupancy</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                6 Vacant
              </span>
            </div>

            {/* Capacity Stat Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Total Capacity</span>
                <span className="text-2xl font-extrabold text-[#0b0f1a]">48 <span className="text-xs text-slate-500 font-normal">Rooms</span></span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex mb-2">
                <div className="bg-[#ef4d23] h-full rounded-full" style={{ width: '87.5%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span className="text-[#ef4d23]">42 Occupied (87.5%)</span>
                <span className="text-emerald-600">6 Vacant (12.5%)</span>
              </div>
            </div>
          </div>

          {/* Sharing Configurations */}
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-3 uppercase tracking-wider">Sharing Configurations</span>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center hover:border-[#ef4d23]/50 transition-colors">
                <span className="text-xs font-extrabold text-[#0b0f1a] block">1-Share</span>
                <span className="text-[10px] text-slate-500 font-medium">Single</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center hover:border-[#ef4d23]/50 transition-colors">
                <span className="text-xs font-extrabold text-[#0b0f1a] block">2-Share</span>
                <span className="text-[10px] text-slate-500 font-medium">Double</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center hover:border-[#ef4d23]/50 transition-colors">
                <span className="text-xs font-extrabold text-[#0b0f1a] block">3-Share</span>
                <span className="text-[10px] text-slate-500 font-medium">Triple</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center hover:border-[#ef4d23]/50 transition-colors">
                <span className="text-xs font-extrabold text-[#0b0f1a] block">4-Share</span>
                <span className="text-[10px] text-slate-500 font-medium">Dorm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 — Rent Tracking */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:shadow-[#ef4d23]/10 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-semibold text-xl group-hover:scale-110 transition-transform">
                  💳
                </div>
                <div>
                  <h3 class="font-bold text-[#0b0f1a] text-lg leading-snug">Rent Tracking</h3>
                  <p className="text-xs text-slate-500 font-medium">Monthly Status • Sep 2026</p>
                </div>
              </div>
              <span className="bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> 4 Pending
              </span>
            </div>

            {/* Financial overview */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
              <div className="flex justify-between items-baseline mb-3">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Collected Rent</span>
                  <span className="text-2xl font-extrabold text-emerald-600">₹3,40,000</span>
                </div>
                <div className="text-right">
                  <span class="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Pending</span>
                  <span className="text-lg font-extrabold text-[#ef4d23]">₹42,000</span>
                </div>
              </div>

              {/* Status bar */}
              <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-slate-200 mb-1">
                <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: '82%' }}></div>
                <div className="bg-amber-400 h-full" style={{ width: '8%' }}></div>
                <div className="bg-[#ef4d23] h-full rounded-r-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>

          {/* Breakdown status indicators */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-slate-700">Paid: 38</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="text-xs font-bold text-slate-700">Partial: 2</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4d23]"></span>
              <span className="text-xs font-bold text-[#ef4d23]">Pending: 4</span>
            </div>
          </div>
        </div>

        {/* Card 3 — Complaints */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:shadow-[#ef4d23]/10 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-semibold text-xl group-hover:scale-110 transition-transform">
                  🛠️
                </div>
                <div>
                  <h3 className="font-bold text-[#0b0f1a] text-lg leading-snug">Complaints System</h3>
                  <p className="text-xs text-slate-500 font-medium">Issue Desk & Resolution</p>
                </div>
              </div>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                3 Active
              </span>
            </div>

            {/* Live complaint card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-bold text-[#0b0f1a]">Room 204 • AC Maintenance</span>
                <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md">
                  In-Progress
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Assigned to Electrician • Expected by 5:00 PM</p>
            </div>
          </div>

          {/* Metric counts */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-base font-extrabold text-[#ef4d23] block">1</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pending</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-base font-extrabold text-amber-600 block">2</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">In-Progress</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-base font-extrabold text-emerald-600 block">28</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Resolved</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
