import SketchCDN from "../../components/SketchCDN";

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1>SketchViewModel — CDN Example</h1>
      <p>Use the toolbar to draw shapes. Area/length is shown on completion.</p>
      <SketchCDN />
    </main>
  );
}
