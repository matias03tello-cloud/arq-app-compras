'use strict';
const { crearControladorSeguro } = require('./controller');

function crearApiRest(deps) {
  return crearControladorSeguro(deps);
}

module.exports = { crearApiRest };
