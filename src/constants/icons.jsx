import {
  Utensils, ShoppingCart, Car, ShoppingBag, Clapperboard, HeartPulse, GraduationCap, Home, Receipt,
  Plane, Sparkles, Tag, Briefcase, Laptop, TrendingUp, Landmark, Gift, Coins, Wallet, Banknote,
  Coffee, Smartphone, Dumbbell, Gamepad2, Music, Baby, PawPrint, Fuel, Shirt, Wrench, PiggyBank,
} from 'lucide-react'

export const ICONS = {
  utensils: Utensils, cart: ShoppingCart, car: Car, bag: ShoppingBag, clapper: Clapperboard, heart: HeartPulse,
  graduation: GraduationCap, home: Home, receipt: Receipt, plane: Plane, sparkles: Sparkles, tag: Tag,
  briefcase: Briefcase, laptop: Laptop, trending: TrendingUp, landmark: Landmark, gift: Gift, coins: Coins,
  wallet: Wallet, banknote: Banknote, coffee: Coffee, phone: Smartphone, dumbbell: Dumbbell, game: Gamepad2,
  music: Music, baby: Baby, paw: PawPrint, fuel: Fuel, shirt: Shirt, wrench: Wrench, piggy: PiggyBank,
}

export function CategoryIcon({ name, className = 'size-4' }) {
  const Icon = ICONS[name] || Tag
  return <Icon className={className} aria-hidden="true" />
}
