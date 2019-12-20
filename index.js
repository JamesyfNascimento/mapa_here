
//Passo 1: inicializar a comunicação com a plataforma
const APPLICATION_ID = '9IKWJvPCOqrJuARuXL9R', APPLICATION_CODE = 'HhuCO_32ROfaqdbGPjD4cA';
const AUTOCOMPLETION_URL = 'https://autocomplete.geocoder.api.here.com/6.2/suggest.json',
    ajaxRequest = new XMLHttpRequest(),
    query = '';

var platform = new H.service.Platform({
    'apikey': 'SF1615FZRvSWQoUFOdjJ'
  });
// localização porto alegre
var portoAlegre = { lat: -30.055601, lng: -51.154826 };


const geocoderService = platform.getGeocodingService();
// const search = new H.places.Search(platform.getPlacesService());
const routerService = platform.getRoutingService();
const origin = new H.map.Group();
origin.id = "origin_id";
const destination = new H.map.Group();
destination.id = "destination_id";

const defaultLayers = platform.createDefaultLayers();

const map = new H.Map(
    document.getElementById("map"),
    defaultLayers.vector.normal.map,
    {
        zoom : 10,
        center : portoAlegre
    }
);

const mapEvents = new H.mapevents.MapEvents(map);
const behavior = new H.mapevents.Behavior(mapEvents);

// Zoom, escala, tipo do mapa ...
var ui = H.ui.UI.createDefault(map, defaultLayers, 'pt-BR');
var mapSettings = ui.getControl('mapsettings');
var zoom = ui.getControl('zoom');
var scalebar = ui.getControl('scalebar');

mapSettings.setAlignment('top-left');
zoom.setAlignment('top-left');
scalebar.setAlignment('top-left');




// Anexe os ouvintes de evento ao objeto XMLHttpRequest
ajaxRequest.addEventListener("load", onAutoCompleteSuccess);
ajaxRequest.addEventListener("error", onAutoCompleteFailed);
ajaxRequest.responseType = "json";

/**
 * Se a pesquisa mudou e não for fazio,
 * envia uma request geocode auto-completion para o servidor.
 *
 * @param {Object} textBox Texto da pesquisa
 * @param {Object} event o evento DOM que disparou esse ouvinte
 */
async function autoComplete(textBox,seletor,event) {

    if (query != textBox) {
        if (textBox.length >= 1) {

            /**
            * parametros da request
            *
            */ 
            var params = '?' +
                'query=' + encodeURIComponent(textBox) +   // O texto de pesquisa que é a base da consulta
                '&beginHighlight=' + encodeURIComponent('<mark>') + //  Marque o início da partida em um token. 
                '&endHighlight=' + encodeURIComponent('</mark>') + // Marque o final da partida em um token. 
                '&maxresults=10' +  // O limite superior para o número de sugestões a serem incluídas.
                '&app_id=' + APPLICATION_ID +
                '&app_code=' + APPLICATION_CODE +
                '&seletor=' + seletor;
            ajaxRequest.open('GET', AUTOCOMPLETION_URL + params);
            ajaxRequest.send();
        }
    }
    // query = textBox;
}


/**
 *  Este é o ouvinte de eventos que processa a resposta XMLHttpRequest retornada do servidor autoCompleteListener().
 */
function onAutoCompleteSuccess() {
    let url = this.responseURL.split("&");
    let parans = url[url.length - 1];
    parans = parans.split("=");
    let seletor = parans[1];
    console.log(seletor);
    buildSugestion(this.response, seletor);
}

/**
 * Esta função será chamada se ocorrer um erro de comunicação durante o XMLHttpRequest
 */
function onAutoCompleteFailed() {
    alert('Ooops! deu ruím');
}

