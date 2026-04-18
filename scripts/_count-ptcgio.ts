import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const n = await p.card.count({ where: { imageUrl: { contains: "images.pokemontcg.io" } } });
console.log("Cards still using images.pokemontcg.io:", n);
await p.$disconnect();
