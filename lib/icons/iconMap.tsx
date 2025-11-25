'use client';

import React from 'react';
import {
  // Navigation
  DoorOpen, ChefHat, Apple, CookingPot, Refrigerator, BookOpen,
  Calendar, Settings,

  // Food Categories
  Beef, Milk, Carrot, Wheat, Droplet, Package, GlassWater,

  // Actions & UI
  UtensilsCrossed, Search, Check, CheckCircle2, X, XCircle,
  AlertTriangle, Lightbulb, Loader2, Camera, Edit3, Trash2, Pen,
  MessageCircle, Target, Info, Plus, Minus, Inbox, Heart, Share2,

  // Recipe Metadata
  Clock, Timer, Utensils, Flame,

  // Storage & Locations
  Snowflake, Container, MapPin, Home, ShoppingBasket, ShoppingCart,

  // Appliances (using PocketKnife for preparation)
  PocketKnife, Sparkles, Cookie,

  // Other
  GraduationCap, Send, Bell, Circle, ChevronRight, ArrowRight, ArrowLeft,
  TrendingDown, AlertCircle, Sun,

  // Types
  LucideIcon
} from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
export type IconStyle = 'outlined' | 'filled';

/**
 * Mapeo de tamaños de íconos con clases Tailwind responsive
 */
export const iconSizeMap: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5 md:w-6 md:h-6',
  lg: 'w-6 h-6 md:w-8 md:h-8',
  xl: 'w-8 h-8 md:w-10 md:h-10',
  hero: 'w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24',
};

/**
 * Íconos de navegación - Literales y distintivos según feedback del usuario
 */
export const navigationIcons: Record<string, LucideIcon> = {
  home: DoorOpen,           // Puerta (distintivo de Home genérico)
  cook: ChefHat,            // Gorro de chef para cocinar
  inventory: Apple,         // Ingrediente literal (manzana)
  'mi-cocina': CookingPot,  // Olla/estufa (distintivo de ChefHat persona)
  locations: Refrigerator,  // Refrigerador (distintivo de MapPin)
  glossary: BookOpen,       // Libro abierto
  recipes: BookOpen,        // Libro abierto (mismo que glossary, pero OK)
  plan: Calendar,           // Calendario
  settings: Settings,       // Engranaje
};

/**
 * Íconos de categorías de ingredientes - Literales según feedback del usuario
 */
export const categoryIcons: Record<string, LucideIcon> = {
  'Proteínas': Beef,
  'Lácteos': Milk,
  'Vegetales': Carrot,
  'Frutas': Apple,
  'Granos': Wheat,
  'Harinas': Wheat,
  'Condimentos': Sparkles,
  'Aceites': Droplet,
  'Endulzantes': Droplet,  // Se puede colorear con amber
  'Bebidas': GlassWater,
  'Otros': Package,
};

/**
 * Íconos de acciones comunes
 */
export const actionIcons = {
  search: Search,
  check: Check,
  checkCircle: CheckCircle2,
  close: X,
  closeCircle: XCircle,
  warning: AlertTriangle,
  alert: AlertCircle,
  tip: Lightbulb,
  loading: Loader2,
  camera: Camera,
  edit: Edit3,
  pen: Pen,
  delete: Trash2,
  info: Info,
  add: Plus,
  remove: Minus,
  inbox: Inbox,
  heart: Heart,
  share: Share2,
  send: Send,
  bell: Bell,
  target: Target,
  message: MessageCircle,
  trendingDown: TrendingDown,
  sun: Sun,
  circle: Circle,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
};

/**
 * Íconos de metadata de recetas
 */
export const recipeIcons = {
  time: Clock,
  timer: Timer,
  difficulty: ChefHat,
  servings: Utensils,
  calories: Flame,
  cookingAction: CookingPot,
  plate: UtensilsCrossed,
};

/**
 * Íconos de ubicaciones de almacenamiento
 */
export const storageIcons = {
  refrigerator: Refrigerator,
  freezer: Snowflake,
  pantry: Container,
  general: Package,
  location: MapPin,
  home: Home,
  basket: ShoppingBasket,
  cart: ShoppingCart,
};

