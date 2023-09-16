## 2023.06.27
Thinking about future changes based on player feedback.  The big ones are
- Lag at the end game
- Ambiguous / unsatisfying end (1 shot everything)
- Missing classes

I'm thinking about resolving them all.  For end game, instead of infinite levels, I'm thinking of changing it to an infinite single level (which means your cooldowns won't reset) where the enemies keep getting stronger until you inevitably die.  Could have a cool voice over "you've gone too far in the relm of magic!"

For the classes thinking of adding some modifications that affect spells in new ways (change mana to health, more summons, etc)
## 2023.03.13
Thoughts on the Pickup Double Spend problem.
I made AQUIRE_PICKUP a networked message to prevent desyncs but this means that picking up a pickup became asyncronous. I was using flaggedForRemoval to prevent picking up a pickup twice, but now that it's async it is sending multiple AQUIRE_PICKUP messages for the same pickup because the local client hasn't yet triggered pickup for that pickup which would set flaggedForRemoval to true.  This is also making a player trigger ENTER_PORTAL multiple times which is making the multiplayer server generate multiple levels which can result in desync.

One solution is to make all pickups single use and then to triggerPickup locally at the same time as I send the network message so it doesn't send multiple network messages.   Then the network message will only serve as a protection against it not getting picked up locally.
## 2023.01.31
- todo:
  - show prediction must recieve prediction units in targetedUnits and targetedPickups so for example after a prediction unit MOVES via a push the next push will start from the moved location
  - Figure out how to sync animation moments with effect2 partial invocation
    - maybe rather than doing triggerEffectStage, each invokation of effect2 IS the stage and it recieves quantity (the total), and count (quantity so far)
```
showPrediction: ({ targetedUnits, targetedPickups, quantity, aggregator }, outOfRange?: boolean) => {},
animate: async ({ targetedUnits, targetedPickups, casterUnit, quantity, aggregator }, triggerEffectStage, underworld) => {},
cacheSpellInvokation: (args, underworld, prediction) => {},
effect2: (calculated, underworld, prediction) => {},

```
What I need to cast cards from cached info
{
  starting targets or cast location
  cards list with quantity and when new targets are added
  casterUnit,
  cachedCasterPosition
}
---
Ways to fix multiplayer desyncs. I could split spells into 4 functions:

- showPrediction(calculatesReturn)
  - shows targeting and movement prediction lines
- animate(targets[], cachedCasterLocation?)
  - sprite animation
  - graphics animation
  - sfx
  - with delays if necessary
- effect(quantity, cachedCasterLocation, targets[], extra, prediction)
  - take damage
  - apply modifier
  - remove modifier
  - apply movement / change position
- cacheSpellInvokation() -> {quantity, targets[],extra:object}
- `calculateCastCards() -> {spells:{cardId, quantity, newTargets[],attributeChange, }[], castLocation:Vec2}`

How to make animate work in concert with effect so that the unit dies when the first arrow strikes, letting the second pass through??
**Could effect return stages that animate could trigger?**

Thoughts on cacheSpellInvokation():
The result of cacheSpellInvokation is what's send over the network.  It contains EVERYTHING needed to execute the spell
in identical fashion on any client.
  - For damaging spells, that means dealing the right amount of damage
    - this applies to other attributes too so there could be an attribute change for changing mana, stamina, health
  - for targeting spells, it returns which unit ids or pickup ids get added to the target
  - for movement spells
    - final location might be better than `awayFrom` so that it's guarunteed they'll end up in the same location
  - for curses and blessings
    - the spell id and quantity
  - for soul
    - the spell id and location
- castLocation is still needed for animate for example to animate a circle from the castlocation or to summon a soul unit
- TODO how to handle refunds / mana

for prediction I could cacheSpellInvokation and effect (and animate for those that draw during predictions). for casting I could cacheSpellInvokation and
send and then once it comes back from the server it effect()s and animate()s

- test 1st:
  - slash
  - connect
  - push

- test 2nd:
  - arrow
  - swap
  - target circle
  - freeze
  - shield
  - decoy

- test 3rd
  - drown
    - what if it desyncs and they're not in water
  - shove (damage)

- damage only need 
  - a list of targets to targets
  - cached caster location for arrows and burst
- movement spells should get end location
  - or for push start and awayFrom
  - for swap, end location
- targeting spells
  - need targets
  - return additional targets
  - no effect fn, just cacheSpellInvokation and animate
- curses should just need targets
- blessings should just need targest

## Example new spell functions
calculateOutcome({
  cards:'target circle' + push + 'chain' + freeze + slash + slash,
  castLocation: {x:10,y:12},
  casterLocation: {x:74,y:200}
})
```js
{
  spells:[
    {
      cardId:'target circle',
      newUnitIds:[0,1,2],
      newPickupIds:[0,4],
    },
    {
      cardId:'push',
    },
    {
      cardId:'freeze',
    },
    {
      cardId:'slash',
      quantity: 2
    }
  ],
  // Undefined because this was cast on an initial unit
  targetedUnitId:undefined,
  targetedPickupId:undefined,
  // for animating, not determining the effect (unless for a spell like repel or vortex),
  // but not for cast location, it doesn't need it because of newUnitIds
  castLocation:{x:10,y:12}
}
```
Then that result gets passed into `effect2()` on headless and `effect2() and animate()` on clients

---
---
sounds like when someone dies the game desyncs?

- When I do this, revalidate the snapping of movement + targeting spells in
  a24d1259
- reduce logging on server for efficiency?

## 2023.01.31

Fixed mac build bloat. When I transfer the mac files to pc it doubles in size
because it's making a full copy of an alias at "Contents/Frameworks/Electron
Framework.framework/Versions/Current" which just points to the folder `A` in the
same directory. If you just delete `Current` and rename `A` to `Current` it cuts
the download size in half and works just fine.
https://github.com/electron-userland/electron-builder/issues/5767#issuecomment-815540734
More specifically, everything inside the `Electron Framework.framework` folder
is an alias to Current so just replace all those aliases with the real thing.
Okay it's a little more complicated. It looks like it needs the 3 non-framework
files to remain, so just delete the framework file in the versions folder ("A"
renamed to "Current") and leave the rest. So it looks like:

- Electron Framework.framework
  - Electron Framework
  - Helpers
  - Libraries
  - Resources
  - Versions
    - Current
      - Helpers
      - Libraries
      - Resources

## 2023.01.21

Figuring out cast range exceptions for arrows:

- arrow + another spell: allow cast out of range but remove click target if out
  of range for following spell
- only allow casting out of range if arrow is first spell and if arrow is first
  spell remove the click target if out of range
- target arrow + slash + target circle + slash incorrectly allows casting out of
  range if the target arrow is intercepted the target circle still appears at
  the cast location

## 2023.01.15

Refactoring moveTowards to support multi point paths

## 2023.01.09

Modding I think I'll create a public github repo that has the typing files in
it. When the player builds their mod they'll have to copy the output to a mods/
file. Then the electron app can scan that directory and add a `<script>` tag
pointing to it to the HTML if they enable it.

To publish the mod they can open a PR and I can add it to the game. In this way
servers can use the mods too.

## 2023.01.08

When creating spells note that state.casterUnit is a prediction unit and you
cannot test equality like `state.casterUnit == therealunit`. Instead, compare
ids

## 2023.01.03

Electron - only using `package` not `make` My findings show that electron is
smart enough to not remake the exe (or have the contents different). I made a
branch in the `Golems-Electron-Build` repo called `executable` where I commit
the out/Spellmasons-win32-x64 files and whenever I make a new build I can see
which files change which should impact how Steam handles the update

## 2022.12.31

Better Perks

Perks need to be randomly generated Attributes: healthmax, manamax, staminamax,
range, health, mana, stamina, chances of things happening When: Immediately,
Every Level, Every Turn Amount: Lots, Medium, A little Certainty: yes, % Type:
Perk, Curse

Pairings: Group 1: Attributes: max stats / range When: Immediately (amount lots,
certainty yes), Every Level (amount medium, certainty yes), Every Turn (amount
little, certainty %) Group 2: Attributes: temporary stats When: Every Level,
Every Turn Certainty: %

Examples:

```
% chance at the start of every turn to get x attribute changed
```

## 2022.12.30

I'm now confused about the updates. There's 2 folders that comes out of an
electron-forge make. One is make/squirrel.windows/x64 which is the installer
that puts the files in local appData and the other is Spellmasons-win32-x64
which seems to just be the exe (not the installer). If I ship that via steam I
can have steam manage the updates I think and it'll do delta updates. Okay, so
it looks like the `Package` step makes the executable and the `Make` step makes
an installer (so that you can distribute a single file rather than a folder with
the executable and all it's associated files). So I think I just need to run
`Package` and distribute that through steam and I can skip all the installer
stuff.
[as i suspected](https://www.electronforge.io/core-concepts/build-lifecycle) and
make step is what puts files in out/make which is where all the squirrel stuff /
installer is, but since I'm distributing via Steam I don't need that.

## 2022.12.12

Issues with current trailer:

- Cold open isn't UMPHY enough
- 2nd scene has too much deadspace
- Doesn't explain what's special about the game
- Scene 4 waits too long before player casts

---

Brad feedback for Gameplay trailer

### Plan for updates

- How to handle updates:
  - Every release should make a manefest and a bunch of assets (.js, .css, .png,
    .mp3, etc) available on the static site.
  - On every boot of the game it requests the manifest (which should be super
    quick). (make sure it never caches)
  - If the request fails or timesout (no network, etc), just run the local
    version of the game
    - Give a button to manually update, maybe it's just a super slow network and
      they should be able to manually update if they are behind version
  - Once it has the manifest, it then compares the version numbers, if the
    manifest has a greater version number it downloads all the assets in the
    manifest.
    - If full download is successful it replaces all the local assets and runs
      the game
    - if it's not, report the failure and run the game with the previous assets
  - In this way, delta updates are possible, the user wont have to "restart to
    get updates" and it will work offline.

## 2022.12.08

- game files install to: C:\Users\Jordan\AppData\Local\spellmasons
- steam files download to: C:\Program Files
  (x86)\Steam\steamapps\common\Spellmasons **Solving efficient updates**
- Requirements:
  1. it should work regardless of where a user's steam install directory is
  2. it should work on first run of the game, not needing a restart after
     downloading an update triggered by first run
- Options:
  - Pushing updates through Steam
    - This doesn't work well because Squirrel installs the game files in a
      different directory than the steam install directory and it's difficult to
      determine where the steam install directory is so communicating between
      those directories would be unreliable
  - Using Hazel or other build in electron update
    - This appears to require installing the entire app every time an update is
      pushed
    - This requires a restart after the update is installed so it doesn't
      support requirement #2
  - Having electron just render play.spellmasons.com
    - This would work like a regular website and so long as I have cache busting
      set up right it will satisfy both requirements. The disadvantage is that
      an old version will be stored on steam perminantly and users will have to
      have an internet connection when the boot up the game in order to get the
      latest update

**Boss Design** Every turn the boss creates a red portal and will teleport to it
next turn. The boss's regular casts are

- Summon
- AOE damage
- Cannot be frozen?

- When you start the level there is only a few red portals
- Stepping on one does damage to you
- One of them becomes the bossmason
- Other's become goons

- (attack logic should occur in getUnitAttackTargets so it manages
  attentionmarker visibility)
- Make sure red portals transfer any curses or modifiers to the units that spawn
  into them

---

The more "advance notice" the players get the more interesting the boss is
because they can react to it. So if you know where he's going to teleport a full
turn before you can prepare for it. If you know what mobs he's gunna consume you
can interact with them or change them. Maybe the boss could be a larger, eviler
spellmason. Maybe with emanating particles. He could teleport, spawn red portals
that are linked to each other, summon guys.

Boss aesthetic: Desaturated spellmason with eminating purple particles
Abilities:

- Consume NPCs to grow stronger
  - use "mana trail" like particles but make it a health trail
- Can teleport but broadcasts teleport location one turn early.
  - the broadcast portal should be interactable
- boss visual progression: Evolving not just changing. Research Dragonballz
- Can resurrect allies
- Can spawn "pickups" / red portals
  - red portals take you to the another red portal and disappears after use
    - maybe they hurt you when you go through them?
- Set fires that spread

## 2022.12.01

Working on dynamically loading js to ensure that the steam install stays small
for updates. Turns out that the exe output by Squirrel is actually just an
installer, not the game's exe. Once installed, the game exe is placed
`C:\Users\Jordan\AppData\Local\spellmasons\app-1.0.0` as well as all the
javascript and assets that it runs. So you can either load javascript via
Electron relative to the exe (the game not the installer) path like so:

```js
// Load javascript
const fileContents = fs.readFileSync("testDynamicImport.js", {
  encoding: "utf-8",
});
console.log("Electron: javascript", fileContents);
mainWindow.webContents.executeJavaScript(fileContents);
```

or you can put the js in
`C:\Users\Jordan\AppData\Local\spellmasons\app-1.0.0\resources\app\src\build`
and load it from js like so:

```js
// Dynamically import game scripts:
for (let url of ["./testDynamicImport2.js"]) {
  console.log("Experiment: Attempting to import 2", url);
  const script = document.createElement("script"); // create a script DOM node
  script.src = url; // set its src to the provided URL
  document.head.appendChild(script);
}
```

---

- Use transform3d functions to trigger hardware acceleration: "In essence, any
  transform that has a 3D operation as one of its functions will trigger
  hardware compositing, even when the actual transform is 2D, or not doing
  anything at all (such as translate3d(0,0,0)). Note this is just current
  behaviour, and could change in the future (which is why we don’t document or
  encourage it). But it is very helpful in some situations and can significantly
  improve redraw performance."

## 2022.09.11

Amazing git command to ammend to a previous commit
`git config --global alias.amend-to '!f() { SHA=`git rev-parse
"$1"`; git stash -k && git commit --fixup "$SHA" && GIT_SEQUENCE_EDITOR=true git rebase --interactive --autosquash "$SHA^" && git stash pop; }; f'`
from https://stackoverflow.com/a/48999882/4418836

## 2022.09.10

Was finally able to get npm link working with vite
viahttps://dev.to/hontas/using-vite-with-linked-dependencies-37n7

```
rm -rf node_modules/.vite
npm link PACKAGE

// in vite config
export default {
  // ...
  optimizeDeps: {
    exclude: ['PACKAGE']
  }
}
```

## 2022.08.02

Horizontall flip image:
`magick playerAttackSmallMagic_*.png -flop -set filename:base "%[basename]" "%[filename:base].png"`

### Blue Ocean Principle

The primary unique driver behind Spellmasons is creativity in spellcasting. So
don't get distracted by all sorts of other things like upgrades and other
roguelite elements. Focus on making the spellcasting superb!

## 2021.04.18

It's really coming alone now. Dev Phase "Gameplay Core" is essentially done.
Next will be to add more content and polish.

## 2021.03.13

Around 3 weeks of serious development into the project (around 3 montsh total)
and I had the first day where I actually had a lot of fun with it! Brad and I
played for about 20 minutes and had a great time. I think this could really turn
into a good game!

## 2022.06.02

To show original tiles:

1. ensure at least one player spawn is returned so it doesn't loop forever
2. Comment out "// Change all remaining base tiles to final tiles" section

---

The pathing only requires being inside an inverted poly if there is a single
inverted poly anywhere, if there are none, it works fine with just regular polys

## 2022.06.12

I have 8 working days until Erin and I leave on our June Trip. By that time I
think the game will be in a very good state. Major tasks I'll have done:

- Map Generation
- Liquid interaction
- New Spell Toolbar
- Stand alone server
- Server browser
- Better Menu

## 2022.06.13

tags: imageMagick reverse image Was able to horizontally flip images with the
following command:
`magick *.png -flop -set filename:base "%[basename]" "%[filename:base].png"`
