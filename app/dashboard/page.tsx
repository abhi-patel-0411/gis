"use client";

import React, { useRef, useEffect, useState } from "react";
// 1. esri-loader allows us to load ArcGIS JS API from the official CDN (js.arcgis.com)
//    without bundling thousands of files into our Next.js project.
import { loadModules } from "esri-loader";

/**
 * EDUCATIONAL DASHBOARD (Single File)
 * This page contains the complete logic for a modern ArcGIS Dashboard.
 */
export default function DashboardPage() {
    // 2. REFS: We use useRef to hold data that (a) shouldn't trigger re-renders, 
    //    and (b) needs to persist for the lifetime of the component.
    const mapDiv = useRef<HTMLDivElement>(null); // Reference to the HTML <div> for the map
    const mapViewRef = useRef<any>(null);       // Reference to the MapView object for global access
    const initializationRef = useRef(false);    // A flag to ensure we only create 1 map (Strict Mode fix)

    // 3. STATE: Standard React state for the UI (Status bars, results, error handling)
    const [status, setStatus] = useState("Synchronizing Global Database...");
    const [loaded, setLoaded] = useState(false);
    const [queryResult, setQueryResult] = useState<string | null>(null);
    const [activeLayer, setActiveLayer] = useState<any>(null);

    useEffect(() => {
        // 4. PREVENT DOUBLE-INIT: Next.js 'StrictMode' fires useEffect twice.
        //    We use this guard to prevent creating two maps and crashing WebGL.
        if (initializationRef.current) return;
        initializationRef.current = true;

        let view: any;

        // 5. LOAD MODULES: Here we ask for the specific ArcGIS classes we need.
        //    Think of this like "import" but at runtime from the CDN.
        loadModules([
            "esri/Map",
            "esri/views/MapView",
            "esri/widgets/Sketch",
            "esri/layers/GraphicsLayer",
            "esri/layers/FeatureLayer",
            "esri/PopupTemplate",
            "esri/renderers/SimpleRenderer",
            "esri/symbols/SimpleMarkerSymbol"
        ], { url: "https://js.arcgis.com/4.31/", css: true }) // We also tell it to load the CSS themes
            .then(([
                Map, MapView, Sketch, GraphicsLayer,
                FeatureLayer, PopupTemplate, SimpleRenderer, SimpleMarkerSymbol
            ]) => {
                if (!mapDiv.current) return;

                // 6. THE MAP: This is the data container. We use the 'gray-vector' theme.
                const map = new Map({ basemap: "gray-vector" });

                // 7. GRAPHICS LAYER: A "blank canvas" layer for user drawings (Sketching).
                const sketchLayer = new GraphicsLayer({ title: "My Custom Drawings" });
                map.add(sketchLayer);

                // 8. FEATURE LAYER: A "service-backed" layer. This pulls real data from ArcGIS Online.
                const fireLayer = new FeatureLayer({
                    url: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Wildfire_aggregated_v1/FeatureServer/0",
                    title: "Active Wildfire Monitoring",
                    outFields: ["IncidentName", "DailyAcres"], // What data fields do we want to download?
                    popupTemplate: new PopupTemplate({ // How the info-box looks when clicked
                        title: "🔥 {IncidentName}",
                        content: "Daily Acres: <b>{DailyAcres}</b>"
                    }),
                    renderer: new SimpleRenderer({ // How the points look visually (Orange dots)
                        symbol: new SimpleMarkerSymbol({ color: "#f97316", size: "10px", outline: { color: "white", width: 1.5 } })
                    })
                });
                map.add(fireLayer); // Put the fire data on our map
                setActiveLayer(fireLayer); // Save it to state so our 'Query' button can find it later

                // 9. THE VIEW: This is the "camera" that looks at the Map. 
                view = new MapView({
                    container: mapDiv.current, // Tell it WHICH div to draw inside
                    map: map,                  // Tell it WHAT data to show
                    center: [-110, 45],        // Starting location [Longitude, Latitude]
                    zoom: 4,                   // Starting zoom level (closer is higher)
                    ui: { components: ["attribution", "zoom"] }, // UI elements to show
                    popup: { dockEnabled: true, dockOptions: { position: "top-right", breakpoint: false } }
                });
                mapViewRef.current = view; // Store the view in a ref so we can use it in button clicks

                // 10. WIDGETS: Standard tools provided by Esri.
                view.when(() => {
                    // Sketch widget allows users to DRAW, MOVE, and DELETE graphics.
                    const sketch = new Sketch({
                        view: view,
                        layer: sketchLayer, // Tell the widget which layer to draw into
                        creationMode: "update",
                        visibleElements: { settingsMenu: true, undoRedoMenu: true }
                    });
                    view.ui.add(sketch, "top-right"); // Place the tools in the top-right corner

                    setLoaded(true);
                    setStatus("Hub Live — All systems operational");
                });
            })
            .catch((err) => {
                console.error("Dashboard Error:", err);
                initializationRef.current = false;
            });

        // 11. CLEANUP: When the user leaves this page, we must destroy the MapView.
        //     This prevents WebGL memory leaks (browser crashes).
        return () => {
            if (view) {
                view.destroy();
                mapViewRef.current = null;
            }
            initializationRef.current = false;
        };
    }, []);

    // 12. QUERY LOGIC: How we search the database programmatically (SQL).
    const handleRunQuery = async () => {
        if (activeLayer) {
            setStatus("Scanning for significant events...");
            try {
                // FeatureLayer.createQuery() creates a request object based on the layer's schema.
                const query = activeLayer.createQuery();
                query.where = "DailyAcres > 5000"; // SQL: Find fires where acres are over 5,000
                query.outFields = ["IncidentName", "DailyAcres"];
                query.returnGeometry = false; // We only want text labels, not the geographic shapes

                // Execute the query:
                const result = await activeLayer.queryFeatures(query);

                // Map the results into a human-readable string:
                const report = result.features
                    .map((f: any) => `${f.attributes.IncidentName} (${f.attributes.DailyAcres} acres)`)
                    .slice(0, 5); // Just show the top 5

                setQueryResult(report.length > 0 ? `Top 5 Large Fires: ${report.join(", ")}` : "No large fires detected.");
                setStatus("Scan Complete");
            } catch (err) {
                console.error("Query failed", err);
                setQueryResult("Query connection error — check network.");
            }
        }
    };

    return (
        <div style={{ background: "#0a0e1a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "Outfit, sans-serif", display: "flex", flexDirection: "column" }}>
            {/* 13. CSS THEMES: We load the official Dark Theme CSS for ArcGIS here. */}
            <link rel="stylesheet" href="https://js.arcgis.com/4.31/esri/themes/dark/main.css" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" />

            <style>{`
                /* We use !important here to override the default ArcGIS styles with our custom theme colors. */
                .esri-sketch__panel { background: rgba(15, 21, 37, 0.95) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
                .esri-widget--button { background-color: #1e293b !important; color: #fff !important; }
                .esri-widget--button:hover { background-color: #334155 !important; }
            `}</style>

            {/* Dashboard Header */}
            <header style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f1525" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ padding: "8px", borderRadius: "8px", background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", fontSize: "14px" }}>🔥</div>
                    <div>
                        <h2 style={{ fontSize: "16px", fontWeight: 900, color: "#fff" }}>Integrated Fire Dashboard</h2>
                        <span style={{ fontSize: "9px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>Unified Architecture (V3.0)</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={() => window.location.href = '/vector'}
                        style={{ padding: "8px 18px", borderRadius: "8px", background: "linear-gradient(135deg, #0ea5e920 0%, #2563eb20 100%)", border: "1px solid #0ea5e9", color: "#38bdf8", fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "0.2s" }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#0ea5e940")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#0ea5e920")}
                    >
                        🌐 VIEW VECTOR ANALYSIS
                    </button>
                    <button
                        onClick={handleRunQuery} // 14. Trigger the SQL Query logic
                        style={{ padding: "8px 18px", borderRadius: "8px", background: "#f59e0b20", border: "1px solid #f59e0b", color: "#fbbf24", fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "0.2s" }}
                    >
                        🔍 RUN SQL ANALYSIS
                    </button>
                </div>

            </header>

            <div style={{ display: "flex", flex: 1, padding: "20px", gap: "20px" }}>
                {/* Sidebar Query Logic */}
                <aside style={{ width: "300px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px" }}>SQL Analysis Results</h3>
                        {/* Display results from the handleRunQuery function */}
                        {queryResult ? (
                            <div style={{ fontSize: "11px", color: "#fbbf24", background: "rgba(245, 158, 11, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)", lineHeight: "1.6" }}>
                                {queryResult}
                            </div>
                        ) : (
                            <p style={{ fontSize: "11px", color: "#475569" }}>Analyze wildfire data based on SQL attribute filters.</p>
                        )}
                    </div>

                    <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px" }}>User Guide</h3>
                        <ul style={{ fontSize: "11px", color: "#64748b", margin: 0, paddingLeft: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            <li>1. Click **Wildfire points** to view metadata cards.</li>
                            <li>2. Use **Drawing Tools** (top-right) to draw hazard zones.</li>
                            <li>3. Use **Select/Delete** tool to customize your map drawings.</li>
                            <li>4. Run **Analysis** for high-impact events.</li>
                        </ul>
                    </div>
                </aside>

                {/* Unified Map Interface */}
                <div style={{ flex: 1, position: "relative", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 40px rgba(0,0,0,0.6)", minHeight: "400px" }}>
                    {/* 15. THE CONTAINER: The MapDiv Ref is attached here. */}
                    <div ref={mapDiv} style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }} />

                    {!loaded && (
                        <div style={{ position: "absolute", inset: 0, background: "#0a1120", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <div style={{ fontSize: "12px", color: "#f59e0b", letterSpacing: "0.2em", fontWeight: 700 }}>SYNCHRONIZING HUB...</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Status Bar */}
            <footer style={{ padding: "8px 24px", background: "#0f1525", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "10px", color: "#475569", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
                <span>{status}</span>
            </footer>
        </div>
    );
}
