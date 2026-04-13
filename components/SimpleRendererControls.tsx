/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { loadModules } from "esri-loader";

const CDN_OPTIONS = { css: false, url: "https://js.arcgis.com/4.31/" };

type SymbolType = "circle" | "square" | "diamond";
type RgbaColor = [number, number, number, number];

interface GeometrySymbolOptions {
  symbolType?: SymbolType;
  color: RgbaColor;
  size?: number;
  outlineColor?: RgbaColor;
  outlineWidth?: number;
}

/**
 * SimpleRendererControls
 *
 * Applies a uniform SimpleRenderer style to all features in a FeatureLayer.
 * Supports different symbol types (circle, square, diamond) and colors.
 */

export async function applySimpleRenderer(
  layer: any,
  options: {
    symbolType?: SymbolType;
    color?: RgbaColor;
    size?: number;
    outlineColor?: RgbaColor;
    outlineWidth?: number;
  } = {},
) {
  try {
    const [SimpleRenderer] = (await loadModules(
      ["esri/renderers/SimpleRenderer"],
      CDN_OPTIONS,
    )) as any[];

    const {
      symbolType = "circle",
      color = [255, 127, 39, 0.8],
      size = 8,
      outlineColor = [255, 255, 255, 1],
      outlineWidth = 1,
    } = options;

    const symbol = await createGeometryAwareSymbol(layer?.geometryType, {
      symbolType,
      color,
      size,
      outlineColor,
      outlineWidth,
    });

    const renderer = new SimpleRenderer({
      symbol,
    });

    layer.renderer = renderer;
    return true;
  } catch (err) {
    console.error("Failed to apply SimpleRenderer:", err);
    return false;
  }
}

export async function applyUniqueValueRenderer(layer: any) {
  try {
    const [UniqueValueRenderer] = (await loadModules(
      ["esri/renderers/UniqueValueRenderer"],
      CDN_OPTIONS,
    )) as any[];

    const defaultSymbol = await createGeometryAwareSymbol(layer?.geometryType, {
      color: [200, 200, 200, 0.7],
      outlineColor: [130, 130, 130, 1],
      outlineWidth: 1,
      size: 8,
      symbolType: "circle",
    });

    const activeSymbol = await createGeometryAwareSymbol(layer?.geometryType, {
      color: [0, 176, 80, 0.7],
      outlineColor: [0, 100, 0, 1],
      outlineWidth: 1,
      size: 9,
      symbolType: "diamond",
    });

    const inactiveSymbol = await createGeometryAwareSymbol(
      layer?.geometryType,
      {
        color: [255, 0, 0, 0.7],
        outlineColor: [180, 0, 0, 1],
        outlineWidth: 1,
        size: 9,
        symbolType: "circle",
      },
    );

    const renderer = new UniqueValueRenderer({
      // Uses STATUS/status when available; falls back to magnitude-based categories.
      valueExpression: `
        var statusValue = null;
        if (HasKey($feature, "STATUS")) {
          statusValue = $feature.STATUS;
        } else if (HasKey($feature, "status")) {
          statusValue = $feature.status;
        }

        if (!IsEmpty(statusValue)) {
          return Upper(statusValue);
        }

        var magnitudeValue = null;
        if (HasKey($feature, "mag")) {
          magnitudeValue = Number($feature.mag);
        } else if (HasKey($feature, "MAG")) {
          magnitudeValue = Number($feature.MAG);
        }

        if (!IsEmpty(magnitudeValue) && magnitudeValue >= 2.5) {
          return "ACTIVE";
        }

        return "INACTIVE";
      `,
      defaultSymbol,
      uniqueValueInfos: [
        {
          value: "ACTIVE",
          symbol: activeSymbol,
          label: "Active Sites",
        },
        {
          value: "INACTIVE",
          symbol: inactiveSymbol,
          label: "Inactive Sites",
        },
      ],
    });

    layer.renderer = renderer;
    return true;
  } catch (err) {
    console.error("Failed to apply UniqueValueRenderer:", err);
    return false;
  }
}

