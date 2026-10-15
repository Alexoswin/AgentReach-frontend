import { redirect } from "next/navigation";

// Replies now live in the Inbox, under Campaign replies.
export default function RepliesPage() {
  redirect("/inbox?folder=campaigns");
}
