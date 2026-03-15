const fs = require('fs');
let code = fs.readFileSync('src/routes.tsx', 'utf8');

if (!code.includes('import NewGameWizard')) {
  code = code.replace(
    "import MainMenu from './pages/MainMenu'",
    "import MainMenu from './pages/MainMenu'\nimport NewGameWizard from './pages/NewGameWizard'"
  );

  const notFoundRouteIndex = code.indexOf('const notFoundRoute = createRoute({');

  const newGameRoute = `
const newGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-game',
  component: NewGameWizard,
})
`;

  code = code.slice(0, notFoundRouteIndex) + newGameRoute + code.slice(notFoundRouteIndex);

  code = code.replace(
    '  indexRoute,\n  mainMenuRoute,\n',
    '  indexRoute,\n  mainMenuRoute,\n  newGameRoute,\n'
  );

  fs.writeFileSync('src/routes.tsx', code);
  console.log('Patched routes.tsx');
}
