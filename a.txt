/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type SelectedFeature = {
  id: number | string;
  name: string;
  status: string;
  layerName: string;
};

type LayerVisibility = {
  earthquakes: boolean;
  population: boolean;
};

type GeocodeSuggestion = {
  text: string;
  magicKey?: string;
};

type BatchGeocodeResult = {
  inputAddress: string;
  matchedAddress: string;
  score: number;
  longitude: number;
  latitude: number;
};

type RouteSummary = {
  distanceKm: number;
  durationMin: number;
};

type RouteStep = {
  instruction: string;
  distanceMeter: number;
  type?: string;
  modifier?: string;
};

function DirectionIcon({
  type,
  modifier,
}: {
  type?: string;
  modifier?: string;
}) {
  const getIcon = () => {
    if (type === "depart")
      return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5z";
    if (type === "arrive")
      return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z";
    if (modifier?.includes("left") || modifier === "uturn")
      return "M20 9l-4-4v3h-7c-1.1 0-2 .9-2 2v7h2v-7h7v3l4-4z"; // Turn Left
    if (modifier?.includes("right"))
      return "M4 9l4-4v3h7c1.1 0 2 .9 2 2v7h-2v-7h-7v3L4 9z"; // Turn Right
    return "M12 4l-4 4h3v9h2V8h3l-4-4z"; // Straight
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ opacity: 0.7, flexShrink: 0 }}
    >
      <path d={getIcon()} />
    </svg>
  );
}

