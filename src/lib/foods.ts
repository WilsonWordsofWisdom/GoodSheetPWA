export interface FoodItem {
  name: string;
  cuisine: string;
  kcalMin: number;
  kcalMax: number;
  tags: string[];
  fiberG: number;
}

export const FOODS: FoodItem[] = [
  // Singapore / Hawker
  { name: "Chicken Rice", cuisine: "Singaporean", kcalMin: 550, kcalMax: 750, tags: ["Lunch", "Meat"], fiberG: 1.5 },
  { name: "Char Kway Teow", cuisine: "Singaporean", kcalMin: 700, kcalMax: 900, tags: ["Fried", "Lunch"], fiberG: 2.0 },
  { name: "Hokkien Mee", cuisine: "Singaporean", kcalMin: 600, kcalMax: 850, tags: ["Lunch", "Fried"], fiberG: 2.0 },
  { name: "Laksa", cuisine: "Singaporean", kcalMin: 550, kcalMax: 800, tags: ["Spicy", "Dairy"], fiberG: 2.5 },
  { name: "Bak Kut Teh", cuisine: "Singaporean", kcalMin: 450, kcalMax: 700, tags: ["Meat", "Dinner"], fiberG: 1.0 },
  { name: "Roti Prata", cuisine: "Singaporean", kcalMin: 300, kcalMax: 500, tags: ["Breakfast", "Fried"], fiberG: 1.0 },
  { name: "Nasi Lemak", cuisine: "Singaporean", kcalMin: 600, kcalMax: 900, tags: ["Spicy", "Breakfast"], fiberG: 3.0 },
  { name: "Satay (10 sticks)", cuisine: "Singaporean", kcalMin: 500, kcalMax: 700, tags: ["Meat"], fiberG: 0.5 },
  { name: "Kaya Toast Set", cuisine: "Singaporean", kcalMin: 350, kcalMax: 500, tags: ["Breakfast", "Sugar"], fiberG: 2.0 },
  { name: "Fish Ball Noodles", cuisine: "Singaporean", kcalMin: 400, kcalMax: 550, tags: ["Lunch", "Fish"], fiberG: 1.5 },
  { name: "Wanton Mee", cuisine: "Singaporean", kcalMin: 500, kcalMax: 700, tags: ["Lunch", "Meat"], fiberG: 1.5 },
  { name: "Carrot Cake (Chai Tow Kway)", cuisine: "Singaporean", kcalMin: 500, kcalMax: 750, tags: ["Fried", "Breakfast"], fiberG: 2.0 },
  { name: "Yong Tau Foo", cuisine: "Singaporean", kcalMin: 350, kcalMax: 600, tags: ["Lunch", "Veg"], fiberG: 4.0 },
  { name: "Mee Goreng", cuisine: "Singaporean", kcalMin: 600, kcalMax: 850, tags: ["Spicy", "Fried"], fiberG: 3.0 },

  // Chinese
  { name: "Wonton Soup", cuisine: "Chinese", kcalMin: 250, kcalMax: 400, tags: ["Meat"], fiberG: 1.0 },
  { name: "Sweet & Sour Pork", cuisine: "Chinese", kcalMin: 600, kcalMax: 900, tags: ["Meat", "Sugar", "Fried"], fiberG: 1.5 },
  { name: "Kung Pao Chicken", cuisine: "Chinese", kcalMin: 500, kcalMax: 750, tags: ["Spicy", "Meat"], fiberG: 2.0 },
  { name: "Mapo Tofu", cuisine: "Chinese", kcalMin: 400, kcalMax: 600, tags: ["Spicy"], fiberG: 1.5 },
  { name: "Dim Sum (4 pieces)", cuisine: "Chinese", kcalMin: 250, kcalMax: 450, tags: ["Breakfast"], fiberG: 1.5 },
  { name: "Fried Rice", cuisine: "Chinese", kcalMin: 500, kcalMax: 800, tags: ["Fried", "Lunch"], fiberG: 1.0 },
  { name: "Dumplings (8 pieces)", cuisine: "Chinese", kcalMin: 400, kcalMax: 600, tags: ["Meat"], fiberG: 2.0 },
  { name: "Beef Noodles", cuisine: "Chinese", kcalMin: 500, kcalMax: 750, tags: ["Meat", "Lunch"], fiberG: 2.0 },
  { name: "Hot Pot (per serving)", cuisine: "Chinese", kcalMin: 700, kcalMax: 1200, tags: ["Spicy", "Dinner"], fiberG: 5.0 },
  { name: "Char Siu Rice", cuisine: "Chinese", kcalMin: 600, kcalMax: 850, tags: ["Meat", "Lunch"], fiberG: 1.0 },
  { name: "Congee", cuisine: "Chinese", kcalMin: 200, kcalMax: 400, tags: ["Breakfast", "LowFiber"], fiberG: 0.5 },

  // Malay / Indonesian
  { name: "Nasi Padang", cuisine: "Malay", kcalMin: 700, kcalMax: 1100, tags: ["Spicy", "Meat"], fiberG: 4.0 },
  { name: "Mee Rebus", cuisine: "Malay", kcalMin: 500, kcalMax: 700, tags: ["Spicy", "Lunch"], fiberG: 3.0 },
  { name: "Mee Soto", cuisine: "Malay", kcalMin: 400, kcalMax: 600, tags: ["Lunch"], fiberG: 2.0 },
  { name: "Beef Rendang", cuisine: "Malay", kcalMin: 600, kcalMax: 900, tags: ["Spicy", "Meat"], fiberG: 2.0 },
  { name: "Gado Gado", cuisine: "Malay", kcalMin: 400, kcalMax: 600, tags: ["Veg", "HighFiber"], fiberG: 7.0 },
  { name: "Ayam Penyet", cuisine: "Malay", kcalMin: 700, kcalMax: 1000, tags: ["Spicy", "Fried", "Meat"], fiberG: 2.0 },
  { name: "Lontong", cuisine: "Malay", kcalMin: 450, kcalMax: 650, tags: ["Veg", "Breakfast"], fiberG: 4.0 },

  // Indian
  { name: "Chicken Biryani", cuisine: "Indian", kcalMin: 700, kcalMax: 1000, tags: ["Spicy", "Meat"], fiberG: 3.0 },
  { name: "Butter Chicken with Naan", cuisine: "Indian", kcalMin: 800, kcalMax: 1200, tags: ["Spicy", "Dairy", "Meat"], fiberG: 3.0 },
  { name: "Dal Tadka", cuisine: "Indian", kcalMin: 300, kcalMax: 500, tags: ["HighFiber", "Veg"], fiberG: 8.0 },
  { name: "Chana Masala", cuisine: "Indian", kcalMin: 350, kcalMax: 550, tags: ["HighFiber", "Spicy", "Veg"], fiberG: 10.0 },
  { name: "Palak Paneer", cuisine: "Indian", kcalMin: 400, kcalMax: 650, tags: ["Veg", "Dairy"], fiberG: 4.0 },
  { name: "Masala Dosa", cuisine: "Indian", kcalMin: 400, kcalMax: 600, tags: ["Breakfast", "Spicy"], fiberG: 4.0 },
  { name: "Tandoori Chicken", cuisine: "Indian", kcalMin: 400, kcalMax: 600, tags: ["Spicy", "Meat"], fiberG: 1.0 },
  { name: "Samosa (2 pieces)", cuisine: "Indian", kcalMin: 250, kcalMax: 400, tags: ["Fried", "Snack"], fiberG: 3.0 },
  { name: "Roti Canai", cuisine: "Indian", kcalMin: 300, kcalMax: 500, tags: ["Breakfast", "Fried"], fiberG: 1.5 },
  { name: "Fish Curry", cuisine: "Indian", kcalMin: 400, kcalMax: 650, tags: ["Spicy", "Fish"], fiberG: 2.0 },

  // Western
  { name: "Cheeseburger & Fries", cuisine: "Western", kcalMin: 800, kcalMax: 1200, tags: ["Meat", "Fried", "Dairy"], fiberG: 4.0 },
  { name: "Caesar Salad", cuisine: "Western", kcalMin: 350, kcalMax: 600, tags: ["Veg", "Dairy"], fiberG: 3.0 },
  { name: "Grilled Chicken Breast", cuisine: "Western", kcalMin: 250, kcalMax: 400, tags: ["Meat", "LowFiber"], fiberG: 0.0 },
  { name: "Steak (8oz)", cuisine: "Western", kcalMin: 500, kcalMax: 800, tags: ["Meat", "Dinner"], fiberG: 0.0 },
  { name: "Fish & Chips", cuisine: "Western", kcalMin: 800, kcalMax: 1200, tags: ["Fried", "Fish"], fiberG: 3.5 },
  { name: "BLT Sandwich", cuisine: "Western", kcalMin: 450, kcalMax: 650, tags: ["Lunch", "Meat"], fiberG: 3.0 },
  { name: "Avocado Toast", cuisine: "Western", kcalMin: 300, kcalMax: 500, tags: ["Breakfast", "HighFiber"], fiberG: 7.0 },
  { name: "Greek Salad", cuisine: "Western", kcalMin: 250, kcalMax: 450, tags: ["Veg", "Dairy", "HighFiber"], fiberG: 3.5 },
  { name: "Roast Chicken Dinner", cuisine: "Western", kcalMin: 600, kcalMax: 900, tags: ["Meat", "Dinner"], fiberG: 3.0 },
  { name: "Pancakes (Stack of 3)", cuisine: "Western", kcalMin: 500, kcalMax: 800, tags: ["Breakfast", "Sugar"], fiberG: 2.0 },

  // Italian
  { name: "Spaghetti Carbonara", cuisine: "Italian", kcalMin: 700, kcalMax: 1000, tags: ["Dairy", "Meat"], fiberG: 3.0 },
  { name: "Margherita Pizza", cuisine: "Italian", kcalMin: 600, kcalMax: 900, tags: ["Dairy", "Gluten"], fiberG: 3.5 },
  { name: "Pepperoni Pizza", cuisine: "Italian", kcalMin: 700, kcalMax: 1100, tags: ["Dairy", "Meat", "Gluten"], fiberG: 3.5 },
  { name: "Lasagna", cuisine: "Italian", kcalMin: 600, kcalMax: 900, tags: ["Meat", "Dairy", "Gluten"], fiberG: 4.0 },
  { name: "Risotto", cuisine: "Italian", kcalMin: 500, kcalMax: 800, tags: ["Dairy", "Dinner"], fiberG: 1.5 },
  { name: "Tiramisu", cuisine: "Italian", kcalMin: 400, kcalMax: 600, tags: ["Dairy", "Sugar", "Caffeine"], fiberG: 0.5 },
  { name: "Minestrone", cuisine: "Italian", kcalMin: 200, kcalMax: 400, tags: ["Veg", "HighFiber"], fiberG: 6.0 },
  { name: "Bolognese Pasta", cuisine: "Italian", kcalMin: 600, kcalMax: 900, tags: ["Meat", "Gluten"], fiberG: 4.0 },
  { name: "Pesto Pasta", cuisine: "Italian", kcalMin: 550, kcalMax: 800, tags: ["Dairy", "Gluten"], fiberG: 3.0 },

  // Korean
  { name: "Bibimbap", cuisine: "Korean", kcalMin: 500, kcalMax: 750, tags: ["Veg", "HighFiber"], fiberG: 6.0 },
  { name: "Korean BBQ (per serving)", cuisine: "Korean", kcalMin: 700, kcalMax: 1200, tags: ["Meat", "Dinner"], fiberG: 1.5 },
  { name: "Kimchi Stew", cuisine: "Korean", kcalMin: 350, kcalMax: 550, tags: ["Spicy", "Veg"], fiberG: 4.0 },
  { name: "Tteokbokki", cuisine: "Korean", kcalMin: 500, kcalMax: 750, tags: ["Spicy", "Sugar"], fiberG: 2.0 },
  { name: "Japchae", cuisine: "Korean", kcalMin: 400, kcalMax: 600, tags: ["Veg"], fiberG: 4.0 },
  { name: "Bulgogi", cuisine: "Korean", kcalMin: 500, kcalMax: 750, tags: ["Meat", "Sugar"], fiberG: 1.0 },
  { name: "Sundubu Jjigae", cuisine: "Korean", kcalMin: 350, kcalMax: 550, tags: ["Spicy"], fiberG: 2.0 },
  { name: "Korean Fried Chicken", cuisine: "Korean", kcalMin: 700, kcalMax: 1100, tags: ["Fried", "Meat"], fiberG: 1.0 },

  // Japanese
  { name: "Salmon Sashimi (8 pieces)", cuisine: "Japanese", kcalMin: 200, kcalMax: 350, tags: ["Fish", "LowFiber"], fiberG: 0.0 },
  { name: "Tonkotsu Ramen", cuisine: "Japanese", kcalMin: 700, kcalMax: 1100, tags: ["Meat", "Dinner"], fiberG: 3.0 },
  { name: "Chicken Katsu Curry", cuisine: "Japanese", kcalMin: 700, kcalMax: 1000, tags: ["Fried", "Meat"], fiberG: 4.0 },
  { name: "Sushi Set (10 pieces)", cuisine: "Japanese", kcalMin: 400, kcalMax: 700, tags: ["Fish", "Lunch"], fiberG: 1.5 },
  { name: "Tempura Udon", cuisine: "Japanese", kcalMin: 600, kcalMax: 900, tags: ["Fried", "Lunch"], fiberG: 3.0 },
  { name: "Miso Soup", cuisine: "Japanese", kcalMin: 60, kcalMax: 120, tags: ["LowFiber"], fiberG: 1.0 },
  { name: "Onigiri", cuisine: "Japanese", kcalMin: 180, kcalMax: 280, tags: ["Snack", "Breakfast"], fiberG: 0.5 },
  { name: "Beef Donburi", cuisine: "Japanese", kcalMin: 600, kcalMax: 900, tags: ["Meat", "Lunch"], fiberG: 1.5 },
  { name: "Tonkatsu", cuisine: "Japanese", kcalMin: 700, kcalMax: 1000, tags: ["Fried", "Meat"], fiberG: 2.0 },
  { name: "Edamame", cuisine: "Japanese", kcalMin: 100, kcalMax: 200, tags: ["HighFiber", "Veg", "Snack"], fiberG: 5.0 },

  // Snacks & drinks
  { name: "Bubble Tea", cuisine: "Drink", kcalMin: 300, kcalMax: 500, tags: ["Sugar", "Dairy"], fiberG: 0.0 },
  { name: "Iced Latte", cuisine: "Drink", kcalMin: 100, kcalMax: 250, tags: ["Caffeine", "Dairy"], fiberG: 0.0 },
  { name: "Black Coffee", cuisine: "Drink", kcalMin: 0, kcalMax: 10, tags: ["Caffeine"], fiberG: 0.0 },
  { name: "Beer (1 pint)", cuisine: "Drink", kcalMin: 180, kcalMax: 250, tags: ["Alcohol"], fiberG: 0.0 },
  { name: "Glass of Wine", cuisine: "Drink", kcalMin: 120, kcalMax: 200, tags: ["Alcohol"], fiberG: 0.0 },
  { name: "Banana", cuisine: "Snack", kcalMin: 90, kcalMax: 130, tags: ["Fruit", "HighFiber"], fiberG: 3.0 },
  { name: "Apple", cuisine: "Snack", kcalMin: 80, kcalMax: 120, tags: ["Fruit", "HighFiber"], fiberG: 4.0 },
  { name: "Greek Yogurt", cuisine: "Snack", kcalMin: 120, kcalMax: 200, tags: ["Dairy"], fiberG: 0.0 },
  { name: "Mixed Nuts (handful)", cuisine: "Snack", kcalMin: 150, kcalMax: 250, tags: ["Snack", "HighFiber"], fiberG: 3.0 },
  { name: "Oatmeal Bowl", cuisine: "Western", kcalMin: 250, kcalMax: 450, tags: ["Breakfast", "HighFiber", "Oats"], fiberG: 4.0 },

  // More Singaporean / Asian street food
  { name: "Spring Roll (2 pieces)", cuisine: "Singaporean", kcalMin: 150, kcalMax: 280, tags: ["Fried", "Snack"], fiberG: 2.0 },
  { name: "Oyster Omelette (Orh Luak)", cuisine: "Singaporean", kcalMin: 400, kcalMax: 650, tags: ["Fried", "Eggs"], fiberG: 1.0 },
  { name: "Prawn Mee (Hae Mee)", cuisine: "Singaporean", kcalMin: 500, kcalMax: 750, tags: ["Lunch", "Fish"], fiberG: 2.0 },
  { name: "Hainanese Porridge", cuisine: "Singaporean", kcalMin: 300, kcalMax: 500, tags: ["Breakfast", "LowFiber"], fiberG: 0.5 },
  { name: "Ice Kacang", cuisine: "Singaporean", kcalMin: 200, kcalMax: 400, tags: ["Sugar", "Snack"], fiberG: 2.0 },
  { name: "Popiah (2 pieces)", cuisine: "Singaporean", kcalMin: 180, kcalMax: 320, tags: ["Snack", "Veg"], fiberG: 3.0 },
  { name: "Kueh (2 pieces)", cuisine: "Singaporean", kcalMin: 150, kcalMax: 280, tags: ["Snack", "Sugar"], fiberG: 1.0 },

  // More Chinese
  { name: "Peking Duck", cuisine: "Chinese", kcalMin: 600, kcalMax: 900, tags: ["Meat", "Dinner"], fiberG: 0.5 },
  { name: "Char Siu Bao (3 pieces)", cuisine: "Chinese", kcalMin: 300, kcalMax: 450, tags: ["Breakfast", "Meat"], fiberG: 1.0 },
  { name: "Xiao Long Bao (6 pieces)", cuisine: "Chinese", kcalMin: 250, kcalMax: 400, tags: ["Meat", "Snack"], fiberG: 1.0 },
  { name: "Mapo Eggplant", cuisine: "Chinese", kcalMin: 300, kcalMax: 500, tags: ["Spicy", "Veg"], fiberG: 3.0 },

  // Thai
  { name: "Pad Thai", cuisine: "Thai", kcalMin: 500, kcalMax: 800, tags: ["Fried", "Lunch"], fiberG: 3.0 },
  { name: "Tom Yum Soup", cuisine: "Thai", kcalMin: 150, kcalMax: 300, tags: ["Spicy", "Soup"], fiberG: 2.0 },
  { name: "Green Curry", cuisine: "Thai", kcalMin: 450, kcalMax: 700, tags: ["Spicy", "Dairy"], fiberG: 3.0 },
  { name: "Som Tum (Papaya Salad)", cuisine: "Thai", kcalMin: 100, kcalMax: 200, tags: ["Spicy", "Veg", "HighFiber"], fiberG: 5.0 },
  { name: "Mango Sticky Rice", cuisine: "Thai", kcalMin: 350, kcalMax: 550, tags: ["Sugar", "Fruit"], fiberG: 2.0 },

  // Vietnamese
  { name: "Pho (Beef)", cuisine: "Vietnamese", kcalMin: 450, kcalMax: 700, tags: ["Meat", "Lunch"], fiberG: 2.0 },
  { name: "Banh Mi", cuisine: "Vietnamese", kcalMin: 400, kcalMax: 600, tags: ["Lunch", "Meat"], fiberG: 3.0 },
  { name: "Goi Cuon (Fresh Spring Roll)", cuisine: "Vietnamese", kcalMin: 120, kcalMax: 220, tags: ["Snack", "Veg"], fiberG: 2.0 },

  // More Japanese
  { name: "Gyoza (6 pieces)", cuisine: "Japanese", kcalMin: 200, kcalMax: 350, tags: ["Fried", "Meat"], fiberG: 2.0 },
  { name: "Takoyaki (6 pieces)", cuisine: "Japanese", kcalMin: 200, kcalMax: 350, tags: ["Snack", "Fried"], fiberG: 1.0 },
  { name: "Matcha Latte", cuisine: "Japanese", kcalMin: 120, kcalMax: 250, tags: ["Caffeine", "Dairy"], fiberG: 0.5 },
  { name: "Karaage Chicken", cuisine: "Japanese", kcalMin: 400, kcalMax: 650, tags: ["Fried", "Meat"], fiberG: 1.0 },

  // More Western
  { name: "Hot Dog", cuisine: "Western", kcalMin: 300, kcalMax: 500, tags: ["Meat", "Snack"], fiberG: 1.0 },
  { name: "Waffles", cuisine: "Western", kcalMin: 400, kcalMax: 700, tags: ["Breakfast", "Sugar"], fiberG: 2.0 },
  { name: "French Toast", cuisine: "Western", kcalMin: 350, kcalMax: 550, tags: ["Breakfast", "Sugar"], fiberG: 1.5 },
  { name: "Scrambled Eggs", cuisine: "Western", kcalMin: 200, kcalMax: 400, tags: ["Breakfast", "Eggs"], fiberG: 0.0 },
  { name: "Grilled Salmon", cuisine: "Western", kcalMin: 350, kcalMax: 550, tags: ["Fish", "Dinner"], fiberG: 0.0 },
  { name: "Club Sandwich", cuisine: "Western", kcalMin: 500, kcalMax: 750, tags: ["Lunch", "Meat"], fiberG: 3.5 },
  { name: "Burrito", cuisine: "Western", kcalMin: 600, kcalMax: 900, tags: ["Meat", "Lunch"], fiberG: 7.0 },
  { name: "Tacos (3 pieces)", cuisine: "Western", kcalMin: 400, kcalMax: 700, tags: ["Meat", "Spicy"], fiberG: 5.0 },
  { name: "Mac & Cheese", cuisine: "Western", kcalMin: 500, kcalMax: 800, tags: ["Dairy", "Gluten"], fiberG: 2.0 },

  // Desserts & more snacks
  { name: "Donut", cuisine: "Snack", kcalMin: 250, kcalMax: 450, tags: ["Sugar", "Snack"], fiberG: 1.0 },
  { name: "Ice Cream (1 scoop)", cuisine: "Snack", kcalMin: 150, kcalMax: 300, tags: ["Sugar", "Dairy"], fiberG: 0.0 },
  { name: "Chocolate Cake", cuisine: "Snack", kcalMin: 350, kcalMax: 600, tags: ["Sugar", "Dairy"], fiberG: 2.0 },
  { name: "Mango", cuisine: "Snack", kcalMin: 80, kcalMax: 130, tags: ["Fruit", "HighFiber"], fiberG: 3.0 },
  { name: "Orange", cuisine: "Snack", kcalMin: 50, kcalMax: 90, tags: ["Fruit", "HighFiber"], fiberG: 3.0 },
  { name: "Watermelon Slice", cuisine: "Snack", kcalMin: 50, kcalMax: 100, tags: ["Fruit", "Sugar"], fiberG: 1.0 },
  { name: "Cheesecake", cuisine: "Snack", kcalMin: 350, kcalMax: 550, tags: ["Sugar", "Dairy"], fiberG: 1.0 },
  { name: "Acai Bowl", cuisine: "Snack", kcalMin: 300, kcalMax: 600, tags: ["Fruit", "HighFiber", "Sugar"], fiberG: 7.0 },
];

export function searchFoods(query: string, limit = 30): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return FOODS.slice(0, limit);
  return FOODS.filter(
    (f) => f.name.toLowerCase().includes(q) || f.cuisine.toLowerCase().includes(q)
  ).slice(0, limit);
}
