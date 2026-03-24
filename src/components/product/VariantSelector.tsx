"use client";

interface Variant {
  id: string;
  title: string;
  price: number;
  inStock: boolean;
  optionValues: Record<string, string>;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
}

export function VariantSelector({ variants, selectedVariantId, onSelect }: VariantSelectorProps) {
  // Group variants by option name (e.g., Color, Size)
  const optionNames = new Set<string>();
  for (const variant of variants) {
    const values = variant.optionValues as Record<string, string>;
    for (const key of Object.keys(values)) {
      optionNames.add(key);
    }
  }

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const selectedValues: Record<string, string> = selectedVariant
    ? (selectedVariant.optionValues as Record<string, string>)
    : {};

  // For each option name, get unique values
  const optionGroups = Array.from(optionNames).map((name) => {
    const values = Array.from(
      new Set(variants.map((v) => (v.optionValues as Record<string, string>)[name]).filter(Boolean))
    );
    return { name, values };
  });

  const handleOptionChange = (optionName: string, value: string) => {
    const newValues = { ...selectedValues, [optionName]: value };
    // Find the variant that matches all selected option values
    const match = variants.find((v) => {
      const vValues = v.optionValues as Record<string, string>;
      return Object.entries(newValues).every(([k, val]) => vValues[k] === val);
    });
    if (match) {
      onSelect(match.id);
    }
  };

  return (
    <div className="space-y-4">
      {optionGroups.map((group) => (
        <fieldset key={group.name}>
          <legend className="text-sm font-medium text-gray-700">{group.name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const isSelected = selectedValues[group.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleOptionChange(group.name, value)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
