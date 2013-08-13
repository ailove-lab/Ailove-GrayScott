
/* 
 * Gray-Scott
 *
 * A solver of the Gray-Scott model of reaction diffusion.
 *
 * ©2012 pmneila.
 * p.mneila at upm.es
 */

(function(){

var encoder;
var currentFrame;
var recording;

var marching;
var mcCamera;
var mcScene;
var mcRenderer;
var mcCanvas;
var mcLayer;

// Canvas.
var canvas;
var simulation;
var resolution   = 64;
var canvasWidth  = resolution;
var canvasHeight = resolution;

var mMouseX, mMouseY;
var mMouseDown = false;

var mRenderer;
var mScene;
var mCamera;
var mUniforms;
var mColors;
var mColorsNeedUpdate = true;
var mLastTime = 0;

var mTexture1, mTexture2, mPattern;
var mGSMaterial, mScreenMaterial;
var mScreenQuad;

var mToggled = false;

var mMinusOnes = new THREE.Vector2(-1, -1);

// Some presets.
var presets = [
    { // Default
        //feed: 0.018,
        //kill: 0.051
        feed: 0.037,
        kill: 0.06
    },
    { // Solitons
        feed: 0.03,
        kill: 0.062
    },
    { // Pulsating solitons
        feed: 0.025,
        kill: 0.06
    },
    { // Worms.
        feed: 0.078,
        kill: 0.061
    },
    { // Mazes
        feed: 0.029,
        kill: 0.057
    },
    { // Holes
        feed: 0.039,
        kill: 0.058
    },
    { // Chaos
        feed: 0.026,
        kill: 0.051
    },
    { // Moving spots.
        feed: 0.014,
        kill: 0.054
    },
    { // Spots and loops.
        feed: 0.018,
        kill: 0.051
    },
    { // Waves
        feed: 0.014,
        kill: 0.045
    },
    { // The U-Skate World
        feed: 0.062,
        kill: 0.06093
    }
];

// Configuration.
var feed = presets[0].feed;
var kill = presets[0].kill;

init = function()
{
    init_controls();
    init_marching();
    
    recording = false;

    canvas = document.getElementById("myCanvas");

    // Fix a bug in the mouse behavior in Firefox.
    simulation = document.getElementById("simulation");

    mPattern = THREE.ImageUtils.loadTexture("pattern.png");
    mPattern.wrapS = THREE.RepeatWrapping;
    mPattern.wrapT = THREE.RepeatWrapping;
    
    canvas.onmousedown = onMouseDown;
    canvas.onmouseup   = onMouseUp;
    canvas.onmousemove = onMouseMove;
    
    mRenderer = new THREE.WebGLRenderer({canvas: canvas, preserveDrawingBuffer: true});
    mRenderer.setSize(canvasWidth, canvasHeight);
    
    mScene = new THREE.Scene();
    mCamera = new THREE.OrthographicCamera(canvasWidth/-2, canvasWidth/2, canvasHeight/2, canvasHeight/-2, -10000, 10000);
    mCamera.position.z = 100;
    mScene.add(mCamera);
    
    mTexture1 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
                        {minFilter: THREE.LinearFilter,
                         magFilter: THREE.LinearFilter,
                         format: THREE.RGBFormat,
                         type: THREE.FloatType});
    
    mTexture2 = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight,
                        {minFilter: THREE.LinearFilter,
                         magFilter: THREE.LinearFilter,
                         format   : THREE.RGBFormat,
                         type     : THREE.FloatType});
    
    mTexture1.wrapS = THREE.RepeatWrapping;
    mTexture1.wrapT = THREE.RepeatWrapping;
    mTexture2.wrapS = THREE.RepeatWrapping;
    mTexture2.wrapT = THREE.RepeatWrapping;
    
    mUniforms = {
        screenWidth:  {type: "f" , value: canvasWidth },
        screenHeight: {type: "f" , value: canvasHeight},
        tSource:      {type: "t" , value: mTexture1 },
        tPattern:     {type: "t" , value: mPattern  },
        delta:        {type: "f" , value: 1.0},
        feed:         {type: "f" , value: feed},
        kill:         {type: "f" , value: kill},
        brush:        {type: "v2", value: new THREE.Vector2(-10, -10)     },
        color1:       {type: "v4", value: new THREE.Vector4(0, 0, 0.2, 0) },
        color2:       {type: "v4", value: new THREE.Vector4(0, 1, 0, 0.2) },
        color3:       {type: "v4", value: new THREE.Vector4(1, 1, 0, 0.21)},
        color4:       {type: "v4", value: new THREE.Vector4(1, 0, 0, 0.4) },
        color5:       {type: "v4", value: new THREE.Vector4(1, 1, 1, 0.6) }
    };

    mColors = [
        mUniforms.color1, 
        mUniforms.color2, 
        mUniforms.color3, 
        mUniforms.color4, 
        mUniforms.color5];
    
    $("#gradient").gradient("setUpdateCallback", onUpdatedColor);
    
    mGSMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader  : document.getElementById('standardVertexShader').textContent,
        fragmentShader: document.getElementById('gsFragmentShader'    ).textContent,
    });

    mScreenMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader  : document.getElementById('standardVertexShader').textContent,
        fragmentShader: document.getElementById('screenFragmentShader').textContent, });

    var plane   = new THREE.PlaneGeometry(canvasWidth, canvasHeight);
    mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
    mScene.add(mScreenQuad);
    
    render(0);
    
    mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
    mLastTime = new Date().getTime();
    
    requestAnimationFrame(render);
}

