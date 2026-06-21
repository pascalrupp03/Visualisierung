#!/usr/bin/env python3
"""Build a curated JSON dataset for the visualization app.

Reads source files from ``data/`` and writes one structured JSON file to
``app/src/data/data.json``. The output is intentionally organized around the
story shown in the website.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import defaultdict
from datetime import date, datetime
from datetime import timezone
from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
APP_DATA_DIR = PROJECT_ROOT / "app" / "src" / "data"
DEFAULT_DATA_DIR = PROJECT_ROOT / "data"
DEFAULT_OUTPUT = APP_DATA_DIR / "data.json"

# Optional dedicated district-rent source. If it does not exist, we fall back
# to the currently committed app data file (legacy behavior).
DISTRICT_RENT_SOURCE = DEFAULT_DATA_DIR / "building_and_flats" / "vienna_district_rents.json"
LEGACY_DISTRICT_RENT_SOURCE = APP_DATA_DIR / "data.json"


def to_native(value):
    if value is None:
        return None
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat()
    if isinstance(value, (np.integer, np.int64, np.int32)):
        return int(value)
    if isinstance(value, (np.floating, np.float64, np.float32)):
        value = float(value)
        return None if math.isnan(value) else value
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, dict):
        return {str(key): to_native(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_native(item) for item in value]
    if isinstance(value, tuple):
        return [to_native(item) for item in value]
    if hasattr(value, "item"):
        try:
            return to_native(value.item())
        except Exception:
            pass
    return value


def normalize_text(value):
    if value is None:
        return ""
    return " ".join(str(value).replace("\xa0", " ").split()).strip()


def read_sheet(path: Path, sheet_name: str, header: int | None = 0) -> pd.DataFrame:
    return pd.read_excel(path, sheet_name=sheet_name, header=header)


def numeric(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        return float(value)
    except Exception:
        return None


def monthly_from_annual(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value / 12, 2)


def build_income_trend(frame: pd.DataFrame, section_offset: int) -> list[dict]:
    years = list(range(1998, 2024))
    rows = frame.iloc[section_offset : section_offset + 3]
    series = []

    for _, row in rows.iterrows():
        point = {}
        for offset, year in enumerate(years, start=1):
            point[str(year)] = numeric(row.iloc[offset])
        series.append(point)

    return [
        {
            "year": year,
            "overall": series[0][str(year)],
            "women": series[1][str(year)],
            "men": series[2][str(year)],
        }
        for year in years
    ]


def build_trend_dataset(path: Path, sheet_name: str, section_offset: int) -> list[dict]:
    frame = read_sheet(path, sheet_name=sheet_name, header=0)
    return build_income_trend(frame, section_offset)


def build_constant_price_income(
    nominal_series: list[dict],
    real_index_series: list[dict],
) -> list[dict]:
    """Convert a real-income index (base=100) into constant-price annual euros.

    The source workbook provides real-income trends as index values. The app,
    however, visualizes yearly income in euros. We therefore scale the index by
    the nominal base-year level (first common year) to obtain a comparable
    constant-price euro series.
    """

    if not nominal_series or not real_index_series:
        return []

    real_by_year = {item["year"]: item for item in real_index_series}
    common_years = [item["year"] for item in nominal_series if item["year"] in real_by_year]
    if not common_years:
        return []

    base_year = min(common_years)
    base_nominal = next((item for item in nominal_series if item["year"] == base_year), None)
    base_real_index = real_by_year.get(base_year)

    if base_nominal is None or base_real_index is None:
        return []

    def convert_component(base_value: float | None, index_value: float | None) -> float | None:
        if base_value is None or index_value is None:
            return None
        return round(base_value * (index_value / 100.0), 2)

    rows = []
    for nominal_point in nominal_series:
        year = nominal_point["year"]
        real_index_point = real_by_year.get(year)
        if real_index_point is None:
            continue

        rows.append(
            {
                "year": year,
                "overall": convert_component(base_nominal.get("overall"), real_index_point.get("overall")),
                "women": convert_component(base_nominal.get("women"), real_index_point.get("women")),
                "men": convert_component(base_nominal.get("men"), real_index_point.get("men")),
            }
        )

    return rows


def build_age_income(path: Path) -> list[dict]:
    frame = read_sheet(path, sheet_name="Tabelle_33", header=0)
    rows = []

    for _, row in frame.iloc[3:9].iterrows():
        rows.append(
            {
                "label": normalize_text(row.iloc[0]),
                "income": {
                    "all": {
                        "median": numeric(row.iloc[1]),
                        "female": numeric(row.iloc[2]),
                        "male": numeric(row.iloc[3]),
                    },
                    "fullTime": {
                        "median": numeric(row.iloc[5]),
                        "female": numeric(row.iloc[6]),
                        "male": numeric(row.iloc[7]),
                    },
                },
                "femaleMedianShareAll": numeric(row.iloc[4]),
                "femaleMedianShareFullTime": numeric(row.iloc[8]),
            }
        )

    return rows


def build_education_income(path: Path) -> list[dict]:
    frame = read_sheet(path, sheet_name="Tabelle_62", header=0)
    rows = []

    for _, row in frame.iloc[2:8].iterrows():
        rows.append(
            {
                "label": normalize_text(row.iloc[0]),
                "population": numeric(row.iloc[1]),
                "femaleShare": numeric(row.iloc[2]),
                "income": {
                    "all": {
                        "median": numeric(row.iloc[3]),
                        "female": numeric(row.iloc[4]),
                        "male": numeric(row.iloc[5]),
                    }
                },
                "femaleMedianShare": numeric(row.iloc[6]),
            }
        )

    return rows


def build_occupation_income(path: Path) -> list[dict]:
    frame = read_sheet(path, sheet_name="Tabelle_48", header=0)
    rows = []

    for _, row in frame.iloc[2:10].iterrows():
        rows.append(
            {
                "code": normalize_text(row.iloc[0]),
                "label": normalize_text(row.iloc[1]),
                "femaleShare": numeric(row.iloc[2]),
                "income": {
                    "q1": numeric(row.iloc[3]),
                    "median": numeric(row.iloc[4]),
                    "q3": numeric(row.iloc[5]),
                },
                "iqr": numeric(row.iloc[6]),
                "iqrToMedian": numeric(row.iloc[7]),
            }
        )

    return rows


def build_housing_costs(path: Path) -> list[dict]:
    frame = read_sheet(path, sheet_name="Tab2_1", header=0)
    rows = []

    for _, row in frame.iloc[5:10].iterrows():
        rows.append(
            {
                "label": normalize_text(row.iloc[0]),
                "population": numeric(row.iloc[1]),
                "quantiles": {
                    "p10": numeric(row.iloc[2]),
                    "p25": numeric(row.iloc[3]),
                    "median": numeric(row.iloc[4]),
                    "p75": numeric(row.iloc[5]),
                    "p90": numeric(row.iloc[6]),
                },
                "mean": numeric(row.iloc[7]),
            }
        )

    return rows


def build_tenure_by_age(path: Path) -> list[dict]:
    frame = read_sheet(path, sheet_name="Tab2_25", header=0)
    rows = []

    for _, row in frame.iloc[5:10].iterrows():
        rows.append(
            {
                "label": normalize_text(row.iloc[0]),
                "population": numeric(row.iloc[1]),
                "shares": {
                    "homeOwnership": numeric(row.iloc[3]),
                    "apartmentOwnership": numeric(row.iloc[5]),
                    "municipal": numeric(row.iloc[7]),
                    "cooperative": numeric(row.iloc[9]),
                    "privateRent": numeric(row.iloc[11]),
                    "other": numeric(row.iloc[13]),
                },
            }
        )

    return rows


def build_contract_duration(path: Path) -> list[dict]:
    frame = read_sheet(path, sheet_name="Tab1_12", header=0)
    rows = []
    wanted = {"Insgesamt", "Wien", "Gemeindewohnung", "Genossenschaftswohnung", "andere Hauptmiete"}

    for _, row in frame.iterrows():
        label = normalize_text(row.iloc[0])
        if label not in wanted:
            continue
        rows.append(
            {
                "label": label,
                "population": numeric(row.iloc[1]),
                "durationShares": {
                    "under2": numeric(row.iloc[2]),
                    "2to5": numeric(row.iloc[3]),
                    "5to10": numeric(row.iloc[4]),
                    "10to20": numeric(row.iloc[5]),
                    "20to30": numeric(row.iloc[6]),
                    "30plus": numeric(row.iloc[7]),
                },
                "durationStats": {
                    "mean": numeric(row.iloc[8]),
                    "median": numeric(row.iloc[9]),
                },
                "fixedTermShare": numeric(row.iloc[10]),
            }
        )

    return rows


def build_benchmark(label: str, annual: float | None, full_time_annual: float | None) -> dict | None:
    if annual is None:
        return None
    if full_time_annual is None:
        full_time_annual = annual
    return {
        "label": label,
        "annualGross": annual,
        "monthlyGross": monthly_from_annual(annual),
        "fullTimeAnnualGross": full_time_annual,
        "fullTimeMonthlyGross": monthly_from_annual(full_time_annual),
    }


def pick_graduate_benchmark(education_rows: list[dict]) -> dict | None:
    row = next((item for item in education_rows if item["label"] == "Hochschule, Universität"), None)
    if row is None:
        return None
    # Education table has no dedicated full-time split in this source.
    return build_benchmark(
        label=row["label"],
        annual=row["income"]["all"]["median"],
        full_time_annual=row["income"]["all"]["median"],
    )


def pick_young_adult_benchmark(age_rows: list[dict]) -> dict | None:
    row = next((item for item in age_rows if item["label"] == "20 bis 29 Jahre"), None)
    if row is None:
        return None
    return build_benchmark(
        label=row["label"],
        annual=row["income"]["all"]["median"],
        full_time_annual=row["income"]["fullTime"]["median"],
    )


def parse_month_label(value: str) -> int | None:
    match = re.search(r"(\d{2})$", value)
    if not match:
        return None
    year = int(match.group(1))
    return 2000 + year if year < 80 else 1900 + year


def build_inflation_series(path: Path) -> dict:
    frame = read_sheet(path, sheet_name="Datenblatt 0", header=7)
    month_column = frame.columns[1]
    category_columns = [
        column
        for column in frame.columns
        if isinstance(column, str) and column.startswith(("01 ", "02 ", "03 ", "04 ", "05 ", "06 ", "07 ", "08 ", "09 ", "10 ", "11 ", "12 ", "13 "))
    ]
    yearly_values: dict[int, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    monthly_rows = []

    for _, row in frame.iterrows():
        label = normalize_text(row[month_column])
        if not label or label == "Zeitraum der Erhebung":
            continue
        year = parse_month_label(label)
        if year is None:
            continue

        record = {"period": label, "year": year}
        for column in category_columns:
            value = numeric(row[column])
            if value is None:
                continue
            record[column] = value
            yearly_values[year][column].append(value)
        monthly_rows.append(record)

    annual = []
    for year in sorted(yearly_values):
        entry = {"year": year}
        for column in category_columns:
            samples = yearly_values[year].get(column, [])
            if samples:
                entry[column] = round(sum(samples) / len(samples), 2)
        annual.append(entry)

    return {"monthly": monthly_rows, "annual": annual}


def build_vienna_districts(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    districts = []
    if isinstance(payload, list):
        districts = payload
    elif isinstance(payload, dict):
        districts = payload.get("districts", [])
        if not districts:
            districts = payload.get("housing", {}).get("districts", [])
        if not districts:
            districts = payload.get("top_level_files", {}).get("data.json", {}).get("vienna_districts", [])

    normalized = []
    for item in districts:
        district_id = item.get("id", item.get("cartodb_id"))
        district_name = item.get("name")
        avg_rent = numeric(item.get("avg_rent_m2", item.get("avgRentM2", item.get("rent_m2"))))
        if district_id is None or district_name is None:
            continue
        normalized.append(
            {
                "id": int(district_id),
                "name": normalize_text(district_name),
                "avgRentM2": avg_rent,
            }
        )

    return normalized


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(to_native(payload), handle, ensure_ascii=False, indent=2, allow_nan=False)


def build_payload(data_dir: Path) -> dict:
    income_workbook = data_dir / "income" / "0_Tabellen_des_Textteils.ods"
    housing_workbook = data_dir / "housing" / "Tabellenband_2024.ods"
    inflation_workbook = data_dir / "hpvi" / "2005_2025_Inflation.xlsx"
    districts_json = DISTRICT_RENT_SOURCE if DISTRICT_RENT_SOURCE.exists() else LEGACY_DISTRICT_RENT_SOURCE

    gross_trend = build_trend_dataset(income_workbook, "Tabelle_7", 2)
    net_trend = build_trend_dataset(income_workbook, "Tabelle_7", 6)
    real_gross_index = build_trend_dataset(income_workbook, "Tabelle_9", 2)
    real_net_index = build_trend_dataset(income_workbook, "Tabelle_9", 6)
    real_gross_trend = build_constant_price_income(gross_trend, real_gross_index)
    real_net_trend = build_constant_price_income(net_trend, real_net_index)
    age_rows = build_age_income(income_workbook)
    education_rows = build_education_income(income_workbook)
    occupation_rows = build_occupation_income(income_workbook)
    housing_cost_rows = build_housing_costs(housing_workbook)
    tenure_rows = build_tenure_by_age(housing_workbook)
    contract_rows = build_contract_duration(housing_workbook)
    inflation = build_inflation_series(inflation_workbook)
    housing_category = "04 WOHNUNG, WASSER, STROM, GAS UND ANDERE BRENNSTOFFE"

    districts = build_vienna_districts(districts_json)
    priced_districts = [district for district in districts if district["avgRentM2"] is not None]
    if not priced_districts:
        raise ValueError(
            f"No district rent values found in {districts_json}. "
            "Expected entries with 'avg_rent_m2' or 'avgRentM2'."
        )

    district_average = round(sum(district["avgRentM2"] for district in priced_districts) / len(priced_districts), 2)
    district_spread = {
        "average": district_average,
        "lowest": min(priced_districts, key=lambda item: item["avgRentM2"]),
        "highest": max(priced_districts, key=lambda item: item["avgRentM2"]),
        "topThree": sorted(priced_districts, key=lambda item: item["avgRentM2"], reverse=True)[:3],
        "bottomThree": sorted(priced_districts, key=lambda item: item["avgRentM2"])[:3],
    }

    return {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "sourceFiles": {
                "income": str(income_workbook.relative_to(PROJECT_ROOT)),
                "housing": str(housing_workbook.relative_to(PROJECT_ROOT)),
                "inflation": str(inflation_workbook.relative_to(PROJECT_ROOT)),
                "districts": str(districts_json.relative_to(PROJECT_ROOT)),
            },
        },
        "income": {
            "trend": {
                "gross": gross_trend,
                "net": net_trend,
                "realGross": real_gross_trend,
                "realNet": real_net_trend,
                "realGrossIndex": real_gross_index,
                "realNetIndex": real_net_index,
            },
            "ageGroups2023": age_rows,
            "education2023": education_rows,
            "occupation2023": occupation_rows,
            "graduateBenchmark2023": pick_graduate_benchmark(education_rows),
            "youngAdultBenchmark2023": pick_young_adult_benchmark(age_rows),
        },
        "housing": {
            "costsByAge2024": housing_cost_rows,
            "tenureByAge2024": tenure_rows,
            "contractDuration2024": contract_rows,
            "districts": districts,
            "districtSpread": district_spread,
            "inflation": {
                "monthly": inflation["monthly"],
                "annual": inflation["annual"],
                "annualHousingIndex": [
                    {
                        "year": entry["year"],
                        "index": entry.get(housing_category),
                    }
                    for entry in inflation["annual"]
                    if entry.get(housing_category) is not None
                ],
                "annualCategorySnapshots": [
                    {
                        "year": entry["year"],
                        "housing": entry.get(housing_category),
                        "food": entry.get("01 NAHRUNGSMITTEL UND ALKOHOLFREIE GETRÄNKE"),
                        "transport": entry.get("07 VERKEHR"),
                        "communication": entry.get("08 INFORMATION UND KOMMUNIKATION"),
                        "gastronomy": entry.get("11 GASTRONOMIE- UND BEHERBERGUNGSDIENSTLEISTUNGEN"),
                    }
                    for entry in inflation["annual"]
                ],
            },
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data-dir",
        default=str(DEFAULT_DATA_DIR),
        help="Path to the repository data directory.",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Where to write the curated JSON payload.",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir).resolve()
    output_path = Path(args.output).resolve()

    if not data_dir.exists():
        raise SystemExit(f"Data directory not found: {data_dir}")

    payload = build_payload(data_dir)
    write_json(output_path, payload)
    print(f"Wrote curated dataset to {output_path}")


if __name__ == "__main__":
    main()
