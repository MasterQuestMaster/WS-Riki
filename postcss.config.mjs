import presetEnv from "postcss-preset-env"
import autoprefixer from "autoprefixer"
import cssnanoPlugin from "cssnano"

export const plugins = [
    presetEnv({stage:0}),
    autoprefixer(),
    cssnanoPlugin({
        preset: 'default',
    })
]