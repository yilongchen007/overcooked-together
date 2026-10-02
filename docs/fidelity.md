# References and implementation boundaries

This is an independent research prototype inspired primarily by Overcooked! 2. It is not an official game, an asset port, or an equivalent implementation of an existing benchmark. Every scene is labeled as an adapted layout.

## Sources

- [Team17 overview](https://www.team17.com/news/the-a-z-of-overcooked-2) and [official Steam listing](https://store.steampowered.com/app/728880/Overcooked_2/): game context, cooperation, and recipe variety.
- [Level 1–2 reference](https://overcooked.fandom.com/wiki/1-2_(Overcooked!_2)): sushi ingredients, boards, pots, and supply arrangement. This is community documentation, not a developer specification.
- [Level 2–6 reference](https://overcooked.fandom.com/wiki/2-6_(Overcooked!_2)) and [illustrated gameplay walkthrough](https://mip.ali213.net/gl/html/258707_15.html): burgers, divided work areas, and the central turntable.
- [Level 3–1 reference](https://overcooked.fandom.com/wiki/3-1_(Overcooked!_2)) and [gameplay account with original recipe tutorial screenshots](https://coublood.hatenablog.com/entry/2020/07/11/180000): moving boards and the sequence of preparing dough, tomato, and cheese, assembling them, then baking. Screenshots were consulted for verification and are not distributed with this project.
- [Cheese reference](https://overcooked.fandom.com/wiki/Cheese): cheese preparation in burgers and pizza.
- [Original designer on cooperative play](https://www.gamedeveloper.com/design/game-design-deep-dive-building-truly-cooperative-play-in-i-overcooked-i-): how layouts shape responsibilities and teamwork.
- [Collab-Overcooked](https://github.com/YusaeMeow/Collab-Overcooked): a reference for cooking tasks and multi-agent interaction. Its runtime implementation was not copied. Direct compatibility with its prompts, actions, or Gym interface is not guaranteed.

Some external references are written in Chinese or Japanese. Project documentation and the application interface are in English.

## Retained cooking procedures

| Recipe | Displayed ingredients | Procedure enforced by the engine |
|---|---|---|
| Fish Sushi | Fish + Rice + Nori | Slice fish; boil rice; combine with nori on a plate |
| Burger | Beef + Bun | Chop and fry beef; combine with a bun on a plate |
| Cheeseburger | Beef + Bun + Cheese | Chop and fry beef; chop cheese; assemble and plate |
| Cheese Pizza | Dough + Tomato + Cheese | Prepare all three; assemble an unbaked pizza; bake; plate |

Item states and station constraints enforce these procedures. Default policy observations omit the third column, required target states, and dependency graphs. Set `procedure=True` to explicitly supply oracle procedure information. Pretrained language models may already associate recipe names with preparation knowledge; that is a separate source of prior information to account for in experiments.

## Adaptations and simplifications

1. All scenes use a 13 × 9 grid rather than exact original geometry. Sushi retains central ingredient supplies and omits pedestrians. Burger adds explicit dividing walls to ensure two disconnected floor regions. This is a verifiable experimental manipulation, not a claim of geometric equivalence to the original.
2. The turntable advances one slot every 60 ticks and carries food with it, but does not move chefs. Pizza boards switch sides every 80 ticks and delay movement if a destination is occupied by a chef. Continuous physics, falling, and complex room partitions are omitted.
3. Burger and pizza return dirty plates; sushi returns clean plates. Each kitchen starts with four plates and does not replenish them indefinitely. Ingredient dispensers provide unlimited raw ingredients.
4. Each chef carries one object at a time, which may contain combined ingredients or a plate. Pots, pans, and ovens stay at their stations. Carrying cookware, pouring between pots, throwing, and dashing are omitted.
5. One `work` action starts continuous chopping or washing; movement or interaction interrupts it. Two chefs working at one station do not stack processing speed.
6. Heating takes time, and unfinished food cannot be retrieved early. Food eventually burns and must be discarded. Spreading fire, extinguishers, and respawning are not simulated. Unbaked pizza must be baked before plating; removing unbaked pizza from a plate is not supported.
7. Assembly accepts valid ingredient/state subsets from the global recipe vocabulary, including partial assemblies, independently of current orders. Arbitrary mixtures are not supported, and incompatible combinations do not create undefined dishes.
8. Time is scaled. Every kitchen starts its timer when play begins, rather than reproducing levels whose timer begins after the first delivery. Orders have fixed deadlines, seeded sampling, and simple delivery scores. Stars, tips, and the original penalty system are omitted.
9. Both chefs have identical skills. Fixed responsibilities arise from paths and station access. Burger supports `role_mode="flexible"` by removing dividing walls, and starting positions can be exchanged. Shared kitchens permit role changes without guaranteeing that all divisions of labor are equally efficient.
10. Browser click navigation and scripted partners are demonstration helpers. The MARL interface uses joint primitive actions, with no hidden action that completes an entire recipe.

This version supports validating task solvability, information boundaries, role structures, and policy interfaces. A complete research benchmark still requires more recipes, audited task splits, and independently trained teammates.
