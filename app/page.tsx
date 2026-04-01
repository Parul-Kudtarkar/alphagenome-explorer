import { Hero } from "./components/Hero";
import CoverageExplorer from "./components/CoverageExplorer";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <CoverageExplorer />
    </div>
  );
}
