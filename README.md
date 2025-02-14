```
npm install
npm run build-client
npm run dev
```

```
open http://localhost:3000
```

If the build complains about a missing `.env` file, this is because it's not tracked in Git in order to keep API keys private. Notably, the Maptiler API key, used for the map tiles and geocoding control. To fix this, make a free [Maptiler](https://www.maptiler.com/) account, and find your API key. Then, create a file named .env in the project root with a single line (replacing the value with your own key):

```
MAPTILER_API_KEY=abcdefghijklmnopqrstuvwxyz1234567890
```

No quotes are needed.