// Simple script to convert a Google Sheet (CSV) into i18n JSON files
// ---------------------------------------------------------------
// 1. In your Google Sheet: Go to File → Share → Publish to web → Choose CSV format.
// 2. Copy the public CSV link and replace the CSV_URL below.
// 3. Run this script (node scripts/generateTranslations.js) to generate translation files.
//
// It will create three types of files inside src/i18n/locales/:
// - <lang>.json → translation files per language
// - keys.json → list of all translation keys (key: key)
// - languages.json → list of supported language codes
//
// Safe for quotes, newlines, and backslashes in cell values.

import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import Papa from "papaparse";

// --- 1. Google Sheet CSV URL ---
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTiOcjQ2wzDCWzPFyCMUYhBw72dTQ-xQp08L_VOuGVo4OnCQnBAJp6OteXXc6kKvJxMEjMe2bhQOgwZ/pub?gid=0&single=true&output=csv";

async function generateTranslations() {
  console.log("⏳ Fetching translations from Google Sheets...");

  // --- 2. Fetch CSV content from Google Sheets ---
  // Adding a timestamp parameter (&t=...) to bypass caching
  const res = await fetch(`${CSV_URL}&t=${Date.now()}`);
  const text = await res.text();

  // --- 3. Parse CSV data into rows (each row = translation entry) ---
  // Assumes the first column is "key" and others are language codes
  const rows = Papa.parse(text, { header: true }).data;

  // --- 4. Prepare containers for translation data ---
  const translations = {}; // stores { lang: { key: value } }
  const keyMap = {}; // stores { key: key } for keys.json
  const languages = new Set(); // stores unique language codes

  // --- 5. Process each row from the sheet ---
  for (const row of rows) {
    const rawKey = row.key?.trim();
    if (!rawKey) continue; // skip empty rows

    // Add key: key pair to keys.json
    keyMap[rawKey] = rawKey;

    // Loop through all columns (languages)
    for (const [lang, value] of Object.entries(row)) {
      if (lang === "key" || !value) continue;

      // Initialize translation object for new language
      translations[lang] ??= {};
      languages.add(lang);

      // Clean and escape special characters safely
      const safeValue = value
        .replace(/\\/g, "\\\\") // escape backslashes
        .replace(/"/g, '\\"') // escape double quotes
        .replace(/\r?\n/g, "\\n") // keep newlines safe
        .trim();

      translations[lang][rawKey] = safeValue;
    }
  }

  // --- 6. Define output folder path ---
  const outputDir = path.join("src", "i18n", "locales");
  fs.mkdirSync(outputDir, { recursive: true });

  // --- 7. Write translation files per language ---
  for (const [lang, data] of Object.entries(translations)) {
    const filePath = path.join(outputDir, `${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Created ${lang}.json`);
  }

  // --- 8. Write keys.json (all keys in the sheet) ---
  fs.writeFileSync(
    path.join(outputDir, "keys.json"),
    JSON.stringify(keyMap, null, 2)
  );
  console.log("✅ Created keys.json");

  // --- 9. Write languages.json (list of supported languages) ---
  fs.writeFileSync(
    path.join(outputDir, "languages.json"),
    JSON.stringify([...languages], null, 2)
  );
  console.log("✅ Created languages.json");

  console.log("🎉 Translation files generated successfully!");
}

// --- 10. Execute script with error handling ---
generateTranslations().catch((err) =>
  console.error("❌ Failed to generate translations:", err)
);
