// setting up the tileset
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNDkwZjJhOS1mMzk1LTQyNWQtODUxNS05MzIzMjczYjJiM2IiLCJpZCI6MzE4OTIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1OTYxMDMxNDZ9.VNubg4IInTepymHyJauFNquxJAUQ36wgFHttjWL7aec";

var viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: new Cesium.CesiumTerrainProvider({
        url: Cesium.IonResource.fromAssetId(1),
    }),
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

var entity;
var positionProperty = [];

var dataSourcePromise = Cesium.GeoJsonDataSource.load('Irisbus_path.geojson', {
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
});

function createModel(url, height) {

    var position = Cesium.Cartesian3.fromDegrees(126.8882616,
        37.5797226,
        height
    );
    var heading = Cesium.Math.toRadians(220);
    var pitch = 0;
    var roll = 0;
    var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(
        position,
        hpr
    );

    entity = viewer.entities.add({
        name: url,
        position: position,
        orientation: orientation,
        model: {
            uri: url,
            minimumPixelSize: 80,
            maximumScale: 100,
        },
    });
    //viewer.trackedEntity = entity;
}

createModel("SampleData/models/GroundVehicle/GroundVehicle.glb", 3.5);

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
        positionProperty.push(Cesium.Cartesian3.fromDegrees(element[0], element[1], 0));
    }
}

if (scene.clampToHeightSupported) {
    tileset.initialTilesLoaded.addEventListener(start);
} else {
    window.alert("This browser does not support clampToHeight.");
}

function start() {
    clock.shouldAnimate = true;
    var objectsToExclude = [entity];
    scene.postRender.addEventListener(function() {
        /*for (let j = 0; j < positionProperty.length; j++) {
            const position = positionProperty[j];
            entity.position = scene.clampToHeight(position, objectsToExclude);
        }*/
        //var position = positionProperty.getValue(clock.currentTime);
        //entity.position = scene.clampToHeight(position, objectsToExclude);
    });
}