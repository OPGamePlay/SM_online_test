- Split doesn't work on yourself if you don't have 2x mana of split (Reported by Chase87)
- Russell Feedback
    - Distinguish between low/med/high perks in UI
    - Priest miniboss lost miniboss status on death
    - stamina perks not good enough?
    - "Challenge maps" specifically designed to show off specific strategies
    - Improve drown damage
    - "harvest" makes false positive prediction skulls
- idea: achievement for killing yourself with capture soul
- (unreproducable) bug: In multiplayer: target similar, damage x3 on 2 draggers
  made their position go to null null
- everyTurn perks shouldn't proc after portal has spawned
- animate bloat
- Production build said it was updated via the version number but was somehow
  running an old version:
  - save files should store version number
  - Steam says it's on the new version but it's not on the new JS
  - it said it was on the right version but it wasn't until I
    `Verified integrity of game files`
    - check cache in `C:\Users\Jordan\AppData\Roaming\Spellmasons`
  - Delay "you cannot move while casting" so if the cast is almost over it won't
    show it
- As he was clicking to change his color he spawned because he was already
  ready, changing your color should unready you
  - or delay when you can click to sapwn
  - or you can't spawn before you pick your cards
- Milestone | **Optimize game**
  - optimize graphics objects:
    - "Once a GraphicsGeometry list is built, you can re-use it in other
      Geometry objects as an optimization, by passing it into a new Geometry
      object's constructor. Because of this ability, it's important to call
      destroy() on Geometry objects once you are done with them, to properly
      dereference each GraphicsGeometry and prevent memory leaks."
    - Optimize runPredictions: especially with expanding + corpse explosion
    - repelCircleFromLine is used for both unit crowding and wall physics and
      with wall physics it doesn't need a reference to underworld, that's only
      needed for unit crowding to make sure they don't crowd each other through
      walls
    - Memory Leaks: call destroy() on any Graphics object you no longer need to
      avoid memory leaks.
    - Stress test droplets to see how many users they can support
    - Check ImmediateModeSprites for leaks
    - Support huge numbers of mobs (100? 500? 1000?)
      - Profile and figure out where the weak points are
    - Saw slowdown with "+ Radius" * 4 then Bloat, then Slice
    - updateCameraPosition is somehow taking a long time
    - copyForPredictionUnit is slow for many units
- Difficulty / Balance
  - What drives difficulty
    - Unplanned priorities
    - Lack of resources
    - Competing priorities
- Short circuit expensive runPredictions
  - Any way to make many forceMoves run asyncronously?
- Exe optimized for updates & modding?
- Dynamic difficulty?
  - Allow spawning enemies sooner based on lifetime performance?
- "How To" guides
- Satisfying end game (boss unit needed like the literal throne in Nuclear
  Throne)
  - Maybe don't introduce only one new unit each level, think of how Nuclear
    Throne does mini bosses
  - Obvious looping, maybe tint levels or something
  - tint levels just like enemies when looping??
    - See branch `loop-tint-level`
  - atmospheric effects like dust?
  - Nice camera
    - exciting akira moment
    - Cinematic boss intro
- Update music so it only changes song group once you reach a new biome
  - and so it will continue a song if the next level is in the same biome
- Add automated testing
  - Allow seeded run
  - Record actions and assert results
  - Triggering clicks:
    - https://stackoverflow.com/questions/57835535/trigger-click-event-at-x-y-coordinates-of-canvas-using-pure-vanilla-js
    - https://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript
- DevOps: Make server version update whenvever the assets subdomain updates
- Verify that there are no bugs with showUpgrades refactor 02362aa9
- For updating the app:
  - How to keep handleSquirrelEvent from aborting the update when it returns??
- UX: Zoom in is faster than zoom out
- Balance summoners so they can't summon too much long term
- could prediction pushs hook into the same function that headless uses to
  calculate pushes all at once??
- Visually change perk backgrounds so they don't look like spells
  - what if perks displayed as a horizontal card
