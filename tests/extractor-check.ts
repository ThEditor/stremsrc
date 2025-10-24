import { addonFn } from "../src/addon";

(async () => {
  const output = await addonFn({
    id: 'tmdb:101352:3:3',
    type: 'tv',
  });

  // console.log(await getStreamContent("tt21626284", "movie"));
  console.log(JSON.stringify(output, null, 2));
})();
