import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import mapboxGlDraw from '@mapbox/mapbox-gl-draw';

mapboxgl.accessToken = import.meta.env.VITE_TOKEN;

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-70.9);
  const [lat, setLat] = useState(42.35);
  const [zoom, setZoom] = useState(9);

  //set map and drawtool, async post
  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom
    });
    
    const draw = new mapboxGlDraw({
      displayControlsDefault: false,
      // Select which mapbox-gl-draw control buttons to add to the map.
      controls: {
      polygon: true,
      trash: true
      },
      // Set mapbox-gl-draw to draw by default.
      // The user does not have to click the polygon control button first.
      defaultMode: 'draw_polygon'
    });

    //async post polygon data on create event
    map.current.addControl(draw)

    const createArea = () => {
      const {id, geometry} = draw.getAll().features.at(-1);

      fetch('http://localhost:1337/api/polygons', {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({data: {
          uid: id,
          coordinate: geometry.coordinates[0],
          zoom: map.current.getZoom().toFixed()
        }})
      })
      .catch(e => console.log(e));
    }
    
    map.current.on('draw.create', createArea);
  }, []);

  //fetch data & setting polygons
  useEffect(() => {
    const setPolygons = data => () => {
      // Add a data source containing GeoJSON data.
      data.map(({attributes}) => {
        const {uid, coordinate} = attributes
        // console.log(uid, coordinate)
        map.current.addSource(uid, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [coordinate]
                }
            }
        });

        // Add a new layer to visualize the polygon.
        map.current.addLayer({
            'id': uid + 'square',
            'type': 'fill',
            'source': uid, // reference the data source
            'layout': {},
            'paint': {
                'fill-color': '#0080ff', // blue color fill
                'fill-opacity': 0.5
            }
        });
        // Add a black outline around the polygon.
        map.current.addLayer({
            'id': uid + 'outline',
            'type': 'line',
            'source': uid,
            'layout': {},
            'paint': {
                'line-color': '#000',
                'line-width': 3
            }
        });
      })
    }
    
    const fetchAndSet = async () => {
      const data = await fetch('http://localhost:1337/api/polygons')
      .then(res => res.json())
      .then(res => res.data)
      .catch(e => console.log(e))

      map.current.on('load', setPolygons(data))
      return data
    }
    const data = fetchAndSet()

    return () => map.current.off('load', setPolygons(data))
  }, [])

  return (
      <div ref={mapContainer} className="map-container" />
  );
}