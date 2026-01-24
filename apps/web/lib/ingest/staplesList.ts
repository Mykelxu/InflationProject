export type StapleItem = {
  label: string;
  term: string;
  category: string;
  unit: string;
};

export const stapleItems: StapleItem[] = [
  { label: "Whole milk", term: "whole milk", category: "Dairy", unit: "1 gal" },
  { label: "Eggs", term: "eggs", category: "Dairy", unit: "12 ct" },
  { label: "Bread", term: "bread", category: "Bakery", unit: "1 loaf" },
  { label: "Butter", term: "butter", category: "Dairy", unit: "1 lb" },
  { label: "Chicken breast", term: "chicken breast", category: "Meat", unit: "1 lb" },
  { label: "Rice", term: "rice", category: "Pantry", unit: "2 lb" },
  { label: "Flour", term: "flour", category: "Pantry", unit: "5 lb" },
  { label: "Sugar", term: "sugar", category: "Pantry", unit: "4 lb" },
  { label: "Pasta", term: "pasta", category: "Pantry", unit: "1 lb" },
  { label: "Cereal", term: "cereal", category: "Pantry", unit: "18 oz" },
  { label: "Coffee", term: "coffee", category: "Pantry", unit: "12 oz" },
  { label: "Apples", term: "apples", category: "Produce", unit: "1 lb" },
  { label: "Bananas", term: "bananas", category: "Produce", unit: "1 lb" },
  { label: "Lettuce", term: "lettuce", category: "Produce", unit: "1 head" },
  { label: "Potatoes", term: "potatoes", category: "Produce", unit: "5 lb" },
  { label: "Onions", term: "onions", category: "Produce", unit: "3 lb" },
  { label: "Ground beef", term: "ground beef", category: "Meat", unit: "1 lb" },
  { label: "Cheese", term: "cheddar cheese", category: "Dairy", unit: "8 oz" },
  { label: "Yogurt", term: "yogurt", category: "Dairy", unit: "32 oz" },
  { label: "Peanut butter", term: "peanut butter", category: "Pantry", unit: "16 oz" },
];
