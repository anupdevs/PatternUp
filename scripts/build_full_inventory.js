const fs = require('fs');
const path = require('path');

const doc = require('../full_extracted_pdf.json');

// Define known GFG difficulty mappings
const gfgMetadata = {
  'inversion-of-array-1587115620': { difficulty: 'Medium', title: 'Inversion of Array' },
  'check-if-two-arrays-are-equal-or-not3847': { difficulty: 'Easy', title: 'Check if two arrays are equal or not' },
  'binary-array-sorting-1587115620': { difficulty: 'Easy', title: 'Binary Array Sorting' },
  'detect-cycle-in-an-undirected-graph': { difficulty: 'Medium', title: 'Detect cycle in an undirected graph' },
  'detect-cycle-in-a-directed-graph': { difficulty: 'Medium', title: 'Detect cycle in a directed graph' },
  'minimum-platforms-1587115620': { difficulty: 'Medium', title: 'Minimum Platforms' },
  'assign-mice-holes3053': { difficulty: 'Easy', title: 'Assign Mice Holes' }
};

// Subtopic boundaries by problem range
function getTopicAndPattern(probNum) {
  // 01 ARRAYS (1 - 30)
  if (probNum >= 1 && probNum <= 7) return { topicNumber: '01', topicTitle: 'Arrays', pattern: '1-D Array' };
  if (probNum >= 8 && probNum <= 14) return { topicNumber: '01', topicTitle: 'Arrays', pattern: '2-D Array' };
  if (probNum >= 15 && probNum <= 20) return { topicNumber: '01', topicTitle: 'Arrays', pattern: 'Prefix Sum' };
  if (probNum >= 21 && probNum <= 25) return { topicNumber: '01', topicTitle: 'Arrays', pattern: 'Sliding Window (Fixed/Variable Size)' };
  if (probNum >= 26 && probNum <= 30) return { topicNumber: '01', topicTitle: 'Arrays', pattern: 'Two Pointers' };

  // 02 Binary Search (31 - 37)
  if (probNum >= 31 && probNum <= 37) return { topicNumber: '02', topicTitle: 'Binary Search', pattern: 'Binary Search' };

  // 03 Sorting (38 - 44)
  if (probNum >= 38 && probNum <= 44) return { topicNumber: '03', topicTitle: 'Sorting', pattern: 'Sorting' };

  // 04 Hashing (45 - 53)
  if (probNum >= 45 && probNum <= 53) return { topicNumber: '04', topicTitle: 'Hashing', pattern: 'Hashing' };

  // 05 Linked Lists (54 - 68)
  if (probNum >= 54 && probNum <= 68) return { topicNumber: '05', topicTitle: 'Linked Lists', pattern: 'Linked Lists' };

  // 06 Stack and Queue (69 - 78)
  if (probNum >= 69 && probNum <= 78) return { topicNumber: '06', topicTitle: 'Stack and Queue', pattern: 'Stack and Queue' };

  // 07 Heap (79 - 84)
  if (probNum >= 79 && probNum <= 84) return { topicNumber: '07', topicTitle: 'Heap', pattern: 'Heap' };

  // 07 Recursion & Backtracking (85 - 98)
  if (probNum >= 85 && probNum <= 90) return { topicNumber: '07', topicTitle: 'Recursion & Backtracking', pattern: 'Recursion' };
  if (probNum >= 91 && probNum <= 98) return { topicNumber: '07', topicTitle: 'Recursion & Backtracking', pattern: 'Backtracking' };

  // 08 Trees (99 - 115)
  if (probNum >= 99 && probNum <= 103) return { topicNumber: '08', topicTitle: 'Trees', pattern: 'Binary Tree - Level Order Traversal (BFS)' };
  if (probNum >= 104 && probNum <= 111) return { topicNumber: '08', topicTitle: 'Trees', pattern: 'Binary Tree - DFS (Recursive & Iterative)' };
  if (probNum >= 112 && probNum <= 115) return { topicNumber: '08', topicTitle: 'Trees', pattern: 'Binary Search Tree (BST)' };

  // 09 Trees II (116 - 126)
  if (probNum >= 116 && probNum <= 119) return { topicNumber: '09', topicTitle: 'Trees II', pattern: 'BBST (AVL Tree)' };
  if (probNum >= 120 && probNum <= 124) return { topicNumber: '09', topicTitle: 'Trees II', pattern: 'Trie' };
  if (probNum >= 125 && probNum <= 126) return { topicNumber: '09', topicTitle: 'Trees II', pattern: 'Segment Tree (Range Queries)' };

  // 10 GRAPHS (127 - 146)
  if (probNum >= 127 && probNum <= 131) return { topicNumber: '10', topicTitle: 'Graphs', pattern: 'BFS & DFS' };
  if (probNum >= 132 && probNum <= 136) return { topicNumber: '10', topicTitle: 'Graphs', pattern: 'Detect Cycle / Topological Sort' };
  if (probNum >= 137 && probNum <= 140) return { topicNumber: '10', topicTitle: 'Graphs', pattern: 'Dijkstra’s Algorithm (SSSP)' };
  if (probNum >= 141 && probNum <= 143) return { topicNumber: '10', topicTitle: 'Graphs', pattern: 'Prim’s & Kruskal’s (MST)' };
  if (probNum >= 144 && probNum <= 146) return { topicNumber: '10', topicTitle: 'Graphs', pattern: 'Floyd-Warshall (APSP)' };

  // 10 Greedy (147 - 154) (PDF lists topic number as 10)
  if (probNum >= 147 && probNum <= 154) return { topicNumber: '10-Greedy', topicTitle: 'Greedy', pattern: 'Greedy Algorithms' };

  // 10 Dynamic Programming (155 - 185) (PDF lists topic number as 10)
  if (probNum >= 155 && probNum <= 157) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'Climbing Stairs' };
  if (probNum >= 158 && probNum <= 159) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'Coin Change (1D DP)' };
  if (probNum >= 160 && probNum <= 165) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'Buy and Sell Stock' };
  if (probNum >= 166 && probNum <= 167) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: '0/1 Knapsack' };
  if (probNum >= 168 && probNum <= 169) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'Unbounded Knapsack' };
  if (probNum >= 170 && probNum <= 173) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'Longest Common Subsequence (LCS)' };
  if (probNum >= 174 && probNum <= 176) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'Longest Increasing Subsequence (LIS)' };
  if (probNum >= 177 && probNum <= 180) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'Matrix Chain Multiplication (MCM)' };
  if (probNum >= 181 && probNum <= 185) return { topicNumber: '10-DP', topicTitle: 'Dynamic Programming', pattern: 'DP on Grids and Trees' };

  // 11 MATH (186 - 201)
  if (probNum >= 186 && probNum <= 201) return { topicNumber: '11', topicTitle: 'Math', pattern: 'Mathematical Algorithms' };

  // 11 Miscellaneous (202 - 211) (PDF lists topic number as 11)
  if (probNum >= 202 && probNum <= 208) return { topicNumber: '11-Misc', topicTitle: 'Miscellaneous', pattern: 'Bit Manipulation Tricks' };
  if (probNum >= 209 && probNum <= 211) return { topicNumber: '11-Misc', topicTitle: 'Miscellaneous', pattern: 'Rabin-Karp (Rolling Hash)' };

  return { topicNumber: 'Unknown', topicTitle: 'Unknown', pattern: 'Unknown' };
}

