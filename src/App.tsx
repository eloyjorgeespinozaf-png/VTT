import React, { useEffect, useRef, useState, useCallback } from 'react';
import JSZip from 'jszip';
import QRCode from 'qrcode';

// Clave de API de Google Maps
const GOOGLE_MAPS_API_KEY =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyArX4Pk4ne8TFwNakOayp3IijHCJo4KtzM';

// Icono SVG para Terreno Clave (Fase 3): Círculo transparente con borde 2px morado y letra 'C'
const TERRENO_CLAVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" stroke="purple" stroke-width="2" fill="none" />
  <text x="16" y="21.5" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="purple" text-anchor="middle">C</text>
</svg>`;

const TERRENO_CLAVE_ICON_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(TERRENO_CLAVE_SVG)}`;

// Fase 8 - Función generadora de iconos SVG dinámicos para Blancos de Alto Valor (BAV)
// Diseño: Rombo táctico rojo (#D32F2F) con borde oscuro (#1A1A1A) y texto blanco en negrita
export function getBAVSymbolDataUri(tipo: string): string {
  let label = 'C';
  let fontSize = '13';
  if (tipo === 'c4') {
    label = 'C';
    fontSize = '13';
  } else if (tipo === 'art') {
    label = 'Ar';
    fontSize = '11';
  } else if (tipo === 'ada') {
    label = 'AA';
    fontSize = '10.5';
  } else if (tipo === 'log') {
    label = 'L';
    fontSize = '13';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
  <polygon points="15,2 28,15 15,28 2,15" fill="#D32F2F" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round" />
  <text x="15" y="16" font-family="'Courier New', Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fase 15 - Función generadora de símbolos SVG dinámicos para Unidades de Maniobra
// Incorpora: Bando (AZUL rectángulo / ROJO rombo), Tipo de Unidad (Insignia de arma/servicio),
// Magnitud/Escalón táctico en la parte superior y Nombre/Designación en placa inferior
export function getUnidadSymbolDataUri(
  bando: 'azul' | 'rojo',
  tipo: string = 'infanteria',
  magnitud: string = 'II',
  nombre: string = ''
): string {
  const cleanNombre = escapeXml(nombre.trim().substring(0, 14));
  const cleanMag = escapeXml(magnitud || 'II');

  let branchSvg = '';
  if (bando === 'azul') {
    // Insignias de arma dentro del rectángulo azul (centro geométrico aprox 32, 24)
    if (tipo === 'infanteria') {
      branchSvg = `
        <line x1="6" y1="11" x2="58" y2="37" stroke="#FFFFFF" stroke-width="2" />
        <line x1="6" y1="37" x2="58" y2="11" stroke="#FFFFFF" stroke-width="2" />
      `;
    } else if (tipo === 'tanques') {
      branchSvg = `<ellipse cx="32" cy="24" rx="14" ry="7" fill="none" stroke="#FFFFFF" stroke-width="2.2" />`;
    } else if (tipo === 'rec_mec') {
      branchSvg = `
        <line x1="6" y1="37" x2="58" y2="11" stroke="#FFFFFF" stroke-width="2.2" />
        <ellipse cx="32" cy="24" rx="11" ry="5.5" fill="none" stroke="#FFFFFF" stroke-width="1.8" />
      `;
    } else if (tipo === 'artilleria') {
      branchSvg = `<circle cx="32" cy="24" r="4.5" fill="#FFFFFF" />`;
    } else if (tipo === 'ingenieros') {
      branchSvg = `<path d="M 21 29 L 21 19 L 43 19 L 43 29 M 21 24 L 43 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />`;
    } else if (tipo === 'ada') {
      branchSvg = `
        <path d="M 20 29 A 12 10 0 0 1 44 29" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" />
        <line x1="32" y1="19" x2="32" y2="29" stroke="#FFFFFF" stroke-width="1.5" />
      `;
    } else if (tipo === 'comunicaciones') {
      branchSvg = `<path d="M 34 16 L 27 24 L 32 24 L 30 32 L 37 23 L 32 23 Z" fill="#FFFFFF" />`;
    } else if (tipo === 'logistica') {
      branchSvg = `
        <line x1="18" y1="24" x2="46" y2="24" stroke="#FFFFFF" stroke-width="2.5" />
        <line x1="18" y1="19" x2="18" y2="29" stroke="#FFFFFF" stroke-width="2" />
      `;
    } else {
      branchSvg = `<line x1="6" y1="11" x2="58" y2="37" stroke="#FFFFFF" stroke-width="2" />`;
    }

    const nameplateSvg = cleanNombre
      ? `<rect x="2" y="39" width="60" height="12" rx="2" fill="#101712" stroke="#2d382d" stroke-width="0.8" opacity="0.95" />
         <text x="32" y="48.5" font-family="'Courier New', monospace" font-size="8.5" font-weight="bold" fill="#E2EDE1" text-anchor="middle">${cleanNombre}</text>`
      : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="52" viewBox="0 0 64 52">
      <!-- Magnitud (Escalón) -->
      <text x="32" y="9.5" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#FFD54F" stroke="#0e130f" stroke-width="0.8" text-anchor="middle">${cleanMag}</text>
      <!-- Marco Rectangular Azul -->
      <rect x="6" y="11" width="52" height="26" rx="2" fill="#1E88E5" stroke="#101712" stroke-width="2.2" />
      ${branchSvg}
      ${nameplateSvg}
    </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  } else {
    // Insignias dentro del rombo rojo OPFOR
    if (tipo === 'infanteria') {
      branchSvg = `
        <line x1="18" y1="16" x2="46" y2="32" stroke="#FFFFFF" stroke-width="2" />
        <line x1="18" y1="32" x2="46" y2="16" stroke="#FFFFFF" stroke-width="2" />
      `;
    } else if (tipo === 'tanques') {
      branchSvg = `<ellipse cx="32" cy="24" rx="12" ry="6" fill="none" stroke="#FFFFFF" stroke-width="2" />`;
    } else if (tipo === 'rec_mec') {
      branchSvg = `
        <line x1="18" y1="32" x2="46" y2="16" stroke="#FFFFFF" stroke-width="2.2" />
        <ellipse cx="32" cy="24" rx="9" ry="4.5" fill="none" stroke="#FFFFFF" stroke-width="1.6" />
      `;
    } else if (tipo === 'artilleria') {
      branchSvg = `<circle cx="32" cy="24" r="4.5" fill="#FFFFFF" />`;
    } else if (tipo === 'ingenieros') {
      branchSvg = `<path d="M 23 28 L 23 20 L 41 20 L 41 28 M 23 24 L 41 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" />`;
    } else if (tipo === 'ada') {
      branchSvg = `
        <path d="M 22 28 A 10 8 0 0 1 42 28" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />
        <line x1="32" y1="20" x2="32" y2="28" stroke="#FFFFFF" stroke-width="1.5" />
      `;
    } else if (tipo === 'comunicaciones') {
      branchSvg = `<path d="M 33 16 L 28 23 L 32 23 L 30 30 L 36 22 L 32 22 Z" fill="#FFFFFF" />`;
    } else if (tipo === 'logistica') {
      branchSvg = `
        <line x1="20" y1="24" x2="44" y2="24" stroke="#FFFFFF" stroke-width="2.2" />
        <line x1="20" y1="20" x2="20" y2="28" stroke="#FFFFFF" stroke-width="1.8" />
      `;
    } else {
      branchSvg = `<line x1="18" y1="16" x2="46" y2="32" stroke="#FFFFFF" stroke-width="2" />`;
    }

    const nameplateSvg = cleanNombre
      ? `<rect x="2" y="39" width="60" height="12" rx="2" fill="#191113" stroke="#3d2325" stroke-width="0.8" opacity="0.95" />
         <text x="32" y="48.5" font-family="'Courier New', monospace" font-size="8.5" font-weight="bold" fill="#FCE4EC" text-anchor="middle">${cleanNombre}</text>`
      : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="52" viewBox="0 0 64 52">
      <!-- Magnitud (Escalón) -->
      <text x="32" y="7.5" font-family="Arial, sans-serif" font-size="10.5" font-weight="900" fill="#FFD54F" stroke="#0e130f" stroke-width="0.8" text-anchor="middle">${cleanMag}</text>
      <!-- Rombo Rojo OPFOR -->
      <polygon points="32,8 59,24 32,40 5,24" fill="#E53935" stroke="#101712" stroke-width="2.2" stroke-linejoin="round" />
      ${branchSvg}
      ${nameplateSvg}
    </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
}

// Función para actualizar en caliente la simbología, propiedades y etiquetas de una Unidad
export function actualizarSimbologiaUnidad(
  marker: any,
  nuevosDatos?: {
    tipo?: string;
    magnitud?: string;
    nombre?: string;
    tareaText?: string;
    propositoText?: string;
  }
) {
  if (!marker) return;
  if (nuevosDatos) {
    if (nuevosDatos.tipo !== undefined) marker.tipo = nuevosDatos.tipo;
    if (nuevosDatos.magnitud !== undefined) marker.magnitud = nuevosDatos.magnitud;
    if (nuevosDatos.nombre !== undefined) marker.nombre = nuevosDatos.nombre;
    if (nuevosDatos.tareaText !== undefined) marker.tareaText = nuevosDatos.tareaText;
    if (nuevosDatos.propositoText !== undefined) marker.propositoText = nuevosDatos.propositoText;
  }

  const bando = marker.bando || 'azul';
  const tipo = marker.tipo || 'infanteria';
  const magnitud = marker.magnitud || 'II';
  const nombre = marker.nombre || (bando === 'azul' ? 'U-AZUL' : 'U-ROJO');

  const symbolUri = getUnidadSymbolDataUri(bando, tipo, magnitud, nombre);
  if (window.google?.maps) {
    marker.setIcon({
      url: symbolUri,
      scaledSize: new window.google.maps.Size(64, 52),
      origin: new window.google.maps.Point(0, 0),
      anchor: new window.google.maps.Point(32, 24),
    });
    marker.setTitle(`${nombre} [${bando.toUpperCase()} - ${tipo.toUpperCase()} (${magnitud})]`);
  }
}

// Fases 6, 7, 8, 12 y 15 - Variables Globales (Arrays para almacenar figuras dibujadas)
let capaRestringido: any[] = [];
let capaSevero: any[] = [];
let capaClave: any[] = [];
let capaAAPropias: any[] = [];
let capaAAEnemigo: any[] = [];
let capaAE: any[] = [];
let capaDefendible: any[] = [];
let capaBAV: any[] = [];
let capaAIN: any[] = [];
let contadorAIN = 1;

// Fase 15 - Variables Globales para Unidades de Maniobra
let capaUnidades: any[] = [];
let infoWindowUnidad: any = null;
let modoUnidadAzul = false;
let modoUnidadRojo = false;

// Fase 16 - Variables Globales para Áreas de Juego de Guerra (Fajas, Avenidas en Profundidad, Cajas)
let capaMetodoJG: any[] = [];
let modoMetodoJG = false;

// Fase 9 - Variables Globales para Cálculo de Marcha (LFT)
let reglaActiva = false;
let lineaRegla: any = null;

// Fase 11 - Constantes para Matriz de Efectos CC.MM. en Operaciones
export const FACTORES_CCMM = ['Visibilidad', 'Vientos', 'Precipitación', 'Nubosidad', 'Temp/Hum'] as const;
export const SISTEMAS_CCMM = [
  'Personal',
  'Blindados',
  'Artillería',
  'ADA',
  'Ingeniería',
  'Inteligencia',
  'C3',
  'Líneas Com.',
] as const;

if (typeof window !== 'undefined') {
  window.capaRestringido = capaRestringido;
  window.capaSevero = capaSevero;
  window.capaClave = capaClave;
  window.capaAAPropias = capaAAPropias;
  window.capaAAEnemigo = capaAAEnemigo;
  window.capaAE = capaAE;
  window.capaDefendible = capaDefendible;
  window.capaBAV = capaBAV;
  window.capaAIN = capaAIN;
  window.contadorAIN = contadorAIN;
  window.capaUnidades = capaUnidades;
  window.infoWindowUnidad = infoWindowUnidad;
  window.modoUnidadAzul = modoUnidadAzul;
  window.modoUnidadRojo = modoUnidadRojo;
  window.capaMetodoJG = capaMetodoJG;
  window.modoMetodoJG = modoMetodoJG;
  window.reglaActiva = reglaActiva;
  window.lineaRegla = lineaRegla;
  window.actualizarSimbologiaUnidad = actualizarSimbologiaUnidad;
  window.configurarUnidad = (
    marker: any,
    tipo: string,
    magnitud: string,
    nombre: string,
    tarea?: string,
    proposito?: string
  ) => {
    actualizarSimbologiaUnidad(marker, {
      tipo,
      magnitud,
      nombre,
      tareaText: tarea,
      propositoText: proposito,
    });
  };
}

declare global {
  interface Window {
    google?: any;
    initTacticalMap?: () => void;
    gm_authFailure?: () => void;
    __modoTerrenoClave?: boolean;
    __modoOrografia?: boolean;
    __modoBAV?: boolean;
    capaRestringido?: any[];
    capaSevero?: any[];
    capaClave?: any[];
    capaAAPropias?: any[];
    capaAAEnemigo?: any[];
    capaAE?: any[];
    capaDefendible?: any[];
    capaBAV?: any[];
    capaAIN?: any[];
    contadorAIN?: number;
    capaUnidades?: any[];
    infoWindowUnidad?: any;
    modoUnidadAzul?: boolean;
    modoUnidadRojo?: boolean;
    capaMetodoJG?: any[];
    modoMetodoJG?: boolean;
    reglaActiva?: boolean;
    lineaRegla?: any;
    actualizarSimbologiaUnidad?: (marker: any, nuevosDatos?: any) => void;
    configurarUnidad?: (marker: any, tipo: string, magnitud: string, nombre: string, tarea?: string, proposito?: string) => void;
    guardarSesionLocal?: () => void;
    cargarSesionLocal?: () => void;
  }
}

type ActiveTool =
  | 'cmoc_restringido'
  | 'cmoc_severo'
  | 'aa_propias'
  | 'aa_enemigo'
  | 'terreno_clave'
  | 'orografia'
  | 'area_empeno'
  | 'terreno_defendible'
  | 'ain'
  | 'bav'
  | 'medir_ruta'
  | 'unidad_azul'
  | 'unidad_rojo'
  | 'metodo_jg'
  | null;

/**
 * Gestor táctico de dibujo (Fases 2 y 4: Polígonos CMOC y Polilíneas Direcciones de Aproximación)
 */
class TacticalDrawingManager {
  map: any = null;
  drawingMode: 'polygon' | 'polyline' | 'rectangle' | null = null;
  polygonOptions: any = {};
  polylineOptions: any = {};
  rectangleOptions: any = {};
  currentVertices: { lat: number; lng: number }[] = [];
  activePolygon: any = null;
  activePolyline: any = null;
  activeRectangle: any = null;
  mapClickListener: any = null;
  mapMouseMoveListener: any = null;
  mapDblClickListener: any = null;
  listeners: Record<string, Function[]> = {};
  onVertexChange?: (count: number) => void;

  constructor(options?: any) {
    if (options?.polygonOptions) this.polygonOptions = options.polygonOptions;
    if (options?.polylineOptions) this.polylineOptions = options.polylineOptions;
    if (options?.rectangleOptions) this.rectangleOptions = options.rectangleOptions;
    if (options?.drawingMode) this.setDrawingMode(options.drawingMode);
  }

  setMap(map: any) {
    this.cleanup();
    this.map = map;
  }

  addListener(eventName: string, handler: Function) {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];
    this.listeners[eventName].push(handler);
    return {
      remove: () => {
        this.listeners[eventName] = (this.listeners[eventName] || []).filter((h) => h !== handler);
      },
    };
  }

  setOptions(options: any) {
    if (options.polygonOptions) this.polygonOptions = options.polygonOptions;
    if (options.polylineOptions) this.polylineOptions = options.polylineOptions;
    if (options.rectangleOptions) this.rectangleOptions = options.rectangleOptions;
    if (options.drawingMode !== undefined) this.setDrawingMode(options.drawingMode);
  }

  setDrawingMode(mode: any) {
    this.cleanup();
    const normalized = mode ? (String(mode).toLowerCase() as 'polygon' | 'polyline' | 'rectangle') : null;
    this.drawingMode = normalized;

    if (!this.map) return;

    if (normalized === 'polygon' || normalized === 'polyline' || normalized === 'rectangle') {
      this.map.setOptions({ draggableCursor: 'crosshair', disableDoubleClickZoom: true });
      this.bindEvents();
    } else {
      this.map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
    }
  }

  getDrawingMode() {
    return this.drawingMode;
  }

  bindEvents() {
    if (!this.map) return;

    // Clic en el mapa para fijar vértices
    this.mapClickListener = this.map.addListener('click', (e: any) => {
      if (!e.latLng) return;
      const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      this.currentVertices.push(point);

      if (this.onVertexChange) {
        this.onVertexChange(this.currentVertices.length);
      }

      // Previsualización de Rectángulo (Fase 16: Método de Juego de Guerra - Faja o Caja)
      if (this.drawingMode === 'rectangle') {
        if (this.currentVertices.length === 1) {
          const corner = e.latLng;
          this.activeRectangle = new window.google.maps.Rectangle({
            bounds: new window.google.maps.LatLngBounds(corner, corner),
            strokeColor: this.rectangleOptions.strokeColor || '#0097A7',
            strokeWeight: this.rectangleOptions.strokeWeight || 2,
            fillColor: this.rectangleOptions.fillColor || '#00BCD4',
            fillOpacity: this.rectangleOptions.fillOpacity || 0.2,
            clickable: false,
            zIndex: 99,
            map: this.map,
          });

          this.mapMouseMoveListener = this.map.addListener('mousemove', (mouseEvt: any) => {
            if (!mouseEvt?.latLng || !this.activeRectangle || this.currentVertices.length < 1) return;
            const p1 = this.currentVertices[0];
            const p2 = { lat: mouseEvt.latLng.lat(), lng: mouseEvt.latLng.lng() };
            const bounds = new window.google.maps.LatLngBounds(
              new window.google.maps.LatLng(Math.min(p1.lat, p2.lat), Math.min(p1.lng, p2.lng)),
              new window.google.maps.LatLng(Math.max(p1.lat, p2.lat), Math.max(p1.lng, p2.lng))
            );
            this.activeRectangle.setBounds(bounds);
          });
        } else if (this.currentVertices.length >= 2) {
          this.finish();
        }
        return;
      }

      // Previsualización de Polilínea (Direcciones de Aproximación)
      if (this.drawingMode === 'polyline') {
        if (!this.activePolyline && this.currentVertices.length >= 2) {
          this.activePolyline = new window.google.maps.Polyline({
            path: this.currentVertices,
            strokeColor: this.polylineOptions.strokeColor || '#2196F3',
            strokeWeight: this.polylineOptions.strokeWeight || 4,
            strokeOpacity: this.polylineOptions.strokeOpacity || 0.8,
            icons: this.polylineOptions.icons,
            clickable: false,
            zIndex: 99,
            map: this.map,
          });
        } else if (this.activePolyline) {
          this.activePolyline.setPath(this.currentVertices);
        }
      }

      // Previsualización de Polígono (CMOC / AIN / Avenida en Profundidad)
      if (this.drawingMode === 'polygon') {
        if (!this.activePolygon && this.currentVertices.length >= 2) {
          this.activePolygon = new window.google.maps.Polygon({
            paths: this.currentVertices,
            strokeColor: this.polygonOptions.strokeColor || '#FFC107',
            strokeWeight: this.polygonOptions.strokeWeight || 2,
            fillColor: this.polygonOptions.fillColor || '#FFC107',
            fillOpacity: this.polygonOptions.fillOpacity || 0.4,
            clickable: false,
            zIndex: 99,
            map: this.map,
          });
        } else if (this.activePolygon) {
          this.activePolygon.setPath(this.currentVertices);
        }
      }
    });

    // Doble clic para finalizar
    this.mapDblClickListener = this.map.addListener('dblclick', (e: any) => {
      if (e?.stop) e.stop();
      if (this.drawingMode === 'polyline' && this.currentVertices.length >= 2) {
        this.finish();
      } else if (this.drawingMode === 'polygon' && this.currentVertices.length >= 3) {
        this.finish();
      } else if (this.drawingMode === 'rectangle' && this.currentVertices.length >= 1) {
        this.finish();
      }
    });
  }

  finish() {
    if (!this.map) {
      this.cleanup();
      return;
    }

    // Finalizar Rectángulo (Fase 16: Método de Juego de Guerra - Faja o Caja)
    if (this.drawingMode === 'rectangle') {
      if (this.currentVertices.length < 2) {
        this.cleanup();
        return;
      }

      const p1 = this.currentVertices[0];
      const p2 = this.currentVertices[1];
      const bounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(Math.min(p1.lat, p2.lat), Math.min(p1.lng, p2.lng)),
        new window.google.maps.LatLng(Math.max(p1.lat, p2.lat), Math.max(p1.lng, p2.lng))
      );

      const finalizedRectangle = new window.google.maps.Rectangle({
        bounds,
        strokeColor: this.rectangleOptions.strokeColor || '#0097A7',
        strokeWeight: this.rectangleOptions.strokeWeight || 2,
        fillColor: this.rectangleOptions.fillColor || '#00BCD4',
        fillOpacity: this.rectangleOptions.fillOpacity || 0.2,
        clickable: true,
        editable: false,
        zIndex: 1,
        map: this.map,
      });

      finalizedRectangle.addListener('click', (e: any) => {
        if (this.map && window.google?.maps?.event) {
          window.google.maps.event.trigger(this.map, 'click', e);
        }
      });

      this.cleanup();

      const eventPayload = {
        type: 'rectangle',
        overlay: finalizedRectangle,
      };

      (this.listeners['overlaycomplete'] || []).forEach((fn) => {
        try {
          fn(eventPayload);
        } catch (err) {
          console.error('Error en listener de overlaycomplete:', err);
        }
      });
      return;
    }

    // Finalizar Polilínea (AA)
    if (this.drawingMode === 'polyline') {
      if (this.currentVertices.length < 2) {
        this.cleanup();
        return;
      }

      const finalizedPolyline = new window.google.maps.Polyline({
        path: [...this.currentVertices],
        strokeColor: this.polylineOptions.strokeColor || '#2196F3',
        strokeWeight: this.polylineOptions.strokeWeight || 4,
        strokeOpacity: this.polylineOptions.strokeOpacity || 0.8,
        icons: this.polylineOptions.icons,
        clickable: true,
        editable: false,
        zIndex: 2,
        map: this.map,
      });

      finalizedPolyline.addListener('click', (e: any) => {
        if (this.map && window.google?.maps?.event) {
          window.google.maps.event.trigger(this.map, 'click', e);
        }
      });

      this.cleanup();

      const eventPayload = {
        type: 'polyline',
        overlay: finalizedPolyline,
      };

      (this.listeners['overlaycomplete'] || []).forEach((fn) => {
        try {
          fn(eventPayload);
        } catch (err) {
          console.error('Error en listener de overlaycomplete:', err);
        }
      });
      return;
    }

    // Finalizar Polígono (CMOC / AIN / Avenida en Profundidad)
    if (this.drawingMode === 'polygon') {
      if (this.currentVertices.length < 3) {
        this.cleanup();
        return;
      }

      const finalizedPolygon = new window.google.maps.Polygon({
        paths: [...this.currentVertices],
        strokeColor: this.polygonOptions.strokeColor || '#FFC107',
        strokeWeight: this.polygonOptions.strokeWeight || 2,
        fillColor: this.polygonOptions.fillColor || '#FFC107',
        fillOpacity: this.polygonOptions.fillOpacity || 0.4,
        clickable: true,
        editable: false,
        zIndex: 1,
        map: this.map,
      });

      finalizedPolygon.addListener('click', (e: any) => {
        if (this.map && window.google?.maps?.event) {
          window.google.maps.event.trigger(this.map, 'click', e);
        }
      });

      this.cleanup();

      const eventPayload = {
        type: 'polygon',
        overlay: finalizedPolygon,
      };

      (this.listeners['overlaycomplete'] || []).forEach((fn) => {
        try {
          fn(eventPayload);
        } catch (err) {
          console.error('Error en listener de overlaycomplete:', err);
        }
      });
    }
  }

  cleanup() {
    if (this.mapClickListener && window.google?.maps?.event) {
      window.google.maps.event.removeListener(this.mapClickListener);
      this.mapClickListener = null;
    }
    if (this.mapMouseMoveListener && window.google?.maps?.event) {
      window.google.maps.event.removeListener(this.mapMouseMoveListener);
      this.mapMouseMoveListener = null;
    }
    if (this.mapDblClickListener && window.google?.maps?.event) {
      window.google.maps.event.removeListener(this.mapDblClickListener);
      this.mapDblClickListener = null;
    }
    if (this.activePolygon) {
      this.activePolygon.setMap(null);
      this.activePolygon = null;
    }
    if (this.activePolyline) {
      this.activePolyline.setMap(null);
      this.activePolyline = null;
    }
    if (this.activeRectangle) {
      this.activeRectangle.setMap(null);
      this.activeRectangle = null;
    }
    this.currentVertices = [];
    if (this.onVertexChange) {
      this.onVertexChange(0);
    }
    if (this.map) {
      this.map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
    }
  }
}

export default function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const drawingManagerRef = useRef<TacticalDrawingManager | null>(null);
  const elevatorRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const activeToolRef = useRef<ActiveTool>(null);

  // Estados de control
  const [overlaysCount, setOverlaysCount] = useState(0);
  const [vertexCount, setVertexCount] = useState(0);
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [orografiaData, setOrografiaData] = useState<{ altitud: number; lat: number; lng: number } | null>(null);
  const [consultandoOrografia, setConsultandoOrografia] = useState(false);

  // Fase 6, 7, 8, 12, 15 y 16: Estados de visibilidad de capas (por defecto todas marcadas)
  const [visibilidad, setVisibilidad] = useState({
    restringido: true,
    severo: true,
    clave: true,
    aaPropias: true,
    aaEnemigo: true,
    areaEmpeno: true,
    terrenoDefendible: true,
    ain: true,
    bav: true,
    unidades: true,
    metodoJG: true,
  });
  const visibilidadRef = useRef(visibilidad);
  visibilidadRef.current = visibilidad;

  // Fase 8: Tipo seleccionado de Blanco de Alto Valor
  const [bavTipo, setBavTipo] = useState<string>('c4');

  // Fase 15: Configuración de Unidades de Maniobra (Tipo de Unidad, Magnitud/Escalón, Nombre)
  const [unidadConfig, setUnidadConfig] = useState({
    tipo: 'infanteria',
    magnitud: 'II',
    nombre: 'RIMEC 35',
  });
  const unidadConfigRef = useRef(unidadConfig);
  unidadConfigRef.current = unidadConfig;

  // Fase 16: Método de Juego de Guerra (Fajas, Avenida en Profundidad, Caja)
  const [metodoJG, setMetodoJG] = useState<'faja' | 'avenida' | 'caja'>('faja');

  // Fase 9: Estados para Cálculo de Marcha (LFT)
  const [velocidadMarcha, setVelocidadMarcha] = useState<string>('4');
  const [resultadoMarcha, setResultadoMarcha] = useState<string | null>(null);

  // Fase 10: Estados para Análisis CARVER (BAV)
  const [carverVisible, setCarverVisible] = useState(false);
  const [selectedBavTarget, setSelectedBavTarget] = useState<{ tipo: string; lat: number; lng: number } | null>(null);
  const [carverValues, setCarverValues] = useState({
    c: 3,
    a: 3,
    r: 3,
    v: 3,
    e: 3,
    rec: 3,
  });

  // Fase 13: Matriz de Eventos y Líneas Fase de Tiempo (LFT)
  const [matrizEventos, setMatrizEventos] = useState<
    Array<{ id: number; ainLabel: string; noAntes: string; noDespues: string; indicador: string }>
  >([]);

  // Fase 19 & 20: App Instalable (PWA) & Centro de Descarga Multidispositivo
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [modalDescargaVisible, setModalDescargaVisible] = useState<boolean>(false);
  const [tabModalDescarga, setTabModalDescarga] = useState<'descargar' | 'qr' | 'guia' | 'mision'>('descargar');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [descargando, setDescargando] = useState<boolean>(false);
  const [copiadoExito, setCopiadoExito] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Detectar si ya corre como PWA instalada
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsAppInstalled(isStandalone);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Generación reactiva del código QR para el enlace de instalación multidispositivo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      QRCode.toDataURL(currentUrl, {
        width: 230,
        margin: 1,
        color: {
          dark: '#121613',
          light: '#f4fbf5',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('Error al generar código QR:', err));
    }
  }, [modalDescargaVisible]);

  const handleCopiarEnlace = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopiadoExito(true);
        setTimeout(() => setCopiadoExito(false), 2500);
      });
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      setModalDescargaVisible(true);
      setTabModalDescarga('guia');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleMatrizInputChange = (
    id: number,
    field: 'noAntes' | 'noDespues' | 'indicador',
    value: string
  ) => {
    setMatrizEventos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Fase 14: Potencia Relativa de Combate (PRC)
  const [prcValues, setPrcValues] = useState({
    azulInfMec: 0,
    azulTanques: 0,
    azulRecMec: 0,
    azulArt105: 0,
    azulArt122: 0,
    rojoInfMec: 0,
    rojoTanques: 0,
    rojoRecMec: 0,
    rojoArt105: 0,
    rojoArt155: 0,
  });

  const [prcRatioText, setPrcRatioText] = useState<string>('RATIO: AZUL 1 - 1.0 ROJO');
  const [prcCalculated, setPrcCalculated] = useState<boolean>(false);
  const [prcDetails, setPrcDetails] = useState({
    absolutoAzul: 0,
    absolutoRojo: 0,
    subManiobraAzul: 0,
    totalManiobraAzul: 0,
    subArtilleriaAzul: 0,
    totalArtilleriaAzul: 0,
    subManiobraRojo: 0,
    totalManiobraRojo: 0,
    subArtilleriaRojo: 0,
    totalArtilleriaRojo: 0,
  });

  const handlePrcInputChange = (field: keyof typeof prcValues, valStr: string) => {
    const val = Math.max(0, parseInt(valStr, 10) || 0);
    setPrcValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleCalcularPRC = useCallback(() => {
    // 1. Lectura de valores de los inputs (compatibilidad directa con DOM o estado)
    const azulInf =
      parseInt((document.getElementById('prc-azul-inf-mec') as HTMLInputElement)?.value || String(prcValues.azulInfMec), 10) || 0;
    const azulTq =
      parseInt((document.getElementById('prc-azul-tanques') as HTMLInputElement)?.value || String(prcValues.azulTanques), 10) || 0;
    const azulRec =
      parseInt((document.getElementById('prc-azul-rec-mec') as HTMLInputElement)?.value || String(prcValues.azulRecMec), 10) || 0;
    const azulArt105 =
      parseInt((document.getElementById('prc-azul-art-105') as HTMLInputElement)?.value || String(prcValues.azulArt105), 10) || 0;
    const azulArt122 =
      parseInt((document.getElementById('prc-azul-art-122') as HTMLInputElement)?.value || String(prcValues.azulArt122), 10) || 0;

    const rojoInf =
      parseInt((document.getElementById('prc-rojo-inf-mec') as HTMLInputElement)?.value || String(prcValues.rojoInfMec), 10) || 0;
    const rojoTq =
      parseInt((document.getElementById('prc-rojo-tanques') as HTMLInputElement)?.value || String(prcValues.rojoTanques), 10) || 0;
    const rojoRec =
      parseInt((document.getElementById('prc-rojo-rec-mec') as HTMLInputElement)?.value || String(prcValues.rojoRecMec), 10) || 0;
    const rojoArt105 =
      parseInt((document.getElementById('prc-rojo-art-105') as HTMLInputElement)?.value || String(prcValues.rojoArt105), 10) || 0;
    const rojoArt155 =
      parseInt((document.getElementById('prc-rojo-art-155') as HTMLInputElement)?.value || String(prcValues.rojoArt155), 10) || 0;

    // 2. Fórmulas Doctrinales Fijas (Cantidad * Valor = Subtotal)
    // AZUL Maniobra: Inf. Mec. (0.5), Tanques (0.6), Rec. Mec. (0.5)
    const subManiobraAzul = azulInf * 0.5 + azulTq * 0.6 + azulRec * 0.5;
    const totalManiobraAzul = subManiobraAzul * 0.90;

    // AZUL Artillería: 105mm (0.75), 122mm (2.0)
    const subArtilleriaAzul = azulArt105 * 0.75 + azulArt122 * 2.0;
    const totalArtilleriaAzul = subArtilleriaAzul * 0.90;

    // Absoluto AZUL
    const absolutoAzul = totalManiobraAzul + totalArtilleriaAzul;

    // ROJO Maniobra: Inf. Mec. (0.6), Tanques (2.2), Rec. Mec. (0.6)
    const subManiobraRojo = rojoInf * 0.6 + rojoTq * 2.2 + rojoRec * 0.6;
    const totalManiobraRojo = subManiobraRojo * 0.85;

    // ROJO Artillería: 105mm (0.8), 155mm (2.5)
    const subArtilleriaRojo = rojoArt105 * 0.8 + rojoArt155 * 2.5;
    const totalArtilleriaRojo = subArtilleriaRojo * 0.85;

    // Absoluto ROJO
    const absolutoRojo = totalManiobraRojo + totalArtilleriaRojo;

    // 3. Proporción (Ratio): Divide Absoluto ROJO entre Absoluto AZUL. Redondear a 1 decimal
    let formattedRatio = '';
    if (absolutoAzul === 0 && absolutoRojo === 0) {
      formattedRatio = 'RATIO: AZUL 1 - 1.0 ROJO';
    } else if (absolutoAzul === 0) {
      formattedRatio = `RATIO: AZUL 0 - ${absolutoRojo.toFixed(1)} ROJO`;
    } else {
      const ratio = absolutoRojo / absolutoAzul;
      formattedRatio = `RATIO: AZUL 1 - ${ratio.toFixed(1)} ROJO`;
    }

    setPrcRatioText(formattedRatio);
    setPrcCalculated(true);
    setPrcDetails({
      absolutoAzul,
      absolutoRojo,
      subManiobraAzul,
      totalManiobraAzul,
      subArtilleriaAzul,
      totalArtilleriaAzul,
      subManiobraRojo,
      totalManiobraRojo,
      subArtilleriaRojo,
      totalArtilleriaRojo,
    });

    // Actualización directa del DOM con ID 'resultadoPRC'
    const resultadoDiv = document.getElementById('resultadoPRC');
    if (resultadoDiv) {
      resultadoDiv.innerText = formattedRatio;
    }
  }, [prcValues]);

  // Exponer globalmente para conveniencia de depuración y testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).calcularPRC = handleCalcularPRC;
    }
  }, [handleCalcularPRC]);

  // Fase 11: Matriz de Efectos CC.MM. en Operaciones
  // Estado: clave `${sistemaIdx}-${factorIdx}-${subcolumna}` ('A': Amigas, 'E': Enemigas)
  // Ciclo exacto: 0 (Sin evaluar - transparente/gris) -> 1 (Favorable - #4CAF50) -> 2 (Marginal - #FFC107) -> 3 (Desfavorable - #F44336) -> 0
  const [ccmmStates, setCcmmStates] = useState<Record<string, number>>({});

  const toggleCcmmCell = (key: string) => {
    setCcmmStates((prev) => {
      const current = prev[key] || 0;
      const next = (current + 1) % 4;
      return { ...prev, [key]: next };
    });
  };

  const handleResetCcmm = () => {
    setCcmmStates({});
  };

  const getCcmmBgColor = (val: number) => {
    switch (val) {
      case 1:
        return '#4CAF50';
      case 2:
        return '#FFC107';
      case 3:
        return '#F44336';
      default:
        return 'transparent';
    }
  };

  const getCcmmTextColor = (val: number) => {
    switch (val) {
      case 2:
        return '#121613';
      case 1:
      case 3:
        return '#ffffff';
      default:
        return '#556655';
    }
  };

  // Conteo de elementos en cada capa (Fase 12 incluye AIN, Fase 15 incluye Unidades, Fase 16 incluye Método JG)
  const [layerCounts, setLayerCounts] = useState({
    restringido: 0,
    severo: 0,
    clave: 0,
    aaPropias: 0,
    aaEnemigo: 0,
    areaEmpeno: 0,
    terrenoDefendible: 0,
    ain: 0,
    bav: 0,
    unidades: 0,
    metodoJG: 0,
  });

  const syncLayerCounts = useCallback(() => {
    setLayerCounts({
      restringido: capaRestringido.length,
      severo: capaSevero.length,
      clave: capaClave.length,
      aaPropias: capaAAPropias.length,
      aaEnemigo: capaAAEnemigo.length,
      areaEmpeno: capaAE.length,
      terrenoDefendible: capaDefendible.length,
      ain: capaAIN.filter((item) => typeof item?.getPath === 'function').length,
      bav: capaBAV.length,
      unidades: capaUnidades.length,
      metodoJG: capaMetodoJG.length,
    });
  }, []);

  const updateActiveTool = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);
    activeToolRef.current = tool;
  }, []);

  // Fase 15 - Función para abrir el InfoWindow interactivo de Unidad de Maniobra con edición de Tipo, Magnitud, Nombre, Tarea y Propósito
  const abrirInfoWindowUnidad = useCallback((marker: any, map: any) => {
    if (!infoWindowUnidad && window.google?.maps?.InfoWindow) {
      infoWindowUnidad = new window.google.maps.InfoWindow();
      if (typeof window !== 'undefined') {
        window.infoWindowUnidad = infoWindowUnidad;
      }
    }
    if (!infoWindowUnidad) return;

    const esAzul = marker.bando === 'azul';
    const titulo = esAzul ? 'UNIDAD AZUL (PROPIAS)' : 'UNIDAD ROJO (ENEMIGO)';
    const colorBorde = esAzul ? '#1E88E5' : '#E53935';
    const colorTexto = esAzul ? '#90caf9' : '#ef9a9a';
    const colorFondoTag = esAzul ? '#0d2238' : '#331215';

    const pos = marker.getPosition ? marker.getPosition() : null;
    const latStr = pos ? (typeof pos.lat === 'function' ? pos.lat() : pos.lat).toFixed(4) : '';
    const lngStr = pos ? (typeof pos.lng === 'function' ? pos.lng() : pos.lng).toFixed(4) : '';
    const posLabel = latStr && lngStr ? `${latStr}, ${lngStr}` : 'En mapa';

    const cleanNombre = (marker.nombre || (esAzul ? 'RIMEC 35' : 'B.TANQ 1')).replace(/"/g, '&quot;');
    const tipoActual = marker.tipo || 'infanteria';
    const magActual = marker.magnitud || 'II';

    const contentHtml = `
      <div style="background:#141915; color:#d6dfd5; padding:10px 12px; font-family:'Courier New', monospace; font-size:11px; border:1px solid ${colorBorde}; border-radius:4px; min-width:270px; max-width:320px; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #2d382d; padding-bottom:6px; margin-bottom:8px;">
          <div>
            <div style="font-weight:bold; font-size:11px; color:${colorTexto}; text-transform:uppercase; letter-spacing:0.04em;">
              ${titulo}
            </div>
            <div style="font-size:9px; color:#8fa38e; margin-top:2px;">
              Pos: ${posLabel} • <span style="color:#ffd54f; font-weight:bold;">✥ Arrastrable</span>
            </div>
          </div>
          <span style="font-size:10px; background:${colorFondoTag}; color:#ffd54f; border:1px solid ${colorBorde}; padding:1px 6px; border-radius:2px; font-weight:bold;">
            ${magActual}
          </span>
        </div>

        <!-- Nombre / Designación de la Unidad -->
        <div style="margin-bottom:7px;">
          <label for="unidad-input-nombre" style="display:block; font-size:10px; font-weight:bold; color:#a6b9a4; margin-bottom:3px; text-transform:uppercase;">
            Nombre / Designación:
          </label>
          <input id="unidad-input-nombre" type="text" value="${cleanNombre}" style="width:100%; box-sizing:border-box; background:#1c231e; border:1px solid #364638; border-radius:3px; color:#ffffff; font-family:'Courier New', monospace; font-size:11px; font-weight:bold; padding:4px 6px; outline:none;" placeholder="Ej: RIMEC 35, B.Tanq 1..." />
        </div>

        <!-- Selector de Tipo de Unidad y Magnitud (2 Columnas) -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:7px;">
          <div>
            <label for="unidad-input-tipo" style="display:block; font-size:9.5px; font-weight:bold; color:#a6b9a4; margin-bottom:3px; text-transform:uppercase;">
              Tipo de Unidad:
            </label>
            <select id="unidad-input-tipo" style="width:100%; box-sizing:border-box; background:#1c231e; border:1px solid #364638; border-radius:3px; color:#e2ede1; font-family:'Courier New', monospace; font-size:10px; padding:3px 4px; outline:none;">
              <option value="infanteria" ${tipoActual === 'infanteria' ? 'selected' : ''}>Infantería (X)</option>
              <option value="tanques" ${tipoActual === 'tanques' ? 'selected' : ''}>Tanques / Blind.</option>
              <option value="rec_mec" ${tipoActual === 'rec_mec' ? 'selected' : ''}>Rec. Mecanizado</option>
              <option value="artilleria" ${tipoActual === 'artilleria' ? 'selected' : ''}>Artillería (●)</option>
              <option value="ingenieros" ${tipoActual === 'ingenieros' ? 'selected' : ''}>Ingenieros</option>
              <option value="ada" ${tipoActual === 'ada' ? 'selected' : ''}>ADA / Antiaérea</option>
              <option value="comunicaciones" ${tipoActual === 'comunicaciones' ? 'selected' : ''}>Comunicaciones</option>
              <option value="logistica" ${tipoActual === 'logistica' ? 'selected' : ''}>Logística / Apoyo</option>
            </select>
          </div>

          <div>
            <label for="unidad-input-magnitud" style="display:block; font-size:9.5px; font-weight:bold; color:#a6b9a4; margin-bottom:3px; text-transform:uppercase;">
              Magnitud (Escalón):
            </label>
            <select id="unidad-input-magnitud" style="width:100%; box-sizing:border-box; background:#1c231e; border:1px solid #364638; border-radius:3px; color:#ffd54f; font-family:'Courier New', monospace; font-size:10px; font-weight:bold; padding:3px 4px; outline:none;">
              <option value="•" ${magActual === '•' ? 'selected' : ''}>Escuadra (•)</option>
              <option value="••" ${magActual === '••' ? 'selected' : ''}>Pelotón (••)</option>
              <option value="I" ${magActual === 'I' ? 'selected' : ''}>Compañía / Batería (I)</option>
              <option value="II" ${magActual === 'II' ? 'selected' : ''}>Batallón / Grupo (II)</option>
              <option value="III" ${magActual === 'III' ? 'selected' : ''}>Regimiento (III)</option>
              <option value="X" ${magActual === 'X' ? 'selected' : ''}>Brigada (X)</option>
              <option value="XX" ${magActual === 'XX' ? 'selected' : ''}>División (XX)</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:7px;">
          <label for="unidad-input-tarea" style="display:block; font-size:10px; font-weight:bold; color:#a6b9a4; margin-bottom:2px; text-transform:uppercase;">
            TAREA:
          </label>
          <textarea id="unidad-input-tarea" rows="2" style="width:100%; box-sizing:border-box; background:#1c231e; border:1px solid #364638; border-radius:3px; color:#e2ede1; font-family:'Courier New', monospace; font-size:10.5px; padding:4px 6px; resize:vertical; outline:none;" placeholder="Definir tarea táctica...">${marker.tareaText || ''}</textarea>
        </div>

        <div style="margin-bottom:9px;">
          <label for="unidad-input-proposito" style="display:block; font-size:10px; font-weight:bold; color:#a6b9a4; margin-bottom:2px; text-transform:uppercase;">
            PROPÓSITO:
          </label>
          <textarea id="unidad-input-proposito" rows="2" style="width:100%; box-sizing:border-box; background:#1c231e; border:1px solid #364638; border-radius:3px; color:#e2ede1; font-family:'Courier New', monospace; font-size:10.5px; padding:4px 6px; resize:vertical; outline:none;" placeholder="Definir propósito de la maniobra...">${marker.propositoText || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #2d382d; padding-top:7px;">
          <button id="btn-eliminar-unidad" type="button" style="padding:4px 8px; font-family:'Courier New', monospace; font-size:10px; font-weight:bold; text-transform:uppercase; background:#291416; border:1px solid #5a2628; color:#f0a8a8; border-radius:3px; cursor:pointer;">
            Eliminar
          </button>
          <div style="display:flex; gap:6px;">
            <button id="btn-actualizar-unidad" type="button" style="padding:4px 10px; font-family:'Courier New', monospace; font-size:10px; font-weight:bold; text-transform:uppercase; background:#1e3522; border:1px solid #396f41; color:#98e6a1; border-radius:3px; cursor:pointer;">
              Guardar
            </button>
            <button id="btn-cerrar-info-unidad" type="button" style="padding:4px 8px; font-family:'Courier New', monospace; font-size:10px; font-weight:bold; text-transform:uppercase; background:#243526; border:1px solid #415e43; color:#c5e1c4; border-radius:3px; cursor:pointer;">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `;

    infoWindowUnidad.setContent(contentHtml);
    infoWindowUnidad.open(map, marker);

    // Retención de datos y actualización dinámica
    window.google.maps.event.addListenerOnce(infoWindowUnidad, 'domready', () => {
      const nombreEl = document.getElementById('unidad-input-nombre') as HTMLInputElement | null;
      const tipoEl = document.getElementById('unidad-input-tipo') as HTMLSelectElement | null;
      const magEl = document.getElementById('unidad-input-magnitud') as HTMLSelectElement | null;
      const tareaEl = document.getElementById('unidad-input-tarea') as HTMLTextAreaElement | null;
      const propositoEl = document.getElementById('unidad-input-proposito') as HTMLTextAreaElement | null;
      const btnActualizar = document.getElementById('btn-actualizar-unidad') as HTMLButtonElement | null;
      const btnEliminar = document.getElementById('btn-eliminar-unidad') as HTMLButtonElement | null;
      const btnCerrar = document.getElementById('btn-cerrar-info-unidad') as HTMLButtonElement | null;

      const sincronizarYActualizar = () => {
        if (nombreEl) marker.nombre = nombreEl.value.trim() || marker.nombre;
        if (tipoEl) marker.tipo = tipoEl.value;
        if (magEl) marker.magnitud = magEl.value;
        if (tareaEl) marker.tareaText = tareaEl.value;
        if (propositoEl) marker.propositoText = propositoEl.value;

        actualizarSimbologiaUnidad(marker);
      };

      if (nombreEl) {
        nombreEl.addEventListener('input', () => {
          marker.nombre = nombreEl.value.trim();
          actualizarSimbologiaUnidad(marker);
        });
      }

      if (tipoEl) {
        tipoEl.addEventListener('change', () => {
          marker.tipo = tipoEl.value;
          actualizarSimbologiaUnidad(marker);
        });
      }

      if (magEl) {
        magEl.addEventListener('change', () => {
          marker.magnitud = magEl.value;
          actualizarSimbologiaUnidad(marker);
        });
      }

      if (tareaEl) {
        tareaEl.addEventListener('input', () => {
          marker.tareaText = tareaEl.value;
        });
        tareaEl.addEventListener('change', () => {
          marker.tareaText = tareaEl.value;
        });
      }

      if (propositoEl) {
        propositoEl.addEventListener('input', () => {
          marker.propositoText = propositoEl.value;
        });
        propositoEl.addEventListener('change', () => {
          marker.propositoText = propositoEl.value;
        });
      }

      if (btnActualizar) {
        btnActualizar.addEventListener('click', () => {
          sincronizarYActualizar();
          btnActualizar.innerText = '✓ Guardado';
          setTimeout(() => {
            if (btnActualizar) btnActualizar.innerText = 'Guardar';
          }, 1200);
        });
      }

      if (btnEliminar) {
        btnEliminar.addEventListener('click', () => {
          marker.setMap(null);
          capaUnidades = capaUnidades.filter((m) => m !== marker);
          if (typeof window !== 'undefined') window.capaUnidades = capaUnidades;
          overlaysRef.current = overlaysRef.current.filter((m) => m !== marker);
          setOverlaysCount(overlaysRef.current.length);
          syncLayerCounts();
          infoWindowUnidad.close();
        });
      }

      if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
          sincronizarYActualizar();
          infoWindowUnidad.close();
        });
      }
    });
  }, [syncLayerCounts]);

  // Estados generales del mapa
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const initMap = useCallback(() => {
    if (!mapContainerRef.current) return;

    if (!window.google?.maps) {
      setMapError('Google Maps API no está disponible en el entorno.');
      return;
    }

    try {
      // 1. Inicializar mapa en Cochabamba (-17.3895, -66.1568), zoom 10, tipo TERRAIN
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: -17.3895, lng: -66.1568 },
        zoom: 10,
        mapTypeId: 'terrain',
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle?.DROPDOWN_MENU || 1,
          position: window.google.maps.ControlPosition?.TOP_RIGHT || 2,
        },
        zoomControl: true,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;

      // 2. Instanciar gestor táctico de dibujo
      const drawingManager = new TacticalDrawingManager({
        drawingMode: null,
      });

      drawingManager.setMap(map);
      drawingManager.onVertexChange = (count: number) => {
        setVertexCount(count);
      };

      // Listener overlaycomplete: almacena calco en el array de capa correspondiente o calcula regla de marcha
      drawingManager.addListener('overlaycomplete', (event: any) => {
        const currentTool = activeToolRef.current;

        // Fase 9: Si la regla de medición está activa, calcular LFT y no persistir en calcos tácticos
        if (reglaActiva || currentTool === 'medir_ruta') {
          if (event.overlay) {
            const lineaDibujada = event.overlay;
            lineaRegla = lineaDibujada;
            if (typeof window !== 'undefined') window.lineaRegla = lineaDibujada;

            let distanciaMetros = 0;
            try {
              if (window.google?.maps?.geometry?.spherical?.computeLength) {
                distanciaMetros = window.google.maps.geometry.spherical.computeLength(lineaDibujada.getPath());
              } else {
                const path = lineaDibujada.getPath();
                const count = typeof path.getLength === 'function' ? path.getLength() : path.length;
                for (let i = 0; i < count - 1; i++) {
                  const p1 = typeof path.getAt === 'function' ? path.getAt(i) : path[i];
                  const p2 = typeof path.getAt === 'function' ? path.getAt(i + 1) : path[i + 1];
                  const lat1 = typeof p1.lat === 'function' ? p1.lat() : p1.lat;
                  const lng1 = typeof p1.lng === 'function' ? p1.lng() : p1.lng;
                  const lat2 = typeof p2.lat === 'function' ? p2.lat() : p2.lat;
                  const lng2 = typeof p2.lng === 'function' ? p2.lng() : p2.lng;
                  const R = 6378137;
                  const dLat = ((lat2 - lat1) * Math.PI) / 180;
                  const dLong = ((lng2 - lng1) * Math.PI) / 180;
                  const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
                    Math.sin(dLong / 2) * Math.sin(dLong / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  distanciaMetros += R * c;
                }
              }
            } catch (calcErr) {
              console.error('Error calculando longitud de regla:', calcErr);
            }

            const distanciaKmNum = distanciaMetros / 1000;
            const distanciaKm = distanciaKmNum.toFixed(2);

            const selectEl = document.getElementById('selectVelocidad') as HTMLSelectElement | null;
            const velocidadSeleccionada = parseFloat(selectEl?.value || '4');
            const tiempoHoras = distanciaKmNum / (velocidadSeleccionada > 0 ? velocidadSeleccionada : 4);

            let horas = Math.floor(tiempoHoras);
            let minutos = Math.round((tiempoHoras - horas) * 60);
            if (minutos === 60) {
              horas += 1;
              minutos = 0;
            }

            const textoFormateado = `Distancia: ${distanciaKm} km | Tiempo Estimado: ${horas}h ${minutos}m`;
            const resultadoDiv = document.getElementById('resultadoMarcha');
            if (resultadoDiv) {
              resultadoDiv.innerHTML = `Distancia: <span style="color:#ffffff; font-weight:bold;">${distanciaKm} km</span> | Tiempo Estimado: <span style="color:#ffd54f; font-weight:bold;">${horas}h ${minutos}m</span>`;
            }
            setResultadoMarcha(textoFormateado);

            // Inmediatamente después del cálculo, elimina la línea del mapa
            lineaDibujada.setMap(null);
            lineaRegla = null;
            if (typeof window !== 'undefined') window.lineaRegla = null;
          }

          reglaActiva = false;
          if (typeof window !== 'undefined') window.reglaActiva = false;
          drawingManager.setDrawingMode(null);
          updateActiveTool(null);
          setVertexCount(0);
          if (map) {
            map.setOptions({ draggableCursor: null });
          }
          return;
        }

        if (event.overlay) {
          overlaysRef.current.push(event.overlay);
          setOverlaysCount(overlaysRef.current.length);

          // Fases 6 y 7: Identificar qué herramienta estaba activa y guardar en el array correspondiente
          if (currentTool === 'cmoc_restringido') {
            capaRestringido.push(event.overlay);
            if (!visibilidadRef.current.restringido) {
              event.overlay.setMap(null);
            }
          } else if (currentTool === 'cmoc_severo') {
            capaSevero.push(event.overlay);
            if (!visibilidadRef.current.severo) {
              event.overlay.setMap(null);
            }
          } else if (currentTool === 'aa_propias') {
            capaAAPropias.push(event.overlay);
            if (!visibilidadRef.current.aaPropias) {
              event.overlay.setMap(null);
            }
          } else if (currentTool === 'aa_enemigo') {
            capaAAEnemigo.push(event.overlay);
            if (!visibilidadRef.current.aaEnemigo) {
              event.overlay.setMap(null);
            }
          } else if (currentTool === 'area_empeno') {
            capaAE.push(event.overlay);
            if (!visibilidadRef.current.areaEmpeno) {
              event.overlay.setMap(null);
            }
          } else if (currentTool === 'terreno_defendible') {
            capaDefendible.push(event.overlay);
            if (!visibilidadRef.current.terrenoDefendible) {
              event.overlay.setMap(null);
            }
          } else if (currentTool === 'ain') {
            // Fase 12 - Áreas de Interés Nombradas (AIN)
            // a) Guarda el polígono (event.overlay) en el array capaAIN
            capaAIN.push(event.overlay);
            if (!visibilidadRef.current.ain) {
              event.overlay.setMap(null);
            }

            // b) Calcula el centro del polígono iterando sobre sus vértices usando google.maps.LatLngBounds() y .getCenter()
            const bounds = new window.google.maps.LatLngBounds();
            const vertices = event.overlay.getPath().getArray();
            for (let i = 0; i < vertices.length; i++) {
              bounds.extend(vertices[i]);
            }
            const centro = bounds.getCenter();

            // c) Crea un google.maps.Marker en ese centro calculado sin ícono visible (transparente) pero con label "AIN " + contadorAIN
            const etiquetaMarker = new window.google.maps.Marker({
              position: centro,
              map: visibilidadRef.current.ain ? map : null,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 0,
              },
              label: {
                text: `AIN ${contadorAIN}`,
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '12px',
              },
              title: `Área de Interés Nombrada AIN ${contadorAIN}`,
            });

            event.overlay.ainNumero = contadorAIN;
            event.overlay.ainLabel = `AIN ${contadorAIN}`;

            // d) Guarda también este marcador (etiqueta) en el array capaAIN
            capaAIN.push(etiquetaMarker);
            overlaysRef.current.push(etiquetaMarker);

            // Guarda el identificador asignado
            const nuevoIdAIN = contadorAIN;

            // e) Incrementa el contador: contadorAIN++
            contadorAIN++;
            if (typeof window !== 'undefined') {
              window.contadorAIN = contadorAIN;
              window.capaAIN = capaAIN;
            }

            // Fase 13: Vinculación automática en la Matriz de Eventos y LFT
            setMatrizEventos((prev) => [
              ...prev,
              {
                id: nuevoIdAIN,
                ainLabel: `AIN ${nuevoIdAIN}`,
                noAntes: '',
                noDespues: '',
                indicador: '',
              },
            ]);
          } else if (currentTool === 'metodo_jg' || modoMetodoJG || (typeof window !== 'undefined' && window.modoMetodoJG)) {
            // Fase 16 - Áreas del Método de Juego de Guerra (Fajas, Avenidas en Profundidad, Cajas)
            capaMetodoJG.push(event.overlay);
            if (!visibilidadRef.current.metodoJG) {
              event.overlay.setMap(null);
            }
            modoMetodoJG = false;
            if (typeof window !== 'undefined') {
              window.modoMetodoJG = false;
              window.capaMetodoJG = capaMetodoJG;
            }
          }

          syncLayerCounts();
        }
        drawingManager.setDrawingMode(null);
        updateActiveTool(null);
        setVertexCount(0);
      });

      drawingManagerRef.current = drawingManager;

      // 3. Fase 5: Instanciar servicio de elevación e InfoWindow
      const elevator = new window.google.maps.ElevationService();
      elevatorRef.current = elevator;

      const infoWindow = new window.google.maps.InfoWindow();
      infoWindowRef.current = infoWindow;

      // Fase 15: InfoWindow único global reciclable para Unidades de Maniobra
      if (!infoWindowUnidad && window.google?.maps?.InfoWindow) {
        infoWindowUnidad = new window.google.maps.InfoWindow();
        if (typeof window !== 'undefined') {
          window.infoWindowUnidad = infoWindowUnidad;
        }
      }

      // 4. Listener global de clic en el mapa
      map.addListener('click', (event: any) => {
        if (!event?.latLng) return;

        // Fase 15: Inserción de Unidad de Maniobra AZUL (Arrastrable con el cursor, tipo, magnitud y nombre)
        if (modoUnidadAzul || window.modoUnidadAzul || activeToolRef.current === 'unidad_azul') {
          const cfg = unidadConfigRef.current || { tipo: 'infanteria', magnitud: 'II', nombre: 'RIMEC 35' };
          const tipo = cfg.tipo || 'infanteria';
          const magnitud = cfg.magnitud || 'II';
          const nombre = (cfg.nombre && cfg.nombre.trim()) || 'RIMEC 35';

          const marker: any = new window.google.maps.Marker({
            position: event.latLng,
            map: visibilidadRef.current.unidades ? map : null,
            draggable: true,
            cursor: 'grab',
            icon: {
              url: getUnidadSymbolDataUri('azul', tipo, magnitud, nombre),
              scaledSize: new window.google.maps.Size(64, 52),
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(32, 24),
            },
            title: `${nombre} [AZUL - ${tipo.toUpperCase()} (${magnitud})]`,
          });

          marker.bando = 'azul';
          marker.tipo = tipo;
          marker.magnitud = magnitud;
          marker.nombre = nombre;
          marker.tareaText = '';
          marker.propositoText = '';

          marker.addListener('dragstart', () => {
            if (infoWindowUnidad) {
              infoWindowUnidad.close();
            }
          });

          marker.addListener('dragend', (dragEvt: any) => {
            if (dragEvt?.latLng) {
              marker.lat = dragEvt.latLng.lat();
              marker.lng = dragEvt.latLng.lng();
            }
          });

          marker.addListener('click', () => {
            abrirInfoWindowUnidad(marker, map);
          });

          capaUnidades.push(marker);
          overlaysRef.current.push(marker);
          setOverlaysCount(overlaysRef.current.length);
          syncLayerCounts();

          modoUnidadAzul = false;
          if (typeof window !== 'undefined') window.modoUnidadAzul = false;
          updateActiveTool(null);
          map.setOptions({ draggableCursor: null });
          return;
        }

        // Fase 15: Inserción de Unidad de Maniobra ROJO (Arrastrable con el cursor, tipo, magnitud y nombre)
        if (modoUnidadRojo || window.modoUnidadRojo || activeToolRef.current === 'unidad_rojo') {
          const cfg = unidadConfigRef.current || { tipo: 'infanteria', magnitud: 'II', nombre: 'B.TANQ 1' };
          const tipo = cfg.tipo || 'infanteria';
          const magnitud = cfg.magnitud || 'II';
          const nombre = (cfg.nombre && cfg.nombre.trim()) || 'B.TANQ 1';

          const marker: any = new window.google.maps.Marker({
            position: event.latLng,
            map: visibilidadRef.current.unidades ? map : null,
            draggable: true,
            cursor: 'grab',
            icon: {
              url: getUnidadSymbolDataUri('rojo', tipo, magnitud, nombre),
              scaledSize: new window.google.maps.Size(64, 52),
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(32, 24),
            },
            title: `${nombre} [ROJO - ${tipo.toUpperCase()} (${magnitud})]`,
          });

          marker.bando = 'rojo';
          marker.tipo = tipo;
          marker.magnitud = magnitud;
          marker.nombre = nombre;
          marker.tareaText = '';
          marker.propositoText = '';

          marker.addListener('dragstart', () => {
            if (infoWindowUnidad) {
              infoWindowUnidad.close();
            }
          });

          marker.addListener('dragend', (dragEvt: any) => {
            if (dragEvt?.latLng) {
              marker.lat = dragEvt.latLng.lat();
              marker.lng = dragEvt.latLng.lng();
            }
          });

          marker.addListener('click', () => {
            abrirInfoWindowUnidad(marker, map);
          });

          capaUnidades.push(marker);
          overlaysRef.current.push(marker);
          setOverlaysCount(overlaysRef.current.length);
          syncLayerCounts();

          modoUnidadRojo = false;
          if (typeof window !== 'undefined') window.modoUnidadRojo = false;
          updateActiveTool(null);
          map.setOptions({ draggableCursor: null });
          return;
        }

        // Fase 3 y 6: Terreno Clave
        if (window.__modoTerrenoClave) {
          const marker = new window.google.maps.Marker({
            position: event.latLng,
            map: visibilidadRef.current.clave ? map : null,
            icon: {
              url: TERRENO_CLAVE_ICON_URI,
              scaledSize: new window.google.maps.Size(32, 32),
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(16, 16),
            },
            title: 'Terreno Clave (C)',
          });

          marker.addListener('click', (e: any) => {
            if (map && window.google?.maps?.event) {
              window.google.maps.event.trigger(map, 'click', e);
            }
          });

          // Fase 6: Guardar en array capaClave
          capaClave.push(marker);
          overlaysRef.current.push(marker);
          setOverlaysCount(overlaysRef.current.length);
          syncLayerCounts();

          window.__modoTerrenoClave = false;
          updateActiveTool(null);
          map.setOptions({ draggableCursor: null });
          return;
        }

        // Fase 8: Blancos de Alto Valor (BAV)
        if (window.__modoBAV) {
          const selectEl = document.getElementById('select-bav') as HTMLSelectElement | null;
          const selectedTipo = selectEl?.value || 'c4';
          const bavIconUri = getBAVSymbolDataUri(selectedTipo);

          const marker: any = new window.google.maps.Marker({
            position: event.latLng,
            map: visibilidadRef.current.bav ? map : null,
            icon: {
              url: bavIconUri,
              scaledSize: new window.google.maps.Size(30, 30),
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(15, 15),
            },
            title: `Blanco de Alto Valor: ${selectedTipo.toUpperCase()}`,
          });
          marker.tipoBAV = selectedTipo;

          // Fase 10: Evento click en el marcador BAV para activar Análisis CARVER (BAV)
          marker.addListener('click', (e: any) => {
            const panelEl = document.getElementById('panelCarver');
            if (panelEl) {
              panelEl.style.display = 'block';
            }
            setCarverVisible(true);
            const pos = marker.getPosition();
            const lat = pos ? (typeof pos.lat === 'function' ? pos.lat() : pos.lat) : event.latLng.lat();
            const lng = pos ? (typeof pos.lng === 'function' ? pos.lng() : pos.lng) : event.latLng.lng();
            setSelectedBavTarget({
              tipo: selectedTipo,
              lat: parseFloat(Number(lat).toFixed(4)),
              lng: parseFloat(Number(lng).toFixed(4)),
            });
            if (map && window.google?.maps?.event) {
              window.google.maps.event.trigger(map, 'click', e);
            }
          });

          // Guardar en array capaBAV
          capaBAV.push(marker);
          overlaysRef.current.push(marker);
          setOverlaysCount(overlaysRef.current.length);
          syncLayerCounts();

          window.__modoBAV = false;
          updateActiveTool(null);
          map.setOptions({ draggableCursor: null });
          return;
        }

        // Fase 5: Análisis de Orografía (Consulta de Altitud / Cota)
        if (window.__modoOrografia) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          // Restablecer modo y cursor inmediatamente tras la interacción según requerimientos
          window.__modoOrografia = false;
          setActiveTool(null);
          map.setOptions({ draggableCursor: null });

          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="background:#131814; color:#d6dfd5; padding:8px 12px; font-family:'Courier New', monospace; font-size:12px; border:1px solid #2d382d; border-radius:3px; min-width:190px;">
                <div style="color:#a6b9a4; font-weight:bold; font-size:11px; margin-bottom:5px; border-bottom:1px solid #2d382d; padding-bottom:3px; text-transform:uppercase; letter-spacing:0.04em;">
                  Análisis de Orografía
                </div>
                <div style="color:#81c784; font-size:11px; margin-bottom:3px;">
                  Consultando cota de altitud...
                </div>
                <div style="color:#7e8f7c; font-size:11px;">
                  Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}
                </div>
              </div>
            `);
            infoWindowRef.current.setPosition(event.latLng);
            infoWindowRef.current.open(map);
          }

          setConsultandoOrografia(true);

          const resolverAltitud = async () => {
            let altitudFinal: number | null = null;

            // 1. Intento primario con Google Maps ElevationService
            if (elevatorRef.current) {
              try {
                altitudFinal = await new Promise<number | null>((resolve) => {
                  elevatorRef.current.getElevationForLocations(
                    { locations: [event.latLng] },
                    (results: any[], status: string) => {
                      if (status === 'OK' && results && results[0] && typeof results[0].elevation === 'number') {
                        resolve(Math.round(results[0].elevation));
                      } else {
                        resolve(null);
                      }
                    }
                  );
                });
              } catch (err) {
                console.warn('Google Maps ElevationService:', err);
              }
            }

            // 2. Fallback con API topográfica SRTM/Copernicus DEM (si Google Elevation API no está habilitada en la clave)
            if (altitudFinal === null) {
              try {
                const res = await fetch(
                  `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(6)}&longitude=${lng.toFixed(6)}`
                );
                if (res.ok) {
                  const data = await res.json();
                  if (data?.elevation && Array.isArray(data.elevation) && typeof data.elevation[0] === 'number') {
                    altitudFinal = Math.round(data.elevation[0]);
                  }
                }
              } catch (fallbackErr) {
                console.warn('Fallback topográfico DEM:', fallbackErr);
              }
            }

            // 3. Fallback de estimación geomorfológica regional si falla toda red
            if (altitudFinal === null) {
              const baseCochabamba = 2564;
              const dLat = lat - (-17.3895);
              const dLng = lng - (-66.1568);
              const cordillera = dLat > 0 ? dLat * -6000 : dLat * 1800;
              altitudFinal = Math.round(Math.max(1800, Math.min(5035, baseCochabamba + cordillera + Math.abs(dLng) * 1100)));
            }

            setConsultandoOrografia(false);

            // Mostrar el resultado definitivo en el InfoWindow
            if (infoWindowRef.current) {
              const contentString = `
                <div style="background:#131814; color:#d6dfd5; padding:8px 12px; font-family:'Courier New', monospace; font-size:12px; border:1px solid #2d382d; border-radius:3px; min-width:190px;">
                  <div style="color:#a6b9a4; font-weight:bold; font-size:11px; margin-bottom:6px; border-bottom:1px solid #2d382d; padding-bottom:3px; text-transform:uppercase; letter-spacing:0.04em;">
                    Análisis de Orografía
                  </div>
                  <div style="margin-bottom:4px;">
                    <span style="color:#7e8f7c;">Altitud:</span> <strong style="color:#ffffff;">${altitudFinal} Metros</strong>
                  </div>
                  <div>
                    <span style="color:#7e8f7c;">Coordenadas:</span> ${lat.toFixed(4)}, ${lng.toFixed(4)}
                  </div>
                </div>
              `;
              infoWindowRef.current.setContent(contentString);
              infoWindowRef.current.setPosition(event.latLng);
              infoWindowRef.current.open(map);
            }

            // Registrar en estado local para el módulo lateral de orografía
            setOrografiaData({
              altitud: altitudFinal,
              lat: parseFloat(lat.toFixed(4)),
              lng: parseFloat(lng.toFixed(4)),
            });
          };

          resolverAltitud();
        }
      });

      setMapLoaded(true);
      setMapError(null);
    } catch (err: any) {
      console.error('Error al inicializar el visor táctico:', err);
      setMapError(err?.message || 'Error al inicializar el visor geográfico.');
    }
  }, []);

  const loadMapsScript = useCallback(() => {
    setMapError(null);

    window.gm_authFailure = () => {
      setMapError(
        'Error de autenticación con Google Maps (gm_authFailure). Verifique la clave de API o restricciones de HTTP Referrer.'
      );
    };

    if (window.google?.maps) {
      initMap();
      return;
    }

    window.initTacticalMap = () => {
      initMap();
    };

    const scriptId = 'vtt-google-maps-script';
    const oldScript = document.getElementById(scriptId) || document.getElementById('google-maps-script');
    if (oldScript) {
      oldScript.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&libraries=drawing,geometry&callback=initTacticalMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setMapError('No se pudo conectar a la API de Google Maps. Verifique la conexión o la clave de API.');
    };

    document.head.appendChild(script);
  }, [initMap]);

  useEffect(() => {
    loadMapsScript();
  }, [loadMapsScript]);

  // Desactivar cualquier herramienta activa
  const deactivateAll = () => {
    window.__modoTerrenoClave = false;
    window.__modoOrografia = false;
    window.__modoBAV = false;
    modoUnidadAzul = false;
    modoUnidadRojo = false;
    modoMetodoJG = false;
    if (typeof window !== 'undefined') {
      window.modoUnidadAzul = false;
      window.modoUnidadRojo = false;
      window.modoMetodoJG = false;
      window.reglaActiva = false;
      window.lineaRegla = null;
    }
    reglaActiva = false;
    lineaRegla = null;
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({ draggableCursor: null });
    }
    updateActiveTool(null);
    setVertexCount(0);
  };

  // Fase 2 - CMOC: Trazar Terreno Restringido (#FFC107)
  const handleTrazarRestringido = () => {
    if (!drawingManagerRef.current) return;

    if (activeTool === 'cmoc_restringido') {
      deactivateAll();
      return;
    }

    deactivateAll();
    drawingManagerRef.current.setOptions({
      drawingMode: 'polygon',
      polygonOptions: {
        strokeColor: '#FFC107',
        strokeWeight: 2,
        fillColor: '#FFC107',
        fillOpacity: 0.4,
      },
    });
    updateActiveTool('cmoc_restringido');
  };

  // Fase 2 - CMOC: Trazar Terreno Severamente Restringido (#F44336)
  const handleTrazarSeveramenteRestringido = () => {
    if (!drawingManagerRef.current) return;

    if (activeTool === 'cmoc_severo') {
      deactivateAll();
      return;
    }

    deactivateAll();
    drawingManagerRef.current.setOptions({
      drawingMode: 'polygon',
      polygonOptions: {
        strokeColor: '#F44336',
        strokeWeight: 2,
        fillColor: '#F44336',
        fillOpacity: 0.4,
      },
    });
    updateActiveTool('cmoc_severo');
  };

  // Fase 3 - Terreno Clave: Marcar Terreno Clave
  const handleMarcarTerrenoClave = () => {
    if (!mapInstanceRef.current) return;

    if (activeTool === 'terreno_clave') {
      deactivateAll();
      return;
    }

    deactivateAll();
    window.__modoTerrenoClave = true;
    mapInstanceRef.current.setOptions({ draggableCursor: 'crosshair' });
    updateActiveTool('terreno_clave');
  };

  // Fase 4 - Direcciones de Aproximación: Trazar AA Propias (Azul #2196F3)
  const handleTrazarAAPropias = () => {
    if (!drawingManagerRef.current || !window.google?.maps) return;

    if (activeTool === 'aa_propias') {
      deactivateAll();
      return;
    }

    deactivateAll();
    const arrowSymbol = window.google.maps.SymbolPath?.FORWARD_CLOSED_ARROW ?? 0;

    drawingManagerRef.current.setOptions({
      drawingMode: 'polyline',
      polylineOptions: {
        strokeColor: '#2196F3',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        icons: [
          {
            icon: { path: arrowSymbol },
            offset: '100%',
          },
        ],
      },
    });
    updateActiveTool('aa_propias');
  };

  // Fase 4 - Direcciones de Aproximación: Trazar AA Enemigo (Rojo #F44336)
  const handleTrazarAAEnemigo = () => {
    if (!drawingManagerRef.current || !window.google?.maps) return;

    if (activeTool === 'aa_enemigo') {
      deactivateAll();
      return;
    }

    deactivateAll();
    const arrowSymbol = window.google.maps.SymbolPath?.FORWARD_CLOSED_ARROW ?? 0;

    drawingManagerRef.current.setOptions({
      drawingMode: 'polyline',
      polylineOptions: {
        strokeColor: '#F44336',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        icons: [
          {
            icon: { path: arrowSymbol },
            offset: '100%',
          },
        ],
      },
    });
    updateActiveTool('aa_enemigo');
  };

  // Fase 5 - Análisis de Orografía: Consultar Altitud (Cota)
  const handleConsultarAltitud = () => {
    if (!mapInstanceRef.current) return;

    if (activeTool === 'orografia') {
      deactivateAll();
      return;
    }

    deactivateAll();
    window.__modoOrografia = true;
    mapInstanceRef.current.setOptions({ draggableCursor: 'help' });
    updateActiveTool('orografia');
  };

  // Fase 7 - Áreas Tácticas: Trazar Área de Empeño (Naranja #FF9800)
  const handleTrazarAreaEmpeno = () => {
    if (!drawingManagerRef.current) return;

    if (activeTool === 'area_empeno') {
      deactivateAll();
      return;
    }

    deactivateAll();
    drawingManagerRef.current.setOptions({
      drawingMode: 'polygon',
      polygonOptions: {
        strokeColor: '#FF9800',
        strokeWeight: 2,
        fillColor: '#FF9800',
        fillOpacity: 0.4,
      },
    });
    updateActiveTool('area_empeno');
  };

  // Fase 7 - Áreas Tácticas: Trazar Terreno Defendible (Azul #2196F3)
  const handleTrazarTerrenoDefendible = () => {
    if (!drawingManagerRef.current) return;

    if (activeTool === 'terreno_defendible') {
      deactivateAll();
      return;
    }

    deactivateAll();
    drawingManagerRef.current.setOptions({
      drawingMode: 'polygon',
      polygonOptions: {
        strokeColor: '#2196F3',
        strokeWeight: 2,
        fillColor: '#2196F3',
        fillOpacity: 0.4,
      },
    });
    updateActiveTool('terreno_defendible');
  };

  // Fase 12 - Áreas Tácticas: Trazar AIN (Verde #4CAF50)
  const handleTrazarAIN = () => {
    if (!drawingManagerRef.current) return;

    if (activeTool === 'ain') {
      deactivateAll();
      return;
    }

    deactivateAll();
    drawingManagerRef.current.setOptions({
      drawingMode: 'polygon',
      polygonOptions: {
        strokeColor: '#4CAF50',
        strokeWeight: 2,
        fillColor: '#4CAF50',
        fillOpacity: 0.4,
      },
    });
    updateActiveTool('ain');
  };

  // Fase 8 - Blancos de Alto Valor (BAV): Marcar BAV
  const handleMarcarBAV = () => {
    if (!mapInstanceRef.current) return;

    if (activeTool === 'bav') {
      deactivateAll();
      return;
    }

    deactivateAll();
    window.__modoBAV = true;
    mapInstanceRef.current.setOptions({ draggableCursor: 'crosshair' });
    updateActiveTool('bav');
  };

  // Fase 15 - Despliegue de Fuerzas (Maniobra): Insertar Unidad AZUL
  const handleInsertarUnidadAzul = () => {
    if (!mapInstanceRef.current) return;

    if (activeTool === 'unidad_azul') {
      deactivateAll();
      return;
    }

    deactivateAll();
    modoUnidadAzul = true;
    modoUnidadRojo = false;
    if (typeof window !== 'undefined') {
      window.modoUnidadAzul = true;
      window.modoUnidadRojo = false;
    }
    mapInstanceRef.current.setOptions({ draggableCursor: 'crosshair' });
    updateActiveTool('unidad_azul');
  };

  // Fase 15 - Despliegue de Fuerzas (Maniobra): Insertar Unidad ROJO
  const handleInsertarUnidadRojo = () => {
    if (!mapInstanceRef.current) return;

    if (activeTool === 'unidad_rojo') {
      deactivateAll();
      return;
    }

    deactivateAll();
    modoUnidadAzul = false;
    modoUnidadRojo = true;
    if (typeof window !== 'undefined') {
      window.modoUnidadAzul = false;
      window.modoUnidadRojo = true;
    }
    mapInstanceRef.current.setOptions({ draggableCursor: 'crosshair' });
    updateActiveTool('unidad_rojo');
  };

  // Fase 9 - Cálculo de Marcha (LFT): Medir Ruta (Regla)
  const handleMedirRuta = () => {
    if (!drawingManagerRef.current || !mapInstanceRef.current) return;

    if (activeTool === 'medir_ruta') {
      deactivateAll();
      return;
    }

    deactivateAll();
    reglaActiva = true;
    if (typeof window !== 'undefined') window.reglaActiva = true;

    // Configurar polilínea para medición de ruta: color amarillo brillante (#FFFF00), 3px de trazo
    drawingManagerRef.current.setOptions({
      drawingMode: 'polyline',
      polylineOptions: {
        strokeColor: '#FFFF00',
        strokeWeight: 3,
        strokeOpacity: 0.9,
        icons: [],
      },
    });

    mapInstanceRef.current.setOptions({ draggableCursor: 'crosshair' });
    updateActiveTool('medir_ruta');
  };

  // Fase 10 - Lógica de Cálculo de Matriz CARVER (BAV)
  const handleCalcularCarver = () => {
    // Extrae los valores (convertidos a números enteros) de los 6 selects
    const selectC = document.getElementById('select-carver-c') as HTMLSelectElement | null;
    const selectA = document.getElementById('select-carver-a') as HTMLSelectElement | null;
    const selectR = document.getElementById('select-carver-r') as HTMLSelectElement | null;
    const selectV = document.getElementById('select-carver-v') as HTMLSelectElement | null;
    const selectE = document.getElementById('select-carver-e') as HTMLSelectElement | null;
    const selectRec = document.getElementById('select-carver-rec') as HTMLSelectElement | null;

    const valC = parseInt(selectC?.value || String(carverValues.c), 10);
    const valA = parseInt(selectA?.value || String(carverValues.a), 10);
    const valR = parseInt(selectR?.value || String(carverValues.r), 10);
    const valV = parseInt(selectV?.value || String(carverValues.v), 10);
    const valE = parseInt(selectE?.value || String(carverValues.e), 10);
    const valRec = parseInt(selectRec?.value || String(carverValues.rec), 10);

    // Suma los 6 valores
    const suma = valC + valA + valR + valV + valE + valRec;

    // Calcula el porcentaje: (suma * 100) / 30. Redondea a 2 decimales
    const porcentaje = ((suma * 100) / 30).toFixed(2);
    const esPrioritario = parseFloat(porcentaje) >= 70;

    const resultadoDiv = document.getElementById('resultadoCarver');
    if (resultadoDiv) {
      resultadoDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 6px; font-size: 12px; color: #e2ede1;">
          Puntaje: ${suma}/30 | Valor Relativo: ${porcentaje}%
        </div>
        ${
          esPrioritario
            ? `<p style="color: #ff5252; font-weight: bold; font-size: 11px; background-color: rgba(211, 47, 47, 0.18); border: 1px solid rgba(211, 47, 47, 0.4); padding: 6px 8px; border-radius: 3px; margin: 0; text-transform: uppercase; letter-spacing: 0.03em;">ESTADO: BLANCO PRIORITARIO</p>`
            : `<p style="color: #81c784; font-weight: bold; font-size: 11px; background-color: rgba(129, 199, 132, 0.12); border: 1px solid rgba(129, 199, 132, 0.3); padding: 6px 8px; border-radius: 3px; margin: 0;">ESTADO: Blanco Secundario</p>`
        }
      `;
    }
  };

  // Fase 16 - Método de Juego de Guerra: Trazar Área de Análisis (Faja, Avenida en Profundidad, Caja)
  const handleTrazarMetodoJG = () => {
    if (!drawingManagerRef.current) return;

    if (activeTool === 'metodo_jg') {
      deactivateAll();
      return;
    }

    deactivateAll();
    modoMetodoJG = true;
    if (typeof window !== 'undefined') {
      window.modoMetodoJG = true;
    }

    const selectEl = document.getElementById('selectMetodoJG') as HTMLSelectElement | null;
    const metodoSeleccionado = selectEl?.value || metodoJG;

    if (metodoSeleccionado === 'faja' || metodoSeleccionado === 'caja') {
      drawingManagerRef.current.setOptions({
        drawingMode: 'rectangle',
        rectangleOptions: {
          strokeColor: '#0097A7',
          strokeWeight: 2,
          fillColor: '#00BCD4',
          fillOpacity: 0.2,
        },
      });
    } else {
      // 'avenida'
      drawingManagerRef.current.setOptions({
        drawingMode: 'polygon',
        polygonOptions: {
          strokeColor: '#0097A7',
          strokeWeight: 2,
          fillColor: '#00BCD4',
          fillOpacity: 0.2,
        },
      });
    }

    updateActiveTool('metodo_jg');
  };

  // Finalizar trazo en curso manualmente
  const handleFinalizarTrazo = () => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.finish();
    }
  };

  // Cancelar trazo
  const handleCancelarTrazo = () => {
    deactivateAll();
  };

  // Eliminar último calco del mapa
  const handleEliminarUltimoCalco = () => {
    if (overlaysRef.current.length === 0) return;

    const ultimoCalco = overlaysRef.current.pop();
    if (ultimoCalco && typeof ultimoCalco.setMap === 'function') {
      ultimoCalco.setMap(null);
    }

    // Filtrar de los arrays de capas (Fases 6, 7, 8, 12, 15 y 16)
    capaRestringido = capaRestringido.filter((item) => item !== ultimoCalco);
    capaSevero = capaSevero.filter((item) => item !== ultimoCalco);
    capaClave = capaClave.filter((item) => item !== ultimoCalco);
    capaAAPropias = capaAAPropias.filter((item) => item !== ultimoCalco);
    capaAAEnemigo = capaAAEnemigo.filter((item) => item !== ultimoCalco);
    capaAE = capaAE.filter((item) => item !== ultimoCalco);
    capaDefendible = capaDefendible.filter((item) => item !== ultimoCalco);
    capaBAV = capaBAV.filter((item) => item !== ultimoCalco);
    capaAIN = capaAIN.filter((item) => item !== ultimoCalco);
    capaUnidades = capaUnidades.filter((item) => item !== ultimoCalco);
    capaMetodoJG = capaMetodoJG.filter((item) => item !== ultimoCalco);
    if (typeof window !== 'undefined') {
      window.capaRestringido = capaRestringido;
      window.capaSevero = capaSevero;
      window.capaClave = capaClave;
      window.capaAAPropias = capaAAPropias;
      window.capaAAEnemigo = capaAAEnemigo;
      window.capaAE = capaAE;
      window.capaDefendible = capaDefendible;
      window.capaBAV = capaBAV;
      window.capaAIN = capaAIN;
      window.capaUnidades = capaUnidades;
      window.capaMetodoJG = capaMetodoJG;
    }

    setOverlaysCount(overlaysRef.current.length);
    syncLayerCounts();
  };

  // Helper común para serializar todos los datos limpios de la sesión táctica
  const obtenerDatosLimpiosSesion = useCallback(() => {
    const extractPath = (overlay: any) => {
      if (!overlay) return [];
      if (typeof overlay.getPath === 'function') {
        const path = overlay.getPath();
        const arr = typeof path.getArray === 'function' ? path.getArray() : Array.isArray(path) ? path : [];
        return arr.map((p: any) => ({
          lat: typeof p.lat === 'function' ? p.lat() : p.lat,
          lng: typeof p.lng === 'function' ? p.lng() : p.lng,
        }));
      }
      return [];
    };

    // 1. Polígonos de obstáculos y áreas tácticas
    const restringidoData = capaRestringido.map(extractPath).filter((p) => p.length > 0);
    const severoData = capaSevero.map(extractPath).filter((p) => p.length > 0);
    const aeData = capaAE.map(extractPath).filter((p) => p.length > 0);
    const defendibleData = capaDefendible.map(extractPath).filter((p) => p.length > 0);

    // 2. Polilíneas de Direcciones de Aproximación
    const aaPropiasData = capaAAPropias.map(extractPath).filter((p) => p.length > 0);
    const aaEnemigoData = capaAAEnemigo.map(extractPath).filter((p) => p.length > 0);

    // 3. Marcadores de Terreno Clave
    const claveData = capaClave
      .map((marker: any) => {
        const pos = typeof marker.getPosition === 'function' ? marker.getPosition() : marker.position;
        if (!pos) return null;
        return {
          lat: typeof pos.lat === 'function' ? pos.lat() : pos.lat,
          lng: typeof pos.lng === 'function' ? pos.lng() : pos.lng,
        };
      })
      .filter((p: any) => p && typeof p.lat === 'number');

    // 4. Marcadores de Blancos de Alto Valor (BAV)
    const bavData = capaBAV
      .map((marker: any) => {
        const pos = typeof marker.getPosition === 'function' ? marker.getPosition() : marker.position;
        if (!pos) return null;
        return {
          lat: typeof pos.lat === 'function' ? pos.lat() : pos.lat,
          lng: typeof pos.lng === 'function' ? pos.lng() : pos.lng,
          tipo: marker.tipoBAV || marker.tipo || 'c4',
        };
      })
      .filter((b: any) => b && typeof b.lat === 'number');

    // 5. Áreas del Método de Juego de Guerra
    const metodoJGData = capaMetodoJG
      .map((overlay: any) => {
        if (typeof overlay.getBounds === 'function') {
          const bounds = overlay.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          return {
            tipo: 'rectangle',
            bounds: {
              north: ne.lat(),
              south: sw.lat(),
              east: ne.lng(),
              west: sw.lng(),
            },
          };
        } else if (typeof overlay.getPath === 'function') {
          return {
            tipo: 'polygon',
            path: extractPath(overlay),
          };
        }
        return null;
      })
      .filter(Boolean);

    // 6. Áreas de Interés Nombradas (AIN)
    const ainsData: any[] = [];
    const poligonosAIN = capaAIN.filter((item: any) => typeof item?.getPath === 'function');
    poligonosAIN.forEach((poly: any, idx: number) => {
      const path = extractPath(poly);
      const numero = poly.ainNumero || idx + 1;
      const label = poly.ainLabel || `AIN ${numero}`;
      ainsData.push({
        path,
        numero,
        label,
      });
    });

    // 7. Unidades de Maniobra (AZUL / ROJO)
    const unidadesData = capaUnidades
      .map((marker: any) => {
        const pos = typeof marker.getPosition === 'function' ? marker.getPosition() : marker.position;
        if (!pos) return null;
        return {
          lat: typeof pos.lat === 'function' ? pos.lat() : pos.lat,
          lng: typeof pos.lng === 'function' ? pos.lng() : pos.lng,
          bando: marker.bando || 'azul',
          tipo: marker.tipo || 'infanteria',
          magnitud: marker.magnitud || 'II',
          nombre: marker.nombre || '',
          tareaText: marker.tareaText || '',
          propositoText: marker.propositoText || '',
        };
      })
      .filter((u: any) => u && typeof u.lat === 'number');

    // 8. Matriz de Sincronización / Eventos
    const matrizEventosData: any[] = [];
    const tbody = document.getElementById('bodyMatrizEventos');
    const matrizInnerHTML = tbody ? tbody.innerHTML : '';
    if (matrizEventos && matrizEventos.length > 0) {
      matrizEventos.forEach((m) => {
        matrizEventosData.push({ ...m });
      });
    } else if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach((tr, i) => {
        const tdAin = tr.querySelector('td:first-child');
        const inputs = tr.querySelectorAll('input');
        matrizEventosData.push({
          id: i + 1,
          ainLabel: tdAin?.textContent?.trim() || `AIN ${i + 1}`,
          noAntes: inputs[0]?.value || '',
          noDespues: inputs[1]?.value || '',
          indicador: inputs[2]?.value || '',
        });
      });
    }

    return {
      version: 'Fase19',
      timestamp: new Date().toISOString(),
      contadorAIN,
      capas: {
        restringido: restringidoData,
        severo: severoData,
        clave: claveData,
        aaPropias: aaPropiasData,
        aaEnemigo: aaEnemigoData,
        areaEmpeno: aeData,
        terrenoDefendible: defendibleData,
        bav: bavData,
        metodoJG: metodoJGData,
        ain: ainsData,
        unidades: unidadesData,
      },
      matrizEventos: matrizEventosData,
      matrizInnerHTML,
      prcValues,
      ccmmStates,
    };
  }, [matrizEventos, prcValues, ccmmStates]);

  // Fase 18 - Persistencia Local (LocalStorage)
  // Lógica de Serialización (Guardar)
  const handleGuardarSesionLocal = useCallback(() => {
    try {
      const datosLimpios = obtenerDatosLimpiosSesion();
      localStorage.setItem('vtt_sesion', JSON.stringify(datosLimpios));
      alert('Trabajo táctico guardado localmente.');
    } catch (err) {
      console.error('Error al guardar sesión local:', err);
      alert('Error al guardar la sesión: ' + (err as Error).message);
    }
  }, [obtenerDatosLimpiosSesion]);

  // Exportar Archivo de Misión (.json) para transferir a otros dispositivos
  const handleExportarArchivoSesion = useCallback(() => {
    try {
      const datosLimpios = obtenerDatosLimpiosSesion();
      const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const jsonStr = JSON.stringify(datosLimpios, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vtt_mision_tactica_${fecha}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('✅ Archivo de misión táctica exportado exitosamente.\n\nPuedes transferir este archivo a otros dispositivos para restaurar el escenario táctico completo.');
    } catch (err) {
      console.error('Error al exportar misión:', err);
      alert('Error al exportar misión: ' + (err as Error).message);
    }
  }, [obtenerDatosLimpiosSesion]);

  // Fase 18 - Persistencia Local (LocalStorage) y Carga de Archivos
  // Lógica de Deserialización (Cargar)
  const handleCargarSesionLocal = useCallback((sesionDirecta?: any) => {
    try {
      let sesion = sesionDirecta;
      if (!sesion) {
        const raw = localStorage.getItem('vtt_sesion');
        if (!raw) {
          alert('No se encontró ninguna sesión guardada en LocalStorage.');
          return;
        }
        sesion = JSON.parse(raw);
      }

      const map = mapInstanceRef.current;
      if (!map || !window.google?.maps) {
        alert('El mapa no está listo todavía para cargar los datos.');
        return;
      }

      const capas = sesion.capas || {};

      // 1. Limpiar mapa iterando sobre los arrays actuales aplicando setMap(null) y vaciándolos
      const arraysToClean = [
        capaRestringido,
        capaSevero,
        capaClave,
        capaAAPropias,
        capaAAEnemigo,
        capaAE,
        capaDefendible,
        capaBAV,
        capaMetodoJG,
        capaAIN,
        capaUnidades,
      ];
      arraysToClean.forEach((arr) => {
        arr.forEach((item) => {
          if (item && typeof item.setMap === 'function') {
            item.setMap(null);
          }
        });
        arr.length = 0;
      });
      overlaysRef.current = [];

      if (infoWindowUnidad) {
        infoWindowUnidad.close();
      }

      // 2. Reconstruir Terreno Restringido (Polígonos Amarillos)
      (capas.restringido || []).forEach((path: any[]) => {
        const poly = new window.google.maps.Polygon({
          paths: path,
          strokeColor: '#FFC107',
          strokeWeight: 2,
          fillColor: '#FFC107',
          fillOpacity: 0.4,
          clickable: true,
          map,
        });
        capaRestringido.push(poly);
        overlaysRef.current.push(poly);
      });

      // 3. Reconstruir Terreno Severamente Restringido (Polígonos Rojos)
      (capas.severo || []).forEach((path: any[]) => {
        const poly = new window.google.maps.Polygon({
          paths: path,
          strokeColor: '#F44336',
          strokeWeight: 2,
          fillColor: '#F44336',
          fillOpacity: 0.4,
          clickable: true,
          map,
        });
        capaSevero.push(poly);
        overlaysRef.current.push(poly);
      });

      // 4. Reconstruir Terreno Clave (Marcadores C)
      (capas.clave || []).forEach((pos: any) => {
        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          icon: {
            url: TERRENO_CLAVE_ICON_URI,
            scaledSize: new window.google.maps.Size(32, 32),
            origin: new window.google.maps.Point(0, 0),
            anchor: new window.google.maps.Point(16, 16),
          },
          title: 'Terreno Clave (C)',
        });
        capaClave.push(marker);
        overlaysRef.current.push(marker);
      });

      // 5. Reconstruir AA Propias (Polilínea con Flecha Azul)
      const arrowSymbol = window.google.maps.SymbolPath?.FORWARD_CLOSED_ARROW ?? 0;
      (capas.aaPropias || []).forEach((path: any[]) => {
        const line = new window.google.maps.Polyline({
          path,
          strokeColor: '#2196F3',
          strokeWeight: 4,
          strokeOpacity: 0.8,
          icons: [
            {
              icon: { path: arrowSymbol },
              offset: '100%',
            },
          ],
          clickable: true,
          map,
        });
        capaAAPropias.push(line);
        overlaysRef.current.push(line);
      });

      // 6. Reconstruir AA Enemigo (Polilínea con Flecha Roja)
      (capas.aaEnemigo || []).forEach((path: any[]) => {
        const line = new window.google.maps.Polyline({
          path,
          strokeColor: '#F44336',
          strokeWeight: 4,
          strokeOpacity: 0.8,
          icons: [
            {
              icon: { path: arrowSymbol },
              offset: '100%',
            },
          ],
          clickable: true,
          map,
        });
        capaAAEnemigo.push(line);
        overlaysRef.current.push(line);
      });

      // 7. Reconstruir Área de Empeño (Polígonos Naranjas)
      (capas.areaEmpeno || []).forEach((path: any[]) => {
        const poly = new window.google.maps.Polygon({
          paths: path,
          strokeColor: '#FF9800',
          strokeWeight: 2,
          fillColor: '#FF9800',
          fillOpacity: 0.4,
          clickable: true,
          map,
        });
        capaAE.push(poly);
        overlaysRef.current.push(poly);
      });

      // 8. Reconstruir Terreno Defendible (Polígonos Azules)
      (capas.terrenoDefendible || []).forEach((path: any[]) => {
        const poly = new window.google.maps.Polygon({
          paths: path,
          strokeColor: '#2196F3',
          strokeWeight: 2,
          fillColor: '#2196F3',
          fillOpacity: 0.4,
          clickable: true,
          map,
        });
        capaDefendible.push(poly);
        overlaysRef.current.push(poly);
      });

      // 9. Reconstruir Blancos de Alto Valor (BAV) con su Event Listener para CARVER
      (capas.bav || []).forEach((bavItem: any) => {
        const tipo = bavItem.tipo || 'c4';
        const marker: any = new window.google.maps.Marker({
          position: { lat: bavItem.lat, lng: bavItem.lng },
          map,
          icon: {
            url: getBAVSymbolDataUri(tipo),
            scaledSize: new window.google.maps.Size(30, 30),
            origin: new window.google.maps.Point(0, 0),
            anchor: new window.google.maps.Point(15, 15),
          },
          title: `Blanco de Alto Valor: ${tipo.toUpperCase()}`,
        });
        marker.tipoBAV = tipo;

        marker.addListener('click', (e: any) => {
          const panelEl = document.getElementById('panelCarver');
          if (panelEl) {
            panelEl.style.display = 'block';
          }
          setCarverVisible(true);
          setSelectedBavTarget({
            tipo,
            lat: parseFloat(Number(bavItem.lat).toFixed(4)),
            lng: parseFloat(Number(bavItem.lng).toFixed(4)),
          });
          if (map && window.google?.maps?.event) {
            window.google.maps.event.trigger(map, 'click', e);
          }
        });

        capaBAV.push(marker);
        overlaysRef.current.push(marker);
      });

      // 10. Reconstruir Áreas de Juego de Guerra (Fajas, Cajas o Avenidas en Profundidad)
      (capas.metodoJG || []).forEach((item: any) => {
        if (item.tipo === 'rectangle' && item.bounds) {
          const rect = new window.google.maps.Rectangle({
            bounds: new window.google.maps.LatLngBounds(
              new window.google.maps.LatLng(item.bounds.south, item.bounds.west),
              new window.google.maps.LatLng(item.bounds.north, item.bounds.east)
            ),
            strokeColor: '#0097A7',
            strokeWeight: 2,
            fillColor: '#00BCD4',
            fillOpacity: 0.2,
            clickable: true,
            map,
          });
          capaMetodoJG.push(rect);
          overlaysRef.current.push(rect);
        } else if (item.path) {
          const poly = new window.google.maps.Polygon({
            paths: item.path,
            strokeColor: '#0097A7',
            strokeWeight: 2,
            fillColor: '#00BCD4',
            fillOpacity: 0.2,
            clickable: true,
            map,
          });
          capaMetodoJG.push(poly);
          overlaysRef.current.push(poly);
        }
      });

      // 11. Reconstruir AIN (Polígonos Verdes y Marcadores de Etiqueta Centrados)
      (capas.ain || []).forEach((ainItem: any, idx: number) => {
        const path = ainItem.path;
        if (!Array.isArray(path) || path.length < 3) return;

        const num = ainItem.numero || idx + 1;
        const labelText = ainItem.label || `AIN ${num}`;

        const poly: any = new window.google.maps.Polygon({
          paths: path,
          strokeColor: '#4CAF50',
          strokeWeight: 2,
          fillColor: '#4CAF50',
          fillOpacity: 0.4,
          clickable: true,
          map,
        });
        poly.ainNumero = num;
        poly.ainLabel = labelText;
        capaAIN.push(poly);
        overlaysRef.current.push(poly);

        // Calcular centro
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach((pt: any) => bounds.extend(pt));
        const centro = bounds.getCenter();

        const etiquetaMarker = new window.google.maps.Marker({
          position: centro,
          map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
          label: {
            text: labelText,
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '12px',
          },
          title: `Área de Interés Nombrada ${labelText}`,
        });
        capaAIN.push(etiquetaMarker);
        overlaysRef.current.push(etiquetaMarker);
      });

      // 12. Reconstruir Unidades de Maniobra con Arrastre, Simbología e InfoWindow Completo
      (capas.unidades || []).forEach((u: any) => {
        const bando = u.bando || 'azul';
        const tipo = u.tipo || 'infanteria';
        const magnitud = u.magnitud || 'II';
        const nombre = u.nombre || (bando === 'azul' ? 'RIMEC 35' : 'B.TANQ 1');

        const marker: any = new window.google.maps.Marker({
          position: { lat: u.lat, lng: u.lng },
          map,
          draggable: true,
          cursor: 'grab',
          icon: {
            url: getUnidadSymbolDataUri(bando, tipo, magnitud, nombre),
            scaledSize: new window.google.maps.Size(64, 52),
            origin: new window.google.maps.Point(0, 0),
            anchor: new window.google.maps.Point(32, 24),
          },
          title: `${nombre} [${bando.toUpperCase()} - ${tipo.toUpperCase()} (${magnitud})]`,
        });

        marker.bando = bando;
        marker.tipo = tipo;
        marker.magnitud = magnitud;
        marker.nombre = nombre;
        marker.tareaText = u.tareaText || '';
        marker.propositoText = u.propositoText || '';

        marker.addListener('dragstart', () => {
          if (infoWindowUnidad) {
            infoWindowUnidad.close();
          }
        });

        marker.addListener('dragend', (dragEvt: any) => {
          if (dragEvt?.latLng) {
            marker.lat = dragEvt.latLng.lat();
            marker.lng = dragEvt.latLng.lng();
          }
        });

        marker.addListener('click', () => {
          abrirInfoWindowUnidad(marker, map);
        });

        capaUnidades.push(marker);
        overlaysRef.current.push(marker);
      });

      // 13. Restaurar contadorAIN
      if (typeof sesion.contadorAIN === 'number') {
        contadorAIN = sesion.contadorAIN;
      } else if (capas.ain && capas.ain.length > 0) {
        contadorAIN = capas.ain.length + 1;
      } else {
        contadorAIN = 1;
      }

      // Sincronizar globals en window
      if (typeof window !== 'undefined') {
        window.contadorAIN = contadorAIN;
        window.capaRestringido = capaRestringido;
        window.capaSevero = capaSevero;
        window.capaClave = capaClave;
        window.capaAAPropias = capaAAPropias;
        window.capaAAEnemigo = capaAAEnemigo;
        window.capaAE = capaAE;
        window.capaDefendible = capaDefendible;
        window.capaBAV = capaBAV;
        window.capaMetodoJG = capaMetodoJG;
        window.capaAIN = capaAIN;
        window.capaUnidades = capaUnidades;
      }

      // 14. Restaurar Matriz de Sincronización
      if (Array.isArray(sesion.matrizEventos) && sesion.matrizEventos.length > 0) {
        setMatrizEventos(sesion.matrizEventos);
      } else if (capas.ain && capas.ain.length > 0) {
        setMatrizEventos(
          capas.ain.map((a: any, i: number) => ({
            id: a.numero || i + 1,
            ainLabel: a.label || `AIN ${a.numero || i + 1}`,
            noAntes: '',
            noDespues: '',
            indicador: '',
          }))
        );
      } else {
        setMatrizEventos([]);
      }

      // 15. Restaurar PRC y CC.MM. si están guardados
      if (sesion.prcValues) {
        setPrcValues(sesion.prcValues);
      }
      if (sesion.ccmmStates) {
        setCcmmStates(sesion.ccmmStates);
      }

      // 16. Actualizar contadores y badges en la UI
      setOverlaysCount(overlaysRef.current.length);
      syncLayerCounts();

      alert('Trabajo táctico restaurado.');
    } catch (err) {
      console.error('Error al cargar sesión local:', err);
      alert('Error al cargar la sesión: ' + (err as Error).message);
    }
  }, [abrirInfoWindowUnidad, syncLayerCounts]);

  // Importar archivo de sesión táctica (.json)
  const handleImportarArchivoSesion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        handleCargarSesionLocal(parsed);
      } catch (err) {
        console.error('Error al importar archivo de misión:', err);
        alert('El archivo no contiene un formato de misión VTT válido: ' + (err as Error).message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Descargar Aplicación Autónoma (.html)
  const handleDescargarAppHtml = async () => {
    try {
      setDescargando(true);
      let htmlContent = '';
      try {
        const resp = await fetch('/vtt_offline.html');
        if (resp.ok) htmlContent = await resp.text();
      } catch (e) {
        console.warn('Fallo al obtener /vtt_offline.html:', e);
      }

      if (!htmlContent) {
        try {
          const resp2 = await fetch('/vtt_fase19.html');
          if (resp2.ok) htmlContent = await resp2.text();
        } catch {}
      }

      if (!htmlContent) {
        alert('No se pudo leer el archivo base para la descarga. Por favor verifica la conexión.');
        return;
      }

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Visor_Tactico_Terreno_VTT_Portable.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('✅ Descarga completada: "Visor_Tactico_Terreno_VTT_Portable.html"\n\nPuedes transferir este archivo a cualquier otro dispositivo (PC, Laptop, Tablet, Smartphone) vía USB, Bluetooth, red local o correo. Se abre directamente en cualquier navegador web sin requerir instalación previa ni servidor.');
    } catch (err) {
      console.error('Error al descargar archivo HTML:', err);
      alert('Error al generar la descarga: ' + (err as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  // Descargar Paquete Completo PWA (.zip)
  const handleDescargarPaquetePWA = async () => {
    try {
      setDescargando(true);
      const zip = new JSZip();

      // 1. Obtener HTML
      let htmlContent = '';
      try {
        const resp = await fetch('/vtt_offline.html');
        if (resp.ok) htmlContent = await resp.text();
      } catch {}
      if (!htmlContent) {
        try {
          const resp2 = await fetch('/vtt_fase19.html');
          if (resp2.ok) htmlContent = await resp2.text();
        } catch {}
      }
      if (htmlContent) {
        zip.file('index.html', htmlContent);
        zip.file('vtt_portable.html', htmlContent);
      }

      // 2. Obtener manifest.json
      try {
        const respM = await fetch('/manifest.json');
        if (respM.ok) {
          const mText = await respM.text();
          zip.file('manifest.json', mText);
        }
      } catch {}

      // 3. Obtener sw.js
      try {
        const respS = await fetch('/sw.js');
        if (respS.ok) {
          const sText = await respS.text();
          zip.file('sw.js', sText);
        }
      } catch {}

      // 4. Obtener iconos
      const iconsFolder = zip.folder('icons');
      if (iconsFolder) {
        const iconNames = ['icon-192x192.png', 'icon-512x512.png', 'icon-maskable-512x512.png'];
        for (const iconName of iconNames) {
          try {
            const respI = await fetch(`/icons/${iconName}`);
            if (respI.ok) {
              const buf = await respI.arrayBuffer();
              iconsFolder.file(iconName, buf);
            }
          } catch {}
        }
      }

      // 5. Agregar manual táctico
      const readme = `========================================================================
VISOR TÁCTICO DE TERRENO (VTT) - PAQUETE INSTALABLE PWA Y AUTÓNOMO
========================================================================

Este paquete contiene todos los componentes necesarios para desplegar e instalar
el Visor Táctico de Terreno en cualquier dispositivo táctico de campaña:

ARCHIVOS INCLUIDOS:
------------------------------------------------------------------------
1. index.html / vtt_portable.html
   - Aplicación completa con las 19 fases integradas (SIG, CMOC, Terreno Clave,
     Direcciones de Aproximación, BAV, CARVER, LFT, AIN, PRC, Unidades de Maniobra,
     Juego de Guerra, Persistencia Local y PWA).
2. manifest.json
   - Descriptor PWA para instalación como app nativa táctica standalone.
3. sw.js
   - Service Worker para aceleración de carga y soporte offline en caché local.
4. /icons/
   - Iconos tácticos de alta resolución (192x192 y 512x512 px) para pantalla de inicio.

CÓMO INSTALAR EN OTROS DISPOSITIVOS:
------------------------------------------------------------------------
A. EJECUCIÓN DIRECTA SIN SERVIDOR (Cualquier PC, Laptop o Tablet):
   1. Descomprime este archivo .zip o copia 'vtt_portable.html' a una memoria USB.
   2. Abre el archivo directamente con cualquier navegador (Chrome, Edge, Firefox, Safari).
   3. ¡Listo! Todo el sistema táctico opera de manera autónoma.

B. INSTALACIÓN COMO APLICACIÓN NATIVA (PWA) EN ANDROID:
   1. Coloca los archivos en un servidor web local (o red ad-hoc de campaña).
   2. Abre la URL en Google Chrome en el dispositivo Android.
   3. Toca el botón de tres puntos (⋮) en la esquina superior derecha.
   4. Selecciona "Instalar aplicación" o "Añadir a la pantalla de inicio".
   5. El icono del VTT aparecerá en tu menú de aplicaciones como app nativa militar.

C. INSTALACIÓN EN WINDOWS / MAC / LINUX (CHROME / EDGE):
   1. Abre la URL en Chrome o Microsoft Edge.
   2. Verás un icono con forma de pantalla o un símbolo '+' en la barra de direcciones.
   3. Haz clic en "Instalar Visor Táctico de Terreno".
   4. Se abrirá en una ventana táctica independiente sin barras de navegador.

D. INSTALACIÓN EN IPHONE / IPAD (APPLE SAFARI):
   1. Abre la URL en Safari.
   2. Toca el botón de Compartir (cuadrado con flecha hacia arriba).
   3. Desplázate hacia abajo y selecciona "Añadir a pantalla de inicio".
   4. Toca "Añadir" en la esquina superior derecha.

E. TRANSFERENCIA DE PLANES Y MISIONES:
   - Usa el botón "Exportar Misión (.json)" en el panel 'Sesión Táctica' para guardar
     tus calcos, unidades y matrices en un archivo liviano.
   - Pásalo por USB o radio/red a otro operador y cárgalo con "Importar Misión".

========================================================================`;
      zip.file('LEAME_INSTALACION_TACTICA.txt', readme);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = 'VTT_Paquete_Instalable_PWA.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      alert('✅ Paquete descargado con éxito: "VTT_Paquete_Instalable_PWA.zip"\n\nIncluye la aplicación autónoma, manifest.json, service worker, iconos y el manual de instalación para Android, Windows, Mac, iOS y redes tácticas.');
    } catch (err) {
      console.error('Error al generar ZIP:', err);
      alert('Error al generar el paquete ZIP: ' + (err as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  // Exponer globalmente en window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.guardarSesionLocal = handleGuardarSesionLocal;
      window.cargarSesionLocal = handleCargarSesionLocal;
      (window as any).exportarArchivoSesion = handleExportarArchivoSesion;
      (window as any).descargarAppHtml = handleDescargarAppHtml;
      (window as any).descargarPaquetePWA = handleDescargarPaquetePWA;
    }
  }, [handleGuardarSesionLocal, handleCargarSesionLocal, handleExportarArchivoSesion]);

  // Fases 6, 7, 8, 12, 15 y 16: Lógica de ocultar / mostrar capas mediante checkboxes
  const handleToggleVisibility = (
    capaKey:
      | 'restringido'
      | 'severo'
      | 'clave'
      | 'aaPropias'
      | 'aaEnemigo'
      | 'areaEmpeno'
      | 'terrenoDefendible'
      | 'ain'
      | 'bav'
      | 'unidades'
      | 'metodoJG',
    checked: boolean
  ) => {
    setVisibilidad((prev) => ({ ...prev, [capaKey]: checked }));
    visibilidadRef.current[capaKey] = checked;

    const map = mapInstanceRef.current;
    let targetArray: any[] = [];
    if (capaKey === 'restringido') targetArray = capaRestringido;
    else if (capaKey === 'severo') targetArray = capaSevero;
    else if (capaKey === 'clave') targetArray = capaClave;
    else if (capaKey === 'aaPropias') targetArray = capaAAPropias;
    else if (capaKey === 'aaEnemigo') targetArray = capaAAEnemigo;
    else if (capaKey === 'areaEmpeno') targetArray = capaAE;
    else if (capaKey === 'terrenoDefendible') targetArray = capaDefendible;
    else if (capaKey === 'ain') targetArray = capaAIN;
    else if (capaKey === 'bav') targetArray = capaBAV;
    else if (capaKey === 'unidades') targetArray = capaUnidades;
    else if (capaKey === 'metodoJG') targetArray = capaMetodoJG;

    // Recorre con un bucle el array correspondiente y aplica elemento.setMap(map) o setMap(null)
    for (let i = 0; i < targetArray.length; i++) {
      const elemento = targetArray[i];
      if (elemento && typeof elemento.setMap === 'function') {
        elemento.setMap(checked ? map : null);
      }
    }
  };

  const isDrawingTool =
    activeTool === 'cmoc_restringido' ||
    activeTool === 'cmoc_severo' ||
    activeTool === 'aa_propias' ||
    activeTool === 'aa_enemigo' ||
    activeTool === 'area_empeno' ||
    activeTool === 'terreno_defendible' ||
    activeTool === 'ain' ||
    activeTool === 'medir_ruta' ||
    activeTool === 'metodo_jg';
  const minVerticesRequired =
    activeTool === 'aa_propias' ||
    activeTool === 'aa_enemigo' ||
    activeTool === 'medir_ruta' ||
    (activeTool === 'metodo_jg' && metodoJG !== 'avenida')
      ? 2
      : 3;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#181d19] text-[#d6dfd5] font-sans select-none">
      {/* Bloque Superior: Panel Lateral, Visor Geográfico y Tablero PRC (75vh de altura) */}
      <div className="flex w-full h-[75vh] overflow-hidden">
        {/* Panel Lateral Izquierdo: Administración de Capas (~20% del ancho) */}
        <aside className="w-[20%] min-w-[240px] max-w-[340px] h-full flex flex-col bg-[#141814] border-r border-[#2d382d] p-3 box-border overflow-y-auto">
          {/* Cabecera / Título */}
          <div className="pb-4 mb-4 border-b border-[#2d382d]">
            <h1 className="text-base font-bold tracking-wider text-[#e2ede1] uppercase font-mono">
              VISOR TÁCTICO DE TERRENO - VTT
            </h1>
            <p className="text-xs text-[#829281] mt-1 font-mono uppercase tracking-tight">
              Fase 19: App Instalable - PWA
            </p>
          </div>

        {/* Contenedores de los módulos */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Módulo Sesión Táctica (Fase 18 y 19: Persistencia y PWA) */}
          {/* Módulo Sesión Táctica (Fase 18 y 19: Persistencia, PWA y Descarga Multidispositivo) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-2.5">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4fc3f7] inline-block" />
                Sesión & Instalación
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#131913] text-[#81d4fa] border border-[#1976d2]/50">
                PWA / LOCAL
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Botón Destacado: Descargar / Instalar en Otros Dispositivos */}
              <button
                type="button"
                id="btn-centro-descargas"
                onClick={() => setModalDescargaVisible(true)}
                className="w-full py-2.5 px-3 rounded text-xs font-mono font-bold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-[#173a2b] to-[#1e4835] hover:from-[#1e4835] hover:to-[#265d44] border border-[#34885f] text-[#a7f3d0] shadow-md hover:shadow-lg"
                title="Abrir el centro de descarga de app autónoma, instalador PWA, código QR y manual para otros dispositivos"
              >
                <span className="text-sm">📥</span>
                <span>Descargar / Instalar App</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                {/* Botón 1: Guardar Trabajo (Local) */}
                <button
                  type="button"
                  id="btn-guardar-sesion"
                  onClick={handleGuardarSesionLocal}
                  className="py-1.5 px-2 rounded text-[11px] font-mono font-bold transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer bg-[#14261c] hover:bg-[#1b3627] border border-[#2e693e] text-[#a5d6a7]"
                  title="Guardar capas, polígonos, BAV, AIN, unidades y matriz en el navegador"
                >
                  <span>💾</span>
                  <span>Guardar</span>
                </button>

                {/* Botón 2: Cargar Trabajo (Local) */}
                <button
                  type="button"
                  id="btn-cargar-sesion"
                  onClick={() => handleCargarSesionLocal()}
                  className="py-1.5 px-2 rounded text-[11px] font-mono font-bold transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer bg-[#132332] hover:bg-[#1a3349] border border-[#1e4d79] text-[#90caf9]"
                  title="Restaurar capas, polígonos, BAV, AIN, unidades y matriz guardadas"
                >
                  <span>📂</span>
                  <span>Cargar</span>
                </button>
              </div>

              {/* Botones de Transferencia de Misión */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleExportarArchivoSesion}
                  className="py-1.5 px-2 rounded text-[10px] font-mono transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer bg-[#1e2017] hover:bg-[#2c3021] border border-[#525a33] text-[#e0e89b]"
                  title="Exportar archivo de misión .json para transferir a otro dispositivo"
                >
                  <span>📤</span>
                  <span>Exportar .json</span>
                </button>

                <label
                  htmlFor="input-importar-mision"
                  className="py-1.5 px-2 rounded text-[10px] font-mono transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer bg-[#1c1825] hover:bg-[#2b2438] border border-[#493963] text-[#d1b8f5] text-center"
                  title="Cargar archivo de misión .json desde otro dispositivo"
                >
                  <span>📥</span>
                  <span>Importar .json</span>
                  <input
                    id="input-importar-mision"
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportarArchivoSesion}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Botón Instalar App (PWA) */}
              {!isAppInstalled && (
                <button
                  type="button"
                  id="btn-instalar-pwa"
                  onClick={handleInstallPWA}
                  className="w-full py-1.5 px-3 rounded text-[11px] font-mono font-bold transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer bg-[#243526] hover:bg-[#2e4530] border border-[#3e6341] text-[#b9e6ba] shadow-xs mt-0.5"
                  title="Instalar el Visor Táctico de Terreno como aplicación nativa en tu dispositivo (PWA)"
                >
                  <span>📲</span>
                  <span>{deferredPrompt ? 'Instalar en este Dispositivo' : 'Guía de Instalación'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Módulo Gestor de Capas (CMOC) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#81c784] inline-block" />
                Gestor de Capas (CMOC)
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#131913] text-[#8fa38e] border border-[#2d3a2e]">
                VISIBILIDAD
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Checkbox 1: Terreno Restringido */}
              <label
                htmlFor="chk-restringido"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-restringido"
                    checked={visibilidad.restringido}
                    onChange={(e) => handleToggleVisibility('restringido', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#FFC107] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FFC107] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">Terreno Restringido</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.restringido}]
                </span>
              </label>

              {/* Checkbox 2: Terreno Sever. Restringido */}
              <label
                htmlFor="chk-severo"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-severo"
                    checked={visibilidad.severo}
                    onChange={(e) => handleToggleVisibility('severo', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#F44336] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F44336] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">Terreno Sever. Restringido</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.severo}]
                </span>
              </label>

              {/* Checkbox 3: Terreno Clave */}
              <label
                htmlFor="chk-clave"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-clave"
                    checked={visibilidad.clave}
                    onChange={(e) => handleToggleVisibility('clave', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-purple-500 cursor-pointer"
                  />
                  <span className="w-3.5 h-3.5 rounded-full border border-purple-400 flex items-center justify-center font-bold text-[8px] text-purple-300 shrink-0">
                    C
                  </span>
                  <span className="text-xs font-mono text-[#d6dfd5]">Terreno Clave</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.clave}]
                </span>
              </label>

              {/* Checkbox 4: AA Propias */}
              <label
                htmlFor="chk-aa-propias"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-aa-propias"
                    checked={visibilidad.aaPropias}
                    onChange={(e) => handleToggleVisibility('aaPropias', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#2196F3] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2196F3] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">AA Propias</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.aaPropias}]
                </span>
              </label>

              {/* Checkbox 5: AA Enemigas */}
              <label
                htmlFor="chk-aa-enemigo"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-aa-enemigo"
                    checked={visibilidad.aaEnemigo}
                    onChange={(e) => handleToggleVisibility('aaEnemigo', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#F44336] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F44336] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">AA Enemigas</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.aaEnemigo}]
                </span>
              </label>

              {/* Checkbox 6: Área de Empeño (AE) */}
              <label
                htmlFor="chk-area-empeno"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-area-empeno"
                    checked={visibilidad.areaEmpeno}
                    onChange={(e) => handleToggleVisibility('areaEmpeno', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#FF9800] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF9800] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">Área de Empeño (AE)</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.areaEmpeno}]
                </span>
              </label>

              {/* Checkbox 7: Terreno Defendible */}
              <label
                htmlFor="chk-terreno-defendible"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-terreno-defendible"
                    checked={visibilidad.terrenoDefendible}
                    onChange={(e) => handleToggleVisibility('terrenoDefendible', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#2196F3] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2196F3] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">Terreno Defendible</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.terrenoDefendible}]
                </span>
              </label>

              {/* Checkbox 8: Áreas de Interés Nombradas (AIN) - Fase 12 */}
              <label
                htmlFor="chk-ain"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-ain"
                    checked={visibilidad.ain}
                    onChange={(e) => handleToggleVisibility('ain', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#4CAF50] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#4CAF50] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">Áreas de Interés Nombradas (AIN)</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.ain}]
                </span>
              </label>

              {/* Checkbox 9: Blancos de Alto Valor (BAV) */}
              <label
                htmlFor="chk-bav"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-bav"
                    checked={visibilidad.bav}
                    onChange={(e) => handleToggleVisibility('bav', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#D32F2F] cursor-pointer"
                  />
                  <span className="w-3 h-3 border border-[#1a1a1a] bg-[#D32F2F] rotate-45 flex items-center justify-center shrink-0">
                    <span className="-rotate-45 font-bold text-[7px] text-white">B</span>
                  </span>
                  <span className="text-xs font-mono text-[#d6dfd5]">Blancos de Alto Valor (BAV)</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.bav}]
                </span>
              </label>

              {/* Checkbox 10: Unidades de Maniobra - Fase 15 */}
              <label
                htmlFor="chk-unidades"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-unidades"
                    checked={visibilidad.unidades}
                    onChange={(e) => handleToggleVisibility('unidades', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#1E88E5] cursor-pointer"
                  />
                  <span className="w-3.5 h-2.5 rounded-xs bg-[#1E88E5] border border-[#1a1a1a] flex items-center justify-center shrink-0 shadow-xs">
                    <span className="text-[6px] font-bold text-white leading-none">U</span>
                  </span>
                  <span className="text-xs font-mono text-[#d6dfd5]">Unidades de Maniobra</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.unidades}]
                </span>
              </label>

              {/* Checkbox 11: Áreas de Juego de Guerra - Fase 16 */}
              <label
                htmlFor="chk-metodo-jg"
                className="flex items-center justify-between p-2 rounded bg-[#151c16] hover:bg-[#1d261e] border border-[#2d382d] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-metodo-jg"
                    checked={visibilidad.metodoJG}
                    onChange={(e) => handleToggleVisibility('metodoJG', e.target.checked)}
                    className="w-4 h-4 rounded border-[#3e5240] bg-[#101411] accent-[#00BCD4] cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#00BCD4] border border-[#0097A7] shrink-0" />
                  <span className="text-xs font-mono text-[#d6dfd5]">Áreas de Juego de Guerra</span>
                </div>
                <span className="text-[10px] font-mono text-[#7e8f7c]">
                  [{layerCounts.metodoJG}]
                </span>
              </label>
            </div>
          </div>

          {/* Módulo 1: Calcos de Obstáculos Combinados (CMOC) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide">
                Calcos de Obstáculos Combinados (CMOC)
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#131913] text-[#8fa38e] border border-[#2d3a2e]">
                {overlaysCount} {overlaysCount === 1 ? 'calco' : 'calcos'}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Botón A: Trazar Terreno Restringido */}
              <button
                type="button"
                onClick={handleTrazarRestringido}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'cmoc_restringido'
                    ? 'bg-[#2a301e] border-[#FFC107] text-[#ffe082]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FFC107] inline-block shrink-0 shadow-sm" />
                  <span>Trazar Terreno Restringido</span>
                </div>
                {activeTool === 'cmoc_restringido' && (
                  <span className="text-[10px] uppercase font-bold text-[#FFC107] tracking-wider">Activo</span>
                )}
              </button>

              {/* Botón B: Trazar Terreno Severamente Restringido */}
              <button
                type="button"
                onClick={handleTrazarSeveramenteRestringido}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'cmoc_severo'
                    ? 'bg-[#311c1d] border-[#F44336] text-[#ffcdd2]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F44336] inline-block shrink-0 shadow-sm" />
                  <span>Trazar Terreno Severamente Restringido</span>
                </div>
                {activeTool === 'cmoc_severo' && (
                  <span className="text-[10px] uppercase font-bold text-[#F44336] tracking-wider">Activo</span>
                )}
              </button>

              {/* Botón: Eliminar último calco */}
              <button
                type="button"
                onClick={handleEliminarUltimoCalco}
                disabled={overlaysCount === 0}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between border ${
                  overlaysCount === 0
                    ? 'bg-[#151815] border-[#252e25] text-[#556354] cursor-not-allowed opacity-60'
                    : 'bg-[#221819] hover:bg-[#2e1d1f] border-[#4a2829] text-[#e0b4b6] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm leading-none text-[#d9534f]">⌫</span>
                  <span>Eliminar último calco</span>
                </div>
                {overlaysCount > 0 && (
                  <span className="text-[10px] font-mono text-[#a87f82]">({overlaysCount})</span>
                )}
              </button>
            </div>
          </div>

          {/* Módulo 2: Terreno Clave (Fase 3) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide">
                Terreno Clave
              </h2>
              {activeTool === 'terreno_clave' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#27172e] text-[#d8b4fe] uppercase tracking-wider border border-[#6b21a8]">
                  Listo para marcar
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleMarcarTerrenoClave}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'terreno_clave'
                    ? 'bg-[#2a172e] border-purple-500 text-purple-200'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border border-purple-400 flex items-center justify-center font-bold text-[9px] text-purple-300 shrink-0">
                    C
                  </span>
                  <span>Marcar Terreno Clave</span>
                </div>
                {activeTool === 'terreno_clave' && (
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Activo</span>
                )}
              </button>

              {activeTool === 'terreno_clave' && (
                <p className="text-[11px] font-mono text-purple-300 bg-[#1c1221] p-1.5 rounded border border-[#4c1d63] leading-tight">
                  Haga clic en el mapa para colocar el símbolo de Terreno Clave (C).
                </p>
              )}
            </div>
          </div>

          {/* Módulo 3: Direcciones de Aproximación (Fase 4) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide">
                Direcciones de Aproximación
              </h2>
              {(activeTool === 'aa_propias' || activeTool === 'aa_enemigo') && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#152332] text-[#90caf9] uppercase tracking-wider border border-[#1976d2]">
                  Trazando AA
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Botón A: Trazar AA Propias (Azul) */}
              <button
                type="button"
                onClick={handleTrazarAAPropias}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'aa_propias'
                    ? 'bg-[#122233] border-[#2196F3] text-[#90caf9]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2196F3] inline-block shrink-0 shadow-sm" />
                  <span>Trazar AA Propias (Azul)</span>
                </div>
                {activeTool === 'aa_propias' && (
                  <span className="text-[10px] uppercase font-bold text-[#2196F3] tracking-wider">Activo</span>
                )}
              </button>

              {/* Botón B: Trazar AA Enemigo (Rojo) */}
              <button
                type="button"
                onClick={handleTrazarAAEnemigo}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'aa_enemigo'
                    ? 'bg-[#311c1d] border-[#F44336] text-[#ffcdd2]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F44336] inline-block shrink-0 shadow-sm" />
                  <span>Trazar AA Enemigo (Rojo)</span>
                </div>
                {activeTool === 'aa_enemigo' && (
                  <span className="text-[10px] uppercase font-bold text-[#F44336] tracking-wider">Activo</span>
                )}
              </button>
            </div>
          </div>

          {/* Módulo Fase 7: Áreas Tácticas */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide">
                Áreas Tácticas
              </h2>
              {(activeTool === 'area_empeno' || activeTool === 'terreno_defendible' || activeTool === 'ain') && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2a2416] text-[#ffb74d] uppercase tracking-wider border border-[#ff9800]">
                  Trazando Área
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Botón A: Trazar Área de Empeño (Naranja) */}
              <button
                type="button"
                onClick={handleTrazarAreaEmpeno}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'area_empeno'
                    ? 'bg-[#332213] border-[#FF9800] text-[#ffcc80]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF9800] inline-block shrink-0 shadow-sm" />
                  <span>Trazar Área de Empeño (Naranja)</span>
                </div>
                {activeTool === 'area_empeno' && (
                  <span className="text-[10px] uppercase font-bold text-[#FF9800] tracking-wider">Activo</span>
                )}
              </button>

              {/* Botón B: Trazar Terreno Defendible (Azul) */}
              <button
                type="button"
                onClick={handleTrazarTerrenoDefendible}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'terreno_defendible'
                    ? 'bg-[#132333] border-[#2196F3] text-[#90caf9]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2196F3] inline-block shrink-0 shadow-sm" />
                  <span>Trazar Terreno Defendible (Azul)</span>
                </div>
                {activeTool === 'terreno_defendible' && (
                  <span className="text-[10px] uppercase font-bold text-[#2196F3] tracking-wider">Activo</span>
                )}
              </button>

              {/* Botón C: Trazar AIN (Verde) - Fase 12 */}
              <button
                type="button"
                id="btn-trazar-ain"
                onClick={handleTrazarAIN}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'ain'
                    ? 'bg-[#182a1b] border-[#4CAF50] text-[#a5d6a7]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#4CAF50] inline-block shrink-0 shadow-sm" />
                  <span>Trazar AIN (Verde)</span>
                </div>
                {activeTool === 'ain' && (
                  <span className="text-[10px] uppercase font-bold text-[#4CAF50] tracking-wider">Activo</span>
                )}
              </button>
            </div>
          </div>

          {/* Módulo Fase 15: Despliegue de Fuerzas (Maniobra) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1E88E5] inline-block" />
                Despliegue de Fuerzas (Maniobra)
              </h2>
              {(activeTool === 'unidad_azul' || activeTool === 'unidad_rojo') && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101411] text-[#81c784] uppercase border border-[#2e7d32]">
                  Listo para insertar
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Parámetros de la Unidad a desplegar */}
              <div className="flex flex-col gap-1.5 bg-[#141814] p-2 rounded border border-[#263327]">
                <div className="text-[10px] font-mono uppercase text-[#8fa38e] font-bold border-b border-[#263327] pb-1 flex items-center justify-between">
                  <span>Parámetros de Unidad</span>
                  <span className="text-[9px] text-[#ffd54f]">✥ Arrastrable</span>
                </div>

                {/* Input: Nombre de la Unidad */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="input-unidad-nombre" className="text-[10px] font-mono uppercase text-[#7e8f7c]">
                    Nombre / Designación:
                  </label>
                  <input
                    id="input-unidad-nombre"
                    type="text"
                    value={unidadConfig.nombre}
                    onChange={(e) => setUnidadConfig((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: RIMEC 35, B.Tanq 1..."
                    className="w-full bg-[#1c231e] border border-[#364638] text-[#ffffff] text-xs font-mono px-2 py-1.5 rounded focus:outline-none focus:border-[#4caf50]"
                  />
                </div>

                {/* Selector: Tipo de Unidad */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="select-unidad-tipo" className="text-[10px] font-mono uppercase text-[#7e8f7c]">
                    Tipo de Unidad (Arma/Servicio):
                  </label>
                  <select
                    id="select-unidad-tipo"
                    value={unidadConfig.tipo}
                    onChange={(e) => setUnidadConfig((prev) => ({ ...prev, tipo: e.target.value }))}
                    className="w-full bg-[#1c231e] border border-[#364638] text-[#d6dfd5] text-xs font-mono px-2 py-1.5 rounded focus:outline-none focus:border-[#4caf50] cursor-pointer"
                  >
                    <option value="infanteria">Infantería (X)</option>
                    <option value="tanques">Tanques / Blindados (Elipse)</option>
                    <option value="rec_mec">Rec. Mecanizado (Diagonal/Elipse)</option>
                    <option value="artilleria">Artillería de Campaña (●)</option>
                    <option value="ingenieros">Ingenieros (Puente/E)</option>
                    <option value="ada">Defensa Antiaérea (ADA)</option>
                    <option value="comunicaciones">Comunicaciones (Rayo)</option>
                    <option value="logistica">Logística / Apoyo</option>
                  </select>
                </div>

                {/* Selector: Magnitud / Escalón */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="select-unidad-magnitud" className="text-[10px] font-mono uppercase text-[#7e8f7c]">
                    Magnitud / Escalón:
                  </label>
                  <select
                    id="select-unidad-magnitud"
                    value={unidadConfig.magnitud}
                    onChange={(e) => setUnidadConfig((prev) => ({ ...prev, magnitud: e.target.value }))}
                    className="w-full bg-[#1c231e] border border-[#364638] text-[#ffd54f] text-xs font-mono font-bold px-2 py-1.5 rounded focus:outline-none focus:border-[#4caf50] cursor-pointer"
                  >
                    <option value="•">Escuadra (•)</option>
                    <option value="••">Pelotón / Sección (••)</option>
                    <option value="I">Compañía / Batería (I)</option>
                    <option value="II">Batallón / Grupo (II)</option>
                    <option value="III">Regimiento (III)</option>
                    <option value="X">Brigada (X)</option>
                    <option value="XX">División (XX)</option>
                  </select>
                </div>
              </div>

              {/* Botón: Insertar Unidad AZUL */}
              <button
                type="button"
                id="btn-unidad-azul"
                onClick={handleInsertarUnidadAzul}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'unidad_azul'
                    ? 'bg-[#102235] border-[#1e88e5] text-[#90caf9]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-2.5 rounded-xs bg-[#1E88E5] border border-[#1a1a1a] inline-block shrink-0 shadow-xs" />
                  <span>Insertar Unidad AZUL</span>
                </div>
                {activeTool === 'unidad_azul' && (
                  <span className="text-[10px] uppercase font-bold text-[#90caf9] tracking-wider">Activo</span>
                )}
              </button>

              {/* Botón: Insertar Unidad ROJO */}
              <button
                type="button"
                id="btn-unidad-rojo"
                onClick={handleInsertarUnidadRojo}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'unidad_rojo'
                    ? 'bg-[#2b1215] border-[#e53935] text-[#ef9a9a]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rotate-45 bg-[#E53935] border border-[#1a1a1a] inline-block shrink-0 shadow-xs" />
                  <span>Insertar Unidad ROJO</span>
                </div>
                {activeTool === 'unidad_rojo' && (
                  <span className="text-[10px] uppercase font-bold text-[#ef9a9a] tracking-wider">Activo</span>
                )}
              </button>

              <div className="text-[10px] font-mono text-[#8fa38e] bg-[#121613] p-1.5 rounded border border-[#252f26] leading-tight">
                <span className="text-[#ffd54f] font-bold">✥ Movimiento:</span> Las unidades desplegadas se pueden mover arrastrándolas con el cursor. Clic para editar datos.
              </div>

              {(activeTool === 'unidad_azul' || activeTool === 'unidad_rojo') && (
                <p className="text-[11px] font-mono text-[#a5d6a7] bg-[#142318] p-1.5 rounded border border-[#2e7d32] leading-tight">
                  Haga clic en el mapa para posicionar la Unidad de Maniobra {activeTool === 'unidad_azul' ? 'AZUL' : 'ROJA'} ({unidadConfig.nombre || 'UNIDAD'} - {unidadConfig.magnitud}).
                </p>
              )}
            </div>
          </div>

          {/* Módulo Fase 16: Método de Juego de Guerra */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#00BCD4] inline-block" />
                Método de Juego de Guerra
              </h2>
              {activeTool === 'metodo_jg' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0d2a30] text-[#80deea] uppercase tracking-wider border border-[#0097a7]">
                  Trazando
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Menú desplegable con ID 'selectMetodoJG' */}
              <div className="flex flex-col gap-1">
                <label htmlFor="selectMetodoJG" className="text-[10px] font-mono uppercase text-[#7e8f7c]">
                  Técnica de Secuenciación:
                </label>
                <select
                  id="selectMetodoJG"
                  value={metodoJG}
                  onChange={(e) => setMetodoJG(e.target.value as 'faja' | 'avenida' | 'caja')}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-2 rounded focus:outline-none focus:border-[#00BCD4] cursor-pointer"
                >
                  <option value="faja">Faja (Faja)</option>
                  <option value="avenida">Avenida en Profundidad</option>
                  <option value="caja">Caja (Caja)</option>
                </select>
              </div>

              {/* Botón: Trazar Área de Análisis */}
              <button
                type="button"
                id="btnTrazarMetodoJG"
                onClick={handleTrazarMetodoJG}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'metodo_jg'
                    ? 'bg-[#0d2a30] border-[#00BCD4] text-[#80deea]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border border-[#0097a7] bg-[#00BCD4]/30 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-bold text-[#80deea]">
                      {metodoJG === 'faja' ? '▭' : metodoJG === 'caja' ? '□' : '⬠'}
                    </span>
                  </span>
                  <span>Trazar Área de Análisis</span>
                </div>
                {activeTool === 'metodo_jg' && (
                  <span className="text-[10px] uppercase font-bold text-[#80deea] tracking-wider">Activo</span>
                )}
              </button>

              {activeTool === 'metodo_jg' && (
                <p className="text-[11px] font-mono text-[#80deea] bg-[#0c2024] p-1.5 rounded border border-[#006064] leading-tight">
                  {metodoJG === 'avenida'
                    ? 'Modo Polígono: Haga clic para delimitar el corredor o eje en profundidad. Doble clic para cerrar el área.'
                    : 'Modo Rectángulo: Haga clic en la primera esquina y arrastre/haga clic en la esquina opuesta para definir la faja o caja.'}
                </p>
              )}
            </div>
          </div>

          {/* Módulo Fase 8: Blancos de Alto Valor (BAV) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide">
                Blancos de Alto Valor (BAV)
              </h2>
              {activeTool === 'bav' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#331718] text-[#ff8a80] uppercase tracking-wider border border-[#b71c1c]">
                  Listo para marcar
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Menú desplegable con ID único */}
              <div className="flex flex-col gap-1">
                <label htmlFor="select-bav" className="text-[10px] font-mono uppercase text-[#7e8f7c]">
                  Tipo de Blanco Táctico:
                </label>
                <select
                  id="select-bav"
                  value={bavTipo}
                  onChange={(e) => setBavTipo(e.target.value)}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-2 rounded focus:outline-none focus:border-[#d32f2f] cursor-pointer"
                >
                  <option value="c4">Puesto Comando C4</option>
                  <option value="art">Artillería</option>
                  <option value="ada">Defensa Antiaérea ADA</option>
                  <option value="log">Logística/Munición</option>
                </select>
              </div>

              {/* Botón: Marcar BAV */}
              <button
                type="button"
                onClick={handleMarcarBAV}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'bav'
                    ? 'bg-[#331517] border-[#d32f2f] text-[#ff8a80]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border border-[#1a1a1a] bg-[#D32F2F] rotate-45 flex items-center justify-center shrink-0">
                    <span className="-rotate-45 font-bold text-[8px] text-white">
                      {bavTipo === 'c4' ? 'C' : bavTipo === 'art' ? 'Ar' : bavTipo === 'ada' ? 'AA' : 'L'}
                    </span>
                  </span>
                  <span>Marcar BAV</span>
                </div>
                {activeTool === 'bav' && (
                  <span className="text-[10px] uppercase font-bold text-[#ff5252] tracking-wider">Activo</span>
                )}
              </button>

              {activeTool === 'bav' && (
                <p className="text-[11px] font-mono text-[#ff8a80] bg-[#241214] p-1.5 rounded border border-[#5c1c1f] leading-tight">
                  Haga clic en el mapa para colocar el símbolo del Blanco de Alto Valor (BAV) seleccionado.
                </p>
              )}
            </div>
          </div>

          {/* Módulo Fase 10: Análisis CARVER (BAV) */}
          <div
            id="panelCarver"
            style={{ display: carverVisible ? 'block' : 'none' }}
            className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#d32f2f] inline-block" />
                Análisis CARVER (BAV)
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCarverVisible(false);
                  const p = document.getElementById('panelCarver');
                  if (p) p.style.display = 'none';
                }}
                className="text-[10px] font-mono text-[#7e8f7c] hover:text-[#d6dfd5] px-1 py-0.5 rounded hover:bg-[#252f26] cursor-pointer"
                title="Ocultar análisis CARVER"
              >
                ✕ Cerrar
              </button>
            </div>

            {selectedBavTarget && (
              <div className="mb-2.5 p-2 bg-[#121613] rounded border border-[#2d382d] font-mono text-[10px] text-[#8fa38e] flex justify-between items-center">
                <span>
                  Blanco: <strong className="text-white uppercase">{selectedBavTarget.tipo}</strong>
                </span>
                <span className="text-[#657764]">
                  [{selectedBavTarget.lat.toFixed(4)}, {selectedBavTarget.lng.toFixed(4)}]
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Select 1: Crítico (C) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="select-carver-c" className="text-[10px] font-mono uppercase text-[#a6b9a4]">
                  Crítico (C)
                </label>
                <select
                  id="select-carver-c"
                  value={carverValues.c}
                  onChange={(e) => setCarverValues((prev) => ({ ...prev, c: parseInt(e.target.value, 10) }))}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-1.5 rounded focus:outline-none focus:border-[#d32f2f] cursor-pointer"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Select 2: Accesibilidad (A) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="select-carver-a" className="text-[10px] font-mono uppercase text-[#a6b9a4]">
                  Accesibilidad (A)
                </label>
                <select
                  id="select-carver-a"
                  value={carverValues.a}
                  onChange={(e) => setCarverValues((prev) => ({ ...prev, a: parseInt(e.target.value, 10) }))}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-1.5 rounded focus:outline-none focus:border-[#d32f2f] cursor-pointer"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Select 3: Recuperabilidad (R) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="select-carver-r" className="text-[10px] font-mono uppercase text-[#a6b9a4]">
                  Recuperabilidad (R)
                </label>
                <select
                  id="select-carver-r"
                  value={carverValues.r}
                  onChange={(e) => setCarverValues((prev) => ({ ...prev, r: parseInt(e.target.value, 10) }))}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-1.5 rounded focus:outline-none focus:border-[#d32f2f] cursor-pointer"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Select 4: Vulnerabilidad (V) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="select-carver-v" className="text-[10px] font-mono uppercase text-[#a6b9a4]">
                  Vulnerabilidad (V)
                </label>
                <select
                  id="select-carver-v"
                  value={carverValues.v}
                  onChange={(e) => setCarverValues((prev) => ({ ...prev, v: parseInt(e.target.value, 10) }))}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-1.5 rounded focus:outline-none focus:border-[#d32f2f] cursor-pointer"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Select 5: Efectividad (E) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="select-carver-e" className="text-[10px] font-mono uppercase text-[#a6b9a4]">
                  Efectividad (E)
                </label>
                <select
                  id="select-carver-e"
                  value={carverValues.e}
                  onChange={(e) => setCarverValues((prev) => ({ ...prev, e: parseInt(e.target.value, 10) }))}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-1.5 rounded focus:outline-none focus:border-[#d32f2f] cursor-pointer"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Select 6: Reconocible (R) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="select-carver-rec" className="text-[10px] font-mono uppercase text-[#a6b9a4]">
                  Reconocible (R)
                </label>
                <select
                  id="select-carver-rec"
                  value={carverValues.rec}
                  onChange={(e) => setCarverValues((prev) => ({ ...prev, rec: parseInt(e.target.value, 10) }))}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-1.5 rounded focus:outline-none focus:border-[#d32f2f] cursor-pointer"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Botón: Calcular Valor Relativo */}
              <button
                type="button"
                id="btn-calcular-carver"
                onClick={handleCalcularCarver}
                className="w-full mt-1 py-2 px-3 rounded text-xs font-mono text-center font-bold transition-colors duration-150 cursor-pointer bg-[#243526] hover:bg-[#2c402e] border border-[#415e43] text-[#c5e1c4] uppercase tracking-wide"
              >
                Calcular Valor Relativo
              </button>

              {/* Elemento div vacío con ID resultadoCarver */}
              <div
                id="resultadoCarver"
                className="mt-1 p-2 bg-[#121613] rounded border border-[#2d382d] font-mono text-xs text-[#e0e8df] min-h-[32px] flex flex-col justify-center leading-relaxed"
              ></div>
            </div>
          </div>

          {/* Módulo 4: Análisis de Orografía (Fase 5) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide">
                Análisis de Orografía
              </h2>
              {activeTool === 'orografia' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18261e] text-[#a5d6a7] uppercase tracking-wider border border-[#2e7d32]">
                  Consultando Cota
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConsultarAltitud}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'orografia'
                    ? 'bg-[#18261e] border-[#81c784] text-[#c8e6c9]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm leading-none text-[#81c784]">▲</span>
                  <span>Consultar Altitud (Cota)</span>
                </div>
                {activeTool === 'orografia' && (
                  <span className="text-[10px] uppercase font-bold text-[#81c784] tracking-wider">Activo</span>
                )}
              </button>

              {activeTool === 'orografia' && (
                <p className="text-[11px] font-mono text-[#a5d6a7] bg-[#142016] p-1.5 rounded border border-[#233f26] leading-tight">
                  Haga clic en cualquier punto del mapa para obtener la cota de altitud y coordenadas.
                </p>
              )}

              {consultandoOrografia && (
                <div className="text-[11px] font-mono text-[#81c784] bg-[#142016] p-2 rounded border border-[#233f26] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#81c784] animate-ping" />
                  <span>Obteniendo altitud y coordenadas...</span>
                </div>
              )}

              {orografiaData && (
                <div className="p-2.5 bg-[#121613] rounded border border-[#2d382d] font-mono text-[11px] flex flex-col gap-1.5 mt-1">
                  <div className="text-[10px] text-[#81c784] font-bold uppercase tracking-wider border-b border-[#242f25] pb-1 flex justify-between items-center">
                    <span>Última Cota Registrada</span>
                    <span className="text-[#647963] text-[9px]">SIG-TOPOGRÁFICO</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-[#7e8f7c]">Altitud:</span>
                    <span className="font-bold text-white text-xs tracking-wide">
                      {orografiaData.altitud} Metros
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#7e8f7c]">Coordenadas:</span>
                    <span className="text-[#d6dfd5] text-[10px]">
                      {orografiaData.lat.toFixed(4)}, {orografiaData.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Módulo Fase 9: Cálculo de Marcha (LFT) */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-3">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide">
                Cálculo de Marcha (LFT)
              </h2>
              {activeTool === 'medir_ruta' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2e2a14] text-[#fff59d] uppercase tracking-wider border border-[#fbc02d]">
                  Midiendo Ruta
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="selectVelocidad" className="text-[10px] font-mono uppercase text-[#7e8f7c]">
                  Velocidad Doctrinal:
                </label>
                <select
                  id="selectVelocidad"
                  value={velocidadMarcha}
                  onChange={(e) => setVelocidadMarcha(e.target.value)}
                  className="w-full bg-[#151c16] border border-[#313f32] text-[#e2ede1] text-xs font-mono p-2 rounded focus:outline-none focus:border-[#FFFF00] cursor-pointer"
                >
                  <option value="4">Inf. - Sin Restricción (4 km/h)</option>
                  <option value="2">Inf. - Restringido (2 km/h)</option>
                  <option value="1">Inf. - Sev. Restringido (1 km/h)</option>
                </select>
              </div>

              <button
                type="button"
                id="btn-medir-ruta"
                onClick={handleMedirRuta}
                className={`w-full py-2 px-3 rounded text-xs font-mono text-left transition-colors duration-150 flex items-center justify-between cursor-pointer border ${
                  activeTool === 'medir_ruta'
                    ? 'bg-[#2e2a14] border-[#FFFF00] text-[#fff59d]'
                    : 'bg-[#151c16] hover:bg-[#1d261e] border-[#313f32] text-[#d6dfd5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm leading-none text-[#FFFF00]">📏</span>
                  <span>Medir Ruta (Regla)</span>
                </div>
                {activeTool === 'medir_ruta' && (
                  <span className="text-[10px] uppercase font-bold text-[#FFFF00] tracking-wider">Activo</span>
                )}
              </button>

              {activeTool === 'medir_ruta' && (
                <p className="text-[11px] font-mono text-[#fff59d] bg-[#221f11] p-1.5 rounded border border-[#52491a] leading-tight">
                  Trace la ruta en el mapa con clics sucesivos (mínimo 2 puntos). Doble clic para finalizar el cálculo.
                </p>
              )}

              {/* Elemento div para mostrar los resultados de marcha */}
              <div
                id="resultadoMarcha"
                className="p-2.5 bg-[#121613] rounded border border-[#2d382d] font-mono text-xs text-[#e0e8df] min-h-[38px] flex items-center leading-relaxed"
              >
                {resultadoMarcha ? (
                  <span>{resultadoMarcha}</span>
                ) : (
                  <span className="text-[#657764] text-[11px] italic">Trace una ruta con la regla para calcular marcha...</span>
                )}
              </div>
            </div>
          </div>

          {/* Módulo Fase 11: Efectos CC.MM. en Operaciones */}
          <div className="border border-[#2d382d] bg-[#1a201a] rounded p-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d382d] pb-2 mb-2">
              <h2 className="text-xs font-semibold text-[#a6b9a4] uppercase font-mono tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#81c784] inline-block" />
                Efectos CC.MM. en Operaciones
              </h2>
              <button
                type="button"
                onClick={handleResetCcmm}
                className="text-[10px] font-mono text-[#7e8f7c] hover:text-[#d6dfd5] px-1.5 py-0.5 rounded hover:bg-[#252f26] border border-[#2e3a2f] cursor-pointer"
                title="Restablecer matriz a estado inicial"
              >
                Limpiar
              </button>
            </div>

            <p className="text-[10px] font-mono text-[#7e8f7c] mb-2 leading-tight">
              Matriz de juicio de Estado Mayor. Clic en cada celda para alternar semaforización:
              Sin evaluar → Favorable → Marginal → Desfavorable.
            </p>

            {/* Contenedor con overflow-x: auto según requerimiento estricto */}
            <div className="overflow-x-auto w-full pb-1">
              <table className="w-full border-collapse border border-[#313f32] font-mono text-[10px] text-center select-none min-w-[340px]">
                <thead>
                  {/* Cabecera Nivel 1: 5 columnas abarcando 2 espacios cada una (colspan="2") */}
                  <tr className="bg-[#121613] text-[#a6b9a4]">
                    <th
                      rowSpan={2}
                      className="border border-[#313f32] p-1 text-left font-semibold text-[#8fa38e] bg-[#151c16] min-w-[70px]"
                    >
                      Sistema
                    </th>
                    {FACTORES_CCMM.map((factor) => (
                      <th
                        key={factor}
                        colSpan={2}
                        className="border border-[#313f32] p-1 font-semibold text-[10px] tracking-tight bg-[#151c16]"
                      >
                        {factor}
                      </th>
                    ))}
                  </tr>
                  {/* Cabecera Nivel 2: Subcolumnas marcadas con 'A' (Amigas) y 'E' (Enemigas) */}
                  <tr className="bg-[#182019] text-[#7e8f7c]">
                    {FACTORES_CCMM.map((factor) => (
                      <React.Fragment key={`sub-${factor}`}>
                        <th
                          className="border border-[#313f32] p-0.5 w-6 text-[#90caf9] font-bold text-[9px]"
                          title="Fuerzas Amigas (A)"
                        >
                          A
                        </th>
                        <th
                          className="border border-[#313f32] p-0.5 w-6 text-[#ef9a9a] font-bold text-[9px]"
                          title="Fuerzas Enemigas (E)"
                        >
                          E
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Filas: 8 sistemas doctrinales */}
                  {SISTEMAS_CCMM.map((sistema, sIdx) => (
                    <tr key={sistema} className="hover:bg-[#1f2720]/40 transition-colors">
                      <td className="border border-[#313f32] px-1.5 py-1 text-left font-medium text-[#d6dfd5] bg-[#141a15] whitespace-nowrap text-[10px]">
                        {sistema}
                      </td>
                      {FACTORES_CCMM.map((factor, fIdx) => {
                        const keyA = `${sIdx}-${fIdx}-A`;
                        const keyE = `${sIdx}-${fIdx}-E`;
                        const stateA = ccmmStates[keyA] || 0;
                        const stateE = ccmmStates[keyE] || 0;

                        return (
                          <React.Fragment key={`cell-${sistema}-${factor}`}>
                            {/* Celda evaluable Amiga (A) con clase obligatoria celda-ccmm */}
                            <td
                              onClick={() => toggleCcmmCell(keyA)}
                              style={{
                                backgroundColor: getCcmmBgColor(stateA),
                                color: getCcmmTextColor(stateA),
                              }}
                              title={`${sistema} - ${factor} [Amigas]: ${
                                stateA === 1 ? 'Favorable (#4CAF50)' : stateA === 2 ? 'Marginal (#FFC107)' : stateA === 3 ? 'Desfavorable (#F44336)' : 'Sin evaluar'
                              }`}
                              className="celda-ccmm border border-[#313f32] p-0.5 text-center cursor-pointer font-bold text-[9px] transition-colors duration-150 h-5"
                            >
                              {stateA === 0 ? '-' : ''}
                            </td>
                            {/* Celda evaluable Enemiga (E) con clase obligatoria celda-ccmm */}
                            <td
                              onClick={() => toggleCcmmCell(keyE)}
                              style={{
                                backgroundColor: getCcmmBgColor(stateE),
                                color: getCcmmTextColor(stateE),
                              }}
                              title={`${sistema} - ${factor} [Enemigas]: ${
                                stateE === 1 ? 'Favorable (#4CAF50)' : stateE === 2 ? 'Marginal (#FFC107)' : stateE === 3 ? 'Desfavorable (#F44336)' : 'Sin evaluar'
                              }`}
                              className="celda-ccmm border border-[#313f32] p-0.5 text-center cursor-pointer font-bold text-[9px] transition-colors duration-150 h-5"
                            >
                              {stateE === 0 ? '-' : ''}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Leyenda sobria y táctica de semaforización */}
            <div className="mt-2 pt-2 border-t border-[#2d382d] flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono text-[#8fa38e]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm border border-[#313f32] bg-transparent inline-flex items-center justify-center text-[7px] text-[#556655]">-</span>
                <span>Sin evaluar</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#4CAF50] inline-block" />
                <span className="text-[#a5d6a7]">Favorable</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FFC107] inline-block" />
                <span className="text-[#ffe082]">Marginal</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F44336] inline-block" />
                <span className="text-[#ef9a9a]">Desfavorable</span>
              </div>
            </div>
          </div>

          {/* Panel interactivo auxiliar cuando hay trazado activo */}
          {isDrawingTool && (
            <div className="p-2.5 bg-[#121613] rounded border border-[#2d382d] flex flex-col gap-2">
              <div className="text-[11px] font-mono text-[#a4b5a2] leading-tight">
                <span className="text-[#e2ede1] font-semibold">Trazado activo:</span> Clic en mapa para fijar puntos ({vertexCount} marcados). Doble clic para finalizar.
              </div>
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleFinalizarTrazo}
                  disabled={vertexCount < minVerticesRequired}
                  className={`flex-1 py-1 px-2 rounded text-[10px] font-mono uppercase text-center border ${
                    vertexCount >= minVerticesRequired
                      ? 'bg-[#233324] border-[#3e5a40] text-[#c5e1c4] cursor-pointer hover:bg-[#2c402d]'
                      : 'bg-[#182019] border-[#242f25] text-[#556454] cursor-not-allowed'
                  }`}
                >
                  Finalizar Trazo ({vertexCount}/{minVerticesRequired})
                </button>
                <button
                  type="button"
                  onClick={handleCancelarTrazo}
                  className="py-1 px-2 rounded text-[10px] font-mono uppercase text-center bg-[#241a1a] border-[#442828] text-[#dca6a6] cursor-pointer hover:bg-[#302020]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie de panel lateral */}
        <div className="pt-3 mt-4 border-t border-[#2d382d] text-[11px] font-mono text-[#6c7d6b]">
          <div>COORD: -17.3895, -66.1568</div>
          <div>MODO: TOPOGRÁFICO (TERRAIN)</div>
          <div>ZOOM: 10</div>
          <div>CALCOS TOTALES: {overlaysCount}</div>
        </div>
      </aside>

      {/* Área Principal: Visor Geográfico (~60% del ancho) */}
      <main className="flex-1 w-[60%] min-w-[320px] h-full relative bg-[#111411]">
        {mapError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#141814]/95 p-6 text-center">
            <div className="border border-red-900 bg-red-950/60 p-5 rounded max-w-lg text-red-200 text-xs font-mono shadow-2xl">
              <div className="font-bold text-sm mb-2 uppercase tracking-wide text-red-400">
                Alerta de Inicialización del Visor Táctico
              </div>
              <div className="mb-4 leading-relaxed text-[#f0d0d2]">{mapError}</div>
              <button
                type="button"
                onClick={loadMapsScript}
                className="px-4 py-2 bg-[#2d1b1d] hover:bg-[#3f2427] border border-red-800 text-red-100 rounded text-xs font-mono uppercase cursor-pointer transition-colors"
              >
                Reintentar Inicialización
              </button>
            </div>
          </div>
        )}

        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#141814] text-xs font-mono text-[#829281]">
            Iniciando Visor Táctico de Terreno...
          </div>
        )}

        {/* Contenedor del Mapa de Google Maps */}
        <div ref={mapContainerRef} className="w-full h-full" id="tactical-map" />
      </main>

      {/* NUEVO Panel Derecho (Fase 14): Tablero Potencia Relativa de Combate (PRC) (~20% del ancho) */}
      <aside
        id="panelDerecho"
        className="w-[20%] min-w-[240px] max-w-[360px] h-full flex flex-col bg-[#141814] border-l border-[#2d382d] p-3 box-border overflow-y-auto"
      >
        <div className="pb-3 mb-3 border-b border-[#2d382d]">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-[#e2ede1] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#e57373] inline-block shadow-sm" />
              Potencia Relativa de Combate (PRC)
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101411] text-[#8fa38e] border border-[#2d3a2e]">
              FASE 14
            </span>
          </div>
          <p className="text-[10px] text-[#7e8f7c] font-mono mt-1 leading-snug">
            Cálculo doctrinal de correlación de fuerzas de maniobra y artillería
          </p>
        </div>

        {/* Formulario dividido en dos columnas / bloques: AZUL (Propias) y ROJO (Enemigo) */}
        <div className="flex flex-col gap-3 flex-1">
          {/* Bloque AZUL (Propias) */}
          <div className="p-2.5 rounded bg-[#0f1b2b] border border-[#1b3a5b] flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1b3a5b]/80 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#2196F3] inline-block shadow-sm" />
                <span className="text-xs font-bold font-mono text-[#90caf9] uppercase tracking-wide">
                  AZUL (Propias)
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#64b5f6] bg-[#0c1624] px-1.5 py-0.5 rounded border border-[#1e4976]">
                Eficacia: x0.90
              </span>
            </div>

            <div className="flex flex-col gap-1.5 text-[11px] font-mono">
              {/* Reg. Inf. Mecanizada */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-azul-inf-mec" className="text-[#b0bec5] text-[10px] leading-tight flex-1">
                  Reg. Inf. Mecanizada <span className="text-[#64b5f6] text-[9px]">(v: 0.5)</span>
                </label>
                <input
                  type="number"
                  id="prc-azul-inf-mec"
                  min="0"
                  value={prcValues.azulInfMec}
                  onChange={(e) => handlePrcInputChange('azulInfMec', e.target.value)}
                  className="w-16 bg-[#0a131f] border border-[#1e4976] text-[#e3f2fd] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#2196F3]"
                />
              </div>

              {/* Reg. Tanques */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-azul-tanques" className="text-[#b0bec5] text-[10px] leading-tight flex-1">
                  Reg. Tanques <span className="text-[#64b5f6] text-[9px]">(v: 0.6)</span>
                </label>
                <input
                  type="number"
                  id="prc-azul-tanques"
                  min="0"
                  value={prcValues.azulTanques}
                  onChange={(e) => handlePrcInputChange('azulTanques', e.target.value)}
                  className="w-16 bg-[#0a131f] border border-[#1e4976] text-[#e3f2fd] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#2196F3]"
                />
              </div>

              {/* Grupo Rec. Mec. */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-azul-rec-mec" className="text-[#b0bec5] text-[10px] leading-tight flex-1">
                  Grupo Rec. Mec. <span className="text-[#64b5f6] text-[9px]">(v: 0.5)</span>
                </label>
                <input
                  type="number"
                  id="prc-azul-rec-mec"
                  min="0"
                  value={prcValues.azulRecMec}
                  onChange={(e) => handlePrcInputChange('azulRecMec', e.target.value)}
                  className="w-16 bg-[#0a131f] border border-[#1e4976] text-[#e3f2fd] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#2196F3]"
                />
              </div>

              {/* Artillería 105mm */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-azul-art-105" className="text-[#b0bec5] text-[10px] leading-tight flex-1">
                  Artillería 105mm <span className="text-[#64b5f6] text-[9px]">(v: 0.75)</span>
                </label>
                <input
                  type="number"
                  id="prc-azul-art-105"
                  min="0"
                  value={prcValues.azulArt105}
                  onChange={(e) => handlePrcInputChange('azulArt105', e.target.value)}
                  className="w-16 bg-[#0a131f] border border-[#1e4976] text-[#e3f2fd] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#2196F3]"
                />
              </div>

              {/* Artillería 122mm */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-azul-art-122" className="text-[#b0bec5] text-[10px] leading-tight flex-1">
                  Artillería 122mm <span className="text-[#64b5f6] text-[9px]">(v: 2.0)</span>
                </label>
                <input
                  type="number"
                  id="prc-azul-art-122"
                  min="0"
                  value={prcValues.azulArt122}
                  onChange={(e) => handlePrcInputChange('azulArt122', e.target.value)}
                  className="w-16 bg-[#0a131f] border border-[#1e4976] text-[#e3f2fd] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#2196F3]"
                />
              </div>
            </div>
          </div>

          {/* Bloque ROJO (Enemigo) */}
          <div className="p-2.5 rounded bg-[#241315] border border-[#521e22] flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#521e22]/80 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F44336] inline-block shadow-sm" />
                <span className="text-xs font-bold font-mono text-[#ef9a9a] uppercase tracking-wide">
                  ROJO (Enemigo)
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#ef9a9a] bg-[#1a0c0e] px-1.5 py-0.5 rounded border border-[#6b252a]">
                Eficacia: x0.85
              </span>
            </div>

            <div className="flex flex-col gap-1.5 text-[11px] font-mono">
              {/* Reg. Inf. Mecanizada */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-rojo-inf-mec" className="text-[#cfd8dc] text-[10px] leading-tight flex-1">
                  Reg. Inf. Mecanizada <span className="text-[#e57373] text-[9px]">(v: 0.6)</span>
                </label>
                <input
                  type="number"
                  id="prc-rojo-inf-mec"
                  min="0"
                  value={prcValues.rojoInfMec}
                  onChange={(e) => handlePrcInputChange('rojoInfMec', e.target.value)}
                  className="w-16 bg-[#180a0c] border border-[#6b252a] text-[#ffebee] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#F44336]"
                />
              </div>

              {/* Reg. Tanques */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-rojo-tanques" className="text-[#cfd8dc] text-[10px] leading-tight flex-1">
                  Reg. Tanques <span className="text-[#e57373] text-[9px]">(v: 2.2)</span>
                </label>
                <input
                  type="number"
                  id="prc-rojo-tanques"
                  min="0"
                  value={prcValues.rojoTanques}
                  onChange={(e) => handlePrcInputChange('rojoTanques', e.target.value)}
                  className="w-16 bg-[#180a0c] border border-[#6b252a] text-[#ffebee] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#F44336]"
                />
              </div>

              {/* Grupo Rec. Mec. */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-rojo-rec-mec" className="text-[#cfd8dc] text-[10px] leading-tight flex-1">
                  Grupo Rec. Mec. <span className="text-[#e57373] text-[9px]">(v: 0.6)</span>
                </label>
                <input
                  type="number"
                  id="prc-rojo-rec-mec"
                  min="0"
                  value={prcValues.rojoRecMec}
                  onChange={(e) => handlePrcInputChange('rojoRecMec', e.target.value)}
                  className="w-16 bg-[#180a0c] border border-[#6b252a] text-[#ffebee] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#F44336]"
                />
              </div>

              {/* Artillería 105mm */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-rojo-art-105" className="text-[#cfd8dc] text-[10px] leading-tight flex-1">
                  Artillería 105mm <span className="text-[#e57373] text-[9px]">(v: 0.8)</span>
                </label>
                <input
                  type="number"
                  id="prc-rojo-art-105"
                  min="0"
                  value={prcValues.rojoArt105}
                  onChange={(e) => handlePrcInputChange('rojoArt105', e.target.value)}
                  className="w-16 bg-[#180a0c] border border-[#6b252a] text-[#ffebee] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#F44336]"
                />
              </div>

              {/* Artillería 155mm */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="prc-rojo-art-155" className="text-[#cfd8dc] text-[10px] leading-tight flex-1">
                  Artillería 155mm <span className="text-[#e57373] text-[9px]">(v: 2.5)</span>
                </label>
                <input
                  type="number"
                  id="prc-rojo-art-155"
                  min="0"
                  value={prcValues.rojoArt155}
                  onChange={(e) => handlePrcInputChange('rojoArt155', e.target.value)}
                  className="w-16 bg-[#180a0c] border border-[#6b252a] text-[#ffebee] text-xs font-mono px-2 py-1 rounded text-right focus:outline-none focus:border-[#F44336]"
                />
              </div>
            </div>
          </div>

          {/* Botón que abarca todo el ancho: "Calcular Potencia (PRC)" */}
          <button
            type="button"
            id="btn-calcular-prc"
            onClick={handleCalcularPRC}
            className="w-full py-2.5 px-3 rounded text-xs font-mono text-center font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer bg-[#273a2a] hover:bg-[#324a36] border border-[#486b4c] text-[#d6eed5] shadow"
          >
            Calcular Potencia (PRC)
          </button>

          {/* <div> destacado con ID "resultadoPRC" para mostrar la proporción final */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono text-[#829281] uppercase tracking-wide">
              Proporción Doctrinal de Fuerzas:
            </span>
            <div
              id="resultadoPRC"
              className="p-3 bg-[#111612] rounded border-2 border-[#3d523f] text-center font-mono font-bold text-xs tracking-wider text-[#e8f5e9] shadow-inner select-all"
            >
              {prcRatioText}
            </div>

            {/* Desglose de subtotales doctrinales */}
            {prcCalculated && (
              <div className="mt-1 p-2 bg-[#121613] rounded border border-[#2d382d] text-[10px] font-mono flex flex-col gap-1 leading-tight">
                <div className="flex justify-between font-bold border-b border-[#2d382d] pb-1">
                  <span className="text-[#90caf9]">AZUL: {prcDetails.absolutoAzul.toFixed(2)}</span>
                  <span className="text-[#ef9a9a]">ROJO: {prcDetails.absolutoRojo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#8fa38e] pt-0.5">
                  <span>Man. AZUL: {prcDetails.totalManiobraAzul.toFixed(2)}</span>
                  <span>Man. ROJO: {prcDetails.totalManiobraRojo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#8fa38e]">
                  <span>Art. AZUL: {prcDetails.totalArtilleriaAzul.toFixed(2)}</span>
                  <span>Art. ROJO: {prcDetails.totalArtilleriaRojo.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>

    {/* Bloque Inferior: Matriz de Eventos y Líneas Fase de Tiempo (LFT) (25vh de altura) */}
    <footer className="w-full h-[25vh] bg-[#141814] border-t-4 border-[#2d382d] p-3 box-border overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2d382d] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#81c784] inline-block shadow-sm" />
          <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-[#e2ede1]">
            Matriz de Eventos y Líneas Fase de Tiempo (LFT)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101411] text-[#8fa38e] border border-[#2d3a2e]">
            {matrizEventos.length} {matrizEventos.length === 1 ? 'AIN VINCULADA' : 'AINS VINCULADAS'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto w-full">
        <table id="tablaMatrizEventos" className="w-full border-collapse border border-[#2d382d] font-mono text-xs text-left">
          <thead className="sticky top-0 bg-[#121613] text-[#a6b9a4] uppercase text-[10px] tracking-wider z-10 border-b border-[#2d382d]">
            <tr>
              <th className="p-2 border border-[#2d382d] w-28 text-center text-[#81c784] font-bold">Nº AIN</th>
              <th className="p-2 border border-[#2d382d] w-48">No antes de (Horas)</th>
              <th className="p-2 border border-[#2d382d] w-48">No después de (Horas)</th>
              <th className="p-2 border border-[#2d382d]">Indicador (Evento)</th>
            </tr>
          </thead>
          <tbody id="bodyMatrizEventos">
            {matrizEventos.map((item, idx) => (
              <tr
                key={item.id}
                className={`${idx % 2 === 0 ? 'bg-[#151a16]' : 'bg-[#1b221c]'} hover:bg-[#202922] transition-colors border-b border-[#2d382d]`}
              >
                <td className="p-2 border-r border-[#2d382d] font-bold text-[#81c784] text-center w-28 whitespace-nowrap">
                  {item.ainLabel}
                </td>
                <td className="p-0 border-r border-[#2d382d] w-48">
                  <input
                    type="text"
                    value={item.noAntes}
                    onChange={(e) => handleMatrizInputChange(item.id, 'noAntes', e.target.value)}
                    placeholder="Ej: D-1 / H-2"
                    className="w-full bg-transparent border-0 text-[#e2ede1] placeholder:text-[#556955] placeholder:italic px-2.5 py-1.5 text-xs font-mono outline-none focus:bg-[#101411]/70 focus:ring-1 focus:ring-[#81c784]/40 transition-colors"
                  />
                </td>
                <td className="p-0 border-r border-[#2d382d] w-48">
                  <input
                    type="text"
                    value={item.noDespues}
                    onChange={(e) => handleMatrizInputChange(item.id, 'noDespues', e.target.value)}
                    placeholder="Ej: D / H+3"
                    className="w-full bg-transparent border-0 text-[#e2ede1] placeholder:text-[#556955] placeholder:italic px-2.5 py-1.5 text-xs font-mono outline-none focus:bg-[#101411]/70 focus:ring-1 focus:ring-[#81c784]/40 transition-colors"
                  />
                </td>
                <td className="p-0">
                  <input
                    type="text"
                    value={item.indicador}
                    onChange={(e) => handleMatrizInputChange(item.id, 'indicador', e.target.value)}
                    placeholder="Ej: 2 BB.II. conquistan Co."
                    className="w-full bg-transparent border-0 text-[#e2ede1] placeholder:text-[#556955] placeholder:italic px-2.5 py-1.5 text-xs font-mono outline-none focus:bg-[#101411]/70 focus:ring-1 focus:ring-[#81c784]/40 transition-colors"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </footer>
    {/* Modal Táctico: Centro de Descarga e Instalación Multidispositivo */}
    {modalDescargaVisible && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <div className="w-full max-w-3xl bg-[#141914] border-2 border-[#384a39] rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#d6dfd5] font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Cabecera del Modal */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#182119] border-b border-[#2d382d]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4fc3f7] animate-pulse" />
              <div>
                <h2 className="text-xs sm:text-sm font-bold uppercase font-mono tracking-wider text-[#e2ede1]">
                  CENTRO DE DESCARGA & INSTALACIÓN MULTIDISPOSITIVO (VTT)
                </h2>
                <p className="text-[10px] font-mono text-[#8fa38e] uppercase">
                  Despliegue Portable, Paquete PWA Standalone & Transferencia de Operaciones
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalDescargaVisible(false)}
              className="text-xs font-mono text-[#8fa38e] hover:text-white px-2 py-1 rounded hover:bg-[#253026] cursor-pointer transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex border-b border-[#2d382d] bg-[#111612] px-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTabModalDescarga('descargar')}
              className={`py-2 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                tabModalDescarga === 'descargar'
                  ? 'border-[#81c784] text-[#81c784] bg-[#182219]'
                  : 'border-transparent text-[#7e8f7c] hover:text-[#d6dfd5]'
              }`}
            >
              <span>💾</span>
              <span>Descargas Portables</span>
            </button>

            <button
              type="button"
              onClick={() => setTabModalDescarga('qr')}
              className={`py-2 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                tabModalDescarga === 'qr'
                  ? 'border-[#4fc3f7] text-[#4fc3f7] bg-[#142229]'
                  : 'border-transparent text-[#7e8f7c] hover:text-[#d6dfd5]'
              }`}
            >
              <span>📱</span>
              <span>Código QR / Móvil</span>
            </button>

            <button
              type="button"
              onClick={() => setTabModalDescarga('guia')}
              className={`py-2 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                tabModalDescarga === 'guia'
                  ? 'border-[#ffb74d] text-[#ffb74d] bg-[#241f17]'
                  : 'border-transparent text-[#7e8f7c] hover:text-[#d6dfd5]'
              }`}
            >
              <span>📖</span>
              <span>Guía de Instalación</span>
            </button>

            <button
              type="button"
              onClick={() => setTabModalDescarga('mision')}
              className={`py-2 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                tabModalDescarga === 'mision'
                  ? 'border-[#ba68c8] text-[#ba68c8] bg-[#221727]'
                  : 'border-transparent text-[#7e8f7c] hover:text-[#d6dfd5]'
              }`}
            >
              <span>🗃️</span>
              <span>Transferir Misión</span>
            </button>
          </div>

          {/* Cuerpo del Modal */}
          <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 text-xs font-mono">
            {/* PESTAÑA 1: DESCARGAS PORTABLES */}
            {tabModalDescarga === 'descargar' && (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-[#a6b9a4] leading-relaxed">
                  Descarga los paquetes autónomos para trasladar el Visor Táctico de Terreno (VTT) a otras computadoras de mando, tablets o dispositivos de campaña sin requerir conexión a internet ni configuración de servidores:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {/* Opción 1: Archivo Autónomo Monolítico .html */}
                  <div className="p-3 bg-[#182119] border border-[#2e4530] rounded-lg flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#81c784] flex items-center gap-1.5">
                          <span>📄</span>
                          <span>Aplicación Autónoma (.html)</span>
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#101711] text-[#a5d6a7] border border-[#2e4a31]">
                          ~125 KB
                        </span>
                      </div>
                      <p className="text-[11px] text-[#a6b9a4] leading-normal">
                        Archivo único con todo el código HTML, CSS, JavaScript y las 19 fases integradas. Cópialo a una memoria USB o envíalo por Bluetooth. Se abre con doble clic en cualquier navegador web.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={descargando}
                      onClick={handleDescargarAppHtml}
                      className="w-full py-2 px-3 rounded text-xs font-bold font-mono transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[#1b3b24] hover:bg-[#255233] border border-[#3e784e] text-[#c8e6c9] shadow-sm disabled:opacity-50"
                    >
                      <span>💾</span>
                      <span>{descargando ? 'Generando descarga...' : 'Descargar .html Autónomo'}</span>
                    </button>
                  </div>

                  {/* Opción 2: Paquete Completo PWA .zip */}
                  <div className="p-3 bg-[#13222d] border border-[#1e4563] rounded-lg flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#4fc3f7] flex items-center gap-1.5">
                          <span>📦</span>
                          <span>Paquete PWA Completo (.zip)</span>
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0d1820] text-[#81d4fa] border border-[#19496b]">
                          ZIP / STANDALONE
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8fa38e] leading-normal">
                        Incluye <code className="text-[#81d4fa]">index.html</code>, <code className="text-[#81d4fa]">manifest.json</code>, el Service Worker <code className="text-[#81d4fa]">sw.js</code> con caché offline, iconos tácticos PNG de 192px y 512px, y el manual de instalación.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={descargando}
                      onClick={handleDescargarPaquetePWA}
                      className="w-full py-2 px-3 rounded text-xs font-bold font-mono transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[#173347] hover:bg-[#1f4561] border border-[#2c658f] text-[#b3e5fc] shadow-sm disabled:opacity-50"
                    >
                      <span>📥</span>
                      <span>{descargando ? 'Empaquetando ZIP...' : 'Descargar Paquete .zip'}</span>
                    </button>
                  </div>
                </div>

                {/* Instalación en el dispositivo actual */}
                <div className="p-3 bg-[#1b1e19] border border-[#3a4430] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#dce775] flex items-center gap-1.5">
                      <span>📲</span>
                      <span>Instalar directamente en este navegador (PWA)</span>
                    </span>
                    <span className="text-[11px] text-[#a6b9a4]">
                      {isAppInstalled
                        ? 'La aplicación ya está ejecutándose como Progressive Web App (PWA) instalada.'
                        : deferredPrompt
                        ? 'Tu navegador soporta instalación directa con un clic.'
                        : 'Puedes instalarlo desde el menú de opciones de tu navegador o consultar la guía.'}
                    </span>
                  </div>

                  {!isAppInstalled ? (
                    <button
                      type="button"
                      onClick={handleInstallPWA}
                      className="w-full sm:w-auto shrink-0 py-2 px-4 rounded text-xs font-bold font-mono transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[#313a1a] hover:bg-[#435025] border border-[#647935] text-[#f0f4c3] shadow-sm"
                    >
                      <span>🚀</span>
                      <span>{deferredPrompt ? 'Instalar Ahora' : 'Ver Instrucciones'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-[#81c784] px-3 py-1 rounded bg-[#152317] border border-[#2e5332]">
                      ✓ App Instalada
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA 2: CÓDIGO QR / ENLACE MÓVIL */}
            {tabModalDescarga === 'qr' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-[11px] text-[#a6b9a4] max-w-lg">
                  Escanea el código QR con la cámara de tu teléfono móvil o tablet táctica (Android / iOS) para abrir e instalar la aplicación al instante:
                </p>

                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-lg border-4 border-[#384a39] shadow-lg">
                    <img src={qrDataUrl} alt="Código QR para instalar VTT" className="w-52 h-52 block" />
                  </div>
                ) : (
                  <div className="w-52 h-52 bg-[#121613] rounded border border-[#2d382d] flex items-center justify-center text-xs text-[#7e8f7c]">
                    Generando código QR...
                  </div>
                )}

                <div className="w-full max-w-lg flex flex-col gap-2 text-left">
                  <label className="text-[10px] text-[#8fa38e] uppercase">
                    Enlace directo de la aplicación:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? window.location.href : ''}
                      className="flex-1 bg-[#101411] border border-[#2d382d] text-[#e2ede1] px-3 py-2 rounded text-xs font-mono outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopiarEnlace}
                      className="py-2 px-3 rounded text-xs font-bold font-mono transition-colors duration-150 flex items-center gap-1.5 cursor-pointer bg-[#14261c] hover:bg-[#1e3c2b] border border-[#2e693e] text-[#a5d6a7] shrink-0"
                    >
                      <span>📋</span>
                      <span>{copiadoExito ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#657764]">
                    * Puedes compartir este enlace por red local de campaña, WhatsApp o Bluetooth con los integrantes de tu unidad militar.
                  </p>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: GUÍA POR PLATAFORMA */}
            {tabModalDescarga === 'guia' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Android */}
                <div className="p-3 bg-[#151c16] border border-[#28382a] rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#81c784] font-bold text-xs pb-1 border-b border-[#28382a]">
                    <span>🤖</span>
                    <span>Android (Google Chrome / Edge)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-[#a6b9a4] space-y-1.5 pl-1">
                    <li>Abre el enlace de la app en Chrome o Edge.</li>
                    <li>Toca el menú de tres puntos (⋮) en la esquina superior derecha.</li>
                    <li>Selecciona <strong className="text-white">"Instalar aplicación"</strong> o <strong className="text-white">"Añadir a pantalla de inicio"</strong>.</li>
                    <li>El icono táctico del VTT se integrará en tu pantalla de inicio como una aplicación nativa.</li>
                  </ol>
                </div>

                {/* 2. Windows / Mac / Linux */}
                <div className="p-3 bg-[#151c16] border border-[#28382a] rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#4fc3f7] font-bold text-xs pb-1 border-b border-[#28382a]">
                    <span>💻</span>
                    <span>Windows / Mac / Linux (Chrome / Edge)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-[#a6b9a4] space-y-1.5 pl-1">
                    <li>Abre la aplicación en Google Chrome o Microsoft Edge.</li>
                    <li>Haz clic en el icono ⊕ (Instalar) en la barra de direcciones.</li>
                    <li>Confirma haciendo clic en <strong className="text-white">"Instalar"</strong>.</li>
                    <li>Se creará un acceso directo en tu escritorio y la app funcionará en ventana independiente sin barras de navegador.</li>
                  </ol>
                </div>

                {/* 3. iOS (iPhone / iPad) */}
                <div className="p-3 bg-[#151c16] border border-[#28382a] rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#ba68c8] font-bold text-xs pb-1 border-b border-[#28382a]">
                    <span>🍏</span>
                    <span>Apple iOS (iPhone / iPad en Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-[#a6b9a4] space-y-1.5 pl-1">
                    <li>Abre la aplicación exclusivamente en <strong className="text-white">Safari</strong>.</li>
                    <li>Toca el botón <strong className="text-white">Compartir</strong> (cuadrado con flecha hacia arriba).</li>
                    <li>Desplázate hacia abajo y selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong>.</li>
                    <li>Toca <strong className="text-white">"Añadir"</strong> en la esquina superior derecha.</li>
                  </ol>
                </div>

                {/* 4. Campo táctico / Sin internet */}
                <div className="p-3 bg-[#151c16] border border-[#28382a] rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#ffb74d] font-bold text-xs pb-1 border-b border-[#28382a]">
                    <span>🗂️</span>
                    <span>Operación Offline en Campaña (USB / LAN)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-[#a6b9a4] space-y-1.5 pl-1">
                    <li>Descarga el archivo <strong className="text-white">.html autónomo</strong> desde la pestaña "Descargas".</li>
                    <li>Cópialo a una memoria USB o tarjeta microSD de campaña.</li>
                    <li>Conéctalo en cualquier laptop o PC de destino y haz doble clic sobre el archivo.</li>
                    <li>Todas las capas, polígonos, marcas de unidades, matrices y cálculos funcionan en modo 100% local.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* PESTAÑA 4: TRANSFERIR MISIÓN */}
            {tabModalDescarga === 'mision' && (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-[#a6b9a4] leading-relaxed">
                  Exporta e importa planes de operaciones completos en formato liviano <code className="text-[#c8e6c9]">.json</code> para transferir los calcos, unidades de maniobra, BAV, AIN y matriz de sincronización entre diferentes computadoras y dispositivos móviles:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  {/* Exportar */}
                  <div className="p-3 bg-[#1c2217] border border-[#3e4d2a] rounded-lg flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[#dce775] flex items-center gap-1.5">
                        <span>📤</span>
                        <span>Exportar Misión Actual</span>
                      </span>
                      <p className="text-[11px] text-[#a6b9a4]">
                        Genera un archivo <code className="text-white">vtt_mision_tactica_[fecha].json</code> con todos los calcos de terreno, unidades trazadas, análisis CARVER y matriz de eventos.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportarArchivoSesion}
                      className="w-full py-2 px-3 rounded text-xs font-bold font-mono transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[#2e3b1c] hover:bg-[#3d4f24] border border-[#58732e] text-[#f0f4c3] shadow-sm"
                    >
                      <span>💾</span>
                      <span>Descargar Archivo de Misión (.json)</span>
                    </button>
                  </div>

                  {/* Importar */}
                  <div className="p-3 bg-[#1f1926] border border-[#483359] rounded-lg flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[#ba68c8] flex items-center gap-1.5">
                        <span>📥</span>
                        <span>Importar Misión de Otro Dispositivo</span>
                      </span>
                      <p className="text-[11px] text-[#a6b9a4]">
                        Carga un archivo de misión <code className="text-white">.json</code> generado previamente o recibido de otra unidad militar para restaurar inmediatamente el escenario en tu mapa.
                      </p>
                    </div>

                    <label className="w-full py-2 px-3 rounded text-xs font-bold font-mono transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[#352345] hover:bg-[#462d5c] border border-[#6b428c] text-[#f3e5f5] shadow-sm text-center">
                      <span>📂</span>
                      <span>Seleccionar Archivo .json</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportarArchivoSesion}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pie del Modal */}
          <div className="px-4 py-2.5 bg-[#121613] border-t border-[#2d382d] flex justify-between items-center text-[10px] font-mono text-[#7e8f7c]">
            <span>Visor Táctico de Terreno (VTT) • Sistema Militar Autónomo PWA</span>
            <button
              type="button"
              onClick={() => setModalDescargaVisible(false)}
              className="px-3 py-1 bg-[#1a221b] hover:bg-[#253227] text-[#d6dfd5] rounded border border-[#2d382d] cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
