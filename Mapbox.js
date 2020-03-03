import React, { Component } from 'react';
import mapboxgl from "mapbox-gl";
import Event from './Event';

const helper = require('../common/helper');

var map;
var counter = 0;

export class Mapbox extends Component{

    constructor(props) {
        super(props);
        this.state = {
            timer: null,
            map: null, 
            data: null,
            line: null,
            lng: -122.404290,
            lat:  37.789100,
            zoom: 15,
            device_id: 'e00fce68850fba8f7677cb9b'
        }
        this.fetchData = this.fetchData.bind(this);
        //this.makeFeature = this.makeFeature.bind(this);
        //this.makeFeatureCollection = this.makeFeatureCollection.bind(this);
        this.makeLineFeature = this.makeLineFeature.bind(this);
    }

    /**
     * Get data from the db and massage
     */   
    async fetchData(){
        let events = null;
        clearInterval(this.state.timer);
        let timer = setInterval(async() => { // update data every period
            events = await Event.findPosition(this.state.device_id);
            console.log(events);
            if(events && events.length > 0){ 
                const adjustedData = helper.addCreatedTimeAsProperty(events);            
                //const featureCollection = this.makeFeatureCollection(adjustedData);
                const data = this.makeLineFeature(adjustedData);
                this.setState({timer: timer, data: data});
            }
        }, 3000);
    }

    /**
     * Take an array of coords and create geojson for a line
     * @param {array} coords 
     */
    makeLineFeature(coords){
        let newCoords = [];
        coords.forEach(coord => {
            const newCoord  = [coord.longitude, coord.latitude];
            newCoords.push(newCoord);
        });
        let feature = {
            "type": "Feature",
            "properties": {
                'color': '#F7455D' // red
            },
            "geometry": {
                "type": "LineString",
                "coordinates": 
                   newCoords
            }
        }
        return feature;
    }

    /**
     * Take a lng,lat array and make into a feature
     * @param {*} lng 
     * @param {*} lat 
     */
    makeFeature(lng, lat){                
        let feature = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Point",
                "coordinates": [
                    lng,
                    lat
                ]
            }
        }
        return feature;
    }

    /**
     * Take an array of coords and make into a featureCollection
     * @param {*} coords 
     */
    makeFeatureCollection(coords){
        let features = [];
        coords.forEach(coord => {
            const feature  = this.makeFeature(coord.longitude, coord.latitude);
            features.push(feature);
        });
        let featureCollection =  {
            "type": "FeatureCollection",
            "features": features
        }
        return featureCollection;
    }

    /**
     * React component mounted event
     */
    async componentDidMount() {
        counter=0;
        await this.fetchData();
        
        map =  await new mapboxgl.Map({
            container: this.mapContainer,
            style: 'mapbox://styles/mapbox/satellite-v9',
            accessToken: 'pk.eyJ1Ijoib2Rkd2lyZXMiLCJhIjoiY2s1aWg4aDgzMDB5YjNtbmpsY3NhdzZiMyJ9.rYJaBbdXgDco2Vgm2N2Rnw',
            center: [this.state.lng, this.state.lat], // default center
            zoom: this.state.zoom
        });

        await map.on('load', () => {                     
            map.addSource('points', {
                "type": "geojson",
                "data": this.state.data
            });
            map.addLayer({
                'id': 'initial',
                'type': 'line',
                'source': 'points',
                // doesn't do anything right now
                'paint': {
                    'line-width': 3,
                    // Use a get expression (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-get)
                    // to set the line-color to a feature property value.
                    'line-color': ['get', 'color'] 
                }  
            }) 
        });                    
    }

    /**
     * React component updated event
     * @param {object} prevProps 
     */
    async componentDidUpdate(prevProps){
        counter++;
        // var deviceChanged = false;
        // if(prevProps.device_id !== this.props.device_id){
        //     deviceChanged = true;
        //     await this.fetchData();
        //     this.setState({device_id: this.props.device_id});  
        // }

        if(map !== undefined && map.loaded() && this.state.data !== null && this.state.data.geometry.coordinates.length !== 0 /*&& this.state.data.features.length != 0*/){
            map.getSource('points').setData(this.state.data); 
            if (counter < 4 /*|| deviceChanged*/){
                var coordinates =  this.state.data.geometry.coordinates;
                var bounds = coordinates.reduce(function(bounds, coord) {
                    return bounds.extend(coord);
                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                map.flyTo({ 
                    center: {lng: this.state.data.geometry.coordinates[0][0], 
                             lat: this.state.data.geometry.coordinates[0][1]}, 
                    zoom: 23, bearing: 45, speed: 0.1, curve: 1.42, essential: true });
                map.fitBounds(bounds, {
                    padding: 280
                });    
            }
            else{
                map.flyTo({lng: this.state.data.geometry.coordinates[0][0], lat: this.state.data.geometry.coordinates[0][1]});
            }    
        }
        else if(map !== undefined){
            if (counter >4)
                // default location
                map.flyTo({ center: {lng: this.state.lng, lat: this.state.lat}, zoom: 10, bearing: 45, speed: 0.2, curve: 1.42, essential: true });
        }
    }

    /**
     * React component will unmount event
     */
    componentWillUnmount() {
        if(this.map)
            this.map.remove();
        clearInterval(this.state.timer);    
    }

    /**
     * React render event
     */
    render(){

        return(
            <div style={{height: '600px', width: '100%'}} id='map' ref={el => this.mapContainer = el} className="absolute top right left bottom" />
        )
    }
}
