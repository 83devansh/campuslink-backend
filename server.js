import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { Pinecone } from "@pinecone-database/pinecone";

const app = express();
app.use(cors());
app.use(express.json());


const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = pc.index("campuslink-tasks");


async function getEmbedding(text) {
  const res = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: text })
    }
  );

  if (!res.ok) {
    console.error("HF Error:", await res.text());
    return null;
  }

  const data = await res.json();
  return data?.[0] || null;
}


app.post("/upsert", async (req, res) => {
  try {
    const { id, text, metadata } = req.body;

    const embedding = await getEmbedding(text);

    if (!embedding) {
      return res.status(400).json({ error: "embedding failed" });
    }

    await index.upsert([
      {
        id,
        values: embedding,
        metadata
      }
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "upsert failed" });
  }
});

app.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    console.log("Query:", query);

    const embedding = await getEmbedding(query);

    console.log("Embedding:", embedding);

    if (!embedding) {
      return res.json({ bestMatch: null });
    }

    const result = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true
    });

    console.log("Result:", result);

    res.json({
      bestMatch: result.matches?.[0]?.metadata || null
    });

  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/test-upsert", async (req, res) => {
  try {
    const dummyTasks = [
      {
        id: "task-1",
        values: Array(384).fill(0.12),
        metadata: {
          title: "Need help in Calculus",
          category: "Study"
        }
      }
    ];

    await index.upsert({
      vectors: dummyTasks
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});