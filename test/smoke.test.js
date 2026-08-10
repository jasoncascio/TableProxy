import { describe, it, expect } from 'vitest';
import '../src/index.js';
import { installBasicSheet } from './fixtures.js';

describe('smoke', () => {
  it('registers the global initializers on import', () => {
    expect(typeof global.$initTableProxy).toBe('function');
    expect(typeof global.$initUtils).toBe('function');
  });

  it('registers the utilities without clobbering the library global', () => {
    // The unnamed $initUtils branch used to register the utilities as
    // `TableProxy`, so initializing both with defaults lost mount().
    delete global.Utils;
    delete global.TableProxy;

    global.$initTableProxy();
    global.$initUtils();

    expect(typeof global.TableProxy.mount).toBe('function');
    expect(typeof global.Utils.getShape).toBe('function');

    delete global.Utils;
    delete global.TableProxy;
  });

  it('mounts against the fake and reads the header row', () => {
    installBasicSheet();
    global.$initTableProxy('TP');

    const table = global.TP.mount('Test');
    expect(table.getHeaderRow()).toEqual(['C1', 'C2', 'C3', 'C4', 'C5']);
  });
});
