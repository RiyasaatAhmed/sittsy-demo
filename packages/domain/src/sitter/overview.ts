// Short "overview" paragraph for each FAKE sitter. Built from the sitter's own
// numbers plus a few invented phrases, picked deterministically by id, so the
// same sitter always reads the same. Pure function: easy to test.

import { RANKING_CONSTANTS } from "../ranking";

export type OverviewInput = {
  id: number;
  name: string;
  ratingAverage: number | null;
  ratingCount: number;
  medianResponseMinutes: number;
  bookingsLast30d: number;
  identityVerified: boolean;
  ageDays: number;
};

/** Invented backgrounds. Written to fit after the sitter's first name. */
const BACKGROUNDS = [
  "grew up on a farm surrounded by dogs, cats and one very opinionated goat",
  "volunteers at a local animal shelter most weekends",
  "works from home as a translator, so pets are never left alone for long",
  "has fostered rescue dogs for several years and loves a calm, steady routine",
  "trained as a veterinary assistant before moving to Paris",
  "lives with a retired greyhound who is happy to welcome new friends",
  "is a keen runner and enjoys long walks along the canal",
  "studied animal behaviour and enjoys helping nervous pets feel at home",
  "has looked after the neighbours' pets since school",
  "is a primary-school teacher with endless patience and a soft spot for puppies",
];

/** Invented care habits. Each is a full sentence. */
const CARE_NOTES = [
  "Expect regular photo updates and a short note after every visit.",
  "Feeding times, routines and medication are followed to the letter.",
  "Shy or anxious animals are given all the time they need to settle in.",
  "Walks are matched to each dog's energy, from gentle strolls to park runs.",
  "Owners get a quick message on arrival and again when the visit ends.",
];

/** Invented home and availability details. Each is a full sentence. */
const HOME_NOTES = [
  "Their flat is on a quiet street a few minutes from a large park, and they are home most evenings and weekends.",
  "They have a small garden, a stock of spare leads and toys, and flexible hours during the week.",
  "Their home is pet-proofed, non-smoking and calm, with plenty of room for naps by the window.",
  "They keep a simple diary for each stay so owners know exactly how meals, walks and naps went.",
  "They are happy to do a short meet-and-greet before the first booking so pets can say hello first.",
  "They are available most weekdays and can usually take last-minute bookings at short notice.",
];

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

function experienceSentence(s: OverviewInput): string {
  if (s.ratingCount === 0 || s.ratingAverage === null) {
    if (s.ageDays < RANKING_CONSTANTS.COLD_START_DAYS) {
      return s.identityVerified
        ? "New to the platform, they have completed identity verification and are ready for a first booking."
        : "New to the platform, they are still completing their profile.";
    }
    return "They are still collecting their first reviews.";
  }
  const reviews = s.ratingCount === 1 ? "1 review" : `${s.ratingCount} reviews`;
  const bookings =
    s.bookingsLast30d === 0
      ? ""
      : `, with ${s.bookingsLast30d} booking${s.bookingsLast30d === 1 ? "" : "s"} in the last month`;
  return `Rated ${s.ratingAverage.toFixed(1)} out of 5 across ${reviews}${bookings}.`;
}

export function sitterOverview(s: OverviewInput): string {
  const background = BACKGROUNDS[s.id % BACKGROUNDS.length];
  const care = CARE_NOTES[(s.id * 7) % CARE_NOTES.length];
  const home = HOME_NOTES[(s.id * 5) % HOME_NOTES.length];
  return [
    `${firstName(s.name)} ${background}.`,
    experienceSentence(s),
    care,
    home,
    `Usually replies within about ${s.medianResponseMinutes} minutes.`,
  ].join(" ");
}
