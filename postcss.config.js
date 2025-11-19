module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('./postcss/plugins/tw-properties-unconditional').default ||
      require('./postcss/plugins/tw-properties-unconditional'),
    require('autoprefixer'),
  ],
}
