import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.speeky.tester',
  appName: 'Speeky-Tester',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
