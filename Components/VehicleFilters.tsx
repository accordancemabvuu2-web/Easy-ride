"use client";

import { SlidersHorizontal } from "lucide-react";

type FilterValue = string | number;

interface VehicleFiltersProps {
  locations: string[];
  makes: string[];
  models: string[];
  bodyTypes: string[];
  years: number[];
  location: string;
  make: string;
  model: string;
  priceMin: number | "";
  priceMax: number | "";
  yearMin: number | "";
  yearMax: number | "";
  mileageMax: number | "";
  bodyType: string;
  transmission: string;
  fuelType: string;
  condition: string;
  onChange: (key: string, value: FilterValue) => void;
  hasFilters: boolean;
  clearFilters: () => void;
}

export default function VehicleFilters({
  locations, makes, models, bodyTypes, years,
  location, make, model, priceMin, priceMax, yearMin, yearMax, mileageMax,
  bodyType, transmission, fuelType, condition, onChange, hasFilters, clearFilters,
}: VehicleFiltersProps) {
  return (
    <details open className="group h-fit rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-24 lg:open">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden lg:cursor-default">
        <span className="flex items-center gap-2 font-bold text-slate-900"><SlidersHorizontal size={18} className="text-[#0B5D3B]" />Filters</span>
        {hasFilters && <button type="button" onClick={(event) => { event.preventDefault(); clearFilters(); }} className="ml-auto text-xs font-semibold text-[#0B5D3B] hover:underline">Clear all</button>}
      </summary>
      <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-1">
        <FilterSelect label="Location" value={location} param="location" options={locations} onChange={onChange} />
        <FilterSelect label="Make" value={make} param="make" options={makes} onChange={(key, value) => { onChange(key, value); onChange("model", "all"); }} />
        <FilterSelect label="Model" value={model} param="model" options={models} onChange={onChange} />
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect label="Min price" value={priceMin} param="priceMin" options={priceOptions} onChange={onChange} anyLabel="No minimum" />
          <FilterSelect label="Max price" value={priceMax} param="priceMax" options={priceOptions} onChange={onChange} anyLabel="No maximum" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect label="Year from" value={yearMin} param="yearMin" options={years} onChange={onChange} anyLabel="Any year" />
          <FilterSelect label="Year to" value={yearMax} param="yearMax" options={years} onChange={onChange} anyLabel="Any year" />
        </div>
        <FilterSelect label="Max mileage" value={mileageMax} param="mileageMax" options={mileageOptions} onChange={onChange} anyLabel="Any mileage" />
        <FilterSelect label="Vehicle type" value={bodyType} param="bodyType" options={bodyTypes} onChange={onChange} anyLabel="Any type" />
        <FilterSelect label="Transmission" value={transmission} param="transmission" options={["Automatic", "Manual"]} onChange={onChange} anyLabel="Any transmission" />
        <FilterSelect label="Fuel" value={fuelType} param="fuelType" options={["Petrol", "Diesel", "Hybrid", "Electric"]} onChange={onChange} anyLabel="Any fuel" />
        <FilterSelect label="Condition" value={condition} param="condition" options={["New", "Excellent", "Good", "Fair"]} onChange={onChange} anyLabel="Any condition" />
      </div>
    </details>
  );
}

const priceOptions = [1000, 2500, 5000, 10000, 15000, 25000, 50000, 100000];
const mileageOptions = [25000, 50000, 75000, 100000, 150000, 200000, 300000];

function FilterSelect({
  label, value, param, options, onChange, anyLabel = "Any",
}: {
  label: string;
  value: FilterValue;
  param: string;
  options: Array<string | number>;
  onChange: (key: string, value: FilterValue) => void;
  anyLabel?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <select value={value} onChange={(event) => onChange(param, event.target.value)} className="min-h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0B5D3B] focus:ring-2 focus:ring-emerald-100">
        <option value={param === "priceMin" || param === "priceMax" || param === "yearMin" || param === "yearMax" || param === "mileageMax" ? "" : "all"}>{anyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{typeof option === "number" && (param === "priceMin" || param === "priceMax") ? `$${option.toLocaleString()}` : typeof option === "number" && param === "mileageMax" ? `${option.toLocaleString()} km` : option}</option>)}
      </select>
    </label>
  );
}
