// Import our custom CSS
import './styles.scss'

// Import all of Bootstrap's JS
import loadPage from './router.js';

// Manejar la ruta actual
const currentRoute = window.location.pathname;
loadPage(currentRoute);


function init(){
    
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl');

    var supportedExtensions = gl.getSupportedExtensions();

    textureFloatSupport.innerHTML = supportedExtensions.includes('OES_texture_float') ? true: false;
    standarDerivativesSupport.innerHTML = supportedExtensions.includes('OES_standard_derivatives') ? true: false;

    extensionsLength.innerHTML = supportedExtensions.length;
    let listHtml = '';

    supportedExtensions.forEach(extension => {
        listHtml+=`<li class="list-group-item">${extension}</li>`
    });

    extensionsList.innerHTML = listHtml;

}

// init();