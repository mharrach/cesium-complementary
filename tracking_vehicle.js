// setting up the tileset
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNDkwZjJhOS1mMzk1LTQyNWQtODUxNS05MzIzMjczYjJiM2IiLCJpZCI6MzE4OTIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1OTYxMDMxNDZ9.VNubg4IInTepymHyJauFNquxJAUQ36wgFHttjWL7aec";

var viewer = new Cesium.Viewer("cesiumContainer", {
    shouldAnimate: true, // Enable animations
    terrainProvider: new Cesium.CesiumTerrainProvider({
        url: Cesium.IonResource.fromAssetId(1),
    }),
    //terrainProvider: Cesium.createWorldTerrain(),
});
viewer.scene.globe.depthTestAgainstTerrain = true;

var assetsList = [265710, 265727, 265780, 265463, 265290, 265395]; //there is a problem with asset number 265431 (Area_39)

for (let i = 0; i < assetsList.length; i++) {
    const asset = assetsList[i];
    var tileset = viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
            url: Cesium.IonResource.fromAssetId(asset),
            maximumScreenSpaceError: 1 //to prevent model from disappearing on zoom in/out (but doesn't work)
        })
    );
}

tileset.readyPromise.then(function() {
    viewer.zoomTo(tileset);
    // Apply the default style if it exists
    var extras = tileset.asset.extras;
    if (
        Cesium.defined(extras) &&
        Cesium.defined(extras.ion) &&
        Cesium.defined(extras.ion.defaultStyle)
    ) {
        tileset.style = new Cesium.Cesium3DTileStyle(extras.ion.defaultStyle);
    }
}).otherwise(function(error) {
    console.log(error);
});

// setting up the path and model
var scene = viewer.scene;
var clock = viewer.clock;
var coordinatesList = [];

/*var dataSourcePromise = Cesium.GeoJsonDataSource.load('Irisbus_path.geojson', {
    stroke: Cesium.Color.HOTPINK,
    fill: Cesium.Color.PINK,
    strokeWidth: 3,
    markerSymbol: '?',
    clampToGround: true
});

dataSourcePromise.then(function(dataSource) {
    viewer.dataSources.add(dataSource);
}).otherwise(function(error) {
    window.alert(error);
});*/

var xmlhttp = new XMLHttpRequest();
var url = "Irisbus_path.geojson";

xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        var geojson = JSON.parse(this.responseText);
        myFunction(geojson);
    }
};
xmlhttp.open("GET", url, true);
xmlhttp.send();

function myFunction(geojson) {
    var coordinates = geojson.features[0].geometry.coordinates[0];
    for (let i = 0; i < coordinates.length; i++) {
        const element = coordinates[i];
        coordinatesList.push(element[0], element[1], 0);
    }
    //Compute the entity position property.
    var position = computeBusPath(coordinatesList);

    //Actually create the entity
    var entity = viewer.entities.add({
        //Set the entity availability to the same interval as the simulation time.
        availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({
                start: start,
                stop: stop,
            }),
        ]),

        //Use our computed positions
        position: position,

        //Automatically compute orientation based on position movement.
        orientation: new Cesium.VelocityOrientationProperty(position),

        //Load the Cesium plane model to represent the entity
        model: {
            uri: "SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
            minimumPixelSize: 50,
            maximumPixelSize: 80
        },

        //Show the path as a yellow line sampled in 1 second increments.
        path: {
            resolution: 1,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.1,
                color: Cesium.Color.YELLOW,
            }),
            width: 10,
        },
        clampToGround: true
    });
    entity.position.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: Cesium.LinearApproximation,
    });

}

//Set bounds of our simulation time
var start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16));
var stop = Cesium.JulianDate.addSeconds(
    start,
    220,
    new Cesium.JulianDate()
);

//Make sure viewer is at the desired time.
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = stop.clone();
viewer.clock.currentTime = start.clone();
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
viewer.clock.multiplier = 5;

//Set timeline to simulation bounds
viewer.timeline.zoomTo(start, stop);

//Generate a random circular pattern with varying heights.
function computeBusPath(posList) {
    var property = new Cesium.SampledPositionProperty();
    // Query the terrain height of two Cartographic positions
    var terrainProvider = viewer.terrainProvider;
    var positions = [];
    var finalPositions = []
    for (let j = 0; j <= posList.length - 3; j += 3) {
        positions.push(Cesium.Cartographic.fromDegrees(posList[j], posList[j + 1]));
    }
    var promise = Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    Cesium.when(promise, function(updatedPositions) {
        // positions[0].height and positions[1].height have been updated.
        // updatedPositions is just a reference to positions.
        for (let k = 0; k < positions.length; k++) {
            const element = positions[k];
            finalPositions.push(Cesium.Cartographic.toCartesian(element));
        }
        for (var i = 0; i <= finalPositions.length; i++) {
            var time = Cesium.JulianDate.addSeconds(
                start,
                i + 45,
                new Cesium.JulianDate()
            );
            /*var position = Cesium.Cartesian3.fromDegrees(
                posList[i],
                posList[i + 1],
                posList[i + 2] + 50 // added 50 to prevent the vehicle from sinking under the terrain
            );*/
            var position = finalPositions[i];
            property.addSample(time, position);
        }
    });

    return property;
}