// Builds the lake's colours, grain and vegetation off the main thread (see lake-gen.js).
import { generateLake } from './lake-gen.js?v=0.17.0';
self.onmessage = e => {
  const out = generateLake(e.data.clearings);
  self.postMessage(out, [
    out.fineColors.buffer,
    out.coarseColors.buffer,
    out.grain.buffer,
    ...Object.values(out.veg).map(a => a.buffer)
  ]);
};