var init_marching = function ( ) {
    
    mcLayer = 0;
    mcCanvas = document.getElementById( 'marching' );

    // CAMERA

    mcCamera = new THREE.PerspectiveCamera( 45, 400 / 400, 1, 10000 );
    mcCamera.position.set( -0, 0, 1500 );

    // SCENE

    mcScene = new THREE.Scene();

    // LIGHTS

    mcLight = new THREE.DirectionalLight( 0xffffff );
    mcLight.position.set( 0.5, 0.5, 1 );
    mcScene.add( mcLight );

    mcPointLight = new THREE.PointLight( 0xff3300 );
    mcPointLight.position.set( 0, 0, 100 );
    mcScene.add( mcPointLight );

    mcAmbientLight = new THREE.AmbientLight( 0x080808 );
    mcScene.add( mcAmbientLight );

    // MATERIALS

    // mcMaterial = new THREE.MeshNormalMaterial();
    mcMaterial = new THREE.MeshPhongMaterial({
        // light
        specular: '#a9fcff',
        // intermediate
        color: '#00abb1',
        // dark
        emissive: '#006063',
        shininess: 100 
      });
    marching   = new THREE.MarchingCubes( resolution, mcMaterial, true, true );
    marching.position.set( 0, 0, 0 );
    marching.scale.set( 500, 500, 500 );

    marching.enableUvs = false;
    marching.enableColors = false;

    mcScene.add( marching );
    
    // var cube = new THREE.Mesh(new THREE.CubeGeometry(200, 200, 200), );
    // cube.overdraw = true;
    // mcScene.add(cube);


    // RENDERER

    mcRenderer = new THREE.WebGLRenderer( { canvas: mcCanvas, alpha: false } );
    mcRenderer.setSize( 400, 400 );
    
    // CONTROLS
    // mcControls = new THREE.TrackballControls( mcCamera );

    // mcControls.rotateSpeed = 1.0;
    // mcControls.zoomSpeed = 1.2;
    // mcControls.panSpeed = 0.8;

    // mcControls.noZoom = false;
    // mcControls.noPan = false;

    // mcControls.staticMoving = true;
    // mcControls.dynamicDampingFactor = 0.3;

    // mcControls.keys = [ 65, 83, 68 ];

    // mcControls.addEventListener( 'change', function(e){console.log(e)} );

}


mcRender = function(time) {

    if (!mcLayer) marching.reset();

    var data = new Uint8Array(resolution*resolution*4); 
    var gl = mRenderer.context;
    gl.readPixels(0,0,resolution,resolution, gl.RGBA, gl.UNSIGNED_BYTE, data);

    for(var i=0;i<resolution*resolution; i++ ) {
        marching.field[i+mcLayer*marching.size2] = data[i*4];
    }
    mcLayer = ++mcLayer % resolution

    var t = time /3000;
    mcCamera.position.set(2000*Math.sin(t), 0, 2000*Math.cos(t));
    mcCamera.lookAt(new THREE.Vector3(0,0,0))

    mcRenderer.clear();
    mcRenderer.render( mcScene, mcCamera );

}

var render = function(time) {

    var dt = (time - mLastTime)/20.0;
    if(dt > 0.8 || dt<=0) dt = 0.8;
    mLastTime = time;
    
    mScreenQuad.material  = mGSMaterial;
    mUniforms.delta.value = dt;
    mUniforms.feed.value  = feed;
    mUniforms.kill.value  = kill;
    
    for(var i=0; i<24; ++i) {
        if(!mToggled) {
            mUniforms.tSource.value  = mTexture1;
            mUniforms.tPattern.value = mPattern; 
            mRenderer.render(mScene, mCamera, mTexture2, true);
            mUniforms.tSource.value = mTexture2;
        } else {
            mUniforms.tSource.value  = mTexture2;
            mUniforms.tPattern.value = mPattern;
            mRenderer.render(mScene, mCamera, mTexture1, true);
            mUniforms.tSource.value = mTexture1;
        }
        
        mToggled = !mToggled;
        mUniforms.brush.value = mMinusOnes;
    }
    
    if(mColorsNeedUpdate)
        updateUniformsColors();
    
    mScreenQuad.material = mScreenMaterial;
    mRenderer.render(mScene, mCamera);
    if(recording) {  
        encoder.add(canvas);
        currentFrame++;
        var frame = document.getElementById("frame");
        frame.textContent = currentFrame;
        if(currentFrame>=2048) dostartstop();
    }

    mcRender(time);
    
    requestAnimationFrame(render);
}


