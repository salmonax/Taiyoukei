 // ---##### Hacky stolen crap from solar-system-threejs ######---
const Constants = { // Rewritten to be less shitty-Justiny
  degreesToRadiansRatio: 0.0174532925,
  radiansToDegreesRatio: 57.2957795,
  universeScale: Math.pow(10, -4.2),
  orbitScale: Math.pow(10, -4.2), // bleh
  celestialScale: Math.pow(10, -3.8),
};
const COORDINATE_PRECISION = 12; // used by OrbitController
const DISTANCE_TO_KUIPER_BELT = 7479893535; // Kuiper Belt radius, NEEDED BY SUN
var CLOCK_MULTIPLIER = 1000; // this one's mine; it's used to affect the orbits
const Clock = THREE.Clock;

function _getDOYwithTimeAsDecimal() {
  const now = new Date();
  const DOY = Math.ceil((now - new Date(now.getFullYear(), 0, 1))/86400000);
  const decimalTime = now.getHours() + now.getMinutes() / 60;
  return DOY + decimalTime/24;
}

// I guess this is done to get a non-zero elapsed time?
// I'm just keeping it here until I'm sure I can strip it.
window.clock = new Clock();
window.clock.start();
window.clock.stop();

function RadialRingGeometry(innerRadius, outerRadius, thetaSegments) {
  THREE.Geometry.call(this);

  innerRadius = innerRadius || 0;
  outerRadius = outerRadius || 50;
  thetaSegments   = thetaSegments || 8;

  var normal  = new THREE.Vector3(0, 0, 1);

  for (var i = 0; i < thetaSegments; i++ ) {
    var angleLo = (i / thetaSegments) * Math.PI * 2;
    var angleHi = ((i + 1) / thetaSegments) * Math.PI * 2;
    var vertex1 = new THREE.Vector3(innerRadius * Math.cos(angleLo), innerRadius * Math.sin(angleLo), 0);
    var vertex2 = new THREE.Vector3(outerRadius * Math.cos(angleLo), outerRadius * Math.sin(angleLo), 0);
    var vertex3 = new THREE.Vector3(innerRadius * Math.cos(angleHi), innerRadius * Math.sin(angleHi), 0);
    var vertex4 = new THREE.Vector3(outerRadius * Math.cos(angleHi), outerRadius * Math.sin(angleHi), 0);

    this.vertices.push(vertex1);
    this.vertices.push(vertex2);
    this.vertices.push(vertex3);
    this.vertices.push(vertex4);

    var vertexIdx   = i * 4;

    // Create the first triangle
    var face = new THREE.Face3(vertexIdx + 0, vertexIdx + 1, vertexIdx + 2, normal);
    var uvs = [];

    var uv = new THREE.Vector2(0, 0);
    uvs.push(uv);

    var uv = new THREE.Vector2(1, 0);
    uvs.push(uv);

    var uv = new THREE.Vector2(0, 1)
    uvs.push(uv);

    this.faces.push(face);
    this.faceVertexUvs[0].push(uvs);

    // Create the second triangle
    var face = new THREE.Face3(vertexIdx + 2, vertexIdx + 1, vertexIdx + 3, normal);
    var uvs = []

    var uv = new THREE.Vector2(0, 1);
    uvs.push(uv);

    var uv = new THREE.Vector2(1, 0);
    uvs.push(uv);

    var uv = new THREE.Vector2(1, 1);
    uvs.push(uv);

    this.faces.push(face);
    this.faceVertexUvs[0].push(uvs);
  }

  this.boundingSphere = new THREE.Sphere(new THREE.Vector3(), outerRadius);
};

RadialRingGeometry.prototype = Object.create(THREE.Geometry.prototype);


class Orbit {
  constructor(object, color) {
    this.object = object;
    this.color = color || new THREE.Color('#404040');
    this.orbit = this.createOrbit();
    this.setOrbitInclination();
  }
  createOrbit() {
    var resolution = 64; //this._object.threeDistanceFromParent + 15; //* 50; // segments in the line
    var length = 360 / resolution;
    var orbitLine = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial({
      color: '#fff',//this._color,
      linewidth: 1,
      fog: false,
    });

    // Build the orbit line
    for (var i = 0; i <= resolution; i++) {
      var segment = (i * length) * Math.PI / 180;
      var orbitAmplitude = this.object.threeParent.threeRadius + this.object.threeDistanceFromParent;

      orbitLine.vertices.push(
        new THREE.Vector3(
          Math.cos(segment) * orbitAmplitude,
          Math.sin(segment) * orbitAmplitude,
          0
        )
      );
    }

    var line = new THREE.Line(orbitLine, material);

    line.position.set(0, 0, 0);

    return line;
  };

