
/* 
 * Gray-Scott
 *
 * A solver of the Gray-Scott model of reaction diffusion.
 *
 * ©2012 pmneila.
 * p.mneila at upm.es
 */

(function(){

// Canvas.
var canvas;
var simulation;
var canvasWidth  = 1024;
var canvasHeight = 1024;
var mousezoom    = canvasWidth/512.0;

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
var feed     = 0.020;
var feed_max = 0.060;
var kill     = 0.060;
var kill_max = 0.067;


init = function()
{
    init_controls();
    
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
    
    mTexture1 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
                        {minFilter: THREE.LinearFilter,
                         magFilter: THREE.LinearFilter,
                         format: THREE.RGBFormat,
                         type: THREE.FloatType});
    mTexture2 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
                        {minFilter: THREE.LinearFilter,
                         magFilter: THREE.LinearFilter,
                         format: THREE.RGBFormat,
                         type: THREE.FloatType});
    
    mTexture1.wrapS = THREE.RepeatWrapping;
    mTexture1.wrapT = THREE.RepeatWrapping;
    mTexture2.wrapS = THREE.RepeatWrapping;
    mTexture2.wrapT = THREE.RepeatWrapping;
    
    mUniforms = {
        screenWidth:  {type: "f" , value: canvasWidth/2},
        screenHeight: {type: "f" , value: canvasHeight/2},
        tSource:      {type: "t" , value: mTexture1},
        tPattern:     {type: "t" , value: mPattern },
        delta:        {type: "f" , value: 1.0},
        feed:         {type: "f" , value: feed},
        kill:         {type: "f" , value: kill},
        feed_max:     {type: "f" , value: feed_max},
        kill_max:     {type: "f" , value: kill_max},
        brush:        {type: "v2", value: new THREE.Vector2(-10, -10)},
        color1:       {type: "v4", value: new THREE.Vector4(0, 0, 0.2, 0)},
        color2:       {type: "v4", value: new THREE.Vector4(0, 1, 0, 0.2)},
        color3:       {type: "v4", value: new THREE.Vector4(1, 1, 0, 0.21)},
        color4:       {type: "v4", value: new THREE.Vector4(1, 0, 0, 0.4)},
        color5:       {type: "v4", value: new THREE.Vector4(1, 1, 1, 0.6)}
    };

    mColors = [mUniforms.color1, mUniforms.color2, mUniforms.color3, mUniforms.color4, mUniforms.color5];
    $("#gradient").gradient("setUpdateCallback", onUpdatedColor);
    
    mGSMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: document.getElementById('standardVertexShader').textContent,
        fragmentShader: document.getElementById('gsFragmentShader').textContent,
    });

    mScreenMaterial = new THREE.ShaderMaterial({
        uniforms: mUniforms,
        vertexShader: document.getElementById('standardVertexShader').textContent,
        fragmentShader: document.getElementById('screenFragmentShader').textContent, });

    var plane = new THREE.PlaneGeometry(canvasWidth, canvasHeight);
    mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
    mScene.add(mScreenQuad);
    
    render(0);
    mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
    mLastTime = new Date().getTime();
    requestAnimationFrame(render);
}

var render = function(time) {

    var dt = (time - mLastTime)/20.0;
    if(dt > 0.8 || dt<=0)
        dt = 0.8;
    mLastTime = time;
    
    mScreenQuad.material = mGSMaterial;
    mUniforms.delta.value = dt;
    mUniforms.feed.value = feed;
    mUniforms.kill.value = kill;
    mUniforms.feed_max.value = feed_max;
    mUniforms.kill_max.value = kill_max;
    

    for(var i=0; i<8; ++i) {
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
    mMouseX = Math.round(ev.clientX - simulation.offsetLeft)*mousezoom;
    mMouseY = Math.round(ev.clientY - simulation.offsetTop)*mousezoom;
    
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

    var dataURL = canvas.toDataURL("image/png");
    window.open(dataURL, "name-"+Math.random());
}

var worldToForm = function() {

    //document.ex.sldReplenishment.value = feed * 1000;
    $("#sld_feed_min").slider("value", feed    );
    $("#sld_kill_min").slider("value", kill    );
    $("#sld_feed_max").slider("value", feed_max);
    $("#sld_kill_max").slider("value", kill_max);


}

var init_controls = function() {

    $("#sld_feed_min").slider({
        value: feed, min: 0, max:0.1, step:0.001,
        change: function(event, ui) {$("#val_feed_min").html(ui.value); feed = ui.value; updateShareString();},
        slide : function(event, ui) {$("#val_feed_min").html(ui.value); feed = ui.value; updateShareString();}
    }); 
    $("#sld_feed_min").slider("value", feed);
    
    $("#sld_kill_min").slider({
        value: kill, min: 0, max:0.073, step:0.001,
        change: function(event, ui) {$("#val_kill_min").html(ui.value); kill = ui.value; updateShareString();},
        slide : function(event, ui) {$("#val_kill_min").html(ui.value); kill = ui.value; updateShareString();}
    });
    $("#sld_kill_min").slider("value", kill);

	$("#sld_feed_max").slider({
		value: feed, min: 0, max:0.1, step:0.001,
		change: function(event, ui) {$("#val_feed_max").html(ui.value); feed_max= ui.value; updateShareString();},
		slide : function(event, ui) {$("#val_feed_max").html(ui.value); feed_max= ui.value; updateShareString();}
	});	
	$("#sld_feed_max").slider("value", feed_max);
	
    $("#sld_kill_max").slider({
		value: kill, min: 0, max:0.073, step:0.001,
		change: function(event, ui) {$("#val_kill_max").html(ui.value); kill_max= ui.value; updateShareString();},
		slide : function(event, ui) {$("#val_kill_max").html(ui.value); kill_max= ui.value; updateShareString();}
	});
	$("#sld_kill_max").slider("value", kill_max);
    
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