loadPreset = function(idx) {

    feed = presets[idx].feed;
    kill = presets[idx].kill;
    worldToForm();
}

var updateUniformsColors = function() {

    var values = $("#gradient").gradient("getValuesRGBS");
    for(var i=0; i<values.length; i++)
    {
        var v = values[i];
        mColors[i].value = new THREE.Vector4(v[0], v[1], v[2], v[3]);
    }
    
    mColorsNeedUpdate = false;
}

var onUpdatedColor = function() {

    mColorsNeedUpdate = true;
    updateShareString();
}

var onMouseMove = function(e) {

    var ev = e ? e : window.event;
    mMouseX = Math.round(ev.clientX - simulation.offsetLeft);
    mMouseY = Math.round(ev.clientY - simulation.offsetTop);
    
    if(mMouseDown)
        mUniforms.brush.value = new THREE.Vector2(mMouseX/canvasWidth, 1-mMouseY/canvasHeight);
}

var onMouseDown = function(e) {

    var ev = e ? e : window.event;
    mMouseDown = true;
    
    mUniforms.brush.value = new THREE.Vector2(mMouseX/canvasWidth, 1-mMouseY/canvasHeight);
}

var onMouseUp = function(e) {

    mMouseDown = false;
}

clean = function() {

    mUniforms.brush.value = new THREE.Vector2(-10, -10);
}

snapshot = function() {
    var output = encoder.compile();
    var url = (window.webkitURL || window.URL).createObjectURL(output);
    document.getElementById('myVideo').src = url;
    document.getElementById('download').href = url;

    // var dataURL = canvas.toDataURL("image/png");
    // window.open(dataURL, "name-"+Math.random());
}

dostartstop = function() {
    var btn = document.getElementById("startstop");
    if(!recording) {
        encoder = new Whammy.Video(60);
        currentFrame = 0;
        btn.value = "Stop"
    } else {
        snapshot();
        delete encoder;
        encoder = null
        btn.value = "Start"
    }
    recording = !recording;
}

var worldToForm = function() {

    //document.ex.sldReplenishment.value = feed * 1000;
    $("#sld_replenishment").slider("value", feed);
    $("#sld_diminishment" ).slider("value", kill);
}

var init_controls = function() {

	$("#sld_replenishment").slider({
		value: feed, min: 0, max:0.1, step:0.001,
		change: function(event, ui) {$("#replenishment").html(ui.value); feed = ui.value; updateShareString();},
		slide : function(event, ui) {$("#replenishment").html(ui.value); feed = ui.value; updateShareString();}
	});
	
	$("#sld_replenishment").slider("value", feed);
	$("#sld_diminishment").slider({
		value: kill, min: 0, max:0.073, step:0.001,
		change: function(event, ui) {$("#diminishment").html(ui.value); kill = ui.value; updateShareString();},
		slide : function(event, ui) {$("#diminishment").html(ui.value); kill = ui.value; updateShareString();}
	});
	$("#sld_diminishment").slider("value", kill);
    
    $('#share').keypress(function (e) {
        if (e.which == 13) {
            parseShareString();
            return false;
        }
    });
}

alertInvalidShareString = function() {

    $("#share").val("Invalid string!");
    setTimeout(updateShareString, 1000);
}

parseShareString = function() {

    var str = $("#share").val();
    var fields = str.split(",");
    
    if(fields.length != 12)
    {
        alertInvalidShareString();
        return;
    }
    
    var newFeed = parseFloat(fields[0]);
    var newKill = parseFloat(fields[1]);
    
    if(isNaN(newFeed) || isNaN(newKill)) {

        alertInvalidShareString();
        return;
    }
    
    var newValues = [];
    
    for(var i=0; i<5; i++) {

        var v = [parseFloat(fields[2+2*i]), fields[2+2*i+1]];
        
        if(isNaN(v[0]))
        {
            alertInvalidShareString();
            return;
        }
        
        // Check if the string is a valid color.
        if(! /^#[0-9A-F]{6}$/i.test(v[1]))
        {
            alertInvalidShareString();
            return;
        }
        
        newValues.push(v);
    }
    
    $("#gradient").gradient("setValues", newValues);
    feed = newFeed;
    kill = newKill;
    worldToForm();
}

updateShareString = function() {

    var str = "".concat(feed, ",", kill);
    
    var values = $("#gradient").gradient("getValues");
    for(var i=0; i<values.length; i++)
    {
        var v = values[i];
        str += "".concat(",", v[0], ",", v[1]);
    }
    $("#share").val(str);
}

})();
