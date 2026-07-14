function getCapacitor() {
  return window.Capacitor || null;
}

function isAndroidApp() {
  const capacitor = getCapacitor();
  return Boolean(
    capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() === 'android'
  );
}

function getFilesystemPlugin() {
  return getCapacitor()?.Plugins?.Filesystem || null;
}

/**
 * Recupera el plugin nativo instalado con @capacitor/file-viewer.
 * registerPlugin es necesario porque esta app carga JavaScript sin bundler.
 */
function getFileViewerPlugin() {
  const capacitor = getCapacitor();
  if (!capacitor) return null;

  const registeredPlugin = capacitor.Plugins?.FileViewer;
  if (registeredPlugin?.openDocumentFromLocalPath) {
    return registeredPlugin;
  }

  if (typeof capacitor.registerPlugin === 'function') {
    return capacitor.registerPlugin('FileViewer');
  }

  return null;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('No se pudo preparar el archivo para guardarlo.'));
    reader.readAsDataURL(blob);
  });
}

function downloadInBrowser(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function getAbsolutePath(fileUri) {
  const value = String(fileUri || '').trim();
  if (!value) return '';

  // Filesystem devuelve file:///... en Android; FileViewer pide la ruta absoluta.
  if (value.startsWith('file://')) {
    try {
      return decodeURIComponent(value.replace(/^file:\/\//, ''));
    } catch (_) {
      return value.replace(/^file:\/\//, '');
    }
  }

  return value;
}

async function abrirDocumentoNativo(fileUri) {
  const viewer = getFileViewerPlugin();
  const path = getAbsolutePath(fileUri);

  if (!viewer?.openDocumentFromLocalPath || !path) {
    throw new Error(
      'El reporte se guardó, pero falta configurar el visor de documentos. Instala @capacitor/file-viewer, sincroniza Android y vuelve a compilar la app.'
    );
  }

  try {
    await viewer.openDocumentFromLocalPath({ path });
  } catch (error) {
    const nativeMessage = error?.message || String(error || '');
    console.error('No se pudo abrir el documento nativo:', error);

    if (/0010|no app|no application|activity not found/i.test(nativeMessage)) {
      throw new Error(
        'El reporte se guardó, pero no hay una aplicación instalada para abrir este tipo de archivo. Instala o usa Google Drive, Adobe Acrobat, Microsoft Excel, Google Sheets o WPS Office.'
      );
    }

    if (/not implemented|does not have an implementation|plugin is not implemented/i.test(nativeMessage)) {
      throw new Error(
        'El reporte se guardó, pero el visor nativo todavía no está sincronizado. Ejecuta npm install @capacitor/file-viewer, npx cap sync android y reinstala la app.'
      );
    }

    throw new Error(`El reporte se guardó, pero Android no pudo abrirlo automáticamente. ${nativeMessage}`);
  }
}

/**
 * Guarda el archivo en Documentos/GastoFacil/Reportes y, en Android, lo abre
 * inmediatamente con el visor nativo instalado en el teléfono.
 */
export async function guardarArchivoReporte(blob, filename) {
  if (!(blob instanceof Blob)) {
    throw new Error('No se pudo crear el archivo del reporte.');
  }

  if (isAndroidApp()) {
    const filesystem = getFilesystemPlugin();
    if (!filesystem?.writeFile) {
      throw new Error(
        'Falta habilitar el guardado nativo de Android. Ejecuta el paso de instalación indicado y vuelve a sincronizar la app.'
      );
    }

    const data = await blobToBase64(blob);
    const relativePath = `GastoFacil/Reportes/${filename}`;
    const writeResult = await filesystem.writeFile({
      path: relativePath,
      data,
      directory: 'DOCUMENTS',
      recursive: true
    });

    await abrirDocumentoNativo(writeResult?.uri || '');

    return {
      platform: 'android',
      filename,
      path: relativePath,
      uri: writeResult?.uri || '',
      message: 'Reporte guardado y abierto en el visor del teléfono.'
    };
  }

  downloadInBrowser(blob, filename);
  return {
    platform: 'web',
    filename,
    message: 'Reporte descargado correctamente.'
  };
}