export async function applyClassBreaksRenderer(
  layer: any,
  forcedField?: string,
) {
  try {
    const [ClassBreaksRenderer] = (await loadModules(
      ["esri/renderers/ClassBreaksRenderer"],
      CDN_OPTIONS,
    )) as any[];

    const field = forcedField ?? findBestNumericField(layer);
    if (!field) {
      return false;
    }

    const lowSymbol = await createGeometryAwareSymbol(layer?.geometryType, {
      color: [173, 216, 230, 0.7],
      outlineColor: [59, 130, 246, 1],
      outlineWidth: 1,
      size: 7,
      symbolType: "circle",
    });

    const mediumSymbol = await createGeometryAwareSymbol(layer?.geometryType, {
      color: [255, 195, 113, 0.75],
      outlineColor: [245, 158, 11, 1],
      outlineWidth: 1,
      size: 9,
      symbolType: "square",
    });

    const highSymbol = await createGeometryAwareSymbol(layer?.geometryType, {
      color: [255, 99, 99, 0.8],
      outlineColor: [180, 0, 0, 1],
      outlineWidth: 1,
      size: 11,
      symbolType: "diamond",
    });

    const isPopulationField = field.toUpperCase().includes("POPULATION");
    const breaks = isPopulationField
      ? [
        {
          minValue: 0,
          maxValue: 10000,
          symbol: lowSymbol,
          label: "< 10K",
        },
        {
          minValue: 10000,
          maxValue: 100000,
          symbol: mediumSymbol,
          label: "10K - 100K",
        },
        {
          minValue: 100000,
          maxValue: Number.MAX_VALUE,
          symbol: highSymbol,
          label: "> 100K",
        },
      ]
      : [
        {
          minValue: -Number.MAX_VALUE,
          maxValue: 2.5,
          symbol: lowSymbol,
          label: "Low",
        },
        {
          minValue: 2.5,
          maxValue: 5,
          symbol: mediumSymbol,
          label: "Moderate",
        },
        {
          minValue: 5,
          maxValue: Number.MAX_VALUE,
          symbol: highSymbol,
          label: "High",
        },
      ];

    const renderer = new ClassBreaksRenderer({
      field,
      classBreakInfos: breaks,
    });

    layer.renderer = renderer;
    return true;
  } catch (err) {
    console.error("Failed to apply ClassBreaksRenderer:", err);
    return false;
  }
}

export function findBestNumericField(layer: any): string | null {
  const fieldNames = getFieldNames(layer);
  const numericCandidates = [
    "POPULATION",
    "pop",
    "mag",
    "MAGNITUDE",
    "depth",
    "DEPTH",
    "AREA_SQKM",
    "OBJECTID",
  ];

  for (const candidate of numericCandidates) {
    if (fieldNames.has(candidate.toUpperCase())) {
      const actual = layer.fields?.find(
        (field: any) =>
          String(field.name).toUpperCase() === candidate.toUpperCase(),
      );
      if (actual) {
        return actual.name;
      }
    }
  }

  const fallback = layer.fields?.find((field: any) =>
    ["small-integer", "integer", "single", "double"].includes(
      String(field.type),
    ),
  );

  return fallback?.name ?? null;
}

