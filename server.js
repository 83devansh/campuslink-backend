import express from "express";
import cors from "cors";
import { Pinecone } from "@pinecone-database/pinecone";

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 PINECONE INIT
const pc = new Pinecone({
  apiKey: "pcsk_7FWhZo_UHDV85n3uxQ9ZperZUokzT87ckX1e1FAuV2Yy3FdxdojichBv1xni6FAvAabWnp"
});

const index = pc.index("campuslink-tasks");



async function getEmbedding(text) {
  const res = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: text })
    }
  );

  const data = await res.json();
  return data?.[0] || null;
}


// ===============================
app.post("/upsert", async (req, res) => {
  try {
    const { id, embedding, metadata } = req.body;

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

    const embedding = await getEmbedding(query);

    if (!embedding) {
      return res.json({ bestMatch: null });
    }

    const result = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true
    });

    res.json({
      bestMatch: result.matches?.[0]?.metadata || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "search failed" });
  }
});

app.listen(5000, () => {
  console.log(" Server running on port 5000");
});



app.get("/test-upsert", async (req, res) => {
  try {

    const dummyTasks = [
      {
        id: "task-1",
        values: Array(384).fill(0.12),
        metadata: {
          title: "Need help in Calculus assignment",
          description: "Solve integration and differentiation problems",
          category: "Study Help",
          budget: "200",
          tags: "math, calculus, assignment"
        }
      },
      {
        id: "task-2",
        values: Array(384).fill(0.22),
        metadata: {
          title: "Bike ride from hostel to city",
          description: "Need someone for quick transport assistance",
          category: "Transport",
          budget: "80",
          tags: "ride, travel"
        }
      },
      {
        id: "task-3",
        values: Array(384).fill(0.35),
        metadata: {
          title: "Print 50 pages urgently",
          description: "Need printouts of notes in college",
          category: "Printouts",
          budget: "50",
          tags: "printing, notes"
        }
      },
      {
        id: "task-4",
        values: Array(384).fill(0.45),
        metadata: {
          title: "Fix React bug in project",
          description: "Frontend not rendering API data properly",
          category: "Tech Help",
          budget: "500",
          tags: "react, coding, bug"
        }
      },
      {
        id: "task-5",
        values: Array(384).fill(0.55),
        metadata: {
          title: "Design Instagram poster",
          description: "Need creative poster for college event",
          category: "Creative",
          budget: "300",
          tags: "design, poster, canva"
        }
      }
    ];

    await index.upsert(dummyTasks);

    res.json({
      success: true,
      message: "Bulk test tasks inserted into Pinecone",
      count: dummyTasks.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});