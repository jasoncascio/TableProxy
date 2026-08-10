import { afterEach } from 'vitest';
import { uninstallFakes } from './fakes/index.js';

// Each test installs the fake globals it needs; this guarantees no leakage
// between tests even when one fails partway through.
afterEach(() => {
  uninstallFakes();
});
