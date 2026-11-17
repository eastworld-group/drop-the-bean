# Drop the Bean: the road to 2000 levels

This is the plan for what a player meets from level 1 to level 2000, and when.
The level maker (`tools/levels.js`) and the game follow it. Written 2026-11-16.

## The shape

- 2000 levels = 80 chapters of 25.
- The phone screen fits at most an 8 x 6 board, and we reach that size around chapter 10.
  After that, difficulty has to come from the puzzle itself, not from bigger boards.
- So the game is built in **seasons**. Each season brings **one new twist**, teaches it
  gently, mixes it with the older twists, and ends on a hard **finale chapter**.
- The next season starts a little easier than the last finale, but harder than the last
  season's start. Difficulty climbs like a tilted saw blade: breathers, but always rising.
- Every season finale gives a big reward, so there is always something to aim for.

## The seasons

| Season | Chapters | Levels | New twist (taught in the season's first chapter) | Finale reward |
|---|---|---|---|---|
| 1. Nap Time | 1 to 10 | 1 to 250 | Rails, locks, blankets, gates (one per chapter), then mixes | Second room: the Kitchen |
| 2. Night Shift | 11 to 20 | 251 to 500 | No new twist: all six mixed, getting tighter | A new cat |
| 3. Full House | 21 to 28 | 501 to 700 | **Creaky boards** in chapter 21: a board breaks into a hole after a bed crosses it. In a minority of levels only (rising to about 40 percent) | Third room: the Garden |
| 4. One Way | 29 to 36 | 701 to 900 | **One-way floor**: arrow tiles a bed can only cross in the arrow's direction | A new cat |
| 5. Yarn Season | 37 to 44 | 901 to 1100 | **Yarn balls**: a bed pushes a ball one cell ahead; a ball stuck in a corner stays stuck | Fourth room: the Attic |
| 6. Slippery | 45 to 52 | 1101 to 1300 | **Ice patches**: a bed that moves onto ice keeps sliding until something stops it | A new cat |
| 7. Paw Buttons | 53 to 60 | 1301 to 1500 | **Buttons and doors**: a bed resting on a paw button holds a door open elsewhere | Fifth room: the Cat Cafe |
| 8. Cat Flaps | 61 to 68 | 1501 to 1700 | **Cat flaps**: a pair of tunnels; a one-cell bed that enters one comes out the other | A new cat |
| 9. Turntables | 69 to 76 | 1701 to 1900 | **Turntables**: a bed that stops on one turns a quarter turn | Sixth room: the Rooftop |
| 10. Sweet Dreams | 77 to 80 | 1901 to 2000 | Nothing new: everything at once, the hardest levels | The Dream House, and a crown for every cat |

Seasons 1 to 3 are built (700 levels). Seasons 4 to 10 are still to come, one season per batch.

### Why this order

- **Creaky boards** are the first twist that creates real wrong moves, so they wait until
  level 501, and stay in a minority of levels (never all of them).
- **One-way floor** after level 700: it is the easiest new rule to read (an arrow),
  and like creaky boards it creates real wrong moves.
- **Yarn and ice** change how beds move, so they come once the player has mastered the basics.
- **Buttons, flaps and turntables** need the most planning, so they come last.
- No two "movement" twists start back to back, so each season feels different.

## Inside each season

- **Chapter 1 of the season:** teaches the new twist. First level has a moving-finger demo;
  the first 5 levels use only the new twist, on small boards.
- **Middle chapters:** the new twist mixed with older ones. Difficulty climbs every chapter.
- **Last chapter (finale):** the hardest of the season. Its last level is a "big bed" level:
  a golden bed on the level page, bonus coins, and the season reward.

## Difficulty, measured

Every chapter has a difficulty score from the level maker: fewest moves, how often a bed must
step aside for another, how many first moves lead to a dead end, how many twists are in play,
and how tight the time is. The rules:

- The score rises from chapter to chapter inside a season. No chapter is easier than the one before.
- Each season's first chapter starts above the previous season's first chapter.
- Time for 3 stars tightens slowly: from about 1.0x in chapter 1 to about 0.77x by chapter 21,
  held there to chapter 28, then down to about 0.6x by chapter 80. Never under 30 seconds.
- Breather levels (slots 5, 10, 15, 20 of a chapter) get 20 percent more time from chapter 21 on.
- A trap level must never be lost silently: a move that makes it unwinnable is rejected by the level maker.

## Rewards along the way

| Kind | How it grows |
|---|---|
| **Cats** | Bean and Meowsy are free. More unlock with stars (30, 75, 150, 250, 400, 600, 900, 1200 stars today). A new cat each even season, at about 1800, 2600, 3500 and 4500 stars. (2000 levels can give up to 6000 stars.) |
| **Rooms** | The bedroom first. A new room at the end of seasons 1, 3, 5, 7 and 9, each with its own furniture to buy. |
| **Outfits** | Hats and neck items now; a new set of 3 each season. |
| **Chapter looks** | Every chapter has its own colors; each season has its own family of looks. |
| **Powerups** | Hint, Snooze and Treat now. Season 4 adds a **Hammer** (fixes one broken creaky board). Season 6 adds **Brake** (stops a bed on ice where you want). |
| **Daily nap** | One level a day from levels already passed, with a streak. |
| **Album** (to build) | A photo of her cat for every chapter finished; a full page for every season. |

## What each new twist costs to build

Every twist needs the same four pieces, all checked against each other:
1. the rule in the level maker's solver,
2. the rule in the game (moves, drawing, undo, and the in-game hint solver),
3. a teaching level and words,
4. levels generated and replayed by `tools/check.js`.

Rough size: one-way floor and buttons are small to medium; yarn and ice are medium;
cat flaps and turntables are large (they change bed shapes or positions in new ways).

## Where we are (2026-11-16)

- Built: levels 1 to 1000 (chapters 1 to 40): creaky boards from level 501, one-way tiles from 701,
  yarn balls from 901, and a rare 2x3 family bed (6 cats) from level 801.
- Being built: the bedroom you decorate, game-feel polish, recorded sounds, a chapter list.
- Next batch: the rest of season 5 (chapters 41 to 44), then season 6 (ice).
- Level file size: about 380 KB at 700 levels, about 1.1 MB at 2000. Split it into one file
  per chapter before then, so a phone only loads what it needs.

## Keeping her playing (added 2026-11-16)

Next to the puzzles, these are planned so there is always a reason to come back:

1. **Love notes:** a short note after each chapter. Default cute ones ship with the game;
   the owner can write personal ones in `notes.js`.
2. **More rooms:** Kitchen after level 250, Garden after level 700, each with its own furniture.
3. **Daily cat gift:** once a day a cat brings a present in the room; a 7-day gift calendar.
4. **Chapter treasure:** 3 stars on all 25 levels of a chapter opens a chest (coins and an outfit piece).
5. **Golden finale levels:** the last level of each season has a golden bed and a bigger reward.
6. **Cat album and stickers:** a picture for every finished chapter; achievement stickers.
7. **Stats:** cats tucked in, levels done, perfect levels, longest streak.
