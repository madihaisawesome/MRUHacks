export const CATEGORIES = [
  { name: 'Clothing and crafts', icon: '🧵' },
  { name: 'Everyday repairs', icon: '🔧' },
  { name: 'Gardening', icon: '🌱' },
  { name: 'Cooking', icon: '🍞' },
  { name: 'Household skills', icon: '🏡' },
];

const makeSkill = (
  id,
  title,
  cat,
  level,
  time,
  icon,
  materials
) => ({
  id,
  title,
  cat,
  level,
  time,
  icon,
  materials,
});

export const SKILLS = [
  makeSkill(
    'sew-button',
    'Sew a Button',
    'Clothing and crafts',
    'Beginner',
    '15 min',
    '🔘',
    ['Needle', 'Thread', 'Button', 'Scissors', 'Fabric']
  ),
  makeSkill(
    'knot-tie',
    'Knot a Tie',
    'Clothing and crafts',
    'Beginner',
    '10 min',
    '👔',
    ['Necktie', 'Collared shirt', 'Mirror']
  ),
  makeSkill(
    'fix-handle',
    'Fix a Loose Cabinet Handle',
    'Everyday repairs',
    'Beginner',
    '20 min',
    '🔩',
    ['Screwdriver', 'Correct replacement screw if needed']
  ),
  makeSkill(
    'replace-tire',
    'Replace a Car Tire',
    'Everyday repairs',
    'Intermediate',
    '45 min',
    '🛞',
    [
      'Spare tire',
      'Vehicle jack',
      'Lug wrench',
      'Wheel wedges',
      "Owner's manual",
    ]
  ),
  makeSkill(
    'grow-herbs',
    'Grow Herbs',
    'Gardening',
    'Beginner',
    '30 min',
    '🌿',
    ['Herb seeds or seedlings', 'Pot with drainage', 'Potting soil', 'Water']
  ),
  makeSkill(
    'compost',
    'Compost',
    'Gardening',
    'Beginner',
    '25 min',
    '🍂',
    ['Compost bin', 'Fruit and vegetable scraps', 'Dry leaves or torn cardboard']
  ),
  makeSkill(
    'bake-bread',
    'Bake Bread',
    'Cooking',
    'Beginner',
    '3 hr',
    '🍞',
    ['Flour', 'Yeast', 'Salt', 'Warm water', 'Oven']
  ),
  makeSkill(
    'pizza-dough',
    'Make Pizza Dough from Scratch',
    'Cooking',
    'Beginner',
    '90 min',
    '🍕',
    ['Flour', 'Yeast', 'Salt', 'Olive oil', 'Warm water']
  ),
  makeSkill(
    'remove-stains',
    'Remove Common Stains',
    'Household skills',
    'Beginner',
    '20 min',
    '🧼',
    ['Clean cloth', 'Cold water', 'Suitable detergent']
  ),
  makeSkill(
    'organize-tools',
    'Organize Tools',
    'Household skills',
    'Beginner',
    '30 min',
    '🧰',
    ['Tools', 'Storage bins or pegboard', 'Labels']
  ),
];