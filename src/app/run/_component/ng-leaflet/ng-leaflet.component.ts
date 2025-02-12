import { Component, OnInit, AfterViewInit, input, model, effect } from '@angular/core';
import * as L from 'leaflet';
// import { RunService } from 'src/app/service/run.service';


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
    imports: [],
    templateUrl: './ng-leaflet.component.html',
    styleUrls: ['./ng-leaflet.component.scss']
})
export class NgLeafletComponent implements OnInit, AfterViewInit {

  private map!: L.Map

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

  marker: L.Marker[] = []; // for multiple
  // marker: L.Marker = L.marker(); // for single

  // entryList = input<any[]>();
  screen = input<any>();
  readOnly = input<boolean>(true);
  multiple = input<boolean>(true);
  timestamp = input<number>(0);
  baseMapServerUri = input<string>('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  icon = input<string>('');

  value = model<any>(); // if single {lat,lang,text} if multiple [{lat,lang,text}]

  randId: number;

  useCurrentPos = input<boolean>(true);

  dropPinOn = input<string>(DEFAULT_DROPPIN_EVENT);

  constructor() {
    this.randId = Math.random();
    effect(() => {
      this.timestamp();
      if (this.map) {
        this.createMarker();
        if (this.screen()){
          this.centerMapNew();
        }
      }
    })
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.initializeMap();
    // this.showMarkers();
    // this.centerMap();
  }

  // removeMarker($index){
  //   this.value.update(value=>{
  //     delete value[$index];
  //     return value;
  //   })
  //   delete this.markers[$index];
  //   this.showMarkers();
  // }



  private initializeMap() {

    const baseMapURl = this.baseMapServerUri()||'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    // const baseMapURl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    this.map = L.map('map-' + this.randId, {zoomControl: false});
    L.tileLayer(baseMapURl).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // if (this.icon()){
    //   this.mapIcon = L.icon({
    //     iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(this.icon()),
    //     iconAnchor: [30,30]	
    //   });		
    // }

    // if entryList is provided
    // if (this.entryList()){
    //   this.entryList()?.forEach(entry=>{
    //     let data = entry.data;
    //     if (data[this.screen().data?.lat] && data[this.screen().data?.lng]){
    //       this.addMarker(data[this.screen().data?.lat], data[this.screen().data?.lng], data[this.screen().data?.title]);
    //     }
    //   })
    //   this.showMarkers();      
    // }

    if (this.value()) {
      this.createMarker();
      this.centerMapNew();
    } else {
      if (this.useCurrentPos()) {
        if (navigator.geolocation) {

          var options = {
            enableHighAccuracy: true
          };

          navigator.geolocation.getCurrentPosition(function () { }, function () { }, {});

          navigator.geolocation.getCurrentPosition((position) => {
            var loc_lat = position.coords.latitude;
            var loc_long = position.coords.longitude;

            if (!this.value()){ // if still no value after retrieve gps, then set value.
              let v = this.multiple() ? [{
                latitude: loc_lat,
                longitude: loc_long
              }] : {
                latitude: loc_lat,
                longitude: loc_long
              };
              this.value.set(v);

              this.createMarker();
              this.centerMapNew();
            }

          }, (error_message) => {
            console.error('An error has occured while retrieving location', error_message)
          }, options);
        } else {
          console.error('not supported');
        }
      }else{
        let v = this.multiple() ? [{
          latitude: 1.553110,
          longitude: 110.345032
        }] : {
          latitude: 1.553110,
          longitude: 110.345032
        };
        console.log("no value no curr pos")
        this.value.set(v);
        this.createMarker();
        this.centerMapNew();
      }
    }

    // utk remove action bila klik marker
    if (!this.readOnly()) {
      if (this.multiple()) {
        this.map.on(this.dropPinOn()??DEFAULT_DROPPIN_EVENT, e => {
          if (!this.value()) this.value.set([]);
          this.value.update(v => {
            v.push({
              latitude: e.latlng.lat,
              longitude: e.latlng.lng
            })
            return v;
          })
          this.createMarker();
        })
      } else {
        this.map.on(this.dropPinOn()??DEFAULT_DROPPIN_EVENT, e => {
          this.value.set({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          })
          this.createMarker();
        })
      }
    }
  }

  customPopup = (content) => '<div class="info_content">' + content + '</div>';
  customOptions ={'maxWidth': '500','className' : 'custom'}	

  layer: any;
  markerMap: any = {}
  public createMarker() {

    let newLayer = L.layerGroup().addTo(this.map);

    if (this.multiple()) {
      this.value()?.forEach((v, index) => {
        let icon = null;
        if (v.marker){
          icon = L.icon({
              iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(v.marker),
              // iconSize: [25, 41],
    // iconAnchor: [12, 41],
    // popupAnchor: [1, -34],
    // tooltipAnchor: [16, -28],
    // shadowSize: [41, 41],
              iconAnchor: [30,30]	
            });	
        }
        var marker = L.marker([v.latitude, v.longitude], {icon: icon??this.mapIcon});
        if (!this.readOnly()) {
          marker.on("click", m => this.removeMarker(index))
            .addTo(newLayer)
        }else{
          marker
            .bindPopup(this.customPopup(v.title+""), this.customOptions)
            .addTo(newLayer)
        }
        this.markerMap[index] = marker;
      })
    } else {
      if (this.value()) {
        var marker = L.marker([this.value().latitude, this.value().longitude], {icon: this.mapIcon});
        if (!this.readOnly()) {
          marker.on("click", m => this.removeMarker(0))
            .addTo(newLayer)
        }else{
          marker
            .bindPopup(this.customPopup(this.value().title+""), this.customOptions)
            .addTo(newLayer)
        }
        this.markerMap[0] = marker;
      }
    }

    // newLayer.addTo(this.map);

    if (this.layer) {
      this.layer.removeFrom(this.map);
    }

    this.layer = newLayer;

  }


  private centerMapNew() {
    // console.log(this.markers.length>0,this.marker!=null);
    if (Object.keys(this.markerMap).length > 0) {
      // let list = this.multiple()?this.markers:[this.marker];

      // Create a LatLngBounds object to encompass all the marker locations
      const bounds = L.latLngBounds(Object.values(this.markerMap).map((m: any) => m.getLatLng()));

      // Fit the map view to the bounds
      this.map.fitBounds(bounds);
    }
  }

  private removeMarker($index) {
    if (this.multiple()) {
      this.value.update(value => {
        value.splice($index, 1);
        return value;
      })
    } else {
      this.value.update(value => null);
    }

    this.createMarker();
  }

}