/**
 * Íconos de categorías de electrodomésticos
 */
export const applianceIcons = {
  cooking: Flame,            // Cocción
  refrigeration: Snowflake,  // Refrigeración
  preparation: PocketKnife,  // Preparación
  cleaning: Sparkles,        // Limpieza
  baking: Cookie,            // Horneado
  other: Package,            // Otros
};

/**
 * Íconos educativos
 */
export const learningIcons = {
  learn: GraduationCap,
  book: BookOpen,
  calendar: Calendar,
};

/**
 * Calcula el strokeWidth apropiado basado en el estilo y tamaño del ícono
 */
export function getStrokeWidth(style: IconStyle, size: IconSize): number {
  if (style === 'filled') return 0;

  // Outlined icons con stroke width adaptativo
  if (size === 'xs' || size === 'sm') return 2;
  if (size === 'hero' || size === 'xl') return 1.5;
  return 2;
}

/**
 * Helper para obtener el ícono de una categoría de ingrediente
 */
export const getCategoryIcon = (category: string): LucideIcon => {
  return categoryIcons[category] || Package;
};

/**
 * Helper para obtener el ícono de una categoría de electrodoméstico
 */
export const getApplianceIcon = (category: string): LucideIcon => {
  const map: Record<string, LucideIcon> = {
    'Cocción': Flame,
    'Refrigeración': Snowflake,
    'Preparación': PocketKnife,
    'Limpieza': Sparkles,
    'Horneado': Cookie,
    'Otros': Package,
  };
  return map[category] || Package;
};

/**
 * Helper para obtener el ícono de una ubicación de almacenamiento
 */
export const getStorageIcon = (location: string): LucideIcon => {
  const map: Record<string, LucideIcon> = {
    'Refrigerador': Refrigerator,
    'Congelador': Snowflake,
    'Alacena': Container,
    'Despensa': Container,
    'Cocina': Home,
    'Otro': Package,
  };
  return map[location] || Package;
};

/**
 * Componente wrapper para uso consistente de íconos en toda la app
 *
 * @example
 * ```tsx
 * // Badge pequeño con outlined style
 * <RemIcon icon={Clock} size="sm" style="outlined" className="inline mr-1" />
 *
 * // Hero grande con filled style
 * <RemIcon icon={CookingPot} size="hero" style="filled" className="text-white" />
 *
 * // Navegación con color primario
 * <RemIcon icon={DoorOpen} size="md" style="filled" className="text-[var(--color-primary)]" />
 * ```
 */
export interface RemIconProps {
  icon: LucideIcon;
  size?: IconSize;
  style?: IconStyle;
  className?: string;
  color?: string;
}

export function RemIcon({
  icon: Icon,
  size = 'md',
  style = 'outlined',
  className = '',
  color
}: RemIconProps) {
  const sizeClass = iconSizeMap[size];
  const strokeWidth = getStrokeWidth(style, size);
  const fillClass = style === 'filled' ? 'fill-current' : 'fill-none';

  return (
    <Icon
      className={`${sizeClass} ${fillClass} ${className}`}
      strokeWidth={strokeWidth}
      style={color ? { color } : undefined}
    />
  );
}

/**
 * Re-exports de íconos individuales para imports directos
 */
export {
  // Navigation
  DoorOpen, ChefHat, Apple, CookingPot, Refrigerator, BookOpen,
  Calendar, Settings,

  // Food
  Beef, Milk, Carrot, Wheat, Droplet, Package, GlassWater,

  // Actions
  UtensilsCrossed, Search, Check, X, AlertTriangle, Lightbulb,
  Loader2, Camera, Edit3, Trash2, Plus, Minus, Heart, Share2,

  // Recipe
  Clock, Timer, Utensils, Flame,

  // Storage
  Snowflake, Container, MapPin, Home,

  // Appliances
  PocketKnife, Sparkles, Cookie,

  // Other
  GraduationCap, Info, Target, MessageCircle,

  // Type
  type LucideIcon,
};
