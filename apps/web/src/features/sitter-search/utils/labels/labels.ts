import type { PartName } from "@sitter/domain/ranking";
import type { Service } from "@sitter/domain/sitter";

export const SERVICE_LABELS: Record<Service, string> = {
  boarding: "Boarding",
  day_care: "Day care",
  drop_in: "Drop-in visits",
  dog_walking: "Dog walking",
  house_sitting: "House sitting",
};

export const PART_LABELS: Record<PartName, string> = {
  quality: "Quality",
  responsiveness: "Responsiveness",
  activity: "Activity",
  distance: "Distance",
  coldStart: "Cold-start boost",
};

/** One colour per score part, used in the stacked score bar and the legend. */
export const PART_COLORS: Record<PartName, string> = {
  quality: "#2f6fdf",
  responsiveness: "#1f9d8a",
  activity: "#8a5cd6",
  distance: "#e08a1e",
  coldStart: "#e0457b",
};

/** What a price is for, shown under each price. */
export const SERVICE_UNITS: Record<Service, string> = {
  boarding: "per night",
  day_care: "per day",
  drop_in: "per visit",
  dog_walking: "per walk",
  house_sitting: "per night",
};

/** One line about each service, shown in the service picker. */
export const SERVICE_DESCRIPTIONS: Record<Service, string> = {
  boarding: "Your pet stays overnight at the sitter's home.",
  day_care: "Daytime care at the sitter's home, back with you by evening.",
  drop_in: "The sitter stops by to feed your pet and check everything is fine.",
  dog_walking: "A walk around your neighbourhood, picked up from your door.",
  house_sitting: "The sitter stays at your place and looks after your pets there.",
};

/** Emoji shown next to each service in the picker. */
export const SERVICE_ICONS: Record<Service, string> = {
  boarding: "🌙",
  day_care: "☀️",
  drop_in: "🔑",
  dog_walking: "🦮",
  house_sitting: "🏠",
};

/** How the picker groups the services, in display order. */
export const SERVICE_GROUPS: { title: string; services: Service[] }[] = [
  { title: "At the sitter's home", services: ["boarding", "day_care"] },
  { title: "At your home", services: ["drop_in", "dog_walking", "house_sitting"] },
];
