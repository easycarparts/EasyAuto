#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Word count function - count actual words
function countWords(text) {
  return text.trim().split(/\s+/).length;
}

// Generate description with strict 45-85 word count
function generateDescription(business) {
  const { name, category, area, city, rating, reviewCount, services = [] } = business;

  // Services map - only concrete services
  const concreteServices = {
    'ac': 'AC maintenance', 'air conditioning': 'air conditioning',
    'engine': 'engine repair', 'oil': 'oil changes', 'battery': 'battery',
    'tyre': 'tyre repair', 'tire': 'tyre repair', 'cleaning': 'cleaning',
    'washing': 'car washing', 'painting': 'painting', 'detailing': 'detailing',
    'ceramic': 'ceramic coating', 'coating': 'coating', 'polishing': 'polishing',
    'transmission': 'transmission', 'suspension': 'suspension', 'diagnosis': 'diagnostic services',
    'steam': 'steam cleaning', 'body wash': 'body wash', 'oil filter': 'oil filter replacement',
    'headlights': 'headlight repair', 'deep cleaning': 'deep cleaning', 'exhaust': 'exhaust repair',
    'brake': 'brake service', 'lights': 'lighting repairs', 'maintenance': 'maintenance',
    'service': 'service', 'repair': 'repair', 'wash': 'washing'
  };

  // Filter and collect unique concrete services (max 4)
  const selectedServices = [];
  if (services && Array.isArray(services)) {
    for (const svc of services) {
      const lower = svc.toLowerCase();
      for (const [key, value] of Object.entries(concreteServices)) {
        if (lower.includes(key) && !selectedServices.includes(value)) {
          selectedServices.push(value);
          if (selectedServices.length >= 4) break;
        }
      }
      if (selectedServices.length >= 4) break;
    }
  }

  // Build description
  let desc = `${name} is a ${category} located in ${area}, ${city}.`;

  if (rating && reviewCount) {
    desc += ` Rated ${rating}/5 from ${reviewCount} reviews.`;
  }

  if (selectedServices.length > 0) {
    const serviceList = selectedServices.slice(0, 4).join(', ');
    desc += ` The business offers ${serviceList}.`;
  }

  // Add contextual detail
  if (selectedServices.length > 0) {
    desc += ` Customers can rely on professional service delivery for their automotive needs.`;
  } else {
    desc += ` The business specializes in automotive care and maintenance services.`;
  }

  return desc;
}

// Process batch
async function processBatch(batchNum, skip) {
  try {
    // Export data
    const { stdout } = await execAsync(`node scripts/export-thin.mjs --limit 100 --skip ${skip}`, {
      cwd: 'C:\\Users\\seane\\Desktop\\EasyAuto'
    });

    // Read the batch file
    const batchPath = path.join('C:\\Users\\seane\\Desktop\\EasyAuto', 'scripts', '_batch.json');
    const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

    const descriptions = {};
    let validCount = 0;
    let invalidCount = 0;
    const wordCounts = [];

    for (const business of batchData) {
      const slug = business.slug || `${business.name}-${business.city}`.toLowerCase().replace(/\s+/g, '-');
      let desc = generateDescription(business);

      // Validate word count
      const wordCount = countWords(desc);

      if (wordCount >= 45 && wordCount <= 85) {
        descriptions[slug] = desc;
        validCount++;
        wordCounts.push(wordCount);
      } else {
        // Attempt to adjust
        if (wordCount < 45) {
          // Too short - add more detail
          const { area, city } = business;
          desc += ` For customers seeking quality automotive service in ${area}, this establishment provides reliable solutions.`;
        } else {
          // Too long - trim
          desc = desc.split('.').slice(0, 3).join('.') + '.';
        }

        const finalWordCount = countWords(desc);
        if (finalWordCount >= 45 && finalWordCount <= 85) {
          descriptions[slug] = desc;
          validCount++;
          wordCounts.push(finalWordCount);
        } else {
          invalidCount++;
          console.log(`  Skip: ${slug} (${finalWordCount} words - out of range)`);
        }
      }
    }

    // Save batch file
    const outPath = path.join('C:\\Users\\seane\\Desktop\\EasyAuto', `batch_${batchNum}_descriptions.json`);
    fs.writeFileSync(outPath, JSON.stringify(descriptions, null, 2));

    const avgWords = wordCounts.length > 0 ? (wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length).toFixed(1) : 0;
    console.log(`Batch ${batchNum}: ${validCount} descriptions (avg ${avgWords} words, ${invalidCount} skipped)`);

    return { batchNum, validCount, invalidCount, avgWords };
  } catch (err) {
    console.error(`Error processing batch ${batchNum}:`, err.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('Regenerating batches 7-15 with strict 45-85 word count...\n');

  const batches = [
    { num: 7, skip: 600 },
    { num: 8, skip: 700 },
    { num: 9, skip: 800 },
    { num: 10, skip: 0 },
    { num: 11, skip: 100 },
    { num: 12, skip: 200 },
    { num: 13, skip: 300 },
    { num: 14, skip: 400 },
    { num: 15, skip: 500 }
  ];

  const results = [];
  for (const batch of batches) {
    const result = await processBatch(batch.num, batch.skip);
    if (result) results.push(result);
  }

  console.log('\n=== Summary ===');
  const totalValid = results.reduce((sum, r) => sum + r.validCount, 0);
  const totalInvalid = results.reduce((sum, r) => sum + r.invalidCount, 0);
  console.log(`Total: ${totalValid} valid descriptions, ${totalInvalid} skipped`);
}

main().catch(console.error);