  setOrbitInclination() {
    this.object.orbitCentroid.rotation.x = this.object.orbitalInclination * Constants.degreesToRadiansRatio;
  }
}

class OrbitController {
  constructor(object, rotationEnabled) {
    this._object = object;
    this._threePlanet = object.threeObject;
    this._distanceFromParent = object.threeDistanceFromParent;
    this._segmentsInDay = 1;
    this._currentDay = 1;
    this._orbitAmplitude = this._object.threeParent ? this._object.threeParent.threeRadius + this._distanceFromParent : 1000;
    this._degreesToRotate = 0.1 * Math.PI / 180;
    this._orbitPositionOffset = object.orbitPositionOffset || 0;
    this._theta = 0;
    this._rotationEnabled = typeof rotationEnabled === 'boolean' ? rotationEnabled : true;
    this._dateObject = new Date();

    this.initListeners();
  }

  initListeners() {
    this.positionObject(true);

    document.addEventListener('frame', (e)=> {
      this.positionObject();

      if (this._rotationEnabled) {
        this.rotateObject();
      }
    }, false);
  };

  positionObject(canlog) {
    var dayOfYear = _getDOYwithTimeAsDecimal();
    var time = (dayOfYear + (clock.getElapsedTime() / 60)) + this._orbitPositionOffset;
    var theta = time * (360 / this._object.orbitalPeriod * CLOCK_MULTIPLIER) * Constants.degreesToRadiansRatio;
    var x = this._orbitAmplitude * Math.cos(theta);
    var y = this._orbitAmplitude * Math.sin(theta);

    this._object.theta = theta;

    x = Number.parseFloat(x.toFixed(COORDINATE_PRECISION));
    y = Number.parseFloat(y.toFixed(COORDINATE_PRECISION));

    this._threePlanet.position.set(x, y, 0);
    this._object.core.position.set(x, y, 0);

    if (this._object.objectCentroid) {
      this._object.objectCentroid.position.set(x, y, 0);
    }
  };

  rotateObject() {
    this._threePlanet.rotation.z += this._degreesToRotate; // 1 degree per frame
  };
}


class CelestialObject {
  constructor(diameter, mass, gravity, density) {
    this.diameter = diameter || 1;
    this.mass = mass || 1;
    this.gravity = gravity || 1; // unused
    this.density = density || 1; // unused
    this.core = new THREE.Object3D(); // Um, why?
    this.objectCentroid = new THREE.Object3D(); // And this, why?
  }
}

class Planet extends CelestialObject {
  constructor(data, threeParent) {
    super(data.diameter, data.mass, data.gravity, data.density);

    this._id = data.id || null;
    this._name = data.name || null;
    this._rotationPeriod = data.rotationPeriod || null;
    this._lengthOfDay = data.lengthOfDay || null;
    this._distanceFromParent = data.distanceFromParent || null;
    this._orbitalPeriod = data.orbitalPeriod || null;
    this._orbitalVelocity = data.orbitalVelocity || null;
    this._orbitalInclination = data.orbitalInclination || null; // to the ecliptic plane
    this._axialTilt = data.axialTilt || null;
    this._meanTemperature = data.meanTemperature || null;
    this._orbitPositionOffset = data.orbitPositionOffset;
    this._orbitHighlightColor = data.orbitHighlightColor || "#2d2d2d";
    this._textureLoader = new THREE.TextureLoader();
    this._threeDiameter = this.createThreeDiameter();
    this._threeRadius = this.createThreeRadius();
    this._surface = this.createSurface(data._3d.textures.base, data._3d.textures.topo, data._3d.textures.specular);
    this._atmosphere = this.createAtmosphere(data._3d.textures.clouds);
    this._threeObject = this.createGeometry(this._surface, this._atmosphere);
    this._threeDistanceFromParent = this.createThreeDistanceFromParent();
    this._threeParent = threeParent || null;
    this._moons = [];
    this._theta = 0;
    this._orbitCentroid = this.createOrbitCentroid();
    this._highlight = this.createHighlight();

    if (data.rings) {
      this.createRingGeometry(data);
    }

    // console.debug(this._name + ' Diameter: '+ this._threeDiameter);

    this.buildFullObject3D();
  }

