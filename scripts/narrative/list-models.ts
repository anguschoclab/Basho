const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  process.exit(1);
}

async function listModels() {
  const result = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
  );
  const data = await result.json();
  console.log(JSON.stringify(data, null, 2));
}

listModels().catch(console.error);
