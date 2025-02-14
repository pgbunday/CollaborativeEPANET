
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./epanet-js.cjs.production.min.js')
} else {
  module.exports = require('./epanet-js.cjs.development.js')
}
