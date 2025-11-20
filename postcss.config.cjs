module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('./postcss/plugins/tw-properties-unconditional.mjs').default ||
      require('./postcss/plugins/tw-properties-unconditional.mjs'),
    require('autoprefixer'),
  ],
}