export function setProfessionalPopupTemplate(layer: any) {
  const fieldInfos: any[] = [];

  const magnitudeField = resolveFieldName(layer, "mag", "magnitude");
  const depthField = resolveFieldName(layer, "depth");
  const placeField = resolveFieldName(layer, "place", "location");
  const timeField = resolveFieldName(layer, "time");
  const populationField = resolveFieldName(
    layer,
    "POPULATION",
    "population",
    "pop",
  );
  const areaField = resolveFieldName(layer, "AREA_SQKM", "area_sqkm");
  const objectIdField = resolveFieldName(layer, "OBJECTID", "id");
  const titleField = resolveFieldName(
    layer,
    "title",
    "name",
    "place",
    "OBJECTID",
  );

  if (magnitudeField) {
    fieldInfos.push({
      fieldName: magnitudeField,
      label: "Magnitude",
      format: { places: 1 },
    });
  }

  if (depthField) {
    fieldInfos.push({
      fieldName: depthField,
      label: "Depth (km)",
      format: { places: 2 },
    });
  }

  if (placeField) {
    fieldInfos.push({ fieldName: placeField, label: "Location" });
  }

  if (timeField) {
    fieldInfos.push({ fieldName: timeField, label: "Last Updated" });
  }

  if (populationField) {
    fieldInfos.push({
      fieldName: populationField,
      label: "Population",
      format: { digitSeparator: true },
    });
  }

  if (areaField) {
    fieldInfos.push({
      fieldName: areaField,
      label: "Area (km²)",
      format: { places: 2 },
    });
  }

  if (!fieldInfos.length && objectIdField) {
    fieldInfos.push({ fieldName: objectIdField, label: "Feature ID" });
  }

  layer.popupTemplate = {
    title: titleField ? `{${titleField}}` : "Feature Information",
    content: [
      {
        type: "fields",
        fieldInfos,
      },
    ],
    actions: [
      {
        id: "view-details",
        title: "View Details",
        className: "esri-icon-description",
      },
    ],
  };

  layer.popupEnabled = true;
}

export function clearPopupTemplate(layer: any) {
  if (!layer) return;
  layer.popupTemplate = null;
  layer.popupEnabled = false;
}

/**
 * Remove SimpleRenderer and restore default styling
 */
export function removeSimpleRenderer(layer: any) {
  if (layer) {
    layer.renderer = null;
  }
}

/**
 * Preset color schemes for SimpleRenderer
 */
export const rendererPresets = {
  earthquake: {
    symbolType: "circle" as const,
    color: [255, 127, 39, 0.85] as RgbaColor,
    size: 8,
  },
  danger: {
    symbolType: "diamond" as const,
    color: [239, 68, 68, 0.85] as RgbaColor,
    size: 10,
  },
  success: {
    symbolType: "circle" as const,
    color: [34, 197, 94, 0.85] as RgbaColor,
    size: 8,
  },
  info: {
    symbolType: "square" as const,
    color: [59, 130, 246, 0.85] as RgbaColor,
    size: 7,
  },
  warning: {
    symbolType: "circle" as const,
    color: [245, 158, 11, 0.85] as RgbaColor,
    size: 8,
  },
};

function getFieldNames(layer: any): Set<string> {
  const fields = Array.isArray(layer?.fields) ? layer.fields : [];
  return new Set(fields.map((field: any) => String(field.name).toUpperCase()));
}

function resolveFieldName(layer: any, ...candidates: string[]): string | null {
  const fields = Array.isArray(layer?.fields) ? layer.fields : [];

  for (const candidate of candidates) {
    const match = fields.find(
      (field: any) =>
        String(field?.name).toUpperCase() === candidate.toUpperCase(),
    );

    if (match?.name) {
      return match.name;
    }
  }

  return null;
}

async function createGeometryAwareSymbol(
  geometryType: string,
  options: GeometrySymbolOptions,
) {
  const [SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol] =
    (await loadModules(
      [
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol",
      ],
      CDN_OPTIONS,
    )) as any[];

  const {
    symbolType = "circle",
    color,
    size = 8,
    outlineColor = [255, 255, 255, 1],
    outlineWidth = 1,
  } = options;

  if (geometryType === "polygon") {
    return new SimpleFillSymbol({
      color,
      outline: {
        color: outlineColor,
        width: outlineWidth,
      },
    });
  }

  if (geometryType === "polyline") {
    return new SimpleLineSymbol({
      color,
      width: Math.max(outlineWidth, 1.5),
    });
  }

  return new SimpleMarkerSymbol({
    style: symbolType,
    color,
    size,
    outline: {
      color: outlineColor,
      width: outlineWidth,
    },
  });
}
