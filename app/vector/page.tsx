"use client";

import React, { useRef, useEffect, useState } from "react";
import { loadModules } from "esri-loader";

/**
 * VECTOR FIELD EXPLORER
 * This page demonstrates the powerful VectorFieldRenderer with high-fidelity wind data.
 */
export default function VectorFieldPage() {
    const mapDiv = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState("Initializing Vector Core...");
    const [isLoaded, setIsLoaded] = useState(false);
    const [tileSize, setTileSize] = useState(15);
    const [style, setStyle] = useState("beaufort-kn");
    const [flow, setFlow] = useState("flow-from");
    const layerRef = useRef<any>(null);

    useEffect(() => {
        let view: any;

        loadModules([
            "esri/Map",
            "esri/views/MapView",
            "esri/layers/ImageryTileLayer",
            "esri/renderers/VectorFieldRenderer"
        ], { url: "https://js.arcgis.com/4.31/", css: true })
            .then(([Map, MapView, ImageryTileLayer, VectorFieldRenderer]) => {
                if (!mapDiv.current) return;

                // 1. Initial Renderer Setup
                const renderer = new VectorFieldRenderer({
                    style: style,
                    flowRepresentation: flow,
                    symbolTileSize: tileSize,
                    visualVariables: [
                        {
                            type: "size",
                            field: "Magnitude",
                            maxDataValue: 32,
                            maxSize: "100px",
                            minDataValue: 0.04,
                            minSize: "8px"
                        },
                        {
                            type: "rotation",
                            field: "Direction",
                            rotationType: "geographic"
                        }
                    ]
                });

                // 2. Initialize Layer (Using a more robust Global Currents service)
                const windLayer = new ImageryTileLayer({
                    url: "https://tiledimageservices.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Spilhaus_UV_ocean_currents/ImageServer",
                    title: "Scientific Vector Matrix",
                    renderer: renderer,
                    opacity: 1.0
                });
                layerRef.current = windLayer;

                const map = new Map({
                    basemap: "dark-gray-vector",
                    layers: [windLayer]
                });

                view = new MapView({
                    container: mapDiv.current,
                    map: map,
                    center: [0, 0],
                    zoom: 3,
                    ui: { components: ["attribution"] }
                });

                view.when(() => {
                    setIsLoaded(true);
                    setStatus("Matrix Synchronized - Data Flow Detected");
                });
            })
            .catch((err) => {
                console.error("Vector Core Failure:", err);
                setStatus("Link Error: Service Unavailable");
            });

        return () => {
            if (view) view.destroy();
        };
    }, []);

    // Interactive Learning: Update renderer when state changes
    useEffect(() => {
        if (layerRef.current && isLoaded) {
            const currentLayer = layerRef.current;
            loadModules(["esri/renderers/VectorFieldRenderer"], { url: "https://js.arcgis.com/4.31/" })
                .then(([VectorFieldRenderer]) => {
                    currentLayer.renderer = new VectorFieldRenderer({
                        style: style,
                        flowRepresentation: flow,
                        symbolTileSize: tileSize,
                        visualVariables: [
                            { type: "size", field: "Magnitude", maxDataValue: 32, maxSize: "100px", minDataValue: 0.04, minSize: "8px" },
                            { type: "rotation", field: "Direction", rotationType: "geographic" }
                        ]
                    });
                });
        }
    }, [tileSize, style, flow, isLoaded]);

    return (
        <div style={{ background: "#05070a", minHeight: "100vh", color: "#60a5fa", fontFamily: "Outfit, sans-serif", display: "flex", flexDirection: "column" }}>
            <link rel="stylesheet" href="https://js.arcgis.com/4.31/esri/themes/dark/main.css" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" />

            {/* Header */}
            <header style={{ padding: "16px 32px", background: "rgba(10, 15, 25, 0.95)", borderBottom: "1px solid rgba(56, 189, 248, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(20px)", zIndex: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🌐</div>
                    <div>
                        <h1 style={{ fontSize: "18px", fontWeight: 900, color: "#fff", margin: 0 }}>Vector Learning Lab</h1>
                        <p style={{ fontSize: "10px", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>Mastering VectorFieldRenderer Properties</p>
                    </div>
                </div>
                <button onClick={() => window.location.href = '/dashboard'} style={{ padding: "10px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "0.3s" }}>RETURN TO BASE</button>
            </header>

            <div style={{ flex: 1, display: "flex", padding: "24px", gap: "24px" }}>
                {/* Interactive Controller (Learning Side) */}
                <aside style={{ width: "340px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ padding: "24px", background: "rgba(15, 23, 42, 0.8)", borderRadius: "24px", border: "1px solid rgba(56, 189, 248, 0.2)", backdropFilter: "blur(20px)" }}>
                        <h2 style={{ fontSize: "14px", color: "#fff", fontWeight: 800, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#0ea5e9" }} />
                            THE CORE CONTROLLER
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "10px" }}>SYMBOL TILE SIZE: <span style={{ color: "#38bdf8" }}>{tileSize}px</span></label>
                                <input type="range" min="10" max="60" value={tileSize} onChange={(e) => setTileSize(parseInt(e.target.value))} style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", accentColor: "#0ea5e9" }} />
                                <p style={{ fontSize: "9px", color: "#475569", marginTop: "8px" }}>Determines symbol density. Lower values = more detailed grid.</p>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "10px" }}>FLOW REPRESENTATION</label>
                                <select value={flow} onChange={(e) => setFlow(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "8px", borderRadius: "8px", fontSize: "12px" }}>
                                    <option value="flow-from">FLOW FROM (Wind Source)</option>
                                    <option value="flow-to">FLOW TO (Directional)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "10px" }}>VECTOR STYLE</label>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    {["beaufort-kn", "wind-barbs", "simple-scalar", "ocean-current-kn"].map((s) => (
                                        <button key={s} onClick={() => setStyle(s)} style={{ padding: "8px", background: style === s ? "#0ea5e9" : "rgba(255,255,255,0.05)", border: "1px solid", borderColor: style === s ? "#38bdf8" : "rgba(255,255,255,0.1)", color: style === s ? "#fff" : "#94a3b8", fontSize: "10px", borderRadius: "8px", cursor: "pointer", textTransform: "uppercase", fontWeight: 700 }}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: "20px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <h3 style={{ fontSize: "12px", color: "#38bdf8", marginBottom: "12px" }}>Learning Metadata</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11px", color: "#94a3b8" }}>
                            <div style={{ padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                                <b style={{ color: "#fff", display: "block" }}>Visual Variables:</b>
                                Size logic is bound to <i>Magnitude</i> and Rotation is bound to <i>Direction</i> fields.
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Viewport */}
                <div style={{ flex: 1, position: "relative", borderRadius: "32px", overflow: "hidden", border: "1px solid rgba(56, 189, 248, 0.2)", boxShadow: "0 0 80px rgba(0,0,0,0.6)" }}>
                    <div ref={mapDiv} style={{ height: "100%", width: "100%" }} />
                    
                    {!isLoaded && (
                        <div style={{ position: "absolute", inset: 0, background: "#05070a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <div style={{ border: "2px solid #0ea5e9", borderTop: "2px solid transparent", width: "40px", height: "40px", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        </div>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            
            <footer style={{ padding: "12px 32px", background: "rgba(10, 15, 25, 0.95)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 12px #22c55e" }} />
                <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>{status}</span>
            </footer>
        </div>
    );
}
