import presetEnv from "postcss-preset-env"
import cssnanoPlugin from "cssnano"

export const plugins = [
    presetEnv({stage:0}),
    cssnanoPlugin({
        preset: 'default',
    })
]