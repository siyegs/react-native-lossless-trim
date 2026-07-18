// Native module absent (e.g. Expo Go, or a build where it was not linked):
// requireOptionalNativeModule resolves to null.
import { trimAsync, isAvailable } from "../index";

jest.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: () => null,
}));

describe("trimAsync (native module unavailable)", () => {
  it("reports the native module as unavailable", () => {
    expect(isAvailable()).toBe(false);
  });

  it("rejects a valid call with ERR_UNAVAILABLE", async () => {
    await expect(
      trimAsync("file:///video.mp4", { startMs: 0, endMs: 1000 }),
    ).rejects.toMatchObject({ code: "ERR_UNAVAILABLE" });
  });

  it("still validates input before reporting unavailability", async () => {
    // Bad input is caught first, so callers get the most specific error.
    await expect(
      trimAsync("file:///video.mp4", { startMs: 10, endMs: 5 }),
    ).rejects.toMatchObject({ code: "ERR_INVALID_RANGE" });
  });
});
