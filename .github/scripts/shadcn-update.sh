#! /bin/bash

cd web/next || exit 1
rm -rf components.json src/components/ui
bunx shadcn@latest create . --preset "https://ui.shadcn.com/init?base=base&style=nova&baseColor=neutral&theme=neutral&iconLibrary=remixicon&font=inter&menuAccent=subtle&menuColor=default&radius=default&template=next" --template next 
bunx shadcn@latest add -a
git restore package.json src/app/layout.tsx src/app/page.tsx
rm -rf src/components/component-example.tsx src/components/example.tsx
cd ../..
bun run format
bun i