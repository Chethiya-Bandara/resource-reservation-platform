import { currentUser } from "@/lib/auth";
import { ensureDemoData } from "@/lib/demo-data";

export async function GET() {
  await ensureDemoData();
  const user = await currentUser();
  return Response.json({ user });
}
