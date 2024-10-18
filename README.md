# @hippocrates-holding/nuxt-redirects

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module that allows for redirect management using a simple CSV file, it leverages  [zod-csv](https://github.com/bartoszgolebiowski/zod-csv)
under the hood for validation, handling both punctual and regex redirects. An example CSV file can be found [here](/playground/redirects.csv).

## Quick Setup

1. Add the `@hippocrates-holding/nuxt-redirects` dependency to your project.

```bash
# Using pnpm
pnpm add -D @hippocrates-holding/nuxt-redirects

# Using yarn
yarn add --dev @hippocrates-holding/nuxt-redirects

# Using npm
npm install --save-dev @hippocrates-holding/nuxt-redirects
```

2. Add `@hippocrates-holding/nuxt-redirects` to the `modules` section of your `nuxt.config.ts` file.

```js
export default defineNuxtConfig({
  modules: ["@hippocrates-holding/nuxt-redirects"],
});
```

That's it! You can now start using it in your Nuxt app. ✨

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

## License

Licensed under the [MIT License](LICENSE).

[npm-version-src]: https://img.shields.io/npm/v/@hippocrates-holding/nuxt-redirects/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@hippocrates-holding/nuxt-redirects
[npm-downloads-src]: https://img.shields.io/npm/dm/@hippocrates-holding/nuxt-redirects.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@hippocrates-holding/nuxt-redirects
[license-src]: https://img.shields.io/npm/l/@hippocrates-holding/nuxt-redirects.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/@hippocrates-holding/nuxt-redirects
[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
