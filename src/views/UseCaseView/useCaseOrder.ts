// src/views/UseCaseView/useCaseOrder.ts
// Demo script order for the capability tiles (demo-align Item 5): the
// worked example leads, then the downstream capabilities in the order
// the talk track visits them. Ordering is constant-driven here, never
// incidental fixture order; a use case not named below renders after
// the ordered set, in fixture order (stable sort), never an error.

export const USE_CASE_DISPLAY_ORDER: string[] = [
  'diabetes_risk_stratification',
  'care_coordination',
  'vbc_reporting',
  'hypertension_risk_stratification',
];

// The tile carrying the small "worked example" tag.
export const WORKED_EXAMPLE_USE_CASE = 'diabetes_risk_stratification';

export function orderUseCases<T extends { useCaseName: string }>(useCases: T[]): T[] {
  const rank = (name: string) => {
    const index = USE_CASE_DISPLAY_ORDER.indexOf(name);
    return index === -1 ? USE_CASE_DISPLAY_ORDER.length : index;
  };
  return [...useCases].sort((a, b) => rank(a.useCaseName) - rank(b.useCaseName));
}