- Unreproduced: Double spend issue with scroll pickups where if you pick one up
  while the other guy is casting and his cast kills the last mob so scrolls fly
  to you, you sometimes get to pick 2 upgrades??
  - or maybe it was just that the last kill dropped a scroll and I mistook it
    for a bug
- mana_steal health cost badge disappears if you have a shield on
- how to resolve clicking on multiple units overlapping
  - Best strategy is just to refund mana for spells that have no effect like
    mana steal or resurrect
- spellbook search bar
- If all enemies are deleted, no portal spawns
- see `// TODO does this cause an issue on headless?` in priest.ts
- how to show how much damage a queued spell will do
- cooldown instead of mana multiplier scaling
- Multiplayer voting
- Adaptive difficulty
- What to do with disconnected players when it goes to the next level?
- Fix rejoining hack where people can just rejoin if they're dead to come back
- dragger x and y went to null after "target similar, slash slash"
- Bug: When I quit it prompted brad to pick new spells
- Upgrade choosing should occur after you finish, not before you start a level.
  Maybe when you portal
- Dragger issues
  - Prediction issue: Dragger pulled me and then I got hit by people that didn't
    warn attention
  - Multiplayer: Dragger pull is desyncing
- capture soul doesn't work on Player unit
  - This is because there is no SummonSPellmason card at the moment
- UI: should be able to drag a spell off the bar to open the slot
  - see stash `allow drag card away from toolbar to dissapear it`