async function buildSugestion(data, seletor){
    let options = "<option value='' selected> Selecione uma localização</option>";
    $.each( data.suggestions, function( i, l ){
        console.log(l)
        let label = l.address.street + ", " + l.address.city + ", " + l.address.district + ", " + l.address.state + ", " + l.address.country + ", " + l.address.postalCode;
        let LocationId = l.locationId;
        options += "<option value='' data-Locationid='" + LocationId + "'>" + label + "</option>";
    });  
    $(seletor).html(options); 
};


const geocoder = locationId => {
    return new Promise((resolve, reject) => {
        geocoderService.geocode(
            {
                locationId : locationId,
                maxresults: 5
            },
            success => {
                resolve(success.Response);
            },
            error => {
                reject(error);
            }
        );
    })
}

const reverseGeocode = coords => {
    return new Promise((resolve, reject) => {
        geocoderService.reverseGeocode(
            {
                prox: coords.Latitude + "," + coords.Longitude,
                mode: "retrieveAddresses",
                maxresults: 1
            },
            success => {
                resolve(success);
            },
            error => {
                reject(error);
            }
        )
    })
}

// const places = (query, coords, radius) =>{
//     return new Promise((resolve, reject) => {
//         search.request(
//             {
//                 q: query,
//                 in: coords.Latitude + "," + coords.Longitude + ";r=" + radius
//             },
//             {},
//             success => {
//                 resolve(success.results.items);
//             },
//             error => {
//                 reject(error);
//             }
//         )
//     });
// }

const calculateRoute  = (start, finish) => {
    return new Promise((resolve, reject) => {
        const params = {
            mode: "fastest;car;traffic:enabled",
            waypoint0: start.Latitude + "," + start.Longitude,
            waypoint1: finish.Latitude + "," + finish.Longitude,
            representation: "display",
            maneuverattributes: 'direction,action',
            routeAttributes: "waypoints,summary,shape,legs"
        };
        routerService.calculateRoute(params, success => {
            resolve(success.response);
        }, error => {
            reject(error);
        });
    })
};

const calculateIsoline = (start, range) => {
    return new Promise((resolve, reject) => {
        const params = {
            start: start.Latitude + "," + start.Longitude,
            mode: "fastest;car;traffic:enabled",
            departure: "now",
            rangeType: "time",
            range: range
        };
        routerService.calculateIsoline(params, success => {
            resolve(success.response.isoline[0].component[0].shape);
        },
        error => {
            reject(error);
        });
    });
};


