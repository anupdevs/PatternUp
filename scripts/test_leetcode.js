const fs = require('fs');

async function testLeetCode() {
  const query = `query getQuestionDetail($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId title difficulty topicTags { name } } }`;
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ query, variables: { titleSlug: 'richest-customer-wealth' } })
    });
    const data = await res.json();
    console.log('LeetCode API Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testLeetCode();
