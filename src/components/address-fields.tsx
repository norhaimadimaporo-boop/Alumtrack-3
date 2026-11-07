import { useEffect, useMemo, useState } from "react";

import { LocationCombobox, type ComboOption } from "@/components/location-combobox";
import {
  findCountryByName,
  findStateByName,
  loadGeoCountries,
  loadGeoCountry,
  type GeoCountry,
  type GeoCountryData,
} from "@/lib/geo-data";
import { getBarangayNames, isPhilippinesCountry } from "@/lib/ph-barangays";
import type { AddressInput } from "@/lib/registration.types";

/**
 * Address block shared by the registration form and the Edit Profile modal.
 *
 * Layout (two columns, row by row):
 *   Country | Province / State
 *   City / Municipality | Subdivision / Barangay
 *   Street | Block
 *   House No. | Zip Code
 *
 * Country, province and city are cascading: changing a parent clears the
 * children. Each dropdown also accepts typed text when the place is not listed.
 * Country / province / city lists are shown in full A–Z order (no item cap).
 *
 * When the country is the Philippines, Subdivision / Barangay is a cascading
 * dropdown fed by the PSGC dataset filtered by the chosen city (and province
 * for duplicate city names). For any other country it stays a free-text field
 * for the subdivision / neighbourhood.
 */
export function AddressFields({
  value,
  onChange,
}: {
  value: AddressInput;
  onChange: (next: AddressInput) => void;
}) {
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [countryData, setCountryData] = useState<GeoCountryData | null>(null);

  useEffect(() => {
    let active = true;
    loadGeoCountries()
      .then((list) => {
        if (active) setCountries(list);
      })
      .catch(() => {
        if (active) setCountries([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const countryMeta = findCountryByName(countries, value.country);
  const countryCode = countryMeta?.code ?? "";

  useEffect(() => {
    if (!countryCode) {
      setCountryData(null);
      return;
    }
    let active = true;
    loadGeoCountry(countryCode)
      .then((data) => {
        if (active) setCountryData(data);
      })
      .catch(() => {
        if (active) setCountryData(null);
      });
    return () => {
      active = false;
    };
  }, [countryCode]);

  const selectedState = countryData ? findStateByName(countryData, value.province) : undefined;

  const countryOptions = useMemo<ComboOption[]>(
    () =>
      [...countries]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((country) => ({ label: country.name })),
    [countries],
  );

  const stateOptions = useMemo<ComboOption[]>(
    () =>
      [...(countryData?.states ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((state) => ({ label: state.name, lat: state.lat, lng: state.lng })),
    [countryData],
  );

  const cityOptions = useMemo<ComboOption[]>(() => {
    const source = selectedState?.cities.length ? selectedState.cities : (countryData?.cities ?? []);
    return [...source]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((city) => ({ label: city.name, lat: city.lat, lng: city.lng }));
  }, [countryData, selectedState]);

  const isPhilippines = isPhilippinesCountry(value.country);

  const barangayOptions = useMemo<ComboOption[]>(() => {
    if (!isPhilippines) return [];
    return getBarangayNames(value.city, value.province)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name }));
  }, [isPhilippines, value.city, value.province]);

  const setCountry = (name: string) => {
    if (name.trim() === value.country.trim()) {
      onChange({ ...value, country: name });
      return;
    }
    onChange({
      ...value,
      country: name,
      province: "",
      city: "",
      subdivision: "",
      latitude: null,
      longitude: null,
    });
  };

  const setProvince = (name: string, option?: ComboOption) => {
    onChange({
      ...value,
      province: name,
      city: "",
      subdivision: "",
      latitude: option?.lat ?? null,
      longitude: option?.lng ?? null,
    });
  };

  const setCity = (name: string, option?: ComboOption) => {
    const fallback = !name.trim() && selectedState ? selectedState : null;
    onChange({
      ...value,
      city: name,
      subdivision: "",
      latitude: option?.lat ?? fallback?.lat ?? null,
      longitude: option?.lng ?? fallback?.lng ?? null,
    });
  };

  const setBarangay = (name: string) => {
    onChange({ ...value, subdivision: name });
  };

  const setText = (key: "subdivision" | "street" | "block" | "houseNo" | "zipCode") => (text: string) =>
    onChange({ ...value, [key]: text });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <LocationCombobox
        label="Country"
        value={value.country}
        onChange={(name) => setCountry(name)}
        options={countryOptions}
        placeholder="Search or type a country"
        required
      />
      <LocationCombobox
        label="Province / State / Region"
        value={value.province}
        onChange={setProvince}
        options={stateOptions}
        placeholder={countryCode ? "Search or type a province" : "Choose a country first, or type"}
        required
      />
      <LocationCombobox
        label="City / Municipality"
        value={value.city}
        onChange={setCity}
        options={cityOptions}
        placeholder={selectedState || countryData ? "Search or type a city" : "Type a city"}
        required
      />
      {isPhilippines ? (
        <LocationCombobox
          label="Subdivision / Barangay"
          value={value.subdivision}
          onChange={setBarangay}
          options={barangayOptions}
          placeholder={
            !value.city.trim()
              ? "Choose a city first, or type"
              : barangayOptions.length === 0
                ? "No PSGC match — type a barangay"
                : "Search or type a barangay"
          }
        />
      ) : (
        <TextField
          label="Subdivision / Barangay"
          value={value.subdivision}
          onChange={setText("subdivision")}
        />
      )}
      <TextField label="Street (optional)" value={value.street} onChange={setText("street")} />
      <TextField label="Block (optional)" value={value.block} onChange={setText("block")} />
      <TextField label="House No. (optional)" value={value.houseNo} onChange={setText("houseNo")} />
      <TextField label="Zip Code (optional)" value={value.zipCode} onChange={setText("zipCode")} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
      />
    </label>
  );
}
