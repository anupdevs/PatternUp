const fs = require('fs');
const path = require('path');

const inventory = require('../data/raw_content_inventory.json');

const gfgMetadata = {
  'inversion-of-array-1587115620': { difficulty: 'Medium', canonicalTitle: 'Inversion of Array', tags: ['Arrays', 'Divide and Conquer'] },
  'check-if-two-arrays-are-equal-or-not3847': { difficulty: 'Easy', canonicalTitle: 'Check if two arrays are equal or not', tags: ['Arrays', 'Hashing'] },
  'binary-array-sorting-1587115620': { difficulty: 'Easy', canonicalTitle: 'Binary Array Sorting', tags: ['Arrays', 'Sorting', 'Two Pointers'] },
  'detect-cycle-in-an-undirected-graph': { difficulty: 'Medium', canonicalTitle: 'Detect Cycle in an Undirected Graph', tags: ['Graph', 'BFS', 'DFS'] },
  'detect-cycle-in-a-directed-graph': { difficulty: 'Medium', canonicalTitle: 'Detect Cycle in a Directed Graph', tags: ['Graph', 'DFS', 'Topological Sort'] },
  'minimum-platforms-1587115620': { difficulty: 'Medium', canonicalTitle: 'Minimum Platforms', tags: ['Greedy', 'Sorting'] },
  'assign-mice-holes3053': { difficulty: 'Easy', canonicalTitle: 'Assign Mice Holes', tags: ['Greedy', 'Sorting'] }
};

const cacheFile = path.join(__dirname, '../data/leetcode_cache.json');
let leetcodeCache = {};
if (fs.existsSync(cacheFile)) {
  try {
    leetcodeCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (e) {}
}

async function fetchLeetCodeData(slug) {
  if (leetcodeCache[slug]) return leetcodeCache[slug];

  const query = `query getQuestionDetail($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId title difficulty topicTags { name } } }`;
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ query, variables: { titleSlug: slug } })
    });
    const json = await res.json();
    if (json.data && json.data.question) {
      const q = json.data.question;
      leetcodeCache[slug] = {
        questionFrontendId: q.questionId,
        canonicalTitle: q.title,
        difficulty: q.difficulty,
        topicTags: (q.topicTags || []).map(t => t.name)
      };
      return leetcodeCache[slug];
    } else {
      console.warn(`No question data returned for slug: ${slug}`);
      return null;
    }
  } catch (err) {
    console.error(`Error fetching slug ${slug}:`, err.message);
    return null;
  }
}

async function enrich() {
  const uniqueLeetcodeSlugs = [...new Set(inventory.filter(p => p.platform === 'LeetCode').map(p => p.slug))];
  console.log(`Fetching metadata for ${uniqueLeetcodeSlugs.length} unique LeetCode problems...`);

  // Batch queries in small chunks with delay
  for (let i = 0; i < uniqueLeetcodeSlugs.length; i++) {
    const slug = uniqueLeetcodeSlugs[i];
    if (!leetcodeCache[slug]) {
      await fetchLeetCodeData(slug);
      process.stdout.write(`Fetched ${i + 1}/${uniqueLeetcodeSlugs.length}: ${slug}\r`);
      // Save cache every 10 items
      if (i % 10 === 0) {
        fs.writeFileSync(cacheFile, JSON.stringify(leetcodeCache, null, 2));
      }
      // Small delay to be polite
      await new Promise(r => setTimeout(r, 120));
    }
  }
  fs.writeFileSync(cacheFile, JSON.stringify(leetcodeCache, null, 2));
  console.log(`\nCompleted LeetCode metadata caching. Total cached: ${Object.keys(leetcodeCache).length}`);

  // Now enrich the complete inventory
  const enriched = inventory.map(p => {
    let difficulty = 'Unknown';
    let difficultySource = 'Unverified';
    let canonicalTitle = p.pdfTitle;
    let externalProblemId = null;
    let tags = [];

    if (p.platform === 'LeetCode') {
      const lc = leetcodeCache[p.slug];
      if (lc) {
        difficulty = lc.difficulty;
        difficultySource = 'LeetCode Official Metadata (Inferred/Verified)';
        canonicalTitle = lc.canonicalTitle;
        externalProblemId = lc.questionFrontendId;
        tags = lc.topicTags;
      }
    } else if (p.platform === 'GeeksforGeeks') {
      const gfg = gfgMetadata[p.slug];
      if (gfg) {
        difficulty = gfg.difficulty;
        difficultySource = 'GeeksforGeeks Official Metadata (Inferred/Verified)';
        canonicalTitle = gfg.canonicalTitle;
        tags = gfg.tags;
      }
    }

    return {
      sheetNumber: p.sheetNumber,
      pdfTitle: p.pdfTitle,
      canonicalTitle,
      pdfPage: p.pdfPage,
      topicNumber: p.topicNumber,
      topicTitle: p.topicTitle,
      pattern: p.pattern,
      platform: p.platform,
      url: p.url,
      slug: p.slug,
      externalProblemId,
      difficulty,
      difficultySource,
      tags,
      extractionConfidence: p.extractionConfidence,
      needsResolution: false
    };
  });

  fs.writeFileSync(
    path.join(__dirname, '../data/verified_content_inventory.json'),
    JSON.stringify(enriched, null, 2)
  );
  console.log('Saved verified_content_inventory.json with full metadata.');
}

enrich();