  /**
   * Planet Data
   */
  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  get rotationPeriod() {
    return this._rotationPeriod;
  }

  get distanceFromParent() {
    return this._distanceFromParent;
  }

  get orbitalPeriod() {
    return this._orbitalPeriod;
  }

  get orbitalVelocity() {
    return this._orbitalVelocity;
  }

  get orbitalInclination() {
    return this._orbitalInclination;
  }

  get axialTilt() {
    return this._axialTilt;
  }

  get meanTemperature() {
    return this._meanTemperature;
  }

  get moons() {
    return this._moons;
  }

  get orbitPositionOffset() {
    return this._orbitPositionOffset;
  }

  get theta() {
    return this._theta;
  }

  set theta(theta) {
    this._theta = theta;
  }

  get highlight() {
    return this._highlight;
  }

  /**
   * 3D Model Data
   */
  get threeDiameter() {
    return this._threeDiameter;
  }

  get threeRadius() {
    return this._threeRadius;
  }

  get threeObject() {
    return this._threeObject;
  }

  get threeParent() {
    return this._threeParent;
  }

  get threeDistanceFromParent() {
    return this._threeDistanceFromParent;
  }

  get orbitCentroid() {
    return this._orbitCentroid;
  }

  get orbitLine() {
    return this._orbitLine;
  }

  get orbitHighlightColor() {
    return this._orbitHighlightColor;
  }

  set highlight(amplitude) {
    this._highlight = this.createHighlight(amplitude);
  }

  createOrbitCentroid() {
    return new THREE.Object3D();
  }

  setAxes() {
    this._threeObject.rotation.y = this._axialTilt * Constants.degreesToRadiansRatio;
    this.core.rotation.y = this._axialTilt * Constants.degreesToRadiansRatio;
    // this.objectCentroid.rotation.y = this._axialTilt * Constants.degreesToRadiansRatio;
  }

  buildFullObject3D() {
    this.setAxes();
    if (!window.orbitLines) {
      window.orbitLines = [];
    }
    //- console.log('here is where the orbits are made');
    this._orbitLine = new Orbit(this);
    this._orbitCentroid.add(
      this._threeObject,
      this.core,
      this._orbitLine.orbit,
      this.objectCentroid
    );
    window.orbitLines.push(this._orbitLine);

    // Axis Helper (x = red, y = green, z = blue)
    // this._threeObject.add(new THREE.AxisHelper(this._threeDiameter * 2 + 1));
  }

  createThreeDiameter() {
    return this.diameter * Constants.celestialScale;
  }

  createThreeRadius() {
    return (this.diameter * Constants.celestialScale) / 2;
  }

  createThreeDistanceFromParent() {
    return this._distanceFromParent * Constants.orbitScale;
  }

  getTexture(src, filter) {
    if (!src) {
      throw new MissingArgumentException(arguments[i]);
    }

    if (src) {
      var texture = this._textureLoader.load(src);

      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.encoding = THREE.sRGBEncoding;

      if (filter) {
        texture.filter = filter;
      }

      return texture;
    }
  }

  createGeometry(surface, atmosphere) {
    var hiRes = false;
    var segmentsOffset = Number.parseInt(this._threeDiameter + 1.1 * 60);

    if (hiRes) {
      segmentsOffset = Number.parseInt(this._threeDiameter + 1.5 * 120);
    }
    //- console.log('Planet.createGeometry:', segmentsOffset)
    var mesh = new THREE.Mesh(
      new THREE.SphereBufferGeometry(
          this._threeRadius - 0.1, 20, 20,
          //- segmentsOffset,
          //- segmentsOffset
        )
      )
    ;

    mesh.add(surface);

    if (atmosphere) {
      mesh.add(atmosphere);
    }

    return mesh;
  }

