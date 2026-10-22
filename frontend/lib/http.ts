import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
export async function withMongo<T>(operation: () => Promise<T>, fallback: string) {
  try { await connectMongo(); return await operation(); }
  catch (error) { console.error(fallback, error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: fallback }, { status: 503 }); }
}
export const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status });
