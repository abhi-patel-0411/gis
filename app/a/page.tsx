"use client";

import React, { useRef, useEffect, useState } from "react";
import { loadModules } from "esri-loader";

/**
 * Unified ArcGIS Explorer (v4.0 - Single File Operations Hub)
 * Consolidated logic: Layers, Sketching, and SQL Querying in one component.
 */
export default function ArcGISExplorer() {
    const mapDiv = useRef<HTMLDivElement>(null);
    const mapViewRef = useRef<any>(null);
    const initializationRef = useRef(false);
    
    // Core State
    const [status, setStatus] = useState("Initializing Operations Hub...");
    const [loaded, setLoaded] = useState(false);
    const [queryResult, setQueryResult] = useState<string | null>(null);
    const [activeLayer, setActiveLayer] = useState<any>(null);

    useEffect(() => {
        if (initializationRef.current) return;
        initializationRef.current = true;

        let view: any;
        loadModules([
            "esri/Map", 
            "esri/views/MapView", 
            "esri/widgets/Sketch",
            "esri/layers/GraphicsLayer",
            "esri/layers/FeatureLayer",
            "esri/PopupTemplate",
            "esri/renderers/SimpleRenderer",
            "esri/symbols/SimpleMarkerSymbol"
        ], { url: "https://js.arcgis.com/4.31/", css: true })
            .then(([
                Map, MapView, Sketch, GraphicsLayer, 
                FeatureLayer, PopupTemplate, SimpleRenderer, SimpleMarkerSymbol
            ]) => {
                if (!mapDiv.current) return;

                // 1. Initialize Map and the Drawing Layer
                const map = new Map({ basemap: "gray-vector" });
                const sketchLayer = new GraphicsLayer({ title: "User Drawing Layer" });
                map.add(sketchLayer);

                // 2. Add the Public Wildfire Service (Proven stable)
                const fireLayer = new FeatureLayer({
                    url: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Wildfire_aggregated_v1/FeatureServer/0",
                    title: "Active Wildfire Records",
                    outFields: ["IncidentName", "DailyAcres", "UniqueFireIdentifier"],
                    popupTemplate: new PopupTemplate({
                        title: "🔥 {IncidentName}",
                        content: "Acres Affected: <b>{DailyAcres}</b><br/>ID: {UniqueFireIdentifier}"
                    }),
                    renderer: new SimpleRenderer({
                        symbol: new SimpleMarkerSymbol({ color: "#f97316", size: "10px", outline: { color: "white", width: 1.5 } })
                    })
                });
                map.add(fireLayer);
                setActiveLayer(fireLayer);

                // 3. Initialize the View
                view = new MapView({
                    container: mapDiv.current,
                    map: map,
                    center: [-110, 45],
                    zoom: 4,
                    ui: { components: ["attribution", "zoom"] },
                    popup: { dockEnabled: true, dockOptions: { position: "top-right", breakpoint: false } },
                    highlightOptions: { color: [245, 158, 11, 1], haloOpacity: 0.9, fillOpacity: 0.2 }
                });
                mapViewRef.current = view;

                // 4. Initialize Sketch Widget inside the view's lifecycle
                view.when(() => {
                    const sketch = new Sketch({
                        view: view,
                        layer: sketchLayer,
                        creationMode: "update",
                        visibleElements: { settingsMenu: true, undoRedoMenu: true }
                    });
                    view.ui.add(sketch, "top-right");

                    setLoaded(true);
                    setStatus("System Operational — Live Data Synchronized");
                });
            })
            .catch((err) => {
                console.error("Critical ArcGIS Error:", err);
                initializationRef.current = false;
            });

        return () => {
            if (view) {
                view.destroy();
                mapViewRef.current = null;
            }
            initializationRef.current = false;
        };
    }, []);

    // Local SQL Query Engine
    const handleRunQuery = async () => {
        if (activeLayer) {
            setStatus("Querying database for high-impact fires...");
            try {
                const query = activeLayer.createQuery();
                query.where = "DailyAcres > 5000";
                query.outFields = ["IncidentName", "DailyAcres"];
                query.returnGeometry = false;

                const result = await activeLayer.queryFeatures(query);
                const report = result.features
                    .map((f: any) => `${f.attributes.IncidentName} (${f.attributes.DailyAcres} acres)`)
                    .slice(0, 5);
                
                setQueryResult(report.length > 0 ? report.join(" | ") : "No high-impact fires found in this region.");
                setStatus("Query Complete");
            } catch (err) {
                console.error("Query failed", err);
                setQueryResult("Network error during SQL execution.");
            }
        }
    };

    return (
        <div style={{ background: "#0a0e1a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "Outfit, sans-serif", display: "flex", flexDirection: "column" }}>
            <link rel="stylesheet" href="https://js.arcgis.com/4.31/esri/themes/dark/main.css" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" />

            <style>{`
                .esri-sketch__panel { background: rgba(15, 21, 37, 0.95) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
                .esri-widget--button { background-color: #1e293b !important; color: #fff !important; }
                .esri-widget--button:hover { background-color: #334155 !important; }
            `}</style>

            {/* Header */}
            <header style={{ padding: "14px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ padding: "10px", borderRadius: "10px", background: "linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)", boxShadow: "0 0 20px rgba(0,212,255,0.3)" }}>🛰️</div>
                    <div>
                        <h1 style={{ fontSize: "18px", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>ArcGIS Operations Hub</h1>
                        <p style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>Next-Gen Mapping Core</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                        onClick={handleRunQuery}
                        style={{ padding: "10px 22px", borderRadius: "10px", background: "rgba(0, 212, 255, 0.1)", border: "1px solid #00d4ff", color: "#00d4ff", fontSize: "11px", fontWeight: 800, cursor: "pointer", transition: "0.2s" }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(0, 212, 255, 0.2)")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "rgba(0, 212, 255, 0.1)")}
                    >
                        ANALYZE SQL DATA
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{ padding: "10px 22px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "11px", cursor: "pointer" }}
                    >
                        SYSTEM REBOOT
                    </button>
                </div>
            </header>

            <div style={{ display: "flex", flex: 1, padding: "24px", gap: "24px" }}>
                {/* Information / Analytics Sidebar */}
                <aside style={{ width: "320px", display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ padding: "24px", borderRadius: "20px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
                        <h3 style={{ fontSize: "12px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#00d4ff" }} />
                            Analysis Report
                        </h3>
                        {queryResult ? (
                            <div style={{ fontSize: "12px", fontWeight: 500, color: "#fff", lineHeight: "1.8" }}>
                                {queryResult}
                            </div>
                        ) : (
                            <p style={{ fontSize: "11px", color: "#475569" }}>Launch SQL analysis to parse real-time incident reports and identify critical zones.</p>
                        )}
                    </div>

                    <div style={{ padding: "24px", borderRadius: "20px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 style={{ fontSize: "12px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", marginBottom: "16px" }}>Core Protocols</h3>
                        <ul style={{ fontSize: "11px", color: "#94a3b8", margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
                            <li style={{ display: "flex", gap: "10px" }}><span style={{ color: "#00d4ff" }}>•</span> Click any **incident point** on the map to extract metadata.</li>
                            <li style={{ display: "flex", gap: "10px" }}><span style={{ color: "#00d4ff" }}>•</span> Activate **Drawing Tools** (top-right) to declare alert zones.</li>
                            <li style={{ display: "flex", gap: "10px" }}><span style={{ color: "#00d4ff" }}>•</span> Use the **Trash Icon** on the toolbar to clear custom layers.</li>
                        </ul>
                    </div>
                </aside>

                {/* Primary Map Operations View */}
                <div style={{ flex: 1, position: "relative", borderRadius: "24px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 60px rgba(0,0,0,0.4)", minHeight: "450px" }}>
                    <div ref={mapDiv} style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }} />
                    
                    {!loaded && (
                        <div style={{ position: "absolute", inset: 0, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <div style={{ background: "rgba(0, 212, 255, 0.1)", padding: "20px 40px", borderRadius: "100px", border: "1px solid #00d4ff", color: "#00d4ff", fontSize: "12px", letterSpacing: "0.2em", fontWeight: 800 }}>
                                CONNECTING TO SATELLITE CORE...
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Telemetry Bar */}
            <footer style={{ padding: "10px 28px", background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
                    <span style={{ fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{status}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#475569", fontWeight: 600 }}>BUILD 4.0.0-STABLE | ESP-NODE-01</div>
            </footer>
        </div>
    );
}