- [Controller Input](https://learn.microsoft.com/en-us/windows/win32/xinput/getting-started-with-xinput)
- EZ self cast, like alt clicking a spell self casts or something
- stacked unit summons should spread out
- Watch Russell Playtest
- Russell Feedback
  - Early levels in multiplayer have too few enemiesb
  - his name didn't persist
  - introduce spells more slowly
  - tell the last person they need to end their turn
  - disconnected player still shows in in-game lobby
  - doesn't save tutorial status
- frozen units start animating again after they take damage
- (solved?)bug: Multiplayer starts on tutorial level
- Update inventory gif to show book
- Russell Playtest
  - Ending turn caused a 2nd portal to appear/ or was it hovering overhimself
    with slash?
  - he went to retrieve a mana potion after the portal had spawned, I should
    remove them or something once the portal spawns
  - Attention Markers are staying behind after a unit moves
  - mana steal's health cost disappeared
- You should be able to destroy traps by attacking them
- spawning on top of a stamina or mana potion doesn't overfill in multiplayer
  - fixed? Could not reproduce 2022-11-11
- Steam description is too wordy, just tell 'em why it's awesome
- missing gold circle on player 2's feet
- bug: If server is currently in an infinite loop it won't process disconnect
  and will make the player wait when trying to exit the lobby
- Should it show the upgrade screen if you already have all the spells?
- Make sure particles like makeBurstParticles get cleaned up
- Make pickups destructable (even portal - which could spawn in at another
  location if you destroy it - aim to plesantly suprise players)
- Cannot reproduce: **movement lines are spazzing out on Chrome**
- Split summoners don't have enough mana to cast
- **Prediction error with melee on live build!!! 0.117.0**
- Keywords in descriptions should be highlighted in blue like a link and if you
  click on them it pops up an explain modal
  - Note: THis might not work since card inspect only shows up on hover
  - Entity
  - Target
  - Radius

- Blood splatter shouldn't show up in void
- bug: Scaled down units (due to split) may render z-index on top of bigger
  units that are lower than them
- bug: clone / split yielded error: 'Failed to load player because cannot find
  associated unit with ID 0'
- SPlit: Scale down blood effects for split units
- (m) Integrate freestanding obstacles (tree, urn, etc)
  - Requires pathing improvements for movable objects
- Idea: Test arena
- (h) Fix liquid glitches perminantly
  - Requires refactor of level creation
- way to see easily that you're in the portal but your teammate isnt
- Fix player moving to 0,0 and getting stuck when portal was out, see footage
  Spellmasons\footage-video\first-working-multiplayer.mp4
  - see 0:48:55 for when i get stuck post portal out of bounds
    - it looks like portal spawned on me, I went to 0,0, pickups flew too me,
      but it didn't end the game. ALSO WE HAD CLONES OUT, MAYBE THAT'S whY?
    - going through the portal again fixed it.
  - Okay it looks like my guy went through the portal cause it spawned on him
    and brad when through his portal on his screen but not on my screen (he
    wasn't close enough)
- BUG: Summoner summoned units and then they disappeared (desync)
  - could this be due to the seed and it choosing golems whose ids did not allow
    choosing
- Bug: I was dead but didn't die (visually but not stats) at timestamp 45:46
- Bug: when ally gives you a shield and you end your turn you get the "this
  spell will damage you" caution box
- Fix color contract for player lobby
- Make tests ensure that all poly functions handle maleformed polys gracefully
- Should I send a pie message everytime i need to end a players turn so we never
  end up with desynced turn state? rather than
  f3c23e59c99362c6fc9229cfc19499c3789439a6
- Optional: (M) Interactive terrain (grass spreads fire, water can be frozen to
  walk on, boulders can be destroyed)
- Potential bug: This may not be a bug once overworld is replaced with Cauldron
  but currently voteForLevel waits until all clients have voted to move on,
  however, if a client disconnects without voting, the other clients will be
  stuck until another client votes
- Potential bug: When player disconnects and reconnects, the game will call
  initializeTurnPhase and setRoute in order to reestablish the game state. This
  MAY cause issues if the game is mid turn. See
  1091b4dbb84118dd016bbba75f18a9273f1a656a for explanation.
- (M) wsPie: how to handle reconnection
  1. Reconnection when the server goes down and comes back up (loses room state)
  - This currently puts the game in a buggy state
  2. Reconnection when the client goes down and comes back up (keeps room?)
  - How to handle user joining mid stage (say during overworld or during
    underworld)?
- Restore replay
- What should happen when you clone yourself?
  - Right now the clone just attacks, but what if your soul could occupy the
    clone when you die?
- Stresstest gamestate sync:
  - If you delay messages on the backend are you sure they'll arrive in the
    right order?
- What if it was in a dungeon instead of outside so there could be rooms?
- Things to sync
  - Add syncing for units
    - when: At start of unit turn
    - position, health, mana, spell effects?
    - Send message at start of units turn which asserts RNG state and unit
      state; then all simulations calculate together
  - Underworld
    - when: ?
    - Exludes Players, Units
    - Syncing RNG
    - turn state
    - pickups
  - Players
    - when: at start of player turn
    - this will also sync upgrades
- Add tests / refactor into module for syncronous message processing to account
  for:
  - messages arriving out of order
- When a user disconnects on overworld it doesn't check if everyone has voted
  (this may not be a problem once i switch to the cauldron overworld)
- Like how dying at start of turn didn't end turn until
  24be49dfb4904bc81e683c903ffe0bdcdfc75065, maybe other death causing events
  wont end turn. Maybe I should add a check in the unit code when they take
  damage to always see if it's a player
- repelCircleFromLine doesn't handle corner cases such as vertical lines due to
  it using intersection of lines under the hood. Improve intersectionOfLines
  cornercases. I protect against this case by doing special handling of vertical
  lines in findWherePointIntersectLineSegmentAtRightAngle() which calls
  findWherePointIntersectLineAtRightAngle is the only place that uses
  intersectionOfLines
- if the host disconnects in character selection mode, the other players get
  stuck and can't choose characters
- If second client picks character first there is a bug
- Update server to send message number so clients can know when they both have
  the latest message. This'll prevent false positive desync detection
- (MAYBE ALREADY SOLVED)Address possible desync issues around projectile
  promise? same as with loading a game mid-movement
  - shouldn't this not be an issue though if loading a game happens
    synchronously?
  - maybe it should happen synchronously for the sender and then it wont be a
    problem
  - Also: desync often happens with moveTarget since moveTarget can be set mid
    way through executing a gamestate_hash check which would make the hashes not
    equal
- (VERY OPTIONAL) Some kind of visible error mechanism to show when cards don't
  apply
  - Don't let players cast fizzle spells (AOE or chain without damage)
  - Like if you cast "Protection" on yourself and then AOE it does nothing
    because there are no targets to AOE off of
  - Or if you cast cards out of order like Dicard without a card after it
- Swap still seems to be broken with chain
- Fixed i think:
  - Bug: Stuck on AI turn after archers killed resurrected golem
- Maybe I want this?? Bug: Chain targets dead units
- Every unit should always be trying to get in position to do damage
- Swap should only swap with targets, it shouldn't allow arbitrary teleportation
- Balance mana
  - To make this challenging, players should often be on the verge of no mana,
    it should feel scarce so they have to pick carefully what spells they want
    to use.
    - Maybe the answer to this is to make spells more expensive every time you
      use them
      - Branch `log2mana`
      - use log2 so it doesn't get absurdly more expensive
- Brad pickuped cards and kept playing and was later suprised at his new cards.
  Make it obvious
- I wish i could bring goons with me through the portal
- Chaining too many units crashed the game (optimize chain)
- Attack animation for cloned players is the same as the golem attack animation
  which is confusing visually
- (maybe) Chain needs a radius to show how far away chaining will occur, maybe
- Clone caused guys to spawn out of bounds
- Check security message when running docker build
- bug: had a message come through where the fromPlayer wasn't set

```
 Handle ONDATA 10 CHOOSE_UPGRADE 
Object { type: 8, upgrade: {…} }
​
type: 8
​
upgrade: Object { title: "Expanding", type: "card", thumbnail: "images/spell/spellIconExpanding.png", … }
​
<prototype>: Object { … }
networkHandler.ts:136:12
09:00:50.844
Cannot choose upgrade, either the caster or upgrade does not exist undefined 
Object { title: "Expanding", type: "card", description: description(), thumbnail: "images/spell/spellIconExpanding.png", maxCopies: 1, effect: effect(player), probability: 10, cost: {…} }
```

- Juice: it'd be cool if mage would stay in the last frame of the akira pose
  until the akira cast is done
- network problem, if the server starts while a browser is trying to connect to
  it, it will never connect even after refresh
- Brad marketing recommendations
  - Try adding 'Key Features' bullet points to store description like Into the
    Breach
  - Move the bottom coolest gif to the top
- Don't play turn end sound fx if you've already ended yoru turn
- should I clear the underworld seed on cleanup?
- sound from offscreen should be played quieter
- don't allow `save` in console to work in viewmenu because it will overwrite
  the previous save with a not fully initialized underworld
- there is a circumstance in multiplayer where a player's upgradeslefttochoose
  is 3 but they don't see the popup (happens in local)
- I think the server can get stuck in a state where it's started but doesn't
  accept connections, hard to reproduce.
  - maybe if a client is already trying to connect when it starts up?
- [unable to reproduce] swap then damage hurts yourself also, it shouldn't be
  this way it should hurt the target
- [fixed??] wsPie: There seems to be a way in which pie connects successfully
  but onConnectInfo is never called and so it never resolves
- Camera shouldn't jerk around when you die
- "Potential Cast Range" text doesn't scale when you zoom
- bug: if you save while having picked 1 of the 3 starting spells, it loads and
  shows the picker before the player is synced, so just the text is out of date
- Optimize: game slows down when there's a lot of blood on the screen and it's
  painint more
- Optimize: Save files need not save unitsPrediction
- player unit has a subsprite without an imagePath, what is it? it's saving as
  'null' and then throwing an error when it tries to load it
- Bug: Portal spawns when you prediction kill yourself on test level
- res particles
- liquid issues:
  - liquid messed up; seed: 0.6404564349842206
  - see cantwalk.png on desktop
- trap prediction bugs
- trap should be immovable?
- freeze should shield damage?
  - if frozen unit takes damage it restarts animation
- Brad feedback 2022-08-04
  - targeting mishap, see video
  - clones exploding without bloat modifier, it's like they kept the event
    somehow
  - upgrade where you gives omethng up to gain something
  - 10th toolbar space isn't filling up when you get a new spell?
  - bug: explosion radius text and some move lines left on the screen after cast
    was done
- animated trim path line for archers so it's obvious they'll hit you
- Write down Brad's feedback here
  - it should be clear that it rolls spells after you pick
  - Trap pickup radius is too big, you can't squeeze by it (spikes and trap?)
  - should take damage at the END of every turn if still in lava
  - Super poor performance on brad's laptop on level 7
    - double pull through lava make my computer's fan pickup
  - bug: resurrect leaves dangling Images behind
- Pack 16 | Colin Feedback
  - explain that you can cast any number of times per turn
  - Make spell pickups more obvious
  - vampire had attack icon while in lava but next turn got out of the lava and
    didn't attack
- what happens if you freeze liquid with a unit in it?
- shield should be visible on health bar (it's just temporary health)
- Handle error in menu when attempting to connect to a bad url
- AI should avoid traps when moving
- death circle can be confusing when moved out of the way of the toolbar (add
  arrow?)

## UI

- Bug: RMB hold on toolbar moves character. Be very careful when solving this to
  ensure you don't make clicks in the invisible part of UI elements no longer
  work
- Prevent RMB movement when mouse is over toolbar
- Disable RMB movement when upgrade screen is up

## To Explain

- explain that portal cleanses all buffs and curses
- Introduce mana cost changing of cards when used
- that all modifiers are removed after each level

## Standalone server backlog bugs

- targeting issues:
  - archer chose me over decoy that was closer???
  - Bug: decoy died and archer changed targets, make units commit to a target at
    the beginning of the round, else PLAYER FRUSTRATION
- Ensure standalone server doesn't bother running predictions
  - Unless the predictions determine their attacks from "perfect predictions"
    branch
- It's running hot for some reason
- Game waits a long time after last player has ended their turn before moving on
  to enemy turn
- headless server runs loop quickly when it has nothing to do (after i make a
  change and the clients are connecting in the other os window's space)
- is init_game_state being invoked more than once for player 2
- Fix: Move player so it doesn't use stamina because IT MUST bring them to a
  synced location if their position somehow get's out of sync
  - Desync: Due to the stamina issue I had one player in a different spot on one
    screen, then when he cast push and pushed a golem into lava the golem only
    moved and died on one screen and syncUnits didn't correct it somehow

## Perfect prediction attacks

    - I got bit by a vampire but it didn't accurately warn me he would
        - wrap this in with preventing units from changing targets from their prediction even if the decoy dies (lobber move then throw?)
    - Resurrect icon didn't show in prediction when it was buried in a trap that I pushed someone into (in prediction)
    - Units should NEVER change target from their prediction. A case where this happened is when a decoy died from other units attacking it
    - Golem attack predictions are not perfect. See branch 'perfect-predictions'
    - Known issues:
        - push predicted taht a lobber would fall in lava and die but it didn't
            - that same lobber when resurrected just crawled over lava so it must've been inside but just didn't take the damage

## feedback might be won't do:

    - hoisting might not be desireable, what if you want to push then AOE?
    - Colin Direct Feedback:
        - some enemies chould shoot walls to blow yoru cover
        - add moodiness, make it darker
        - pickup potions
        - fun figuring out mechanics
        - felt like rinse and repeat
        - new to genre
        - QWERTASDFG for hotkeys
        - More exciting if archers had a % chance based on distance
        - physics based env:
            - drop corpse in lave and have it shoot out lava
            - bloat gore schrapnel
                - gore ended up on other characters
                - gore on them from being next to explosion
                - gore on walls, leave a mark
                    - blood trail
        - fog of war
        - what if no agro until you got close so you can't just wait for them all to come to you
        - archer arroes hurt allies as it passes through. % chance. multiple types of archers

- Lochlan feedback
  - ding sound design when "leveling up"
  - purified vampires shouldn't spread bloodcurse
  - bloodcurse show as 18+18/36
- Brad feedback
  - Add a glow on hover to spells in spellbook
  - Ambiance, particles around the map
  - precast animations, when you hover over a corpse with resurrect, white
    particles should come up from the ground
- Pack 9 | R, J & E feedback
  - No stamina bar after portal
  - Freeze spell should stop timer on pickups (or just increase it by 1)
  - Hover should always show tooltip so you can see even when spell is queued
  - shield should have number on it
  - ideas
    - Have push and pull from the start
    - objects to hide behind (raise earth)
    - More objects to interact with

---

- Particle engine
  - add pixelated filter, see stash
  - OR use a pixelated source image instead of a pixelated filter
  - It's the framerate that makes it jarring
- Standalone Server
  - Add "preparing" animation used to reduce desyncs due to network latency, so
    that if multiple users are casting spells at the same time, the wizard
    bending down to "charge" as soon as the current user clicks, masks a delay
    to make sure it doesn't conflict with other spells. It'll send the spell
    over the network as soon as the user clicks but waits to cast it so that
    there aren't conflicting spells making desyncs on multiple clients.
  - Server should be able to send syncs that will wait to execute until turn
    changes so it doesn't interrupt animations and mess up the state when it
    syncs
- how to attach priest spell hit animation to moving ally?
- Finish force movement refactor (see stash)
  - When they stop when they hit walls they need to stop hard, not slid into
    them
  - They go too far into walls
  - take damage when hitting walls (add blood splatter)
- bug: AOE is giving me "no target" when I click on ground (hurtx4,aoe,hurt)
  - rather than "no target" maybe it just doesn't use mana and shows a fizzle
    animation?
  - It's giving "no target" because of the first hurt
- bug: push doesn't go as far as expected if CPU is slowed down
- Don't let RMB movement interrupt cast animation
- Investigate webgl context was lost
- Fix: bad-pathing.mkv in videos folder
  - seed: 0.6450583331398443
- priest is attacking /dealing damage to him but he's not a vamp. how?
- bug: Game didn't go to game over when i died by walking into spikes
  - Implement better game over handling. be careful to not trigger game over too
    early. for example: A units spell might resurrect itself after dying
- dad assumed vampire bite would deal damage
  - resolved with new wording? ask
- Loch feedback: Show all the places you could move by sample size. and shade in
  an area
- Controls could show on escape menu instead of always
- Add "modifier" label to spells that are modifiers like "explode / bloat" and
  blue outline
- (COULDN"T REPRODUCE) Just shielded unit died when i cast one hurt on him (he
  already had one shield that I worked through before)
- (COULDN"T REPRODUCE) Loading screen doesn't appear between levels
- (COULDN"T REPRODUCE) Bug: I only have 6 toolbar slots showing up (empty ones
  don't show)
  - and when I got bitten by a vampire it didn't add "bite" to a new slot (only
    to my inventory)
- DON'T PREMATURELY OPTIMIZE. BACKLOG THIS. Refactor castCards to target unit
  Ids over the network instead of positions to reduce desync issues. Maybe play
  all targeting cards and THEN send the CAST message? But what if they are mixed
  in? not sure how to handle this. Maybe the cast message sends the effect of
  the cast (e.g. poison this guy, push this guy from here to here, set this
  guy's health to this, etc, rather than the cards).
- Ensure trap pickups work after load, they probably done
- The zoom coordinates off issue between multiplayer sessions when casting
  - hit on one screen, miss on another
  - Related? Brad cast a spell out of range, but it still triggered on my screen
- verify do subsprites persist after serialization save/load?
- How to show when a unit has the vampire modifier
- Fix host alt-tabbing issue
  - This will be fixed with standalone server
- pointInSameDirection returned true in getParametricRelation for perpendicular
  lines
- bug: You can spawn on a pickup such as spikes
  - couldn't reproduce
- "maximum shield" shows a bunch of times on hover if casting the spell would
  give them map
- TODO: Split up runPredictions so that it only checks canAttackTarget after
  units have moved, not every loop
  - Sync prediction units every loop is a waste too if nothing changes
    - This could be optimized so it only recalcs if a unit moves or if the cast
      target or cast cards change
- When players rejoin in progress game, skip character pick screen
- Maybe solved already? Pathing, see stash "pathfinding"
  - this.seed = '0.9408533248276452';
  - Somehow duplicate points are getting added to path
  - Fix optimize to consider P1 inside angle too
- bug: while messing with forcing desync, player got stuck with red shader on
- I saw deny.png on target when i did in fact have enough mana
- Figure out how to host server locally to be reached via the internet
  - [dedicated server](https://help.steampowered.com/en/faqs/view/6F46-9698-9682-8DB8)
- wspie:
  https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
- Stress test upping limit for "couldn't find path in enough steps". If it's not
  high enough, some units will just not move when they attempt to move to a
  target that is too complex to path to.
  - Maybe find a way to remove bad paths before the correct one is found?
- **Ask for audio permissions from FF?**
  - May have to trigger it by clicking on a button
- Does pathing information persist after save/load?
- Potential problem where I killed snowpack and left 2 tabs open (and left wsPie
  open) and my browser was really struggling to load homedepot.com
- Rachels screen was too small and the cards overlapped the grid
- "Mind control" spell, changes their faction temporarily?
- Bug: Loading doesn't work if clientIds have changed reassigning clientIds
- Rachel's Feedback
  - Slay the Spire style chests
  - Two stage levels? Pull a lever to reveal a portal
    - trap doors? Environmental interactions
      - Blow up a square to make it lava
- how to set pixi resolution?
- Heavily test auto reconnect when pie gets disconnected
  - Prevent user input while reconnecting?
  - Will it support reconnecting multiple players if the whole server goes down?
- Could I do without the external port checker and check from the current client
  via the external ip?
- should unit.die cause player turn to end?
  - or is it fine that this is handled after castCards?
- Should ending turn always go over the network to prevent desyncs?
- A way to change sprite without interrupting animations midway?
  - For example: This occurs when a unit dies while it's attacking
- Rachel request: Support click and drag for queued cards
- Brad request: Allow keybind customization
- What about a prisoner AI that you can unleash, or traps that you can unlease
  in a line
- enemies should not be able to be on the portal
- **Convert console.error(s) to Sentry.captureException?? before deployment**
- let our faction of AI go before enemy units go
- Swapping should only work with a target, not an empty spell
- quality of life: If you click on the portal and no enemies remain, then auto
  move there
- Refactor, card UI reconciliation algorithm is slow
- Swap can have unexpected effects if the aoe swap targets overlap with the
  caster original location, units may end up in an unexpected position, need
  batching to solve this
- How do players know what their upgrades are
- why do we keep accidentally ending our turns (force of habit with spacebar
  being used in auto chess?)
- You get "cannot move more than once per turn" while spell animations are
  firing
- Celebratory damage counter for huge combos!
- Event manager for granting dark card when you slay ally
- Bug: Verified, when I alt tab it desyncs
- Fix sometimes Game.playerTurnIndex is out of sync
  - Maybe this happened because I was alt-tabbed when he took his turn
- Fix replay?
  - This should be easy now that onDataQueue has been restored
- Taunt totem
- Tile effects
  - Lava
  - Tree
  - Burn
  - Poison
- Add "Dark" cards for killing an ally
  - Sacrifice
    - Lose 3 cards at random for health
  - Obliterate
    - Sends everything in range into the void (has a special effect on portals -
      secret level)
  - Corrupt
- OMA asked for cooperative AI to play with
