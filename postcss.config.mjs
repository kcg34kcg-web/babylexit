/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // v4 için doğru eklenti bu
    autoprefixer: {},
  },
};

export default config;