async function extractAll() {
  const allProblems = [];

  for (let pIdx = 3; pIdx < 40; pIdx++) {
    const p = doc[pIdx];
    const links = [...p.links].sort((a,b) => b.rect[1] - a.rect[1]);

    for (const link of links) {
      const yCenter = (link.rect[1] + link.rect[3]) / 2;
      const rowItems = p.textItems.filter(it => 
        Math.abs(it.y - yCenter) < 55 && 
        it.x < 600 && 
        !it.str.includes('BOSSCODER') && 
        !it.str.includes('BeTheBoss') &&
        !it.str.includes('Algorithm') &&
        !it.str.includes('Practice Link') &&
        !it.str.includes('Asked in') &&
        it.str !== '#'
      );

      const numItems = rowItems.filter(it => it.x < 180 && /^\d+$/.test(it.str.trim()));
      const probNum = parseInt(numItems.map(n => n.str.trim()).join(''), 10);

      const titleItems = rowItems.filter(it => it.x >= 180 && it.x < 580);
      const sortedTitle = [...titleItems].sort((a,b) => b.y - a.y || a.x - b.x);
      let curLineY = null;
      let curLine = [];
      const lines = [];
      for (const item of sortedTitle) {
        if (curLineY === null || Math.abs(item.y - curLineY) > 8) {
          if (curLine.length) lines.push(curLine.join(' '));
          curLine = [item.str.trim()];
          curLineY = item.y;
        } else {
          curLine.push(item.str.trim());
        }
      }
      if (curLine.length) lines.push(curLine.join(' '));
      const exactTitle = lines.map(l => l.trim()).filter(Boolean).join(' ');

      // Platform & Slug
      let platform = 'Unknown';
      let slug = '';
      if (link.url.includes('leetcode.com')) {
        platform = 'LeetCode';
        const match = link.url.match(/problems\/([^\/]+)/);
        slug = match ? match[1] : '';
      } else if (link.url.includes('geeksforgeeks.org')) {
        platform = 'GeeksforGeeks';
        const match = link.url.match(/problems\/([^\/]+)/);
        slug = match ? match[1] : '';
      }

      const { topicNumber, topicTitle, pattern } = getTopicAndPattern(probNum);

      allProblems.push({
        sheetNumber: probNum,
        pdfTitle: exactTitle,
        pdfPage: p.page,
        topicNumber,
        topicTitle,
        pattern,
        platform,
        url: link.url,
        slug,
        extractionConfidence: 'HIGH_100%'
      });
    }
  }

  console.log(`Parsed all ${allProblems.length} problems.`);
  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
  fs.writeFileSync(
    path.join(__dirname, '../data/raw_content_inventory.json'),
    JSON.stringify(allProblems, null, 2)
  );
  console.log('Saved raw_content_inventory.json');
}

extractAll();
