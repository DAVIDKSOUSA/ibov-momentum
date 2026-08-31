import ProphetWorkspace from "@/components/ProphetWorkspace";
import type { ProphetDataset } from "@/lib/prophet";
import prophetDataset from "@/public/data/ibov-prophet.json";

export default function ProphetPage() {
  return <ProphetWorkspace initialData={prophetDataset as ProphetDataset} />;
}
