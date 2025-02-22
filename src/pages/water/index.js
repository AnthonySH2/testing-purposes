

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let WIDTH = window.innerWidth;
let HEIGHT = WIDTH*9/16;

function loadFile(filename) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FileLoader();

        loader.load(filename, (data) => {
        resolve(data);
        });
    });
}

class WaterSimulation {

    constructor() {
      this._camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 2000);

      this._geometry = new THREE.PlaneGeometry(2, 2);

      this._textureA = new THREE.WebGLRenderTarget(256, 256, {type: THREE.FloatType});
      this._textureB = new THREE.WebGLRenderTarget(256, 256, {type: THREE.FloatType});
      this.texture = this._textureA;

      const shadersPromises = [
        loadFile('../../assets/shaders/simulation/vertex.glsl'),
        loadFile('../../assets/shaders/simulation/drop_fragment.glsl'),
        loadFile('../../assets/shaders/simulation/normal_fragment.glsl'),
        loadFile('../../assets/shaders/simulation/update_fragment.glsl'),
      ];

      this.loaded = Promise.all(shadersPromises)
          .then(([vertexShader, dropFragmentShader, normalFragmentShader, updateFragmentShader]) => {
        const dropMaterial = new THREE.RawShaderMaterial({
          uniforms: {
              center: { value: [0, 0] },
              radius: { value: 0 },
              strength: { value: 0 },
              texture: { value: null },
          },
          vertexShader: vertexShader,
          fragmentShader: dropFragmentShader,
        });

        const normalMaterial = new THREE.RawShaderMaterial({
          uniforms: {
              delta: { value: [1 / 256, 1 / 256] },  // TODO: Remove this useless uniform and hardcode it in shaders?
              texture: { value: null },
          },
          vertexShader: vertexShader,
          fragmentShader: normalFragmentShader,
        });

        const updateMaterial = new THREE.RawShaderMaterial({
          uniforms: {
              delta: { value: [1 / 256, 1 / 256] },  // TODO: Remove this useless uniform and hardcode it in shaders?
              texture: { value: null },
          },
          vertexShader: vertexShader,
          fragmentShader: updateFragmentShader,
        });

        this._dropMesh = new THREE.Mesh(this._geometry, dropMaterial);
        this._normalMesh = new THREE.Mesh(this._geometry, normalMaterial);
        this._updateMesh = new THREE.Mesh(this._geometry, updateMaterial);
      });
    }

    // Add a drop of water at the (x, y) coordinate (in the range [-1, 1])
    addDrop(renderer, x, y, radius, strength) {
      this._dropMesh.material.uniforms['center'].value = [x, y];
      this._dropMesh.material.uniforms['radius'].value = radius;
      this._dropMesh.material.uniforms['strength'].value = strength;

      this._render(renderer, this._dropMesh);
    }

    stepSimulation(renderer) {
      this._render(renderer, this._updateMesh);
    }

    updateNormals(renderer) {
      this._render(renderer, this._normalMesh);
    }

    _render(renderer, mesh) {
      // Swap textures
      const oldTexture = this.texture;
      const newTexture = this.texture === this._textureA ? this._textureB : this._textureA;

      mesh.material.uniforms['texture'].value = oldTexture.texture;

      renderer.setRenderTarget(newTexture);

      // TODO Camera is useless here, what should be done?
      renderer.render(mesh, this._camera);

      this.texture = newTexture;
    }

}


class Caustics {

constructor(lightFrontGeometry) {
    this._camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 2000);

    this._geometry = lightFrontGeometry;

    this.texture = new THREE.WebGLRenderTarget(1024, 1024, {type: THREE.UnsignedByteType});

    const shadersPromises = [
    loadFile('../../assets/shaders/caustics/vertex.glsl'),
    loadFile('../../assets/shaders/caustics/fragment.glsl')
    ];

    this.loaded = Promise.all(shadersPromises)
        .then(([vertexShader, fragmentShader]) => {
    const material = new THREE.RawShaderMaterial({
        uniforms: {
            light: { value: light },
            water: { value: null },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    });

    this._causticMesh = new THREE.Mesh(this._geometry, material);
    });
}

update(renderer, waterTexture) {
    this._causticMesh.material.uniforms['water'].value = waterTexture;

    renderer.setRenderTarget(this.texture);
    renderer.setClearColor(black, 0);
    renderer.clear();

    // TODO Camera is useless here, what should be done?
    renderer.render(this._causticMesh, this._camera);
}

}


