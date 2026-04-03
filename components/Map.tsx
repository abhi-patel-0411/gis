/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { loadModules } from "esri-loader";
import Sidebar from "./Sidebar";
import {
  applyClassBreaksRenderer,
  applySimpleRenderer,
  applyUniqueValueRenderer,
  clearPopupTemplate,
  findBestNumericField,
  removeSimpleRenderer,
  rendererPresets,
  setProfessionalPopupTemplate,
} from "./SimpleRendererControls";

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  basemap?: string;
}

const CDN_OPTIONS = { css: false, url: "https://js.arcgis.com/4.31/" };
const EARTHQUAKE_LAYER_URL =
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USGS_Seismic_Data_v1/FeatureServer/0";
const RASTER_TILE_URL =
  "https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer";
const VECTOR_TILE_URL =
  "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer";
const DEFAULT_CENTER: [number, number] = [-74.006, 40.7128];

export default function MapComponent({
  center = DEFAULT_CENTER,
  zoom = 12,
  basemap = "streets-navigation-vector",
}: MapComponentProps) {
  const router = useRouter();

  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const layerInstanceRef = useRef<any>(null);
  const graphicsLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const vectorTileLayerRef = useRef<any>(null);
  const popupActionHandleRef = useRef<any>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLayerVisible, setIsLayerVisible] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [activeAdvancedRenderer, setActiveAdvancedRenderer] = useState<
    "unique" | "class" | null
  >(null);
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [tileLayerVisible, setTileLayerVisible] = useState(false);
  const [vectorTileLayerVisible, setVectorTileLayerVisible] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [querySummary, setQuerySummary] = useState(
    "Map ready. Use query tools from the sidebar.",
  );

  const centerLon = center[0];
  const centerLat = center[1];

  const attachPopupActionHandler = useCallback(
    (view: any) => {
      const popup = view?.popup;
      const popupEventSource =
        popup && typeof popup.on === "function"
          ? popup
          : popup?.viewModel && typeof popup.viewModel.on === "function"
            ? popup.viewModel
            : null;

      if (!popupEventSource) {
        return;
      }

      if (popupActionHandleRef.current) {
        popupActionHandleRef.current.remove();
      }

      popupActionHandleRef.current = popupEventSource.on(
        "trigger-action",
        (event: any) => {
          if (event.action.id !== "view-details") {
            return;
          }

          const attrs = view.popup.selectedFeature?.attributes ?? {};
          const id = attrs.OBJECTID ?? attrs.objectid ?? attrs.id ?? "unknown";
          router.push(`/details/${id}`);
        },
      );
    },
    [router],
  );

  const toggleVisibilityWithSummary = useCallback(
    (
      layer: any,
      setVisible: (visible: boolean) => void,
      layerLabel: string,
    ) => {
      if (!layer) return;

      const visible = !layer.visible;
      layer.visible = visible;
      setVisible(visible);
      setQuerySummary(`${layerLabel} ${visible ? "enabled" : "disabled"}.`);
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        if (isMounted) {
          setIsMapLoaded(false);
          setQuerySummary("Initializing map services...");
        }

        const [
          Map,
          MapView,
          FeatureLayer,
          GraphicsLayer,
          TileLayer,
          VectorTileLayer,
        ] = (await loadModules(
          [
            "esri/Map",
            "esri/views/MapView",
            "esri/layers/FeatureLayer",
            "esri/layers/GraphicsLayer",
            "esri/layers/TileLayer",
            "esri/layers/VectorTileLayer",
          ],
          CDN_OPTIONS,
        )) as any[];

        if (!isMounted || !mapRef.current) return;

        const featureLayer = new FeatureLayer({
          url: EARTHQUAKE_LAYER_URL,
          id: "earthquakes-layer",
          title: "Earthquakes",
          outFields: ["*"],
          visible: true,
          opacity: 0.9,
        });

        const graphicsLayer = new GraphicsLayer({
          id: "temporary-graphics-layer",
          title: "Temporary Graphics",
        });

        const tileLayer = new TileLayer({
          url: RASTER_TILE_URL,
          title: "World Topo (Raster Tiles)",
          visible: false,
          opacity: 0.65,
        });

        const vectorTileLayer = new VectorTileLayer({
          url: VECTOR_TILE_URL,
          title: "World Streets (Vector Tiles)",
          visible: false,
          opacity: 0.75,
        });

        const map = new Map({
          basemap,
          layers: [featureLayer, graphicsLayer, tileLayer, vectorTileLayer],
        });

        const view = new MapView({
          container: mapRef.current,
          map,
          center: [centerLon, centerLat],
          zoom,
        });

        await view.when();
        await featureLayer.load();

        if (!isMounted) {
          view.destroy();
          return;
        }

        viewRef.current = view;
        layerInstanceRef.current = featureLayer;
        graphicsLayerRef.current = graphicsLayer;
        tileLayerRef.current = tileLayer;
        vectorTileLayerRef.current = vectorTileLayer;

        setProfessionalPopupTemplate(featureLayer);
        attachPopupActionHandler(view);

        setIsMapLoaded(true);
        setIsLayerVisible(true);
        setPopupEnabled(true);
        setTileLayerVisible(false);
        setVectorTileLayerVisible(false);
        setMarkerCount(0);
        setQuerySummary(
          "Map loaded. You can now style, query, and annotate data.",
        );
      } catch (err) {
        console.error("Failed to initialize map:", err);
        if (isMounted) {
          setIsMapLoaded(false);
          setQuerySummary(
            "Map initialization failed. Please refresh the page.",
          );
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (popupActionHandleRef.current) {
        popupActionHandleRef.current.remove();
        popupActionHandleRef.current = null;
      }
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [attachPopupActionHandler, basemap, centerLat, centerLon, zoom]);

  const toggleLayer = () => {
    toggleVisibilityWithSummary(
      layerInstanceRef.current,
      setIsLayerVisible,
      "Feature layer",
    );
  };

  const applySimpleRendererPreset = async (preset: string) => {
    const layer = layerInstanceRef.current;
    if (!layer) return;

    try {
      if (selectedPreset === preset && !activeAdvancedRenderer) {
        removeSimpleRenderer(layer);
        setSelectedPreset(null);
        setQuerySummary("Renderer reset to default.");
        return;
      }

      const presetConfig =
        rendererPresets[preset as keyof typeof rendererPresets];
      if (!presetConfig) return;

      const success = await applySimpleRenderer(layer, {
        symbolType: presetConfig.symbolType,
        color: presetConfig.color,
        size: presetConfig.size,
      });

      if (success) {
        setSelectedPreset(preset);
        setActiveAdvancedRenderer(null);
        setQuerySummary(`SimpleRenderer applied: ${preset}.`);
        return;
      }

      setQuerySummary("Unable to apply SimpleRenderer.");
    } catch (err) {
      console.error("Failed to apply SimpleRenderer preset:", err);
      setQuerySummary("Unable to apply SimpleRenderer.");
    }
  };

  const applyUniqueRenderer = async () => {
    const layer = layerInstanceRef.current;
    if (!layer) return;

    try {
      const success = await applyUniqueValueRenderer(layer);
      if (!success) {
        setQuerySummary("Unable to apply UniqueValueRenderer.");
        return;
      }

      setActiveAdvancedRenderer("unique");
      setSelectedPreset(null);
      setQuerySummary(
        "UniqueValueRenderer applied using STATUS/category values.",
      );
    } catch (err) {
      console.error("Failed to apply UniqueValueRenderer:", err);
      setQuerySummary("Unable to apply UniqueValueRenderer.");
    }
  };

  const applyClassBreakRenderer = async () => {
    const layer = layerInstanceRef.current;
    if (!layer) return;

    try {
      const field = findBestNumericField(layer);
      const success = await applyClassBreaksRenderer(layer, field ?? undefined);
      if (!success) {
        setQuerySummary("No numeric field found for ClassBreaksRenderer.");
        return;
      }

      setActiveAdvancedRenderer("class");
      setSelectedPreset(null);
      setQuerySummary(
        `ClassBreaksRenderer applied on ${field ?? "numeric field"}.`,
      );
    } catch (err) {
      console.error("Failed to apply ClassBreaksRenderer:", err);
      setQuerySummary("Unable to apply ClassBreaksRenderer.");
    }
  };

  const clearRenderer = () => {
    const layer = layerInstanceRef.current;
    if (!layer) return;

    removeSimpleRenderer(layer);
    setSelectedPreset(null);
    setActiveAdvancedRenderer(null);
    setQuerySummary("Renderer cleared to service default style.");
  };

  const togglePopups = () => {
    const layer = layerInstanceRef.current;
    const view = viewRef.current;
    if (!layer || !view) return;

    if (popupEnabled) {
      clearPopupTemplate(layer);
      if (popupActionHandleRef.current) {
        popupActionHandleRef.current.remove();
        popupActionHandleRef.current = null;
      }
      if (view.popup && typeof view.popup.close === "function") {
        view.popup.close();
      }
      setPopupEnabled(false);
      setQuerySummary("Popups disabled.");
      return;
    }

    setProfessionalPopupTemplate(layer);
    attachPopupActionHandler(view);
    setPopupEnabled(true);
    setQuerySummary("Popups enabled with detail action.");
  };

  const addRandomMarker = async () => {
    const graphicsLayer = graphicsLayerRef.current;
    const view = viewRef.current;
    if (!graphicsLayer || !view) return;

    try {
      const [Graphic, Point, SimpleMarkerSymbol] = (await loadModules(
        [
          "esri/Graphic",
          "esri/geometry/Point",
          "esri/symbols/SimpleMarkerSymbol",
        ],
        CDN_OPTIONS,
      )) as any[];

      const lon = view.center.longitude + (Math.random() - 0.5) * 0.6;
      const lat = view.center.latitude + (Math.random() - 0.5) * 0.6;

      const point = new Point({ longitude: lon, latitude: lat });
      const symbol = new SimpleMarkerSymbol({
        style: "diamond",
        color: [255, 64, 129, 0.9],
        size: 14,
        outline: { color: [255, 255, 255, 1], width: 2 },
      });

      const markerName = `Marker ${graphicsLayer.graphics.length + 1}`;
      const graphic = new Graphic({
        geometry: point,
        symbol,
        attributes: {
          name: markerName,
          created: new Date().toLocaleString(),
        },
        popupTemplate: {
          title: "{name}",
          content: "Created at {created}",
        },
      });

      graphicsLayer.add(graphic);
      setMarkerCount(graphicsLayer.graphics.length);
      setQuerySummary("Temporary marker added to GraphicsLayer.");
    } catch (err) {
      console.error("Failed to add temporary marker:", err);
      setQuerySummary("Unable to add a marker right now.");
    }
  };

  const clearGraphics = () => {
    const graphicsLayer = graphicsLayerRef.current;
    if (!graphicsLayer) return;

    graphicsLayer.removeAll();
    setMarkerCount(0);
    setQuerySummary("GraphicsLayer cleared.");
  };

  const toggleTileLayer = () => {
    toggleVisibilityWithSummary(
      tileLayerRef.current,
      setTileLayerVisible,
      "Raster tile layer",
    );
  };

  const toggleVectorTileLayer = () => {
    toggleVisibilityWithSummary(
      vectorTileLayerRef.current,
      setVectorTileLayerVisible,
      "Vector tile layer",
    );
  };

  const queryTopFeatures = async () => {
    const layer = layerInstanceRef.current;
    const graphicsLayer = graphicsLayerRef.current;
    if (!layer || !graphicsLayer) return;

    try {
      const field = findBestNumericField(layer);
      if (!field) {
        setQuerySummary("No suitable numeric field available for querying.");
        return;
      }

      const query = layer.createQuery();
      query.where = `${field} IS NOT NULL`;
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.orderByFields = [`${field} DESC`];
      query.num = 50;

      const result = await layer.queryFeatures(query);
      graphicsLayer.removeAll();

      if (result.features.length) {
        const [SimpleMarkerSymbol] = (await loadModules(
          ["esri/symbols/SimpleMarkerSymbol"],
          CDN_OPTIONS,
        )) as any[];

        const symbol = new SimpleMarkerSymbol({
          style: "circle",
          color: [79, 70, 229, 0.85],
          size: 10,
          outline: { color: [255, 255, 255, 1], width: 1.5 },
        });

        const highlights = result.features.map((feature: any) => {
          const clone = feature.clone();
          clone.symbol = symbol;
          if (!clone.popupTemplate) {
            clone.popupTemplate = {
              title: "Query Result",
              content: `${field}: {${field}}`,
            };
          }
          return clone;
        });

        graphicsLayer.addMany(highlights);
      }

      setMarkerCount(graphicsLayer.graphics.length);
      setQuerySummary(`Top ${result.features.length} features by ${field}.`);
    } catch (err) {
      console.error("Failed to query top features:", err);
      setQuerySummary("Unable to run top feature query right now.");
    }
  };

  const queryVisibleCount = async () => {
    const layer = layerInstanceRef.current;
    const view = viewRef.current;
    if (!layer || !view) return;

    try {
      const query = layer.createQuery();
      query.geometry = view.extent;
      query.spatialRelationship = "intersects";
      query.returnGeometry = false;

      const count = await layer.queryFeatureCount(query);
      setQuerySummary(`Found ${count} features in the current map extent.`);
    } catch (err) {
      console.error("Failed to query visible feature count:", err);
      setQuerySummary("Unable to count features in the current view.");
    }
  };

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:h-170 lg:flex-row">
      <Sidebar
        isMapLoaded={isMapLoaded}
        isLayerVisible={isLayerVisible}
        onToggleLayer={toggleLayer}
        onApplySimpleRenderer={applySimpleRendererPreset}
        onApplyUniqueValueRenderer={applyUniqueRenderer}
        onApplyClassBreaksRenderer={applyClassBreakRenderer}
        onClearRenderer={clearRenderer}
        selectedPreset={selectedPreset}
        activeAdvancedRenderer={activeAdvancedRenderer}
        popupEnabled={popupEnabled}
        onTogglePopups={togglePopups}
        tileLayerVisible={tileLayerVisible}
        vectorTileLayerVisible={vectorTileLayerVisible}
        onToggleTileLayer={toggleTileLayer}
        onToggleVectorTileLayer={toggleVectorTileLayer}
        markerCount={markerCount}
        onAddRandomMarker={addRandomMarker}
        onClearGraphics={clearGraphics}
        onQueryTopFeatures={queryTopFeatures}
        onQueryVisibleCount={queryVisibleCount}
        querySummary={querySummary}
      />

      <div className="relative min-h-105 flex-1 bg-slate-100 lg:min-h-0">
        <div ref={mapRef} className="absolute inset-0 outline-none" />

        {!isMapLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-slate-700">
                Loading ArcGIS map services...
              </span>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
          {querySummary}
        </div>
      </div>
    </div>
  );
}
