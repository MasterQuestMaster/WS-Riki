//Using an mjs version of this doesn't work, the config is not found.
//We will use this common-js version for the time being.
const postcssPresetEnv = require('postcss-preset-env')
const cssnanoPlugin = require('cssnano')

const config = () => ({
  plugins: [
    postcssPresetEnv({
      stage: 0
    }),
    cssnanoPlugin({preset: 'default'}),
  ]
})

module.exports = config