// La PWA se registra solo en navegador. En Capacitor se desregistra para evitar
// que el caché del Service Worker sustituya rutas internas por la pantalla de inicio.
(async () => {
  if (!('serviceWorker' in navigator)) return;

  const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;
  if (isNativeApp) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || registration.scriptURL;
      if (scriptURL && scriptURL.endsWith('/sw.js')) {
        await registration.unregister();
      }
    }

    await navigator.serviceWorker.register('/service-worker.js');
  } catch (error) {
    console.log('Error al registrar Service Worker:', error);
  }
})();