  createSurface(base, topo, specular) {
    if (!base) {
      return;
    }

    var hiRes = false;
    var segmentsOffset = Number.parseInt(this._threeDiameter + 1.1 * 60);

    if (hiRes) {
      segmentsOffset = Number.parseInt(this._threeDiameter + 1.5 * 120);
    }

    var map = this.getTexture(base);

    map.minFilter = THREE.NearestFilter;

    if (topo) {
      var bumpMap = this.getTexture(topo);

      bumpMap.minFilter = THREE.NearestFilter;
    }

    if (specular) {
      var specularMap = this.getTexture(specular);

      specularMap.minFilter = THREE.LinearFilter;
    }

    var surface = new THREE.MeshPhongMaterial({
      map: map,
      bumpMap: bumpMap || null,
      bumpScale: bumpMap ? 0.015 : null,
      specularMap: null, // specularMap || null,
      // specular: specularMap ? new THREE.Color(0x0a0a0a) : null
    });

    var mesh = new THREE.Mesh(
      new THREE.SphereBufferGeometry(
          this._threeRadius,
          segmentsOffset,
          segmentsOffset
        ),
        surface
      )
    ;

    mesh.rotation.x = 90 * Constants.degreesToRadiansRatio;

    return mesh;
  }

  createAtmosphere(clouds, haze) {
    if (clouds) {
      var segmentsOffset = this.getSphereGeometrySegmentOffset();
      var map = this.getTexture(clouds);

      map.minFilter = THREE.LinearFilter;

      //- console.log('$$$ Planet.createAtmosphere: ', segmentsOffset);
      var mesh = new THREE.Mesh(
        new THREE.SphereBufferGeometry(this._threeRadius * 1.01, segmentsOffset, segmentsOffset),
        new THREE.MeshPhongMaterial({
          map: map,
          transparent: true,
          opacity: 0.9
        })
      );

      mesh.rotation.x = 90 * Constants.degreesToRadiansRatio;

      return mesh;
    }

    return null;
  }

  createRingGeometry(data) {
    var innerRadius = data.rings.innerRadius * Constants.celestialScale;
    var outerRadius = data.rings.outerRadius * Constants.celestialScale;
    var thetaSegments = 180;
    var phiSegments = 80;
    var geometry = new RadialRingGeometry(
      innerRadius,
      outerRadius,
      thetaSegments
    );

    var map = this._textureLoader.load(data.rings.textures.base); // THREE.ImageUtils.loadTexture(data.rings.textures.base);
    map.minFilter = THREE.NearestFilter;

    var colorMap = this._textureLoader.load(data.rings.textures.colorMap); // THREE.ImageUtils.loadTexture(data.rings.textures.colorMap);
    colorMap.minFilter = THREE.NearestFilter;

    var material = new THREE.MeshLambertMaterial({
      map: colorMap,
      alphaMap: map,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide
    });

    var ring = new THREE.Mesh(geometry, material);
    ring.position.set(0, 0, 0);

    this._threeObject.add(ring);
  }

  createHighlight(amplitude) {
    var resolution = 2880; // segments in the line
    var length = 360 / resolution;
    var highlightDiameter = this._threeDiameter > 4 ? this._threeDiameter * 45 : this._threeDiameter * 75;
    var orbitAmplitude = amplitude || highlightDiameter;
    var orbitLine = new THREE.Geometry();
    var material = new THREE.MeshBasicMaterial({
      color: '#ffbd00', // '#00ffff',
      transparent: true,
      opacity: 0,
      depthTest: false
    });

    for (var i = 0; i <= resolution; i++) {
      var segment = (i * length) * Math.PI / 180;

      orbitLine.vertices.push(
        new THREE.Vector3(
          Math.cos(segment) * orbitAmplitude,
          Math.sin(segment) * orbitAmplitude,
          0
        )
      );
    }

    var line = new THREE.Line(orbitLine, material);

    line.rotation.y += 90 * Constants.degreesToRadiansRatio;
    line.position.set(0, 0, 0);

    this.core.add(line);

    return line;
  }

  getSphereGeometrySegmentOffset() {
    return Number.parseInt(this._threeDiameter + 1 * 60);
  }
}

class Sun extends CelestialObject {
  constructor(data) {
    super(data.diameter, data.mass, data.gravity, data.density);

    this._id = data.id || null;
    this._name = data.name || null;
    this._rotationPeriod = data.rotationPeriod || null;
    this._lengthOfDay = data.lengthOfDay || null;
    this._distanceFromParent = data.distanceFromParent || null;
    this._axialTilt = data.axialTilt || null;
    this._meanTemperature = data.meanTemperature || null;
    this._threeDiameter = this.createThreeDiameter();
    this._threeRadius = this.createThreeRadius();
    this._surface = this.createSurface(data._3d.textures.base, data._3d.textures.topo);
    this._threeObject = this.createGeometry(this._surface);
  };

  /**
   * 3D Model Data
   */
  get threeDiameter() {
    return this._threeDiameter;
  };

  get threeRadius() {
    return this._threeRadius;
  };

