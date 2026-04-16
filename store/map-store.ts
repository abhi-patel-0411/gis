import { create } from "zustand";

interface SelectedFeatureData {
  id: number;
  name: string;
  type: string;
  attributes: Record<string, any>;
}

interface MapStore {
  selectedFeature: SelectedFeatureData | null;
  activeBasemap: string;
  layerVisibility: Record<string, boolean>;
  isDrawingMode: boolean;
  // Actions
  setSelectedFeature: (feature: SelectedFeatureData | null) => void;
  setBasemap: (basemap: string) => void;
  toggleLayer: (layerId: string) => void;
  setDrawingMode: (active: boolean) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  selectedFeature: null,
  activeBasemap: "dark-gray-vector",
  layerVisibility: { assets: true, incidents: true, zones: false },
  isDrawingMode: false,
  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  setBasemap: (basemap) => set({ activeBasemap: basemap }),
  toggleLayer: (layerId) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layerId]: !state.layerVisibility[layerId],
      },
    })),
  setDrawingMode: (isDrawingMode) => set({ isDrawingMode }),
}));