$(document).ready(function() {
    $('#origin').on('keyup', async function() {
        autoComplete($(this).val(), ".selectOrigin");
    });

    $('.selectOrigin').on('change', async function() {
        origin.removeAll();
        let locationId = $(this).children("option:selected").data('locationid');
        
        geocoder(locationId).then((data) => {
            let positionOrigin = data.View[0].Result[0].Location.DisplayPosition;
            $(this).children("option:selected").attr('data-latitude', positionOrigin.Latitude);
            $(this).children("option:selected").attr('data-longitude', positionOrigin.Longitude);
            map.setCenter({lat:positionOrigin.Latitude, lng:positionOrigin.Longitude});
            var parisPngIcon = new H.map.Icon("https://cdn3.iconfinder.com/data/icons/tourism/eiffel200.png", {size: {w: 56, h: 56}});
            // icone do market
            var iconOriginMarker = new H.map.Icon("./icon-marker-origin.png", {size: {w: 40, h: 40}});
      
            const originMarker = new H.map.Marker(
                { 
                    lat: positionOrigin.Latitude, 
                    lng: positionOrigin.Longitude 
                },{
                    icon: iconOriginMarker
                }
                
            );
            originMarker.addEventListener("tap", event => {
                console.log(event.target.getPosition());
            });
            originMarker.id = "originMarker_id"
            const raioOrigin = new H.map.Circle(
                {lat:positionOrigin.Latitude, lng:positionOrigin.Longitude},
                1000,
                {
                  style: {
                    strokeColor: 'rgba(55, 85, 170, 0.6)', // Color of the perimeter
                    lineWidth: 2,
                    fillColor: 'rgba(0, 128, 0, 0.7)'  // Color of the circle
                  }
                }
              )
            raioOrigin.id = "radioOrigin_id";
            origin.addObjects([originMarker, raioOrigin]);
            map.addObjects([
                origin
            ]);

            map.setViewBounds(origin.getBounds());
            map.setZoom(14);

            console.log(origin.getObjects())
            console.log(destination.getObjects())

        })
    });
    

   $('#destino').on('keyup', async function() {
        autoComplete($(this).val(), ".selectDestino");
    });

    $('.selectDestino').on('change', async function() {
        destination.removeAll();
        removeObjectById("routeLine_id");
        let locationId = $(this).children("option:selected").data('locationid');
        geocoder(locationId).then((data) => {
            let positionDestiny = data.View[0].Result[0].Location.DisplayPosition;
            console.log(positionDestiny);
            $(this).children("option:selected").attr('data-latitude', positionDestiny.Latitude);
            $(this).children("option:selected").attr('data-longitude', positionDestiny.Longitude);
            let latitudeOrigin = $('.selectOrigin').children("option:selected").data('latitude');
            let longitudeOrigin = $('.selectOrigin').children("option:selected").data('longitude');
            let positionOrigin = { Latitude: latitudeOrigin, Longitude: longitudeOrigin };

            var iconDestinyMarker = new H.map.Icon("./icon-marker-destiny.png", {size: {w: 40, h: 40}});

            const destinyMarker = new H.map.Marker(
                { 
                    lat: positionDestiny.Latitude, 
                    lng: positionDestiny.Longitude 
                }, {
                    icon : iconDestinyMarker
                }
            );
            destinyMarker.addEventListener("tap", event => {
                console.log(event.target.getPosition());
            });
            destinyMarker.id = "destinyMarker_id";
            const destinyRadius = new H.map.Circle(
                {lat:positionDestiny.Latitude, lng:positionDestiny.Longitude},
                1000,
                {
                style: {
                    strokeColor: 'rgba(55, 85, 170, 0.6)', // Color of the perimeter
                    lineWidth: 2,
                    fillColor: 'rgba(0, 128, 0, 0.7)'  // Color of the circle
                }
                }
            )
            destinyRadius.id = "destinyRadius.id";

            destination.addObjects([destinyMarker, destinyRadius]);
            map.addObjects([
                destination
            ]);

            calculateRoute(positionOrigin, positionDestiny).then((data) => {
                console.log(data);
                data = data.route[0].shape
                const originToDestinationLineString = new H.geo.LineString();
                data.forEach(points => {
                    let parts = points.split(",");
                    originToDestinationLineString.pushPoint({
                        lat: parts[0],
                        lng: parts[1]
                    })
                });
        
                const routeLine = new H.map.Polyline(
                    originToDestinationLineString,
                    {
                        style: {
                            strokeColor: 'red',
                            lineWidth: 5
                        }
                    }
                );
                routeLine.id = "routeLine_id"
                map.addObject(routeLine);
                map.getViewModel().setLookAtData({bounds: routeLine.getBoundingBox()});
                
            });

            // ajuste no zoom 
            // $.each(origin.getObjects(), function( i, o ){
            //     $.each(destination.getObjects(), function( j, d ){
            //         if((i % 2 == 0 && j % 2 == 0)){
            //             let distance = o.getPosition().distance(d.getPosition());
            //             if(distance/1000 < 100){
            //               map.setZoom(8);  
            //             }else{
            //                 map.setZoom(4);  
            //             }
            //             console.log("Distancia :");
            //             console.log(distance/1000);
            //         }
            //     });
            // });
        })

    });
});

function removeObjectById(id){
    for (object of map.getObjects()){
        if (object.id===id){
            map.removeObject(object);
        }
    }
}
