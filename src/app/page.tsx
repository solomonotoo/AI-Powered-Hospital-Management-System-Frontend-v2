import { redirect } from "next/navigation";

// Landing route: unauthenticated users start at login (route guards in
// Slice 2 will own the authenticated landing per role).
export default function Home() {
  redirect("/login");
}