class Water {

constructor() {
    this.geometry = new THREE.PlaneGeometry(2, 2, 200, 200);

    const shadersPromises = [
    loadFile('../../assets/shaders/water/vertex.glsl'),
    loadFile('../../assets/shaders/water/fragment.glsl')
    ];

    this.loaded = Promise.all(shadersPromises)
        .then(([vertexShader, fragmentShader]) => {
    this.material = new THREE.RawShaderMaterial({
        uniforms: {
            light: { value: light },
            tiles: { value: tiles },
            sky: { value: textureCube },
            water: { value: null },
            causticTex: { value: null },
            underwater: { value: false },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    });
}

draw(renderer, waterTexture, causticsTexture) {
    this.material.uniforms['water'].value = waterTexture;
    this.material.uniforms['causticTex'].value = causticsTexture;

    this.material.side = THREE.FrontSide;
    this.material.uniforms['underwater'].value = true;
    renderer.render(this.mesh, camera);

    this.material.side = THREE.BackSide;
    this.material.uniforms['underwater'].value = false;
    renderer.render(this.mesh, camera);
}

}


class Pool {

constructor() {
    this._geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
    -1, -1, -1,
    -1, -1, 1,
    -1, 1, -1,
    -1, 1, 1,
    1, -1, -1,
    1, 1, -1,
    1, -1, 1,
    1, 1, 1,
    -1, -1, -1,
    1, -1, -1,
    -1, -1, 1,
    1, -1, 1,
    -1, 1, -1,
    -1, 1, 1,
    1, 1, -1,
    1, 1, 1,
    -1, -1, -1,
    -1, 1, -1,
    1, -1, -1,
    1, 1, -1,
    -1, -1, 1,
    1, -1, 1,
    -1, 1, 1,
    1, 1, 1
    ]);
    const indices = new Uint32Array([
    0, 1, 2,
    2, 1, 3,
    4, 5, 6,
    6, 5, 7,
    12, 13, 14,
    14, 13, 15,
    16, 17, 18,
    18, 17, 19,
    20, 21, 22,
    22, 21, 23
    ]);

    this._geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this._geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    const shadersPromises = [
    loadFile('../../assets/shaders/pool/vertex.glsl'),
    loadFile('../../assets/shaders/pool/fragment.glsl')
    ];

    this.loaded = Promise.all(shadersPromises)
        .then(([vertexShader, fragmentShader]) => {
    this._material = new THREE.RawShaderMaterial({
        uniforms: {
            light: { value: light },
            tiles: { value: tiles },
            water: { value: null },
            causticTex: { value: null },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    });
    this._material.side = THREE.FrontSide;

    this._mesh = new THREE.Mesh(this._geometry, this._material);
    });
}

draw(renderer, waterTexture, causticsTexture) {
    this._material.uniforms['water'].value = waterTexture;
    this._material.uniforms['causticTex'].value = causticsTexture;

    renderer.render(this._mesh, camera);
}

}


class Debug {

constructor() {
    this._camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1);
    this._geometry = new THREE.PlaneGeometry();

    const shadersPromises = [
    loadFile('../../assets/shaders/debug/vertex.glsl'),
    loadFile('../../assets/shaders/debug/fragment.glsl')
    ];

    this.loaded = Promise.all(shadersPromises)
        .then(([vertexShader, fragmentShader]) => {
    this._material = new THREE.RawShaderMaterial({
        uniforms: {
            texture: { value: null },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    });

    this._mesh = new THREE.Mesh(this._geometry, this._material);
    });
}

draw(renderer, texture) {
    this._material.uniforms['texture'].value = texture;

    renderer.setRenderTarget(null);
    renderer.render(this._mesh, this._camera);
}

}

export default function waterPage(){

    init().then(()=>{
        
        let watersimulation = new WaterSimulation();
        console.log(watersimulation);
    });
    
}

let renderer, camera, scene, controls, stats, textureCube, light, tiles;
function init(){
    return new Promise(resolve=>{
        loadFile('../../assets/shaders/utils.glsl').then((utils) => {
            THREE.ShaderChunk['utils'] = utils;

            camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.01, 100);
            camera.position.set(0.426, 0.677, -2.095);
            camera.rotation.set(2.828, 0.191, 3.108);
        
            renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize(WIDTH, HEIGHT);
            renderer.autoClear = false;
            threeRenderer.appendChild(renderer.domElement);
            window.onresize = onWindowResize;

            controls = new OrbitControls( camera, renderer.domElement );

            const cubetextureloader = new THREE.CubeTextureLoader();

            cubetextureloader.setPath('../../assets/textures/');
            textureCube = cubetextureloader.load([
                'xpos.jpg', 'xneg.jpg',
                'ypos.jpg', 'ypos.jpg',
                'zpos.jpg', 'zneg.jpg',
            ]);
            scene = new THREE.Scene();
            scene.background = textureCube;
            stats = new Stats();

            const textureloader = new THREE.TextureLoader();
            textureloader.setPath('../../assets/textures/');

            tiles = textureloader.load('tiles.jpg');
            animate();

            resolve();
        });
    })    
}

function onWindowResize(e){
    WIDTH = window.innerWidth;
    HEIGHT = WIDTH*9/16;

    camera.aspect = WIDTH/HEIGHT;
    camera.updateProjectionMatrix();

    renderer.setSize( WIDTH, HEIGHT );
}

function animate(){
    
    requestAnimationFrame( animate );

    controls.update();

    stats.update();

    renderer.render( scene, camera );
}
