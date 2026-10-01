import { defineConfig } from "tsdown";

export default defineConfig([
  {
    dts: {
      tsgo: true,
    },
    entry: {"index":"src/index.browser.ts"},
    format:["esm","iife"],
    sourcemap:true,
    target:'es2022',
    clean: true,
    minify:true,
    platform:'browser',
    outDir:'dist/browser',
    fixedExtension:true,
    globalName:"achiHTML"
  },
    {
    dts: {
      tsgo: true,
    },
    entry: {"index":"src/index.node.ts"},
    format:["esm","cjs"],
    sourcemap:true,
    target:'node18',
    clean: true,
    minify:true,
    platform:'node',
    outDir:'dist/node',
    fixedExtension:true
  },
]);
