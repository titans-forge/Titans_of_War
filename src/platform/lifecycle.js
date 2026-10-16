import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// iOS can deactivate the scene before the WebView sends visibilitychange.
// Notify the same save/pause consumers before the application is suspended.
export function installNativeLifecycle() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('native-app');
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) window.dispatchEvent(new Event('civil-war-background'));
  }).catch(() => { /* Document visibility still provides the web fallback. */ });
}
