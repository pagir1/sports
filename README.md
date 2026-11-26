# Sports

A small hub of sports prediction apps, live at https://pagir1.github.io/sports/.
Plain HTML, CSS and JavaScript, with no frameworks and no build step.

**Model predictions for learning and entertainment. Not betting advice.**

## What's here

| Path | What it is |
|---|---|
| `index.html`, `hub.css`, `hub.js` | The hub: one card per sport |
| `sports.json` | The list of sports |
| `shared.css` | Colors, fonts and footer shared by every page |
| `nba/` | NBA Predictor: player search, model chances, today's calls, yesterday's receipts |
| `data/nba/today.json` | Today's NBA predictions, updated each game-day morning |

## Add a sport

Add one line to `sports.json`:

```json
{ "id": "serie-a", "name": "Serie A", "tagline": "Italian football", "status": "coming_soon", "accent": "#7fb3e8", "path": "", "icon": "ball" }
```

`status` is `live` or `coming_soon`. `icon` is one of `hoop`, `ball` or `pitch`, all drawn for this site. When a sport goes live, set `status` to `live` and `path` to its folder, such as `serie-a/`.

## Run it locally

From this folder:

```
python -m http.server
```

Then open http://localhost:8000/. To see the NBA app with test data, put a `sample.json` in `data/nba/` and open http://localhost:8000/nba/?sample. That file isn't committed.

## Notes

- Icons are original simple shapes. No league, team or player logos or photos are used, and the site isn't affiliated with any league.
- NBA predictions come from a personal learning project. The injury status shown (Out or Doubtful only) is from the NBA's public injury report as of the morning.
- Browser storage keys used here all start with `sports-`.
