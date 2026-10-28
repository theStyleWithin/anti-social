/* Starter recipes, written for Anti-Social. Ingredients are [amount, unit, text, 'p' if it is a pantry staple].
   "egg|eggs" means singular|plural. Amount 0 means no number ("to taste"). */
(() => {
  const R = (id, n, c, k, r, t, s, i, d) => ({ id, n, c, k, r, t, s, i, d });
  window.Cookbook = [
  /* ---------------- American: breakfast and baking ---------------- */
  R('pancakes', 'Buttermilk Pancakes', 'Breakfast', 'American', 'Diner', 25, 4, [
    [2, 'cup', 'all-purpose flour'], [2, 'tbsp', 'sugar'], [2, 'tsp', 'baking powder', 'p'], [1, 'tsp', 'baking soda', 'p'], [0.5, 'tsp', 'salt', 'p'],
    [2, 'cup', 'buttermilk'], [2, 'egg', 'egg|eggs'], [4, 'tbsp', 'melted butter, plus more for the pan'], [0, '', 'maple syrup, to serve']], [
    'Whisk the flour, sugar, baking powder, baking soda and salt in a large bowl.',
    'In another bowl whisk the buttermilk, eggs and melted butter. Pour into the dry ingredients and stir only until combined. A few lumps are fine; let the batter rest 5 minutes.',
    'Heat a griddle or large skillet over medium heat and brush with butter.',
    'Pour about 1/4 cup of batter per pancake. Cook until bubbles form and the edges look set, 2 to 3 minutes, then flip and cook another 1 to 2 minutes until golden.',
    'Keep warm in a 200°F (95°C) oven while you cook the rest. Serve with butter and maple syrup.']),
  R('french-toast', 'Classic French Toast', 'Breakfast', 'American', 'Diner', 20, 4, [
    [4, 'egg', 'egg|eggs'], [1, 'cup', 'milk'], [1, 'tbsp', 'sugar'], [1, 'tsp', 'vanilla extract'], [0.5, 'tsp', 'ground cinnamon', 'p'], [1, 'pinch', 'salt', 'p'],
    [8, 'slice', 'thick-cut bread (day-old is best)'], [3, 'tbsp', 'butter'], [0, '', 'maple syrup and berries, to serve']], [
    'Whisk the eggs, milk, sugar, vanilla, cinnamon and salt in a shallow dish.',
    'Melt a little butter in a large skillet over medium heat.',
    'Dip each bread slice in the egg mixture for about 10 seconds per side, so it soaks in without falling apart.',
    'Cook 2 to 3 minutes per side until deep golden and cooked through. Add butter to the pan between batches.',
    'Serve hot with syrup and berries.']),
  R('biscuits-gravy', 'Biscuits and Sausage Gravy', 'Breakfast', 'American', 'Southern', 45, 6, [
    [2.5, 'cup', 'all-purpose flour, plus extra for dusting'], [1, 'tbsp', 'baking powder', 'p'], [1, 'tsp', 'sugar'], [0.75, 'tsp', 'salt', 'p'], [0.5, 'cup', 'cold butter, cubed'], [1, 'cup', 'cold buttermilk'],
    [1, 'lb', 'breakfast sausage'], [3, 'tbsp', 'all-purpose flour (for the gravy)'], [2.5, 'cup', 'whole milk'], [0.5, 'tsp', 'black pepper', 'p'], [0, '', 'salt, to taste', 'p']], [
    'Heat the oven to 450°F (230°C). Mix the flour, baking powder, sugar and salt. Cut in the cold butter with your fingertips until it looks like coarse crumbs.',
    'Stir in the buttermilk until a shaggy dough forms. Pat it out on a floured surface about 1 inch thick, fold it over once or twice, and cut out rounds with a floured cutter. Do not twist the cutter.',
    'Bake close together on a baking sheet for 12 to 15 minutes until tall and golden.',
    'Meanwhile brown the sausage in a large skillet, breaking it up, until cooked through (160°F / 71°C). Do not drain; sprinkle the 3 tablespoons flour over it and stir for 1 minute.',
    'Slowly stir in the milk. Simmer, stirring, until thick, 5 to 7 minutes. Season with pepper and salt.',
    'Split the biscuits and spoon the gravy over them.']),
  R('blueberry-muffins', 'Blueberry Muffins', 'Bread & Baking', 'American', 'Bakery', 40, 12, [
    [2, 'cup', 'all-purpose flour'], [0.75, 'cup', 'sugar'], [2, 'tsp', 'baking powder', 'p'], [0.5, 'tsp', 'salt', 'p'], [1, 'egg', 'egg|eggs'], [0.75, 'cup', 'milk'],
    [0.33, 'cup', 'vegetable oil', 'p'], [1, 'tsp', 'vanilla extract'], [1.5, 'cup', 'blueberries, fresh or frozen'], [2, 'tbsp', 'coarse sugar, for the tops']], [
    'Heat the oven to 400°F (200°C) and line a 12-cup muffin tin with paper liners.',
    'Whisk the flour, sugar, baking powder and salt. In another bowl whisk the egg, milk, oil and vanilla.',
    'Pour the wet into the dry and stir just until combined. Fold in the blueberries.',
    'Divide among the cups, filling them nearly full, and sprinkle with coarse sugar.',
    'Bake 18 to 22 minutes until a toothpick comes out clean. Cool 5 minutes in the tin, then on a rack.']),
  R('hash-browns', 'Crispy Skillet Hash Browns', 'Breakfast', 'American', 'Diner', 30, 4, [
    [2, 'lb', 'russet potatoes, peeled'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'], [4, 'tbsp', 'butter or oil for frying']], [
    'Shred the potatoes on a box grater. Rinse in cold water until it runs mostly clear, then wring them out in a clean towel until very dry. This is what makes them crisp.',
    'Toss with salt and pepper. Heat half the butter in a large nonstick or cast-iron skillet over medium-high heat.',
    'Spread the potatoes in an even layer and press down. Cook without stirring 6 to 8 minutes until the bottom is deep golden.',
    'Flip in sections, add the remaining butter around the edges, and cook another 5 to 6 minutes until crisp and tender inside.']),
  R('denver-omelet', 'Denver Omelet', 'Breakfast', 'American', 'Diner', 15, 1, [
    [3, 'egg', 'egg|eggs'], [1, 'tbsp', 'milk'], [1, 'tbsp', 'butter'], [0.25, 'cup', 'diced ham'], [2, 'tbsp', 'diced green bell pepper'], [2, 'tbsp', 'diced onion'], [0.25, 'cup', 'shredded cheddar'], [0, '', 'salt and pepper', 'p']], [
    'Melt half the butter in a nonstick skillet over medium heat. Cook the ham, pepper and onion 3 to 4 minutes until soft, then set aside.',
    'Whisk the eggs with the milk, salt and pepper.',
    'Melt the remaining butter in the pan, pour in the eggs, and let them set at the edges. Lift the edges with a spatula and tilt the pan so the raw egg runs underneath.',
    'When the top is almost set, spoon the filling and cheese over one half, fold the other half over, and slide onto a plate. Eggs should be cooked firm.']),
  R('banana-bread', 'Banana Bread', 'Bread & Baking', 'American', 'Home baking', 75, 10, [
    [3, 'ripe banana', 'very ripe banana|very ripe bananas'], [0.33, 'cup', 'melted butter'], [0.75, 'cup', 'sugar'], [1, 'egg', 'egg|eggs'], [1, 'tsp', 'vanilla extract'], [1, 'tsp', 'baking soda', 'p'], [1, 'pinch', 'salt', 'p'], [1.5, 'cup', 'all-purpose flour']], [
    'Heat the oven to 350°F (175°C) and grease a 9x5-inch loaf pan.',
    'Mash the bananas in a large bowl. Stir in the melted butter, then the sugar, egg and vanilla.',
    'Sprinkle the baking soda and salt over the batter and stir in. Add the flour and mix until just combined.',
    'Pour into the pan and bake 55 to 65 minutes until a toothpick in the center comes out clean. Tent with foil if the top browns too fast.',
    'Cool 10 minutes in the pan, then turn out onto a rack.']),
  R('cornbread', 'Skillet Cornbread', 'Bread & Baking', 'American', 'Southern', 35, 9, [
    [1, 'cup', 'yellow cornmeal'], [1, 'cup', 'all-purpose flour'], [2, 'tbsp', 'sugar'], [1, 'tbsp', 'baking powder', 'p'], [0.75, 'tsp', 'salt', 'p'], [1, 'cup', 'buttermilk'], [2, 'egg', 'egg|eggs'], [4, 'tbsp', 'butter, melted, plus 1 tbsp for the pan']], [
    'Put a 10-inch cast-iron skillet in the oven and heat it to 425°F (220°C).',
    'Whisk the cornmeal, flour, sugar, baking powder and salt. Whisk the buttermilk, eggs and melted butter in a second bowl, then stir the two together just until combined.',
    'Carefully take the hot skillet out, add the extra tablespoon of butter and swirl to coat. Pour in the batter; it should sizzle.',
    'Bake 18 to 22 minutes until golden and a toothpick comes out clean. Serve warm.']),
  /* ---------------- American: mains ---------------- */
  R('cheeseburger', 'Classic Cheeseburgers', 'Mains', 'American', 'Backyard', 25, 4, [
    [1.5, 'lb', 'ground beef (80% lean)'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'], [4, 'slice', 'American or cheddar cheese'], [4, 'bun', 'hamburger bun|hamburger buns'], [0, '', 'lettuce, tomato, onion, pickles, ketchup, mustard, to serve']], [
    'Divide the beef into 4 loose balls and flatten each into a patty about 3/4 inch thick and a little wider than the bun. Press a shallow dimple in the middle of each so they stay flat.',
    'Season the outsides with salt and pepper just before cooking.',
    'Cook on a hot grill or skillet 4 to 5 minutes per side until the center reaches 160°F (71°C). Add the cheese in the last minute and cover so it melts.',
    'Toast the buns cut side down for 1 minute. Build with your toppings.']),
  R('meatloaf', 'Classic Meatloaf', 'Mains', 'American', 'Comfort food', 80, 6, [
    [2, 'lb', 'ground beef'], [1, 'onion', 'onion|onions, finely diced'], [0.75, 'cup', 'breadcrumbs'], [0.5, 'cup', 'milk'], [2, 'egg', 'egg|eggs'], [2, 'tbsp', 'Worcestershire sauce'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'],
    [0.5, 'cup', 'ketchup'], [2, 'tbsp', 'brown sugar'], [1, 'tbsp', 'apple cider vinegar']], [
    'Heat the oven to 350°F (175°C). Soak the breadcrumbs in the milk for 5 minutes.',
    'Mix the beef, onion, soaked crumbs, eggs, Worcestershire, salt and pepper gently with your hands. Do not overwork it.',
    'Shape into a loaf on a foil-lined baking sheet, or press into a 9x5-inch loaf pan.',
    'Stir the ketchup, brown sugar and vinegar together and spread half over the top.',
    'Bake 50 minutes, spread on the rest of the glaze, and bake 10 to 15 minutes more until the center reads 160°F (71°C).',
    'Rest 10 minutes before slicing.']),
  R('fried-chicken', 'Southern Fried Chicken', 'Mains', 'American', 'Southern', 75, 6, [
    [3.5, 'lb', 'chicken pieces, bone-in (thighs, drumsticks, breasts cut in half)'], [2, 'cup', 'buttermilk'], [1, 'tbsp', 'salt', 'p'], [2, 'cup', 'all-purpose flour'], [2, 'tsp', 'paprika', 'p'], [1, 'tsp', 'garlic powder', 'p'],
    [1, 'tsp', 'black pepper', 'p'], [1, 'tsp', 'salt (for the flour)', 'p'], [0.5, 'tsp', 'cayenne pepper', 'p'], [0, '', 'vegetable oil for frying (about 1 1/2 inches deep)', 'p']], [
    'Toss the chicken with the buttermilk and 1 tablespoon salt. Cover and refrigerate at least 2 hours, or overnight.',
    'Mix the flour, paprika, garlic powder, pepper, salt and cayenne in a wide dish.',
    'Heat the oil in a heavy Dutch oven or deep skillet to 325°F (165°C). Check it with a thermometer.',
    'Lift each piece out of the buttermilk, let the excess drip off, and press firmly into the flour to coat. Rest on a rack 10 minutes so the coating sticks.',
    'Fry in batches, not crowding the pot, turning once, about 12 to 15 minutes for thighs and drumsticks and 10 to 12 for breast pieces. Keep the oil between 300 and 325°F (150 to 165°C).',
    'The chicken is done when the thickest part reads 165°F (74°C) and the juices run clear. Drain on a rack, not paper towels.']),
  R('mac-cheese', 'Baked Macaroni and Cheese', 'Mains', 'American', 'Comfort food', 55, 8, [
    [1, 'lb', 'elbow macaroni'], [4, 'tbsp', 'butter'], [0.25, 'cup', 'all-purpose flour'], [3, 'cup', 'whole milk, warmed'], [1, 'tsp', 'dry mustard', 'p'], [0.5, 'tsp', 'paprika', 'p'], [4, 'cup', 'shredded sharp cheddar (about 1 lb)'],
    [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'], [0.75, 'cup', 'breadcrumbs'], [2, 'tbsp', 'melted butter (for the topping)']], [
    'Heat the oven to 350°F (175°C). Boil the macaroni 2 minutes less than the package says, drain, and set aside.',
    'In a large pot melt the 4 tablespoons butter, whisk in the flour, and cook 1 minute. Slowly whisk in the warm milk. Simmer, stirring, until thickened, about 5 minutes.',
    'Off the heat stir in the mustard, paprika, salt, pepper and 3 cups of the cheese until melted. Fold in the pasta.',
    'Pour into a buttered 9x13-inch dish. Top with the remaining cheese. Toss the breadcrumbs with the melted butter and scatter over.',
    'Bake 25 to 30 minutes until bubbling and golden. Rest 5 minutes.']),
  R('pot-roast', 'Beef Pot Roast', 'Mains', 'American', 'Comfort food', 240, 6, [
    [3, 'lb', 'beef chuck roast'], [2, 'tsp', 'salt', 'p'], [1, 'tsp', 'black pepper', 'p'], [2, 'tbsp', 'vegetable oil', 'p'], [1, 'onion', 'onion|onions, thickly sliced'], [3, 'clove', 'garlic clove|garlic cloves, smashed'], [2, 'tbsp', 'tomato paste'],
    [1, 'cup', 'beef broth'], [1, 'cup', 'red wine or more broth'], [4, 'carrot', 'carrot|carrots, cut in chunks'], [1.5, 'lb', 'small potatoes, halved'], [3, 'sprig', 'fresh thyme']], [
    'Heat the oven to 300°F (150°C). Pat the roast dry and season all over with salt and pepper.',
    'Heat the oil in a Dutch oven over medium-high heat and brown the roast well on all sides, about 10 minutes. Set it aside.',
    'Cook the onion in the pot 5 minutes, add the garlic and tomato paste for 1 minute, then pour in the wine and broth, scraping up the browned bits.',
    'Return the roast, add the thyme, cover, and bake 2 hours. Add the carrots and potatoes around the meat and bake 1 to 1 1/2 hours more until the meat is fork-tender.',
    'Rest the meat 10 minutes, then slice or shred. Spoon the pan juices over it.']),
  R('chicken-pot-pie', 'Chicken Pot Pie', 'Mains', 'American', 'Comfort food', 90, 6, [
    [2, 'pie crust', 'refrigerated pie crust|refrigerated pie crusts'], [4, 'tbsp', 'butter'], [1, 'onion', 'onion|onions, diced'], [2, 'carrot', 'carrot|carrots, diced'], [2, 'stalk', 'celery stalk|celery stalks, diced'], [0.33, 'cup', 'all-purpose flour'],
    [1.5, 'cup', 'chicken broth'], [0.75, 'cup', 'milk'], [3, 'cup', 'cooked chicken, shredded or cubed'], [1, 'cup', 'frozen peas'], [0.5, 'tsp', 'dried thyme', 'p'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'], [1, 'egg', 'egg|eggs, beaten, for brushing']], [
    'Heat the oven to 400°F (200°C). Fit one crust into a 9-inch deep pie dish.',
    'Melt the butter in a large pot and cook the onion, carrot and celery 6 to 8 minutes until soft. Stir in the flour for 1 minute.',
    'Slowly stir in the broth and milk and simmer until thick, about 5 minutes. Add the chicken, peas, thyme, salt and pepper.',
    'Pour the filling into the crust, cover with the second crust, pinch the edges to seal, and cut a few slits in the top. Brush with the egg.',
    'Bake on a baking sheet 35 to 40 minutes until deep golden and bubbling. Cool 15 minutes before cutting.']),
  R('sloppy-joes', 'Sloppy Joes', 'Mains', 'American', 'Weeknight', 30, 6, [
    [1.5, 'lb', 'ground beef'], [1, 'onion', 'onion|onions, diced'], [1, 'green bell pepper', 'green bell pepper|green bell peppers, diced'], [2, 'clove', 'garlic clove|garlic cloves, minced'], [1, 'cup', 'ketchup'], [2, 'tbsp', 'brown sugar'],
    [1, 'tbsp', 'Worcestershire sauce'], [1, 'tbsp', 'yellow mustard'], [1, 'tbsp', 'apple cider vinegar'], [0.5, 'tsp', 'salt', 'p'], [6, 'bun', 'hamburger bun|hamburger buns']], [
    'Brown the beef with the onion and pepper in a large skillet over medium-high heat until cooked through (160°F / 71°C), breaking it up. Drain excess fat.',
    'Stir in the garlic for 30 seconds, then the ketchup, brown sugar, Worcestershire, mustard, vinegar and salt.',
    'Simmer 10 to 15 minutes, stirring, until thick. Spoon onto toasted buns.']),
  R('pulled-pork', 'Slow-Cooker Pulled Pork', 'Mains', 'American', 'BBQ', 500, 10, [
    [4, 'lb', 'boneless pork shoulder (Boston butt)'], [2, 'tbsp', 'brown sugar'], [1, 'tbsp', 'paprika', 'p'], [1, 'tbsp', 'salt', 'p'], [2, 'tsp', 'black pepper', 'p'], [1, 'tsp', 'garlic powder', 'p'], [1, 'tsp', 'onion powder', 'p'], [1, 'tsp', 'chili powder', 'p'],
    [1, 'onion', 'onion|onions, sliced'], [0.5, 'cup', 'apple cider vinegar'], [0.5, 'cup', 'chicken broth'], [1.5, 'cup', 'barbecue sauce'], [10, 'bun', 'hamburger bun|hamburger buns']], [
    'Mix the sugar, paprika, salt, pepper, garlic powder, onion powder and chili powder and rub it all over the pork.',
    'Scatter the onion in a slow cooker, set the pork on top, and pour the vinegar and broth around it.',
    'Cook on low 8 to 10 hours, until the pork shreds easily and reads at least 195°F (90°C) inside.',
    'Shred with two forks, discarding large pieces of fat. Stir in some of the cooking juices and the barbecue sauce.',
    'Pile onto buns, with coleslaw if you like.']),
  R('baby-back-ribs', 'Oven Baby Back Ribs', 'Mains', 'American', 'BBQ', 180, 4, [
    [2, 'rack', 'rack baby back ribs|racks baby back ribs, about 2 lb each'], [3, 'tbsp', 'brown sugar'], [1, 'tbsp', 'paprika', 'p'], [1, 'tbsp', 'salt', 'p'], [2, 'tsp', 'black pepper', 'p'], [1, 'tsp', 'garlic powder', 'p'], [1, 'tsp', 'onion powder', 'p'], [1, 'cup', 'barbecue sauce']], [
    'Heat the oven to 275°F (135°C). Peel the thin membrane off the back of each rack by working a knife under it and pulling with a paper towel.',
    'Mix the brown sugar, paprika, salt, pepper, garlic powder and onion powder and rub all over the ribs.',
    'Wrap each rack tightly in foil, place on a baking sheet, and bake 2 1/2 hours until tender.',
    'Unwrap, brush with sauce, and broil 3 to 5 minutes, watching closely, until sticky and a little charred. Rest 10 minutes and cut between the bones.']),
  R('shrimp-grits', 'Shrimp and Grits', 'Mains', 'American', 'Southern', 40, 4, [
    [1, 'cup', 'stone-ground or old-fashioned grits'], [4, 'cup', 'water or chicken broth'], [1, 'tsp', 'salt', 'p'], [2, 'tbsp', 'butter'], [1, 'cup', 'shredded cheddar'], [4, 'slice', 'bacon, chopped'], [1, 'lb', 'large shrimp, peeled and deveined'],
    [2, 'clove', 'garlic clove|garlic cloves, minced'], [4, 'scallion', 'scallion|scallions, sliced'], [1, 'tbsp', 'lemon juice'], [0.5, 'tsp', 'paprika', 'p']], [
    'Bring the water and salt to a boil, whisk in the grits, then reduce the heat to low. Cover and cook 20 to 30 minutes, stirring often, until thick and creamy. Stir in the butter and cheese.',
    'Meanwhile cook the bacon in a skillet until crisp. Remove it, leaving about 2 tablespoons of fat.',
    'Season the shrimp with paprika and salt and cook in the bacon fat over medium-high heat 1 to 2 minutes per side until pink and opaque. Add the garlic and half the scallions for the last 30 seconds.',
    'Finish with the lemon juice. Spoon the shrimp over the grits and top with the bacon and remaining scallions.']),
  R('jambalaya', 'Chicken and Sausage Jambalaya', 'Mains', 'American', 'Cajun', 60, 6, [
    [2, 'tbsp', 'vegetable oil', 'p'], [12, 'oz', 'andouille or smoked sausage, sliced'], [1.5, 'lb', 'boneless chicken thighs, cut in chunks'], [1, 'onion', 'onion|onions, diced'], [1, 'green bell pepper', 'green bell pepper|green bell peppers, diced'], [2, 'stalk', 'celery stalk|celery stalks, diced'],
    [4, 'clove', 'garlic clove|garlic cloves, minced'], [1, 'tbsp', 'Cajun seasoning'], [1, 'can', 'can (14.5 oz) diced tomatoes'], [2, 'cup', 'long-grain white rice'], [3, 'cup', 'chicken broth'], [1, 'lb', 'shrimp, peeled (optional)'], [0, '', 'sliced scallions, to serve']], [
    'Heat the oil in a large Dutch oven over medium-high heat. Brown the sausage 4 minutes and remove. Brown the chicken in the same pot 5 minutes and remove.',
    'Cook the onion, pepper and celery in the drippings 5 minutes. Add the garlic and Cajun seasoning for 1 minute.',
    'Stir in the tomatoes, rice and broth. Return the sausage and chicken, bring to a boil, then cover and cook on low 20 to 25 minutes without lifting the lid, until the rice is tender.',
    'If using shrimp, nestle them in, cover, and cook 5 minutes until pink. The chicken should read 165°F (74°C). Fluff and serve with scallions.']),
  R('clam-chowder', 'New England Clam Chowder', 'Soups & Stews', 'American', 'New England', 50, 6, [
    [4, 'slice', 'bacon, chopped'], [1, 'onion', 'onion|onions, diced'], [2, 'stalk', 'celery stalk|celery stalks, diced'], [3, 'tbsp', 'all-purpose flour'], [2, 'can', 'can (6.5 oz) chopped clams, juice reserved'], [1, 'bottle', 'bottle (8 oz) clam juice'],
    [1.5, 'lb', 'potatoes, peeled and diced'], [2, 'sprig', 'fresh thyme'], [1, 'bay leaf', 'bay leaf|bay leaves'], [2, 'cup', 'half-and-half or heavy cream'], [0.5, 'tsp', 'black pepper', 'p'], [0, '', 'salt, to taste', 'p'], [0, '', 'oyster crackers, to serve']], [
    'Cook the bacon in a large pot until crisp. Remove it, leaving about 2 tablespoons of fat.',
    'Cook the onion and celery in the fat 5 minutes. Stir in the flour for 1 minute.',
    'Add the juice from the canned clams, the bottled clam juice, potatoes, thyme and bay leaf. Bring to a simmer and cook 12 to 15 minutes until the potatoes are tender.',
    'Stir in the clams and cream and warm through for 5 minutes without boiling. Remove the thyme and bay leaf and season with pepper and salt.',
    'Serve topped with the bacon and with oyster crackers.']),
  R('crab-cakes', 'Maryland Crab Cakes', 'Mains', 'American', 'Mid-Atlantic', 35, 4, [
    [1, 'lb', 'lump crab meat, picked over for shell'], [0.5, 'cup', 'panko breadcrumbs'], [1, 'egg', 'egg|eggs'], [0.25, 'cup', 'mayonnaise'], [1, 'tbsp', 'Dijon mustard'], [1, 'tsp', 'Worcestershire sauce'], [1, 'tsp', 'Old Bay seasoning'], [2, 'tbsp', 'chopped parsley'],
    [3, 'tbsp', 'butter or oil for pan-frying'], [1, 'lemon', 'lemon|lemons, in wedges']], [
    'Gently mix the mayonnaise, mustard, Worcestershire, Old Bay, egg and parsley. Fold in the panko and then the crab, trying not to break up the lumps.',
    'Shape into 8 cakes, place on a plate, and chill 30 minutes so they hold together.',
    'Heat the butter in a large skillet over medium heat and cook the cakes 4 to 5 minutes per side until golden and hot throughout.',
    'Serve with lemon wedges and tartar sauce.']),
  R('cheesesteak', 'Philly Cheesesteak', 'Mains', 'American', 'Philadelphia', 30, 4, [
    [1.5, 'lb', 'ribeye or sirloin, frozen 30 minutes and sliced very thin'], [2, 'tbsp', 'vegetable oil', 'p'], [1, 'onion', 'onion|onions, thinly sliced'], [1, 'green bell pepper', 'green bell pepper|green bell peppers, sliced (optional)'], [0.5, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'],
    [8, 'slice', 'provolone or white American cheese'], [4, 'roll', 'hoagie roll|hoagie rolls']], [
    'Heat 1 tablespoon oil in a large skillet or griddle over medium-high heat. Cook the onion (and pepper) 6 to 8 minutes until soft and browned. Set aside.',
    'Add the rest of the oil and cook the steak in a single layer, in batches, 1 to 2 minutes, seasoning with salt and pepper and chopping it with two spatulas.',
    'Mix the onions back in and top with cheese, covering for a minute to melt.',
    'Split the rolls, pile the meat inside and serve hot.']),
  R('chicken-fried-steak', 'Chicken Fried Steak with Cream Gravy', 'Mains', 'American', 'Texas', 50, 4, [
    [4, 'cube steak', 'cube steak|cube steaks, about 6 oz each'], [1.5, 'cup', 'all-purpose flour'], [1, 'tsp', 'salt', 'p'], [1, 'tsp', 'black pepper', 'p'], [1, 'tsp', 'paprika', 'p'], [2, 'egg', 'egg|eggs'], [0.5, 'cup', 'buttermilk'],
    [0, '', 'vegetable oil for frying', 'p'], [0.25, 'cup', 'all-purpose flour (for the gravy)'], [2.5, 'cup', 'milk']], [
    'Mix the flour, salt, pepper and paprika in a dish. Whisk the eggs and buttermilk in another.',
    'Dredge each steak in the flour, dip in the egg mixture, and dredge in the flour again, pressing it on.',
    'Heat about 1/2 inch of oil in a large skillet to 350°F (175°C). Fry the steaks 3 to 4 minutes per side until deep golden and cooked through. Drain on a rack.',
    'Pour off all but 1/4 cup of the oil, keeping the browned bits. Whisk in the 1/4 cup flour for 1 minute, then slowly whisk in the milk. Simmer until thick, season generously with pepper and salt, and pour over the steaks.']),
  R('roast-turkey', 'Roast Turkey', 'Mains', 'American', 'Holiday', 270, 12, [
    [1, 'turkey', 'turkey (12 to 14 lb), thawed completely, neck and giblets removed'], [4, 'tbsp', 'butter, softened'], [2, 'tbsp', 'chopped fresh herbs (sage, thyme, rosemary)'], [1, 'tbsp', 'salt', 'p'], [1, 'tsp', 'black pepper', 'p'],
    [1, 'onion', 'onion|onions, quartered'], [1, 'lemon', 'lemon|lemons, halved'], [4, 'clove', 'garlic clove|garlic cloves'], [2, 'cup', 'chicken broth']], [
    'Thaw the turkey in the refrigerator (about 24 hours for every 4 to 5 pounds). Heat the oven to 325°F (165°C) with the rack in the lower third.',
    'Pat the turkey very dry. Mix the butter with the herbs, salt and pepper. Loosen the skin over the breast and spread some butter underneath, and rub the rest over the outside.',
    'Put the onion, lemon and garlic in the cavity. Set the turkey breast-side up on a rack in a roasting pan and pour the broth into the pan. Do not stuff the bird; cook stuffing separately.',
    'Roast 3 to 3 3/4 hours, basting now and then, and tent the breast with foil if it browns too fast.',
    'It is done when a thermometer in the thickest part of the thigh (not touching bone) reads 165°F (74°C) and the breast reads 165°F too.',
    'Rest 30 minutes before carving. Use the pan juices for gravy.']),
  R('spaghetti-meatballs', 'Spaghetti and Meatballs', 'Mains', 'American', 'Italian-American', 70, 6, [
    [1, 'lb', 'ground beef'], [0.5, 'lb', 'ground pork'], [0.5, 'cup', 'breadcrumbs'], [0.25, 'cup', 'grated Parmesan'], [1, 'egg', 'egg|eggs'], [2, 'clove', 'garlic clove|garlic cloves, minced'], [2, 'tbsp', 'chopped parsley'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'],
    [2, 'tbsp', 'olive oil', 'p'], [1, 'onion', 'onion|onions, diced'], [1, 'can', 'can (28 oz) crushed tomatoes'], [1, 'tsp', 'dried oregano', 'p'], [1, 'lb', 'spaghetti']], [
    'Mix the beef, pork, breadcrumbs, Parmesan, egg, half the garlic, parsley, salt and pepper gently. Roll into 18 to 20 balls.',
    'Heat the oil in a large pot over medium heat and brown the meatballs on all sides, about 6 minutes. Set aside.',
    'Cook the onion in the pot 4 minutes, add the remaining garlic for 1 minute, then the tomatoes and oregano. Return the meatballs and simmer, partly covered, 30 minutes until they reach 160°F (71°C).',
    'Cook the spaghetti in well-salted water until al dente, drain, and serve with the sauce and meatballs.']),
  R('fajitas', 'Chicken Fajitas', 'Mains', 'American', 'Tex-Mex', 40, 4, [
    [1.5, 'lb', 'boneless chicken breast or thighs, sliced in strips'], [3, 'tbsp', 'olive oil, divided', 'p'], [3, 'tbsp', 'lime juice'], [2, 'tsp', 'chili powder', 'p'], [1, 'tsp', 'cumin', 'p'], [1, 'tsp', 'garlic powder', 'p'], [1, 'tsp', 'smoked paprika', 'p'], [1, 'tsp', 'salt', 'p'],
    [1, 'onion', 'onion|onions, sliced'], [2, 'bell pepper', 'bell pepper|bell peppers, sliced'], [8, 'tortilla', 'flour tortilla|flour tortillas'], [0, '', 'sour cream, salsa, guacamole and shredded cheese, to serve']], [
    'Mix 2 tablespoons oil, the lime juice, chili powder, cumin, garlic powder, paprika and salt. Toss with the chicken and marinate 20 minutes to 4 hours in the refrigerator.',
    'Heat a large cast-iron skillet over high heat with the remaining oil. Cook the chicken in a single layer 5 to 6 minutes until browned and cooked through (165°F / 74°C). Remove.',
    'Cook the onion and peppers in the same pan 4 to 5 minutes until charred at the edges but still crisp. Return the chicken.',
    'Warm the tortillas and serve with the toppings.']),
  R('buffalo-wings', 'Baked Buffalo Wings', 'Snacks & Apps', 'American', 'Bar food', 60, 4, [
    [3, 'lb', 'chicken wings, split'], [1, 'tbsp', 'baking powder (not baking soda)', 'p'], [1, 'tsp', 'salt', 'p'], [0.5, 'cup', 'Frank\'s RedHot or similar hot sauce'], [4, 'tbsp', 'butter, melted'], [0, '', 'celery sticks and blue cheese or ranch dressing, to serve']], [
    'Heat the oven to 425°F (220°C). Pat the wings very dry and toss with the baking powder and salt.',
    'Arrange on a rack set over a foil-lined baking sheet. Bake 25 minutes, flip, and bake another 20 to 25 minutes until crisp and at least 165°F (74°C).',
    'Whisk the hot sauce with the melted butter and toss the hot wings in it.',
    'Serve with celery and dressing.']),
  R('cobb-salad', 'Cobb Salad', 'Salads', 'American', 'California', 35, 4, [
    [1, 'head', 'head romaine lettuce|heads romaine lettuce, chopped'], [2, 'cup', 'cooked chicken, diced'], [6, 'slice', 'bacon, cooked and crumbled'], [4, 'egg', 'hard-boiled egg|hard-boiled eggs, chopped'], [2, 'avocado', 'avocado|avocados, diced'], [2, 'tomato', 'tomato|tomatoes, diced'],
    [0.5, 'cup', 'crumbled blue cheese'], [2, 'tbsp', 'chopped chives'], [0.5, 'cup', 'vinaigrette or ranch dressing']], [
    'Spread the lettuce on a large platter or in shallow bowls.',
    'Arrange the chicken, bacon, eggs, avocado, tomatoes and blue cheese in neat rows on top.',
    'Sprinkle with chives and serve with the dressing on the side.']),
  R('coleslaw', 'Creamy Coleslaw', 'Salads', 'American', 'Picnic', 20, 8, [
    [1, 'head', 'small head green cabbage|small heads green cabbage, finely shredded (about 6 cups)'], [2, 'carrot', 'carrot|carrots, shredded'], [0.5, 'cup', 'mayonnaise'], [2, 'tbsp', 'apple cider vinegar'], [1, 'tbsp', 'sugar'], [0.5, 'tsp', 'celery seed', 'p'], [0.5, 'tsp', 'salt', 'p'], [0.25, 'tsp', 'black pepper', 'p']], [
    'Whisk the mayonnaise, vinegar, sugar, celery seed, salt and pepper until smooth.',
    'Toss with the cabbage and carrots until evenly coated.',
    'Chill at least 30 minutes before serving. Stir again and adjust the salt.']),
  R('mashed-potatoes', 'Creamy Mashed Potatoes', 'Sides', 'American', 'Comfort food', 35, 6, [
    [3, 'lb', 'Yukon Gold potatoes, peeled and cut in chunks'], [1, 'tbsp', 'salt for the water', 'p'], [6, 'tbsp', 'butter'], [0.75, 'cup', 'warm milk or half-and-half'], [0.5, 'tsp', 'salt', 'p'], [0.25, 'tsp', 'black pepper', 'p']], [
    'Put the potatoes in a pot, cover with cold water, add 1 tablespoon salt, and bring to a boil. Simmer 15 to 20 minutes until very tender.',
    'Drain well and return to the hot pot for 1 minute to steam off the moisture.',
    'Mash (or use a ricer) with the butter, then stir in the warm milk a little at a time. Season with salt and pepper. Do not over-mix.']),
  R('potato-salad', 'Southern Potato Salad', 'Sides', 'American', 'Southern', 50, 8, [
    [3, 'lb', 'red or Yukon Gold potatoes, scrubbed'], [1, 'tbsp', 'salt for the water', 'p'], [4, 'egg', 'hard-boiled egg|hard-boiled eggs, chopped'], [1, 'cup', 'mayonnaise'], [2, 'tbsp', 'yellow mustard'], [3, 'tbsp', 'sweet pickle relish'], [2, 'stalk', 'celery stalk|celery stalks, diced'],
    [0.25, 'cup', 'finely diced red onion'], [1, 'tbsp', 'apple cider vinegar'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'], [0, '', 'paprika, to garnish', 'p']], [
    'Cover the potatoes with cold salted water and simmer 15 to 20 minutes until just tender. Drain, cool 15 minutes, and cut into bite-size cubes.',
    'Whisk the mayonnaise, mustard, relish, vinegar, salt and pepper in a large bowl.',
    'Fold in the warm potatoes, celery, onion and chopped eggs gently.',
    'Chill at least 2 hours. Sprinkle with paprika. Keep refrigerated and do not leave out more than 2 hours.']),
  R('green-bean-casserole', 'Green Bean Casserole', 'Sides', 'American', 'Holiday', 45, 8, [
    [1.5, 'lb', 'green beans, trimmed and cut in 2-inch pieces'], [3, 'tbsp', 'butter'], [8, 'oz', 'mushrooms, sliced'], [2, 'clove', 'garlic clove|garlic cloves, minced'], [3, 'tbsp', 'all-purpose flour'], [1.5, 'cup', 'milk'], [0.5, 'cup', 'chicken broth'],
    [0.5, 'tsp', 'salt', 'p'], [0.25, 'tsp', 'black pepper', 'p'], [1.5, 'cup', 'crispy fried onions']], [
    'Heat the oven to 375°F (190°C). Boil the green beans 4 minutes in salted water, drain, and rinse in cold water.',
    'Melt the butter in a large skillet and cook the mushrooms 6 to 8 minutes until browned. Add the garlic for 30 seconds and stir in the flour for 1 minute.',
    'Whisk in the milk and broth and simmer until thick, about 4 minutes. Season with salt and pepper.',
    'Fold in the beans and half the fried onions, pour into a 2-quart baking dish, and bake 20 minutes. Top with the remaining onions and bake 5 minutes more.']),
  R('baked-beans', 'Barbecue Baked Beans', 'Sides', 'American', 'BBQ', 70, 8, [
    [4, 'slice', 'bacon, chopped'], [1, 'onion', 'onion|onions, diced'], [3, 'can', 'can (15 oz) navy or pinto beans, drained'], [0.5, 'cup', 'ketchup'], [0.25, 'cup', 'brown sugar'], [2, 'tbsp', 'molasses'], [1, 'tbsp', 'yellow mustard'], [1, 'tbsp', 'apple cider vinegar'], [1, 'tsp', 'Worcestershire sauce']], [
    'Heat the oven to 350°F (175°C). Cook the bacon in an oven-safe pot until crisp, then add the onion and cook 5 minutes.',
    'Stir in the beans, ketchup, brown sugar, molasses, mustard, vinegar and Worcestershire.',
    'Bake uncovered 45 to 60 minutes, stirring once, until thick and bubbling.']),
  R('tuna-casserole', 'Tuna Noodle Casserole', 'Mains', 'American', 'Midwest', 50, 6, [
    [8, 'oz', 'egg noodles'], [3, 'tbsp', 'butter'], [8, 'oz', 'mushrooms, sliced'], [0.33, 'cup', 'all-purpose flour'], [2, 'cup', 'milk'], [1, 'cup', 'chicken broth'], [2, 'can', 'can (5 oz) tuna, drained'], [1, 'cup', 'frozen peas'], [1, 'cup', 'shredded cheddar'], [0.5, 'tsp', 'salt', 'p'], [0.5, 'cup', 'crushed potato chips or breadcrumbs']], [
    'Heat the oven to 375°F (190°C). Cook the noodles 2 minutes short of the package time and drain.',
    'Melt the butter in a large pot, cook the mushrooms 6 minutes, and stir in the flour for 1 minute. Whisk in the milk and broth and simmer until thick.',
    'Off the heat stir in the cheese, salt, tuna, peas and noodles. Pour into a greased 9x13-inch dish and top with the crumbs.',
    'Bake 20 to 25 minutes until bubbling and golden.']),
  /* ---------------- American: desserts and drinks ---------------- */
  R('chocolate-chip-cookies', 'Chocolate Chip Cookies', 'Desserts', 'American', 'Home baking', 35, 24, [
    [2.25, 'cup', 'all-purpose flour'], [1, 'tsp', 'baking soda', 'p'], [1, 'tsp', 'salt', 'p'], [1, 'cup', 'butter, softened'], [0.75, 'cup', 'granulated sugar'], [0.75, 'cup', 'packed brown sugar'], [2, 'egg', 'egg|eggs'], [2, 'tsp', 'vanilla extract'], [2, 'cup', 'semi-sweet chocolate chips']], [
    'Heat the oven to 375°F (190°C). Whisk the flour, baking soda and salt.',
    'Beat the butter with both sugars until fluffy, about 3 minutes. Beat in the eggs one at a time, then the vanilla.',
    'Stir in the flour mixture just until combined, then the chocolate chips. Chilling the dough 30 minutes makes thicker cookies.',
    'Drop rounded tablespoons onto ungreased baking sheets, 2 inches apart.',
    'Bake 9 to 11 minutes until the edges are golden and the centers look slightly underdone. Cool 2 minutes on the sheet, then move to a rack.']),
  R('apple-pie', 'Classic Apple Pie', 'Desserts', 'American', 'Home baking', 120, 8, [
    [2, 'pie crust', 'refrigerated pie crust|refrigerated pie crusts'], [2.5, 'lb', 'apples (Granny Smith and Honeycrisp), peeled and sliced thin'], [0.75, 'cup', 'sugar'], [2, 'tbsp', 'all-purpose flour'], [1, 'tsp', 'ground cinnamon', 'p'], [0.25, 'tsp', 'ground nutmeg', 'p'], [1, 'tbsp', 'lemon juice'],
    [1, 'tbsp', 'butter, cut in small pieces'], [1, 'egg', 'egg|eggs, beaten'], [1, 'tbsp', 'coarse sugar']], [
    'Heat the oven to 425°F (220°C). Fit one crust into a 9-inch pie plate.',
    'Toss the apples with the sugar, flour, cinnamon, nutmeg and lemon juice. Pile into the crust and dot with the butter.',
    'Cover with the second crust, trim and crimp the edges, and cut 5 or 6 slits in the top. Brush with the egg and sprinkle with coarse sugar.',
    'Bake on a baking sheet 20 minutes, reduce to 375°F (190°C), and bake another 40 to 45 minutes until deep golden and the juices bubble through the slits. Cover the edges with foil if they brown too fast.',
    'Cool at least 2 hours so the filling sets.']),
  R('brownies', 'Fudgy Brownies', 'Desserts', 'American', 'Home baking', 45, 16, [
    [0.5, 'cup', 'butter'], [8, 'oz', 'semi-sweet chocolate, chopped'], [1, 'cup', 'sugar'], [0.5, 'cup', 'packed brown sugar'], [3, 'egg', 'egg|eggs'], [2, 'tsp', 'vanilla extract'], [0.75, 'cup', 'all-purpose flour'], [0.25, 'cup', 'unsweetened cocoa powder'], [0.5, 'tsp', 'salt', 'p']], [
    'Heat the oven to 350°F (175°C) and line an 8-inch square pan with parchment, leaving an overhang.',
    'Melt the butter and chocolate together in a bowl over simmering water or in the microwave in short bursts. Cool 5 minutes.',
    'Whisk in both sugars, then the eggs one at a time, and the vanilla. Beat for a minute until glossy.',
    'Fold in the flour, cocoa and salt until just combined. Spread in the pan.',
    'Bake 28 to 32 minutes until a toothpick comes out with a few moist crumbs. Cool completely before cutting.']),
  R('peach-cobbler', 'Southern Peach Cobbler', 'Desserts', 'American', 'Southern', 70, 8, [
    [6, 'cup', 'sliced peaches (about 2 1/2 lb, fresh or thawed frozen)'], [0.5, 'cup', 'sugar'], [1, 'tbsp', 'lemon juice'], [1, 'tsp', 'ground cinnamon', 'p'], [1, 'tbsp', 'cornstarch'], [0.5, 'cup', 'butter, melted'], [1, 'cup', 'all-purpose flour'], [1, 'cup', 'sugar (for the batter)'], [1, 'tbsp', 'baking powder', 'p'], [1, 'pinch', 'salt', 'p'], [1, 'cup', 'milk']], [
    'Heat the oven to 350°F (175°C). Toss the peaches with 1/2 cup sugar, the lemon juice, cinnamon and cornstarch.',
    'Pour the melted butter into a 9x13-inch baking dish. Whisk the flour, 1 cup sugar, baking powder and salt, then the milk, and pour the batter over the butter without stirring.',
    'Spoon the peaches and their juices over the batter. Do not stir.',
    'Bake 40 to 45 minutes until the top is golden and the batter has risen around the fruit. Serve warm with vanilla ice cream.']),
  R('banana-pudding', 'Southern Banana Pudding', 'Desserts', 'American', 'Southern', 40, 10, [
    [0.75, 'cup', 'sugar'], [0.33, 'cup', 'all-purpose flour'], [1, 'pinch', 'salt', 'p'], [3, 'cup', 'whole milk'], [4, 'egg', 'egg yolk|egg yolks'], [2, 'tbsp', 'butter'], [1, 'tsp', 'vanilla extract'], [1, 'box', 'box (11 oz) vanilla wafers'], [5, 'banana', 'ripe banana|ripe bananas, sliced'], [1, 'cup', 'heavy cream, whipped']], [
    'Whisk the sugar, flour and salt in a saucepan. Whisk in the milk and egg yolks.',
    'Cook over medium heat, whisking constantly, until it thickens and bubbles, 8 to 10 minutes. Cook 1 more minute. Off the heat, stir in the butter and vanilla.',
    'In a large dish layer wafers, bananas and pudding, ending with pudding.',
    'Cover and chill at least 4 hours. Top with whipped cream before serving.']),
  R('pecan-pie', 'Pecan Pie', 'Desserts', 'American', 'Southern', 100, 8, [
    [1, 'pie crust', 'refrigerated pie crust|refrigerated pie crusts'], [3, 'egg', 'egg|eggs'], [1, 'cup', 'light corn syrup'], [0.75, 'cup', 'packed brown sugar'], [4, 'tbsp', 'butter, melted'], [1, 'tsp', 'vanilla extract'], [0.5, 'tsp', 'salt', 'p'], [1.5, 'cup', 'pecan halves']], [
    'Heat the oven to 350°F (175°C). Fit the crust into a 9-inch pie plate and crimp the edge.',
    'Whisk the eggs, corn syrup, brown sugar, melted butter, vanilla and salt until smooth. Stir in the pecans.',
    'Pour into the crust. Bake 50 to 60 minutes until the edges are set and the center jiggles only slightly. Cover the crust edge with foil if it browns too fast.',
    'Cool completely, at least 2 hours, before slicing.']),
  R('sweet-tea', 'Southern Sweet Tea', 'Drinks', 'American', 'Southern', 15, 8, [
    [8, 'bag', 'black tea bag|black tea bags'], [1, 'pinch', 'baking soda', 'p'], [2, 'cup', 'boiling water'], [0.75, 'cup', 'sugar'], [6, 'cup', 'cold water'], [0, '', 'ice and lemon slices, to serve']], [
    'Put the tea bags and baking soda in a heatproof pitcher and pour the boiling water over them. Steep 5 minutes, then remove the bags without squeezing them.',
    'Stir in the sugar until dissolved, then add the cold water.',
    'Chill and serve over ice with lemon.']),
  /* ---------------- International ---------------- */
  R('carbonara', 'Spaghetti alla Carbonara', 'Mains', 'Italian', 'Rome', 25, 4, [
    [1, 'lb', 'spaghetti'], [6, 'oz', 'guanciale or pancetta, diced'], [4, 'egg', 'egg yolk|egg yolks'], [1, 'egg', 'whole egg|whole eggs'], [1, 'cup', 'finely grated Pecorino Romano'], [1, 'tsp', 'black pepper', 'p'], [0, '', 'salt for the pasta water', 'p']], [
    'Bring a large pot of salted water to a boil. Whisk the yolks, whole egg, Pecorino and plenty of pepper in a bowl.',
    'Cook the guanciale in a large skillet over medium-low heat until the fat renders and it is crisp, 8 to 10 minutes. Turn off the heat.',
    'Cook the spaghetti until al dente. Save 1 cup of the pasta water, then drain.',
    'Add the hot pasta to the skillet off the heat and toss. Pour in the egg mixture with a splash of pasta water and toss vigorously until the sauce turns creamy and coats the pasta. The residual heat cooks the egg; add more water if it is too thick.',
    'Serve right away with more Pecorino and pepper. Use fresh, pasteurized eggs if you are concerned about raw egg.']),
  R('chicken-piccata', 'Chicken Piccata', 'Mains', 'Italian', 'Italian classic', 35, 4, [
    [4, 'chicken breast', 'boneless chicken breast|boneless chicken breasts, halved horizontally into cutlets'], [0.5, 'cup', 'all-purpose flour'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'], [3, 'tbsp', 'olive oil', 'p'], [4, 'tbsp', 'butter, divided'],
    [0.5, 'cup', 'chicken broth'], [0.25, 'cup', 'lemon juice'], [2, 'tbsp', 'capers, drained'], [2, 'tbsp', 'chopped parsley']], [
    'Pound the cutlets to an even 1/2 inch. Season with salt and pepper and dredge in the flour, shaking off the excess.',
    'Heat the oil and 1 tablespoon butter in a large skillet over medium-high heat. Cook the chicken 3 to 4 minutes per side until golden and 165°F (74°C) inside. Remove to a plate.',
    'Add the broth and lemon juice to the pan, scraping up the browned bits, and simmer 3 minutes. Whisk in the remaining butter, the capers and parsley.',
    'Return the chicken to the sauce for a minute and serve with pasta or rice.']),
  R('tikka-masala', 'Chicken Tikka Masala', 'Mains', 'Indian', 'Indian-British', 60, 4, [
    [1.5, 'lb', 'boneless chicken thighs, cut in chunks'], [1, 'cup', 'plain yogurt'], [2, 'tbsp', 'lemon juice'], [2, 'tsp', 'garam masala', 'p'], [1, 'tsp', 'ground cumin', 'p'], [1, 'tsp', 'ground turmeric', 'p'], [1, 'tsp', 'salt', 'p'], [3, 'tbsp', 'butter or ghee'],
    [1, 'onion', 'onion|onions, finely diced'], [4, 'clove', 'garlic clove|garlic cloves, minced'], [1, 'tbsp', 'grated fresh ginger'], [1, 'can', 'can (15 oz) tomato sauce'], [1, 'tsp', 'paprika', 'p'], [0.75, 'cup', 'heavy cream'], [0, '', 'cooked basmati rice and naan, to serve']], [
    'Mix the yogurt, lemon juice, 1 teaspoon garam masala, the cumin, turmeric and half the salt. Add the chicken and marinate 30 minutes to overnight.',
    'Broil or pan-sear the chicken on a baking sheet 8 to 10 minutes, turning once, until charred at the edges and cooked through (165°F / 74°C).',
    'Melt the butter in a large pot and cook the onion 6 minutes. Add the garlic and ginger for 1 minute, then the tomato sauce, paprika, remaining garam masala and salt. Simmer 15 minutes.',
    'Stir in the cream and the chicken and simmer 10 minutes. Serve over rice with naan.']),
  R('chana-masala', 'Chana Masala', 'Mains', 'Indian', 'North India', 40, 4, [
    [2, 'tbsp', 'vegetable oil', 'p'], [1, 'onion', 'onion|onions, diced'], [4, 'clove', 'garlic clove|garlic cloves, minced'], [1, 'tbsp', 'grated fresh ginger'], [2, 'tsp', 'ground cumin', 'p'], [2, 'tsp', 'ground coriander', 'p'], [1, 'tsp', 'garam masala', 'p'], [1, 'tsp', 'ground turmeric', 'p'],
    [0.5, 'tsp', 'cayenne pepper', 'p'], [1, 'can', 'can (14.5 oz) diced tomatoes'], [2, 'can', 'can (15 oz) chickpeas, drained'], [0.75, 'cup', 'water'], [1, 'tsp', 'salt', 'p'], [1, 'tbsp', 'lemon juice'], [0, '', 'chopped cilantro, to serve']], [
    'Heat the oil in a large pot and cook the onion 6 to 8 minutes until golden. Add the garlic and ginger for 1 minute.',
    'Stir in the cumin, coriander, garam masala, turmeric and cayenne for 30 seconds, then add the tomatoes and cook 5 minutes until thick.',
    'Add the chickpeas, water and salt. Simmer 15 to 20 minutes, mashing a few chickpeas to thicken the sauce.',
    'Finish with the lemon juice and cilantro. Serve with rice or naan.']),
  R('pad-thai', 'Pad Thai', 'Mains', 'Thai', 'Street food', 35, 4, [
    [8, 'oz', 'flat rice noodles'], [3, 'tbsp', 'fish sauce'], [3, 'tbsp', 'brown sugar'], [3, 'tbsp', 'tamarind paste or lime juice'], [1, 'tbsp', 'rice vinegar'], [3, 'tbsp', 'vegetable oil', 'p'], [12, 'oz', 'shrimp or sliced chicken'], [3, 'clove', 'garlic clove|garlic cloves, minced'],
    [2, 'egg', 'egg|eggs, beaten'], [3, 'cup', 'bean sprouts'], [4, 'scallion', 'scallion|scallions, cut in 1-inch pieces'], [0.33, 'cup', 'crushed roasted peanuts'], [1, 'lime', 'lime|limes, in wedges']], [
    'Soak the noodles in hot (not boiling) water 15 to 20 minutes until pliable but still firm, then drain.',
    'Stir the fish sauce, brown sugar, tamarind and vinegar together until the sugar dissolves.',
    'Heat 2 tablespoons oil in a large wok over high heat and cook the shrimp until pink and opaque, or the chicken until cooked through (165°F / 74°C). Push to the side, add the garlic for 20 seconds, then the eggs, scrambling until just set.',
    'Add the noodles and sauce and toss 2 to 3 minutes until the noodles are tender, adding a splash of water if needed. Toss in the bean sprouts and scallions for 30 seconds.',
    'Serve topped with peanuts and a lime wedge.']),
  R('green-curry', 'Thai Green Curry', 'Mains', 'Thai', 'Central Thailand', 35, 4, [
    [1, 'tbsp', 'vegetable oil', 'p'], [3, 'tbsp', 'green curry paste'], [1, 'can', 'can (13.5 oz) coconut milk'], [1, 'cup', 'chicken broth'], [1.5, 'lb', 'boneless chicken thighs, sliced'], [1, 'tbsp', 'fish sauce'], [1, 'tbsp', 'brown sugar'], [1, 'cup', 'bamboo shoots, drained'],
    [1, 'red bell pepper', 'red bell pepper|red bell peppers, sliced'], [1, 'cup', 'Thai basil or basil leaves'], [0, '', 'cooked jasmine rice, to serve']], [
    'Heat the oil in a large pot and fry the curry paste 1 minute until fragrant. Add 1/2 cup of the thick coconut cream from the top of the can and cook 2 minutes.',
    'Add the rest of the coconut milk, broth and chicken and simmer 10 minutes until cooked through (165°F / 74°C).',
    'Stir in the fish sauce, sugar, bamboo shoots and bell pepper and simmer 5 minutes.',
    'Add the basil off the heat. Serve with jasmine rice.']),
  R('carne-asada-tacos', 'Carne Asada Tacos', 'Mains', 'Mexican', 'Street food', 45, 6, [
    [2, 'lb', 'flank or skirt steak'], [0.25, 'cup', 'lime juice'], [0.25, 'cup', 'orange juice'], [3, 'tbsp', 'olive oil', 'p'], [4, 'clove', 'garlic clove|garlic cloves, minced'], [1, 'tsp', 'ground cumin', 'p'], [1, 'tsp', 'chili powder', 'p'], [1, 'tsp', 'salt', 'p'], [0.25, 'cup', 'chopped cilantro'],
    [12, 'tortilla', 'small corn tortilla|small corn tortillas'], [0, '', 'diced white onion, cilantro, salsa and lime wedges, to serve']], [
    'Whisk the juices, oil, garlic, cumin, chili powder, salt and cilantro. Marinate the steak in a bag 2 to 8 hours in the refrigerator.',
    'Heat a grill or cast-iron pan very hot. Cook the steak 4 to 5 minutes per side for medium (145°F / 63°C). Rest 10 minutes.',
    'Slice thinly against the grain and chop into bite-size pieces.',
    'Warm the tortillas on the grill and fill with meat, onion, cilantro and salsa.']),
  R('guacamole', 'Guacamole', 'Snacks & Apps', 'Mexican', 'Classic', 10, 6, [
    [3, 'avocado', 'ripe avocado|ripe avocados'], [2, 'tbsp', 'lime juice'], [0.25, 'cup', 'finely diced white onion'], [1, 'jalapeño', 'jalapeño|jalapeños, seeded and minced'], [2, 'tbsp', 'chopped cilantro'], [1, 'tomato', 'small tomato|small tomatoes, diced'], [0.5, 'tsp', 'salt', 'p']], [
    'Halve and pit the avocados and scoop the flesh into a bowl. Add the lime juice and salt.',
    'Mash with a fork, leaving it a little chunky.',
    'Stir in the onion, jalapeño, cilantro and tomato. Taste and add more salt or lime.',
    'Serve right away, or press plastic wrap directly on the surface to keep it from browning.']),
  R('fried-rice', 'Chicken Fried Rice', 'Mains', 'Chinese', 'Takeout favorite', 25, 4, [
    [4, 'cup', 'cooked rice, cold (day-old is best)'], [3, 'tbsp', 'vegetable oil, divided', 'p'], [2, 'egg', 'egg|eggs, beaten'], [8, 'oz', 'boneless chicken, diced small'], [1, 'cup', 'frozen peas and carrots'], [3, 'clove', 'garlic clove|garlic cloves, minced'], [4, 'scallion', 'scallion|scallions, sliced'],
    [3, 'tbsp', 'soy sauce'], [1, 'tsp', 'sesame oil']], [
    'Break up any clumps in the cold rice with your hands.',
    'Heat 1 tablespoon oil in a large wok or skillet over high heat. Scramble the eggs until just set and remove.',
    'Add another tablespoon of oil and cook the chicken until cooked through (165°F / 74°C), 4 to 5 minutes. Add the peas and carrots and garlic for 1 minute.',
    'Add the remaining oil and the rice, pressing it against the pan and stirring, 3 to 4 minutes until hot and starting to crisp.',
    'Stir in the soy sauce, eggs, scallions and sesame oil.']),
  R('kung-pao', 'Kung Pao Chicken', 'Mains', 'Chinese', 'Sichuan', 35, 4, [
    [1.5, 'lb', 'boneless chicken thighs, diced'], [1, 'tbsp', 'soy sauce'], [1, 'tbsp', 'cornstarch'], [3, 'tbsp', 'soy sauce (for the sauce)'], [1, 'tbsp', 'Chinese black vinegar or rice vinegar'], [1, 'tbsp', 'sugar'], [1, 'tsp', 'cornstarch (for the sauce)'], [2, 'tbsp', 'vegetable oil', 'p'],
    [8, 'chile', 'dried red chile|dried red chiles'], [3, 'clove', 'garlic clove|garlic cloves, sliced'], [1, 'tbsp', 'grated fresh ginger'], [4, 'scallion', 'scallion|scallions, cut in 1-inch pieces'], [0.5, 'cup', 'roasted peanuts']], [
    'Toss the chicken with 1 tablespoon soy sauce and 1 tablespoon cornstarch. Stir the sauce ingredients together in a small bowl.',
    'Heat the oil in a wok over high heat. Stir-fry the chiles 20 seconds until they darken, then add the chicken and cook 5 to 6 minutes until browned and cooked through (165°F / 74°C).',
    'Add the garlic, ginger and scallions for 30 seconds, then the sauce, stirring until glossy and thick.',
    'Fold in the peanuts and serve with rice.']),
  R('teriyaki-chicken', 'Chicken Teriyaki', 'Mains', 'Japanese', 'Home cooking', 30, 4, [
    [1.5, 'lb', 'boneless chicken thighs'], [0.25, 'cup', 'soy sauce'], [0.25, 'cup', 'mirin'], [2, 'tbsp', 'sake or water'], [2, 'tbsp', 'sugar'], [1, 'tbsp', 'vegetable oil', 'p'], [1, 'tsp', 'grated fresh ginger'], [0, '', 'cooked rice and sliced scallions, to serve']], [
    'Stir the soy sauce, mirin, sake and sugar together until the sugar dissolves.',
    'Heat the oil in a skillet over medium-high heat and cook the chicken skin-side down (or first side) 5 to 6 minutes until golden. Flip and cook 4 minutes.',
    'Pour in the sauce and ginger, reduce the heat, and simmer 5 to 7 minutes, spooning the sauce over the chicken, until glossy and the chicken reads 165°F (74°C).',
    'Slice and serve over rice with the sauce and scallions.']),
  R('miso-soup', 'Miso Soup', 'Soups & Stews', 'Japanese', 'Everyday', 15, 4, [
    [4, 'cup', 'water'], [1, 'tsp', 'dashi powder (or a 4-inch piece of kombu)'], [3, 'tbsp', 'miso paste'], [7, 'oz', 'silken tofu, cubed'], [2, 'scallion', 'scallion|scallions, sliced'], [1, 'tbsp', 'dried wakame seaweed']], [
    'Bring the water and dashi to a gentle simmer. Soak the wakame in a little warm water for 5 minutes, then drain.',
    'Add the tofu and wakame and warm for 2 minutes.',
    'Put the miso in a ladle, dip it into the soup, and whisk until dissolved. Do not boil once the miso is in.',
    'Serve topped with the scallions.']),
  R('kimchi-fried-rice', 'Kimchi Fried Rice', 'Mains', 'Korean', 'Home cooking', 20, 2, [
    [2, 'cup', 'cooked rice, cold'], [1, 'cup', 'chopped kimchi, plus 2 tbsp of its juice'], [2, 'tbsp', 'vegetable oil', 'p'], [2, 'slice', 'bacon or 4 oz pork belly, chopped'], [2, 'scallion', 'scallion|scallions, sliced'], [1, 'tbsp', 'gochujang'], [1, 'tsp', 'sesame oil'], [2, 'egg', 'egg|eggs'], [0, '', 'toasted sesame seeds, to serve']], [
    'Cook the bacon in 1 tablespoon oil in a large skillet until it renders and browns. Add the kimchi and cook 3 minutes.',
    'Add the rice, kimchi juice and gochujang and stir-fry 4 to 5 minutes, pressing the rice into the pan, until hot and slightly crisp. Stir in the scallions and sesame oil.',
    'Fry the eggs in the remaining oil in another pan until the whites are set.',
    'Top each bowl with an egg and sesame seeds.']),
  R('bulgogi', 'Beef Bulgogi', 'Mains', 'Korean', 'Barbecue', 35, 4, [
    [1.5, 'lb', 'ribeye or sirloin, sliced very thin'], [0.25, 'cup', 'soy sauce'], [2, 'tbsp', 'brown sugar'], [1, 'tbsp', 'sesame oil'], [4, 'clove', 'garlic clove|garlic cloves, minced'], [1, 'tbsp', 'grated fresh ginger'], [0.5, 'pear', 'Asian pear or apple|Asian pears or apples, grated'], [4, 'scallion', 'scallion|scallions, sliced'],
    [1, 'tbsp', 'vegetable oil', 'p'], [0, '', 'cooked rice and lettuce leaves, to serve']], [
    'Mix the soy sauce, sugar, sesame oil, garlic, ginger and grated pear. Toss with the beef and half the scallions and marinate 30 minutes to overnight.',
    'Heat a large skillet or grill pan over high heat with the vegetable oil. Cook the beef in small batches 1 to 2 minutes per side until browned and cooked through.',
    'Serve with rice and lettuce leaves for wrapping, topped with the remaining scallions.']),
  R('greek-salad', 'Greek Salad', 'Salads', 'Greek', 'Horiatiki', 15, 4, [
    [4, 'tomato', 'ripe tomato|ripe tomatoes, cut in wedges'], [1, 'cucumber', 'cucumber|cucumbers, sliced'], [1, 'red onion', 'small red onion|small red onions, thinly sliced'], [1, 'green bell pepper', 'green bell pepper|green bell peppers, sliced'], [0.5, 'cup', 'Kalamata olives'],
    [6, 'oz', 'feta, in a slab or cubes'], [3, 'tbsp', 'extra-virgin olive oil', 'p'], [1, 'tbsp', 'red wine vinegar'], [1, 'tsp', 'dried oregano', 'p'], [0, '', 'salt, to taste', 'p']], [
    'Put the tomatoes, cucumber, onion, pepper and olives in a large bowl and sprinkle with salt.',
    'Drizzle with the olive oil and vinegar and toss gently.',
    'Top with the feta, sprinkle with oregano and serve with crusty bread to soak up the juices.']),
  R('souvlaki', 'Chicken Souvlaki with Tzatziki', 'Mains', 'Greek', 'Street food', 50, 4, [
    [1.5, 'lb', 'boneless chicken thighs, cut in 1 1/2-inch cubes'], [3, 'tbsp', 'olive oil', 'p'], [3, 'tbsp', 'lemon juice'], [3, 'clove', 'garlic clove|garlic cloves, minced'], [2, 'tsp', 'dried oregano', 'p'], [1, 'tsp', 'salt', 'p'],
    [1, 'cup', 'Greek yogurt'], [0.5, 'cucumber', 'cucumber|cucumbers, grated and squeezed dry'], [1, 'clove', 'garlic clove|garlic cloves, minced (for the tzatziki)'], [1, 'tbsp', 'olive oil (for the tzatziki)', 'p'], [4, 'pita', 'pita bread|pita breads']], [
    'Mix the oil, lemon juice, garlic, oregano and salt. Marinate the chicken 30 minutes to 4 hours. Soak wooden skewers in water if using them.',
    'For the tzatziki, stir the yogurt, cucumber, garlic, oil and a pinch of salt together and chill.',
    'Thread the chicken on skewers and grill or broil 10 to 12 minutes, turning, until charred and 165°F (74°C) inside.',
    'Warm the pitas and serve the chicken with tzatziki, tomato and onion.']),
  R('hummus', 'Classic Hummus', 'Snacks & Apps', 'Middle Eastern', 'Levant', 10, 6, [
    [2, 'can', 'can (15 oz) chickpeas, drained (save a little liquid)'], [0.33, 'cup', 'tahini'], [0.25, 'cup', 'lemon juice'], [2, 'clove', 'garlic clove|garlic cloves'], [0.5, 'tsp', 'ground cumin', 'p'], [0.5, 'tsp', 'salt', 'p'], [3, 'tbsp', 'ice water'], [2, 'tbsp', 'olive oil, to serve', 'p'], [0, '', 'paprika, to garnish', 'p']], [
    'Blend the tahini and lemon juice in a food processor for 1 minute until pale and fluffy.',
    'Add the garlic, cumin and salt and blend 30 seconds. Add the chickpeas and blend 2 minutes until very smooth, adding the ice water a tablespoon at a time.',
    'Spoon into a bowl, swirl with the olive oil, and dust with paprika.']),
  R('shakshuka', 'Shakshuka', 'Breakfast', 'Middle Eastern', 'North Africa and Israel', 35, 4, [
    [2, 'tbsp', 'olive oil', 'p'], [1, 'onion', 'onion|onions, diced'], [1, 'red bell pepper', 'red bell pepper|red bell peppers, diced'], [3, 'clove', 'garlic clove|garlic cloves, minced'], [2, 'tsp', 'ground cumin', 'p'], [1, 'tsp', 'paprika', 'p'], [0.5, 'tsp', 'cayenne pepper', 'p'],
    [1, 'can', 'can (28 oz) whole peeled tomatoes, crushed'], [1, 'tsp', 'salt', 'p'], [6, 'egg', 'egg|eggs'], [0.5, 'cup', 'crumbled feta'], [2, 'tbsp', 'chopped cilantro or parsley']], [
    'Heat the oil in a large deep skillet over medium heat and cook the onion and pepper 8 minutes until soft. Add the garlic and spices for 1 minute.',
    'Add the tomatoes and salt and simmer 10 to 12 minutes until thickened.',
    'Make 6 wells in the sauce and crack an egg into each. Cover and cook 5 to 8 minutes, until the whites are set and the yolks are as firm as you like.',
    'Top with feta and herbs and serve straight from the pan with crusty bread.']),
  R('onion-soup', 'French Onion Soup', 'Soups & Stews', 'French', 'Bistro', 90, 6, [
    [4, 'tbsp', 'butter'], [3, 'lb', 'yellow onions, thinly sliced'], [1, 'tsp', 'salt', 'p'], [3, 'clove', 'garlic clove|garlic cloves, minced'], [0.5, 'cup', 'dry white wine'], [6, 'cup', 'beef broth'], [4, 'sprig', 'fresh thyme'], [1, 'bay leaf', 'bay leaf|bay leaves'],
    [6, 'slice', 'baguette slice|baguette slices, toasted'], [1.5, 'cup', 'shredded Gruyère']], [
    'Melt the butter in a large Dutch oven over medium heat. Add the onions and salt and cook, stirring often, 40 to 50 minutes until deep golden brown. Do not rush this step.',
    'Add the garlic for 1 minute, then the wine, scraping up the browned bits. Add the broth, thyme and bay leaf and simmer 20 minutes. Remove the herbs and season.',
    'Heat the broiler. Ladle the soup into oven-safe bowls on a baking sheet, top each with a toasted baguette slice and a pile of Gruyère.',
    'Broil 2 to 4 minutes until the cheese is bubbling and browned.']),
  R('crepes', 'French Crêpes', 'Breakfast', 'French', 'Brittany', 30, 8, [
    [1, 'cup', 'all-purpose flour'], [2, 'egg', 'egg|eggs'], [1, 'cup', 'milk'], [0.5, 'cup', 'water'], [2, 'tbsp', 'melted butter, plus more for the pan'], [1, 'tbsp', 'sugar'], [1, 'pinch', 'salt', 'p'], [0, '', 'jam, lemon and sugar, or Nutella and bananas, to fill']], [
    'Blend or whisk the flour, eggs, milk, water, melted butter, sugar and salt until smooth. Rest the batter 30 minutes if you have time.',
    'Heat a nonstick 8- to 10-inch skillet over medium heat and brush with butter.',
    'Pour in about 1/4 cup of batter and swirl to coat the pan thinly. Cook 1 to 2 minutes until the edges lift and the underside is golden, then flip and cook 30 seconds more.',
    'Fill and fold, and keep the finished crêpes warm under a towel.']),
  R('tortilla-espanola', 'Spanish Tortilla', 'Mains', 'Spanish', 'Tapas', 45, 6, [
    [1.5, 'lb', 'potatoes, peeled and thinly sliced'], [1, 'onion', 'onion|onions, thinly sliced'], [0.75, 'cup', 'olive oil', 'p'], [6, 'egg', 'egg|eggs'], [1, 'tsp', 'salt', 'p']], [
    'Heat the oil in a 10-inch nonstick skillet over medium-low heat. Cook the potatoes and onion, stirring, 15 to 20 minutes until tender but not browned. Drain, saving 1 tablespoon of the oil.',
    'Beat the eggs with the salt in a large bowl, fold in the warm potatoes and onions, and let it sit 10 minutes.',
    'Heat the saved oil in the skillet over medium heat, pour in the mixture, and cook 5 to 6 minutes until the edges are set.',
    'Put a large plate over the pan, flip the tortilla out, slide it back in, and cook 3 to 4 more minutes. Eggs should be cooked through. Serve warm or at room temperature.']),
  R('jollof-rice', 'Jollof Rice', 'Mains', 'West African', 'Nigeria and Ghana', 70, 6, [
    [3, 'tbsp', 'vegetable oil', 'p'], [1, 'onion', 'onion|onions, diced'], [2, 'tbsp', 'tomato paste'], [3, 'tomato', 'large tomato|large tomatoes'], [2, 'red bell pepper', 'red bell pepper|red bell peppers'], [1, 'scotch bonnet', 'Scotch bonnet pepper or habanero|Scotch bonnet peppers or habaneros, use less for mild'],
    [2, 'tsp', 'curry powder', 'p'], [1, 'tsp', 'dried thyme', 'p'], [2, 'bay leaf', 'bay leaf|bay leaves'], [2, 'cup', 'long-grain parboiled rice'], [2, 'cup', 'chicken broth'], [1.5, 'tsp', 'salt', 'p']], [
    'Blend the tomatoes, bell peppers and Scotch bonnet until smooth.',
    'Heat the oil in a heavy pot and cook the onion 5 minutes. Add the tomato paste and fry 3 to 4 minutes, then pour in the blended mixture and cook 20 to 25 minutes until reduced and the oil rises to the top.',
    'Stir in the curry powder, thyme, bay leaves and salt, then the rinsed rice and broth. Bring to a boil.',
    'Cover tightly with foil under the lid and cook on the lowest heat 25 to 30 minutes until the rice is tender. Fluff and serve with fried plantains or chicken.']),
  R('shepherds-pie', "Shepherd's Pie", 'Mains', 'British', 'Pub classic', 85, 6, [
    [2, 'lb', 'potatoes, peeled and cut up'], [4, 'tbsp', 'butter'], [0.5, 'cup', 'milk'], [1.5, 'lb', 'ground lamb'], [1, 'onion', 'onion|onions, diced'], [2, 'carrot', 'carrot|carrots, diced'], [2, 'tbsp', 'tomato paste'], [2, 'tbsp', 'all-purpose flour'],
    [1, 'cup', 'beef broth'], [1, 'tbsp', 'Worcestershire sauce'], [1, 'cup', 'frozen peas'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p']], [
    'Boil the potatoes in salted water 15 to 20 minutes until tender. Drain and mash with the butter, milk, salt and pepper.',
    'Heat the oven to 400°F (200°C). Brown the lamb with the onion and carrots in a large oven-safe skillet, about 10 minutes, until cooked through (160°F / 71°C). Drain extra fat.',
    'Stir in the tomato paste and flour for 1 minute, then the broth and Worcestershire. Simmer 8 to 10 minutes until thick. Stir in the peas.',
    'Spread the mash over the filling, rough up the top with a fork, and bake 25 to 30 minutes until golden.']),
  R('irish-soda-bread', 'Irish Soda Bread', 'Bread & Baking', 'Irish', 'Traditional', 55, 8, [
    [4, 'cup', 'all-purpose flour, plus more for dusting'], [1, 'tsp', 'baking soda', 'p'], [1, 'tsp', 'salt', 'p'], [1.75, 'cup', 'buttermilk']], [
    'Heat the oven to 425°F (220°C) and dust a baking sheet with flour.',
    'Whisk the flour, baking soda and salt. Make a well and pour in the buttermilk. Stir quickly with a fork until a shaggy dough forms. Do not overmix.',
    'Turn out onto a floured surface, knead just a few times, and shape into a round about 2 inches tall. Place on the sheet and cut a deep cross in the top.',
    'Bake 15 minutes, then reduce to 400°F (200°C) and bake 25 to 30 minutes more until golden and it sounds hollow when tapped. Cool before slicing.']),
  R('stroganoff', 'Beef Stroganoff', 'Mains', 'Russian', 'Classic', 40, 4, [
    [1.5, 'lb', 'sirloin or beef tenderloin, sliced in thin strips'], [1, 'tsp', 'salt', 'p'], [0.5, 'tsp', 'black pepper', 'p'], [3, 'tbsp', 'butter, divided'], [1, 'onion', 'onion|onions, diced'], [12, 'oz', 'mushrooms, sliced'], [2, 'tbsp', 'all-purpose flour'],
    [1.5, 'cup', 'beef broth'], [1, 'tbsp', 'Dijon mustard'], [0.75, 'cup', 'sour cream'], [12, 'oz', 'egg noodles']], [
    'Pat the beef dry and season with salt and pepper. Sear in a hot skillet with 1 tablespoon butter in two batches, 1 to 2 minutes per side. Set aside.',
    'Melt the remaining butter in the pan and cook the onion and mushrooms 8 minutes until browned. Stir in the flour for 1 minute.',
    'Add the broth and mustard and simmer 5 minutes until thickened. Lower the heat and stir in the sour cream. Do not let it boil.',
    'Return the beef to warm through. Cook the noodles and serve the stroganoff over them.']),
  R('swedish-meatballs', 'Swedish Meatballs', 'Mains', 'Swedish', 'Smörgåsbord', 50, 6, [
    [1, 'lb', 'ground beef'], [0.5, 'lb', 'ground pork'], [0.5, 'cup', 'breadcrumbs'], [0.5, 'cup', 'milk'], [1, 'egg', 'egg|eggs'], [0.5, 'cup', 'finely diced onion'], [0.5, 'tsp', 'ground allspice', 'p'], [0.25, 'tsp', 'ground nutmeg', 'p'], [1, 'tsp', 'salt', 'p'],
    [3, 'tbsp', 'butter, divided'], [3, 'tbsp', 'all-purpose flour'], [2, 'cup', 'beef broth'], [0.5, 'cup', 'heavy cream'], [0, '', 'lingonberry jam and mashed potatoes, to serve']], [
    'Soak the breadcrumbs in the milk 5 minutes. Mix gently with the beef, pork, egg, onion, allspice, nutmeg and salt. Roll into about 30 small balls.',
    'Brown the meatballs in 1 tablespoon butter in a large skillet over medium heat, in batches, about 6 minutes each. Set aside.',
    'Melt the remaining butter in the pan, whisk in the flour for 1 minute, then slowly whisk in the broth. Simmer until thick, about 5 minutes. Stir in the cream.',
    'Return the meatballs and simmer 8 to 10 minutes until they reach 160°F (71°C). Serve with mashed potatoes and lingonberry jam.']),
  R('jerk-chicken', 'Jamaican Jerk Chicken', 'Mains', 'Jamaican', 'Grill', 70, 6, [
    [3.5, 'lb', 'chicken thighs and drumsticks, bone-in'], [6, 'scallion', 'scallion|scallions, chopped'], [1, 'scotch bonnet', 'Scotch bonnet pepper or habanero|Scotch bonnet peppers or habaneros, less for mild'], [4, 'clove', 'garlic clove|garlic cloves'], [2, 'tbsp', 'fresh thyme leaves'],
    [2, 'tbsp', 'soy sauce'], [2, 'tbsp', 'lime juice'], [2, 'tbsp', 'brown sugar'], [1, 'tbsp', 'ground allspice', 'p'], [1, 'tsp', 'ground cinnamon', 'p'], [1, 'tsp', 'salt', 'p'], [2, 'tbsp', 'vegetable oil', 'p']], [
    'Blend everything except the chicken into a thick paste. Wear gloves when handling the hot pepper.',
    'Score the chicken and rub the paste all over, under the skin too. Marinate at least 4 hours, ideally overnight, in the refrigerator.',
    'Grill over medium heat with the lid closed, turning now and then, 35 to 45 minutes, or roast on a rack at 400°F (200°C) for 40 to 45 minutes.',
    'The chicken is done when the thickest part reads 165°F (74°C). Rest 5 minutes and serve with rice and peas.']),
  R('lemongrass-chicken', 'Vietnamese Lemongrass Chicken', 'Mains', 'Vietnamese', 'Home cooking', 40, 4, [
    [1.5, 'lb', 'boneless chicken thighs, sliced thin'], [3, 'stalk', 'lemongrass stalk|lemongrass stalks, tender part minced'], [4, 'clove', 'garlic clove|garlic cloves, minced'], [3, 'tbsp', 'fish sauce'], [2, 'tbsp', 'sugar'], [1, 'tbsp', 'vegetable oil', 'p'],
    [2, 'shallot', 'shallot|shallots, sliced'], [1, 'chile', 'red chile|red chiles, sliced'], [0, '', 'cooked rice, cilantro and lime, to serve']], [
    'Mix the lemongrass, garlic, fish sauce, sugar and half the chile with the chicken. Marinate 20 minutes to overnight.',
    'Heat the oil in a large skillet or wok over high heat. Stir-fry the shallots 1 minute, then add the chicken and cook 6 to 8 minutes until browned and cooked through (165°F / 74°C).',
    'Serve over rice with cilantro, the remaining chile and lime wedges.']),
  ];
})();