  get threeObject() {
    return this._threeObject;
  };

  getTexture(src) {
    if (src) {
      var texture = new THREE.TextureLoader().load(src);

      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      return texture;
    }
  };

  createThreeDiameter() {
    return this.diameter * Constants.celestialScale;
  };

  createThreeRadius() {
    return this.diameter * Constants.celestialScale / 2;
  };

  createGeometry(surface) {
    var geometry = new THREE.SphereBufferGeometry(
      this._threeRadius, 20, 20,
      //- 84,
      //- 42
    );

    var mesh = new THREE.Mesh(geometry, surface);
    var lightColor = 0xffffff;
    var intesity = 1;
    var lightDistanceStrength = DISTANCE_TO_KUIPER_BELT * Constants.universeScale;
    var lightDecayRate = 0.6;
    var sunLight = new THREE.PointLight(lightColor, intesity, lightDistanceStrength, lightDecayRate);

    mesh.rotation.x = 90 * Constants.degreesToRadiansRatio;

    mesh.add(sunLight);

    return mesh;
  };

  createSurface(base, topo) {
    if (!base) {
      return;
    }

    var texture = this.getTexture(base);

    texture.minFilter = THREE.NearestFilter;

    return new THREE.MeshPhongMaterial({
      map: texture,
      lightMap: texture,
      transparent: true,
      opacity: 0.85, // 0.8
      shading: THREE.SmoothShading
    });
  };
}

class Moon extends CelestialObject {
  constructor(data, threeParent, parentData, orbitColor = '#fff') {
    super(data.diameter, data.mass, data.gravity, data.density);

    this.id = data.id || null;
    this.name = data.name || null;

    this.distanceFromParent = data.distanceFromParent || null;
    this._orbitalPeriod = data.orbitalPeriod || null;
    this._orbitalInclination = data.orbitalInclination || null; // to the equatorial plane of the parent object
    this.mass = data.mass || null;
    this._orbitColorDefault = '#424242';
    this._orbitColor = this._orbitColorDefault; // || orbitColor

    // THREE properties
    this._threeDiameter = this.createThreeDiameter();
    this._threeRadius = this.createThreeRadius();
    this._surface = this.createSurface(data._3d.textures.base, data._3d.textures.topo);
    this._threeObject = this.createGeometry(this._surface);
    this._threeDistanceFromParent = this.createThreeDistanceFromParent();
    this._threeParent = threeParent || null;
    // this._threeObject.rotation.x = 90 * Constants.degreesToRadiansRatio;
    this._parentData = parentData || null;
    this._orbitCentroid = this.createOrbitCentroid();
    this._highlight = this.createHighlight();

    this.buildFullObject3D();
  }

  get orbitalPeriod() {
    return this._orbitalPeriod;
  }

  get orbitalInclination() {
    return this._orbitalInclination;
  }


  /**
   * 3D Model Data
   */
  get threeDiameter() {
    return this._threeDiameter;
  }

  get threeRadius() {
    return this._threeRadius;
  }

  get threeObject() {
    return this._threeObject;
  }

  get threeParent() {
    return this._threeParent;
  }

  get threeDistanceFromParent() {
    return this._threeDistanceFromParent;
  }

  get orbitLine() {
    return this._orbitLine;
  }

  get orbitCentroid() {
    return this._orbitCentroid;
  }

  get orbitColor() {
    return this._orbitColor;
  }

  get orbitColorDefault() {
    return this._orbitColorDefault;
  }

  get parentData() {
    return this._parentData;
  }

  get highlight() {
    return this._highlight;
  }

  set highlight(amplitude) {
    this._highlight = this.createHighlight(amplitude);
  }

  createHighlight(amplitude) {
    var resolution = 2880; // segments in the line
    var length = 360 / resolution;
    var highlightDiameter = this._threeDiameter > 4 ? this._threeDiameter * 45 : this._threeDiameter * 75;
    var orbitAmplitude = amplitude || highlightDiameter;
    var orbitLine = new THREE.Geometry();
    var material = new THREE.MeshBasicMaterial({
      color: '#3beaf7',
      transparent: true,
      opacity: 0,
      depthTest: false
    });

    for (var i = 0; i <= resolution; i++) {
      var segment = (i * length) * Math.PI / 180;

      orbitLine.vertices.push(
        new THREE.Vector3(
          Math.cos(segment) * orbitAmplitude,
          Math.sin(segment) * orbitAmplitude,
          0
        )
      );
    }

    var line = new THREE.Line(orbitLine, material);

    line.rotation.y += 90 * Constants.degreesToRadiansRatio;
    line.position.set(0, 0, 0);

    this.core.add(line);

    return line;
  }

