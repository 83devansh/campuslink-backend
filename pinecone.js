import { Pinecone } from "@pinecone-database/pinecone";

export const pc = new Pinecone({
  apiKey: "pcsk_7WNgbe_6PRZ27n6jDFKhgeVqRmvLyGHdhrinLPU9WjhNVowwGauNRwrmkvYhEg8HAdNZcj"
});

export const index = pc.index("campuslink-tasks");