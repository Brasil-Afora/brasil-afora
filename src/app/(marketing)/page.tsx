import Homepage from "@/components/homepage/homepage";

// Featured opportunities drop out and countdowns change as days pass in
// Brasília, so the page is regenerated hourly instead of frozen at build time.
export const revalidate = 3600;

export default function HomePage() {
  return <Homepage />;
}
