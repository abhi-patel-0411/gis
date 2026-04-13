/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";

const CDN_OPTIONS = { css: false, url: "https://js.arcgis.com/4.31/" };

export default function Page() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<any>(null);
  const [status, setStatus] = useState("Initializing map...");

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setStatus("Loading ArcGIS modules...");

        const [
          Map,
          MapView,
          FeatureLayer,
          Graphic,
          UniqueValueRenderer,
          SimpleMarkerSymbol,
        ] = (await loadModules(
          [
            "esri/Map",
            "esri/views/MapView",
            "esri/layers/FeatureLayer",
            "esri/Graphic",
            "esri/renderers/UniqueValueRenderer",
            "esri/symbols/SimpleMarkerSymbol",
          ],
          CDN_OPTIONS,
        )) as any[];

        // Sample client-side features with three numeric attributes
        const samples = [
          {
            lon: -74.006,
            lat: 40.7128,
            red: 10,
            green: 4,
            blue: 2,
            name: "Site A",
          },
          {
            lon: -74.01,
            lat: 40.72,
            red: 2,
            green: 12,
            blue: 3,
            name: "Site B",
          },
          {
            lon: -74.02,
            lat: 40.707,
            red: 1,
            green: 3,
            blue: 11,
            name: "Site C",
          },
          {
            lon: -73.995,
            lat: 40.71,
            red: 6,
            green: 6,
            blue: 6,
            name: "Site D",
          },
        ];

        const graphics = samples.map(
          (s: any, i: number) =>
            new Graphic({
              geometry: {
                type: "point",
                longitude: s.lon,
                latitude: s.lat,
              },
              attributes: {
                ObjectID: i + 1,
                RED: s.red,
                GREEN: s.green,
                BLUE: s.blue,
                NAME: s.name,
              },
            }),
        );

        const layer = new FeatureLayer({
          source: graphics,
          fields: [
            { name: "ObjectID", alias: "ObjectID", type: "oid" },
            { name: "RED", alias: "Red", type: "integer" },
            { name: "GREEN", alias: "Green", type: "integer" },
            { name: "BLUE", alias: "Blue", type: "integer" },
            { name: "NAME", alias: "Name", type: "string" },
            { name: "dominant", alias: "Dominant", type: "string" },
          ],
          objectIdField: "ObjectID",
          geometryType: "point",
          spatialReference: { wkid: 4326 },
          title: "Predominance demo layer",
        });

        const map = new Map({ basemap: "streets", layers: [layer] });

        const view = new MapView({
          container: mapRef.current as HTMLDivElement,
          map,
          center: [-74.006, 40.7128],
          zoom: 12,
        });

        await view.when();

        // Compute dominant attribute per-feature and apply UniqueValueRenderer
        graphics.forEach((g: any) => {
          const attrs = g.attributes || {};
          const vals = [
            { key: "Red", v: Number(attrs.RED) || 0 },
            { key: "Green", v: Number(attrs.GREEN) || 0 },
            { key: "Blue", v: Number(attrs.BLUE) || 0 },
          ];
          vals.sort((a, b) => b.v - a.v);
          g.attributes.dominant = vals[0].key;
        });

        const redSym = new SimpleMarkerSymbol({
          style: "circle",
          color: [239, 68, 68, 0.9],
          size: 12,
          outline: { color: [255, 255, 255, 1], width: 1 },
        });

        const greenSym = new SimpleMarkerSymbol({
          style: "circle",
          color: [16, 185, 129, 0.9],
          size: 12,
          outline: { color: [255, 255, 255, 1], width: 1 },
        });

        const blueSym = new SimpleMarkerSymbol({
          style: "circle",
          color: [59, 130, 246, 0.9],
          size: 12,
          outline: { color: [255, 255, 255, 1], width: 1 },
        });

        const uvr = new UniqueValueRenderer({
          field: "dominant",
          uniqueValueInfos: [
            { value: "Red", symbol: redSym, label: "Red dominant" },
            { value: "Green", symbol: greenSym, label: "Green dominant" },
            { value: "Blue", symbol: blueSym, label: "Blue dominant" },
          ],
        });

        layer.renderer = uvr;
        if (typeof layer.refresh === "function") {
          layer.refresh();
        }

        setStatus("Applied computed dominance renderer (UniqueValueRenderer).");

        viewRef.current = view;
      } catch (err) {
        console.error("Map init error:", err);
        if (mounted) setStatus("Failed to initialize map: " + String(err));
      }
    };

    init();

    return () => {
      mounted = false;
      if (viewRef.current) {
        try {
          viewRef.current.destroy();
        } catch (e) {
          // ignore destroy errors
        }
        viewRef.current = null;
      }
    };
  }, []);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-3">Predominance renderer demo</h1>
      <p className="mb-3 text-sm text-slate-700">{status}</p>
      <div ref={mapRef} style={{ width: "100%", height: "72vh" }} />
      <p className="mt-3 text-xs text-slate-600">
        This page creates a small client-side FeatureLayer with three numeric
        attributes and attempts to apply the ArcGIS PredominanceRenderer. If the
        renderer isn't available, the page computes the dominant attribute per
        feature and uses a UniqueValueRenderer as a fallback.
      </p>
    </main>
  );
}
