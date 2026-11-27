import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCrf(16);
Config.setOverwriteOutput(true);
// The globe is WebGL: ANGLE uses the GPU on macOS/Windows.
Config.setChromiumOpenGlRenderer('angle');
