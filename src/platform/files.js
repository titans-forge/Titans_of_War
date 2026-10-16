import { Capacitor } from '@capacitor/core';

/** Native exports use the system sheet; no Photos permission or remote host. */
export async function exportFile(blob, filename) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]);
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not prepare the export.'));
      reader.readAsDataURL(blob);
    });
    const file = await Filesystem.writeFile({ path: `exports/${filename}`, directory: Directory.Cache, data, recursive: true });
    await Share.share({ title: 'Civil War', files: [file.uri] });
    return 'Share sheet closed. Choose Save to Files there to keep an export.';
  }
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'Download requested. Keep the file to restore or share it later.';
}
