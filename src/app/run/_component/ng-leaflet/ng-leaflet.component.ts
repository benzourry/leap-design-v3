import { Component, OnInit, AfterViewInit, OnDestroy, input, model, effect } from '@angular/core';
import * as L from 'leaflet';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';

const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = iconDefault;

const DEFAULT_DROPPIN_EVENT = 'dblclick';

@Component({
  selector: 'app-ng-leaflet',
  standalone: true,
  imports: [],
  templateUrl: './ng-leaflet.component.html',
  styleUrls: ['./ng-leaflet.component.scss']
})
export class NgLeafletComponent implements OnInit, AfterViewInit, OnDestroy {

  private map!: L.Map;

  mapIcon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
  });

  marker: L.Marker[] = [];
  
  screen = input<any>();
  readOnly = input<boolean>(true);
  multiple = input<boolean>(true);
  timestamp = input<number>(0);
  baseMapServerUri = input<string>('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  icon = input<string>('');

  value = model<any>(); // if single {latitude, longitude, title} if multiple [{latitude, longitude, title}]

  randId: string;

  useCurrentPos = input<boolean>(true);
  dropPinOn = input<string>(DEFAULT_DROPPIN_EVENT);

  layer: L.LayerGroup | null = null;
  markerMap: Record<number, L.Marker> = {};

  customPopup = (content: string) => `<div class="info_content">${content}</div>`;
  customOptions: L.PopupOptions = { maxWidth: 500, className: 'custom' };

  constructor() {
    // Generate a cleaner ID without decimals
    this.randId = Math.random().toString(36).substring(2, 9);
    
    effect(() => {
      this.timestamp(); // Tracks timestamp changes
      if (this.map) {
        this.createMarker();
        if (this.screen()) {
          this.centerMapNew();
        }
      }
    });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.initializeMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove(); // CRITICAL: Prevents memory leaks when component is destroyed
    }
  }

  private initializeMap() {
    const baseMapURl = this.baseMapServerUri() || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    this.map = L.map('map-' + this.randId, { zoomControl: false });
    L.tileLayer(baseMapURl).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    if (this.value()) {
      this.createMarker();
      this.centerMapNew();
    } else {
      if (this.useCurrentPos() && navigator.geolocation) {
        const options = { enableHighAccuracy: true };

        // Empty dummy call to wake up mobile GPS sensors faster
        navigator.geolocation.getCurrentPosition(() => {}, () => {}, {});

        navigator.geolocation.getCurrentPosition((position) => {
          const loc_lat = position.coords.latitude;
          const loc_long = position.coords.longitude;

          if (!this.value()) { 
            const v = this.multiple() 
              ? [{ latitude: loc_lat, longitude: loc_long }] 
              : { latitude: loc_lat, longitude: loc_long };
            
            this.value.set(v);
            this.createMarker();
            this.centerMapNew();
          }
        }, (error_message) => {
          console.error('An error has occurred while retrieving location', error_message);
        }, options);
      } else {
        const v = this.multiple() 
          ? [{ latitude: 1.553110, longitude: 110.345032 }] 
          : { latitude: 1.553110, longitude: 110.345032 };
        
        this.value.set(v);
        this.createMarker();
        this.centerMapNew();
      }
    }

    if (!this.readOnly()) {
      const eventName = this.dropPinOn() ?? DEFAULT_DROPPIN_EVENT;
      this.map.on(eventName as any, (e: L.LeafletMouseEvent) => {
        if (this.multiple()) {
          if (!this.value()) this.value.set([]);
          this.value.update((v: any[]) => {
            // Return new array reference so Signal correctly detects changes
            return [...v, { latitude: e.latlng.lat, longitude: e.latlng.lng }];
          });
        } else {
          this.value.set({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        }
        this.createMarker();
      });
    }
  }

  public createMarker() {
    const newLayer = L.layerGroup().addTo(this.map);
    this.markerMap = {}; // CRITICAL: Reset marker map so deleted markers are forgotten

    const val = this.value();

    if (this.multiple() && Array.isArray(val)) {
      val.forEach((v, index) => {
        let icon = this.mapIcon;
        if (v.marker) {
          icon = L.icon({
            iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(v.marker),
            iconAnchor: [30, 30]	
          });	
        }
        
        const marker = L.marker([v.latitude, v.longitude], { icon });
        
        if (!this.readOnly()) {
          marker.on("click", () => this.removeMarker(index)).addTo(newLayer);
        } else {
          marker.bindPopup(this.customPopup(v.title || ''), this.customOptions).addTo(newLayer);
        }
        
        this.markerMap[index] = marker;
      });
    } else if (!this.multiple() && val) {
      const marker = L.marker([val.latitude, val.longitude], { icon: this.mapIcon });
      
      if (!this.readOnly()) {
        marker.on("click", () => this.removeMarker(0)).addTo(newLayer);
      } else {
        marker.bindPopup(this.customPopup(val.title || ''), this.customOptions).addTo(newLayer);
      }
      
      this.markerMap[0] = marker;
    }

    // Clean up previous layer
    if (this.layer) {
      this.layer.removeFrom(this.map);
    }
    this.layer = newLayer;
  }

  private centerMapNew() {
    const markerValues = Object.values(this.markerMap);
    if (markerValues.length > 0) {
      const bounds = L.latLngBounds(markerValues.map(m => m.getLatLng()));
      this.map.fitBounds(bounds, { maxZoom: 16 }); // Added maxZoom to prevent absurd zooms on single markers
    }
  }

  private removeMarker($index: number) {
    if (this.multiple()) {
      this.value.update((value: any[]) => {
        if (!Array.isArray(value)) return value;
        const newArr = [...value]; // Avoid mutating existing signal data directly
        newArr.splice($index, 1);
        return newArr;
      });
    } else {
      this.value.set(null);
    }
    this.createMarker();
  }
}