  createOrbitCentroid() {
    return new THREE.Object3D();
  }

  buildFullObject3D() {
    this._orbitLine = new Orbit(this, this._orbitColorDefault);

    this._orbitCentroid.add(
      this._threeObject,
      this.core,
      this._orbitLine.orbit
    );
  }

  createThreeDiameter() {
    if (this.diameter < 300) {
      return this.diameter * 0.0007;
    }

    return this.diameter * Constants.celestialScale;
  }

  createThreeRadius() {
    if (this.diameter < 300) {
      return this.diameter * 0.0007 / 2;
    }

    return (this.diameter * Constants.celestialScale) / 2;
  }

  createThreeDistanceFromParent() {
    return this.distanceFromParent * Constants.orbitScale;
  }

  getTexture(src, filter) {
    if (!src) {
      throw new MissingArgumentException(arguments[i]);
    }

    if (src) {
      // this._textureLoader = new THREE.TextureLoader();
      var texture = new THREE.TextureLoader().load(src);

      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      if (filter) {
        texture.filter = filter;
      }2

      return texture;
    }
  }

  createGeometry(surface, atmosphere) {
    var segmentsOffset = Number.parseInt(this._threeDiameter + 1 * 35);
    //- console.log('Moon.createGeometry: ',segmentsOffset);
    var mesh = new THREE.Mesh(
      new THREE.SphereBufferGeometry(
          this._threeRadius, 20, 20,
          //segmentsOffset,
          //segmentsOffset
        ),
        surface
      )
    ;

    if (atmosphere) {
      mesh.add(atmosphere);
    }

    return mesh;
  }

  createSurface(base, topo, specular) {
    if (!base) {
      return;
    }

    var map = this.getTexture(base);

    map.minFilter = THREE.NearestFilter;


    return new THREE.MeshLambertMaterial({
      map: map
      // bumpMap: bumpMap || null,
      // bumpScale: bumpMap ? 0.012 : null,
    });
  }
}



function buildSolarSystem(dataURI = 'data/solarsystem.json') {
  const solarSystemRoot = window.root = new THREE.Group();
  scene.add(solarSystemRoot);
  const start = Date.now();
  return fetch(dataURI)
    .then(resp => resp.json())
    .then(data => {
      window.data = data;
      console.log('STARTING THINGS!');
      const sun = window.sun = new Sun(data.parent);
      //- console.log(window.scene, scene);
      //- window.scene.add(sun.threeObject);
      solarSystemRoot.add(sun.threeObject);
      window.planets = [];
      window.moons = [];
      data.planets.forEach(planetData => {
        const planet = new Planet(planetData, sun);
        const orbitCtrl = new OrbitController(planet);
        window.planets.push(planet);
        solarSystemRoot.add(planet.orbitCentroid);
        // ugh, the only thing the following does is register a side-effect:
        planetData.satellites.forEach(moonData => {
          const moon = new Moon(moonData, planet, planetData);
          const orbitCtrlMoon = new OrbitController(moon, false);
          planet._moons.push(moon);
          window.moons.push(moon);
          planet.core.add(moon.orbitCentroid);

          //- console.log(planetData.name, moon.name);
        });
      });
      fixStuff(window.planets, sun, solarSystemRoot);
      console.log(Date.now()-start);
    });

  function fixStuff(planets, sun, root, orbits = window.orbitLines, sky = $sky.object3D) {
    root.scale.set(0.05, 0.05, 0.05);
    //- orbits.forEach(n => n._orbit.visible = false);
    planets.forEach(n => {
      n.core.scale.set(10, 10, 10);
      n.threeObject.scale.set(100, 100, 100);
    });
    moons.forEach(n => n.threeObject.scale.set(5, 5, 5));
    sun.threeObject.scale.set(20, 20, 20);
    // sky.visible = false;
    window.root.scale.set(0.0001, 0.0001, 0.0001);
    window.root.position.set(45.929, -106.444, -33.487);

    $camera.object3D.position.set(-0.05297, -0.70244, 90.4411);
    pivot.position.set(45.92999, -106.4438, -33.4869);
    pivot.rotation.set(-2.961335, 1.31274, 1.13897);


    //- clock.start();
  }
}
