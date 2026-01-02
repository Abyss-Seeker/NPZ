// tailwind.config.cjs (注意 .cjs 扩展名)
module.exports = {
  content: [
    "./*.html",
    "./*.js",
    "./*.ts",
    "./*.tsx",
    "./components/**/*.html",
    "./components/**/*.js",
    "./components/**/*.ts",
    "./components/**/*.tsx"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}