'use strict';
/* Calorie Counter: a built-in list of everyday foods. Values are typical ones for one serving, rounded; real products vary, so use the label
   when you have it. Each line is: name | serving | grams in a serving | calories | protein g | carbs g | fat g. */
const KcalData = (() => {
  const T = `Fruit
Apple|1 medium|182|95|0.5|25|0.3
Banana|1 medium|118|105|1.3|27|0.4
Orange|1 medium|131|62|1.2|15|0.2
Strawberries|1 cup|152|49|1|12|0.5
Blueberries|1 cup|148|84|1.1|21|0.5
Grapes|1 cup|151|104|1.1|27|0.2
Watermelon|1 cup diced|152|46|0.9|11.5|0.2
Pineapple|1 cup chunks|165|82|0.9|22|0.2
Mango|1 cup sliced|165|99|1.4|25|0.6
Pear|1 medium|178|101|0.6|27|0.2
Peach|1 medium|150|59|1.4|14|0.4
Avocado|half|100|160|2|8.5|14.7
Kiwi|1 fruit|69|42|0.8|10|0.4
Cherries|1 cup|138|87|1.5|22|0.3
Grapefruit|half|123|52|0.9|13|0.2
Lemon|1 fruit|58|17|0.6|5.4|0.2
Raisins|1 small box|43|129|1.3|34|0.2
Dates|1 medium|24|66|0.4|18|0
Dried apricots|¼ cup|33|79|1.1|21|0.1
Vegetables
Broccoli|1 cup|91|31|2.5|6|0.3
Carrot|1 medium|61|25|0.6|6|0.1
Spinach, raw|1 cup|30|7|0.9|1.1|0.1
Lettuce|1 cup shredded|36|5|0.5|1|0.1
Tomato|1 medium|123|22|1.1|4.8|0.2
Cucumber|1 cup sliced|104|16|0.7|3.8|0.1
Bell pepper|1 medium|119|31|1|7|0.4
Onion|1 medium|110|44|1.2|10|0.1
Potato, baked|1 medium|173|161|4.3|37|0.2
Sweet potato, baked|1 medium|114|103|2.3|24|0.2
Corn|1 cup|154|143|5|31|2
Green beans|1 cup|125|31|1.8|7|0.2
Peas|1 cup|145|117|7.9|21|0.6
Cauliflower|1 cup|107|27|2|5|0.3
Mushrooms|1 cup|70|15|2.2|2.3|0.2
Zucchini|1 cup|124|21|1.5|3.9|0.4
Cabbage|1 cup|89|22|1.1|5.2|0.1
Celery|1 stalk|40|6|0.3|1.2|0.1
Kale|1 cup|21|7|0.6|1|0.1
Asparagus|1 cup|134|27|3|5|0.2
Beets|1 cup|136|58|2.2|13|0.2
Grains and bread
White rice, cooked|1 cup|158|205|4.3|45|0.4
Brown rice, cooked|1 cup|195|216|5|45|1.8
Pasta, cooked|1 cup|140|220|8|43|1.3
White bread|1 slice|30|79|2.7|15|1
Whole wheat bread|1 slice|28|81|4|14|1.1
Oatmeal, cooked|1 cup|234|166|5.9|28|3.6
Rolled oats, dry|½ cup|40|150|5|27|3
Corn flakes|1 cup|28|100|2|24|0.2
Bagel|1 medium|105|277|11|55|1.4
Flour tortilla|1 (8 in)|49|146|3.9|24|3.6
Quinoa, cooked|1 cup|185|222|8.1|39|3.6
Couscous, cooked|1 cup|157|176|6|36|0.3
Pancake|1 (4 in)|38|86|2.4|11|3.7
Croissant|1 medium|57|231|4.7|26|12
Granola|½ cup|61|280|8|40|11
Crackers|5 crackers|16|70|1.4|10.6|2.6
Popcorn, air-popped|3 cups|24|93|3|19|1.1
Pita bread|1 pita|60|165|5.5|33|0.7
Noodles, egg, cooked|1 cup|160|221|7.3|40|3.3
Protein
Chicken breast, cooked|100 g|100|165|31|0|3.6
Chicken thigh, cooked|100 g|100|209|26|0|10.9
Ground beef (85%), cooked|100 g|100|250|26|0|15
Steak, sirloin, cooked|100 g|100|206|30|0|9
Pork chop, cooked|100 g|100|231|27|0|13
Bacon|1 slice|8|43|3|0.1|3.3
Ham, sliced|2 slices|56|62|9|1|2.2
Turkey breast, sliced|2 slices|56|60|11|2|0.8
Salmon, cooked|100 g|100|206|22|0|12
Tuna, canned in water|100 g|100|116|26|0|0.8
Shrimp, cooked|100 g|100|99|24|0.2|0.3
Cod, cooked|100 g|100|105|23|0|0.9
Egg|1 large|50|72|6.3|0.4|4.8
Egg white|1 large|33|17|3.6|0.2|0.1
Tofu, firm|100 g|100|144|17|3|9
Tempeh|100 g|100|192|20|8|11
Black beans, cooked|1 cup|172|227|15|41|0.9
Chickpeas, cooked|1 cup|164|269|15|45|4.2
Lentils, cooked|1 cup|198|230|18|40|0.8
Kidney beans, cooked|1 cup|177|225|15|40|0.9
Hummus|2 tbsp|30|70|2.4|4|6
Peanut butter|2 tbsp|32|188|8|6|16
Hot dog (frank only)|1 frank|45|150|5|2|13
Whey protein powder|1 scoop|30|120|24|3|1.5
Dairy and eggs
Milk, whole|1 cup|244|149|8|12|8
Milk, 2%|1 cup|244|122|8|12|4.8
Milk, skim|1 cup|245|83|8.3|12|0.2
Almond milk, unsweetened|1 cup|240|30|1|1|2.5
Soy milk|1 cup|243|131|8|15|4
Yogurt, plain, whole|1 cup|245|149|8.5|11.4|8
Greek yogurt, nonfat|¾ cup|170|100|17|6|0.7
Cheddar cheese|1 slice|28|113|7|0.4|9.3
Mozzarella|1 slice|28|85|6.3|0.6|6.3
Parmesan, grated|1 tbsp|5|22|1.9|0.2|1.4
Cottage cheese, low-fat|½ cup|113|92|12|5|2.6
Butter|1 tbsp|14|102|0.1|0|11.5
Cream cheese|1 tbsp|14.5|51|0.9|0.8|5
Ice cream, vanilla|½ cup|66|137|2.3|16|7.3
Heavy cream|1 tbsp|15|51|0.4|0.4|5.4
Nuts and oils
Almonds|1 oz (28 g)|28|164|6|6|14
Walnuts|1 oz (28 g)|28|185|4.3|3.9|18.5
Cashews|1 oz (28 g)|28|157|5.2|8.6|12.4
Peanuts|1 oz (28 g)|28|161|7.3|4.6|14
Pistachios|1 oz (28 g)|28|159|5.7|7.7|12.9
Sunflower seeds|1 oz (28 g)|28|165|5.5|5.7|14
Chia seeds|1 tbsp|12|58|2|5|3.7
Olive oil|1 tbsp|13.5|119|0|0|13.5
Coconut oil|1 tbsp|14|121|0|0|13.5
Snacks and sweets
Potato chips|1 oz (28 g)|28|152|2|15|10
Pretzels|1 oz (28 g)|28|108|2.6|22.5|0.8
Milk chocolate bar|1.5 oz|43|226|3|26|14
Dark chocolate|1 oz (28 g)|28|170|2.2|13|12
Chocolate chip cookie|1 cookie|30|140|1.5|19|7
Brownie|1 square|56|230|3|36|9
Donut, glazed|1 medium|60|240|3.5|30|12
Candy bar|1 bar|52|250|4|33|12
Gummy candy|1 oz (28 g)|28|95|2|22|0
Cake, with frosting|1 slice|80|260|3|38|11
Apple pie|1 slice|125|296|2.4|42|14
Blueberry muffin|1 medium|113|350|5|54|13
Granola bar|1 bar|24|100|2|16|3.5
Jam|1 tbsp|20|56|0|14|0
Honey|1 tbsp|21|64|0.1|17|0
Sugar|1 tsp|4|16|0|4|0
Maple syrup|1 tbsp|20|52|0|13.4|0
Chocolate hazelnut spread|2 tbsp|37|200|2|21|12
Drinks
Water|1 cup|237|0|0|0|0
Coffee, black|1 cup|237|2|0.3|0|0
Latte, whole milk|12 oz|360|150|9|15|6
Tea, unsweetened|1 cup|237|2|0|0.7|0
Orange juice|1 cup|248|112|1.7|26|0.5
Apple juice|1 cup|248|114|0.2|28|0.3
Cola|12 oz can|355|140|0|39|0
Diet cola|12 oz can|355|0|0|0|0
Beer|12 oz|355|153|1.6|13|0
Red wine|5 oz|150|125|0.1|3.8|0
Spirits (whiskey, vodka)|1.5 oz|42|97|0|0|0
Energy drink|8 oz|240|110|0|28|0
Sports drink|20 oz|591|130|0|34|0
Milkshake|12 oz|350|380|10|58|12
Meals and fast food
Hamburger|1 sandwich|110|250|12|31|9
Cheeseburger|1 sandwich|120|300|15|33|13
French fries|medium serving|111|365|4|48|17
Pizza, cheese|1 slice|107|285|12|36|10
Pizza, pepperoni|1 slice|113|310|13|34|14
Chicken nuggets|6 pieces|96|280|14|18|17
Fried chicken drumstick|1 piece|80|195|16|6|11
Taco, beef|1 taco|78|170|8|13|9
Burrito, bean and cheese|1 burrito|250|440|18|54|16
Sushi roll, California|6 pieces|190|255|9|38|7
Hot dog with bun|1 hot dog|98|290|10|24|17
Ramen, instant, prepared|1 package|270|380|8|54|14
Macaroni and cheese|1 cup|200|330|12|43|12
Spaghetti with meat sauce|1 cup|250|330|17|40|11
Omelette, 2 eggs|1 omelette|122|190|12|1|15
Turkey sandwich|1 sandwich|220|320|20|36|9
Grilled cheese sandwich|1 sandwich|130|400|14|28|26
Peanut butter and jelly sandwich|1 sandwich|110|380|12|50|16
Chili con carne|1 cup|250|260|20|22|10
Fried rice|1 cup|200|330|9|50|10
Chicken noodle soup|1 cup|248|62|3.2|7.3|2.4
Tomato soup|1 cup|248|74|1.9|17|0.7
Caesar salad with chicken|1 bowl|300|360|28|12|22
Condiments
Ketchup|1 tbsp|17|17|0.2|4.5|0
Mayonnaise|1 tbsp|14|94|0.1|0.1|10.3
Mustard|1 tsp|5|3|0.2|0.3|0.2
Barbecue sauce|2 tbsp|36|60|0.2|14.5|0.3
Soy sauce|1 tbsp|16|8|1.3|0.8|0
Ranch dressing|2 tbsp|30|129|0.4|1.8|13.4
Italian dressing|2 tbsp|30|70|0.1|3|6.5
Salsa|2 tbsp|32|10|0.5|2|0
Guacamole|2 tbsp|30|45|0.6|2.6|4.1
Marinara sauce|½ cup|125|70|2|12|1.5`;
  const foods = []; let cat = '';
  for (const line of T.split('\n')) { const p = line.split('|'); if (p.length === 1) { cat = line.trim(); continue; } foods.push({ id: 'b:' + p[0] + '|' + p[1], name: p[0], serving: p[1], g: +p[2], kcal: +p[3], p: +p[4], c: +p[5], f: +p[6], cat }); }
  return { foods, cats: [...new Set(foods.map(f => f.cat))] };
})();
if (typeof module !== 'undefined') module.exports = KcalData;
