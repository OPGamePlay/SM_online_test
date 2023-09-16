# Tasks
- Fix attention markers for frozen units, they shouldn't have them
- Shield and vulnerable combine in weird ways, shield is only aware of the predamage damage
- Make all units properly orient to face their enemy
    - Don't handle this logic in unique unit action fns
---
Game breaking bugs
- Cannot read properties of bounds of undefined
- Branch is undefined
    - this.seed = '0.02406939508462913';
---
Priorities
- Redo colors: Red should always mean danger
    - LOS line from archers for example
---
- bug: Prevent casting underneath selected cards when click, move, release on selected cards
- If you cast a spell while another spell is still in progress you can go negative mana
- Better Pathfinding
- More spells
    - push / pull
    - stomp
    - haste
    - split: clone & half stats
    - buf: +mana regen
    - buf: +health regen
    - trap
    - summon
    - stealth
    - root: like freeze but allows attack and does DOT
    - confuse: changes faction for 1 turn
    - fear: make flee
    - stone: turn to stone
    - mute: Prevent casting
    - barrier: summons a blockade with health
- More pickups
    - Antidote
- Spell upgrades
- fix protection spell to make it easier to understand 'hoist it?'
---
Matt Feedback
- Trying to join multiplayer for first time puts you in tutorial instead of their game
- Exclamation mark over AI (or at edge of screen if unit off screen) that can hurt you.
- Tut 3 is confusing, give more direct instructions don't make it a puzzle
    - Explain red ring kill blow
    - Explain how spells get more expensive
    - Explain how you get more mana
---
- Infinite loops seems to be occurring for "bounds" but not for pathing walls for some reason.
    - could the expansion be preventing the infinite loop somehow??
- Bug: Summoners don't move very far when they're running away
- Bug: Two demons may target the same corpse
- Bug: left position is messed up for mana bar 2
    - 125/85 + 30 /turn and it only shows a sliver of purple
    - Can't reproduces
- Improve unit movement and collisions
    - If a unit hasn't moved in a while due to collision, it makes the user wait until the timeout
- Bug: After you make it through the tutorial you can still select "skip tutorial" in the menu, which then breaks the game
    - I see a map but all the unit images are gone
- Bug: Upgrade screen shows after tutorial
- Visual: Wall tiles also need to "descent" into the abyss if a void tile is beneath them; see seed '0.8728849452582129';
- **!**Bug: Different zoom levels resulted in spell miss on one screen but not on another

- Map bounds are off for handcrafted level
- Reverify: Bug: Golems can attack through walls if they are just beyond a corner
- BUG: When branch is undefined occurs it should automatically regen the whole level
- sequential fireballs should be one big fireball!
---

- portal appears when last unit is killed
- Marketing
    - Gameplay video for homepage
    - Start tweeting releases
    - Add timeline to homepage

---
- auto exit level
- archers should path to line of sight
- note: mana is moot if you can 1 shot everything
- hotkeys don't work for numpad
    - Proof?
- some levels are hard cause there's no one to steal mana from
- don't make "your turn" floating text ordered, it gets clogged up
- 5 AOE causes perf issues
    - test on worse computers
- Write code that looks for desyncs and reports them but doesn't try to correct them
### 2022-04-05
- Had an interesting observation where units persisted between reset.  Killing self with one health left when I had cast two damage.
    It reset the level  as soon as i died but the spell continued to fire
- revisit: 2e6c3218dd1608d45ad8a4551c13eda2ac2e3f2e 
    - maybe there's a better way to do it
### 2022-04-01 Brad/Jake playtest
- Songs should all be same volume
- Continuing in the direction you clicked to move (automove)
- Desyncs:
    - Desync occurred while I was alt tabbed
    - Desync caused turns to get messed up (it just didn't update the top bar)
    - Somehow Jake started the game while Brad was still looking at upgrades and it showed the game behind
        - AND it went back to the previous level with the dead mobs still there
        - could this be due to desync messages? Since the route is part of underworld, it may have overridden the other client
- "auto next level" if there's nothing left to do
- Clone disconnected units can move around as AI but still show as disconnected
- Jake: needs unit collision
- Brad: Alternate who goes first

### 2022-03-31
- Solve for spawning mid game, including cloning (how to prevent spawning in a no walk zone)
    - Handle when there aren't enough spaces to spawn for players more gracefully
    - ~~How to init players that join mid game?~~
    - Why can't a player that joins mid game see disconnected players?
## Tasks
- Bug: You can still select enemies and things with a spell up if the spell's left click doesn't cast the spell (such as AOE then nothing)
- Character select: "waiting  for other players"
---
- Bug: You can swap into obstacles
- Dad:
    - Missing spell projection overlay
    - Doesn't know what the circle means when clicking on enemies
    - Don't let me put more cards down than i can afford

Finish Content:
- More spells:
    - More types of damage cards, maybe with more synergies
        - Like ones that interact with freeze
    - Haste modifier lets you move farther and slow
    - Spells that summon walls or pillars to prevent enemy movement (maybe to trap them)
    - Push spells (requires collisions)
        - If you push a unit into a portal they appear in the next level
    - Fix charge, stomp, lance
        - Movement spells could help you cast farther than you should be able to and move a far unit into another group and chain them, cause it should keep the target after they move
    - soul swap (swap bodies with another unit, until they die, then you return to your own body - and you get their abilities as cards)
    - Jake Ideas:
        - Magnetize (pull enemies together)
        - Reflect
        - Putting spells on the ground. DOTs, AOE fields
        - Debuffs
        - Explosive on an enemy and when he dies it procs
        - Jake: 'yoink' takes a card from another unit
- Jake overall thoughts:
    - Let players pick from 3 starting cards so run is always different
    - Different ways of doing damage
- Jake: What if there's a random encounter on some levels where it's a card forge
    - In between levels choose "get a new card" or "upgrade a card"
- Brad: opportunity to make spells more powerful
- Brad: I wish you could take goons with you
    - What if allies just come with you to next level
        - would have to disable summoner after all mobs die