"use client";

import { useState } from "react";

import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Database,
  Eraser,
  Eye,
  EyeOff,
  Info,
  Layers,
  Loader2,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import { rendererPresets } from "./SimpleRendererControls";

interface SidebarProps {
  isMapLoaded: boolean;
  isLayerVisible: boolean;
  onToggleLayer: () => void;
  onApplySimpleRenderer: (preset: string) => void;
  onApplyUniqueValueRenderer: () => void;
  onApplyClassBreaksRenderer: () => void;
  onClearRenderer: () => void;
  selectedPreset: string | null;
  activeAdvancedRenderer: "unique" | "class" | null;
  popupEnabled: boolean;
  onTogglePopups: () => void;
  tileLayerVisible: boolean;
  vectorTileLayerVisible: boolean;
  onToggleTileLayer: () => void;
  onToggleVectorTileLayer: () => void;
  markerCount: number;
  onAddRandomMarker: () => void;
  onClearGraphics: () => void;
  onQueryTopFeatures: () => void;
  onQueryVisibleCount: () => void;
  querySummary: string;
}

const featureGuide = [
  {
    title: "Feature Layer",
    description: "Show or hide the earthquake layer on the map.",
  },
  {
    title: "Renderers",
    description:
      "Change how points look using simple symbols, unique values, or class breaks.",
  },
  {
    title: "Popups",
    description:
      'Enable or disable popup cards and the "View Details" action button.',
  },
  {
    title: "Graphics Layer",
    description:
      "Add temporary random markers for quick annotation, then clear them.",
  },
  {
    title: "Tile Layers",
    description:
      "Overlay raster or vector tile reference layers on top of the map.",
  },
  {
    title: "Layer Queries",
    description:
      "Highlight top features by numeric value and count features in the current view.",
  },
  {
    title: "Status Message",
    description:
      "The summary at the bottom tells you what the last action did.",
  },
];

export default function Sidebar({
  isMapLoaded,
  isLayerVisible,
  onToggleLayer,
  onApplySimpleRenderer,
  onApplyUniqueValueRenderer,
  onApplyClassBreaksRenderer,
  onClearRenderer,
  selectedPreset,
  activeAdvancedRenderer,
  popupEnabled,
  onTogglePopups,
  tileLayerVisible,
  vectorTileLayerVisible,
  onToggleTileLayer,
  onToggleVectorTileLayer,
  markerCount,
  onAddRandomMarker,
  onClearGraphics,
  onQueryTopFeatures,
  onQueryVisibleCount,
  querySummary,
}: SidebarProps) {
  const [isGuideExpanded, setIsGuideExpanded] = useState(true);

  const actionBaseClass =
    "w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold transition";

  return (
    <aside className="flex h-full w-full flex-col border-b border-slate-200 bg-linear-to-b from-slate-50 to-white shadow-sm lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold tracking-wide text-slate-900">
            ArcGIS Control Center
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          CDN-powered renderers, popups, graphics, and layer analysis.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {!isMapLoaded && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Initializing map services...
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Layers className="h-4 w-4" />
            Feature Layer
          </div>

          <button
            type="button"
            disabled={!isMapLoaded}
            onClick={onToggleLayer}
            className={`${actionBaseClass} ${
              isLayerVisible
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            } ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span>Earthquake Feature Layer</span>
              {isLayerVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </div>
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Sparkles className="h-4 w-4" />
            Renderers
          </div>

          <div className="space-y-2">
            {Object.keys(rendererPresets).map((key) => {
              const isActive =
                selectedPreset === key && !activeAdvancedRenderer;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!isMapLoaded}
                  onClick={() => onApplySimpleRenderer(key)}
                  className={`${actionBaseClass} ${
                    isActive
                      ? "border-blue-300 bg-blue-100 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                  } ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span className="capitalize">Simple: {key}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onApplyUniqueValueRenderer}
              className={`${actionBaseClass} ${
                activeAdvancedRenderer === "unique"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
              } ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <div className="flex items-center gap-1">
                <Tags className="h-3.5 w-3.5" />
                Unique Value
              </div>
            </button>

            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onApplyClassBreaksRenderer}
              className={`${actionBaseClass} ${
                activeAdvancedRenderer === "class"
                  ? "border-orange-300 bg-orange-100 text-orange-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50"
              } ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                Class Breaks
              </div>
            </button>
          </div>

          <button
            type="button"
            disabled={!isMapLoaded}
            onClick={onClearRenderer}
            className={`${actionBaseClass} mt-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <div className="flex items-center gap-1">
              <Eraser className="h-3.5 w-3.5" />
              Clear Renderer
            </div>
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <MessageSquare className="h-4 w-4" />
            Popups
          </div>

          <button
            type="button"
            disabled={!isMapLoaded}
            onClick={onTogglePopups}
            className={`${actionBaseClass} ${
              popupEnabled
                ? "border-violet-300 bg-violet-100 text-violet-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            } ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {popupEnabled ? "Disable Popup Cards" : "Enable Popup Cards"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <MapPin className="h-4 w-4" />
            Graphics Layer
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onAddRandomMarker}
              className={`${actionBaseClass} border-slate-200 bg-white text-slate-700 hover:border-pink-200 hover:bg-pink-50 ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Add Marker
            </button>
            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onClearGraphics}
              className={`${actionBaseClass} border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Clear Markers
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Marker count: <span className="font-semibold">{markerCount}</span>
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Database className="h-4 w-4" />
            Tile Layers
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onToggleTileLayer}
              className={`${actionBaseClass} ${
                tileLayerVisible
                  ? "border-cyan-300 bg-cyan-100 text-cyan-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50"
              } ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Raster Tile
            </button>

            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onToggleVectorTileLayer}
              className={`${actionBaseClass} ${
                vectorTileLayerVisible
                  ? "border-teal-300 bg-teal-100 text-teal-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50"
              } ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Vector Tile
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Search className="h-4 w-4" />
            Layer Queries
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onQueryTopFeatures}
              className={`${actionBaseClass} border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Query Top 50
            </button>

            <button
              type="button"
              disabled={!isMapLoaded}
              onClick={onQueryVisibleCount}
              className={`${actionBaseClass} border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 ${!isMapLoaded ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Count In View
            </button>
          </div>

          <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
            {querySummary}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <button
            type="button"
            onClick={() => setIsGuideExpanded((value) => !value)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Info className="h-4 w-4" />
              Feature Guide
            </div>
            {isGuideExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {isGuideExpanded && (
            <div className="mt-3 space-y-2">
              {featureGuide.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                >
                  <p className="text-xs font-semibold text-slate-700">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
