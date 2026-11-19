// Keep recovery on the same storage and session path as the normal work app.
if (location.pathname === '/') {
  history.replaceState(null, '', '/control-app/#control');
}