function AddressSearchInput({
  value,
  onChange,
  onRun,
  placeholder,
  disabled,
  buildSearchParams,
  requestGeocoderJson,
}: {
  value: string;
  onChange: (val: string) => void;
  onRun?: (val: string, magicKey?: string) => void;
  placeholder: string;
  disabled?: boolean;
  buildSearchParams: (params: Record<string, string>) => URLSearchParams;
  requestGeocoderJson: (
    endpoint: string,
    params: URLSearchParams,
    method?: "GET" | "POST",
  ) => Promise<any>;
}) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const text = value.trim();
    if (text.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = buildSearchParams({
          text,
          maxSuggestions: "6",
          outSR: "4326",
        });
        const data = await requestGeocoderJson("suggest", params);
        if (cancelled) return;
        const nextSuggestions: GeocodeSuggestion[] = (
          Array.isArray(data?.suggestions) ? data.suggestions : []
        )
          .filter((item: any) => item?.text)
          .slice(0, 6)
          .map((item: any) => ({
            text: String(item.text),
            magicKey:
              typeof item.magicKey === "string" ? item.magicKey : undefined,
          }));
        setSuggestions(nextSuggestions);
        setActiveIndex(-1);
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [value, buildSearchParams, requestGeocoderJson]);

  const selectItem = (item: GeocodeSuggestion) => {
    onChange(item.text);
    setSuggestions([]);
    setActiveIndex(-1);
    if (onRun) onRun(item.text, item.magicKey);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestions.length)
        setActiveIndex((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length) setActiveIndex((p) => Math.max(p - 1, 0));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        selectItem(suggestions[activeIndex]);
      } else if (onRun) {
        onRun(value);
        setSuggestions([]);
      }
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: "100%", padding: "7px 8px", fontSize: 12 }}
      />
      {loading && value.trim().length >= 3 && (
        <div
          style={{
            fontSize: 11,
            color: "#334155",
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          ...
        </div>
      )}
      {suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            marginTop: 2,
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            background: "#ffffff",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          {suggestions.map((item, index) => (
            <button
              key={`${item.text}-${index}`}
              type="button"
              onClick={() => selectItem(item)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                border: "none",
                borderBottom:
                  index === suggestions.length - 1
                    ? "none"
                    : "1px solid #e2e8f0",
                background: index === activeIndex ? "#e0f2fe" : "#ffffff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const INITIAL_VIEW = {
  center: [-118.805, 34.027] as [number, number],
  zoom: 11,
};

const GEOCODE_SERVICE_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
const ROUTE_SERVICE_URL =
  "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve";
const ROUTE_SERVICE_FALLBACK_URL =
  "https://route.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve";
const ARCGIS_API_KEY = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;

export default function ArcGISWidgets() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<any>(null);
  const earthquakesLayerRef = useRef<any>(null);
  const populationLayerRef = useRef<any>(null);
  const geocodeLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const graphicCtorRef = useRef<any>(null);
  const sketchLayerRef = useRef<any>(null);
  const sketchRef = useRef<any>(null);
  const geometryEngineRef = useRef<any>(null);
  const distanceMeasureRef = useRef<any>(null);
  const areaMeasureRef = useRef<any>(null);
  const analysisLayerRef = useRef<any>(null);
  const editableLayerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    earthquakes: true,
    population: true,
  });
  const [forwardInput, setForwardInput] = useState("");
  const [forwardResult, setForwardResult] = useState<string | null>(null);
  const [forwardLoading, setForwardLoading] = useState(false);

  const [reverseLongitude, setReverseLongitude] = useState("");
  const [reverseLatitude, setReverseLatitude] = useState("");
  const [reverseResult, setReverseResult] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  const [batchInput, setBatchInput] = useState("");
  const [batchResults, setBatchResults] = useState<BatchGeocodeResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);

  const [manualApiKey, setManualApiKey] = useState("");

  const [geocodeStatus, setGeocodeStatus] = useState(
    "Ready for geocoding operations.",
  );
  const [drawingInfo, setDrawingInfo] = useState<string | null>(null);
  const [measurementDistance, setMeasurementDistance] = useState<string | null>(
    null,
  );
  const [measurementArea, setMeasurementArea] = useState<string | null>(null);
  const [clickedPoint, setClickedPoint] = useState<any>(null);
  const [bufferRadius, setBufferRadius] = useState<string>("1");
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [crudLon, setCrudLon] = useState("");
  const [crudLat, setCrudLat] = useState("");
  const [crudCreateName, setCrudCreateName] = useState("");
  const [crudCreateStatus, setCrudCreateStatus] = useState("");
  const [crudUpdateObjectId, setCrudUpdateObjectId] = useState("");
  const [crudUpdateStatus, setCrudUpdateStatus] = useState("");
  const [crudDeleteObjectId, setCrudDeleteObjectId] = useState("");
  const [crudMessage, setCrudMessage] = useState<string | null>(null);
  const [crudLoading, setCrudLoading] = useState(false);

  const envApiKey = (ARCGIS_API_KEY ?? "").trim();
  const resolvedApiKey = envApiKey || manualApiKey.trim();

  useEffect(() => {
    const id = "arcgis-css";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://js.arcgis.com/4.28/esri/themes/light/main.css";
      document.head.appendChild(link);
    }
  }, []);

  // Spatial analysis helpers using geometryEngine
  const createBufferZone = (point: any, radiusKm: number) => {
    const engine = geometryEngineRef.current;
    if (!engine || !point) return null;
    try {
      return engine.buffer(point, Number(radiusKm), "kilometers");
    } catch (e) {
      return null;
    }
  };

  const isPointInZone = (point: any, zone: any) => {
    const engine = geometryEngineRef.current;
    if (!engine || !point || !zone) return false;
    try {
      return !!engine.contains(zone, point);
    } catch (e) {
      return false;
    }
  };

  const getDistanceBetween = (p1: any, p2: any) => {
    const engine = geometryEngineRef.current;
    if (!engine || !p1 || !p2) return NaN;
    try {
      return engine.distance(p1, p2, "kilometers");
    } catch (e) {
      return NaN;
    }
  };

  const getOverlap = (poly1: any, poly2: any) => {
    const engine = geometryEngineRef.current;
    if (!engine || !poly1 || !poly2) return null;
    try {
      return engine.intersect(poly1, poly2);
    } catch (e) {
      return null;
    }
  };

  const mergeZones = (polygons: any[]) => {
    const engine = geometryEngineRef.current;
    if (!engine || !polygons || polygons.length === 0) return null;
    try {
      return engine.union(polygons);
    } catch (e) {
      return null;
    }
  };

  // Handlers for UI actions
  const handleCreateBuffer = () => {
    const point = clickedPoint ?? viewRef.current?.center;
    if (!point) {
      setAnalysisMessage("Click the map to select a center point first.");
      return;
    }
    const rad = Number(bufferRadius) || 1;
    const buf = createBufferZone(point, rad);
    if (!buf) {
      setAnalysisMessage("Buffer creation failed.");
      return;
    }
    const Graphic = graphicCtorRef.current;
    const layer = analysisLayerRef.current;
    if (!Graphic || !layer) {
      setAnalysisMessage("Analysis layer not ready.");
      return;
    }
    layer.add(
      new Graphic({
        geometry: buf,
        symbol: {
          type: "simple-fill",
          color: [255, 165, 0, 0.28],
          outline: { color: [255, 109, 0, 0.9], width: 2 },
        },
        popupTemplate: { title: `Buffer (${rad} km)`, content: "Buffer zone" },
      }),
    );
    setAnalysisMessage(`Buffer created (${rad} km).`);
    try {
      void viewRef.current?.goTo(buf);
    } catch {}
  };

  const handleCheckPointInZone = () => {
    const point = clickedPoint;
    if (!point) {
      setAnalysisMessage("Click the map to choose a point first.");
      return;
    }
    const layer = analysisLayerRef.current;
    const polygons = (layer?.graphics?.toArray?.() ?? []).filter(
      (g: any) => g.geometry?.type === "polygon",
    );
    if (polygons.length === 0) {
      setAnalysisMessage("No polygon zones found. Create a buffer first.");
      return;
    }
    const zone = polygons[polygons.length - 1].geometry;
    const inside = isPointInZone(point, zone);
    setAnalysisMessage(
      inside ? "Point is inside the zone." : "Point is outside the zone.",
    );
  };

  const handleDistanceToCenter = () => {
    const point = clickedPoint;
    const center = viewRef.current?.center;
    if (!point || !center) {
      setAnalysisMessage(
        "Click the map to select a point and ensure map is initialized.",
      );
      return;
    }
    const d = getDistanceBetween(point, center);
    if (!Number.isFinite(d)) {
      setAnalysisMessage("Distance calculation failed.");
      return;
    }
    setAnalysisMessage(`Distance to map center: ${d.toFixed(3)} km`);
  };

  const handleIntersectPolygons = () => {
    const layerA = analysisLayerRef.current;
    const layerB = sketchLayerRef.current;
    const polys: any[] = [];
    if (layerA)
      polys.push(
        ...(layerA.graphics.toArray() || [])
          .filter((g: any) => g.geometry?.type === "polygon")
          .map((g: any) => g.geometry),
      );
    if (layerB)
      polys.push(
        ...(layerB.graphics.toArray() || [])
          .filter((g: any) => g.geometry?.type === "polygon")
          .map((g: any) => g.geometry),
      );
    if (polys.length < 2) {
      setAnalysisMessage("Need at least two polygons to intersect.");
      return;
    }
    const ov = getOverlap(polys[0], polys[1]);
    if (!ov) {
      setAnalysisMessage("No overlap found.");
      return;
    }
    const Graphic = graphicCtorRef.current;
    const layer = analysisLayerRef.current;
    if (!Graphic || !layer) {
      setAnalysisMessage("Analysis layer not ready.");
      return;
    }
    layer.add(
      new Graphic({
        geometry: ov,
        symbol: {
          type: "simple-fill",
          color: [59, 130, 246, 0.36],
          outline: { color: [37, 99, 235, 0.9], width: 2 },
        },
        popupTemplate: {
          title: "Intersection",
          content: "Overlap of polygons",
        },
      }),
    );
    setAnalysisMessage("Intersection added.");
    try {
      void viewRef.current?.goTo(ov);
    } catch {}
  };

  const handleUnionPolygons = () => {
    const layerA = analysisLayerRef.current;
    const layerB = sketchLayerRef.current;
    const polys: any[] = [];
    if (layerA)
      polys.push(
        ...(layerA.graphics.toArray() || [])
          .filter((g: any) => g.geometry?.type === "polygon")
          .map((g: any) => g.geometry),
      );
    if (layerB)
      polys.push(
        ...(layerB.graphics.toArray() || [])
          .filter((g: any) => g.geometry?.type === "polygon")
          .map((g: any) => g.geometry),
      );
    if (polys.length < 2) {
      setAnalysisMessage("Need two or more polygons to union.");
      return;
    }
    const merged = mergeZones(polys);
    if (!merged) {
      setAnalysisMessage("Union failed.");
      return;
    }
    const Graphic = graphicCtorRef.current;
    const layer = analysisLayerRef.current;
    if (!Graphic || !layer) {
      setAnalysisMessage("Analysis layer not ready.");
      return;
    }
    layer.add(
      new Graphic({
        geometry: merged,
        symbol: {
          type: "simple-fill",
          color: [16, 185, 129, 0.32],
          outline: { color: [5, 150, 105, 0.9], width: 2 },
        },
        popupTemplate: { title: "Union", content: "Merged polygons" },
      }),
    );
    setAnalysisMessage("Polygons merged.");
    try {
      void viewRef.current?.goTo(merged);
    } catch {}
  };

  // FeatureLayer editing (CRUD) via applyEdits
  const addFeature = useCallback(
    async (lon: number, lat: number, attributes: Record<string, any>) => {
      const featureLayer = editableLayerRef.current;
      const Graphic = graphicCtorRef.current;
      if (!featureLayer || !Graphic) {
        throw new Error("Editable feature layer is not ready.");
      }

      const newFeature = new Graphic({
        geometry: {
          type: "point",
          longitude: lon,
          latitude: lat,
          spatialReference: { wkid: 4326 },
        },
        attributes,
      });

      const result = await featureLayer.applyEdits({
        addFeatures: [newFeature],
      });

      const addResult = result?.addFeatureResults?.[0];
      if (addResult?.error) {
        throw new Error(addResult.error.message ?? "Failed to add feature.");
      }

      return addResult?.objectId;
    },
    [],
  );

  const updateFeatureStatus = useCallback(async (objectId: number, status: string) => {
    const featureLayer = editableLayerRef.current;
    const Graphic = graphicCtorRef.current;
    if (!featureLayer || !Graphic) {
      throw new Error("Editable feature layer is not ready.");
    }

    const feature = new Graphic({
      attributes: { OBJECTID: objectId, STATUS: status },
    });

    const result = await featureLayer.applyEdits({
      updateFeatures: [feature],
    });

    const updateResult = result?.updateFeatureResults?.[0];
    if (updateResult?.error) {
      throw new Error(updateResult.error.message ?? "Failed to update feature.");
    }
  }, []);

  const deleteFeature = useCallback(async (objectId: number) => {
    const featureLayer = editableLayerRef.current;
    const Graphic = graphicCtorRef.current;
    if (!featureLayer || !Graphic) {
      throw new Error("Editable feature layer is not ready.");
    }

    const feature = new Graphic({
      attributes: { OBJECTID: objectId },
    });

    const result = await featureLayer.applyEdits({
      deleteFeatures: [feature],
    });

    const deleteResult = result?.deleteFeatureResults?.[0];
    if (deleteResult?.error) {
      throw new Error(deleteResult.error.message ?? "Failed to delete feature.");
    }
  }, []);

  const handleAddCrudFeature = useCallback(async () => {
    const lon = Number(crudLon);
    const lat = Number(crudLat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      setCrudMessage("Enter valid longitude and latitude for create.");
      return;
    }

    setCrudLoading(true);
    setLayerError(null);
    try {
      const objectId = await addFeature(lon, lat, {
        NAME: crudCreateName.trim() || "User Feature",
        STATUS: crudCreateStatus.trim() || "New",
      });

      setCrudMessage(`Feature created. OBJECTID: ${objectId ?? "N/A"}`);
      if (objectId != null) {
        setCrudUpdateObjectId(String(objectId));
        setCrudDeleteObjectId(String(objectId));
      }
      void viewRef.current?.goTo({ center: [lon, lat], zoom: 14 });
    } catch (err: any) {
      const message =
        typeof err?.message === "string" ? err.message : "Create failed.";
      setCrudMessage(`Create failed: ${message}`);
      setLayerError(message);
    } finally {
      setCrudLoading(false);
    }
  }, [addFeature, crudCreateName, crudCreateStatus, crudLat, crudLon]);

  const handleUpdateCrudFeature = useCallback(async () => {
    const objectId = Number(crudUpdateObjectId);
    if (!Number.isFinite(objectId)) {
      setCrudMessage("Enter a valid OBJECTID for update.");
      return;
    }

    const status = crudUpdateStatus.trim();
    if (!status) {
      setCrudMessage("Enter STATUS text for update.");
      return;
    }

    setCrudLoading(true);
    setLayerError(null);
    try {
      await updateFeatureStatus(objectId, status);
      setCrudMessage(`Feature ${objectId} updated with STATUS='${status}'.`);
    } catch (err: any) {
      const message =
        typeof err?.message === "string" ? err.message : "Update failed.";
      setCrudMessage(`Update failed: ${message}`);
      setLayerError(message);
    } finally {
      setCrudLoading(false);
    }
  }, [crudUpdateObjectId, crudUpdateStatus, updateFeatureStatus]);

  const handleDeleteCrudFeature = useCallback(async () => {
    const objectId = Number(crudDeleteObjectId);
    if (!Number.isFinite(objectId)) {
      setCrudMessage("Enter a valid OBJECTID for delete.");
      return;
    }

    setCrudLoading(true);
    setLayerError(null);
    try {
      await deleteFeature(objectId);
      setCrudMessage(`Feature ${objectId} deleted.`);
    } catch (err: any) {
      const message =
        typeof err?.message === "string" ? err.message : "Delete failed.";
      setCrudMessage(`Delete failed: ${message}`);
      setLayerError(message);
    } finally {
      setCrudLoading(false);
    }
  }, [crudDeleteObjectId, deleteFeature]);

  const zoomIn = useCallback(() => {
    if (!viewRef.current) return;
    viewRef.current.zoom = (viewRef.current.zoom ?? 0) + 1;
  }, []);

  const zoomOut = useCallback(() => {
    if (!viewRef.current) return;
    viewRef.current.zoom = (viewRef.current.zoom ?? 0) - 1;
  }, []);

  const resetExtent = useCallback(() => {
    if (!viewRef.current) return;
    void viewRef.current.goTo({
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
    });
  }, []);

  const toggleLayer = useCallback((layerKey: keyof LayerVisibility) => {
    setLayerVisibility((previous) => {
      const next = { ...previous, [layerKey]: !previous[layerKey] };
      const targetLayer =
        layerKey === "earthquakes"
          ? earthquakesLayerRef.current
          : populationLayerRef.current;

      if (targetLayer) {
        targetLayer.visible = next[layerKey];
      }

      return next;
    });
  }, []);

  const buildSearchParams = useCallback(
    (params: Record<string, string>) => {
      const searchParams = new URLSearchParams({
        ...params,
        f: "json",
      });

      if (resolvedApiKey) {
        // Support both auth formats used across ArcGIS REST services.
        searchParams.set("token", resolvedApiKey);
        searchParams.set("apiKey", resolvedApiKey);
      }

      return searchParams;
    },
    [resolvedApiKey],
  );

  const requestGeocoderJson = useCallback(
    async (
      endpoint: string,
      params: URLSearchParams,
      method: "GET" | "POST" = "GET",
    ) => {
      const url = `${GEOCODE_SERVICE_URL}/${endpoint}`;
      const response =
        method === "GET"
          ? await fetch(`${url}?${params.toString()}`)
          : await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            });

      const payload = await response.json();

      if (!response.ok || payload?.error) {
        throw new Error(
          payload?.error?.message ??
            `Geocoder request failed with ${response.status}.`,
        );
      }

      return payload;
    },
    [],
  );

  const requestRouteJson = useCallback(
    async (params: URLSearchParams) => {
      const routeUrls = [ROUTE_SERVICE_URL, ROUTE_SERVICE_FALLBACK_URL];
      let lastError: Error | null = null;

      for (const routeUrl of routeUrls) {
        try {
          const response = await fetch(routeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              ...(resolvedApiKey
                ? {
                    "X-Esri-Authorization": `Bearer ${resolvedApiKey}`,
                  }
                : {}),
            },
            body: params.toString(),
          });

          const payload = await response.json();

          if (!response.ok || payload?.error) {
            throw new Error(
              payload?.error?.message ??
                `Route request failed with ${response.status}.`,
            );
          }

          return payload;
        } catch (err: any) {
          lastError =
            err instanceof Error ? err : new Error("Route request failed.");
        }
      }

      throw lastError ?? new Error("Route request failed.");
    },
    [resolvedApiKey],
  );

  const clearGeocodeGraphics = useCallback(() => {
    geocodeLayerRef.current?.removeAll();
  }, []);

  const clearRouteGraphics = useCallback(() => {
    routeLayerRef.current?.removeAll();
  }, []);

  const addGeocodeGraphic = useCallback(
    (
      longitude: number,
      latitude: number,
      color: [number, number, number, number],
      title: string,
      content: string,
    ) => {
      const geocodeLayer = geocodeLayerRef.current;
      const Graphic = graphicCtorRef.current;
      if (!geocodeLayer || !Graphic) return;

      geocodeLayer.add(
        new Graphic({
          geometry: {
            type: "point",
            longitude,
            latitude,
            spatialReference: { wkid: 4326 },
          },
          symbol: {
            type: "simple-marker",
            style: "circle",
            color,
            size: 11,
            outline: { color: [255, 255, 255, 1], width: 1.3 },
          },
          popupTemplate: {
            title,
            content,
          },
        }),
      );
    },
    [],
  );

  const focusOnGeocodeGraphics = useCallback(() => {
    const geocodeLayer = geocodeLayerRef.current;
    const view = viewRef.current;
    if (!geocodeLayer || !view || geocodeLayer.graphics.length === 0) return;

    void view
      .goTo(geocodeLayer.graphics.toArray(), { padding: 42 })
      .catch(() => {
        // Ignore goTo failures caused by interrupted navigation.
      });
  }, []);

  const runForwardGeocode = useCallback(
    async (addressOverride?: string, magicKey?: string) => {
      const address = (addressOverride ?? forwardInput).trim();
      if (!address) {
        setGeocodeStatus("Enter an address to run forward geocoding.");
        return;
      }

      setForwardLoading(true);
      setLayerError(null);

      try {
        const params = buildSearchParams({
          singleLine: address,
          outFields: "Match_addr,Addr_type",
          outSR: "4326",
          maxLocations: "5",
        });

        if (magicKey) {
          params.set("magicKey", magicKey);
        }

        const data = await requestGeocoderJson("findAddressCandidates", params);
        const candidate = data?.candidates?.[0];

        if (!candidate?.location) {
          setForwardResult("No candidate found.");
          clearGeocodeGraphics();
          setGeocodeStatus("Forward geocode completed with no matches.");
          return;
        }

        const longitude = Number(candidate.location.x);
        const latitude = Number(candidate.location.y);
        const matchedAddress = String(candidate.address ?? address);

        setForwardResult(
          `${matchedAddress} -> ${longitude.toFixed(6)}, ${latitude.toFixed(6)}`,
        );
        setGeocodeStatus(`Forward geocode matched: ${matchedAddress}`);
        setBatchResults([]);

        clearGeocodeGraphics();
        addGeocodeGraphic(
          longitude,
          latitude,
          [16, 185, 129, 0.95],
          "Forward Geocode Match",
          `${matchedAddress}<br/>Score: ${candidate.score ?? "N/A"}`,
        );

        void viewRef.current?.goTo({
          center: [longitude, latitude],
          zoom: 15,
        });
      } catch (err: any) {
        const message =
          typeof err?.message === "string"
            ? err.message
            : "Forward geocode failed.";
        setLayerError(message);
        setGeocodeStatus("Forward geocode failed.");
      } finally {
        setForwardLoading(false);
      }
    },
    [
      addGeocodeGraphic,
      buildSearchParams,
      clearGeocodeGraphics,
      forwardInput,
      requestGeocoderJson,
    ],
  );

  const runReverseGeocode = useCallback(async () => {
    const longitude = Number(reverseLongitude);
    const latitude = Number(reverseLatitude);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      setGeocodeStatus("Longitude and latitude must both be valid numbers.");
      return;
    }

    setReverseLoading(true);
    setLayerError(null);

    try {
      const params = buildSearchParams({
        location: `${longitude},${latitude}`,
        outSR: "4326",
      });

      const data = await requestGeocoderJson("reverseGeocode", params);
      const matchedAddress = String(
        data?.address?.Match_addr ??
          data?.address?.LongLabel ??
          "No match found",
      );

      setReverseResult(
        `${longitude.toFixed(6)}, ${latitude.toFixed(6)} -> ${matchedAddress}`,
      );
      setGeocodeStatus(`Reverse geocode result: ${matchedAddress}`);

      clearGeocodeGraphics();
      addGeocodeGraphic(
        longitude,
        latitude,
        [245, 158, 11, 0.95],
        "Reverse Geocode Input",
        `${matchedAddress}<br/>Lon: ${longitude.toFixed(6)}<br/>Lat: ${latitude.toFixed(6)}`,
      );

      void viewRef.current?.goTo({
        center: [longitude, latitude],
        zoom: 15,
      });
    } catch (err: any) {
      const message =
        typeof err?.message === "string"
          ? err.message
          : "Reverse geocode failed.";
      setLayerError(message);
      setGeocodeStatus("Reverse geocode failed.");
    } finally {
      setReverseLoading(false);
    }
  }, [
    addGeocodeGraphic,
    buildSearchParams,
    clearGeocodeGraphics,
    requestGeocoderJson,
    reverseLatitude,
    reverseLongitude,
  ]);

  const useMapCenterForReverse = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    setReverseLongitude(Number(view.center.longitude).toFixed(6));
    setReverseLatitude(Number(view.center.latitude).toFixed(6));
    setGeocodeStatus("Loaded map center into reverse geocode fields.");
  }, []);

  const runBatchGeocode = useCallback(async () => {
    const addresses = batchInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (addresses.length === 0) {
      setGeocodeStatus("Enter one address per line for batch geocoding.");
      return;
    }

    const limitedAddresses = addresses.slice(0, 50);
    if (addresses.length > limitedAddresses.length) {
      setGeocodeStatus("Only the first 50 addresses were submitted.");
    }

    setBatchLoading(true);
    setLayerError(null);

    try {
      const parsedResults: BatchGeocodeResult[] = [];

      // CLIENT-SIDE BATCH FALLBACK:
      // Since ArcGIS geocodeAddresses requires premium Network/Routing privileges,
      // we simply loop over the standard findAddressCandidates which works for all keys.
      for (const address of limitedAddresses) {
        try {
          const params = buildSearchParams({
            singleLine: address,
            outSR: "4326",
            maxLocations: "1",
          });
          const data = await requestGeocoderJson(
            "findAddressCandidates",
            params,
          );
          const candidate = data?.candidates?.[0];

          if (candidate?.location) {
            parsedResults.push({
              inputAddress: address,
              matchedAddress: String(candidate.address ?? address),
              score: Number(candidate.score ?? 0),
              longitude: Number(candidate.location.x),
              latitude: Number(candidate.location.y),
            });
          }
        } catch (e) {
          console.warn("Skipping address due to error:", address);
        }
      }

      setBatchResults(parsedResults);

      clearGeocodeGraphics();
      parsedResults.forEach((item) => {
        addGeocodeGraphic(
          item.longitude,
          item.latitude,
          [59, 130, 246, 0.92],
          "Batch Geocode Match",
          `${item.matchedAddress}<br/>Score: ${item.score.toFixed(1)}<br/>Input: ${item.inputAddress}`,
        );
      });
      focusOnGeocodeGraphics();

      setGeocodeStatus(
        `Batch geocoding matched ${parsedResults.length} of ${limitedAddresses.length} addresses.`,
      );
    } catch (err: any) {
      const message =
        typeof err?.message === "string"
          ? err.message
          : "Batch geocode failed.";
      setLayerError(message);
      setGeocodeStatus("Batch geocode failed.");
    } finally {
      setBatchLoading(false);
    }
  }, [
    addGeocodeGraphic,
    batchInput,
    buildSearchParams,
    clearGeocodeGraphics,
    focusOnGeocodeGraphics,
    requestGeocoderJson,
  ]);

  const findFirstCandidateForRoute = useCallback(
    async (address: string) => {
      const params = buildSearchParams({
        singleLine: address,
        outSR: "4326",
        maxLocations: "1",
      });

      const data = await requestGeocoderJson("findAddressCandidates", params);
      const candidate = data?.candidates?.[0];

      if (!candidate?.location) {
        throw new Error(`No geocode match found for: ${address}`);
      }

      return {
        longitude: Number(candidate.location.x),
        latitude: Number(candidate.location.y),
        address: String(candidate.address ?? address),
      };
    },
    [buildSearchParams, requestGeocoderJson],
  );

  const runRouteDirections = useCallback(async () => {
    const fromAddress = routeFrom.trim();
    const toAddress = routeTo.trim();

    if (!fromAddress || !toAddress) {
      setGeocodeStatus("Enter both From and To addresses for routing.");
      return;
    }

    setRouteLoading(true);
    setLayerError(null);

    try {
      const fromCandidate = await findFirstCandidateForRoute(fromAddress);
      const toCandidate = await findFirstCandidateForRoute(toAddress);

      // FREE FALLBACK ROUTING: OSRM (Open Source Routing Machine)
      // Bypasses the ArcGIS Route_World premium requirements.
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromCandidate.longitude},${fromCandidate.latitude};${toCandidate.longitude},${toCandidate.latitude}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(osrmUrl);
      const routeData = await response.json();

      if (routeData.code !== "Ok" || !routeData.routes?.length) {
        throw new Error("No route path returned from routing service.");
      }

      const routeFeature = routeData.routes[0];
      const distanceKm = Number(routeFeature.distance ?? 0) / 1000;
      const durationMin = Number(routeFeature.duration ?? 0) / 60;

      const stepsList: RouteStep[] = [];
      if (routeFeature.legs && routeFeature.legs.length > 0) {
        const osrmSteps = routeFeature.legs[0].steps || [];
        osrmSteps.forEach((step: any) => {
          let instruction = step?.maneuver?.instruction;
          if (!instruction) {
            instruction = step?.name ? `Proceed on ${step.name}` : "Proceed";
          } else if (step?.name) {
            instruction = `${instruction} onto ${step.name}`;
          }
          if (instruction)
            stepsList.push({
              instruction,
              distanceMeter: Number(step.distance ?? 0),
              type: step?.maneuver?.type,
              modifier: step?.maneuver?.modifier,
            });
        });
      }

      setRouteSummary({
        distanceKm,
        durationMin,
      });
      setRouteSteps(stepsList.filter(Boolean).slice(0, 18));

      clearRouteGraphics();
      const routeLayer = routeLayerRef.current;
      const Graphic = graphicCtorRef.current;

      if (routeLayer && Graphic) {
        // Build the ESRI polyline geometry from OSRM's coordinates Array<[lon, lat]>
        const routeGeometry = {
          type: "polyline",
          // Wrap the coordinates array in another array because ESRI paths is an array of paths
          paths: [routeFeature.geometry.coordinates],
          spatialReference: { wkid: 4326 },
        };

        routeLayer.add(
          new Graphic({
            geometry: routeGeometry,
            symbol: {
              type: "simple-line",
              color: [20, 184, 166, 0.95],
              width: 4,
            },
            popupTemplate: {
              title: "Route",
              content: `Distance: ${distanceKm.toFixed(2)} km<br/>Estimated time: ${durationMin.toFixed(1)} min`,
            },
          }),
        );

        routeLayer.add(
          new Graphic({
            geometry: {
              type: "point",
              longitude: fromCandidate.longitude,
              latitude: fromCandidate.latitude,
              spatialReference: { wkid: 4326 },
            },
            symbol: {
              type: "simple-marker",
              style: "circle",
              color: [34, 197, 94, 0.95],
              size: 11,
              outline: { color: [255, 255, 255, 1], width: 1.3 },
            },
            popupTemplate: {
              title: "Start",
              content: fromCandidate.address,
            },
          }),
        );

        routeLayer.add(
          new Graphic({
            geometry: {
              type: "point",
              longitude: toCandidate.longitude,
              latitude: toCandidate.latitude,
              spatialReference: { wkid: 4326 },
            },
            symbol: {
              type: "simple-marker",
              style: "circle",
              color: [239, 68, 68, 0.95],
              size: 11,
              outline: { color: [255, 255, 255, 1], width: 1.3 },
            },
            popupTemplate: {
              title: "Destination",
              content: toCandidate.address,
            },
          }),
        );
      }

      void viewRef.current?.goTo(routeLayerRef.current?.graphics.toArray(), {
        padding: 54,
      });

      setGeocodeStatus(
        `Route solved: ${distanceKm.toFixed(2)} km in about ${durationMin.toFixed(1)} minutes.`,
      );
    } catch (err: any) {
      const message =
        typeof err?.message === "string" ? err.message : "Route solve failed.";
      setLayerError(message);
      setGeocodeStatus("Routing failed. Verify addresses or connection.");
    } finally {
      setRouteLoading(false);
    }
  }, [clearRouteGraphics, findFirstCandidateForRoute, routeFrom, routeTo]);

  const clearRouteDirections = useCallback(() => {
    clearRouteGraphics();
    setRouteSummary(null);
    setRouteSteps([]);
    setRouteFrom("");
    setRouteTo("");
    setGeocodeStatus("Route results cleared.");
  }, [clearRouteGraphics]);

  useEffect(() => {
    let destroyed = false;
    let clickHandle: any = null;
    let searchHandle: any = null;
    let sketchCreateHandle: any = null;
    let distanceWatchHandle: any = null;
    let areaWatchHandle: any = null;
    let waitHandle: number | null = null;

    function initialize() {
      const req = (window as any).require;
      if (!req || !mapRef.current) return;

      req(
        [
          "esri/Map",
          "esri/views/MapView",
          "esri/Graphic",
          "esri/layers/FeatureLayer",
          "esri/layers/GraphicsLayer",
          "esri/widgets/Sketch/SketchViewModel",
          "esri/geometry/geometryEngine",
          "esri/widgets/DistanceMeasurement2D",
          "esri/widgets/AreaMeasurement2D",
          "esri/widgets/Zoom",
          "esri/widgets/Home",
          "esri/widgets/Compass",
          "esri/widgets/Search",
          "esri/widgets/LayerList",
          "esri/widgets/Legend",
        ],
        (
          ArcGISMap: any,
          MapView: any,
          Graphic: any,
          FeatureLayer: any,
          GraphicsLayer: any,
          SketchViewModel: any,
          geometryEngine: any,
          DistanceMeasurement2D: any,
          AreaMeasurement2D: any,
          Zoom: any,
          Home: any,
          Compass: any,
          Search: any,
          LayerList: any,
          Legend: any,
        ) => {
          if (destroyed) return;

          graphicCtorRef.current = Graphic;

          const map = new ArcGISMap({ basemap: "streets-navigation-vector" });
          const view = new MapView({
            container: mapRef.current,
            map,
            center: INITIAL_VIEW.center,
            zoom: INITIAL_VIEW.zoom,
          });

          viewRef.current = view;

          try {
            view.ui.remove("zoom");
          } catch {
            // Ignore when zoom widget is not present.
          }

          const earthquakeGraphics = [
            new Graphic({
              geometry: { type: "point", longitude: -118.81, latitude: 34.02 },
              attributes: {
                OBJECTID: 1,
                NAME: "Malibu Seismic Station",
                STATUS: "Active",
                MAG: 4.2,
              },
            }),
            new Graphic({
              geometry: { type: "point", longitude: -118.73, latitude: 34.05 },
              attributes: {
                OBJECTID: 2,
                NAME: "Santa Monica Fault Monitor",
                STATUS: "Monitoring",
                MAG: 3.6,
              },
            }),
            new Graphic({
              geometry: { type: "point", longitude: -118.92, latitude: 34.01 },
              attributes: {
                OBJECTID: 3,
                NAME: "Pacific Rim Sensor",
                STATUS: "Active",
                MAG: 4.8,
              },
            }),
          ];

          const populationGraphics = [
            new Graphic({
              geometry: { type: "point", longitude: -118.79, latitude: 34.08 },
              attributes: {
                OBJECTID: 101,
                NAME: "West LA Zone",
                STATUS: "High",
                DENSITY: 8200,
              },
            }),
            new Graphic({
              geometry: { type: "point", longitude: -118.67, latitude: 34.04 },
              attributes: {
                OBJECTID: 102,
                NAME: "Coastal Valley Zone",
                STATUS: "Medium",
                DENSITY: 5100,
              },
            }),
            new Graphic({
              geometry: { type: "point", longitude: -118.88, latitude: 34.11 },
              attributes: {
                OBJECTID: 103,
                NAME: "Hillside Zone",
                STATUS: "Low",
                DENSITY: 2800,
              },
            }),
          ];

          const earthquakesLayer = new FeatureLayer({
            title: "Earthquakes",
            source: earthquakeGraphics,
            objectIdField: "OBJECTID",
            geometryType: "point",
            spatialReference: { wkid: 4326 },
            fields: [
              { name: "OBJECTID", alias: "Object ID", type: "oid" },
              { name: "NAME", alias: "Name", type: "string" },
              { name: "STATUS", alias: "Status", type: "string" },
              { name: "MAG", alias: "Magnitude", type: "double" },
            ],
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-marker",
                color: [233, 30, 99, 0.9],
                size: 10,
                outline: { color: [255, 255, 255, 0.9], width: 1 },
              },
            },
            popupTemplate: {
              title: "{NAME}",
              content: "Magnitude: {MAG}<br/>Status: {STATUS}",
            },
            visible: true,
          });

          const populationLayer = new FeatureLayer({
            title: "Population",
            source: populationGraphics,
            objectIdField: "OBJECTID",
            geometryType: "point",
            spatialReference: { wkid: 4326 },
            fields: [
              { name: "OBJECTID", alias: "Object ID", type: "oid" },
              { name: "NAME", alias: "Name", type: "string" },
              { name: "STATUS", alias: "Status", type: "string" },
              { name: "DENSITY", alias: "Density", type: "double" },
            ],
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-marker",
                style: "square",
                color: [30, 136, 229, 0.85],
                size: 10,
                outline: { color: [255, 255, 255, 0.9], width: 1 },
              },
            },
            popupTemplate: {
              title: "{NAME}",
              content: "Population Density: {DENSITY}<br/>Status: {STATUS}",
            },
            visible: true,
          });

          const editableLayer = new FeatureLayer({
            title: "Editable Features",
            source: [],
            objectIdField: "OBJECTID",
            geometryType: "point",
            spatialReference: { wkid: 4326 },
            fields: [
              { name: "OBJECTID", alias: "Object ID", type: "oid" },
              { name: "NAME", alias: "Name", type: "string" },
              { name: "STATUS", alias: "Status", type: "string" },
            ],
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-marker",
                style: "diamond",
                color: [16, 185, 129, 0.9],
                size: 10,
                outline: { color: [255, 255, 255, 0.95], width: 1 },
              },
            },
            popupTemplate: {
              title: "{NAME}",
              content: "Status: {STATUS}<br/>OBJECTID: {OBJECTID}",
            },
            visible: true,
          });

          const geocodeLayer = new GraphicsLayer({
            title: "Geocoding Results",
          });

          const routeLayer = new GraphicsLayer({
            title: "Route & Directions",
          });

          // Sketch/drawing layer and view model
          const sketchLayer = new GraphicsLayer({ title: "Sketch Layer" });
          map.add(sketchLayer);
          sketchLayerRef.current = sketchLayer;

          const analysisLayer = new GraphicsLayer({
            title: "Analysis Results",
          });
          map.add(analysisLayer);
          analysisLayerRef.current = analysisLayer;

          const polygonSymbol = {
            type: "simple-fill",
            color: [255, 165, 0, 0.3],
            outline: { color: "#FF6D00", width: 2 },
          };

          sketchRef.current = new SketchViewModel({
            view,
            layer: sketchLayer,
            defaultCreateOptions: { hasZ: false },
            polygonSymbol,
          });

          geometryEngineRef.current = geometryEngine;

          sketchCreateHandle = sketchRef.current.on("create", (event: any) => {
            if (event.state === "complete") {
              try {
                const geom = event.graphic.geometry;
                let info = "";
                if (geom.type === "polygon") {
                  const area = geometryEngine.geodesicArea(
                    geom,
                    "square-kilometers",
                  );
                  info = `Area: ${Number(area).toFixed(3)} km²`;
                } else if (geom.type === "polyline") {
                  const len = geometryEngine.geodesicLength(geom, "kilometers");
                  info = `Length: ${Number(len).toFixed(3)} km`;
                } else if (geom.type === "point") {
                  const lon = Number(geom.longitude ?? geom.x ?? 0).toFixed(6);
                  const lat = Number(geom.latitude ?? geom.y ?? 0).toFixed(6);
                  info = `Point: (${lon}, ${lat})`;
                }
                setDrawingInfo(info);
              } catch (e) {
                // ignore geometry errors
              }
            }
          });

          // Measurement widgets (Distance & Area)
          try {
            const distanceMeasure = new DistanceMeasurement2D({
              view,
              unit: "kilometers",
            });
            const areaMeasure = new AreaMeasurement2D({
              view,
              unit: "square-kilometers",
            });

            distanceMeasureRef.current = distanceMeasure;
            areaMeasureRef.current = areaMeasure;

            view.ui.add(distanceMeasure, "top-right");
            view.ui.add(areaMeasure, "top-right");

            distanceWatchHandle = distanceMeasure.viewModel.watch(
              "measurement",
              (measurement: any) => {
                if (measurement) {
                  setMeasurementDistance(measurement.distance?.text ?? null);
                }
              },
            );

            areaWatchHandle = areaMeasure.viewModel.watch(
              "measurement",
              (measurement: any) => {
                if (measurement) {
                  setMeasurementArea(measurement.area?.text ?? null);
                }
              },
            );
          } catch (e) {
            // ignore if measurement widgets are not available
          }

          earthquakesLayerRef.current = earthquakesLayer;
          populationLayerRef.current = populationLayer;
          editableLayerRef.current = editableLayer;
          geocodeLayerRef.current = geocodeLayer;
          routeLayerRef.current = routeLayer;

          map.addMany([
            earthquakesLayer,
            populationLayer,
            editableLayer,
            geocodeLayer,
            routeLayer,
          ]);

          const zoom = new Zoom({ view });
          const home = new Home({ view });
          const compass = new Compass({ view });
          view.ui.add([zoom, home, compass], "top-right");

          const search = new Search({
            view,
            allPlaceholder: "Search for a place or address",
            includeDefaultSources: true,
            sources: [
              {
                layer: earthquakesLayer,
                searchFields: ["NAME", "STATUS"],
                displayField: "NAME",
                outFields: ["*"],
                name: "Earthquake Magnitude",
                placeholder: "Search earthquake stations",
              },
              {
                layer: populationLayer,
                searchFields: ["NAME", "STATUS"],
                displayField: "NAME",
                outFields: ["*"],
                name: "Population Density",
                placeholder: "Search population zones",
              },
              {
                layer: editableLayer,
                searchFields: ["NAME", "STATUS"],
                displayField: "NAME",
                outFields: ["*"],
                name: "Editable Features",
                placeholder: "Search edited features",
              },
            ],
          });
          view.ui.add(search, "top-left");

          searchHandle = search.on("select-result", (event: any) => {
            console.log("Selected:", event.result?.name);
            console.log("Feature:", event.result?.feature?.attributes);
          });

          const layerList = new LayerList({
            view,
            listItemCreatedFunction: (event: any) => {
              event.item.panel = {
                content: "legend",
                open: false,
              };
            },
          });
          view.ui.add(layerList, "bottom-right");

          const legend = new Legend({
            view,
            layerInfos: [
              { layer: earthquakesLayer, title: "Earthquake Magnitude" },
              { layer: populationLayer, title: "Population Density" },
              { layer: editableLayer, title: "Editable Features" },
              { layer: geocodeLayer, title: "Geocoding Results" },
              { layer: routeLayer, title: "Route & Directions" },
              { layer: analysisLayer, title: "Analysis Results" },
            ],
            style: "classic",
          });
          view.ui.add(legend, "bottom-left");

          clickHandle = view.on("click", async (event: any) => {
            try {
              // store last clicked map point for analysis tools
              try {
                setClickedPoint(event.mapPoint);
              } catch {}
              const response = await view.hitTest(event, {
                include: [earthquakesLayer, populationLayer],
              });

              const firstMatch = response.results.find((result: any) => {
                const layer = result?.graphic?.layer;
                return layer === earthquakesLayer || layer === populationLayer;
              });

              if (!firstMatch) {
                setSelectedFeature(null);

                // Open a popup at the clicked location with real image and details
                const lonStr = event.mapPoint.longitude.toFixed(5);
                const latStr = event.mapPoint.latitude.toFixed(5);
                const mapLon = parseFloat(lonStr);
                const mapLat = parseFloat(latStr);

                // Realistic satellite cutout of the exact exact area clicked
                let imageUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${mapLon - 0.005},${mapLat - 0.005},${mapLon + 0.005},${mapLat + 0.005}&bboxSR=4326&imageSR=4326&size=300,150&format=jpg&f=image`;
                let extraDetail = "";

                view.popup.open({
                  title: "Fetching Details...",
                  content: `<div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="width:100%; height:150px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:12px; color:#475569;">
                      Loading location view...
                    </div>
                    <div style="font-size:12px; color:#334155;">
                      <div><strong>Coordinates:</strong> ${lonStr}, ${latStr}</div>
                      <div style="color:#64748b; margin-top:4px;">Retrieving real data...</div>
                    </div>
                  </div>`,
                  location: event.mapPoint,
                });

                try {
                  // Attempt to find a real Wikipedia locale nearby to supplement details
                  const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${latStr}|${lonStr}&ggsradius=10000&ggslimit=1&prop=pageimages|extracts&exintro=1&exchars=150&pithumbsize=300&format=json&origin=*`;
                  const wikiResp = await fetch(wikiUrl).catch(() => null);
                  if (wikiResp) {
                    const wikiData = await wikiResp.json();
                    if (wikiData?.query?.pages) {
                      const page: any = Object.values(wikiData.query.pages)[0];
                      if (page?.thumbnail?.source) {
                        // If wiki has an image, use Wikipedia's real photo
                        imageUrl = page.thumbnail.source;
                      }
                      if (page?.extract) {
                        const cleanText = page.extract
                          .replace(/<[^>]+>/g, "")
                          .trim();
                        if (cleanText.length > 0) {
                          extraDetail = `<div style="margin-top:6px; font-style:italic; border-left:2px solid #cbd5e1; padding-left:6px; color:#475569;">"${cleanText}" - Wiki</div>`;
                        }
                      }
                    }
                  }

                  const searchParams = new URLSearchParams({
                    location: `${lonStr},${latStr}`,
                    outSR: "4326",
                    f: "json",
                  });
                  const resp = await fetch(
                    `${GEOCODE_SERVICE_URL}/reverseGeocode?${searchParams.toString()}`,
                  );
                  const data = await resp.json();
                  const address =
                    data?.address?.Match_addr ??
                    data?.address?.LongLabel ??
                    "Unknown Remote Area";

                  if (view.popup.visible) {
                    view.popup.title = address.split(",")[0] || "Location View";
                    view.popup.content = `<div style="display:flex; flex-direction:column; gap:8px;">
                      <img src="${imageUrl}" style="width:100%; border-radius:6px; object-fit:cover; height:150px; background:#e2e8f0; border:1px solid #e2e8f0;" alt="Location view" />
                      <div style="font-size:12px; color:#334155;">
                        <div style="margin-bottom:4px;"><strong>Address:</strong> ${address}</div>
                        <div><strong>Longitude:</strong> ${lonStr}</div>
                        <div><strong>Latitude:</strong> ${latStr}</div>
                        ${extraDetail}
                      </div>
                    </div>`;
                  }
                } catch (e) {
                  // If failing, fallback cleanly
                  if (view.popup.visible) {
                    view.popup.title = "Location Error";
                    view.popup.content = "Failed to load real details.";
                  }
                }
                return;
              }

              const attrs = firstMatch.graphic.attributes ?? {};
              setSelectedFeature({
                id: attrs.OBJECTID ?? "N/A",
                name: attrs.NAME ?? "Unnamed",
                status: attrs.STATUS ?? "Unknown",
                layerName: firstMatch.graphic.layer?.title ?? "Layer",
              });
            } catch (err: any) {
              console.error("Hit test failed:", err);
              setLayerError("Hit test failed.");
            }
          });

          void view
            .when()
            .then(() => {
              if (destroyed) return;
              setMapLoaded(true);
              setLayerError(null);
            })
            .catch((err: any) => {
              console.error("Map initialization failed:", err);
              if (destroyed) return;
              setLayerError("Map failed to initialize.");
            });
        },
      );
    }

    if ((window as any).require) {
      initialize();
    } else {
      waitHandle = window.setInterval(() => {
        if ((window as any).require) {
          if (waitHandle) {
            window.clearInterval(waitHandle);
            waitHandle = null;
          }
          initialize();
        }
      }, 100);
    }

    return () => {
      destroyed = true;
      setMapLoaded(false);

      if (waitHandle) {
        window.clearInterval(waitHandle);
      }

      if (clickHandle) {
        clickHandle.remove();
      }

      if (searchHandle) {
        searchHandle.remove();
      }
      if (sketchCreateHandle) {
        try {
          sketchCreateHandle.remove();
        } catch {}
      }
      if (distanceWatchHandle) {
        try {
          distanceWatchHandle.remove();
        } catch {}
      }
      if (areaWatchHandle) {
        try {
          areaWatchHandle.remove();
        } catch {}
      }
      try {
        if (viewRef.current && distanceMeasureRef.current) {
          try {
            viewRef.current.ui.remove(distanceMeasureRef.current);
          } catch {}
          distanceMeasureRef.current = null;
        }
        if (viewRef.current && areaMeasureRef.current) {
          try {
            viewRef.current.ui.remove(areaMeasureRef.current);
          } catch {}
          areaMeasureRef.current = null;
        }
      } catch {}

      earthquakesLayerRef.current = null;
      populationLayerRef.current = null;
      editableLayerRef.current = null;
      geocodeLayerRef.current = null;
      routeLayerRef.current = null;
      sketchLayerRef.current = null;
      analysisLayerRef.current = null;
      graphicCtorRef.current = null;

      if (viewRef.current) {
        try {
          viewRef.current.destroy();
        } catch {
          // Ignore destroy errors on hot reload.
        }
        viewRef.current = null;
      }
    };
  }, []);

  const panelCardStyle: React.CSSProperties = {
    border: "1px solid #dbe2ea",
    borderRadius: 10,
    background: "#ffffff",
    padding: 10,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.3,
    marginBottom: 8,
    color: "#0f172a",
    textTransform: "uppercase",
  };

  return (
    <>
      <Script src="https://js.arcgis.com/4.28/" strategy="afterInteractive" />
      <div
        style={{
          width: "100%",
          minHeight: 700,
          display: "flex",
          flexWrap: "wrap",
          border: "1px solid #d1d9e6",
          borderRadius: 14,
          overflow: "hidden",
          background: "#f8fafc",
          boxShadow: "0 14px 34px rgba(15, 23, 42, 0.09)",
        }}
      >
        <aside
          style={{
            flex: "0 0 370px",
            width: 370,
            maxWidth: "100%",
            borderRight: "1px solid #dbe2ea",
            background: "linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: 700,
            overflowY: "auto",
          }}
        >
          <div style={panelCardStyle}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              ArcGIS Operations Console
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Geocoding, routing, directions, and layer controls in one panel.
            </div>
          </div>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Map & Layers</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={zoomIn} disabled={!mapLoaded}>
                Zoom +
              </button>
              <button type="button" onClick={zoomOut} disabled={!mapLoaded}>
                Zoom -
              </button>
              <button type="button" onClick={resetExtent} disabled={!mapLoaded}>
                Home
              </button>
            </div>

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={layerVisibility.earthquakes}
                onChange={() => toggleLayer("earthquakes")}
              />
              Earthquake Magnitude
            </label>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={layerVisibility.population}
                onChange={() => toggleLayer("population")}
              />
              Population Density
            </label>
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Drawing & Measurement</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => sketchRef.current?.create("polygon")}
              >
                Draw Polygon
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => sketchRef.current?.create("polyline")}
              >
                Draw Polyline
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => sketchRef.current?.create("point")}
              >
                Add Point
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => sketchRef.current?.create("rectangle")}
              >
                Rectangle
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => sketchRef.current?.create("circle")}
              >
                Circle
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => {
                  sketchLayerRef.current?.removeAll();
                  setDrawingInfo(null);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => {
                  distanceMeasureRef.current?.viewModel.start?.();
                  // reset displayed measurements
                  setMeasurementDistance(null);
                  setMeasurementArea(null);
                }}
              >
                Measure Distance
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => {
                  areaMeasureRef.current?.viewModel.start?.();
                  setMeasurementArea(null);
                  setMeasurementDistance(null);
                }}
              >
                Measure Area
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => {
                  // stop/clear any active measurements
                  try {
                    distanceMeasureRef.current?.viewModel.clear?.();
                  } catch {}
                  try {
                    areaMeasureRef.current?.viewModel.clear?.();
                  } catch {}
                }}
              >
                Stop Measurement
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => {
                  try {
                    distanceMeasureRef.current?.viewModel.clear?.();
                    areaMeasureRef.current?.viewModel.clear?.();
                  } catch {}
                  setMeasurementDistance(null);
                  setMeasurementArea(null);
                }}
              >
                Clear Measurements
              </button>
            </div>

            {drawingInfo && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  border: "1px solid #d1e7ff",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: 7,
                }}
              >
                {drawingInfo}
              </div>
            )}
            {(measurementDistance || measurementArea) && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  border: "1px solid #d1e7ff",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: 7,
                }}
              >
                {measurementDistance && (
                  <div>Distance: {measurementDistance}</div>
                )}
                {measurementArea && <div>Area: {measurementArea}</div>}
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Spatial Analysis</div>
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <input
                type="number"
                value={bufferRadius}
                onChange={(e) => setBufferRadius(e.target.value)}
                placeholder="km"
                style={{ width: 88, padding: "6px 8px", fontSize: 12 }}
              />
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={handleCreateBuffer}
              >
                Create Buffer
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={handleCheckPointInZone}
              >
                Check Click In Zone
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={handleDistanceToCenter}
              >
                Distance to Center
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={handleIntersectPolygons}
              >
                Intersect Polygons
              </button>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={handleUnionPolygons}
              >
                Union Polygons
              </button>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={() => {
                  try {
                    analysisLayerRef.current?.removeAll();
                  } catch {}
                  setAnalysisMessage(null);
                }}
              >
                Clear Analysis
              </button>
            </div>

            {analysisMessage && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  border: "1px solid #d1e7ff",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: 7,
                }}
              >
                {analysisMessage}
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Feature Editing (CRUD)</div>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
              Uses <code>FeatureLayer.applyEdits</code> on the editable features
              layer.
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 6,
              }}
            >
              Create Feature
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="number"
                value={crudLon}
                onChange={(e) => setCrudLon(e.target.value)}
                placeholder="Longitude"
                style={{ width: "50%", padding: "7px 8px", fontSize: 12 }}
              />
              <input
                type="number"
                value={crudLat}
                onChange={(e) => setCrudLat(e.target.value)}
                placeholder="Latitude"
                style={{ width: "50%", padding: "7px 8px", fontSize: 12 }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="text"
                value={crudCreateName}
                onChange={(e) => setCrudCreateName(e.target.value)}
                placeholder="Name"
                style={{ width: "50%", padding: "7px 8px", fontSize: 12 }}
              />
              <input
                type="text"
                value={crudCreateStatus}
                onChange={(e) => setCrudCreateStatus(e.target.value)}
                placeholder="Status"
                style={{ width: "50%", padding: "7px 8px", fontSize: 12 }}
              />
            </div>
            <button
              type="button"
              disabled={!mapLoaded || crudLoading}
              onClick={() => {
                void handleAddCrudFeature();
              }}
            >
              {crudLoading ? "Working..." : "Add Feature"}
            </button>

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0f172a",
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              Update Feature Status
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="number"
                value={crudUpdateObjectId}
                onChange={(e) => setCrudUpdateObjectId(e.target.value)}
                placeholder="OBJECTID"
                style={{ width: "45%", padding: "7px 8px", fontSize: 12 }}
              />
              <input
                type="text"
                value={crudUpdateStatus}
                onChange={(e) => setCrudUpdateStatus(e.target.value)}
                placeholder="New STATUS"
                style={{ width: "55%", padding: "7px 8px", fontSize: 12 }}
              />
            </div>
            <button
              type="button"
              disabled={!mapLoaded || crudLoading}
              onClick={() => {
                void handleUpdateCrudFeature();
              }}
            >
              {crudLoading ? "Working..." : "Update Feature"}
            </button>

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0f172a",
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              Delete Feature
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="number"
                value={crudDeleteObjectId}
                onChange={(e) => setCrudDeleteObjectId(e.target.value)}
                placeholder="OBJECTID"
                style={{ width: "100%", padding: "7px 8px", fontSize: 12 }}
              />
            </div>
            <button
              type="button"
              disabled={!mapLoaded || crudLoading}
              onClick={() => {
                void handleDeleteCrudFeature();
              }}
            >
              {crudLoading ? "Working..." : "Delete Feature"}
            </button>

            {crudMessage && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  border: "1px solid #d1e7ff",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: 7,
                  color: "#0f172a",
                }}
              >
                {crudMessage}
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Forward Geocoding</div>

            <AddressSearchInput
              value={forwardInput}
              onChange={setForwardInput}
              onRun={(val, magicKey) => void runForwardGeocode(val, magicKey)}
              placeholder="Address -> coordinates"
              disabled={!mapLoaded || forwardLoading}
              buildSearchParams={buildSearchParams}
              requestGeocoderJson={requestGeocoderJson}
            />

            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              <button
                type="button"
                disabled={!mapLoaded || forwardLoading}
                onClick={() => void runForwardGeocode()}
              >
                {forwardLoading ? "Searching..." : "Run"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForwardInput("");
                  setForwardResult(null);
                }}
              >
                Clear
              </button>
            </div>

            {forwardResult && (
              <div
                style={{
                  marginTop: 7,
                  fontSize: 12,
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: 7,
                }}
              >
                {forwardResult}
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Reverse Geocoding</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={reverseLongitude}
                onChange={(event) => setReverseLongitude(event.target.value)}
                placeholder="Longitude"
                style={{ width: "50%", padding: "7px 8px", fontSize: 12 }}
              />
              <input
                type="text"
                value={reverseLatitude}
                onChange={(event) => setReverseLatitude(event.target.value)}
                placeholder="Latitude"
                style={{ width: "50%", padding: "7px 8px", fontSize: 12 }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              <button
                type="button"
                disabled={!mapLoaded}
                onClick={useMapCenterForReverse}
              >
                Use Center
              </button>
              <button
                type="button"
                disabled={!mapLoaded || reverseLoading}
                onClick={() => {
                  void runReverseGeocode();
                }}
              >
                {reverseLoading ? "Locating..." : "Run"}
              </button>
            </div>

            {reverseResult && (
              <div
                style={{
                  marginTop: 7,
                  fontSize: 12,
                  border: "1px solid #fed7aa",
                  borderRadius: 6,
                  background: "#fffbf5",
                  padding: 7,
                }}
              >
                {reverseResult}
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Batch Geocoding</div>
            <textarea
              value={batchInput}
              onChange={(event) => setBatchInput(event.target.value)}
              placeholder="One address per line"
              rows={4}
              style={{ width: "100%", padding: "7px 8px", fontSize: 12 }}
            />
            <button
              type="button"
              disabled={!mapLoaded || batchLoading || !batchInput.trim()}
              style={{ marginTop: 7 }}
              onClick={() => {
                void runBatchGeocode();
              }}
            >
              {batchLoading ? "Processing..." : "Run Batch"}
            </button>

            {batchResults.length > 0 && (
              <div
                style={{
                  marginTop: 7,
                  maxHeight: 130,
                  overflowY: "auto",
                  border: "1px solid #d1e7ff",
                  background: "#f8fbff",
                  borderRadius: 6,
                  padding: 7,
                  fontSize: 12,
                }}
              >
                {batchResults.slice(0, 10).map((item, index) => (
                  <div key={`${item.inputAddress}-${index}`}>
                    {item.matchedAddress} ({item.longitude.toFixed(4)},{" "}
                    {item.latitude.toFixed(4)})
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Routing & Directions</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <AddressSearchInput
                value={routeFrom}
                onChange={setRouteFrom}
                placeholder="From address"
                disabled={!mapLoaded || routeLoading}
                buildSearchParams={buildSearchParams}
                requestGeocoderJson={requestGeocoderJson}
              />
              <AddressSearchInput
                value={routeTo}
                onChange={setRouteTo}
                placeholder="To address"
                disabled={!mapLoaded || routeLoading}
                buildSearchParams={buildSearchParams}
                requestGeocoderJson={requestGeocoderJson}
              />
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              <button
                type="button"
                disabled={!mapLoaded || routeLoading}
                onClick={() => void runRouteDirections()}
              >
                {routeLoading ? "Routing..." : "Solve Route"}
              </button>
              <button type="button" onClick={clearRouteDirections}>
                Clear
              </button>
            </div>

            {routeSummary && (
              <div
                style={{
                  marginTop: 7,
                  fontSize: 12,
                  border: "1px solid #c7f9f1",
                  borderRadius: 6,
                  background: "#f2fffb",
                  padding: 7,
                }}
              >
                Distance: {routeSummary.distanceKm.toFixed(2)} km
                <br />
                Duration: {routeSummary.durationMin.toFixed(1)} min
              </div>
            )}

            {routeSteps.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid #dbe2ea",
                  borderRadius: 6,
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {routeSteps.map((step, index) => (
                  <div
                    key={`${index}-${step.instruction}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 10px",
                      borderBottom:
                        index === routeSteps.length - 1
                          ? "none"
                          : "1px solid #f1f5f9",
                      fontSize: 12,
                      color: "#334155",
                      lineHeight: 1.4,
                      background: index % 2 === 0 ? "#ffffff" : "#fafafa",
                    }}
                  >
                    <DirectionIcon type={step.type} modifier={step.modifier} />
                    <div style={{ flex: 1 }}>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: step.instruction.replace(
                            /<b>(.*?)<\/b>/g,
                            "<strong>$1</strong>",
                          ),
                        }}
                      />
                      {step.distanceMeter > 0 && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            marginTop: 2,
                            fontWeight: 500,
                          }}
                        >
                          {step.distanceMeter > 1000
                            ? `${(step.distanceMeter / 1000).toFixed(1)} km`
                            : `${Math.round(step.distanceMeter)} m`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>Selected Feature</div>
            {selectedFeature ? (
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                <strong>{selectedFeature.name}</strong>
                <br />
                Layer: {selectedFeature.layerName}
                <br />
                Status: {selectedFeature.status}
                <br />
                ID: {selectedFeature.id}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Click a feature on the map to view details.
              </div>
            )}
          </section>

          <section style={panelCardStyle}>
            <div style={sectionTitleStyle}>System Status</div>
            <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>
              {mapLoaded ? "Map ready" : "Loading map..."}
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>
              {geocodeStatus}
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>
              Drawing: {drawingInfo ?? "None"}
            </div>
            {layerError && (
              <div
                style={{
                  marginTop: 4,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  borderRadius: 6,
                  padding: "6px 7px",
                  fontSize: 12,
                }}
              >
                {layerError}
              </div>
            )}

            <div style={{ marginTop: 6, fontSize: 11, color: "#334155" }}>
              API key source: {envApiKey ? "Environment" : "Manual / Missing"}
            </div>

            {!envApiKey && (
              <div style={{ marginTop: 6 }}>
                <input
                  type="password"
                  value={manualApiKey}
                  onChange={(event) => setManualApiKey(event.target.value)}
                  placeholder="Paste ArcGIS API key for routing"
                  style={{ width: "100%", padding: "7px 8px", fontSize: 12 }}
                />
                <div style={{ marginTop: 5, fontSize: 11, color: "#92400e" }}>
                  Routing requires a key with routing privileges.
                </div>
              </div>
            )}

            {!resolvedApiKey && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#92400e" }}>
                Add NEXT_PUBLIC_ARCGIS_API_KEY for reliable routing quotas.
              </div>
            )}
          </section>
        </aside>

        <div
          style={{
            position: "relative",
            flex: "1 1 520px",
            minHeight: 700,
            background: "#dbeafe",
          }}
        >
          <div
            ref={mapRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />

          {!mapLoaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(248,250,252,0.72)",
                backdropFilter: "blur(2px)",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Loading ArcGIS map services...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
