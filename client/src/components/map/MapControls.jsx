import React from 'react';
import { Navigation2, Plus, Minus, RotateCcw, Compass, Layers } from 'lucide-react';

export default function MapControls({
  onLocateMe,
  onZoomIn,
  onZoomOut,
  onResetMap,
  onToggle3D,
  is3dActive = false,
  onToggleLegend,
  isLegendOpen = false,
  showLegendToggle = true,
}) {
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
      {onLocateMe && (
        <button
          type="button"
          onClick={onLocateMe}
          title="Locate Me (Center on GPS)"
          className="p-2.5 sm:p-3 bg-white/95 hover:bg-white text-purple-600 hover:text-purple-700 border border-slate-200 rounded-2xl shadow-lg backdrop-blur-md transition-all active:scale-95 group focus:outline-none cursor-pointer"
        >
          <Navigation2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      <div className="flex flex-col bg-white/95 border border-slate-200 rounded-2xl shadow-lg backdrop-blur-md overflow-hidden">
        {onZoomIn && (
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In"
            className="p-2.5 sm:p-3 text-slate-700 hover:text-purple-600 hover:bg-slate-50 border-b border-slate-100 transition-colors active:scale-95 focus:outline-none cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        {onZoomOut && (
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-2.5 sm:p-3 text-slate-700 hover:text-purple-600 hover:bg-slate-50 transition-colors active:scale-95 focus:outline-none cursor-pointer"
          >
            <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {onToggle3D && (
        <button
          type="button"
          onClick={onToggle3D}
          title={is3dActive ? 'Switch to 2D Top-Down View' : 'Switch to 3D Isometric View'}
          className={`p-2.5 sm:p-3 bg-white/95 hover:bg-white border rounded-2xl shadow-lg backdrop-blur-md transition-all active:scale-95 focus:outline-none cursor-pointer ${
            is3dActive
              ? 'text-purple-600 border-purple-300 bg-purple-50/80 shadow-purple-100'
              : 'text-slate-600 border-slate-200'
          }`}
        >
          <Compass className={`w-4 h-4 sm:w-5 sm:h-5 ${is3dActive ? 'animate-pulse text-purple-600' : ''}`} />
        </button>
      )}

      {onResetMap && (
        <button
          type="button"
          onClick={onResetMap}
          title="Reset Map Orientation & View"
          className="p-2.5 sm:p-3 bg-white/95 hover:bg-white text-slate-700 hover:text-purple-600 border border-slate-200 rounded-2xl shadow-lg backdrop-blur-md transition-all active:scale-95 focus:outline-none cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {showLegendToggle && onToggleLegend && (
        <button
          type="button"
          onClick={onToggleLegend}
          title="Toggle Territory Legend"
          className={`p-2.5 sm:p-3 bg-white/95 hover:bg-white border rounded-2xl shadow-lg backdrop-blur-md transition-all active:scale-95 focus:outline-none cursor-pointer ${
            isLegendOpen
              ? 'text-purple-600 border-purple-300 bg-purple-50'
              : 'text-slate-600 border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}
    </div>
  );
}
