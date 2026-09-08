/**
 * Nav presentation — L1 order, labels and emoji only.
 * Product assignment SoT remains L3; hierarchy comes from the live taxonomy tree.
 */

/** Preferred L1 order in the drawer (slugs must exist in the live tree). */
export const NAV_L1_ORDER = [
  "informatica",
  "telemoveis",
  "gaming",
  "tv_audio",
  "fotografia",
  "casa",
  "moda",
  "desporto",
] as const;

/** L1 slugs grouped under the virtual "Mais" bucket (not top-level). */
export const NAV_MAIS_L1_SLUGS = ["servicos", "pecas"] as const;

/** Never shown in navigation. */
export const NAV_HIDDEN_L1_SLUGS = new Set(["outros", "fila"]);

/**
 * Display overrides (UX). Hub display_name is preferred when already updated;
 * these ensure correct PT labels even before seed apply.
 */
export const NAV_LABEL_OVERRIDES: Record<string, string> = {
  telemoveis: "Dispositivos móveis",
  tv_audio: "Imagem e Som",
  dispositivos: "Telemóveis e tablets",
};

export const NAV_L1_EMOJI: Record<string, string> = {
  informatica: "💻",
  telemoveis: "📱",
  gaming: "🎮",
  tv_audio: "📺",
  fotografia: "📷",
  casa: "🏠",
  moda: "👕",
  desporto: "🎾",
  servicos: "🛠️",
  pecas: "🔧",
};

export const NAV_MAIS_ID = "__mais__";

export const POPULAR_LEAF_FALLBACK = [
  "smartphone",
  "laptop",
  "ssd",
  "gpu",
  "smartwatch",
  "security_camera",
  "padel_gear",
  "air_fryer",
] as const;

/** Extra SSG slugs for elevated / v1.2 leaves (FE only). */
export const P32_EXTRA_STATIC_SLUGS = [
  "wearables",
  "smart_home",
  "desporto",
  "raquetes",
  "padel_gear",
  "padel_apparel",
  "sports_equipment",
  "apparel",
  "footwear",
  "personal_care",
  "security_camera",
  "smart_plug",
  "smart_bulb",
  "smart_lock",
  "smart_ring",
  "item_tracker",
  "cookware",
  "iron",
  "laptop_bag",
  "gimbal",
  "camera_filter",
  "camera_bag",
  "drones",
  "drone",
  "drone_accessory",
  "cozinha_utensilios",
  "cuidado_roupa",
  "kitchen_appliance",
  "tablet_case",
  "car_mount",
  "casa_lighting",
  "furniture",
  "consumer_batteries",
  "toys_collectibles",
  "optical_media",
  "server",
  "sbc",
  "hardware_wallet",
  "moda",
  "vestuario",
  "calcado",
] as const;
