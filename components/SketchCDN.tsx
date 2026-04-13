/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useRef } from "react";

const ARCGIS_CDN = "https://js.arcgis.com/4.26/";

declare global {
  interface Window {
    require?: any;
  }
}

export default function SketchCDN() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Add ArcGIS CSS once
    if (!document.getElementById("arcgis-css")) {
      const link = document.createElement("link");
      link.id = "arcgis-css";
      link.rel = "stylesheet";
      link.href = "https://js.arcgis.com/4.26/esri/themes/light/main.css";
      document.head.appendChild(link);
    }

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if ((window as any).require) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = ARCGIS_CDN;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Failed to load ArcGIS JS API"));
        document.head.appendChild(script);
      });

    let destroyed = false;

    loadScript()
      .then(() => {
        if (destroyed) return;
        const req = (window as any).require;
        req(
          [
            "esri/Map",
            "esri/views/MapView",
            "esri/layers/GraphicsLayer",
            "esri/widgets/Sketch/SketchViewModel",
            "esri/geometry/geometryEngine",
          ],
          (
            Map: any,
            MapView: any,
            GraphicsLayer: any,
            SketchViewModel: any,
            geometryEngine: any,
          ) => {
            if (destroyed) return;

            const map = new Map({ basemap: "streets-navigation-vector" });
            const graphicsLayer = new GraphicsLayer();
            map.add(graphicsLayer);

            const view = new MapView({
              container: mapRef.current,
              map,
              center: [-118.805, 34.027],
              zoom: 13,
            });
            viewRef.current = view;

            const polygonSymbol = {
              type: "simple-fill",
              color: [255, 165, 0, 0.3],
              outline: { color: "#FF6D00", width: 2 },
            };

            const sketch = new SketchViewModel({
              view,
              layer: graphicsLayer,
              defaultCreateOptions: { hasZ: false },
              polygonSymbol,
            });

            // Simple toolbar inserted into the map container
            const toolbar = document.createElement("div");
            toolbar.style.position = "absolute";
            toolbar.style.top = "10px";
            toolbar.style.left = "50px";
            toolbar.style.zIndex = "999";
            toolbar.style.display = "flex";
            toolbar.style.gap = "8px";
            toolbar.style.background = "rgba(255,255,255,0.9)";
            toolbar.style.padding = "6px";
            toolbar.style.borderRadius = "6px";

            const makeBtn = (label: string, onClick: () => void) => {
              const b = document.createElement("button");
              b.textContent = label;
              b.onclick = onClick;
              b.style.padding = "6px 8px";
              b.style.cursor = "pointer";
              return b;
            };

            const polygonBtn = makeBtn("Draw Polygon", () =>
              sketch.create("polygon"),
            );
            const polylineBtn = makeBtn("Draw Polyline", () =>
              sketch.create("polyline"),
            );
            const pointBtn = makeBtn("Add Point", () => sketch.create("point"));
            const clearBtn = makeBtn("Clear", () => graphicsLayer.removeAll());

            toolbar.appendChild(polygonBtn);
            toolbar.appendChild(polylineBtn);
            toolbar.appendChild(pointBtn);
            toolbar.appendChild(clearBtn);

            mapRef.current?.appendChild(toolbar);

            sketch.on("create", (event: any) => {
              if (event.state === "complete") {
                const geom = event.graphic.geometry;
                let info = "";
                if (geom.type === "polygon") {
                  const area = geometryEngine.geodesicArea(
                    geom,
                    "square-kilometers",
                  );
                  info = `Area: ${area.toFixed(3)} km²`;
                } else if (geom.type === "polyline") {
                  const len = geometryEngine.geodesicLength(geom, "kilometers");
                  info = `Length: ${len.toFixed(3)} km`;
                }
                // simple feedback
                // eslint-disable-next-line no-alert
                alert(`Drawing complete. ${info}`);
              }
            });
          },
        );
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        // eslint-disable-next-line no-alert
        alert("Failed to load ArcGIS JS API from CDN. See console.");
      });

    return () => {
      destroyed = true;
      if (viewRef.current) {
        try {
          viewRef.current.destroy();
        } catch (e) {
          // ignore
        }
        viewRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "640px", position: "relative" }}
    />
  );
}
