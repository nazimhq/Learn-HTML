'use client';

import type {AiAnalysis, AiSuggestion} from './types';

/* ----------------------------------------------------------------------------
   AI product assistant.

   The provider sits behind this one module so it can be swapped without
   touching the UI (spec §20). In the static build there is no server to hold
   an API key, so analyse() falls back to a local read of the photo that is
   explicit about being a draft. With the Node build, /api/ai-analyze runs the
   real vision call server-side and the key never reaches the browser.

   Nothing here is ever written to a product without a person approving it
   (spec §80).
---------------------------------------------------------------------------- */

export type AnalysisResult = {
  analysis: AiAnalysis;
  provider: string;
  live: boolean;
};

const CATEGORY_HINTS: Array<{match: RegExp; category: string; subcategory: string}> = [
  {match: /fryer|frier/i, category: 'Kitchen Appliances', subcategory: 'Air Fryer'},
  {match: /vacuum|hoover/i, category: 'Home Appliances', subcategory: 'Vacuum Cleaner'},
  {match: /trolley|cart/i, category: 'Home Storage', subcategory: 'Trolley'},
  {match: /kettle/i, category: 'Kitchen Appliances', subcategory: 'Kettle'},
  {match: /microwave/i, category: 'Kitchen Appliances', subcategory: 'Microwave'},
  {match: /blender|mixer/i, category: 'Kitchen Appliances', subcategory: 'Blender'},
  {match: /monitor|screen|tv/i, category: 'Electronics', subcategory: 'Display'},
  {match: /chair|desk|table/i, category: 'Furniture', subcategory: 'Furniture'}
];

const COLOUR_HINTS = ['black', 'white', 'silver', 'grey', 'gray', 'red', 'blue', 'green', 'pink', 'cream'];

function suggestion(field: string, value: string, confidence: number): AiSuggestion {
  return {field, value, confidence};
}

/** Offline draft built from the typed title. Deliberately low-confidence: it
 *  reads words, it does not look at the photo. */
function localDraft(hintText: string): AiAnalysis {
  const text = hintText.trim();
  const hit = CATEGORY_HINTS.find(h => h.match.test(text));
  const colour = COLOUR_HINTS.find(c => new RegExp(c, 'i').test(text));
  const suggestions: AiSuggestion[] = [];

  if (text) suggestions.push(suggestion('title', text.replace(/\s+/g, ' '), 55));
  if (hit) {
    suggestions.push(suggestion('category', hit.category, 60));
    suggestions.push(suggestion('subcategory', hit.subcategory, 58));
  } else {
    suggestions.push(suggestion('category', 'Needs Verification', 20));
  }
  if (colour) suggestions.push(suggestion('colour', colour[0].toUpperCase() + colour.slice(1), 52));
  else suggestions.push(suggestion('colour', 'Needs Verification', 15));
  suggestions.push(suggestion('condition_observation', 'Needs Verification — no photo analysis available offline', 10));

  return {
    suggestions,
    description: text
      ? `${text}. Condition and completeness not verified — please check the item before listing.`
      : 'Needs Verification.',
    tags: [hit?.subcategory, hit?.category, colour].filter(Boolean).map(t => String(t).toLowerCase()),
    modelUsed: 'local-draft',
    analysedAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null
  };
}

type ApiShape = {
  title?: string; category?: string; subcategory?: string; brand?: string;
  model?: string; colour?: string; visible_features?: string[];
  condition_observation?: string; confidence?: number | Record<string, number>;
  error?: string;
};

function scoreFor(raw: ApiShape['confidence'], field: string, fallback: number) {
  if (typeof raw === 'number') return Math.round(raw <= 1 ? raw * 100 : raw);
  if (raw && typeof raw === 'object' && typeof raw[field] === 'number') {
    const v = raw[field];
    return Math.round(v <= 1 ? v * 100 : v);
  }
  return fallback;
}

export async function analyseProduct(imageUrl: string, hintText: string): Promise<AnalysisResult> {
  try {
    const res = await fetch('/api/ai-analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageUrl})
    });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json() as ApiShape;
    if (data.error || !data.title) throw new Error(data.error || 'no result');

    const suggestions: AiSuggestion[] = [];
    const push = (field: string, value: string | undefined, fallback: number) => {
      if (value) suggestions.push(suggestion(field, value, scoreFor(data.confidence, field, fallback)));
    };
    push('title', data.title, 90);
    push('category', data.category, 85);
    push('subcategory', data.subcategory, 80);
    push('brand', data.brand, 70);
    push('model', data.model, 65);
    push('colour', data.colour, 88);
    push('condition_observation', data.condition_observation, 60);

    return {
      provider: 'openai',
      live: true,
      analysis: {
        suggestions,
        description: [data.title, (data.visible_features ?? []).join(', '), data.condition_observation]
          .filter(Boolean).join('. '),
        tags: (data.visible_features ?? []).map(t => t.toLowerCase()),
        modelUsed: 'gpt-4o-mini',
        analysedAt: new Date().toISOString(),
        approvedBy: null,
        approvedAt: null
      }
    };
  } catch {
    return {provider: 'local-draft', live: false, analysis: localDraft(hintText)};
  }
}

export function confidenceBand(score: number): {label: string; tone: 'good' | 'warn' | 'low'} {
  if (score >= 80) return {label: 'High confidence', tone: 'good'};
  if (score >= 50) return {label: 'Medium confidence', tone: 'warn'};
  return {label: 'Needs verification', tone: 'low'};
}

export const FIELD_LABELS: Record<string, string> = {
  title: 'Product title',
  category: 'Category',
  subcategory: 'Subcategory',
  brand: 'Brand',
  model: 'Model',
  colour: 'Colour',
  condition_observation: 'Condition observation'
};

/** Marketplace titles are generated separately and never overwrite the
 *  internal title (spec §15). */
export function generateEbayListing(p: {title: string; brand: string; model: string; colour: string; subcategory: string; condition: string}) {
  const parts = [p.brand, p.colour, p.subcategory || p.title, p.model].filter(v => v && v !== 'Unbranded');
  return {
    title: (parts.join(' ') || p.title).slice(0, 80),
    description:
      `${p.title}\n\n` +
      `Condition: ${p.condition}. Please read the condition notes and see the photos.\n` +
      `Colour: ${p.colour || 'See photos'}\n` +
      `Model: ${p.model || 'Not stated on the item'}\n\n` +
      `Draft generated for review — check every line before publishing.`,
    itemSpecifics: {Brand: p.brand || 'Unbranded', Colour: p.colour || 'Needs Verification', Model: p.model || 'Needs Verification', Condition: p.condition}
  };
}

export function generateVintedListing(p: {title: string; colour: string; condition: string; subcategory: string}) {
  return {
    title: p.title.slice(0, 60),
    description:
      `${p.title}\n` +
      `Condition: ${p.condition}.\n` +
      `${p.colour ? 'Colour: ' + p.colour + '.\n' : ''}` +
      `See photos for the actual item. Draft for review.`,
    tags: [p.subcategory, p.colour, p.condition].filter(Boolean).map(t => t.toLowerCase())
  };
}
