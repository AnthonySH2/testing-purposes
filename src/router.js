

function loadPage(route) {
  Promise.all([
    fetch('./pages'+route+'/index.html').then(response => response.text()),
    import( './pages'+route+'/index.js')
  ]).then(
    ([html, script]) => {
      document.getElementById('app').innerHTML = html;
      script.default(); 
    }
  )
}

export default loadPage;
