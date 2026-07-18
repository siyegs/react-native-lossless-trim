// Native module present: exercise the happy path, input validation, and the
// native-rejection -> ERR_TRIM mapping. The native binding is mocked so these
// run on plain Node with no device.
const trimVideo = jest.fn();

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: () => ({ trimVideo }),
}));

import { trimAsync, isAvailable, TrimError } from '../index';

describe('trimAsync (native module available)', () => {
  beforeEach(() => {
    trimVideo.mockReset();
  });

  it('reports the native module as available', () => {
    expect(isAvailable()).toBe(true);
  });

  it('resolves with a normalized file uri result', async () => {
    trimVideo.mockResolvedValue('file:///cache/lossless_trim_1.mp4');

    const result = await trimAsync('file:///video.mp4', { startMs: 1000, endMs: 5000 });

    expect(result).toEqual({ uri: 'file:///cache/lossless_trim_1.mp4' });
    expect(trimVideo).toHaveBeenCalledWith('file:///video.mp4', 1000, 5000);
  });

  it('prefixes a bare native output path with file://', async () => {
    trimVideo.mockResolvedValue('/data/cache/out.mp4');

    const result = await trimAsync('file:///video.mp4', { startMs: 0, endMs: 1000 });

    expect(result.uri).toBe('file:///data/cache/out.mp4');
  });

  it('rejects an empty uri with ERR_INVALID_URI before calling native', async () => {
    await expect(trimAsync('', { startMs: 0, endMs: 1000 })).rejects.toMatchObject({
      code: 'ERR_INVALID_URI',
    });
    expect(trimVideo).not.toHaveBeenCalled();
  });

  it.each([
    ['end before start', { startMs: 5000, endMs: 1000 }],
    ['equal start and end', { startMs: 1000, endMs: 1000 }],
    ['negative start', { startMs: -1, endMs: 1000 }],
    ['non-finite end', { startMs: 0, endMs: Number.NaN }],
  ])('rejects an invalid range (%s) with ERR_INVALID_RANGE', async (_label, range) => {
    await expect(trimAsync('file:///video.mp4', range)).rejects.toMatchObject({
      code: 'ERR_INVALID_RANGE',
    });
    expect(trimVideo).not.toHaveBeenCalled();
  });

  it('maps a native rejection to a TrimError with code ERR_TRIM', async () => {
    trimVideo.mockRejectedValue(new Error('unsupported codec'));

    const error = await trimAsync('file:///video.mp4', { startMs: 0, endMs: 1000 }).catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(TrimError);
    expect(error.code).toBe('ERR_TRIM');
    expect(error.message).toBe('unsupported codec');
  });
});
